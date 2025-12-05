<?php

namespace Tests\Feature\PermissionAccess;

use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class UsersTest extends TestCase
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
        $this->userPermission = Permission::create(['name' => 'access_users']);
        $this->userPermission = Permission::create(['name' => 'create_users']);
        $this->userPermission = Permission::create(['name' => 'update_users']);
        $this->userPermission = Permission::create(['name' => 'delete_users']);

        $this->rolePermission = Permission::create(['name' => 'access_roles']);
        $this->permissionPermission = Permission::create(['name' => 'access_permissions']);
    }

    public function test_user_with_permissions_can_view_users_page()
    {
        $this->user->givePermissionTo('access_users');
        $response = $this->actingAs($this->user)->get('/user-management/users');
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_view_users_page()
    {
        $this->user->revokePermissionTo('access_users');
        $response = $this->actingAs($this->user)->get('/user-management/users');
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_create_user()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->givePermissionTo('create_users');
        $response = $this->actingAs($this->user)->post('/user-management/api/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password',
            'roles' => [1] // User role
        ]);
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_create_user()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->revokePermissionTo('create_users');
        $response = $this->actingAs($this->user)->post('/user-management/api/users', [
            'name' => 'New User',
            'email' => 'newuser@example.com',
            'password' => 'password',
            'roles' => [3] // User role
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_update_user()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->givePermissionTo('update_users');
        $response = $this->actingAs($this->user)->put('/user-management/api/users/1', [
            'name' => 'Updated User',
            'email' => 'updateduser@example.com',
            'password' => 'password',
            'roles' => [1] // User role
        ]);
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_update_user()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->revokePermissionTo('update_users');
        $response = $this->actingAs($this->user)->put('/user-management/api/users/1', [
            'name' => 'Updated User',
            'email' => 'updateduser@example.com',
            'password' => 'password',
            'roles' => [1] // User role
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_permissions_can_delete_user()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->givePermissionTo('delete_users');
        $response = $this->actingAs($this->user)->delete('/user-management/api/users/1');
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_delete_user()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->revokePermissionTo('delete_users');
        $response = $this->actingAs($this->user)->delete('/user-management/api/users/1');
        $response->assertStatus(403);
    }
    
    public function test_user_with_permissions_can_bulk_delete_users()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->givePermissionTo('delete_users');
        $response = $this->actingAs($this->user)->post('/user-management/api/users/bulk-delete', [
            'password' => 'password',
            'ids' => [1]
        ]);
        $response->assertStatus(200);
    }

    public function test_user_with_wrong_password_cannot_bulk_delete_users()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->givePermissionTo('delete_users');
        $response = $this->actingAs($this->user)->post('/user-management/api/users/bulk-delete', [
            'password' => 'wrongpassword',
            'ids' => [1]
        ]);
        $response->assertSessionHasErrors('password');
        $response->assertStatus(302);
    }

    public function test_user_without_permissions_cannot_bulk_delete_users()
    {
        $this->user->givePermissionTo('access_users');
        $this->user->revokePermissionTo('delete_users');
        $response = $this->actingAs($this->user)->post('/user-management/api/users/bulk-delete');
        $response->assertStatus(403);
    }
}