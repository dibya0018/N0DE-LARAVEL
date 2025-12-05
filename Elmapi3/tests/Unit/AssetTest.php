<?php

use App\Models\Asset;
use PHPUnit\Framework\TestCase;

test('asset has correct fillable attributes', function () {
    $asset = new Asset();
    
    expect($asset->getFillable())->toContain('project_id')
        ->toContain('filename')
        ->toContain('original_filename')
        ->toContain('mime_type')
        ->toContain('extension')
        ->toContain('size')
        ->toContain('disk')
        ->toContain('path')
        ->toContain('created_by')
        ->toContain('updated_by');
});

test('asset has correct appends attributes', function () {
    $asset = new Asset();
    
    expect($asset->getAppends())->toContain('url')
        ->toContain('thumbnail_url')
        ->toContain('full_url')
        ->toContain('formatted_size');
});

test('check file type detection methods', function() {
    $asset = new Asset();
    
    // Mock isImage() method
    $asset->extension = 'jpg';
    expect($asset->isImage())->toBeTrue();
    
    $asset->extension = 'pdf';
    expect($asset->isImage())->toBeFalse();
    
    // Mock isVideo() method
    $asset->extension = 'mp4';
    expect($asset->isVideo())->toBeTrue();
    
    $asset->extension = 'jpg';
    expect($asset->isVideo())->toBeFalse();
    
    // Mock isAudio() method
    $asset->extension = 'mp3';
    expect($asset->isAudio())->toBeTrue();
    
    $asset->extension = 'jpg';
    expect($asset->isAudio())->toBeFalse();
    
    // Mock isDocument() method
    $asset->extension = 'pdf';
    expect($asset->isDocument())->toBeTrue();
    
    $asset->extension = 'jpg';
    expect($asset->isDocument())->toBeFalse();
});

test('file size formatting works correctly', function() {
    $asset = new Asset();
    
    // Test bytes
    $asset->size = 500;
    expect($asset->getFormattedSize())->toBe('500 bytes');
    
    // Test KB
    $asset->size = 1500;
    expect($asset->getFormattedSize())->toBe('1.46 KB');
    
    // Test MB
    $asset->size = 1500000;
    expect($asset->getFormattedSize())->toBe('1.43 MB');
    
    // Test GB
    $asset->size = 1500000000;
    expect($asset->getFormattedSize())->toBe('1.40 GB');
}); 