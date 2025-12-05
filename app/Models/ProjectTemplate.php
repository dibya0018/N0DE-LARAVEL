<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ProjectTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'has_demo_data',
        'data',
        'uuid',
    ];

    protected $casts = [
        'data' => 'array',
        'has_demo_data' => 'boolean',
        'id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($template) {
            $template->uuid = (string) Str::uuid();
        });
    }
} 