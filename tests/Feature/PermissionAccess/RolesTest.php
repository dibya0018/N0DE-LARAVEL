<?php

namespace Tests\Feature\PermissionAccess;

use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RolesTest extends TestCase
{
    use RefreshDatabase;

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
        $this->rolePermission = Permission::create(['name' => 'access_roles']);
        $this->rolePermission = Permission::create(['name' => 'create_roles']);
        $this->rolePermission = Permission::create(['name' => 'update_roles']);
        $this->rolePermission = Permission::create(['name' => 'delete_roles']);

        $this->userPermission = Permission::create(['name' => 'access_users']);
        $this->permissionPermission = Permission::create(['name' => 'access_permissions']);
    }

    public function test_user_with_permissions_can_view_roles_page()
    {
        $this->user->givePermissionTo('access_roles');
        $response = $this->actingAs($this->user)->get('/user-management/roles');
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_view_roles_page()
    {
        $this->user->revokePermissionTo('access_roles');
        $response = $this->actingAs($this->user)->get('/user-management/roles');
        $response->assertStatus(403);
    }
    
    public function test_user_with_permissions_can_create_role()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->givePermissionTo('create_roles');
        $response = $this->actingAs($this->user)->post('/user-management/api/roles', [
            'name' => 'New Role',
            'permissions' => ['access_users', 'access_roles']
        ]);
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_create_role()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->revokePermissionTo('create_roles');
        $response = $this->actingAs($this->user)->post('/user-management/api/roles', [
            'name' => 'New Role',
            'permissions' => ['access_users', 'access_roles']
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_update_role()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->givePermissionTo('update_roles');
        $response = $this->actingAs($this->user)->put('/user-management/api/roles/1', [
            'name' => 'Updated Role',
            'permissions' => ['access_users', 'access_roles', 'access_permissions']
        ]);
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_update_role()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->revokePermissionTo('update_roles');
        $response = $this->actingAs($this->user)->put('/user-management/api/roles/1', [
            'name' => 'Updated Role',
            'permissions' => ['access_users', 'access_roles', 'access_permissions']
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_delete_role()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->givePermissionTo('delete_roles');
        $response = $this->actingAs($this->user)->delete('/user-management/api/roles/1');
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_delete_role()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->revokePermissionTo('delete_roles');
        $response = $this->actingAs($this->user)->delete('/user-management/api/roles/1');
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_bulk_delete_roles()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->givePermissionTo('delete_roles');
        $response = $this->actingAs($this->user)->post('/user-management/api/roles/bulk-delete', [
            'password' => 'password',
            'ids' => [1]
        ]);
        $response->assertStatus(200);
    }

    public function test_user_with_wrong_password_cannot_bulk_delete_roles()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->givePermissionTo('delete_roles');
        $response = $this->actingAs($this->user)->post('/user-management/api/roles/bulk-delete', [
            'password' => 'wrongpassword',
            'ids' => [1]
        ]);
        $response->assertSessionHasErrors('password');
        $response->assertStatus(302);
    }

    public function test_user_without_permissions_cannot_bulk_delete_roles()
    {
        $this->user->givePermissionTo('access_roles');
        $this->user->revokePermissionTo('delete_roles');
        $response = $this->actingAs($this->user)->post('/user-management/api/roles/bulk-delete');
        $response->assertStatus(403);
    }
}