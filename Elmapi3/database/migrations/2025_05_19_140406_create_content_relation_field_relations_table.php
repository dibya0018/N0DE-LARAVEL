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
        Schema::create('content_relation_field_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('field_value_id')->constrained('content_field_values')->onDelete('cascade');
            $table->unsignedBigInteger('related_id');
            $table->string('related_type');
            $table->integer('sort_order')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index('field_value_id');
            $table->index(['related_id', 'related_type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('content_relation_field_relations');
    }
};
