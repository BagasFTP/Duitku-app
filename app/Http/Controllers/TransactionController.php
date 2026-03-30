<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Transaction;
use App\Models\Category;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $query = Transaction::with(['category', 'wallet'])
            ->latest('date');

        if ($request->filled('month') && $request->filled('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('wallet_id')) {
            $query->where('wallet_id', $request->wallet_id);
        }

        return Inertia::render('Transactions/Index', [
            'transactions' => $query->paginate(20)->withQueryString(),
            'categories'   => Category::orderBy('name')->get(),
            'wallets'      => Wallet::orderBy('name')->get(),
            'filters'      => $request->only(['month', 'year', 'type', 'category_id', 'wallet_id']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Transactions/Create', [
            'categories' => Category::orderBy('type')->orderBy('name')->get(),
            'wallets'    => Wallet::orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'amount'       => 'required|numeric|min:0',
            'type'         => 'required|in:income,expense',
            'description'  => 'nullable|string|max:255',
            'date'         => 'required|date',
            'category_id'  => 'required|exists:categories,id',
            'wallet_id'    => 'required|exists:wallets,id',
            'is_recurring' => 'boolean',
            'recur_type'   => 'nullable|in:daily,weekly,monthly|required_if:is_recurring,true',
        ]);

        if (!empty($validated['is_recurring']) && !empty($validated['recur_type'])) {
            $base = Carbon::parse($validated['date']);
            $validated['next_occurrence_at'] = match ($validated['recur_type']) {
                'daily'   => $base->copy()->addDay()->toDateString(),
                'weekly'  => $base->copy()->addWeek()->toDateString(),
                'monthly' => $base->copy()->addMonth()->toDateString(),
            };
        }

        $transaction = Transaction::create($validated);

        // Update saldo wallet
        $wallet = $transaction->wallet;
        if ($transaction->type === 'income') {
            $wallet->increment('balance', $transaction->amount);
        } else {
            $wallet->decrement('balance', $transaction->amount);
        }

        $budgetAlert = $this->checkBudgetAlert($transaction->category_id, $transaction->date);

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil ditambahkan.')
            ->with('budget_alert', $budgetAlert);
    }

    public function edit(Transaction $transaction): Response
    {
        return Inertia::render('Transactions/Edit', [
            'transaction' => $transaction->load(['category', 'wallet']),
            'categories'  => Category::orderBy('type')->orderBy('name')->get(),
            'wallets'     => Wallet::orderBy('name')->get(),
        ]);
    }

    public function update(Request $request, Transaction $transaction): RedirectResponse
    {
        $validated = $request->validate([
            'amount'       => 'required|numeric|min:0',
            'type'         => 'required|in:income,expense',
            'description'  => 'nullable|string|max:255',
            'date'         => 'required|date',
            'category_id'  => 'required|exists:categories,id',
            'wallet_id'    => 'required|exists:wallets,id',
            'is_recurring' => 'boolean',
            'recur_type'   => 'nullable|in:daily,weekly,monthly|required_if:is_recurring,true',
        ]);

        if (!empty($validated['is_recurring']) && !empty($validated['recur_type'])) {
            $base = Carbon::parse($validated['date']);
            $validated['next_occurrence_at'] = match ($validated['recur_type']) {
                'daily'   => $base->copy()->addDay()->toDateString(),
                'weekly'  => $base->copy()->addWeek()->toDateString(),
                'monthly' => $base->copy()->addMonth()->toDateString(),
            };
        } else {
            $validated['next_occurrence_at'] = null;
        }

        // Revert saldo wallet lama
        $oldWallet = $transaction->wallet;
        if ($transaction->type === 'income') {
            $oldWallet->decrement('balance', $transaction->amount);
        } else {
            $oldWallet->increment('balance', $transaction->amount);
        }

        $transaction->update($validated);

        // Terapkan saldo wallet baru
        $newWallet = Wallet::find($validated['wallet_id']);
        if ($validated['type'] === 'income') {
            $newWallet->increment('balance', $validated['amount']);
        } else {
            $newWallet->decrement('balance', $validated['amount']);
        }

        $budgetAlert = $this->checkBudgetAlert($validated['category_id'], $validated['date']);

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil diperbarui.')
            ->with('budget_alert', $budgetAlert);
    }

    private function checkBudgetAlert(?int $categoryId, string $date): ?array
    {
        if (! $categoryId) return null;

        $txDate = Carbon::parse($date);
        $now    = Carbon::now();

        // Hanya cek transaksi bulan ini
        if ($txDate->month !== $now->month || $txDate->year !== $now->year) return null;

        $budget = Budget::where('category_id', $categoryId)
            ->where('month', $txDate->month)
            ->where('year', $txDate->year)
            ->where('amount', '>', 0)
            ->first();

        if (! $budget) return null;

        $totalSpent = Transaction::where('type', 'expense')
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

    public function syncOffline(Request $request): \Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'items'                => 'required|array|min:1|max:100',
            'items.*.tempId'       => 'required|string',
            'items.*.amount'       => 'required|numeric|min:0',
            'items.*.type'         => 'required|in:income,expense',
            'items.*.description'  => 'nullable|string|max:255',
            'items.*.date'         => 'required|date',
            'items.*.category_id'  => 'required|exists:categories,id',
            'items.*.wallet_id'    => 'required|exists:wallets,id',
            'items.*.is_recurring' => 'boolean',
            'items.*.recur_type'   => 'nullable|in:daily,weekly,monthly',
        ]);

        $results = [];

        foreach ($validated['items'] as $item) {
            try {
                if (!empty($item['is_recurring']) && !empty($item['recur_type'])) {
                    $base = Carbon::parse($item['date']);
                    $item['next_occurrence_at'] = match ($item['recur_type']) {
                        'daily'   => $base->copy()->addDay()->toDateString(),
                        'weekly'  => $base->copy()->addWeek()->toDateString(),
                        'monthly' => $base->copy()->addMonth()->toDateString(),
                    };
                }

                $transaction = Transaction::create($item);

                $wallet = $transaction->wallet;
                if ($transaction->type === 'income') {
                    $wallet->increment('balance', $transaction->amount);
                } else {
                    $wallet->decrement('balance', $transaction->amount);
                }

                $results[] = ['tempId' => $item['tempId'], 'success' => true];
            } catch (\Exception $e) {
                $results[] = ['tempId' => $item['tempId'], 'success' => false, 'error' => $e->getMessage()];
            }
        }

        return response()->json(['results' => $results]);
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        // Adjustment records don't have an invertible delta — skip balance revert
        if ($transaction->type !== 'adjustment') {
            $wallet = $transaction->wallet;
            if ($transaction->type === 'income') {
                $wallet->decrement('balance', $transaction->amount);
            } else {
                $wallet->increment('balance', $transaction->amount);
            }
        }

        $transaction->delete();

        return redirect()->route('transactions.index')->with('success', 'Transaksi berhasil dihapus.');
    }
}
