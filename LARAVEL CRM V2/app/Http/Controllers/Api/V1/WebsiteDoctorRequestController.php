<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Task;
use App\Models\User;
use App\Services\Notifications\NotificationService;
use App\ValueObjects\PhoneNumber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Appointment requests with Prof. Dr. Tariq (Thursdays, limited slots) sent by the public
 * website (motmaina.com). No time is booked here: the request becomes a call task on the
 * contact, and every active staff member gets a notification so the secretaries call the
 * customer back to fix the appointment and the fee.
 */
class WebsiteDoctorRequestController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $token = (string) config('services.website.token');
        abort_unless($token !== '' && hash_equals($token, (string) $request->header('X-Website-Token')), 401);

        $data = $request->validate([
            'request_id' => 'required|integer|min:1',
            'name' => 'nullable|string|max:120',
            'phone' => 'required|string|max:20',
            'topic' => 'required|string|max:60',
            'mode' => 'required|string|max:40',
            'notes' => 'nullable|string|max:500',
            'source' => 'nullable|string|max:80',
        ]);

        $phone = PhoneNumber::normalize($data['phone']);
        $name = trim((string) ($data['name'] ?? ''));
        $marker = 'طلب الموقع #'.$data['request_id'];

        [$contact, $task, $isNew] = DB::transaction(function () use ($data, $phone, $name, $marker) {
            $contact = Contact::firstOrCreate(
                ['phone' => $phone],
                ['name' => $name !== '' ? $name : $phone, 'source' => 'website', 'service' => 'موعد د. طارق'],
            );
            if ($name !== '' && in_array($contact->name, ['', $phone], true)) {
                $contact->update(['name' => $name]);
            }

            // The same website request arriving twice (a retry) must not make a second task
            $existing = Task::where('contact_id', $contact->id)->where('description', 'like', '%'.$marker.'%')->first();
            if ($existing) {
                return [$contact, $existing, false];
            }

            $task = Task::create([
                'contact_id' => $contact->id,
                'title' => 'موعد مع د. طارق — '.$data['topic'].' ('.$data['mode'].')',
                'description' => collect([
                    $marker,
                    'الاسم: '.($name !== '' ? $name : '—'),
                    'الجوال: '.$phone,
                    'نوع الاستشارة: '.$data['topic'],
                    'طريقة الاستشارة: '.$data['mode'],
                    ! empty($data['notes']) ? 'ملاحظات العميل: '.$data['notes'] : null,
                    ! empty($data['source']) ? 'المصدر: '.$data['source'] : null,
                    'المطلوب: التواصل مع العميل وتحديد موعد يوم الخميس والرسوم.',
                ])->filter()->implode("\n"),
                'type' => 'call',
                'priority' => 'high',
                'due_date' => now()->toDateString(),
                'status' => 'pending',
            ]);

            return [$contact, $task, true];
        });

        if ($isNew) {
            $staff = User::with('role')->where('is_active', true)->get()->reject(fn (User $u) => $u->isSandboxed());
            foreach ($staff as $user) {
                NotificationService::send(
                    $user->id,
                    'doctor_request',
                    '📅 طلب موعد مع د. طارق',
                    ($name !== '' ? $name.' · ' : '').$phone.' · '.$data['topic'].' · '.$data['mode'],
                    ['contact_id' => $contact->id, 'task_id' => $task->id],
                );
            }
        }

        return response()->json(['ok' => true, 'contact_id' => $contact->id, 'task_id' => $task->id, 'duplicate' => ! $isNew]);
    }
}
