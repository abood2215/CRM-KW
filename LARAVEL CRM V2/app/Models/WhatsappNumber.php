<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappNumber extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'phone',
        'session_name',
        'phone_number_id',
        'access_token',
        'business_account_id',
        'api_type',
        'status',
        'quality_rating',
        'quality_checked_at',
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
            'quality_checked_at' => 'datetime',
        ];
    }

    public function templates(): HasMany
    {
        return $this->hasMany(WhatsappTemplate::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(Campaign::class);
    }

    public function isCloud(): bool
    {
        return $this->api_type === 'cloud';
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
