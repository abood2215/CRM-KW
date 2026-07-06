<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContactList\StoreContactListRequest;
use App\Http\Requests\ContactList\UpdateContactListRequest;
use App\Http\Resources\ContactListResource;
use App\Models\Contact;
use App\Models\ContactList;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactListController extends Controller
{
    public function index(): JsonResponse
    {
        $lists = ContactList::with('user')->withCount('contacts')->orderBy('name')->get();

        return response()->json(['contact_lists' => ContactListResource::collection($lists)]);
    }

    public function store(StoreContactListRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['user_id'] = $request->user()->id;

        $list = ContactList::create($data);
        ActivityLogger::record($list, 'create', "إنشاء قائمة تواصل: {$list->name}");

        return response()->json([
            'contact_list' => new ContactListResource($list),
            'message' => 'تم إنشاء القائمة بنجاح.',
        ], 201);
    }

    public function show(ContactList $contactList): JsonResponse
    {
        $contactList->load(['contacts', 'user']);

        return response()->json(['contact_list' => new ContactListResource($contactList)]);
    }

    public function update(UpdateContactListRequest $request, ContactList $contactList): JsonResponse
    {
        $contactList->update($request->validated());

        return response()->json([
            'contact_list' => new ContactListResource($contactList->fresh()),
            'message' => 'تم تحديث القائمة.',
        ]);
    }

    public function destroy(ContactList $contactList): JsonResponse
    {
        ActivityLogger::record($contactList, 'delete', "حذف قائمة تواصل: {$contactList->name}");
        $contactList->contacts()->detach();
        $contactList->delete();

        return response()->json(['message' => 'تم حذف القائمة.']);
    }

    public function addContacts(Request $request, ContactList $contactList): JsonResponse
    {
        $request->validate([
            'contact_ids' => 'required_without:phone_numbers|array',
            'contact_ids.*' => 'exists:contacts,id',
            'phone_numbers' => 'sometimes|array',
        ]);

        $contactIds = $request->contact_ids ?? [];

        if ($request->phone_numbers) {
            $byPhone = Contact::whereIn('phone', $request->phone_numbers)->pluck('id')->toArray();
            $contactIds = array_merge($contactIds, $byPhone);
        }

        $contactList->contacts()->syncWithoutDetaching($contactIds);
        $contactList->syncCount();

        return response()->json([
            'contact_list' => new ContactListResource($contactList->fresh(['contacts'])),
            'message' => 'تم إضافة جهات الاتصال للقائمة.',
        ]);
    }
}
