<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DripEnrollment extends Model
{
    protected $fillable = [
        'drip_sequence_id',
        'contact_id',
        'enrolled_at',
        'current_step',
        'status',
        'next_send_at',
    ];

    protected function casts(): array
    {
        return [
            'enrolled_at' => 'datetime',
            'current_step' => 'integer',
            'next_send_at' => 'datetime',
        ];
    }

    public function sequence(): BelongsTo
    {
        return $this->belongsTo(DripSequence::class, 'drip_sequence_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
