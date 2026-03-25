<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WhatsappTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'whatsapp_number_id',
        'name',
        'language',
        'category',
        'status',
        'header_type',
        'header_content',
        'body_text',
        'footer_text',
        'buttons',
        'variables_count',
        'last_synced_at',
    ];

    protected function casts(): array
    {
        return [
            'buttons'        => 'array',
            'variables_count' => 'integer',
            'last_synced_at' => 'datetime',
        ];
    }

    public function whatsappNumber()
    {
        return $this->belongsTo(WhatsappNumber::class);
    }
}
