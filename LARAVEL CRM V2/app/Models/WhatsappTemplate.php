<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'whatsapp_number_id',
        'meta_template_id',
        'name',
        'language',
        'category',
        'status',
        'rejection_reason',
        'header_type',
        'header_content',
        'header_media_id',
        'body_text',
        'footer_text',
        'buttons',
        'variables_count',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'buttons' => 'array',
            'variables_count' => 'integer',
            'last_synced_at' => 'datetime',
        ];
    }

    public function whatsappNumber(): BelongsTo
    {
        return $this->belongsTo(WhatsappNumber::class);
    }
}
