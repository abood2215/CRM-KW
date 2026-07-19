<?php

namespace App\Jobs;

use App\Models\Appointment;
use App\Models\WhatsappNumber;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/** Scheduled every 15 minutes from routes/console.php. */
class SendAppointmentRemindersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
        if (! $number) {
            return;
        }

        $due = Appointment::where('status', 'confirmed')
            ->whereNull('reminder_sent_at')
            ->whereBetween('starts_at', [now(), now()->addDay()])
            ->with('contact')
            ->get();

        if ($due->isEmpty()) {
            return;
        }

        $sender = WhatsAppSenderFactory::make($number);
        $sent = 0;

        foreach ($due as $appointment) {
            $phone = $appointment->contact?->phone ?? $appointment->customer_phone;
            if (! $phone) {
                continue;
            }

            try {
                $sender->sendTemplate(
                    $phone,
                    'appointment_reminder',
                    'ar',
                    $this->buildComponents([
                        $appointment->contact?->name ?? $appointment->customer_name,
                        $appointment->service,
                        $appointment->starts_at->format('Y-m-d H:i'),
                    ]),
                );

                $appointment->update(['reminder_sent_at' => now()]);
                $sent++;
            } catch (\Exception $e) {
                Log::error('[SendAppointmentRemindersJob] فشل إرسال تذكير الموعد', [
                    'appointment_id' => $appointment->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($sent > 0) {
            Log::info("[SendAppointmentRemindersJob] أُرسل {$sent} تذكير موعد");
        }
    }

    private function buildComponents(array $variables): array
    {
        return [[
            'type' => 'body',
            'parameters' => array_map(fn ($v) => ['type' => 'text', 'text' => (string) $v], $variables),
        ]];
    }
}
