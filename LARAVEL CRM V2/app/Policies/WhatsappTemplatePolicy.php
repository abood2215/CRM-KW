<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WhatsappTemplate;

class WhatsappTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, WhatsappTemplate $template): bool
    {
        return true;
    }

    /** Templates are account-wide and need real Meta approval — a mistake here breaks every campaign that uses it. */
    public function create(User $user): bool
    {
        return $user->hasPermission('whatsapp_templates.manage');
    }

    public function update(User $user, WhatsappTemplate $template): bool
    {
        return $user->hasPermission('whatsapp_templates.manage');
    }

    public function delete(User $user, WhatsappTemplate $template): bool
    {
        return $user->hasPermission('whatsapp_templates.manage');
    }

    public function sync(User $user): bool
    {
        return $user->hasPermission('whatsapp_templates.manage');
    }
}
