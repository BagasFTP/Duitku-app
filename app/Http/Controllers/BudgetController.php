<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function index(Request $request): Response
    {
        $period = $request->input('period', 'monthly');
        $year   = $request->integer('year', Carbon::now()->year);

        $categories = Category::where('user_id', auth()->id())->where('type', 'expense')->orderBy('name')->get();

        if ($period === 'weekly') {
            $week = $request->integer('week', Carbon::now()->isoWeek());

            $weekStart = Carbon::now()->setISODate($year, $week)->startOfDay();
            $weekEnd   = $weekStart->copy()->endOfWeek()->endOfDay();

            // Budgets set for this exact week
            $budgets = Budget::where('user_id', auth()->id())
                ->where('period_type', 'weekly')
                ->where('week', $week)
                ->where('year', $year)
                ->get()
                ->keyBy('category_id');

            // Most recent weekly budget per category (for fallback)
            $fallbacks = Budget::where('user_id', auth()->id())
                ->where('period_type', 'weekly')
                ->where(function ($q) use ($week, $year) {
                    $q->where('year', '<', $year)
                      ->orWhere(fn ($q2) => $q2->where('year', $year)->where('week', '<', $week));
                })
                ->orderBy('year', 'desc')
                ->orderBy('week', 'desc')
                ->get()
                ->unique('category_id')
                ->keyBy('category_id');

            $actuals = Transaction::where('user_id', auth()->id())
                ->where('type', 'expense')
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

            // Anggaran bulanan pada bulan yang mengandung awal minggu ini (untuk referensi & validasi)
            $checkMonth    = $weekStart->month;
            $checkYear     = $weekStart->year;
            $monthlyLimits = Budget::where('user_id', auth()->id())
                ->where('period_type', 'monthly')
                ->where('year', $checkYear)
                ->where('month', $checkMonth)
                ->pluck('amount', 'category_id')
                ->map(fn ($v) => (float) $v);

            // Fallback ke category.budget jika tidak ada budget record bulanan
            foreach ($categories as $cat) {
                if (! isset($monthlyLimits[$cat->id]) && $cat->budget > 0) {
                    $monthlyLimits[$cat->id] = (float) $cat->budget;
                }
            }

            return Inertia::render('Budget/Index', [
                'budgetData'    => $budgetData,
                'period'        => 'weekly',
                'week'          => $week,
                'year'          => $year,
                'weekStart'     => $weekStart->toDateString(),
                'weekEnd'       => $weekEnd->toDateString(),
                'month'         => null,
                'monthlyLimits' => $monthlyLimits,
            ]);
        }

        // Monthly
        $month = $request->integer('month', Carbon::now()->month);

        // Budgets set for this exact month
        $budgets = Budget::where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('category_id');

        // Most recent monthly budget per category (for fallback)
        $fallbacks = Budget::where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where(function ($q) use ($month, $year) {
                $q->where('year', '<', $year)
                  ->orWhere(fn ($q2) => $q2->where('year', $year)->where('month', '<', $month));
            })
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get()
            ->unique('category_id')
            ->keyBy('category_id');

        $actuals = Transaction::where('user_id', auth()->id())
            ->where('type', 'expense')
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
            'budgetData'    => $budgetData,
            'period'        => 'monthly',
            'month'         => $month,
            'year'          => $year,
            'week'          => null,
            'weekStart'     => null,
            'weekEnd'       => null,
            'monthlyLimits' => null,
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

        // Validasi: anggaran mingguan tidak boleh melebihi anggaran bulanan
        if ($period === 'weekly' && $week) {
            $weekStart  = Carbon::now()->setISODate($year, $week)->startOfDay();
            $checkMonth = $weekStart->month;
            $checkYear  = $weekStart->year;

            $categoryIds    = collect($validated['budgets'])->pluck('category_id')->toArray();
            $monthlyBudgets = Budget::where('user_id', auth()->id())
                ->where('period_type', 'monthly')
                ->where('year', $checkYear)
                ->where('month', $checkMonth)
                ->whereIn('category_id', $categoryIds)
                ->pluck('amount', 'category_id');

            // Fallback ke category.budget jika tidak ada budget record bulanan
            $categoryBudgets = Category::whereIn('id', $categoryIds)
                ->where('user_id', auth()->id())
                ->pluck('budget', 'id');

            foreach ($validated['budgets'] as $item) {
                $catId        = $item['category_id'];
                $weeklyAmount = (float) $item['amount'];
                $monthlyLimit = (float) ($monthlyBudgets[$catId] ?? $categoryBudgets[$catId] ?? 0);

                if ($monthlyLimit > 0 && $weeklyAmount > $monthlyLimit) {
                    $fmt = fn ($v) => 'Rp ' . number_format($v, 0, ',', '.');
                    return redirect()->back()
                        ->withInput()
                        ->with('error', "Anggaran mingguan ({$fmt($weeklyAmount)}) tidak boleh melebihi anggaran bulanan ({$fmt($monthlyLimit)}) untuk salah satu kategori.");
                }
            }
        }

        foreach ($validated['budgets'] as $item) {
            Budget::updateOrCreate(
                [
                    'user_id'     => auth()->id(),
                    'category_id' => $item['category_id'],
                    'period_type' => $period,
                    'year'        => $year,
                    'month'       => $month,
                    'week'        => $week,
                ],
                ['amount' => $item['amount']]
            );
        }

        if ($period === 'monthly' && $month) {
            Cache::forget('budget_alerts_' . auth()->id() . "_{$year}_{$month}");
        }

        $redirect = ['period' => $period, 'year' => $year];
        if ($period === 'monthly') $redirect['month'] = $month;
        if ($period === 'weekly')  $redirect['week']  = $week;

        return redirect()->route('budget.index', $redirect)
            ->with('success', 'Budget berhasil disimpan.');
    }
}
