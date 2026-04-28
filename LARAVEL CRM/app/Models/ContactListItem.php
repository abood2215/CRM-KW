<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ContactListItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'contact_list_id',
        'contact_id',
    ];

    public function list()
    {
        return $this->belongsTo(ContactList::class, 'contact_list_id');
    }

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }
}
