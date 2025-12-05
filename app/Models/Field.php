<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Field extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'collection_fields';

    protected $fillable = [
        'type',
        'label',
        'name',
        'description',
        'placeholder',
        'options',
        'validations',
        'project_id',
        'collection_id',
        'parent_field_id',
        'order',
        'uuid',
    ];

    protected $casts = [
        'options' => 'array',
        'validations' => 'array',
        'order' => 'integer',
        'id' => 'integer',
        'project_id' => 'integer',
        'collection_id' => 'integer',
        'parent_field_id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($field) {
            $field->uuid = (string) Str::uuid();
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function collection(): BelongsTo
    {
        return $this->belongsTo(Collection::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Field::class, 'parent_field_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Field::class, 'parent_field_id')->orderBy('order');
    }
}
