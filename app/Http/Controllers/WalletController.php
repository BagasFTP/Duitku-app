<?php

namespace App\Http\Controllers;

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
            'wallets' => Wallet::withCount('transactions')->orderBy('name')->get(),
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
            'icon'    => 'required|string|max:10',
            'color'   => 'required|string|max:20',
        ]);

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

    public function destroy(Wallet $wallet): RedirectResponse
    {
        if ($wallet->transactions()->exists()) {
            return redirect()->route('wallets.index')->with('error', 'Dompet tidak bisa dihapus karena masih ada transaksi.');
        }

        $wallet->delete();

        return redirect()->route('wallets.index')->with('success', 'Dompet berhasil dihapus.');
    }
}
