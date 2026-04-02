<?php

namespace App\Http\Controllers;

use App\Models\SavingsGoal;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SavingsGoalController extends Controller
{
    public function index(): Response
    {
        $goals = SavingsGoal::where('user_id', auth()->id())
            ->orderBy('is_completed')
            ->orderBy('created_at', 'desc')
            ->get();

        $wallets = Wallet::where('user_id', auth()->id())
            ->orderBy('name')
            ->get(['id', 'name', 'balance', 'icon', 'color']);

        return Inertia::render('SavingsGoals/Index', [
            'goals'   => $goals,
            'wallets' => $wallets,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'          => 'required|string|max:100',
            'icon'          => 'required|string|max:50',
            'color'         => 'required|string|max:20',
            'target_amount' => 'required|numeric|min:1',
            'deadline'      => 'nullable|date|after:today',
            'notes'         => 'nullable|string|max:500',
        ]);

        $validated['user_id'] = auth()->id();
        SavingsGoal::create($validated);

        return redirect()->route('savings.index')->with('success', 'Target tabungan berhasil dibuat.');
    }

    public function update(Request $request, SavingsGoal $saving): RedirectResponse
    {
        abort_if($saving->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'name'          => 'required|string|max:100',
            'icon'          => 'required|string|max:50',
            'color'         => 'required|string|max:20',
            'target_amount' => 'required|numeric|min:1',
            'deadline'      => 'nullable|date',
            'notes'         => 'nullable|string|max:500',
        ]);

        $saving->update($validated);

        // Auto-mark completed if current >= target
        if ((float) $saving->current_amount >= (float) $validated['target_amount']) {
            $saving->update(['is_completed' => true]);
        }

        return redirect()->route('savings.index')->with('success', 'Target tabungan berhasil diperbarui.');
    }

    public function contribute(Request $request, SavingsGoal $saving): RedirectResponse
    {
        abort_if($saving->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'amount'    => 'required|numeric|min:1',
            'wallet_id' => ['nullable', Rule::exists('wallets', 'id')->where('user_id', auth()->id())],
            'note'      => 'nullable|string|max:255',
        ]);

        $amount = (float) $validated['amount'];

        // Deduct from wallet if selected
        if (!empty($validated['wallet_id'])) {
            $wallet = Wallet::find($validated['wallet_id']);

            if ((float) $wallet->balance < $amount) {
                return back()->with('error', 'Saldo dompet tidak mencukupi.');
            }

            $wallet->decrement('balance', $amount);

            Transaction::create([
                'user_id'      => auth()->id(),
                'wallet_id'    => $wallet->id,
                'category_id'  => null,
                'amount'       => $amount,
                'type'         => 'adjustment',
                'description'  => 'Tabungan: ' . $saving->name . ($validated['note'] ? ' — ' . $validated['note'] : ''),
                'date'         => now()->toDateString(),
                'is_recurring' => false,
            ]);
        }

        $newAmount = (float) $saving->current_amount + $amount;
        $completed = $newAmount >= (float) $saving->target_amount;

        $saving->update([
            'current_amount' => $newAmount,
            'is_completed'   => $completed,
        ]);

        $msg = $completed
            ? 'Selamat! Target tabungan ' . $saving->name . ' tercapai!'
            : 'Kontribusi berhasil ditambahkan.';

        return redirect()->route('savings.index')->with('success', $msg);
    }

    public function destroy(SavingsGoal $saving): RedirectResponse
    {
        abort_if($saving->user_id !== auth()->id(), 403);

        $saving->delete();

        return redirect()->route('savings.index')->with('success', 'Target tabungan berhasil dihapus.');
    }
}
