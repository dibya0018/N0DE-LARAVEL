<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Webhook extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'name',
        'description',
        'url',
        'secret',
        'events',
        'sources',
        'payload',
        'status',
        'collection_ids',
        'created_by',
    ];

    protected $casts = [
        'events'  => 'array',
        'sources' => 'array',
        'payload' => 'boolean',
        'status'  => 'boolean',
        'collection_ids' => 'array',
        'id' => 'integer',
        'project_id' => 'integer',
        'created_by' => 'integer',
    ];

    /* -------------------- Relationships -------------------- */

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function collections(): BelongsToMany
    {
        return $this->belongsToMany(Collection::class, 'webhook_collections');
    }

    public function logs(): HasMany
    {
        return $this->hasMany(WebhookLog::class);
    }
} 