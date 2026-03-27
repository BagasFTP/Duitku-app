<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Category;
use App\Models\Wallet;
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

        $transaction = Transaction::create($validated);

        // Update saldo wallet
        $wallet = $transaction->wallet;
        if ($transaction->type === 'income') {
            $wallet->increment('balance', $transaction->amount);
        } else {
            $wallet->decrement('balance', $transaction->amount);
        }

        return redirect()->route('transactions.index')->with('success', 'Transaksi berhasil ditambahkan.');
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

        return redirect()->route('transactions.index')->with('success', 'Transaksi berhasil diperbarui.');
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
