<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Wallet;
use App\Models\Budget;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $now   = Carbon::now();
        $month = $now->month;
        $year  = $now->year;

        $transactions = Transaction::with(['category', 'wallet'])
            ->where('user_id', auth()->id())
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->latest('date')
            ->get();

        $totalIncome  = $transactions->where('type', 'income')->sum('amount');
        $totalExpense = $transactions->where('type', 'expense')->sum('amount');

        $expenseByCategory = $transactions
            ->where('type', 'expense')
            ->groupBy('category_id')
            ->map(fn($group) => [
                'category' => $group->first()->category,
                'total'    => $group->sum('amount'),
            ])
            ->values();

        $budgets = Budget::with('category')
            ->where('user_id', auth()->id())
            ->where('month', $month)
            ->where('year', $year)
            ->get();

        $wallets = Wallet::where('user_id', auth()->id())->orderBy('name')->get();

        return Inertia::render('Dashboard', [
            'summary' => [
                'income'  => $totalIncome,
                'expense' => $totalExpense,
                'balance' => $totalIncome - $totalExpense,
                'month'   => $month,
                'year'    => $year,
            ],
            'recentTransactions'  => $transactions->take(5)->values(),
            'expenseByCategory'   => $expenseByCategory,
            'budgets'             => $budgets,
            'wallets'             => $wallets,
        ]);
    }
}
