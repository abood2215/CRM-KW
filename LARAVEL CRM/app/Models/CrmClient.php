<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmClient extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'source',
        'service',
        'budget',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'phone' => 'encrypted',
            'email' => 'encrypted',
            'budget' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function tasks()
    {
        return $this->hasMany(CrmTask::class, 'client_id');
    }

    public function conversations()
    {
        return $this->hasMany(Conversation::class, 'client_id');
    }
}
