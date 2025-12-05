<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;

class Project extends Model
{
    use HasApiTokens, HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'description',
        'default_locale',
        'locales',
        'disk',
        'public_api',
    ];

    protected $casts = [
        'public_api' => 'boolean',
        'locales' => 'array',
        'id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($project) {
            $project->uuid = (string) Str::uuid();
        });
    }

    public function assets()
    {
        return $this->hasMany(Asset::class);
    }

    public function collections()
    {
        return $this->hasMany(Collection::class)->orderBy('order');
    }

    public function content()
    {
        return $this->hasMany(ContentEntry::class);
    }

    public function members()
    {
        return $this->belongsToMany(User::class)->withTimestamps();
    }

    public function webhooks()
    {
        return $this->hasMany(Webhook::class);
    }
}
