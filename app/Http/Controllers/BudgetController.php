<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
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
            return $this->weeklyPace($request, $year, $categories);
        }

        return $this->monthlyBudget($request, $year, $categories);
    }

    private function weeklyPace(Request $request, int $year, $categories): Response
    {
        $week = $request->integer('week', Carbon::now()->isoWeek());

        $weekStart = Carbon::now()->setISODate($year, $week)->startOfDay();
        $weekEnd   = $weekStart->copy()->endOfWeek()->endOfDay();

        // Kamis dari minggu ini menentukan bulan yang "dominan" (konvensi ISO week)
        $thursday    = $weekStart->copy()->addDays(3);
        $checkMonth  = $thursday->month;
        $checkYear   = $thursday->year;
        $daysInMonth = Carbon::createFromDate($checkYear, $checkMonth, 1)->daysInMonth;

        // Budget bulanan bulan yang mengandung minggu ini
        $monthlyBudgets = Budget::where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where('year', $checkYear)
            ->where('month', $checkMonth)
            ->pluck('amount', 'category_id');

        // Fallback: budget bulanan bulan sebelumnya
        $fallbackBudgets = Budget::where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where(function ($q) use ($checkMonth, $checkYear) {
                $q->where('year', '<', $checkYear)
                  ->orWhere(fn ($q2) => $q2->where('year', $checkYear)->where('month', '<', $checkMonth));
            })
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get()
            ->unique('category_id')
            ->pluck('amount', 'category_id');

        // Pengeluaran aktual minggu ini
        $actuals = Transaction::where('user_id', auth()->id())
            ->where('type', 'expense')
            ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $paceData = $categories->map(function ($category) use ($monthlyBudgets, $fallbackBudgets, $actuals, $daysInMonth) {
            $monthlyLimit = (float) ($monthlyBudgets[$category->id]
                ?? $fallbackBudgets[$category->id]
                ?? $category->budget
                ?? 0);
            $actual = (float) ($actuals->get($category->id, 0));

            // Lewati kategori tanpa budget & tanpa pengeluaran minggu ini
            if ($monthlyLimit === 0.0 && $actual === 0.0) {
                return null;
            }

            // Budget ideal seminggu = budget bulanan × (7 hari / hari dalam bulan)
            $idealWeekly = $monthlyLimit > 0
                ? round($monthlyLimit * 7 / $daysInMonth)
                : 0;

            $ratio = $idealWeekly > 0 ? $actual / $idealWeekly : ($actual > 0 ? PHP_FLOAT_MAX : 0);

            return [
                'category'      => $category,
                'actual'        => $actual,
                'monthly_limit' => $monthlyLimit,
                'ideal_weekly'  => $idealWeekly,
                'ratio'         => $ratio,
            ];
        })->filter()->values();

        return Inertia::render('Budget/Index', [
            'paceData'   => $paceData,
            'budgetData' => null,
            'period'     => 'weekly',
            'week'       => $week,
            'year'       => $year,
            'weekStart'  => $weekStart->toDateString(),
            'weekEnd'    => $weekEnd->toDateString(),
            'month'      => null,
        ]);
    }

    private function monthlyBudget(Request $request, int $year, $categories): Response
    {
        $month = $request->integer('month', Carbon::now()->month);

        $prevDate  = Carbon::createFromDate($year, $month, 1)->subMonth();
        $prevMonth = $prevDate->month;
        $prevYear  = $prevDate->year;

        $budgets = Budget::where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where('month', $month)
            ->where('year', $year)
            ->get()
            ->keyBy('category_id');

        $prevBudgets = Budget::where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where('month', $prevMonth)
            ->where('year', $prevYear)
            ->get()
            ->keyBy('category_id');

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

        $prevActuals = Transaction::where('user_id', auth()->id())
            ->where('type', 'expense')
            ->whereMonth('date', $prevMonth)
            ->whereYear('date', $prevYear)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $budgetData = $categories->map(function ($category) use ($budgets, $fallbacks, $actuals, $prevBudgets, $prevActuals) {
            $budget   = $budgets->get($category->id);
            $fallback = $fallbacks->get($category->id);
            $limit    = (float) ($budget?->amount ?? $fallback?->amount ?? $category->budget ?? 0);
            $actual   = (float) $actuals->get($category->id, 0);

            $rolloverAmount = 0.0;
            $prevBudget = $prevBudgets->get($category->id);
            if ($prevBudget?->rollover_enabled) {
                $prevRemaining = (float) $prevBudget->amount - (float) ($prevActuals->get($category->id, 0));
                $rolloverAmount = max(0.0, $prevRemaining);
            }

            $effectiveLimit = $limit + $rolloverAmount;

            return [
                'category'         => $category,
                'budget_id'        => $budget?->id,
                'limit'            => $limit,
                'actual'           => $actual,
                'remaining'        => $effectiveLimit - $actual,
                'percentage'       => $effectiveLimit > 0 ? round(($actual / $effectiveLimit) * 100) : 0,
                'is_fallback'      => $budget === null && ($fallback !== null || $category->budget > 0),
                'rollover_amount'  => $rolloverAmount,
                'rollover_enabled' => (bool) ($budget?->rollover_enabled ?? false),
                'effective_limit'  => $effectiveLimit,
            ];
        });

        return Inertia::render('Budget/Index', [
            'paceData'   => null,
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
            'budgets'                    => 'required|array',
            'budgets.*.category_id'      => ['required', Rule::exists('categories', 'id')->where('user_id', auth()->id())],
            'budgets.*.amount'           => 'required|numeric|min:0',
            'budgets.*.rollover_enabled' => 'sometimes|boolean',
            'month'                      => 'required|integer|min:1|max:12',
            'year'                       => 'required|integer|min:2000',
        ]);

        $year  = $validated['year'];
        $month = $validated['month'];

        foreach ($validated['budgets'] as $item) {
            if ((float) $item['amount'] === 0.0) {
                // Hapus budget jika amount di-set ke 0
                Budget::where('user_id', auth()->id())
                    ->where('category_id', $item['category_id'])
                    ->where('period_type', 'monthly')
                    ->where('year', $year)
                    ->where('month', $month)
                    ->delete();
            } else {
                Budget::updateOrCreate(
                    [
                        'user_id'     => auth()->id(),
                        'category_id' => $item['category_id'],
                        'period_type' => 'monthly',
                        'year'        => $year,
                        'month'       => $month,
                        'week'        => null,
                    ],
                    [
                        'amount'           => $item['amount'],
                        'rollover_enabled' => $item['rollover_enabled'] ?? false,
                    ]
                );
            }
        }

        Cache::forget('budget_alerts_' . auth()->id() . "_{$year}_{$month}");

        return redirect()->route('budget.index', ['period' => 'monthly', 'month' => $month, 'year' => $year])
            ->with('success', 'Budget berhasil disimpan.');
    }
}
