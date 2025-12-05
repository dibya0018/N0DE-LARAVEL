<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;

class UsersRolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@admin.com',
            'password' => bcrypt('password')
        ]);

        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create user management permissions
        $userPermissions = [
            'access_users',
            'create_users',
            'update_users',
            'delete_users',
        ];

        $rolePermissions = [
            'access_roles',
            'create_roles',
            'update_roles',
            'delete_roles',
        ];

        $permissionPermissions = [
            'access_permissions',
            'create_permissions',
            'update_permissions',
            'delete_permissions',
        ];

        // Project-related permissions
        $projectPermissions = [
            'access_all_projects',
            'create_project',
            'create_collection',
            'access_collection_settings',
            'update_collection',
            'delete_collection',
            'create_field',
            'update_field',
            'delete_field',
            'access_project_settings',
            'delete_project',
            'access_localization_settings',
            'access_user_access_settings',
            'access_api_access_settings',
            'access_webhooks_settings',

            // Content permissions
            'create_content',
            'update_content',
            'publish_content',
            'unpublish_content',
            'move_content_to_trash',
            'delete_content',

            // Asset permissions
            'access_assets',
            'upload_asset',
            'update_asset',
            'delete_asset',
        ];

        // Create each permission using findOrCreate to avoid duplicates
        $allPermissions = array_merge($userPermissions, $rolePermissions, $permissionPermissions, $projectPermissions);
        foreach ($allPermissions as $permission) {
            Permission::findOrCreate($permission);
        }

        // Create roles and assign permissions
        // Super Admin role - gets all permissions
        $superAdminRole = Role::firstOrCreate(['name' => 'Super Admin']);
        $superAdminRole->syncPermissions(Permission::all());

        // Project Admin role - gets specific permissions
        $projectAdminRole = Role::firstOrCreate(['name' => 'Project Admin']);
        $projectAdminRole->syncPermissions(array_merge(
            //every project permission except access_all_projects and create_project
            array_filter($projectPermissions, function($permission) {
                return $permission !== 'access_all_projects' && $permission !== 'create_project';
            }),
        ));

        // Content Editor role - gets specific permissions
        $contentEditorRole = Role::firstOrCreate(['name' => 'Content Editor']);
        $contentEditorRole->syncPermissions([
            'create_content',
            'update_content',
            'publish_content',
            'unpublish_content',
            'move_content_to_trash',
            'access_assets',
            'upload_asset',
            'update_asset',
        ]);

        // Assign Super Admin role to the first user (usually created in DatabaseSeeder)
        if ($user) {
            $user->assignRole($superAdminRole);
        }
    }
}
