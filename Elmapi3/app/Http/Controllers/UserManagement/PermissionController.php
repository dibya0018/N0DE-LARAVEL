<?php

namespace App\Http\Controllers\UserManagement;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Inertia\Inertia;

class PermissionController extends Controller
{

    private $systemPermissions = [
        'access_users', 'create_users', 'update_users', 'delete_users', 'access_roles', 'create_roles', 'update_roles', 'delete_roles',  'access_permissions', 'create_permissions', 'update_permissions', 'delete_permissions', 'access_all_projects', 'create_project', 'create_collection', 'access_collection_settings', 'update_collection', 'delete_collection', 'create_field', 'update_field', 'delete_field', 'access_project_settings', 'delete_project', 'access_localization_settings', 'access_user_access_settings', 'access_api_access_settings', 'access_webhooks_settings', 'create_content', 'update_content', 'publish_content', 'unpublish_content', 'move_content_to_trash', 'delete_content', 'access_assets', 'upload_asset', 'update_asset', 'delete_asset',
    ];
    
    /**
     * Display a listing of the permissions.
     */
    public function index()
    {
        return Inertia::render('UserManagement/Permissions', [
            'permissions' => Permission::all()
        ]);
    }

    public function apiIndex(Request $request)
    {
        $query = Permission::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->sort, function ($query, $sort) use ($request) {
                $direction = $request->direction === 'desc' ? 'desc' : 'asc';
                $query->orderBy($sort, $direction);
            }, function ($query) {
                $query->orderBy('created_at', 'asc');
            });

        $permissions = $query->paginate($request->input('per_page', 10));

        return response()->json($permissions);
    }

    /**
     * Store a newly created permission in storage.
     */
    public function apiStore(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:permissions',
        ]);
        
        $permission = Permission::create(['name' => $request->name]);
        
        return response()->json(['message' => 'Permission created successfully']);
    }

    /**
     * Update the specified permission in storage.
     */
    public function apiUpdate(Request $request, Permission $permission)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:permissions,name,'.$permission->id,
        ]);

        if (in_array($permission->name, $this->systemPermissions)) {
            return response()->json(['error' => 'System permissions cannot be updated.'], 401);
        }

        $permission->update(['name' => $request->name]);
        
        return response()->json(['message' => 'Permission updated successfully']);
    }

    /**
     * Remove the specified permission from storage.
     */
    public function apiDestroy(Permission $permission)
    {
        // Check if permission is a system permission
        if (in_array($permission->name, $this->systemPermissions)) {
            return response()->json(['error' => 'System permissions cannot be deleted.'], 401);
        }

        $permission->delete();
        
        return response()->json(['message' => 'Permission deleted successfully']);
    }

    public function apiBulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:permissions,id',
            'password' => 'required|current_password',
        ]);

        $permissions = Permission::whereIn('id', $request->ids)->get();

        // Check if any of the permissions are system permissions
        foreach ($permissions as $permission) {
            if (in_array($permission->name, $this->systemPermissions)) {
                return response()->json(['error' => 'Cannot delete system permissions.'], 401);
            }
        }

        // Delete the permissions
        Permission::whereIn('id', $request->ids)->delete();
        
        return response()->json(['message' => 'Permissions deleted successfully.']);
    }
}
