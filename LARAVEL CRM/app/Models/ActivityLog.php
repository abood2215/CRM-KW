<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'model_type',
        'model_id',
        'description',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // سجّل نشاطاً جديداً بسهولة
    public static function log(
        string $action,
        string $description,
        ?int $userId = null,
        ?string $modelType = null,
        ?int $modelId = null,
        array $metadata = []
    ): self {
        return self::create([
            'user_id'    => $userId,
            'action'     => $action,
            'model_type' => $modelType,
            'model_id'   => $modelId,
            'description' => $description,
            'metadata'   => $metadata ?: null,
        ]);
    }
}
