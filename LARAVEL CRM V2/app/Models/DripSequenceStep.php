<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DripSequenceStep extends Model
{
    protected $fillable = [
        'drip_sequence_id',
        'step_order',
        'delay_days',
        'template_name',
        'template_language',
        'template_variables',
    ];

    protected function casts(): array
    {
        return [
            'step_order' => 'integer',
            'delay_days' => 'integer',
            'template_variables' => 'array',
        ];
    }

    public function sequence(): BelongsTo
    {
        return $this->belongsTo(DripSequence::class, 'drip_sequence_id');
    }
}
