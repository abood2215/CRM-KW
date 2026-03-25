<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\ContactList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactListController extends Controller
{
    // جلب جميع القوائم
    public function index(Request $request): JsonResponse
    {
        $lists = ContactList::with('user')
            ->withCount('contacts')
            ->orderBy('name')
            ->get();

        return response()->json(['contact_lists' => $lists]);
    }

    // إنشاء قائمة جديدة
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $validated['user_id'] = $request->user()->id;

        $list = ContactList::create($validated);

        return response()->json([
            'contact_list' => $list,
            'message'      => 'تم إنشاء القائمة بنجاح.',
        ], 201);
    }

    // تعديل القائمة
    public function update(Request $request, int $id): JsonResponse
    {
        $list = ContactList::findOrFail($id);

        $validated = $request->validate([
            'name'        => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $list->update($validated);

        return response()->json([
            'contact_list' => $list->fresh(),
            'message'      => 'تم تحديث القائمة.',
        ]);
    }

    // حذف القائمة
    public function destroy(int $id): JsonResponse
    {
        $list = ContactList::findOrFail($id);
        $list->contacts()->detach(); // فك الربط أولاً
        $list->delete();

        return response()->json(['message' => 'تم حذف القائمة.']);
    }

    // إضافة جهات اتصال للقائمة
    public function addContacts(Request $request, int $id): JsonResponse
    {
        $list = ContactList::findOrFail($id);

        $request->validate([
            'contact_ids'   => 'required_without:phone_numbers|array',
            'contact_ids.*' => 'exists:contacts,id',
            'phone_numbers' => 'sometimes|array',
        ]);

        $contactIds = $request->contact_ids ?? [];

        // البحث بالأرقام إذا تم تمريرها
        if ($request->phone_numbers) {
            $byPhone = Contact::whereIn('phone', $request->phone_numbers)->pluck('id')->toArray();
            $contactIds = array_merge($contactIds, $byPhone);
        }

        $list->contacts()->syncWithoutDetaching($contactIds);
        $list->syncCount();

        return response()->json([
            'contact_list' => $list->fresh(['contacts']),
            'message'      => 'تم إضافة جهات الاتصال للقائمة.',
        ]);
    }

    // عرض تفاصيل القائمة مع جهات الاتصال
    public function show(int $id): JsonResponse
    {
        $list = ContactList::with(['contacts', 'user'])->findOrFail($id);

        return response()->json(['contact_list' => $list]);
    }
}
