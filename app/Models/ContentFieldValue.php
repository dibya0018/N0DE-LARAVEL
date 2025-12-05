<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentFieldValue extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'collection_id',
        'content_entry_id',
        'group_instance_id',
        'field_id',
        'field_type',
        'text_value',
        'number_value',
        'boolean_value',
        'date_value',
        'date_value_end',
        'datetime_value',
        'datetime_value_end',
        'json_value',
    ];

    protected $casts = [
        'number_value' => 'decimal:6',
        'boolean_value' => 'boolean',
        'date_value' => 'date',
        'date_value_end' => 'date',
        'datetime_value' => 'datetime',
        'datetime_value_end' => 'datetime',
        'json_value' => 'array',
        'id' => 'integer',
        'project_id' => 'integer',
        'collection_id' => 'integer',
        'content_entry_id' => 'integer',
        'group_instance_id' => 'integer',
        'field_id' => 'integer',
        'field_type' => 'string',
    ];

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

    public function mediaRelations(): HasMany
    {
        return $this->hasMany(ContentMediaRelation::class, 'field_value_id');
    }

    public function valueRelations(): HasMany
    {
        return $this->hasMany(ContentRelationFieldRelation::class, 'field_value_id');
    }

    public function groupInstance(): BelongsTo
    {
        return $this->belongsTo(ContentFieldGroup::class, 'group_instance_id');
    }
}
