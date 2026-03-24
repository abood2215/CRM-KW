<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'chatwoot_message_id',
        'whatsapp_message_id',
        'content',
        'type',
        'direction',
        'is_private',
        'sender_name',
        'status',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'is_private' => 'boolean',
            'sent_at' => 'datetime',
        ];
    }

    public function conversation()
    {
        return $this->belongsTo(Conversation::class);
    }
}
