<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class AppointmentPolicy
{
    /** Users without appointments.view_all only see appointments assigned to them. */
    public static function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if (! $user->hasPermission('appointments.view_all')) {
            return $query->where('user_id', $user->id);
        }

        return $query;
    }

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Appointment $appointment): bool
    {
        return $user->hasPermission('appointments.view_all') || $appointment->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return $user->hasPermission('appointments.view_all') || $appointment->user_id === $user->id;
    }

    public function delete(User $user, Appointment $appointment): bool
    {
        return $user->hasPermission('appointments.view_all') || $appointment->user_id === $user->id;
    }
}
