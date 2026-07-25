<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'contact_id',
        'assigned_user_id',
        'chatwoot_conv_id',
        'status',
        'source',
        'is_campaign_origin',
        'last_message',
        'last_message_at',
        'unread_count',
    ];

    protected function casts(): array
    {
        return [
            'is_campaign_origin' => 'boolean',
            'last_message_at' => 'datetime',
            'unread_count' => 'integer',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Whichever WhatsApp number this conversation was last actually sent from — replying
     * "first connected number" every time meant a conversation could silently hop between
     * numbers mid-thread once a business had more than one connected, confusing whichever
     * customer suddenly heard back from a different number than the one they'd been texting.
     * Falls back to the old auto-pick only when the conversation has no send history yet
     * (e.g. every message so far was inbound) or its number is no longer connected.
     */
    public function preferredWhatsappNumber(): ?WhatsappNumber
    {
        $lastUsedId = $this->messages()->whereNotNull('whatsapp_number_id')->latest('sent_at')->value('whatsapp_number_id');

        if ($lastUsedId) {
            $number = WhatsappNumber::find($lastUsedId);
            if ($number && $number->api_type === 'cloud' && $number->status === 'connected') {
                return $number;
            }
        }

        return WhatsappNumber::where('api_type', 'cloud')->where('status', 'connected')->first();
    }
}
