<?php

namespace App\Console\Commands;

use App\Models\Transaction;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessRecurringTransactions extends Command
{
    protected $signature   = 'transactions:process-recurring';
    protected $description = 'Buat transaksi baru dari recurring transactions yang sudah jatuh tempo';

    public function handle(): int
    {
        $due = Transaction::recurringDue()->with('wallet')->get();

        if ($due->isEmpty()) {
            $this->info('Tidak ada transaksi recurring yang jatuh tempo.');
            return self::SUCCESS;
        }

        $processed = 0;
        $failed    = 0;

        foreach ($due as $recurring) {
            try {
                DB::transaction(function () use ($recurring, &$processed) {
                    $clone = $recurring->cloneForRecurring();
                    $clone->save();

                    $wallet = $recurring->wallet;
                    if ($clone->type === 'income') {
                        $wallet->increment('balance', $clone->amount);
                    } else {
                        $wallet->decrement('balance', $clone->amount);
                    }

                    $recurring->update([
                        'next_occurrence_at' => $clone->next_occurrence_at,
                        'last_executed_at'   => $clone->date,
                    ]);

                    $processed++;
                    $this->line("  Dibuat: [{$clone->type}] {$clone->description} - Rp " . number_format($clone->amount, 0, ',', '.') . " ({$clone->date->toDateString()})");
                });
            } catch (Throwable $e) {
                $failed++;
                $this->error("  Gagal memproses ID {$recurring->id}: {$e->getMessage()}");
                Log::error('ProcessRecurringTransactions: gagal memproses transaksi', [
                    'transaction_id' => $recurring->id,
                    'error'          => $e->getMessage(),
                ]);
            }
        }

        $this->info("Selesai: {$processed} transaksi recurring diproses." . ($failed > 0 ? " {$failed} gagal." : ''));

        return $failed > 0 ? self::FAILURE : self::SUCCESS;
    }
}
