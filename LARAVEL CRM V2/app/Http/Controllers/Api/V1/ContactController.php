<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ContactPipelineStage;
use App\Events\ContactUpdatedEvent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Contact\ImportContactsCsvRequest;
use App\Http\Requests\Contact\StoreContactRequest;
use App\Http\Requests\Contact\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\ActivityLog;
use App\Models\Contact;
use App\Models\ContactList;
use App\Policies\ContactPolicy;
use App\Services\Contacts\ContactImportService;
use App\Services\Contacts\ContactSegmentQueryBuilder;
use App\Services\Contacts\ContactService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContactController extends Controller
{
    public function __construct(
        private readonly ContactService $contacts,
        private readonly ContactImportService $importer,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = ContactPolicy::scopeVisibleTo(Contact::with('user')->withCount('tasks'), $request->user());

        if ($request->user()->hasPermission('contacts.view_all') && $request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('pipeline_stage')) {
            $query->where('pipeline_stage', $request->pipeline_stage);
        }

        if ($request->has('source')) {
            $query->where('source', $request->source);
        }

        if ($request->has('opt_in')) {
            $query->where('opt_in', $request->boolean('opt_in'));
        }

        if ($request->has('is_blacklisted')) {
            $query->where('is_blacklisted', $request->boolean('is_blacklisted'));
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('service', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $perPage = min((int) ($request->per_page ?? 20), 100);
        $contacts = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => ContactResource::collection($contacts),
            'meta' => [
                'current_page' => $contacts->currentPage(),
                'last_page' => $contacts->lastPage(),
                'per_page' => $contacts->perPage(),
                'total' => $contacts->total(),
            ],
        ]);
    }

    /** Live "how many contacts match these criteria" preview for the campaign-creation segment builder. */
    public function segmentCount(Request $request, ContactSegmentQueryBuilder $builder): JsonResponse
    {
        $filters = $request->validate([
            'pipeline_stages' => 'nullable|array',
            'pipeline_stages.*' => 'string',
            'tags' => 'nullable|array',
            'tags.*' => 'string',
            'sources' => 'nullable|array',
            'sources.*' => 'string',
            'last_contacted_before' => 'nullable|date',
            'last_contacted_after' => 'nullable|date',
        ]);

        return response()->json(['count' => $builder->build($filters)->count()]);
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $this->authorize('create', Contact::class);

        $contact = $this->contacts->create($request->validated(), $request->user());
        event(new ContactUpdatedEvent($contact->id));

        return response()->json([
            'contact' => new ContactResource($contact->load('user')),
            'message' => 'تم إضافة جهة الاتصال بنجاح.',
        ], 201);
    }

    public function show(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        return response()->json([
            'contact' => new ContactResource($contact->load(['user', 'tasks'])->loadCount('tasks')),
        ]);
    }

    public function update(UpdateContactRequest $request, Contact $contact): JsonResponse
    {
        $this->authorize('update', $contact);

        $contact = $this->contacts->update($contact, $request->validated(), $request->user());
        event(new ContactUpdatedEvent($contact->id));

        return response()->json([
            'contact' => new ContactResource($contact->load('user')),
            'message' => 'تم تحديث بيانات جهة الاتصال.',
        ]);
    }

    public function destroy(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('delete', $contact);

        $contactId = $contact->id;
        $this->contacts->delete($contact);
        event(new ContactUpdatedEvent($contactId));

        return response()->json([
            'message' => 'تم حذف جهة الاتصال بنجاح.',
        ]);
    }

    /** Timeline: تاريخ المهام وسجل النشاط لهذه الجهة (رسائل/حملات تُضاف بمراحل لاحقة) */
    public function timeline(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('view', $contact);

        $contact->load('tasks');
        $events = collect();

        foreach ($contact->tasks as $task) {
            $events->push([
                'type' => 'task_created',
                'date' => $task->created_at->toISOString(),
                'title' => $task->title,
                'task_type' => $task->type,
                'priority' => $task->priority,
                'status' => $task->status,
            ]);

            if ($task->completed_at) {
                $events->push([
                    'type' => 'task_completed',
                    'date' => $task->completed_at->toISOString(),
                    'title' => $task->title,
                ]);
            }
        }

        $activityLogs = ActivityLog::where('subject_type', 'contact')
            ->where('subject_id', $contact->id)
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($activityLogs as $log) {
            $events->push([
                'type' => 'activity',
                'date' => $log->created_at->toISOString(),
                'action' => $log->action,
                'description' => $log->description,
            ]);
        }

        return response()->json([
            'contact' => new ContactResource($contact),
            'timeline' => $events->sortByDesc('date')->values(),
        ]);
    }

    public function pipeline(Request $request): JsonResponse
    {
        $limit = min((int) ($request->per_page ?? 50), 200);

        $counts = ContactPolicy::scopeVisibleTo(Contact::inPipeline(), $request->user())
            ->selectRaw('pipeline_stage, count(*) as total')
            ->groupBy('pipeline_stage')
            ->pluck('total', 'pipeline_stage');

        $pipeline = array_map(function (ContactPipelineStage $stage) use ($counts, $limit, $request) {
            $count = (int) ($counts[$stage->value] ?? 0);

            return [
                'stage' => $stage->value,
                'label' => $stage->label(),
                'count' => $count,
                'has_more' => $count > $limit,
                'contacts' => ContactResource::collection(
                    ContactPolicy::scopeVisibleTo(Contact::with('user'), $request->user())
                        ->inPipelineStage($stage)
                        ->orderBy('created_at', 'desc')
                        ->limit($limit)
                        ->get()
                ),
            ];
        }, ContactPipelineStage::cases());

        return response()->json(['pipeline' => $pipeline]);
    }

    /** Load-more within a single pipeline stage — paginated beyond the capped preview from pipeline(). */
    public function pipelineStage(Request $request, string $stage): JsonResponse
    {
        $stageEnum = ContactPipelineStage::tryFrom($stage);
        if (! $stageEnum) {
            return response()->json(['message' => 'حالة غير صالحة'], 422);
        }

        $limit = min((int) ($request->per_page ?? 50), 200);
        $offset = (int) ($request->offset ?? 0);

        $base = ContactPolicy::scopeVisibleTo(Contact::query(), $request->user())->inPipelineStage($stageEnum);
        $total = $base->count();

        $contacts = ContactPolicy::scopeVisibleTo(Contact::with('user'), $request->user())
            ->inPipelineStage($stageEnum)
            ->orderBy('created_at', 'desc')
            ->offset($offset)
            ->limit($limit)
            ->get();

        return response()->json([
            'stage' => $stageEnum->value,
            'count' => $total,
            'has_more' => ($offset + $limit) < $total,
            'contacts' => ContactResource::collection($contacts),
        ]);
    }

    public function importCsv(ImportContactsCsvRequest $request): JsonResponse
    {
        $result = $this->importer->importCsv(
            $request->file('file'),
            $request->user()->id,
            $request->input('contact_list_id'),
        );

        $message = "تم استيراد {$result['imported']} جهة اتصال.";
        if ($result['rejected_international'] > 0) {
            $message .= " تم رفض {$result['rejected_international']} رقم غير كويتي.";
        }

        return response()->json([
            'message' => $message,
            ...$result,
        ]);
    }

    public function exportCsv(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="contacts.csv"',
        ];

        return response()->stream(function () {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, ['الاسم', 'الهاتف', 'البريد', 'التاقات', 'المصدر', 'مشترك', 'محظور']);

            Contact::orderBy('id')->chunk(500, function ($chunk) use ($handle) {
                foreach ($chunk as $c) {
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
            });

            fclose($handle);
        }, 200, $headers);
    }

    public function optOut(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('update', $contact);

        $contact->optOut();
        event(new ContactUpdatedEvent($contact->id));

        return response()->json([
            'contact' => new ContactResource($contact->fresh()),
            'message' => 'تم إلغاء اشتراك جهة الاتصال.',
        ]);
    }

    public function blacklist(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('update', $contact);

        $contact->markBlacklisted();
        event(new ContactUpdatedEvent($contact->id));

        return response()->json([
            'contact' => new ContactResource($contact->fresh()),
            'message' => 'تم إضافة الرقم لقائمة الحظر.',
        ]);
    }

    public function unblacklist(Request $request, Contact $contact): JsonResponse
    {
        $this->authorize('update', $contact);

        $contact->clearBlacklist();
        event(new ContactUpdatedEvent($contact->id));

        return response()->json([
            'contact' => new ContactResource($contact->fresh()),
            'message' => 'تم رفع الحظر عن الرقم.',
        ]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        $query = ContactPolicy::scopeVisibleTo(Contact::whereIn('id', $ids), $request->user());
        $visibleIds = $query->pluck('id');
        $count = $visibleIds->count();

        // Same reasoning as ContactService::delete() — capture affected lists before the
        // cascade removes contact_list_items, so their counts can be resynced afterward.
        $affectedListIds = DB::table('contact_list_items')->whereIn('contact_id', $visibleIds)->pluck('contact_list_id')->unique();

        Contact::whereIn('id', $visibleIds)->delete();

        ContactList::whereIn('id', $affectedListIds)->get()->each->syncCount();

        foreach ($visibleIds as $id) {
            event(new ContactUpdatedEvent($id));
        }

        return response()->json(['message' => "تم حذف {$count} جهة اتصال.", 'deleted' => $count]);
    }

    public function bulkBlacklist(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        $visibleIds = ContactPolicy::scopeVisibleTo(Contact::whereIn('id', $ids), $request->user())->pluck('id');
        $count = Contact::whereIn('id', $visibleIds)->update(['is_blacklisted' => true]);

        foreach ($visibleIds as $id) {
            event(new ContactUpdatedEvent($id));
        }

        return response()->json(['message' => "تم حظر {$count} جهة اتصال.", 'updated' => $count]);
    }

    public function destroyAll(Request $request): JsonResponse
    {
        // Irreversibly wipes every contact company-wide — restricted to the same
        // permission as user management, since nothing less than admin-level trust
        // should be able to truncate this table.
        if (! $request->user()->hasPermission('users.manage')) {
            abort(403);
        }

        $count = Contact::count();

        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('contact_list_items')->truncate();
        Contact::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
        DB::table('contact_lists')->update(['count' => 0]);

        // No per-contact ContactUpdatedEvent here — a full wipe is a distinct, rarer
        // action than individual edits, and firing thousands of individual events would
        // just flood the broadcast channel. Board listeners get the "gone" case at
        // their next request cycle; other pages don't render deleted contacts by id.

        return response()->json(['message' => "تم حذف {$count} جهة اتصال.", 'deleted' => $count]);
    }
}
