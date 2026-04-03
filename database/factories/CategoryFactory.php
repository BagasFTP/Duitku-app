<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<\App\Models\Category>
 */
class CategoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'    => User::factory(),
            'name'       => fake()->word(),
            'icon'       => '🏷️',
            'color'      => '#6366f1',
            'type'       => fake()->randomElement(['income', 'expense']),
            'budget'     => null,
            'is_default' => false,
        ];
    }

    public function expense(): static
    {
        return $this->state(['type' => 'expense']);
    }

    public function income(): static
    {
        return $this->state(['type' => 'income']);
    }
}
