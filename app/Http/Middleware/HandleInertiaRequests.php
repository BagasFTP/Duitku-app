<?php

namespace App\Http\Middleware;

use App\Models\Budget;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
                'success' => session('success'),
                'error'   => session('error'),
            ],
            'budgetAlerts' => function () use ($request) {
                if (! $request->user()) {
                    return [];
                }

                $now   = Carbon::now();
                $month = $now->month;
                $year  = $now->year;

                $budgets = Budget::with('category')
                    ->where('month', $month)
                    ->where('year', $year)
                    ->where('amount', '>', 0)
                    ->get();

                if ($budgets->isEmpty()) {
                    return [];
                }

                $actuals = Transaction::where('type', 'expense')
                    ->whereMonth('date', $month)
                    ->whereYear('date', $year)
                    ->whereNotNull('category_id')
                    ->selectRaw('category_id, SUM(amount) as total')
                    ->groupBy('category_id')
                    ->pluck('total', 'category_id');

                $alerts = [];
                foreach ($budgets as $budget) {
                    $actual = (float) ($actuals[$budget->category_id] ?? 0);
                    $limit  = (float) $budget->amount;
                    $pct    = $limit > 0 ? ($actual / $limit) * 100 : 0;

                    if ($pct >= 80) {
                        $alerts[] = [
                            'category_name'  => $budget->category->name,
                            'category_icon'  => $budget->category->icon,
                            'category_color' => $budget->category->color,
                            'actual'         => $actual,
                            'limit'          => $limit,
                            'percentage'     => (int) round($pct),
                            'is_over'        => $pct >= 100,
                        ];
                    }
                }

                // Sort: exceeded first, then by percentage desc
                usort($alerts, fn($a, $b) => $b['percentage'] <=> $a['percentage']);

                return $alerts;
            },
        ];
    }
}
