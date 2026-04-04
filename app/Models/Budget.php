<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Budget extends Model
{
    protected $fillable = [
        'user_id',
        'category_id',
        'amount',
        'rollover_enabled',
        'period_type',
        'month',
        'week',
        'year',
    ];

    protected function casts(): array
    {
        return [
            'amount'           => 'decimal:2',
            'rollover_enabled' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }
}
