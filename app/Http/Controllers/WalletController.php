<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WalletController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Wallets/Index', [
            'wallets' => Wallet::where('user_id', auth()->id())->withCount('transactions')->orderBy('name')->get(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Wallets/Create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'type'    => 'required|in:bank,cash,ewallet',
            'balance' => 'required|numeric|min:0',
            'icon'    => 'required|string|max:50',
            'color'   => 'required|string|max:20',
        ]);

        $validated['user_id'] = auth()->id();
        Wallet::create($validated);

        return redirect()->route('wallets.index')->with('success', 'Dompet berhasil ditambahkan.');
    }

    public function edit(Wallet $wallet): Response
    {
        return Inertia::render('Wallets/Edit', [
            'wallet' => $wallet,
        ]);
    }

    public function update(Request $request, Wallet $wallet): RedirectResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:100',
            'type'  => 'required|in:bank,cash,ewallet',
            'icon'  => 'required|string|max:10',
            'color' => 'required|string|max:20',
        ]);

        $wallet->update($validated);

        return redirect()->route('wallets.index')->with('success', 'Dompet berhasil diperbarui.');
    }

    public function adjust(Request $request, Wallet $wallet): RedirectResponse
    {
        $validated = $request->validate([
            'new_balance' => 'required|numeric|min:0',
            'note'        => 'nullable|string|max:255',
        ]);

        $oldBalance = (float) $wallet->balance;
        $newBalance = (float) $validated['new_balance'];

        if ($oldBalance !== $newBalance) {
            $delta       = abs($newBalance - $oldBalance);
            $fmt         = fn (float $v) => 'Rp ' . number_format($v, 0, ',', '.');
            $autoDesc    = 'Penyesuaian: ' . $fmt($oldBalance) . ' → ' . $fmt($newBalance);

            Transaction::create([
                'user_id'      => auth()->id(),
                'amount'       => $delta,
                'type'         => 'adjustment',
                'description'  => $validated['note'] ?: $autoDesc,
                'date'         => now()->toDateString(),
                'category_id'  => null,
                'wallet_id'    => $wallet->id,
                'is_recurring' => false,
                'recur_type'   => null,
            ]);

            $wallet->update(['balance' => $newBalance]);
        }

        return redirect()->route('wallets.edit', $wallet)->with('success', 'Saldo berhasil disesuaikan.');
    }

    public function destroy(Wallet $wallet): RedirectResponse
    {
        if ($wallet->transactions()->exists()) {
            return redirect()->route('wallets.index')->with('error', 'Dompet tidak bisa dihapus karena masih ada transaksi.');
        }

        $wallet->delete();

        return redirect()->route('wallets.index')->with('success', 'Dompet berhasil dihapus.');
    }
}
