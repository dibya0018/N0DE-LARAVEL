<?php

namespace Tests\Feature\PermissionAccess;

use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    private $systemPermissions = [
        'access_users', 'create_users', 'update_users', 'delete_users', 'access_roles', 'create_roles', 'update_roles', 'delete_roles',  'access_permissions', 'create_permissions', 'update_permissions', 'delete_permissions', 'access_all_projects', 'create_project', 'create_collection', 'access_collection_settings', 'update_collection', 'delete_collection', 'create_field', 'update_field', 'delete_field', 'access_project_settings', 'delete_project', 'access_localization_settings', 'access_user_access_settings', 'access_api_access_settings', 'access_webhooks_settings', 'create_content', 'update_content', 'publish_content', 'unpublish_content', 'move_content_to_trash', 'delete_content', 'access_assets', 'upload_asset', 'update_asset', 'delete_asset',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        //Create role
        $this->userRole = Role::create(['name' => 'User']);

        // Create user
        $this->user = User::create([
            'name' => 'User',
            'email' => 'user@example.com',
            'password' => Hash::make('password'),
        ]);
        $this->user->assignRole($this->userRole);

        //Create permissions
        $this->permissionPermission = Permission::create(['name' => 'access_permissions']);
        $this->permissionPermission = Permission::create(['name' => 'create_permissions']);
        $this->permissionPermission = Permission::create(['name' => 'update_permissions']);
        $this->permissionPermission = Permission::create(['name' => 'delete_permissions']);

        $this->userPermission = Permission::create(['name' => 'access_users']);
        $this->rolePermission = Permission::create(['name' => 'access_roles']);
        
    }

    public function test_user_with_permissions_can_view_permissions_page()
    {
        $this->user->givePermissionTo('access_permissions');
        $response = $this->actingAs($this->user)->get('/user-management/permissions');
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_view_permissions_page()
    {
        $this->user->revokePermissionTo('access_permissions');
        $response = $this->actingAs($this->user)->get('/user-management/permissions');
        $response->assertStatus(403);
    }
    
    public function test_user_with_permissions_can_create_permission()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('create_permissions');
        $response = $this->actingAs($this->user)->post('/user-management/api/permissions', [
            'name' => 'New Permission',
        ]);
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_create_permission()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->revokePermissionTo('create_permissions');
        $response = $this->actingAs($this->user)->post('/user-management/api/permissions', [
            'name' => 'New Permission',
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_update_permission()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('update_permissions');
        
        // Create a non-system permission to update
        $customPermission = Permission::create(['name' => 'test_permission']);
        
        $response = $this->actingAs($this->user)->put("/user-management/api/permissions/{$customPermission->id}", [
            'name' => 'Updated Permission',
        ]);
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_update_permission()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->revokePermissionTo('update_permissions');
        $response = $this->actingAs($this->user)->put('/user-management/api/permissions/1', [
            'name' => 'Updated Permission',
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_delete_permission()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('delete_permissions');
        
        // Create a non-system permission to delete
        $customPermission = Permission::create(['name' => 'test_permission']);
        
        $response = $this->actingAs($this->user)->delete("/user-management/api/permissions/{$customPermission->id}");
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_delete_permission()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->revokePermissionTo('delete_permissions');
        $response = $this->actingAs($this->user)->delete('/user-management/api/permissions/1');
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_bulk_delete_permissions()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('delete_permissions');
        
        // Create a non-system permission to delete
        $customPermission = Permission::create(['name' => 'test_permission']);
        
        $response = $this->actingAs($this->user)->post('/user-management/api/permissions/bulk-delete', [
            'password' => 'password',
            'ids' => [$customPermission->id]
        ]);
        $response->assertStatus(200);
    }

    public function test_user_with_wrong_password_cannot_bulk_delete_permissions()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('delete_permissions');
        $response = $this->actingAs($this->user)->post('/user-management/api/permissions/bulk-delete', [
            'password' => 'wrongpassword',
            'ids' => [1]
        ]);
        $response->assertSessionHasErrors('password');
        $response->assertStatus(302);
    }

    public function test_user_without_permissions_cannot_bulk_delete_permissions()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->revokePermissionTo('delete_permissions');
        $response = $this->actingAs($this->user)->post('/user-management/api/permissions/bulk-delete');
        $response->assertStatus(403);
    }

    public function test_system_permissions_cannot_be_updated()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('update_permissions');
        
        // Find an existing system permission
        $systemPermission = Permission::where('name', 'access_users')->first();
        
        $response = $this->actingAs($this->user)->put("/user-management/api/permissions/{$systemPermission->id}", [
            'name' => 'Updated System Permission',
        ]);
        
        $response->assertStatus(401);
        $response->assertJson(['error' => 'System permissions cannot be updated.']);
    }

    public function test_system_permissions_cannot_be_deleted()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('delete_permissions');
        
        // Find an existing system permission
        $systemPermission = Permission::where('name', 'access_users')->first();
        
        $response = $this->actingAs($this->user)->delete("/user-management/api/permissions/{$systemPermission->id}");
        
        $response->assertStatus(401);
        $response->assertJson(['error' => 'System permissions cannot be deleted.']);
    }

    public function test_system_permissions_cannot_be_bulk_deleted()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('delete_permissions');
        
        // Find an existing system permission
        $systemPermission = Permission::where('name', 'access_users')->first();
        
        $response = $this->actingAs($this->user)->post('/user-management/api/permissions/bulk-delete', [
            'password' => 'password',
            'ids' => [$systemPermission->id]
        ]);
        
        $response->assertStatus(401);
        $response->assertJson(['error' => 'Cannot delete system permissions.']);
    }

    public function test_non_system_permissions_can_still_be_updated()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('update_permissions');
        
        // Create a non-system permission
        $customPermission = Permission::create(['name' => 'custom_permission']);
        
        $response = $this->actingAs($this->user)->put("/user-management/api/permissions/{$customPermission->id}", [
            'name' => 'updated_custom_permission',
        ]);
        
        $response->assertStatus(200);
        $response->assertJson(['message' => 'Permission updated successfully']);
    }

    public function test_non_system_permissions_can_still_be_deleted()
    {
        $this->user->givePermissionTo('access_permissions');
        $this->user->givePermissionTo('delete_permissions');
        
        // Create a non-system permission
        $customPermission = Permission::create(['name' => 'custom_permission']);
        
        $response = $this->actingAs($this->user)->delete("/user-management/api/permissions/{$customPermission->id}");
        
        $response->assertStatus(200);
        $response->assertJson(['message' => 'Permission deleted successfully']);
    }
}