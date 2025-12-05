<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();
        $constraintNames = [];

        // Only query information_schema for MySQL/MariaDB
        if (in_array($driver, ['mysql', 'mariadb'])) {
            try {
                $constraints = DB::select("
                    SELECT CONSTRAINT_NAME 
                    FROM information_schema.TABLE_CONSTRAINTS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                    AND TABLE_NAME = 'collection_fields' 
                    AND CONSTRAINT_TYPE = 'UNIQUE'
                ");
                $constraintNames = array_column($constraints, 'CONSTRAINT_NAME');
            } catch (\Exception $e) {
                // If query fails, fall back to try-catch approach
                $constraintNames = [];
            }
        }

        // Drop old constraint by name if we know it exists (MySQL) or try anyway (SQLite)
        if (empty($constraintNames) || in_array('collection_fields_collection_id_name_unique', $constraintNames)) {
            try {
                Schema::table('collection_fields', function (Blueprint $table) {
                    $table->dropUnique('collection_fields_collection_id_name_unique');
                });
            } catch (\Exception $e) {
                // Constraint doesn't exist or already dropped, continue
            }
        }

        // Also try dropping by columns if it exists with a different name
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropUnique(['collection_id', 'name']);
            });
        } catch (\Exception $e) {
            // Constraint doesn't exist or already dropped, continue
        }

        // Ensure the new constraint with parent_field_id exists
        $newConstraintName = 'collection_fields_collection_parent_name_unique';
        if (empty($constraintNames) || !in_array($newConstraintName, $constraintNames)) {
            try {
                Schema::table('collection_fields', function (Blueprint $table) {
                    $table->unique(['collection_id', 'parent_field_id', 'name'], 'collection_fields_collection_parent_name_unique');
                });
            } catch (\Exception $e) {
                // Constraint already exists, continue
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop the new constraint
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropUnique('collection_fields_collection_parent_name_unique');
            });
        } catch (\Exception $e) {
            // Constraint doesn't exist, continue
        }

        // Restore the old constraint
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->unique(['collection_id', 'name'], 'collection_fields_collection_id_name_unique');
            });
        } catch (\Exception $e) {
            // Constraint already exists, continue
        }
    }
};
