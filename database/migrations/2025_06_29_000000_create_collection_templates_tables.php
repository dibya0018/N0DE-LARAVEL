<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('collection_templates', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name', 60);
            $table->string('slug', 60)->unique();
            $table->string('description')->nullable();
            $table->boolean('is_singleton')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('collection_template_fields', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('collection_template_id')->constrained()->cascadeOnDelete();
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
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('collection_template_fields');
        Schema::dropIfExists('collection_templates');
    }
}; 