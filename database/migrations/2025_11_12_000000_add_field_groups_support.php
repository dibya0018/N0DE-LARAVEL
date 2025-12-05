<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add parent_field_id column if it doesn't exist
        if (!Schema::hasColumn('collection_fields', 'parent_field_id')) {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->unsignedBigInteger('parent_field_id')
                    ->nullable()
                    ->after('collection_id');
            });
        }

        // Drop existing foreign key on parent_field_id if it exists
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropForeign(['parent_field_id']);
            });
        } catch (\Exception $e) {
            // Foreign key doesn't exist, continue
        }

        // Drop old unique constraint if it exists
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropUnique(['collection_id', 'name']);
            });
        } catch (\Exception $e) {
            // Unique constraint doesn't exist or has different name, try dropping by name
            try {
                Schema::table('collection_fields', function (Blueprint $table) {
                    $table->dropUnique('collection_fields_collection_id_name_unique');
                });
            } catch (\Exception $e) {
                // Old constraint doesn't exist, continue
            }
        }

        // Add new unique constraint with parent_field_id
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->unique(['collection_id', 'parent_field_id', 'name'], 'collection_fields_collection_parent_name_unique');
            });
        } catch (\Exception $e) {
            // Constraint already exists, continue
        }

        // Add foreign key constraint
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->foreign('parent_field_id')
                    ->references('id')
                    ->on('collection_fields')
                    ->cascadeOnDelete();
            });
        } catch (\Exception $e) {
            // Foreign key already exists, continue
        }

        // Create content_field_groups table
        if (!Schema::hasTable('content_field_groups')) {
            Schema::create('content_field_groups', function (Blueprint $table) {
                $table->id();
                $table->uuid('uuid')->unique();
                $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
                $table->foreignId('collection_id')->constrained('collections')->cascadeOnDelete();
                $table->foreignId('content_entry_id')->constrained('content_entries')->cascadeOnDelete();
                $table->foreignId('field_id')->constrained('collection_fields')->cascadeOnDelete();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();
                $table->softDeletes();

                $table->index(['content_entry_id', 'field_id']);
            });
        }

        // Add group_instance_id column to content_field_values
        if (!Schema::hasColumn('content_field_values', 'group_instance_id')) {
            Schema::table('content_field_values', function (Blueprint $table) {
                $table->foreignId('group_instance_id')
                    ->nullable()
                    ->after('content_entry_id')
                    ->constrained('content_field_groups')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop group_instance_id column
        if (Schema::hasColumn('content_field_values', 'group_instance_id')) {
            Schema::table('content_field_values', function (Blueprint $table) {
                $table->dropConstrainedForeignId('group_instance_id');
            });
        }

        // Drop content_field_groups table
        Schema::dropIfExists('content_field_groups');

        // Drop foreign key
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropForeign(['parent_field_id']);
            });
        } catch (\Exception $e) {
            // Foreign key doesn't exist, continue
        }

        // Drop the new unique constraint
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropUnique('collection_fields_collection_parent_name_unique');
            });
        } catch (\Exception $e) {
            // Constraint doesn't exist, continue
        }

        // Restore the old unique constraint
        try {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->unique(['collection_id', 'name']);
            });
        } catch (\Exception $e) {
            // Constraint already exists, continue
        }

        // Drop parent_field_id column
        if (Schema::hasColumn('collection_fields', 'parent_field_id')) {
            Schema::table('collection_fields', function (Blueprint $table) {
                $table->dropColumn('parent_field_id');
            });
        }
    }
};

