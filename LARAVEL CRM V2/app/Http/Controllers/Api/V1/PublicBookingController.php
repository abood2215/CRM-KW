<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\BusinessHour;
use App\Models\Contact;
use App\Models\WhatsappNumber;
use App\Services\Whatsapp\WhatsAppSenderFactory;
use App\ValueObjects\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Unauthenticated by design — customers book their own appointment without an account.
 * Never trust anything here as far as the internal /appointments screens do; every
 * booking lands as status=pending, source=self_service so staff confirm it manually.
 */
class PublicBookingController extends Controller
{
    private const SLOT_STEP_MINUTES = 30;

    public function slots(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date|after_or_equal:today',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
        ]);

        $date = Carbon::parse($request->date)->startOfDay();
        $duration = (int) ($request->duration_minutes ?? 60);

        $businessHour = BusinessHour::where('day_of_week', (int) $date->format('w'))
            ->where('is_active', true)
            ->first();

        if (! $businessHour) {
            return response()->json(['slots' => []]);
        }

        [$startH, $startM] = array_map('intval', explode(':', $businessHour->start_time));
        [$endH, $endM] = array_map('intval', explode(':', $businessHour->end_time));
        $dayStart = $date->copy()->setTime($startH, $startM);
        $dayEnd = $date->copy()->setTime($endH, $endM);

        $booked = Appointment::whereDate('starts_at', $date->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->get(['starts_at', 'duration_minutes']);

        $now = now();
        $slots = [];
        $cursor = $dayStart->copy();

        while ($cursor->copy()->addMinutes($duration)->lte($dayEnd)) {
            $slotStart = $cursor->copy();
            $slotEnd = $slotStart->copy()->addMinutes($duration);

            if ($slotStart->gt($now) && ! $this->overlapsAny($slotStart, $slotEnd, $booked)) {
                $slots[] = $slotStart->format('H:i');
            }

            $cursor->addMinutes(self::SLOT_STEP_MINUTES);
        }

        return response()->json(['slots' => $slots]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string',
            'service' => 'required|string|max:255',
            'starts_at' => 'required|date|after:now',
            'duration_minutes' => 'sometimes|integer|min:15|max:480',
            'notes' => 'nullable|string',
        ]);

        $duration = (int) ($request->duration_minutes ?? 60);
        $startsAt = Carbon::parse($request->starts_at);
        $endsAt = $startsAt->copy()->addMinutes($duration);

        $booked = Appointment::whereDate('starts_at', $startsAt->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->get(['starts_at', 'duration_minutes']);

        if ($this->overlapsAny($startsAt, $endsAt, $booked)) {
            return response()->json(['message' => 'هذا الموعد لم يعد متاحاً، الرجاء اختيار وقت آخر.'], 422);
        }

        $phone = PhoneNumber::normalize($request->phone);

        $contact = Contact::firstOrCreate(
            ['phone' => $phone],
            ['name' => $request->name, 'source' => 'booking', 'service' => $request->service],
        );

        $appointment = Appointment::create([
            'contact_id' => $contact->id,
            'customer_name' => $request->name,
            'customer_phone' => $phone,
            'service' => $request->service,
            'starts_at' => $startsAt,
            'duration_minutes' => $duration,
            'status' => 'pending',
            'source' => 'self_service',
            'booking_token' => Str::random(40),
            'notes' => $request->notes,
        ]);

        $this->sendConfirmation($appointment, $contact);

        return response()->json([
            'message' => 'تم استلام طلب حجزك بنجاح، سيتم التواصل معك لتأكيد الموعد.',
            'booking_token' => $appointment->booking_token,
            'starts_at' => $appointment->starts_at->toISOString(),
        ], 201);
    }

    private function overlapsAny(Carbon $start, Carbon $end, $bookedAppointments): bool
    {
        return $bookedAppointments->contains(function (Appointment $appt) use ($start, $end) {
            $apptStart = Carbon::parse($appt->starts_at);
            $apptEnd = $apptStart->copy()->addMinutes($appt->duration_minutes);

            return $start->lt($apptEnd) && $end->gt($apptStart);
        });
    }

    /** Confirmation must never block the booking itself — a template send failure just gets logged. */
    private function sendConfirmation(Appointment $appointment, Contact $contact): void
    {
        $number = WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();

        if (! $number) {
            return;
        }

        try {
            $sender = WhatsAppSenderFactory::make($number);
            $sender->sendTemplate(
                $contact->phone,
                'appointment_confirmation',
                'ar',
                $this->buildComponents([
                    $contact->name,
                    $appointment->service,
                    $appointment->starts_at->format('Y-m-d H:i'),
                ]),
            );
        } catch (\Exception $e) {
            Log::warning('[PublicBookingController] فشل إرسال تأكيد الحجز', ['error' => $e->getMessage()]);
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
