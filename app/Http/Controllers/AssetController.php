<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\AssetMetadata;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Carbon\Carbon;

class AssetController extends Controller
{
    /**
     * Display asset library
     */
    public function index(Project $project, Request $request)
    {
        // Load the project with its collections for the sidebar
        $project->load('collections');
        
        $query = Asset::where('project_id', $project->id)
            ->with('metadata');
            
        // Apply search if provided
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('filename', 'LIKE', "%{$search}%")
                  ->orWhere('original_filename', 'LIKE', "%{$search}%")
                  ->orWhere('mime_type', 'LIKE', "%{$search}%");
            });
        }
        
        // Apply type filter if provided
        if ($request->has('type')) {
            $type = $request->input('type');
            switch ($type) {
                case 'image':
                    $query->whereIn('extension', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']);
                    break;
                case 'video':
                    $query->whereIn('extension', ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv']);
                    break;
                case 'audio':
                    $query->whereIn('extension', ['mp3', 'wav', 'ogg', 'aac', 'flac']);
                    break;
                case 'document':
                    $query->whereIn('extension', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']);
                    break;
            }
        }
        
        // Apply date filter if provided
        if ($request->has('date_filter') && !empty($request->input('date_filter'))) {
            $dateFilter = $request->input('date_filter');
            
            switch ($dateFilter) {
                case 'today':
                    $query->whereDate('created_at', Carbon::today());
                    break;
                case 'week':
                    $query->where('created_at', '>=', Carbon::now()->subDays(7));
                    break;
                case 'month':
                    $query->where('created_at', '>=', Carbon::now()->subDays(30));
                    break;
                case 'quarter':
                    $query->where('created_at', '>=', Carbon::now()->subDays(90));
                    break;
            }
        }
        
        // Apply sorting if provided
        if ($request->has('sort')) {
            $sort = $request->input('sort');
            
            switch ($sort) {
                case 'newest':
                    $query->orderBy('created_at', 'desc');
                    break;
                case 'oldest':
                    $query->orderBy('created_at', 'asc');
                    break;
                case 'name_asc':
                    $query->orderBy('original_filename', 'asc');
                    break;
                case 'name_desc':
                    $query->orderBy('original_filename', 'desc');
                    break;
                case 'size_asc':
                    $query->orderBy('size', 'asc');
                    break;
                case 'size_desc':
                    $query->orderBy('size', 'desc');
                    break;
                default:
                    $query->orderBy('created_at', 'desc');
                    break;
            }
        } else {
            // Default sorting
            $query->orderBy('created_at', 'desc');
        }
        
        // Get per_page parameter with default of 10
        $perPage = $request->input('per_page', 10);
        
        // Validate per_page parameter to ensure it's a valid value
        if (!in_array($perPage, [10, 25, 50, 100])) {
            $perPage = 10;
        }
        
        $assets = $query->paginate($perPage);
                       
        return Inertia::render('Assets/Index', [
            'project' => $project,
            'assets' => $assets,
            'filters' => $request->only(['search', 'type', 'date_filter', 'date_from', 'date_to', 'sort', 'per_page'])
        ]);
    }
    
    /**
     * Upload new asset
     */
    public function upload(Project $project, Request $request)
    {
        $validator = validator($request->all(), [
            'file' => 'required|file|max:' . $this->getFileSizeForValidation(),
        ]);
        
        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
                'file_size_limit' => $this->getFileSizeForDisplay()
            ], 422);
        }
        
        try {
            $file = $request->file('file');
            $originalFilename = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $size = $file->getSize();
            
            // Generate unique filename
            $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)) . '_' . Str::random(8) . '.' . $extension;
            
            // Determine which filesystem disk to use (asset specific or fallback to project/default)
            $disk = $project->disk ?: config('filesystems.default', 'public');
            
            // Store file
            $path = "projects/{$project->uuid}/assets";
            $filePath = $file->storeAs($path, $filename, $disk);
            
            // Create asset record
            $asset = Asset::create([
                'project_id' => $project->id,
                'filename' => $filename,
                'original_filename' => $originalFilename,
                'mime_type' => $mimeType,
                'extension' => $extension,
                'size' => $size,
                'disk' => $disk, // Persist the disk used for storage
                'path' => $filePath,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id()
            ]);
            
            // Generate thumbnail for images
            if (in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])) {
                $thumbnailPath = "projects/{$project->uuid}/assets/thumbnails";
                Storage::disk($disk)->makeDirectory($thumbnailPath);
                
                // Create a new ImageManager instance with the GD driver
                $manager = new ImageManager(new GdDriver());
                
                // Read the image file
                $image = $manager->read($file->getRealPath());
                
                // Resize the image to a max height of 600px while maintaining aspect ratio
                $thumbnail = $image->scale(height: 600);
                
                // Save the thumbnail
                Storage::disk($disk)->put(
                    "{$thumbnailPath}/{$filename}", 
                    $thumbnail->encode()->toString()
                );
                
                // Get image dimensions
                $dimensions = getimagesize($file);
                
                // Store metadata
                AssetMetadata::create([
                    'asset_id' => $asset->id,
                    'width' => $dimensions[0] ?? null,
                    'height' => $dimensions[1] ?? null,
                    'alt_text' => pathinfo($originalFilename, PATHINFO_FILENAME)
                ]);
            }
            
            return response()->json([
                'success' => true,
                'asset' => $asset->load('metadata')
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload file: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the smaller of the two sizes for validation and display
     */
    private function getSmallerSize()
    {
        // Get PHP's upload limit
        $phpUploadLimit = ini_get('upload_max_filesize');
        
        // Parse both sizes to bytes
        $envSizeInBytes = $this->convertToBytes(env('MAX_FILE_SIZE'));
        $phpSizeInBytes = $this->convertToBytes($phpUploadLimit);
        
        // Return the smaller of the two sizes
        $smallerSize = min($envSizeInBytes, $phpSizeInBytes);
        
        return $smallerSize;
    }
    
    /**
     * Get the file size for validation
     */
    private function getFileSizeForValidation()
    {
        $smallerSize = $this->getSmallerSize();
        
        // Convert to KB for Laravel validation
        return $smallerSize / 1024;
    }

    /**
     * Get the file size for display
     */
    private function getFileSizeForDisplay()
    {
        $smallerSize = $this->getSmallerSize();
        
        // Convert to MB for display
        return round($smallerSize / 1024 / 1024, 2)."MB";
    }
    
    
    private function convertToBytes($size)
    {
        if (is_numeric($size)) {
            return $size;
        }
        
        $units = ['B' => 1, 'K' => 1024, 'M' => 1024 * 1024, 'G' => 1024 * 1024 * 1024];
        $unit = strtoupper(substr($size, -1));
        $value = (int)substr($size, 0, -1);
        
        if (!isset($units[$unit])) {
            return 1024 * 1024; // Default to 1MB if format is invalid
        }
        
        return $value * $units[$unit];
    }
    
    /**
     * Get asset details for modal
     */
    public function show(Project $project, Asset $asset)
    {
        if ($asset->project_id !== $project->id) {
            abort(404);
        }
        
        // Load the asset with its metadata
        $asset->load('metadata');
        
        return response()->json([
            'success' => true,
            'asset' => $asset
        ]);
    }
    
    /**
     * Update asset details
     */
    public function update(Project $project, Asset $asset, Request $request)
    {
        if ($asset->project_id !== $project->id) {
            abort(404);
        }
        
        // Handle metadata updates
        $validated = $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:255',
            'caption' => 'nullable|string',
            'description' => 'nullable|string',
            'author' => 'nullable|string|max:255',
            'copyright' => 'nullable|string|max:255',
        ]);
        
        // Update metadata
        $asset->metadata()->updateOrCreate(
            ['asset_id' => $asset->id],
            array_filter([
                'alt_text' => $request->input('alt_text'),
                'title' => $request->input('title'),
                'caption' => $request->input('caption'),
                'description' => $request->input('description'),
                'author' => $request->input('author'),
                'copyright' => $request->input('copyright'),
            ])
        );
        
        $asset->updated_by = auth()->id();
        $asset->save();
        
        // Load the asset with metadata
        $asset->load('metadata');
        
        return redirect()->back()->with('success', 'Asset updated successfully');
    }

    public function crop(Project $project, Asset $asset, Request $request)
    {
        // Handle file upload if present
        if ($request->hasFile('file')) {
            $request->validate([
                'file' => 'required|file|image|max:' . $this->getFileSizeForValidation(),
            ]);
            
            $file = $request->file('file');
            $originalFilename = $file->getClientOriginalName();
            $extension = $file->getClientOriginalExtension();
            $mimeType = $file->getMimeType();
            $size = $file->getSize();
            
            // Generate unique filename
            $filename = Str::slug(pathinfo($originalFilename, PATHINFO_FILENAME)) . '_' . Str::random(8) . '.' . $extension;
            
            // Determine which filesystem disk to use (asset specific or fallback to project/default)
            $disk = $asset->disk ?: ($project->disk ?: config('filesystems.default', 'public'));
            
            // Store file
            $path = "projects/{$project->uuid}/assets";
            $filePath = $file->storeAs($path, $filename, $disk);
            
            // Delete old file
            if (Storage::disk($disk)->exists($asset->path)) {
                Storage::disk($disk)->delete($asset->path);
            }
            
            // Delete old thumbnail if it exists
            if ($asset->isImage()) {
                $thumbnailPath = $asset->getThumbnailPath();
                if (Storage::disk($disk)->exists($thumbnailPath)) {
                    Storage::disk($disk)->delete($thumbnailPath);
                }
            }
            
            // Update asset record
            $asset->update([
                'filename' => $filename,
                'original_filename' => $originalFilename,
                'mime_type' => $mimeType,
                'extension' => $extension,
                'size' => $size,
                'path' => $filePath,
                'updated_by' => auth()->id()
            ]);
            
            // Generate thumbnail for images
            if (in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])) {
                $thumbnailPath = "projects/{$project->uuid}/assets/thumbnails";
                Storage::disk($disk)->makeDirectory($thumbnailPath);
                
                // Create a new ImageManager instance with the GD driver
                $manager = new ImageManager(new GdDriver());
                
                // Read the image file
                $image = $manager->read($file->getRealPath());
                
                // Resize the image to a max height of 600px while maintaining aspect ratio
                $thumbnail = $image->scale(height: 600);
                
                // Save the thumbnail
                Storage::disk($disk)->put(
                    "{$thumbnailPath}/{$filename}", 
                    $thumbnail->encode()->toString()
                );
                
                // Get image dimensions
                $dimensions = getimagesize($file);
                
                // Update metadata
                $asset->metadata()->updateOrCreate(
                    ['asset_id' => $asset->id],
                    [
                        'width' => $dimensions[0] ?? null,
                        'height' => $dimensions[1] ?? null,
                    ]
                );
            }
        }

        return response()->json($asset);
    }
    
    /**
     * Delete asset
     */
    public function destroy(Project $project, Asset $asset)
    {
        if ($asset->project_id !== $project->id) {
            abort(404);
        }
        
        $asset->delete();
        
        if (request()->expectsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Asset deleted successfully'
            ]);
        }
        
        return redirect()->back()->with('success', 'Asset deleted successfully');
    }
    
    /**
     * Bulk delete assets
     */
    public function bulkDestroy(Project $project, Request $request)
    {
        $request->validate([
            'asset_ids' => 'required|array',
            'asset_ids.*' => 'exists:assets,id'
        ]);
        
        $assetIds = $request->input('asset_ids');
        $count = count($assetIds);
        
        $assets = Asset::where('project_id', $project->id)
                     ->whereIn('id', $assetIds)
                     ->get();
                     
        foreach ($assets as $asset) {
            $asset->delete();
        }
        
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'count' => $count]);
        }
        
        return redirect()->route('assets.index', $project->id)
            ->with('success', $count . ' ' . ($count === 1 ? 'asset' : 'assets') . ' deleted successfully');
    }

    /**
     * API endpoint to fetch assets
     */
    public function apiIndex(Project $project, Request $request)
    {
        $query = Asset::where('project_id', $project->id)
            ->with('metadata');
            
        // Apply search if provided
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('filename', 'LIKE', "%{$search}%")
                  ->orWhere('original_filename', 'LIKE', "%{$search}%")
                  ->orWhere('mime_type', 'LIKE', "%{$search}%");
            });
        }
        
        // Apply type filter if provided
        if ($request->has('type')) {
            $type = $request->input('type');
            switch ($type) {
                case 'image':
                    $query->whereIn('extension', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']);
                    break;
                case 'video':
                    $query->whereIn('extension', ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv']);
                    break;
                case 'audio':
                    $query->whereIn('extension', ['mp3', 'wav', 'ogg', 'aac', 'flac']);
                    break;
                case 'document':
                    $query->whereIn('extension', ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']);
                    break;
            }
        }
        
        // Apply date filter if provided
        if ($request->has('date_filter') && !empty($request->input('date_filter'))) {
            $dateFilter = $request->input('date_filter');
            
            switch ($dateFilter) {
                case 'today':
                    $query->whereDate('created_at', Carbon::today());
                    break;
                case 'week':
                    $query->where('created_at', '>=', Carbon::now()->subDays(7));
                    break;
                case 'month':
                    $query->where('created_at', '>=', Carbon::now()->subDays(30));
                    break;
                case 'quarter':
                    $query->where('created_at', '>=', Carbon::now()->subDays(90));
                    break;
            }
        }
        
        // Apply sorting if provided
        if ($request->has('sort')) {
            $sort = $request->input('sort');
            
            switch ($sort) {
                case 'newest':
                    $query->orderBy('created_at', 'desc');
                    break;
                case 'oldest':
                    $query->orderBy('created_at', 'asc');
                    break;
                case 'name':
                    $query->orderBy('original_filename', 'asc');
                    break;
                case 'size':
                    $query->orderBy('size', 'desc');
                    break;
                default:
                    $query->orderBy('created_at', 'desc');
                    break;
            }
        } else {
            // Default sorting
            $query->orderBy('created_at', 'desc');
        }
        
        // Get per_page parameter with default of 25
        $perPage = $request->input('per_page', 25);
        
        // Validate per_page parameter to ensure it's a valid value
        if (!in_array($perPage, [10, 25, 50, 100])) {
            $perPage = 25;
        }
        
        $assets = $query->paginate($perPage);
        
        // Format response for assets
        foreach ($assets as $asset) {
            $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
            $asset->thumbnail_url = in_array(strtolower($asset->extension), ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
                ? Storage::disk($asset->disk)->url("projects/" . $project->uuid . "/assets/thumbnails/" . $asset->filename)
                : null;
            $asset->formatted_size = $this->formatFileSize($asset->size);
        }
        
        return response()->json($assets);
    }

    /**
     * API endpoint to fetch a single asset
     */
    public function apiShow(Project $project, Asset $asset)
    {
        if ($asset->project_id != $project->id) {
            return response()->json(['error' => 'Asset not found'], 404);
        }
        
        $asset->load('metadata');
        $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
        $asset->thumbnail_url = in_array(strtolower($asset->extension), ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
            ? Storage::disk($asset->disk)->url("projects/" . $project->uuid . "/assets/thumbnails/" . $asset->filename)
            : null;
        $asset->formatted_size = $this->formatFileSize($asset->size);
        
        return response()->json($asset);
    }

    /**
     * API endpoint to update asset metadata
     */
    public function apiUpdate(Project $project, Asset $asset, Request $request)
    {
        if ($asset->project_id !== $project->id) {
            return response()->json(['error' => 'Asset not found'], 404);
        }
        
        // Handle metadata updates
        $validated = $request->validate([
            'alt_text' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:255',
            'caption' => 'nullable|string',
            'description' => 'nullable|string',
            'author' => 'nullable|string|max:255',
            'copyright' => 'nullable|string|max:255',
        ]);
        
        // Update metadata
        $asset->metadata()->updateOrCreate(
            ['asset_id' => $asset->id],
            array_filter([
                'alt_text' => $request->input('alt_text'),
                'title' => $request->input('title'),
                'caption' => $request->input('caption'),
                'description' => $request->input('description'),
                'author' => $request->input('author'),
                'copyright' => $request->input('copyright'),
            ])
        );
        
        $asset->updated_by = auth()->id();
        $asset->save();
        
        // Load the asset with metadata
        $asset->load('metadata');
        $asset->full_url = Storage::disk($asset->disk)->url($asset->path);
        $asset->thumbnail_url = in_array(strtolower($asset->extension), ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])
            ? Storage::disk($asset->disk)->url("projects/" . $project->uuid . "/assets/thumbnails/" . $asset->filename)
            : null;
        $asset->formatted_size = $this->formatFileSize($asset->size);
        
        return response()->json($asset);
    }

    /**
     * Format file size for display
     */
    private function formatFileSize($size)
    {
        if ($size >= 1073741824) {
            return number_format($size / 1073741824, 2) . ' GB';
        } elseif ($size >= 1048576) {
            return number_format($size / 1048576, 2) . ' MB';
        } elseif ($size >= 1024) {
            return number_format($size / 1024, 2) . ' KB';
        } else {
            return $size . ' bytes';
        }
    }
    
    /**
     * API endpoint to delete an asset
     */
    public function apiDestroy(Project $project, Asset $asset)
    {
        if ($asset->project_id !== $project->id) {
            return response()->json(['error' => 'Asset not found'], 404);
        }
        
        $originalFilename = $asset->original_filename;
        $asset->delete();
        
        return response()->json([
            'success' => true,
            'message' => "Asset \"$originalFilename\" deleted successfully"
        ]);
    }

    /**
     * Streams an asset file from storage.
     * This method is used to serve files from the 'public' disk without a symlink.
     *
     * @param string $path
     * @return \Symfony\Component\HttpFoundation\StreamedResponse
     */
    public function stream($path)
    {
        // Basic security check to prevent directory traversal
        if (str_contains($path, '..')) {
            abort(404);
        }

        if (!Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return Storage::disk('public')->response($path);
    }
} 