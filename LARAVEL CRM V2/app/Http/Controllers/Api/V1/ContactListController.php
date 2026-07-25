<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ContactList\StoreContactListRequest;
use App\Http\Requests\ContactList\UpdateContactListRequest;
use App\Http\Resources\ContactListResource;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use App\Models\ContactList;
use App\Policies\ContactListPolicy;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ContactListController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $lists = ContactListPolicy::scopeVisibleTo(ContactList::with('user')->withCount('contacts'), $request->user())
            ->orderBy('name')->get();

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

    public function show(Request $request, ContactList $contactList): JsonResponse
    {
        $this->authorize('view', $contactList);

        $contactList->load('user')->loadCount('contacts');

        // Members are paginated separately from the list itself — the old unbounded
        // `contacts` eager-load returned every member contact in one response, which
        // doesn't scale for lists with thousands of contacts.
        $perPage = min((int) ($request->per_page ?? 50), 200);
        $query = $contactList->contacts();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(fn ($q) => $q->where('contacts.name', 'like', "%{$search}%")->orWhere('contacts.phone', 'like', "%{$search}%"));
        }

        $contacts = $query->orderBy('contacts.name')->paginate($perPage);

        return response()->json([
            'contact_list' => new ContactListResource($contactList),
            'contacts' => ContactResource::collection($contacts),
            'meta' => [
                'current_page' => $contacts->currentPage(),
                'last_page' => $contacts->lastPage(),
                'per_page' => $contacts->perPage(),
                'total' => $contacts->total(),
            ],
        ]);
    }

    public function update(UpdateContactListRequest $request, ContactList $contactList): JsonResponse
    {
        $this->authorize('update', $contactList);

        $contactList->update($request->validated());

        return response()->json([
            'contact_list' => new ContactListResource($contactList->fresh()),
            'message' => 'تم تحديث القائمة.',
        ]);
    }

    public function destroy(ContactList $contactList): JsonResponse
    {
        $this->authorize('delete', $contactList);

        ActivityLogger::record($contactList, 'delete', "حذف قائمة تواصل: {$contactList->name}");
        $contactList->contacts()->detach();
        $contactList->delete();

        return response()->json(['message' => 'تم حذف القائمة.']);
    }

    public function addContacts(Request $request, ContactList $contactList): JsonResponse
    {
        $this->authorize('update', $contactList);

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
