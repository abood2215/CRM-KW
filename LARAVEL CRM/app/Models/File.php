<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class File extends Model
{
    protected $fillable = [
        'user_id',
        'original_name',
        'stored_name',
        'path',
        'mime_type',
        'size',
        'category',
    ];

    protected $appends = ['size_formatted'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    // حجم الملف بشكل مقروء
    public function getSizeFormattedAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes >= 1073741824) return round($bytes / 1073741824, 1) . ' GB';
        if ($bytes >= 1048576)    return round($bytes / 1048576, 1)    . ' MB';
        if ($bytes >= 1024)       return round($bytes / 1024, 1)       . ' KB';
        return $bytes . ' B';
    }

    // تحديد فئة الملف من الـ MIME
    public static function detectCategory(string $mimeType): string
    {
        if (str_starts_with($mimeType, 'image/'))   return 'image';
        if ($mimeType === 'text/csv' || $mimeType === 'application/vnd.ms-excel') return 'csv';
        if (in_array($mimeType, [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
        ])) return 'document';
        return 'other';
    }
}
