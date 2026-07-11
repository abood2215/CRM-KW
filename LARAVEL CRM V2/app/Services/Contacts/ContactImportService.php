<?php

namespace App\Services\Contacts;

use App\Models\Contact;
use App\Models\ContactList;
use App\ValueObjects\PhoneNumber;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class ContactImportService
{
    /**
     * Parses the whole file up front, then does one lookup query and one batched
     * insert instead of a SELECT+INSERT per row — a 10,000-row file previously meant
     * up to 20,000 synchronous queries inside a single HTTP request.
     *
     * @return array{imported: int, skipped: int, rejected_international: int, errors: array}
     */
    public function importCsv(UploadedFile $file, int $userId, ?int $contactListId = null): array
    {
        $handle = fopen($file->getPathname(), 'r');

        $skipped = 0;
        $rejectedInternational = 0;
        $errors = [];
        $isFirstRow = true;
        // phone => row data — keyed so a duplicate phone later in the same file is
        // naturally deduped (first occurrence wins) without an extra pass.
        $candidates = [];

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

            if (isset($candidates[$phone])) {
                $skipped++;

                continue;
            }

            $candidates[$phone] = [
                'name' => $name,
                'email' => $row[2] ?? null,
                'tags' => ! empty($row[3]) ? array_map('trim', explode(',', $row[3])) : null,
                'source' => $row[4] ?? null,
            ];
        }

        fclose($handle);

        $imported = 0;

        if (count($candidates)) {
            // One query for every phone already in the DB, instead of one per row.
            $existingPhones = Contact::whereIn('phone', array_keys($candidates))->pluck('phone')->flip();

            $now = now();
            $newRows = [];
            foreach ($candidates as $phone => $data) {
                if (isset($existingPhones[$phone])) {
                    $skipped++;

                    continue;
                }

                $newRows[] = [
                    'user_id' => $userId,
                    'name' => $data['name'],
                    'phone' => $phone,
                    'email' => $data['email'],
                    // Contact::insert() is a raw query-builder insert — it skips the
                    // model's array cast, so tags need encoding by hand here.
                    'tags' => $data['tags'] ? json_encode($data['tags']) : null,
                    'source' => $data['source'],
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            foreach (array_chunk($newRows, 500) as $chunk) {
                try {
                    Contact::insert($chunk);
                    $imported += count($chunk);
                } catch (\Exception $e) {
                    $errors[] = 'فشل إدراج دفعة جهات اتصال: '.$e->getMessage();
                    $skipped += count($chunk);
                }
            }
        }

        if ($contactListId && count($candidates)) {
            $list = ContactList::find($contactListId);
            if ($list) {
                // Covers both newly-inserted and pre-existing matches in one query —
                // both get linked to the target list, matching the previous per-row behavior.
                $allIds = Contact::whereIn('phone', array_keys($candidates))->pluck('id');
                $rows = $allIds->map(fn ($id) => ['contact_list_id' => $contactListId, 'contact_id' => $id])->all();
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
