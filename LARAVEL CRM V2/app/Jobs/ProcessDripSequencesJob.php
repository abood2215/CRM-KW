<?php

namespace App\Jobs;

use App\Models\DripEnrollment;
use App\Models\WhatsappNumber;
use App\Services\Conversations\BlacklistPolicyService;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/** Scheduled every 15 minutes from routes/console.php. Enrollment is always manual — this job only advances contacts already enrolled. */
class ProcessDripSequencesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(BlacklistPolicyService $blacklistPolicy): void
    {
        $due = DripEnrollment::where('status', 'active')
            ->whereNotNull('next_send_at')
            ->where('next_send_at', '<=', now())
            ->with(['sequence.steps', 'contact'])
            ->get();

        if ($due->isEmpty()) {
            return;
        }

        $sent = 0;
        $stopped = 0;

        foreach ($due as $enrollment) {
            $result = $this->processEnrollment($enrollment, $blacklistPolicy);
            if ($result === 'sent') {
                $sent++;
            } elseif ($result === 'stopped') {
                $stopped++;
            }
        }

        Log::info("[ProcessDripSequencesJob] أُرسل {$sent} خطوة، توقف {$stopped} تسجيل");
    }

    private function processEnrollment(DripEnrollment $enrollment, BlacklistPolicyService $blacklistPolicy): string
    {
        $contact = $enrollment->contact;
        $sequence = $enrollment->sequence;

        if (! $contact || ! $sequence) {
            $enrollment->update(['status' => 'stopped', 'next_send_at' => null]);

            return 'stopped';
        }

        if ($contact->opt_out || $contact->is_blacklisted) {
            $enrollment->update(['status' => 'stopped', 'next_send_at' => null]);

            return 'stopped';
        }

        $nextStep = $sequence->steps->firstWhere('step_order', $enrollment->current_step + 1);

        if (! $nextStep) {
            $enrollment->update(['status' => 'completed', 'next_send_at' => null]);

            return 'completed';
        }

        $number = WhatsappNumber::find($sequence->whatsapp_number_id)
            ?? WhatsappNumber::where('status', 'connected')->first();

        if (! $number) {
            Log::warning("[ProcessDripSequencesJob] لا يوجد رقم واتساب متصل — سلسلة #{$sequence->id}");

            return 'skipped';
        }

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $sender->sendTemplate(
                $contact->phone,
                $nextStep->template_name,
                $nextStep->template_language ?? 'ar',
                $this->buildComponents($nextStep->template_variables ?? []),
            );

            $newStepNumber = $enrollment->current_step + 1;
            $followingStep = $sequence->steps->firstWhere('step_order', $newStepNumber + 1);

            $enrollment->update([
                'current_step' => $newStepNumber,
                'status' => $followingStep ? 'active' : 'completed',
                'next_send_at' => $followingStep ? $enrollment->enrolled_at->copy()->addDays($followingStep->delay_days) : null,
            ]);

            return 'sent';
        } catch (\Exception $e) {
            Log::error('[ProcessDripSequencesJob] فشل إرسال خطوة السلسلة', [
                'enrollment_id' => $enrollment->id,
                'error' => $e->getMessage(),
            ]);

            $isPermanent = $blacklistPolicy->isPermanentBlock(null, $e->getMessage());
            $blacklistPolicy->applyFailure($contact, $isPermanent);

            // One failed send stops this contact's run in this sequence rather than retrying
            // indefinitely every 15 minutes — matches how campaign sends treat a failed recipient.
            $enrollment->update(['status' => 'stopped', 'next_send_at' => null]);

            return 'stopped';
        }
    }

    private function buildComponents(array $variables): array
    {
        if (empty($variables)) {
            return [];
        }

        return [[
            'type' => 'body',
            'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => (string) $v], array_values($variables)),
        ]];
    }
}
