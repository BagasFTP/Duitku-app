<?php

namespace App\Http\Middleware;

use App\Models\Budget;
use App\Models\Category;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user(),
            ],
            'flash' => [
                'success'      => session('success'),
                'error'        => session('error'),
                'budget_alert' => session('budget_alert'),
            ],
            'budgetAlerts' => function () use ($request) {
                if (! $request->user()) {
                    return [];
                }

                $now    = Carbon::now();
                $month  = $now->month;
                $year   = $now->year;
                $userId = $request->user()->id;

                return Cache::remember("budget_alerts_{$userId}_{$year}_{$month}", 300, function () use ($userId, $month, $year) {
                    // Budget records bulan ini
                    $monthlyBudgets = Budget::where('user_id', $userId)
                        ->where('period_type', 'monthly')
                        ->where('month', $month)
                        ->where('year', $year)
                        ->pluck('amount', 'category_id');

                    // Fallback: budget record bulan sebelumnya per kategori
                    $fallbackBudgets = Budget::where('user_id', $userId)
                        ->where('period_type', 'monthly')
                        ->where(function ($q) use ($month, $year) {
                            $q->where('year', '<', $year)
                              ->orWhere(fn ($q2) => $q2->where('year', $year)->where('month', '<', $month));
                        })
                        ->orderBy('year', 'desc')
                        ->orderBy('month', 'desc')
                        ->get()
                        ->unique('category_id')
                        ->pluck('amount', 'category_id');

                    // Semua kategori expense user (termasuk category.budget sebagai fallback terakhir)
                    $categories = Category::where('user_id', $userId)
                        ->where('type', 'expense')
                        ->get()
                        ->keyBy('id');

                    // Tentukan limit efektif per kategori
                    $limits = [];
                    foreach ($categories as $catId => $category) {
                        $limit = (float) ($monthlyBudgets[$catId] ?? $fallbackBudgets[$catId] ?? $category->budget ?? 0);
                        if ($limit > 0) {
                            $limits[$catId] = $limit;
                        }
                    }

                    if (empty($limits)) {
                        return [];
                    }

                    $actuals = Transaction::where('user_id', $userId)
                        ->where('type', 'expense')
                        ->whereMonth('date', $month)
                        ->whereYear('date', $year)
                        ->whereIn('category_id', array_keys($limits))
                        ->selectRaw('category_id, SUM(amount) as total')
                        ->groupBy('category_id')
                        ->pluck('total', 'category_id');

                    $alerts = [];
                    foreach ($limits as $catId => $limit) {
                        $actual = (float) ($actuals[$catId] ?? 0);
                        $pct    = ($actual / $limit) * 100;

                        if ($pct >= 80) {
                            $category  = $categories[$catId];
                            $alerts[]  = [
                                'category_name'  => $category->name,
                                'category_icon'  => $category->icon,
                                'category_color' => $category->color,
                                'actual'         => $actual,
                                'limit'          => $limit,
                                'percentage'     => (int) round($pct),
                                'is_over'        => $pct >= 100,
                            ];
                        }
                    }

                    usort($alerts, fn($a, $b) => $b['percentage'] <=> $a['percentage']);

                    return $alerts;
                });
            },
        ];
    }
}
