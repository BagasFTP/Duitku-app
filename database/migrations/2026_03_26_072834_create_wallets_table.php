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
        Schema::create('wallets', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->enum('type', ['bank', 'cash', 'ewallet'])->default('cash');
        $table->decimal('balance', 15, 2)->default(0);
        $table->string('icon')->default('💳');
        $table->string('color')->default('#3b82f6');
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
