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
        Schema::create('ai_analyses', function (Blueprint $table) {
        $table->id();
        $table->unsignedTinyInteger('month');
        $table->unsignedSmallInteger('year');
        $table->json('result');
        $table->unsignedTinyInteger('health_score')->nullable();
        $table->timestamps();
        $table->unique(['month', 'year']);
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_analyses');
    }
};
