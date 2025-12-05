<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentRelationFieldRelation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'field_value_id',
        'related_id',
        'related_type',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
        'id' => 'integer',
        'field_value_id' => 'integer',
    ];

    public function fieldValue(): BelongsTo
    {
        return $this->belongsTo(ContentFieldValue::class, 'field_value_id');
    }

    public function related()
    {
        return $this->morphTo('related');
    }
}
