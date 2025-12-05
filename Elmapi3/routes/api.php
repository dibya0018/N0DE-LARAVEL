<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ContentController;
use App\Http\Controllers\Api\AssetController;
use App\Http\Controllers\Api\CollectionController;
use App\Http\Controllers\Api\OpenApiController;

// Documentation routes (no middleware required)
Route::get('/swagger-docs', [OpenApiController::class, 'ui'])->name('api.docs');
Route::get('/swagger-docs.json', [OpenApiController::class, 'generate'])->name('api.docs.json');

Route::middleware(['project', 'throttle:60,1'])->group(function () {
    Route::get('/', [ProjectController::class, 'show']);

    // File / asset endpoints (declare before generic {collection} routes)
    Route::get('/files', [AssetController::class, 'index']);
    Route::get('/files/name/{filename}', [AssetController::class, 'showByName']);
    Route::get('/files/{identifier}', [AssetController::class, 'show']);
    Route::post('/files', [AssetController::class, 'store']);
    Route::delete('/files/{identifier}', [AssetController::class, 'destroy']);

    // Collections (schema) endpoints
    Route::get('/collections', [CollectionController::class, 'index']);
    Route::get('/collections/{collection}', [CollectionController::class, 'show']);

    // Content endpoints
    Route::get('/{collection}/{uuid}', [ContentController::class, 'show']);
    Route::match(['put','patch'], '/{collection}/{uuid}', [ContentController::class, 'update']);
    Route::delete('/{collection}/{uuid}', [ContentController::class, 'destroy']);
    Route::post('/{collection}', [ContentController::class, 'store']);
    Route::get('/{collection}', [ContentController::class, 'index']);
});
