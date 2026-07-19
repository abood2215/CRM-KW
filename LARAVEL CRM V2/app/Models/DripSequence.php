<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DripSequence extends Model
{
    protected $fillable = [
        'whatsapp_number_id',
        'name',
        'description',
        'status',
    ];

    public function whatsappNumber(): BelongsTo
    {
        return $this->belongsTo(WhatsappNumber::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(DripSequenceStep::class)->orderBy('step_order');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(DripEnrollment::class);
    }
}
