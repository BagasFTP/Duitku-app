<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipt_scans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image_path')->nullable();
            $table->unsignedBigInteger('amount')->default(0);
            $table->string('description')->nullable();
            $table->date('date');
            $table->string('status')->default('pending'); // pending, saved
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipt_scans');
    }
};
