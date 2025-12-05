<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class Asset extends Model
{
    use SoftDeletes;
    
    protected $fillable = [
        'project_id',
        'filename',
        'original_filename',
        'mime_type',
        'extension',
        'size',
        'disk',
        'path',
        'created_by',
        'updated_by'
    ];
    
    protected $appends = [
        'url',
        'thumbnail_url',
        'full_url',
        'formatted_size'
    ];

    protected $casts = [
        'id' => 'integer',
        'project_id' => 'integer',
        'created_by' => 'integer',
        'updated_by' => 'integer',
    ];
    
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($asset) {
            $asset->uuid = Str::uuid();
        });
    }
    
    public function project()
    {
        return $this->belongsTo(Project::class);
    }
    
    public function metadata()
    {
        return $this->hasOne(AssetMetadata::class);
    }
    
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    public function url()
    {
        return Storage::disk($this->disk)->url($this->path);
    }
    
    public function delete()
    {
        try {
            // Delete the actual file
            if (Storage::disk($this->disk)->exists($this->path)) {
                $deleted = Storage::disk($this->disk)->delete($this->path);
            }
            
            // Delete thumbnail if it exists
            if ($this->isImage()) {
                $thumbnailPath = $this->getThumbnailPath();
                if (Storage::disk($this->disk)->exists($thumbnailPath)) {
                    $thumbnailDeleted = Storage::disk($this->disk)->delete($thumbnailPath);
                }
            }
            
            // Delete metadata
            if ($this->metadata) {
                $this->metadata->delete();
            }
            
            return parent::delete();
        } catch (\Exception $e) {
            throw $e;
        }
    }
    
    public function isImage()
    {
        return in_array($this->extension, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']);
    }
    
    public function isVideo()
    {
        return in_array($this->extension, ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv']);
    }
    
    public function isAudio()
    {
        return in_array($this->extension, ['mp3', 'wav', 'ogg', 'aac', 'flac']);
    }
    
    public function isDocument()
    {
        return in_array($this->extension, ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']);
    }
    
    public function getFormattedSize()
    {
        $bytes = $this->size;
        
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        }
        
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        }
        
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        
        return $bytes . ' bytes';
    }

    public function getFormattedSizeAttribute()
    {
        return $this->getFormattedSize();
    }
    
    public function getThumbnailPath()
    {
        $pathInfo = pathinfo($this->path);
        $directory = $pathInfo['dirname'];
        $filename = $pathInfo['basename'];
        
        return $directory . '/thumbnails/' . $filename;
    }
    
    public function getThumbnailUrl()
    {
        if (!$this->isImage()) {
            return null;
        }
        
        $thumbnailPath = $this->getThumbnailPath();
        
        if (Storage::disk($this->disk)->exists($thumbnailPath)) {
            return Storage::disk($this->disk)->url($thumbnailPath);
        }
        
        return $this->url();
    }
    
    /**
     * Get the URL attribute
     */
    public function getUrlAttribute()
    {
        return $this->url();
    }
    
    /**
     * Get the thumbnail URL attribute
     */
    public function getThumbnailUrlAttribute()
    {
        return $this->getThumbnailUrl();
    }
    
    /**
     * Get the full URL attribute
     */
    public function getFullUrlAttribute()
    {
        return Storage::disk($this->disk)->url($this->path);
    }
} 