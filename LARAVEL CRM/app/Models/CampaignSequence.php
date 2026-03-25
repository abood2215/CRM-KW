<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CampaignSequence extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'step_number',
        'delay_days',
        'template_name',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'step_number' => 'integer',
            'delay_days'  => 'integer',
        ];
    }

    public function campaign()
    {
        return $this->belongsTo(Campaign::class);
    }
}
