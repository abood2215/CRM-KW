<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignRecipient extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'phone',
        'name',
        'status',
        'sent_at',
        'error_message',
        'whatsapp_message_id',
        'variables',
    ];

    protected function casts(): array
    {
        return [
            'sent_at'   => 'datetime',
            'variables' => 'array',
        ];
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
