<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'phone',
        'last_seen_at',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_seen_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function clients()
    {
        return $this->hasMany(CrmClient::class);
    }

    public function tasks()
    {
        return $this->hasMany(CrmTask::class);
    }

    public function assignedConversations()
    {
        return $this->hasMany(Conversation::class, 'assigned_user_id');
    }

    public function cannedResponses()
    {
        return $this->hasMany(CannedResponse::class);
    }

    public function campaigns()
    {
        return $this->hasMany(Campaign::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isManager(): bool
    {
        return $this->role === 'manager';
    }

    public function isOnline(): bool
    {
        return $this->last_seen_at && $this->last_seen_at->diffInMinutes(now()) < 5;
    }
}
