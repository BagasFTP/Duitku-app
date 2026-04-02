<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavingsGoal extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'icon',
        'color',
        'target_amount',
        'current_amount',
        'deadline',
        'notes',
        'is_completed',
    ];

    protected $casts = [
        'deadline'       => 'date',
        'is_completed'   => 'boolean',
        'target_amount'  => 'decimal:2',
        'current_amount' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
