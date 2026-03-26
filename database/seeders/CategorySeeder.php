<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            // ── INCOME ──────────────────────────────────────────
            [
                'name'       => 'Gaji',
                'icon'       => 'briefcase',
                'color'      => '#22c55e',
                'type'       => 'income',
                'budget'     => null,
                'is_default' => true,
            ],
            [
                'name'       => 'Freelance',
                'icon'       => 'laptop',
                'color'      => '#16a34a',
                'type'       => 'income',
                'budget'     => null,
                'is_default' => true,
            ],
            [
                'name'       => 'Investasi',
                'icon'       => 'trending-up',
                'color'      => '#15803d',
                'type'       => 'income',
                'budget'     => null,
                'is_default' => true,
            ],
            [
                'name'       => 'Bonus',
                'icon'       => 'gift',
                'color'      => '#4ade80',
                'type'       => 'income',
                'budget'     => null,
                'is_default' => true,
            ],
            [
                'name'       => 'Lainnya',
                'icon'       => 'circle-plus',
                'color'      => '#86efac',
                'type'       => 'income',
                'budget'     => null,
                'is_default' => true,
            ],

            // ── EXPENSE ─────────────────────────────────────────
            [
                'name'       => 'Makanan & Minuman',
                'icon'       => 'utensils',
                'color'      => '#f97316',
                'type'       => 'expense',
                'budget'     => 1500000,
                'is_default' => true,
            ],
            [
                'name'       => 'Transportasi',
                'icon'       => 'car',
                'color'      => '#3b82f6',
                'type'       => 'expense',
                'budget'     => 500000,
                'is_default' => true,
            ],
            [
                'name'       => 'Belanja',
                'icon'       => 'shopping-bag',
                'color'      => '#ec4899',
                'type'       => 'expense',
                'budget'     => 800000,
                'is_default' => true,
            ],
            [
                'name'       => 'Tagihan & Utilitas',
                'icon'       => 'zap',
                'color'      => '#eab308',
                'type'       => 'expense',
                'budget'     => 600000,
                'is_default' => true,
            ],
            [
                'name'       => 'Kesehatan',
                'icon'       => 'heart-pulse',
                'color'      => '#ef4444',
                'type'       => 'expense',
                'budget'     => 300000,
                'is_default' => true,
            ],
            [
                'name'       => 'Hiburan',
                'icon'       => 'tv',
                'color'      => '#a855f7',
                'type'       => 'expense',
                'budget'     => 400000,
                'is_default' => true,
            ],
            [
                'name'       => 'Pendidikan',
                'icon'       => 'book-open',
                'color'      => '#06b6d4',
                'type'       => 'expense',
                'budget'     => 500000,
                'is_default' => true,
            ],
            [
                'name'       => 'Rumah',
                'icon'       => 'home',
                'color'      => '#64748b',
                'type'       => 'expense',
                'budget'     => 2000000,
                'is_default' => true,
            ],
            [
                'name'       => 'Tabungan',
                'icon'       => 'piggy-bank',
                'color'      => '#14b8a6',
                'type'       => 'expense',
                'budget'     => 1000000,
                'is_default' => true,
            ],
            [
                'name'       => 'Lainnya',
                'icon'       => 'package',
                'color'      => '#94a3b8',
                'type'       => 'expense',
                'budget'     => null,
                'is_default' => true,
            ],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }
    }
}
