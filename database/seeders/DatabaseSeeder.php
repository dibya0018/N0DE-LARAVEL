<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Database\Seeders\UsersRolesAndPermissionsSeeder;
use Database\Seeders\CollectionTemplateSeeder;
use Database\Seeders\ProjectTemplateSeeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // Seed users, roles and permissions
        $this->call(UsersRolesAndPermissionsSeeder::class);

        // Seed sample templates
        $this->call(CollectionTemplateSeeder::class);

        // Seed project templates (imported from JSON if present)
        $this->call(ProjectTemplateSeeder::class);
    }
}
