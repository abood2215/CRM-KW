<?php

namespace App\Providers;

use App\Models\Campaign;
use App\Models\Contact;
use App\Models\ContactList;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Role;
use App\Models\Task;
use App\Models\User;
use App\Models\WhatsappNumber;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // morph map keeps activity_logs.subject_type stable across model renames/moves —
        // add one entry here per model as it's introduced (Contact, Task, Campaign, ...)
        Relation::morphMap([
            'user' => User::class,
            'contact' => Contact::class,
            'task' => Task::class,
            'campaign' => Campaign::class,
            'contact_list' => ContactList::class,
            'whatsapp_number' => WhatsappNumber::class,
            'conversation' => Conversation::class,
            'message' => Message::class,
            'role' => Role::class,
        ]);

        // Route-group-level authorization (not tied to a model instance, so a Policy
        // doesn't apply) — checks a permission key by name against the user's role.
        Gate::define('permission', fn (User $user, string $key) => $user->hasPermission($key));
    }
}
