<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'chatwoot_conv_id',
        'client_id',
        'assigned_user_id',
        'status',
        'last_message',
        'last_message_at',
        'unread_count',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'unread_count' => 'integer',
        ];
    }

    public function client()
    {
        return $this->belongsTo(CrmClient::class, 'client_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
}
