<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\DripSequence\StoreDripSequenceRequest;
use App\Http\Requests\DripSequence\UpdateDripSequenceRequest;
use App\Http\Resources\DripEnrollmentResource;
use App\Http\Resources\DripSequenceResource;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\DripEnrollment;
use App\Models\DripSequence;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DripSequenceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Shared team resource by design — except a sandboxed test account, same restriction
        // as CampaignController::index and ContactListController::index.
        if ($request->user()->isSandboxed()) {
            return response()->json(['sequences' => []]);
        }

        $sequences = DripSequence::withCount('steps')
            ->withCount(['enrollments as active_enrollments_count' => fn ($q) => $q->where('status', 'active')])
            ->withCount(['enrollments as completed_enrollments_count' => fn ($q) => $q->where('status', 'completed')])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['sequences' => DripSequenceResource::collection($sequences)]);
    }

    public function show(Request $request, DripSequence $sequence): JsonResponse
    {
        abort_if($request->user()->isSandboxed(), 403);

        $sequence->load(['steps', 'enrollments.contact']);

        return response()->json([
            'sequence' => new DripSequenceResource($sequence),
            'enrollments' => DripEnrollmentResource::collection($sequence->enrollments),
        ]);
    }

    public function store(StoreDripSequenceRequest $request): JsonResponse
    {
        $this->authorize('create', DripSequence::class);

        $sequence = DripSequence::create($request->validated());
        ActivityLogger::record($sequence, 'create', "إنشاء سلسلة متابعة: {$sequence->name}");

        return response()->json([
            'sequence' => new DripSequenceResource($sequence),
            'message' => 'تم إنشاء السلسلة بنجاح.',
        ], 201);
    }

    public function update(UpdateDripSequenceRequest $request, DripSequence $sequence): JsonResponse
    {
        $this->authorize('update', $sequence);

        $sequence->update($request->validated());
        ActivityLogger::record($sequence, 'update', "تحديث سلسلة متابعة: {$sequence->name}");

        return response()->json([
            'sequence' => new DripSequenceResource($sequence->fresh()),
            'message' => 'تم تحديث السلسلة.',
        ]);
    }

    public function destroy(DripSequence $sequence): JsonResponse
    {
        $this->authorize('delete', $sequence);

        ActivityLogger::record($sequence, 'delete', "حذف سلسلة متابعة: {$sequence->name}");
        $sequence->delete();

        return response()->json(['message' => 'تم حذف السلسلة.']);
    }

    /** Replaces the whole ordered step list in one call — matches how a step editor UI saves. */
    public function replaceSteps(Request $request, DripSequence $sequence): JsonResponse
    {
        $this->authorize('update', $sequence);

        $request->validate([
            'steps' => 'required|array|min:1',
            'steps.*.delay_days' => 'required|integer|min:0',
            'steps.*.template_name' => 'required|string|max:255',
            'steps.*.template_language' => 'nullable|string|max:10',
            'steps.*.template_variables' => 'nullable|array',
        ]);

        DB::transaction(function () use ($request, $sequence) {
            $sequence->steps()->delete();

            foreach (array_values($request->steps) as $index => $step) {
                $sequence->steps()->create([
                    'step_order' => $index + 1,
                    'delay_days' => $step['delay_days'],
                    'template_name' => $step['template_name'],
                    'template_language' => $step['template_language'] ?? 'ar',
                    'template_variables' => $step['template_variables'] ?? null,
                ]);
            }
        });

        ActivityLogger::record($sequence, 'update', "تحديث خطوات سلسلة: {$sequence->name}");

        return response()->json([
            'sequence' => new DripSequenceResource($sequence->fresh()->load('steps')),
            'message' => 'تم حفظ خطوات السلسلة.',
        ]);
    }

    /** Manual enrollment only, by design — contacts join a sequence when staff explicitly add them, never automatically. */
    public function enroll(Request $request, DripSequence $sequence): JsonResponse
    {
        $this->authorize('update', $sequence);

        $request->validate([
            'contact_ids' => 'nullable|array',
            'contact_ids.*' => 'integer|exists:contacts,id',
            'contact_list_id' => 'nullable|exists:contact_lists,id',
        ]);

        if (empty($request->contact_ids) && ! $request->contact_list_id) {
            return response()->json(['message' => 'اختر جهات اتصال أو قائمة تواصل للتسجيل.'], 422);
        }

        $firstStep = $sequence->steps()->orderBy('step_order')->first();
        if (! $firstStep) {
            return response()->json(['message' => 'أضف خطوات للسلسلة أولاً قبل تسجيل جهات اتصال.'], 422);
        }

        $contactIds = $request->contact_list_id
            ? ContactList::findOrFail($request->contact_list_id)->contacts()->pluck('contacts.id')->all()
            : $request->contact_ids;

        $alreadyEnrolled = DripEnrollment::where('drip_sequence_id', $sequence->id)
            ->whereIn('contact_id', $contactIds)
            ->pluck('contact_id')
            ->all();

        $contacts = Contact::whereIn('id', $contactIds)->get();
        $enrolledCount = 0;
        $skippedBlocked = 0;
        $skippedDuplicate = 0;
        $now = now();

        foreach ($contacts as $contact) {
            if (in_array($contact->id, $alreadyEnrolled, true)) {
                $skippedDuplicate++;

                continue;
            }

            if ($contact->opt_out || $contact->is_blacklisted) {
                $skippedBlocked++;

                continue;
            }

            DripEnrollment::create([
                'drip_sequence_id' => $sequence->id,
                'contact_id' => $contact->id,
                'enrolled_at' => $now,
                'current_step' => 0,
                'status' => 'active',
                'next_send_at' => $now->copy()->addDays($firstStep->delay_days),
            ]);
            $enrolledCount++;
        }

        ActivityLogger::record($sequence, 'enroll', "تسجيل {$enrolledCount} جهة اتصال في سلسلة: {$sequence->name}");

        return response()->json([
            'message' => "تم تسجيل {$enrolledCount} جهة اتصال بنجاح.",
            'enrolled_count' => $enrolledCount,
            'skipped_blocked_count' => $skippedBlocked,
            'skipped_duplicate_count' => $skippedDuplicate,
        ]);
    }

    public function stopEnrollment(DripEnrollment $enrollment): JsonResponse
    {
        $this->authorize('update', $enrollment->sequence);

        $enrollment->update(['status' => 'stopped', 'next_send_at' => null]);

        return response()->json([
            'enrollment' => new DripEnrollmentResource($enrollment->fresh()->load('contact')),
            'message' => 'تم إيقاف التسجيل.',
        ]);
    }
}
