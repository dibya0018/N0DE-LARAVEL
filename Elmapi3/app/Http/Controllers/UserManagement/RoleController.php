<?php

namespace App\Http\Controllers\UserManagement;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        return Inertia::render('UserManagement/Roles', [
            'roles' => Role::with('permissions')->paginate(10),
            'permissionGroups' => $this->getGroupedPermissions()
        ]);
    }

    public function apiIndex(Request $request)
    {
        $query = Role::with('permissions')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->when($request->sort, function ($query, $sort) use ($request) {
                $direction = $request->direction === 'desc' ? 'desc' : 'asc';
                $query->orderBy($sort, $direction);
            }, function ($query) {
                $query->orderBy('created_at', 'asc');
            });

        $roles = $query->paginate($request->input('per_page', 10));

        return response()->json($roles);
    }
    
    public function apiStore(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles',
        ]);
        
        $role = Role::create(['name' => $request->name]);
        $role->syncPermissions($request->permissions);
        
        return response()->json(['message' => 'Role created successfully']);
    }
    
    public function apiUpdate(Request $request, Role $role)
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:roles,name,'.$role->id,
        ]);
        
        $role->update(['name' => $request->name]);
        $role->syncPermissions($request->permissions);
        
        return response()->json(['message' => 'Role updated successfully']);
    }
    
    public function apiDestroy(Role $role)
    {
        // Check if role is Super Admin
        if ($role->name === 'Super Admin') {
            return response()->json(['error' => 'Super Admin role cannot be deleted.'], 422);
        }

        $role->delete();
        
        return response()->json(['message' => 'Role deleted successfully']);
    }

    public function apiBulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:roles,id',
            'password' => 'required|current_password',
        ]);

        $roles = Role::whereIn('id', $request->ids)->get();

        // Check if any of the roles are Super Admin
        foreach ($roles as $role) {
            if ($role->name === 'Super Admin') {
                return response()->json(['error' => 'Cannot delete Super Admin role.'], 422);
            }
        }

        // Delete the roles
        Role::whereIn('id', $request->ids)->delete();
        
        return response()->json(['message' => 'Roles deleted successfully.']);
    }
    
    private function getGroupedPermissions()
    {
        // The main groups of permissions
        $permissionGroups = [
            [
                'group' => 'users',
                'label' => 'Users',
                'icon' => 'Users',
                'permissions' => ['access_users', 'create_users', 'update_users', 'delete_users']
            ],
            [
                'group' => 'roles',
                'label' => 'Roles',
                'icon' => 'Shield',
                'permissions' => ['access_roles', 'create_roles', 'update_roles', 'delete_roles']
            ],
            [
                'group' => 'permissions',
                'label' => 'Permissions',
                'icon' => 'Key',
                'permissions' => ['access_permissions', 'create_permissions', 'update_permissions', 'delete_permissions']
            ]
        ];
        
        // Project permissions
        $projectPermissions = [
            ['name' => 'Access All Projects', 'permission' => 'access_all_projects'],
            ['name' => 'Create New Project', 'permission' => 'create_project'],
            ['name' => 'Access Project Settings', 'permission' => 'access_project_settings'],
            ['name' => 'Delete Project', 'permission' => 'delete_project'],
            ['name' => 'Access Project Settings: Localization', 'permission' => 'access_localization_settings'],
            ['name' => 'Access Project Settings: User Access', 'permission' => 'access_user_access_settings'],
            ['name' => 'Access Project Settings: API Access', 'permission' => 'access_api_access_settings'],
            ['name' => 'Access Project Settings: Webhooks', 'permission' => 'access_webhooks_settings'],
            ['name' => 'Create New Collection', 'permission' => 'create_collection'],
            ['name' => 'Access Collection Settings', 'permission' => 'access_collection_settings'],
            ['name' => 'Update Collection', 'permission' => 'update_collection'],
            ['name' => 'Delete Collection', 'permission' => 'delete_collection'],
            ['name' => 'Create New Field', 'permission' => 'create_field'],
            ['name' => 'Update Field', 'permission' => 'update_field'],
            ['name' => 'Delete Field', 'permission' => 'delete_field'],

            // Content permissions
            ['name' => 'Create Content', 'permission' => 'create_content'],
            ['name' => 'Update Content', 'permission' => 'update_content'],
            ['name' => 'Publish Content', 'permission' => 'publish_content'],
            ['name' => 'Unpublish Content', 'permission' => 'unpublish_content'],
            ['name' => 'Move Content to Trash', 'permission' => 'move_content_to_trash'],
            ['name' => 'Delete Content', 'permission' => 'delete_content'],

            // Asset permissions
            ['name' => 'Access Asset Library', 'permission' => 'access_assets'],
            ['name' => 'Upload Asset', 'permission' => 'upload_asset'],
            ['name' => 'Update Asset', 'permission' => 'update_asset'],
            ['name' => 'Delete Asset', 'permission' => 'delete_asset'],
        ];
        
        return [
            'groups' => $permissionGroups,
            'projects' => $projectPermissions
        ];
    }
} 