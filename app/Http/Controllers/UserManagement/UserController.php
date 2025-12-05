<?php

namespace App\Http\Controllers\UserManagement;

use App\Models\User;
use Inertia\Inertia;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;

class UserController extends Controller
{
    public function index()
    {
        return Inertia::render('UserManagement/Users', [
            'roles' => Role::all()
        ]);
    }

    public function apiIndex(Request $request)
    {
        $query = User::with('roles')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($request->sort, function ($query, $sort) use ($request) {
                $direction = $request->direction === 'desc' ? 'desc' : 'asc';
                $query->orderBy($sort, $direction);
            }, function ($query) {
                $query->orderBy('created_at', 'asc');
            });

        // Handle all filter parameters
        foreach ($request->all() as $key => $value) {
            if (str_starts_with($key, 'filter_') && $value !== '') {
                $column = str_replace('filter_', '', $key);
                
                // Handle date range filters
                if (str_ends_with($column, '_from')) {
                    $baseColumn = str_replace('_from', '', $column);
                    $query->whereDate($baseColumn, '>=', $value);
                } elseif (str_ends_with($column, '_to')) {
                    $baseColumn = str_replace('_to', '', $column);
                    $query->whereDate($baseColumn, '<=', $value);
                }
                // Handle role filter
                elseif ($column === 'roles') {
                    $query->whereHas('roles', function ($query) use ($value) {
                        $query->where('roles.id', $value);
                    });
                }
                // Handle other filters
                else {
                    $query->where($column, 'like', "%{$value}%");
                }
            }
        }

        $users = $query->paginate($request->input('per_page', 10));

        return response()->json($users);
    }
    
    public function apiStore(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'roles' => 'required|array'
        ]);
        
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);
        
        $user->syncRoles($request->roles);
        
        return response()->json(['message' => 'User created successfully']);
    }
    
    public function apiUpdate(Request $request, User $user)
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,'.$user->id,
            'roles' => 'required|array'
        ];
        
        if ($request->filled('password')) {
            $rules['password'] = 'string|min:8';
        }
        
        $request->validate($rules);
        
        $data = [
            'name' => $request->name,
            'email' => $request->email,
        ];
        
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }
        
        $user->update($data);
        $user->syncRoles($request->roles);
        
        return response()->json(['message' => 'User updated successfully']);
    }
    
    public function apiDestroy(User $user)
    {
        // Check if user has Super Admin role
        if ($user->hasRole('Super Admin')) {
            return response()->json(['error' => 'Super Admin role cannot be deleted.'], 422);
        }

        $user->delete();
        
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function apiBulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:users,id',
            'password' => 'required|current_password',
        ]);

        $users = User::whereIn('id', $request->ids)->get();

        // Check if any of the users have Super Admin role
        foreach ($users as $user) {
            if ($user->hasRole('Super Admin')) {
                return response()->json(['error' => 'Cannot delete users with Super Admin role.'], 422);
            }
        }

        // Delete the users
        User::whereIn('id', $request->ids)->delete();
        
        return response()->json(['message' => 'Users deleted successfully.']);
    }
} 