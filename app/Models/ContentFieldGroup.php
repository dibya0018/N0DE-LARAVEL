<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentFieldGroup extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'collection_id',
        'content_entry_id',
        'field_id',
        'sort_order',
    ];

    protected $casts = [
        'project_id' => 'integer',
        'collection_id' => 'integer',
        'content_entry_id' => 'integer',
        'field_id' => 'integer',
        'sort_order' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($group) {
            $group->uuid = (string) Str::uuid();
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

    public function contentEntry(): BelongsTo
    {
        return $this->belongsTo(ContentEntry::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(ContentFieldValue::class, 'group_instance_id');
    }

    public function fieldValues(): HasMany
    {
        return $this->hasMany(ContentFieldValue::class, 'group_instance_id');
    }
}

