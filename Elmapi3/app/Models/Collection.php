<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Collection extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'name',
        'slug',
        'order',
        'uuid',
        'description',
        'is_singleton',
    ];

    protected $casts = [
        'order' => 'integer',
        'is_singleton' => 'boolean',
        'id' => 'integer',
        'project_id' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($collection) {
            $collection->uuid = (string) Str::uuid();
        });
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function fields(): HasMany
    {
        return $this->hasMany(Field::class)
            ->whereNull('parent_field_id')
            ->with('children')
            ->orderBy('order');
    }

    public function allFields(): HasMany
    {
        return $this->hasMany(Field::class)->orderBy('order');
    }

    public function contentEntries()
    {
        return $this->hasMany(ContentEntry::class);
    }

    public function webhooks()
    {
        return $this->belongsToMany(Webhook::class, 'webhook_collections');
    }
}
