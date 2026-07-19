<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Appointment\StoreAppointmentRequest;
use App\Http\Requests\Appointment\UpdateAppointmentRequest;
use App\Http\Resources\AppointmentResource;
use App\Models\Appointment;
use App\Policies\AppointmentPolicy;
use App\Services\Activity\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AppointmentPolicy::scopeVisibleTo(Appointment::with(['user', 'contact']), $request->user());

        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date')) {
            $query->whereDate('starts_at', $request->date);
        }

        if ($request->boolean('upcoming_only')) {
            $query->where('starts_at', '>=', now())->whereNotIn('status', ['cancelled', 'completed']);
        }

        $appointments = $query->orderBy('starts_at', 'asc')->paginate($request->per_page ?? 30);

        return response()->json([
            'appointments' => AppointmentResource::collection($appointments),
            'meta' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ],
        ]);
    }

    public function store(StoreAppointmentRequest $request): JsonResponse
    {
        $this->authorize('create', Appointment::class);

        $data = $request->validated();
        $data['status'] = 'confirmed';
        $data['source'] = 'internal';
        $data['duration_minutes'] = $data['duration_minutes'] ?? 60;

        $appointment = Appointment::create($data);
        ActivityLogger::record($appointment, 'create', "إنشاء موعد: {$appointment->service}");

        return response()->json([
            'appointment' => new AppointmentResource($appointment->load(['user', 'contact'])),
            'message' => 'تم إنشاء الموعد بنجاح.',
        ], 201);
    }

    public function update(UpdateAppointmentRequest $request, Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $appointment->update($request->validated());
        ActivityLogger::record($appointment, 'update', "تحديث موعد: {$appointment->service}");

        return response()->json([
            'appointment' => new AppointmentResource($appointment->fresh()->load(['user', 'contact'])),
            'message' => 'تم تحديث الموعد.',
        ]);
    }

    public function destroy(Appointment $appointment): JsonResponse
    {
        $this->authorize('delete', $appointment);

        ActivityLogger::record($appointment, 'delete', "حذف موعد: {$appointment->service}");
        $appointment->delete();

        return response()->json(['message' => 'تم حذف الموعد.']);
    }

    public function confirm(Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $appointment->update(['status' => 'confirmed']);
        ActivityLogger::record($appointment, 'confirm', "تأكيد موعد: {$appointment->service}");

        return response()->json([
            'appointment' => new AppointmentResource($appointment->fresh()->load(['user', 'contact'])),
            'message' => 'تم تأكيد الموعد.',
        ]);
    }

    public function cancel(Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $appointment->update(['status' => 'cancelled']);
        ActivityLogger::record($appointment, 'cancel', "إلغاء موعد: {$appointment->service}");

        return response()->json([
            'appointment' => new AppointmentResource($appointment->fresh()->load(['user', 'contact'])),
            'message' => 'تم إلغاء الموعد.',
        ]);
    }

    public function complete(Appointment $appointment): JsonResponse
    {
        $this->authorize('update', $appointment);

        $appointment->update(['status' => 'completed']);
        ActivityLogger::record($appointment, 'complete', "إنجاز موعد: {$appointment->service}");

        return response()->json([
            'appointment' => new AppointmentResource($appointment->fresh()->load(['user', 'contact'])),
            'message' => 'تم إنجاز الموعد.',
        ]);
    }
}
