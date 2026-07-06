<?php

namespace App\Services\Contacts;

use App\Models\Contact;
use App\Models\ContactList;
use App\ValueObjects\PhoneNumber;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ContactImportService
{
    /** @return array{imported: int, skipped: int, rejected_international: int, errors: array} */
    public function importCsv(UploadedFile $file, int $userId, ?int $contactListId = null): array
    {
        $handle = fopen($file->getPathname(), 'r');

        $imported = 0;
        $skipped = 0;
        $rejectedInternational = 0;
        $errors = [];
        $isFirstRow = true;
        $importedIds = [];

        while (($row = fgetcsv($handle)) !== false) {
            if ($isFirstRow) {
                $isFirstRow = false;

                continue;
            }

            $hasOnlyPhone = empty($row[1]);
            if ($hasOnlyPhone) {
                if (empty($row[0])) {
                    $skipped++;

                    continue;
                }
                $rawPhone = trim($row[0]);
                $name = $rawPhone;
            } else {
                if (empty($row[0]) || empty($row[1])) {
                    $skipped++;

                    continue;
                }
                $rawPhone = trim($row[1]);
                $name = trim($row[0]);
            }

            // Bug fix: the old importer accepted any digit string as a phone number,
            // which let non-Kuwait numbers (Nigeria, Germany, ...) into Kuwait-targeted
            // campaigns. Reject anything that doesn't normalize to a Kuwait number.
            if (! PhoneNumber::isValidKuwaitNumber($rawPhone)) {
                $rejectedInternational++;
                $errors[] = "رقم غير كويتي مرفوض: {$rawPhone}";

                continue;
            }

            $phone = PhoneNumber::normalize($rawPhone);

            $existing = Contact::where('phone', $phone)->first();
            if ($existing) {
                if ($contactListId) {
                    $importedIds[] = $existing->id;
                }
                $skipped++;

                continue;
            }

            try {
                $contact = Contact::create([
                    'user_id' => $userId,
                    'name' => $name,
                    'phone' => $phone,
                    'email' => $row[2] ?? null,
                    'tags' => ! empty($row[3]) ? array_map('trim', explode(',', $row[3])) : null,
                    'source' => $row[4] ?? null,
                ]);
                $importedIds[] = $contact->id;
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "سطر {$phone}: ".$e->getMessage();
                $skipped++;
            }
        }

        fclose($handle);

        if ($contactListId && count($importedIds)) {
            $list = ContactList::find($contactListId);
            if ($list) {
                $rows = array_map(fn ($id) => ['contact_list_id' => $contactListId, 'contact_id' => $id], $importedIds);
                foreach (array_chunk($rows, 500) as $chunk) {
                    DB::table('contact_list_items')->insertOrIgnore($chunk);
                }
                $list->syncCount();
            }
        }

        return [
            'imported' => $imported,
            'skipped' => $skipped,
            'rejected_international' => $rejectedInternational,
            'errors' => $errors,
        ];
    }
}
