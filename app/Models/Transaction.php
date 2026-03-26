<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $fillable = [
        'amount',
        'type',
        'description',
        'date',
        'category_id',
        'wallet_id',
        'is_recurring',
        'recur_type',
    ];

    protected function casts(): array
    {
        return [
            'amount'       => 'decimal:2',
            'date'         => 'date',
            'is_recurring' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}
