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
        Schema::create('transactions', function (Blueprint $table) {
        $table->id();
        $table->decimal('amount', 15, 2);
        $table->enum('type', ['income', 'expense']);
        $table->string('description')->nullable();
        $table->date('date');
        $table->foreignId('category_id')->constrained()->onDelete('cascade');
        $table->foreignId('wallet_id')->constrained()->onDelete('cascade');
        $table->boolean('is_recurring')->default(false);
        $table->string('recur_type')->nullable(); // daily, weekly, monthly
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
