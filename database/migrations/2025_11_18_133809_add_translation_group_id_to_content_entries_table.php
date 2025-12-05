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
        Schema::table('content_entries', function (Blueprint $table) {
            $table->uuid('translation_group_id')->nullable()->after('locale');
            $table->index('translation_group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('content_entries', function (Blueprint $table) {
            $table->dropIndex(['translation_group_id']);
            $table->dropColumn('translation_group_id');
        });
    }
};
