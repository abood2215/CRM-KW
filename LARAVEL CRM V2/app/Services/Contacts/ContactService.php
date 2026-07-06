<?php

namespace App\Services\Contacts;

use App\Enums\UserRole;
use App\Models\Contact;
use App\Models\User;
use App\Services\Activity\ActivityLogger;

class ContactService
{
    public function create(array $data, User $actor): Contact
    {
        if ($actor->role === UserRole::Agent || ! isset($data['user_id'])) {
            $data['user_id'] = $actor->id;
        }

        $contact = Contact::create($data);

        ActivityLogger::record($contact, 'create', "إضافة جهة اتصال: {$contact->name}");

        return $contact;
    }

    public function update(Contact $contact, array $data, User $actor): Contact
    {
        if ($actor->role === UserRole::Agent) {
            unset($data['user_id']);
        }

        $contact->update($data);

        ActivityLogger::record($contact, 'update', "تحديث جهة اتصال: {$contact->name}");

        return $contact->fresh();
    }

    public function delete(Contact $contact): void
    {
        ActivityLogger::record($contact, 'delete', "حذف جهة اتصال: {$contact->name}");

        $contact->delete();
    }
}
