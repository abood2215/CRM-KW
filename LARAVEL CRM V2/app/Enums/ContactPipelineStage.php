<?php

namespace App\Enums;

enum ContactPipelineStage: string
{
    case New = 'new';
    case Contacted = 'contacted';
    case Interested = 'interested';
    case Booked = 'booked';
    case Active = 'active';
    case Following = 'following';

    public function label(): string
    {
        return match ($this) {
            self::New => 'جديد',
            self::Contacted => 'تم التواصل',
            self::Interested => 'مهتم',
            self::Booked => 'محجوز',
            self::Active => 'نشط',
            self::Following => 'متابعة',
        };
    }
}
