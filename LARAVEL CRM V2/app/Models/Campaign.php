<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'whatsapp_number_id',
        'template_name',
        'template_language',
        'template_variables',
        'contact_list_id',
        'segment_filters',
        'message_text',
        'image_path',
        'status',
        'scheduled_at',
        'started_at',
        'completed_at',
        'total_recipients',
        'sent_count',
        'failed_count',
        'reply_count',
        'open_count',
        'block_count',
        'delay_seconds',
        'stop_on_fail_rate',
    ];

    protected function casts(): array
    {
        return [
            'template_variables' => 'array',
            'segment_filters' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'total_recipients' => 'integer',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
            'reply_count' => 'integer',
            'open_count' => 'integer',
            'block_count' => 'integer',
            'delay_seconds' => 'integer',
            'stop_on_fail_rate' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function whatsappNumber(): BelongsTo
    {
        return $this->belongsTo(WhatsappNumber::class);
    }

    public function contactList(): BelongsTo
    {
        return $this->belongsTo(ContactList::class);
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    public function getProgressPercentageAttribute(): float
    {
        if ($this->total_recipients === 0) {
            return 0;
        }

        return round(($this->sent_count / $this->total_recipients) * 100, 1);
    }
}
