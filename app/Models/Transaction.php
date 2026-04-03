<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'type',
        'description',
        'date',
        'category_id',
        'wallet_id',
        'is_recurring',
        'recur_type',
        'next_occurrence_at',
        'last_executed_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'             => 'decimal:2',
            'date'               => 'date',
            'is_recurring'       => 'boolean',
            'next_occurrence_at' => 'date',
            'last_executed_at'   => 'date',
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

    public function calculateNextOccurrence(Carbon $from = null): Carbon
    {
        $base = $from ?? Carbon::parse($this->date);

        return match ($this->recur_type) {
            'daily'   => $base->copy()->addDay(),
            'weekly'  => $base->copy()->addWeek(),
            'monthly' => $base->copy()->addMonth(),
            default   => $base->copy()->addMonth(),
        };
    }

    public function cloneForRecurring(): self
    {
        $next = $this->next_occurrence_at ?? $this->calculateNextOccurrence();

        return new self([
            'amount'             => $this->amount,
            'type'               => $this->type,
            'description'        => $this->description,
            'date'               => $next->toDateString(),
            'category_id'        => $this->category_id,
            'wallet_id'          => $this->wallet_id,
            'is_recurring'       => true,
            'recur_type'         => $this->recur_type,
            'next_occurrence_at' => $this->calculateNextOccurrence($next)->toDateString(),
            'last_executed_at'   => $next->toDateString(),
        ]);
    }

    public function scopeRecurringDue($query)
    {
        return $query
            ->where('is_recurring', true)
            ->whereNotNull('next_occurrence_at')
            ->whereDate('next_occurrence_at', '<=', Carbon::today());
    }
}
