<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            // Drop old unique constraint
            $table->dropUnique('budgets_category_id_month_year_unique');

            // period_type: 'monthly' | 'weekly'
            $table->string('period_type', 10)->default('monthly')->after('year');

            // ISO week number (1-53), null for monthly budgets
            $table->unsignedTinyInteger('week')->nullable()->after('period_type');

            // month is now nullable (weekly budgets don't use it)
            $table->unsignedTinyInteger('month')->nullable()->change();

            // New unique constraint covering all period combinations
            $table->unique(['category_id', 'period_type', 'year', 'month', 'week'], 'budgets_period_unique');
        });
    }

    public function down(): void
    {
        Schema::table('budgets', function (Blueprint $table) {
            $table->dropUnique('budgets_period_unique');
            $table->dropColumn(['period_type', 'week']);
            $table->unsignedTinyInteger('month')->nullable(false)->change();
            $table->unique(['category_id', 'month', 'year']);
        });
    }
};
