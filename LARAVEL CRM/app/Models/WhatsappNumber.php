<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class WhatsappNumber extends Model
{
    use HasFactory;
    protected $fillable = [
        'name',
        'phone',
        'session_name',
        'phone_number_id',
        'access_token',
        'business_account_id',
        'api_type',
        'status',
        'daily_limit',
        'sent_today',
        'week_number',
        'last_sent_at',
    ];
    protected function casts(): array
    {
        return [
            'daily_limit' => 'integer',
            'sent_today' => 'integer',
            'week_number' => 'integer',
            'last_sent_at' => 'datetime',
        ];
    }
    public function isCloud(): bool
    {
        return $this->api_type === 'cloud';
    }
    public function canSend(): bool
    {
        return $this->status === 'connected';
    }
    public function incrementSent(): void
    {
        $this->increment('sent_today');
        $this->update(['last_sent_at' => now()]);
    }
}
