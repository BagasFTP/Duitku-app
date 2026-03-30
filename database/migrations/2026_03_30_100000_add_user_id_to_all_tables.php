<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ambil user pertama sebagai fallback untuk data lama
        $firstUserId = DB::table('users')->value('id') ?? 1;

        $tables = ['categories', 'wallets', 'transactions', 'budgets'];

        foreach ($tables as $table) {
            Schema::table($table, function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->after('id');
            });

            DB::table($table)->whereNull('user_id')->update(['user_id' => $firstUserId]);

            Schema::table($table, function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable(false)->change();
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            });
        }

        Schema::table('ai_analyses', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->after('id');
        });

        DB::table('ai_analyses')->whereNull('user_id')->update(['user_id' => $firstUserId]);

        Schema::table('ai_analyses', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            // Unique per user+month+year (previously global)
            $table->dropUnique(['month', 'year']);
            $table->unique(['user_id', 'month', 'year']);
        });
    }

    public function down(): void
    {
        Schema::table('ai_analyses', function (Blueprint $table) {
            $table->dropUnique(['user_id', 'month', 'year']);
            $table->unique(['month', 'year']);
            $table->dropConstrainedForeignId('user_id');
        });

        foreach (['budgets', 'transactions', 'wallets', 'categories'] as $tbl) {
            Schema::table($tbl, function (Blueprint $table) {
                $table->dropConstrainedForeignId('user_id');
            });
        }
    }
};
