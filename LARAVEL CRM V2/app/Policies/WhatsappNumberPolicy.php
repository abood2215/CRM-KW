<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WhatsappNumber;

class WhatsappNumberPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('whatsapp_numbers.manage');
    }

    public function update(User $user, WhatsappNumber $number): bool
    {
        return $user->hasPermission('whatsapp_numbers.manage');
    }

    public function delete(User $user, WhatsappNumber $number): bool
    {
        return $user->hasPermission('whatsapp_numbers.manage');
    }
}
