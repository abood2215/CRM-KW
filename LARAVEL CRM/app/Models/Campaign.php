<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
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
        'delay_seconds',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'total_recipients' => 'integer',
            'sent_count' => 'integer',
            'failed_count' => 'integer',
            'reply_count' => 'integer',
            'delay_seconds' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function recipients()
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    public function getProgressPercentageAttribute(): float
    {
        if ($this->total_recipients === 0) return 0;
        return round(($this->sent_count / $this->total_recipients) * 100, 1);
    }
}
