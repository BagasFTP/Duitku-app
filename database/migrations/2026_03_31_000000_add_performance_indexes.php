<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->index(['user_id', 'type', 'date'], 'transactions_user_type_date');
            $table->index(['user_id', 'date'],          'transactions_user_date');
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->index(['user_id', 'period_type', 'year', 'month'], 'budgets_user_period');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_user_type_date');
            $table->dropIndex('transactions_user_date');
        });

        Schema::table('budgets', function (Blueprint $table) {
            $table->dropIndex('budgets_user_period');
        });
    }
};
