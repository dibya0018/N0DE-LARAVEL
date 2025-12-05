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
        Schema::create('content_field_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('collection_id')->constrained('collections')->onDelete('cascade');
            $table->foreignId('content_entry_id')->constrained('content_entries')->onDelete('cascade');
            $table->foreignId('field_id')->constrained('collection_fields')->onDelete('cascade');
            $table->enum('field_type', [
                'text',
                'longtext',
                'richtext',
                'slug',
                'email',
                'password',
                'number',
                'enumeration',
                'boolean',
                'color',
                'date',
                'time',
                'datetime',
                'media',
                'relation',
                'json',
            ]);
            $table->text('text_value')->nullable();
            $table->decimal('number_value', 20, 6)->nullable();
            $table->boolean('boolean_value')->nullable();
            $table->date('date_value')->nullable();
            $table->date('date_value_end')->nullable();
            $table->timestamp('datetime_value')->nullable();
            $table->timestamp('datetime_value_end')->nullable();
            $table->json('json_value')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['content_entry_id', 'field_id']);
            $table->index(['field_type', 'number_value']);
            $table->index(['field_type', 'date_value']);
            $table->index(['field_type', 'date_value_end']);
            $table->index(['field_type', 'datetime_value']);
            $table->index(['field_type', 'datetime_value_end']);
            $table->index(['field_type', 'boolean_value']);
        });
        // Add composite index for text_value (PostgreSQL compatible)
        if (DB::connection()->getDriverName() === 'mysql') {
            DB::statement('CREATE INDEX content_field_values_field_type_text_value_index ON content_field_values (field_type, text_value(191))');
        } else {
            DB::statement('CREATE INDEX content_field_values_field_type_text_value_index ON content_field_values (field_type, text_value)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_field_values');
    }
};
