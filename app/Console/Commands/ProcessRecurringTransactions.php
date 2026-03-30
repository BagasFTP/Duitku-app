<?php

namespace App\Console\Commands;

use App\Models\Transaction;
use Illuminate\Console\Command;

class ProcessRecurringTransactions extends Command
{
    protected $signature   = 'transactions:process-recurring';
    protected $description = 'Buat transaksi baru dari recurring transactions yang sudah jatuh tempo';

    public function handle(): void
    {
        $due = Transaction::recurringDue()->with('wallet')->get();

        if ($due->isEmpty()) {
            $this->info('Tidak ada transaksi recurring yang jatuh tempo.');
            return;
        }

        $count = 0;

        foreach ($due as $recurring) {
            $clone = $recurring->cloneForRecurring();
            $clone->save();

            // Update saldo wallet
            $wallet = $recurring->wallet;
            if ($clone->type === 'income') {
                $wallet->increment('balance', $clone->amount);
            } else {
                $wallet->decrement('balance', $clone->amount);
            }

            // Update next_occurrence_at & last_executed_at di transaksi induk
            $recurring->update([
                'next_occurrence_at' => $clone->next_occurrence_at,
                'last_executed_at'   => $clone->date,
            ]);

            $count++;
            $this->line("  Dibuat: [{$clone->type}] {$clone->description} - Rp " . number_format($clone->amount, 0, ',', '.') . " ({$clone->date->toDateString()})");
        }

        $this->info("Selesai: {$count} transaksi recurring diproses.");
    }
}
