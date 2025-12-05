<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AssetController;
use App\Http\Controllers\FieldController;
use App\Http\Controllers\ContentController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\CollectionController;
use App\Http\Controllers\ColumnSettingController;
use App\Http\Controllers\UserManagement\RoleController;
use App\Http\Controllers\UserManagement\UserController;
use App\Http\Controllers\UserManagement\PermissionController;

// This route will serve files from the public storage disk without a symlink.
// It should be defined before the auth middleware group to be publicly accessible.
Route::get('/uploads/{path}', [AssetController::class, 'stream'])->where('path', '.*');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/', function () {
        return Inertia::render('dashboard', [
            'projects' => \App\Models\Project::when(!auth()->user()->can('access_all_projects'), function($q){
                $user = auth()->user();
                return $q->whereIn('id', $user->projects()->pluck('projects.id'));
            })->latest()->get(),
        ]);
    })->name('dashboard');

    Route::prefix('user-management')->name('user-management.')->group(function () {
        //Render the users page
        Route::get('/users', [UserController::class, 'index'])->name('users.index')->middleware(['permission:access_users']);

        //Render the roles page
        Route::get('/roles', [RoleController::class, 'index'])->name('roles.index')->middleware(['permission:access_roles']);

        //Render the permissions page
        Route::get('/permissions', [PermissionController::class, 'index'])->name('permissions.index')->middleware(['permission:access_permissions']);

        // API routes with prefix
        Route::prefix('api')->group(function () {
            Route::get('/users', [UserController::class, 'apiIndex'])->middleware(['permission:access_users']);
            Route::post('/users', [UserController::class, 'apiStore'])->middleware(['permission:create_users']);
            Route::put('/users/{user}', [UserController::class, 'apiUpdate'])->middleware(['permission:update_users']);
            Route::delete('/users/{user}', [UserController::class, 'apiDestroy'])->middleware(['permission:delete_users']);
            Route::post('/users/bulk-delete', [UserController::class, 'apiBulkDelete'])->middleware(['permission:delete_users']);

            // Role API routes
            Route::get('/roles', [RoleController::class, 'apiIndex'])->middleware(['permission:access_roles']);
            Route::post('/roles', [RoleController::class, 'apiStore'])->middleware(['permission:create_roles']);
            Route::put('/roles/{role}', [RoleController::class, 'apiUpdate'])->middleware(['permission:update_roles']);
            Route::delete('/roles/{role}', [RoleController::class, 'apiDestroy'])->middleware(['permission:delete_roles']);
            Route::post('/roles/bulk-delete', [RoleController::class, 'apiBulkDelete'])->middleware(['permission:delete_roles']);

            // Permission API routes
            Route::get('/permissions', [PermissionController::class, 'apiIndex'])->middleware(['permission:access_permissions']);
            Route::post('/permissions', [PermissionController::class, 'apiStore'])->middleware(['permission:create_permissions']);
            Route::put('/permissions/{permission}', [PermissionController::class, 'apiUpdate'])->middleware(['permission:update_permissions']);
            Route::delete('/permissions/{permission}', [PermissionController::class, 'apiDestroy'])->middleware(['permission:delete_permissions']);
            Route::post('/permissions/bulk-delete', [PermissionController::class, 'apiBulkDelete'])->middleware(['permission:delete_permissions']);
        });
    });

    Route::prefix('projects')->group(function () {
        Route::post('/', [ProjectController::class, 'store'])->name('projects.store')->middleware('permission:create_project');
    Route::post('/import', [ProjectController::class, 'import'])->name('projects.import')->middleware('permission:create_project');
        Route::get('/{project}', [ProjectController::class, 'show'])->name('projects.show')->middleware(\App\Http\Middleware\EnsureProjectMember::class);

        Route::prefix('{project}')->middleware(\App\Http\Middleware\EnsureProjectMember::class)->group(function () {
            // Collections routes
            Route::prefix('collections')->group(function () {
                Route::post('/', [CollectionController::class, 'store'])->name('projects.collections.store')->middleware('permission:create_collection');
                Route::post('/import', [CollectionController::class, 'import'])->name('projects.collections.import')->middleware('permission:create_collection');
                Route::get('/{collection}', [CollectionController::class, 'show'])->name('projects.collections.show');
                Route::get('/{collection}/edit', [CollectionController::class, 'edit'])->name('projects.collections.edit')->middleware('permission:access_collection_settings');
                Route::put('/{collection}', [CollectionController::class, 'update'])->name('projects.collections.update')->middleware('permission:update_collection');
                Route::delete('/{collection}', [CollectionController::class, 'destroy'])->name('projects.collections.destroy')->middleware('permission:delete_collection');
                Route::post('/reorder', [CollectionController::class, 'reorder'])->name('projects.collections.reorder');

                Route::prefix('{collection}')->group(function () {
                    Route::prefix('fields')->group(function () {
                        Route::post('/', [FieldController::class, 'store'])->name('projects.collections.fields.store')->middleware('permission:create_field');
                        Route::put('/{field}', [FieldController::class, 'update'])->name('projects.collections.fields.update')->middleware('permission:update_field');
                        Route::delete('/{field}', [FieldController::class, 'destroy'])->name('projects.collections.fields.destroy')->middleware('permission:delete_field');
                        Route::post('/reorder', [FieldController::class, 'reorder'])->name('projects.collections.fields.reorder')->middleware('permission:update_field');
                    });

                    Route::prefix('content')->group(function () {
                        Route::get('/create', [ContentController::class, 'create'])->name('projects.collections.content.create')->middleware('permission:create_content');
                        Route::post('/', [ContentController::class, 'store'])->name('projects.collections.content.store')->middleware('permission:create_content');
                        Route::get('/{contentEntry}/edit', [ContentController::class, 'edit'])->name('projects.collections.content.edit')->middleware('permission:update_content');
                        Route::put('/{contentEntry}', [ContentController::class, 'update'])->name('projects.collections.content.update')->middleware('permission:update_content');
                        Route::delete('/{contentEntry}', [ContentController::class, 'destroy'])->name('projects.collections.content.destroy')->middleware('permission:move_content_to_trash');
                        Route::delete('/{contentEntry}/force', [ContentController::class, 'forceDestroy'])->name('projects.collections.content.forceDestroy')->middleware('permission:delete_content');
                        Route::post('/{contentEntry}/duplicate', [ContentController::class, 'duplicate'])->name('projects.collections.content.duplicate')->middleware('permission:create_content');
                        Route::post('/{contentEntry}/link-translation', [ContentController::class, 'linkTranslation'])->name('projects.collections.content.linkTranslation')->middleware('permission:update_content');
                        Route::post('/{contentEntry}/unlink-translation', [ContentController::class, 'unlinkTranslation'])->name('projects.collections.content.unlinkTranslation')->middleware('permission:update_content');
                        Route::get('/search', [ContentController::class, 'search'])->name('projects.collections.content.search');
                        Route::get('/find', [ContentController::class, 'find'])->name('projects.collections.content.find');

                        Route::get('/relation-collection', [ContentController::class, 'getRelationCollection'])->name('projects.collections.content.getRelationCollection');
                        // Restore soft-deleted content entry
                        Route::put('/{contentEntry}/restore', [ContentController::class, 'restore'])->name('projects.collections.content.restore')->middleware('permission:update_content');
                        
                        // Export/Import content
                        // Export is available to anyone who can view content (no specific permission needed)
                        Route::post('/export', [ContentController::class, 'export'])->name('projects.collections.content.export');
                        Route::post('/import', [ContentController::class, 'import'])->name('projects.collections.content.import')->middleware('permission:create_content');
                    });
                });
            });

            // Asset Management Routes
            Route::prefix('assets')->group(function () {
                Route::get('/', [AssetController::class, 'index'])->name('assets.index')->middleware('permission:access_assets');
                Route::post('/upload', [AssetController::class, 'upload'])->name('assets.upload')->middleware('permission:upload_asset');
                Route::put('/{asset}/crop', [AssetController::class, 'crop'])->name('assets.crop')->middleware('permission:update_asset');
                Route::delete('/{asset}', [AssetController::class, 'destroy'])->name('assets.destroy')->middleware('permission:delete_asset');
                Route::post('/bulk-delete', [AssetController::class, 'bulkDestroy'])->name('assets.bulk-destroy')->middleware('permission:delete_asset');
                
                // API routes for asset library in content creation
                Route::get('/api/index', [AssetController::class, 'apiIndex'])->name('assets.api.index')->middleware('permission:access_assets');
                Route::get('/api/show/{asset}', [AssetController::class, 'apiShow'])->name('assets.api.show')->middleware('permission:access_assets');
                Route::put('/api/{asset}', [AssetController::class, 'apiUpdate'])->name('assets.api.update')->middleware('permission:update_asset');
                Route::delete('/api/{asset}', [AssetController::class, 'apiDestroy'])->name('assets.api.destroy')->middleware('permission:delete_asset');
            });

            // Project Settings Routes
            Route::prefix('settings')->name('projects.settings.')->group(function () {
                Route::get('/', [\App\Http\Controllers\ProjectSettingsController::class, 'project'])->name('project')->middleware('permission:access_project_settings');
                Route::get('/localization', [\App\Http\Controllers\ProjectSettingsController::class, 'localization'])->name('localization')->middleware('permission:access_localization_settings');
                Route::get('/user-access', [\App\Http\Controllers\ProjectSettingsController::class, 'userAccess'])->name('user-access')->middleware('permission:access_user_access_settings');
                Route::get('/api-access', [\App\Http\Controllers\ProjectSettingsController::class, 'apiAccess'])->name('api-access')->middleware('permission:access_api_access_settings');
                Route::get('/webhooks', [\App\Http\Controllers\ProjectSettingsController::class, 'webhooks'])->name('webhooks')->middleware('permission:access_webhooks_settings');
                Route::get('/export-import', [\App\Http\Controllers\ProjectSettingsController::class, 'exportImport'])->name('export-import')->middleware('permission:access_project_settings');

                // Webhook management API
                Route::prefix('webhooks')->name('webhooks.')->middleware('permission:access_webhooks_settings')->group(function () {
                    Route::get('/api', [\App\Http\Controllers\WebhookController::class, 'index'])->name('index');
                    Route::post('/api', [\App\Http\Controllers\WebhookController::class, 'store'])->name('store');
                    Route::put('/api/{webhook}', [\App\Http\Controllers\WebhookController::class, 'update'])->name('update');
                    Route::delete('/api/{webhook}', [\App\Http\Controllers\WebhookController::class, 'destroy'])->name('destroy');
                    Route::get('/{webhook}/logs', [\App\Http\Controllers\WebhookController::class, 'logs'])->name('logs');
                });

                // Localization API endpoints
                Route::prefix('locales')->name('locales.')->group(function () {
                    Route::post('/add', [\App\Http\Controllers\ProjectSettingsController::class, 'addLocale'])->name('add');
                    Route::delete('/{locale}', [\App\Http\Controllers\ProjectSettingsController::class, 'deleteLocale'])->name('delete');
                    Route::put('/default', [\App\Http\Controllers\ProjectSettingsController::class, 'setDefaultLocale'])->name('default');
                });

                // Members API endpoints
                Route::prefix('members')->name('members.')->group(function () {
                    Route::post('/', [\App\Http\Controllers\ProjectSettingsController::class, 'addMember'])->name('add');
                    Route::delete('/{user}', [\App\Http\Controllers\ProjectSettingsController::class, 'removeMember'])->name('remove');
                });

                // API Tokens
                Route::prefix('tokens')->name('tokens.')->middleware('permission:access_api_access_settings')->group(function () {
                    Route::post('/', [\App\Http\Controllers\ProjectSettingsController::class, 'createToken'])->name('create');
                    Route::put('/{token}', [\App\Http\Controllers\ProjectSettingsController::class, 'updateToken'])->name('update');
                    Route::delete('/{token}', [\App\Http\Controllers\ProjectSettingsController::class, 'deleteToken'])->name('delete');
                });

                // Toggle public API
                Route::post('/toggle-public', [\App\Http\Controllers\ProjectSettingsController::class, 'togglePublicApi'])->name('toggle-public')->middleware('permission:access_api_access_settings');

                // Export/Import API endpoints
                Route::prefix('export-import')->name('export-import.')->middleware('permission:access_project_settings')->group(function () {
                    Route::post('/export-project', [\App\Http\Controllers\ProjectSettingsController::class, 'exportProject'])->name('export-project');
                    Route::post('/export-collection/{collection}', [\App\Http\Controllers\ProjectSettingsController::class, 'exportCollection'])->name('export-collection');
                });
            });

            // Update route for project
            Route::put('/', [ProjectController::class, 'update'])->name('projects.update');
            Route::delete('/', [ProjectController::class, 'destroy'])->name('projects.destroy')->middleware('permission:delete_project');
        });

        // Clone project (structure only)
        Route::post('/{project}/clone', [ProjectController::class, 'cloneProject'])->name('projects.clone')->middleware('permission:create_project');
    });

    // Collection templates endpoints
    Route::get('/collection-templates', [\App\Http\Controllers\CollectionTemplateController::class, 'index'])->name('collection-templates.index');
    Route::post('/projects/{project}/collections/{collection}/save-template', [\App\Http\Controllers\CollectionTemplateController::class, 'storeFromCollection'])->name('collections.saveAsTemplate');
    // Project templates endpoints
    Route::get('/project-templates', [\App\Http\Controllers\ProjectTemplateController::class, 'index'])->name('project-templates.index');
    Route::post('/projects/{project}/save-template', [\App\Http\Controllers\ProjectTemplateController::class, 'storeFromProject'])->name('projects.saveAsTemplate')->middleware('permission:access_project_settings');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
