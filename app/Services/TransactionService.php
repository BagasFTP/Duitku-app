<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class TransactionService
{
    /**
     * Apply a transaction's effect to the wallet balance.
     */
    public function applyBalance(Wallet $wallet, string $type, float $amount): void
    {
        if ($type === 'income') {
            $wallet->increment('balance', $amount);
        } else {
            $wallet->decrement('balance', $amount);
        }
    }

    /**
     * Revert a transaction's effect from the wallet balance.
     */
    public function revertBalance(Wallet $wallet, string $type, float $amount): void
    {
        if ($type === 'income') {
            $wallet->decrement('balance', $amount);
        } else {
            $wallet->increment('balance', $amount);
        }
    }

    /**
     * Compute and set next_occurrence_at in data array based on recurrence settings.
     * Always sets the key (to null when not recurring) so update() clears stale values.
     */
    public function prepareRecurring(array $data): array
    {
        if (!empty($data['is_recurring']) && !empty($data['recur_type'])) {
            $base = Carbon::parse($data['date']);
            $data['next_occurrence_at'] = match ($data['recur_type']) {
                'daily'   => $base->copy()->addDay()->toDateString(),
                'weekly'  => $base->copy()->addWeek()->toDateString(),
                'monthly' => $base->copy()->addMonth()->toDateString(),
            };
        } else {
            $data['next_occurrence_at'] = null;
        }

        return $data;
    }

    /**
     * Create a transaction and immediately apply its effect on the wallet balance.
     */
    public function createWithBalance(array $data): Transaction
    {
        $data        = $this->prepareRecurring($data);
        $transaction = Transaction::create($data);

        $this->applyBalance($transaction->wallet, $transaction->type, (float) $transaction->amount);

        return $transaction;
    }

    /**
     * Return budget alert info when spending reaches ≥ 80 % of the monthly limit,
     * or null if there is no relevant budget or the transaction is not in the current month.
     */
    public function checkBudgetAlert(?int $categoryId, string $date, int $userId): ?array
    {
        if (!$categoryId) return null;

        $txDate = Carbon::parse($date);
        $now    = Carbon::now();

        if ($txDate->month !== $now->month || $txDate->year !== $now->year) return null;

        $budget = Budget::where('user_id', $userId)
            ->where('category_id', $categoryId)
            ->where('month', $txDate->month)
            ->where('year', $txDate->year)
            ->where('amount', '>', 0)
            ->first();

        if (!$budget) return null;

        $totalSpent = Transaction::where('user_id', $userId)
            ->where('type', 'expense')
            ->where('category_id', $categoryId)
            ->whereMonth('date', $txDate->month)
            ->whereYear('date', $txDate->year)
            ->sum('amount');

        $limit = (float) $budget->amount;
        $pct   = $limit > 0 ? ($totalSpent / $limit) * 100 : 0;

        if ($pct < 80) return null;

        return [
            'category'   => $budget->category->name,
            'percentage' => (int) round($pct),
            'type'       => $pct >= 100 ? 'over' : 'near',
        ];
    }

    public function getCategoriesByUser(int $userId): Collection
    {
        return Cache::remember("user_{$userId}_categories", 600, fn() =>
            Category::where('user_id', $userId)->orderBy('type')->orderBy('name')->get()
        );
    }

    public function getWalletsByUser(int $userId): Collection
    {
        return Cache::remember("user_{$userId}_wallets", 600, fn() =>
            Wallet::where('user_id', $userId)->orderBy('name')->get()
        );
    }

    public function forgetUserCategoryCache(int $userId): void
    {
        Cache::forget("user_{$userId}_categories");
    }

    public function forgetUserWalletCache(int $userId): void
    {
        Cache::forget("user_{$userId}_wallets");
    }

    public function forgetBudgetAlertCache(int $userId, Carbon $date): void
    {
        Cache::forget("budget_alerts_{$userId}_{$date->year}_{$date->month}");
    }
}
