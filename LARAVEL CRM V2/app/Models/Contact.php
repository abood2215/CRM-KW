<?php

namespace App\Models;

use App\Enums\ContactPipelineStage;
use App\Models\Concerns\HasCampaignConsent;
use App\Models\Concerns\HasPipelineStage;
use App\ValueObjects\PhoneNumber;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use HasCampaignConsent, HasFactory, HasPipelineStage;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'source',
        'tags',
        'pipeline_stage',
        'service',
        'budget',
        'notes',
        'opt_in',
        'opt_in_date',
        'opt_out',
        'opt_out_date',
        'is_blacklisted',
        'blacklisted_until',
        'fail_count',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'pipeline_stage' => ContactPipelineStage::class,
            'budget' => 'decimal:2',
            'opt_in' => 'boolean',
            'opt_in_date' => 'datetime',
            'opt_out' => 'boolean',
            'opt_out_date' => 'datetime',
            'is_blacklisted' => 'boolean',
            'blacklisted_until' => 'datetime',
            'fail_count' => 'integer',
        ];
    }

    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (string $value) => PhoneNumber::normalize($value),
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function lists(): BelongsToMany
    {
        return $this->belongsToMany(ContactList::class, 'contact_list_items');
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }
}
