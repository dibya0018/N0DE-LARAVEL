<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ColumnSetting extends Model
{
    protected $fillable = [
        'user_id',
        'page',
        'settings',
    ];

    protected $casts = [
        'settings' => 'array',
        'id' => 'integer',
        'user_id' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
