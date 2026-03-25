<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ContactController extends Controller
{
    // جلب قائمة جهات الاتصال مع الفلترة والبحث والـ pagination
    public function index(Request $request): JsonResponse
    {
        $query = Contact::with('user')->latest();

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('phone', 'like', "%{$request->search}%")
                  ->orWhere('email', 'like', "%{$request->search}%");
            });
        }

        if ($request->opt_in !== null) {
            $query->where('opt_in', filter_var($request->opt_in, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->opt_out !== null) {
            $query->where('opt_out', filter_var($request->opt_out, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->is_blacklisted !== null) {
            $query->where('is_blacklisted', filter_var($request->is_blacklisted, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->source) {
            $query->where('source', $request->source);
        }

        $contacts = $query->paginate($request->per_page ?? 20);

        return response()->json([
            'contacts' => $contacts->items(),
            'meta' => [
                'current_page' => $contacts->currentPage(),
                'last_page'    => $contacts->lastPage(),
                'per_page'     => $contacts->perPage(),
                'total'        => $contacts->total(),
            ],
        ]);
    }

    // إضافة جهة اتصال جديدة
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:255',
            'phone' => 'required|string|unique:contacts,phone',
            'email' => 'nullable|email|max:255',
            'tags'  => 'nullable|array',
            'source' => 'nullable|string|max:100',
            'opt_in' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['user_id'] = $request->user()->id;

        if ($validated['opt_in'] ?? false) {
            $validated['opt_in_date'] = now();
        }

        $contact = Contact::create($validated);

        return response()->json([
            'contact' => $contact,
            'message' => 'تم إضافة جهة الاتصال بنجاح.',
        ], 201);
    }

    // تعديل جهة اتصال
    public function update(Request $request, int $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);

        $validated = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'phone'          => "sometimes|string|unique:contacts,phone,{$id}",
            'email'          => 'nullable|email|max:255',
            'tags'           => 'nullable|array',
            'source'         => 'nullable|string|max:100',
            'opt_in'         => 'boolean',
            'is_blacklisted' => 'boolean',
            'notes'          => 'nullable|string',
        ]);

        // تتبع تاريخ الاشتراك
        if (isset($validated['opt_in']) && $validated['opt_in'] && !$contact->opt_in) {
            $validated['opt_in_date'] = now();
            $validated['opt_out']     = false;
            $validated['opt_out_date'] = null;
        }

        $contact->update($validated);

        return response()->json([
            'contact' => $contact->fresh(),
            'message' => 'تم تحديث جهة الاتصال.',
        ]);
    }

    // حذف جهة اتصال
    public function destroy(int $id): JsonResponse
    {
        Contact::findOrFail($id)->delete();

        return response()->json(['message' => 'تم حذف جهة الاتصال.']);
    }

    // إلغاء الاشتراك (Opt-out)
    public function optOut(int $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);

        $contact->update([
            'opt_out'      => true,
            'opt_out_date' => now(),
            'opt_in'       => false,
        ]);

        return response()->json([
            'contact' => $contact->fresh(),
            'message' => 'تم إلغاء اشتراك جهة الاتصال.',
        ]);
    }

    // استيراد جهات الاتصال من CSV
    public function importCsv(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $handle = fopen($file->getPathname(), 'r');

        $imported = 0;
        $skipped  = 0;
        $errors   = [];
        $isFirst  = true;
        $userId   = $request->user()->id;

        while (($row = fgetcsv($handle)) !== false) {
            // تجاهل السطر الأول (العناوين)
            if ($isFirst) {
                $isFirst = false;
                continue;
            }

            // التحقق من وجود الاسم والهاتف كحد أدنى
            if (empty($row[0]) || empty($row[1])) {
                $skipped++;
                continue;
            }

            $phone = trim($row[1]);

            // تجنب التكرار
            if (Contact::where('phone', $phone)->exists()) {
                $skipped++;
                continue;
            }

            try {
                Contact::create([
                    'user_id' => $userId,
                    'name'    => trim($row[0]),
                    'phone'   => $phone,
                    'email'   => $row[2] ?? null,
                    'tags'    => !empty($row[3]) ? array_map('trim', explode(',', $row[3])) : null,
                    'source'  => $row[4] ?? null,
                ]);
                $imported++;
            } catch (\Exception $e) {
                $errors[] = "سطر {$phone}: " . $e->getMessage();
                $skipped++;
            }
        }

        fclose($handle);

        return response()->json([
            'message'  => "تم استيراد {$imported} جهة اتصال.",
            'imported' => $imported,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ]);
    }

    // تصدير جهات الاتصال إلى CSV
    public function exportCsv(Request $request)
    {
        $contacts = Contact::latest()->get();

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="contacts.csv"',
        ];

        $callback = function () use ($contacts) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF)); // BOM لدعم العربية في Excel

            fputcsv($handle, ['الاسم', 'الهاتف', 'البريد', 'التاقات', 'المصدر', 'مشترك', 'محظور']);

            foreach ($contacts as $c) {
                fputcsv($handle, [
                    $c->name,
                    $c->phone,
                    $c->email,
                    $c->tags ? implode(',', $c->tags) : '',
                    $c->source,
                    $c->opt_in ? 'نعم' : 'لا',
                    $c->is_blacklisted ? 'نعم' : 'لا',
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }
}
