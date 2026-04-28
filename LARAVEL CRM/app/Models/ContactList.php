<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactList extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'count',
    ];

    protected function casts(): array
    {
        return [
            'count' => 'integer',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function contacts()
    {
        return $this->belongsToMany(Contact::class, 'contact_list_items');
    }

    // تحديث العداد تلقائياً
    public function syncCount(): void
    {
        $this->update(['count' => $this->contacts()->count()]);
    }
}
