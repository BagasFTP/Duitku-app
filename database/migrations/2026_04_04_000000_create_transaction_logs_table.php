<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_logs', function (Blueprint $table) {
            $table->id();

            // Nullable so log entries survive transaction deletion
            $table->unsignedBigInteger('transaction_id')->nullable();

            // Nullable to support system-generated actions (e.g. recurring command)
            $table->unsignedBigInteger('user_id')->nullable();

            $table->enum('action', ['created', 'updated', 'deleted']);

            // Stores field values before the change (null for 'created')
            $table->json('old_values')->nullable();

            // Stores field values after the change (null for 'deleted')
            $table->json('new_values')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            // Audit logs are immutable — only created_at is needed
            $table->timestamp('created_at')->useCurrent();

            $table->index(['transaction_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_logs');
    }
};
