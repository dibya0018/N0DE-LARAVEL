<?php

namespace App\Models;

use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ContentEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'collection_id',
        'locale',
        'status',
        'created_by',
        'updated_by',
        'published_at',
        'translation_group_id',
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'id' => 'integer',
        'project_id' => 'integer',
        'collection_id' => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($contentEntry) {
            $contentEntry->uuid = (string) Str::uuid();
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

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function fieldValues(): HasMany
    {
        return $this->hasMany(ContentFieldValue::class);
    }

    public function fieldGroups(): HasMany
    {
        return $this->hasMany(ContentFieldGroup::class)->orderBy('sort_order');
    }

    /**
     * Get all translations of this entry (entries in the same translation group)
     */
    public function translations()
    {
        if (!$this->translation_group_id) {
            return collect([]);
        }

        return static::where('translation_group_id', $this->translation_group_id)
            ->where('id', '!=', $this->id)
            ->get();
    }

    /**
     * Get all entries in the same translation group (including this entry)
     */
    public function translationGroup()
    {
        if (!$this->translation_group_id) {
            return collect([$this]);
        }

        return static::where('translation_group_id', $this->translation_group_id)->get();
    }
}
