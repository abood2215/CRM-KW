<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappNumber extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'session_name',
        'status',
        'daily_limit',
        'sent_today',
        'week_number',
        'last_sent_at',
    ];

    protected function casts(): array
    {
        return [
            'daily_limit' => 'integer',
            'sent_today' => 'integer',
            'week_number' => 'integer',
            'last_sent_at' => 'datetime',
        ];
    }

    public function canSend(): bool
    {
        return $this->status === 'connected' && $this->sent_today < $this->daily_limit;
    }

    public function incrementSent(): void
    {
        $this->increment('sent_today');
        $this->update(['last_sent_at' => now()]);
    }
}
