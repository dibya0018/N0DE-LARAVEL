<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class CollectionTemplateField extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'collection_template_fields';

    protected $fillable = [
        'type',
        'label',
        'name',
        'description',
        'placeholder',
        'options',
        'validations',
        'collection_template_id',
        'order',
        'uuid',
    ];

    protected $casts = [
        'options' => 'array',
        'validations' => 'array',
        'order' => 'integer',
        'id' => 'integer',
        'collection_template_id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($field) {
            $field->uuid = (string) Str::uuid();
        });
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(CollectionTemplate::class, 'collection_template_id');
    }
} 