<?php

namespace App\Observers;

use App\Models\Transaction;
use App\Models\TransactionLog;

class TransactionObserver
{
    /**
     * Fields considered meaningful for audit purposes.
     * Internal fields (next_occurrence_at, last_executed_at) are excluded
     * from update diffs because they change automatically on recurring runs.
     */
    private array $auditFields = [
        'amount',
        'type',
        'description',
        'date',
        'category_id',
        'wallet_id',
        'is_recurring',
        'recur_type',
    ];

    public function created(Transaction $transaction): void
    {
        TransactionLog::create([
            'transaction_id' => $transaction->id,
            'user_id'        => auth()->id() ?? $transaction->user_id,
            'action'         => 'created',
            'old_values'     => null,
            'new_values'     => $this->pick($transaction->attributesToArray()),
            'ip_address'     => request()?->ip(),
            'user_agent'     => request()?->userAgent(),
        ]);
    }

    public function updated(Transaction $transaction): void
    {
        // getChanges() returns the new values of attributes that actually changed.
        // getOriginal() still holds the pre-update values here because
        // syncOriginal() runs in save() AFTER the 'updated' event fires.
        $changed = array_intersect_key(
            $transaction->getChanges(),
            array_flip($this->auditFields)
        );

        if (empty($changed)) {
            return;
        }

        $oldValues = [];
        foreach (array_keys($changed) as $field) {
            $oldValues[$field] = $transaction->getOriginal($field);
        }

        TransactionLog::create([
            'transaction_id' => $transaction->id,
            'user_id'        => auth()->id() ?? $transaction->user_id,
            'action'         => 'updated',
            'old_values'     => $oldValues,
            'new_values'     => $changed,
            'ip_address'     => request()?->ip(),
            'user_agent'     => request()?->userAgent(),
        ]);
    }

    public function deleted(Transaction $transaction): void
    {
        TransactionLog::create([
            'transaction_id' => $transaction->id,
            'user_id'        => auth()->id() ?? $transaction->user_id,
            'action'         => 'deleted',
            'old_values'     => $this->pick($transaction->attributesToArray()),
            'new_values'     => null,
            'ip_address'     => request()?->ip(),
            'user_agent'     => request()?->userAgent(),
        ]);
    }

    private function pick(array $attributes): array
    {
        return array_intersect_key($attributes, array_flip($this->auditFields));
    }
}
