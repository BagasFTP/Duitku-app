<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Transaction>
 */
class TransactionFactory extends Factory
{
    public function definition(): array
    {
        $user = User::factory()->create();

        return [
            'user_id'     => $user->id,
            'wallet_id'   => Wallet::factory()->state(['user_id' => $user->id]),
            'category_id' => Category::factory()->state(['user_id' => $user->id]),
            'amount'      => fake()->randomFloat(2, 1_000, 500_000),
            'type'        => fake()->randomElement(['income', 'expense']),
            'description' => fake()->optional()->sentence(),
            'date'        => fake()->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
            'is_recurring' => false,
            'recur_type'  => null,
        ];
    }

    public function income(): static
    {
        return $this->state(['type' => 'income']);
    }

    public function expense(): static
    {
        return $this->state(['type' => 'expense']);
    }
}
