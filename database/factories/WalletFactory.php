<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Wallet>
 */
class WalletFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name'    => fake()->words(2, true),
            'type'    => fake()->randomElement(['bank', 'cash', 'ewallet']),
            'balance' => fake()->randomFloat(2, 0, 10_000_000),
            'icon'    => '💳',
            'color'   => '#3b82f6',
        ];
    }
}
