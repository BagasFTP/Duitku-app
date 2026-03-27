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
        $period = $request->input('period', 'monthly');
        $year   = $request->integer('year', Carbon::now()->year);

        $categories = Category::where('type', 'expense')->orderBy('name')->get();

        if ($period === 'weekly') {
            $week = $request->integer('week', Carbon::now()->isoWeek());

            $weekStart = Carbon::now()->setISODate($year, $week)->startOfDay();
            $weekEnd   = $weekStart->copy()->endOfWeek()->endOfDay();

            // Budgets set for this exact week
            $budgets = Budget::where('period_type', 'weekly')
                ->where('week', $week)
                ->where('year', $year)
                ->get()
                ->keyBy('category_id');

            // Most recent weekly budget per category (for fallback)
            $fallbacks = Budget::where('period_type', 'weekly')
                ->where(function ($q) use ($week, $year) {
                    $q->where('year', '<', $year)
                      ->orWhere(fn ($q2) => $q2->where('year', $year)->where('week', '<', $week));
                })
                ->orderBy('year', 'desc')
                ->orderBy('week', 'desc')
                ->get()
                ->unique('category_id')
                ->keyBy('category_id');

            $actuals = Transaction::where('type', 'expense')
                ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                ->selectRaw('category_id, SUM(amount) as total')
                ->groupBy('category_id')
                ->pluck('total', 'category_id');

            $budgetData = $categories->map(function ($category) use ($budgets, $fallbacks, $actuals) {
                $budget   = $budgets->get($category->id);
                $fallback = $fallbacks->get($category->id);
                $limit    = $budget?->amount ?? $fallback?->amount ?? 0;
                $actual   = $actuals->get($category->id, 0);

                return [
                    'category'    => $category,
                    'budget_id'   => $budget?->id,
                    'limit'       => $limit,
                    'actual'      => $actual,
                    'remaining'   => $limit - $actual,
                    'percentage'  => $limit > 0 ? round(($actual / $limit) * 100) : 0,
                    'is_fallback' => $budget === null && $fallback !== null,
                ];
            });

            return Inertia::render('Budget/Index', [
                'budgetData' => $budgetData,
                'period'     => 'weekly',
                'week'       => $week,
                'year'       => $year,
                'weekStart'  => $weekStart->toDateString(),
                'weekEnd'    => $weekEnd->toDateString(),
                'month'      => null,
            ]);
        }

        // Monthly
        $month = $request->integer('month', Carbon::now()->month);

        // Budgets set for this exact month
        $budgets = Budget::where('period_type', 'monthly')
            ->where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('category_id');

        // Most recent monthly budget per category (for fallback)
        $fallbacks = Budget::where('period_type', 'monthly')
            ->where(function ($q) use ($month, $year) {
                $q->where('year', '<', $year)
                  ->orWhere(fn ($q2) => $q2->where('year', $year)->where('month', '<', $month));
            })
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get()
            ->unique('category_id')
            ->keyBy('category_id');

        $actuals = Transaction::where('type', 'expense')
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $budgetData = $categories->map(function ($category) use ($budgets, $fallbacks, $actuals) {
            $budget   = $budgets->get($category->id);
            $fallback = $fallbacks->get($category->id);
            // Priority: this month's record → previous month's record → category default
            $limit    = $budget?->amount ?? $fallback?->amount ?? $category->budget ?? 0;
            $actual   = $actuals->get($category->id, 0);

            return [
                'category'    => $category,
                'budget_id'   => $budget?->id,
                'limit'       => $limit,
                'actual'      => $actual,
                'remaining'   => $limit - $actual,
                'percentage'  => $limit > 0 ? round(($actual / $limit) * 100) : 0,
                'is_fallback' => $budget === null && ($fallback !== null || $category->budget > 0),
            ];
        });

        return Inertia::render('Budget/Index', [
            'budgetData' => $budgetData,
            'period'     => 'monthly',
            'month'      => $month,
            'year'       => $year,
            'week'       => null,
            'weekStart'  => null,
            'weekEnd'    => null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'budgets'               => 'required|array',
            'budgets.*.category_id' => 'required|exists:categories,id',
            'budgets.*.amount'      => 'required|numeric|min:0',
            'period'                => 'required|in:monthly,weekly',
            'month'                 => 'nullable|integer|min:1|max:12',
            'week'                  => 'nullable|integer|min:1|max:53',
            'year'                  => 'required|integer|min:2000',
        ]);

        $period = $validated['period'];
        $year   = $validated['year'];
        $month  = $validated['month'] ?? null;
        $week   = $validated['week'] ?? null;

        foreach ($validated['budgets'] as $item) {
            Budget::updateOrCreate(
                [
                    'category_id' => $item['category_id'],
                    'period_type' => $period,
                    'year'        => $year,
                    'month'       => $month,
                    'week'        => $week,
                ],
                ['amount' => $item['amount']]
            );
        }

        $redirect = ['period' => $period, 'year' => $year];
        if ($period === 'monthly') $redirect['month'] = $month;
        if ($period === 'weekly')  $redirect['week']  = $week;

        return redirect()->route('budget.index', $redirect)
            ->with('success', 'Budget berhasil disimpan.');
    }
}
