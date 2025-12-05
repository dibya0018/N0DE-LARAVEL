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
        Schema::create('collection_fields', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('collection_id')->constrained()->cascadeOnDelete();
            $table->string('type', 60);
            $table->string('label', 60);
            $table->string('name', 60);
            $table->string('description')->nullable();
            $table->string('placeholder')->nullable();
            $table->integer('order')->nullable();
            $table->json('options')->nullable();
            $table->json('validations')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Add unique constraint for name within a collection
            $table->unique(['collection_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('collection_fields');
    }
};
