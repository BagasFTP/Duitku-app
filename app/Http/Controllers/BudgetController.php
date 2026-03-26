<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function index(Request $request): Response
    {
        $month = $request->integer('month', Carbon::now()->month);
        $year  = $request->integer('year', Carbon::now()->year);

        $categories = Category::where('type', 'expense')->orderBy('name')->get();

        $budgets = Budget::with('category')
            ->where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('category_id');

        // Hitung pengeluaran aktual per kategori bulan ini
        $actuals = Transaction::where('type', 'expense')
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $budgetData = $categories->map(function ($category) use ($budgets, $actuals) {
            $budget = $budgets->get($category->id);
            $limit  = $budget?->amount ?? $category->budget ?? 0;
            $actual = $actuals->get($category->id, 0);

            return [
                'category'   => $category,
                'budget_id'  => $budget?->id,
                'limit'      => $limit,
                'actual'     => $actual,
                'remaining'  => $limit - $actual,
                'percentage' => $limit > 0 ? round(($actual / $limit) * 100) : 0,
            ];
        });

        return Inertia::render('Budget/Index', [
            'budgetData' => $budgetData,
            'month'      => $month,
            'year'       => $year,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'budgets'              => 'required|array',
            'budgets.*.category_id' => 'required|exists:categories,id',
            'budgets.*.amount'     => 'required|numeric|min:0',
            'month'                => 'required|integer|min:1|max:12',
            'year'                 => 'required|integer|min:2000',
        ]);

        foreach ($validated['budgets'] as $item) {
            Budget::updateOrCreate(
                [
                    'category_id' => $item['category_id'],
                    'month'       => $validated['month'],
                    'year'        => $validated['year'],
                ],
                ['amount' => $item['amount']]
            );
        }

        return redirect()->route('budget.index', [
            'month' => $validated['month'],
            'year'  => $validated['year'],
        ])->with('success', 'Budget berhasil disimpan.');
    }
}
