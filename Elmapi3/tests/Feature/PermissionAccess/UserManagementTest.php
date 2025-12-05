<?php

namespace Tests\Feature\PermissionAccess;

use Tests\TestCase;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;

class UserManagementTest extends TestCase
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
    
    public function test_user_with_permissions_can_view_user_management_page()
    {
        $this->user->givePermissionTo('access_users');
        $response = $this->actingAs($this->user)->get('/user-management/users');
        $response->assertStatus(200);

        $this->user->givePermissionTo('access_roles');
        $response = $this->actingAs($this->user)->get('/user-management/roles');
        $response->assertStatus(200);

        $this->user->givePermissionTo('access_permissions');
        $response = $this->actingAs($this->user)->get('/user-management/permissions');
        $response->assertStatus(200);
    }

    public function test_user_without_permissions_cannot_view_user_management_page()
    {
        $this->user->revokePermissionTo('access_users');
        
        $response = $this->actingAs($this->user)->get('/user-management/users');
        $response->assertStatus(403);

        $this->user->revokePermissionTo('access_roles');
        $response = $this->actingAs($this->user)->get('/user-management/roles');
        $response->assertStatus(403);

        $this->user->revokePermissionTo('access_permissions');
        $response = $this->actingAs($this->user)->get('/user-management/permissions');
        $response->assertStatus(403);
    }
}