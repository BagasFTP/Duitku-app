<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Wallet;
use App\Services\TransactionService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function __construct(private TransactionService $txService) {}

    public function index(Request $request): Response
    {
        $query = Transaction::with(['category', 'wallet'])
            ->where('user_id', auth()->id())
            ->latest('date');

        if ($request->filled('month') && $request->filled('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        }

        if ($request->filled('type'))        $query->where('type', $request->type);
        if ($request->filled('category_id')) $query->where('category_id', $request->category_id);
        if ($request->filled('wallet_id'))   $query->where('wallet_id', $request->wallet_id);

        $userId = auth()->id();

        return Inertia::render('Transactions/Index', [
            'transactions' => $query->paginate(20)->withQueryString(),
            'categories'   => $this->txService->getCategoriesByUser($userId),
            'wallets'      => $this->txService->getWalletsByUser($userId),
            'filters'      => $request->only(['month', 'year', 'type', 'category_id', 'wallet_id']),
        ]);
    }

    public function create(): Response
    {
        $userId = auth()->id();

        return Inertia::render('Transactions/Create', [
            'categories' => $this->txService->getCategoriesByUser($userId),
            'wallets'    => $this->txService->getWalletsByUser($userId),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'amount'       => 'required|numeric|min:0',
            'type'         => 'required|in:income,expense',
            'description'  => 'nullable|string|max:255',
            'date'         => 'required|date',
            'category_id'  => ['required', Rule::exists('categories', 'id')->where('user_id', auth()->id())],
            'wallet_id'    => ['required', Rule::exists('wallets', 'id')->where('user_id', auth()->id())],
            'is_recurring' => 'boolean',
            'recur_type'   => 'nullable|in:daily,weekly,monthly|required_if:is_recurring,true',
        ]);

        $validated['user_id'] = auth()->id();
        $transaction = $this->txService->createWithBalance($validated);

        $budgetAlert = $this->txService->checkBudgetAlert($transaction->category_id, $transaction->date, auth()->id());
        $this->txService->forgetBudgetAlertCache(auth()->id(), Carbon::parse($transaction->date));

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil ditambahkan.')
            ->with('budget_alert', $budgetAlert);
    }

    public function edit(Transaction $transaction): Response
    {
        abort_if($transaction->user_id !== auth()->id(), 403);

        $userId = auth()->id();

        return Inertia::render('Transactions/Edit', [
            'transaction' => $transaction->load(['category', 'wallet']),
            'categories'  => $this->txService->getCategoriesByUser($userId),
            'wallets'     => $this->txService->getWalletsByUser($userId),
        ]);
    }

    public function update(Request $request, Transaction $transaction): RedirectResponse
    {
        abort_if($transaction->user_id !== auth()->id(), 403);

        $validated = $request->validate([
            'amount'       => 'required|numeric|min:0',
            'type'         => 'required|in:income,expense',
            'description'  => 'nullable|string|max:255',
            'date'         => 'required|date',
            'category_id'  => ['required', Rule::exists('categories', 'id')->where('user_id', auth()->id())],
            'wallet_id'    => ['required', Rule::exists('wallets', 'id')->where('user_id', auth()->id())],
            'is_recurring' => 'boolean',
            'recur_type'   => 'nullable|in:daily,weekly,monthly|required_if:is_recurring,true',
        ]);

        $validated = $this->txService->prepareRecurring($validated);

        // Revert saldo wallet lama, lalu terapkan saldo wallet baru
        $this->txService->revertBalance($transaction->wallet, $transaction->type, (float) $transaction->amount);

        $transaction->update($validated);

        $newWallet = Wallet::find($validated['wallet_id']);
        $this->txService->applyBalance($newWallet, $validated['type'], (float) $validated['amount']);

        $budgetAlert = $this->txService->checkBudgetAlert($validated['category_id'], $validated['date'], auth()->id());
        $this->txService->forgetBudgetAlertCache(auth()->id(), Carbon::parse($validated['date']));

        return redirect()->route('transactions.index')
            ->with('success', 'Transaksi berhasil diperbarui.')
            ->with('budget_alert', $budgetAlert);
    }

    public function export(Request $request): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        $query = Transaction::with(['category', 'wallet'])
            ->where('user_id', auth()->id())
            ->latest('date');

        if ($request->filled('month') && $request->filled('year')) {
            $query->whereMonth('date', $request->month)
                  ->whereYear('date', $request->year);
        }
        if ($request->filled('type'))        $query->where('type', $request->type);
        if ($request->filled('category_id')) $query->where('category_id', $request->category_id);
        if ($request->filled('wallet_id'))   $query->where('wallet_id', $request->wallet_id);

        $transactions = $query->get();

        $filename = 'transaksi-' . ($request->filled('month') && $request->filled('year')
            ? Carbon::createFromDate($request->year, $request->month, 1)->format('Y-m')
            : 'semua') . '.csv';

        $headers = [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        return response()->stream(function () use ($transactions) {
            $out = fopen('php://output', 'w');
            // BOM agar Excel baca UTF-8 dengan benar
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Jumlah', 'Keterangan'], ';');

            foreach ($transactions as $t) {
                fputcsv($out, [
                    $t->date,
                    $t->type,
                    $t->category?->name ?? '-',
                    $t->wallet?->name   ?? '-',
                    number_format($t->amount, 2, ',', '.'),
                    $t->description ?? '',
                ], ';');
            }

            fclose($out);
        }, 200, $headers);
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
            'items.*.category_id'  => ['required', Rule::exists('categories', 'id')->where('user_id', auth()->id())],
            'items.*.wallet_id'    => ['required', Rule::exists('wallets', 'id')->where('user_id', auth()->id())],
            'items.*.is_recurring' => 'boolean',
            'items.*.recur_type'   => 'nullable|in:daily,weekly,monthly',
        ]);

        $results = [];

        foreach ($validated['items'] as $item) {
            try {
                $item['user_id'] = auth()->id();
                $this->txService->createWithBalance($item);

                $results[] = ['tempId' => $item['tempId'], 'success' => true];
            } catch (\Exception $e) {
                $results[] = ['tempId' => $item['tempId'], 'success' => false, 'error' => $e->getMessage()];
            }
        }

        return response()->json(['results' => $results]);
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        abort_if($transaction->user_id !== auth()->id(), 403);

        // Adjustment records don't have an invertible delta — skip balance revert
        if ($transaction->type !== 'adjustment') {
            $this->txService->revertBalance($transaction->wallet, $transaction->type, (float) $transaction->amount);
        }

        $this->txService->forgetBudgetAlertCache(auth()->id(), Carbon::parse($transaction->date));

        $transaction->delete();

        return redirect()->route('transactions.index')->with('success', 'Transaksi berhasil dihapus.');
    }
}
