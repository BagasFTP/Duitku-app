<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        // Expand the type enum (MySQL/PostgreSQL only; SQLite stores as TEXT and skips enforcement)
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE transactions MODIFY COLUMN `type` ENUM('income', 'expense', 'adjustment') NOT NULL");
        } elseif ($driver === 'pgsql') {
            DB::statement("ALTER TYPE transactions_type_enum ADD VALUE IF NOT EXISTS 'adjustment'");
        }

        // Make category_id nullable
        if ($driver === 'sqlite') {
            // SQLite requires recreating the table; use temporary column swap
            Schema::table('transactions', function (Blueprint $table) {
                $table->unsignedBigInteger('category_id')->nullable()->change();
            });
        } else {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
                $table->unsignedBigInteger('category_id')->nullable()->change();
                $table->foreign('category_id')->references('id')->on('categories')->onDelete('set null');
            });
        }
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE transactions MODIFY COLUMN `type` ENUM('income', 'expense') NOT NULL");
        }

        if ($driver === 'sqlite') {
            Schema::table('transactions', function (Blueprint $table) {
                $table->unsignedBigInteger('category_id')->nullable(false)->change();
            });
        } else {
            Schema::table('transactions', function (Blueprint $table) {
                $table->dropForeign(['category_id']);
                $table->unsignedBigInteger('category_id')->nullable(false)->change();
                $table->foreign('category_id')->references('id')->on('categories')->onDelete('cascade');
            });
        }
    }
};
