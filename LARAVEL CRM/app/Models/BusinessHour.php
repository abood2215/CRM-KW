<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessHour extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'day_of_week',
        'start_time',
        'end_time',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public static function isWithinBusinessHours(): bool
    {
        $now = now();
        $hour = self::where('day_of_week', $now->dayOfWeek)
            ->where('is_active', true)
            ->first();

        if (!$hour) return false;

        $currentTime = $now->format('H:i:s');
        return $currentTime >= $hour->start_time && $currentTime <= $hour->end_time;
    }
}
