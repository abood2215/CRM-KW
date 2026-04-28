<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Contact extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'tags',
        'source',
        'opt_in',
        'opt_in_date',
        'opt_out',
        'opt_out_date',
        'is_blacklisted',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'tags'         => 'array',
            'opt_in'       => 'boolean',
            'opt_out'      => 'boolean',
            'is_blacklisted' => 'boolean',
            'opt_in_date'  => 'datetime',
            'opt_out_date' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lists()
    {
        return $this->belongsToMany(ContactList::class, 'contact_list_items');
    }
}
