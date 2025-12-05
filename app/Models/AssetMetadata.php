<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssetMetadata extends Model
{
    protected $fillable = [
        'asset_id',
        'width',
        'height',
        'duration',
        'bitrate',
        'framerate',
        'channels',
        'alt_text',
        'title',
        'caption',
        'description',
        'author',
        'copyright',
        'metadata'
    ];
    
    protected $casts = [
        'metadata' => 'array',
        'width' => 'integer',
        'height' => 'integer',
        'duration' => 'integer',
        'bitrate' => 'integer',
        'framerate' => 'float',
        'channels' => 'integer',
        'id' => 'integer',
        'asset_id' => 'integer',
    ];
    
    public function asset()
    {
        return $this->belongsTo(Asset::class);
    }
} 