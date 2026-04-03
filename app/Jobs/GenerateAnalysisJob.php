<?php

namespace App\Jobs;

use App\Models\AiAnalysis;
use App\Models\Budget;
use App\Models\SavingsGoal;
use App\Models\Transaction;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

class GenerateAnalysisJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 2;
    public int $timeout = 60;

    public function __construct(
        private int $userId,
        private int $month,
        private int $year,
    ) {}

    public function handle(): void
    {
        AiAnalysis::where('user_id', $this->userId)
            ->where('month', $this->month)
            ->where('year', $this->year)
            ->update(['status' => 'processing']);

        $transactions = Transaction::with('category')
            ->where('user_id', $this->userId)
            ->whereMonth('date', $this->month)
            ->whereYear('date', $this->year)
            ->get();

        $totalIncome  = $transactions->where('type', 'income')->sum('amount');
        $totalExpense = $transactions->where('type', 'expense')->sum('amount');

        $expenseByCategory = $transactions
            ->where('type', 'expense')
            ->groupBy('category_id')
            ->map(fn($group) => [
                'category' => $group->first()->category->name,
                'budget'   => Budget::where('user_id', $this->userId)
                                ->where('category_id', $group->first()->category_id)
                                ->where('month', $this->month)->where('year', $this->year)
                                ->value('amount') ?? $group->first()->category->budget ?? 0,
                'actual'   => $group->sum('amount'),
            ])
            ->values();

        $savingsGoals = SavingsGoal::where('user_id', $this->userId)
            ->where('is_completed', false)
            ->get(['name', 'target_amount', 'current_amount', 'deadline'])
            ->map(fn($g) => [
                'name'           => (string) $g->name,
                'target_amount'  => (float) $g->target_amount,
                'current_amount' => (float) $g->current_amount,
                'deadline'       => $g->deadline?->format('Y-m-d'),
            ])->toArray();

        $prompt = $this->buildPrompt($totalIncome, $totalExpense, $expenseByCategory->toArray(), $savingsGoals);

        [$result, $error] = $this->callAi($prompt);

        if ($error) {
            AiAnalysis::where('user_id', $this->userId)
                ->where('month', $this->month)
                ->where('year', $this->year)
                ->update(['status' => 'failed']);
            return;
        }

        AiAnalysis::where('user_id', $this->userId)
            ->where('month', $this->month)
            ->where('year', $this->year)
            ->update([
                'result'       => json_encode($result),
                'health_score' => $result['health_score'] ?? null,
                'status'       => 'done',
            ]);
    }

    private function buildPrompt(float $income, float $expense, array $categories, array $savingsGoals = []): string
    {
        $monthName     = Carbon::createFromDate($this->year, $this->month, 1)->translatedFormat('F Y');
        $balance       = $income - $expense;
        $categoryLines = collect($categories)->map(function ($item) {
            $pct = $item['budget'] > 0 ? round(($item['actual'] / $item['budget']) * 100) : 0;
            return "- {$item['category']}: budget Rp " . number_format($item['budget'], 0, ',', '.') .
                   ", aktual Rp " . number_format($item['actual'], 0, ',', '.') . " ({$pct}%)";
        })->join("\n");

        $savingsLines = empty($savingsGoals)
            ? '- Tidak ada target tabungan aktif.'
            : collect($savingsGoals)->map(function ($g) {
                $pct      = $g['target_amount'] > 0 ? round(($g['current_amount'] / $g['target_amount']) * 100) : 0;
                $deadline = $g['deadline'] ? ", deadline: {$g['deadline']}" : '';
                return "- {$g['name']}: Rp " . number_format($g['current_amount'], 0, ',', '.') .
                       " / Rp " . number_format($g['target_amount'], 0, ',', '.') . " ({$pct}%{$deadline})";
            })->join("\n");

        return <<<PROMPT
Kamu adalah asisten keuangan pribadi. Analisis data keuangan bulan {$monthName}:

Total pemasukan : Rp {$this->fmt($income)}
Total pengeluaran: Rp {$this->fmt($expense)}
Sisa             : Rp {$this->fmt($balance)}

Pengeluaran per kategori:
{$categoryLines}

Target tabungan aktif:
{$savingsLines}

Berikan respons dalam format JSON dengan struktur berikut:
{
  "health_score": <angka 0-100>,
  "summary": "<ringkasan singkat kondisi keuangan>",
  "over_budget": [{"category": "...", "suggestion": "..."}],
  "savings_opportunity": [{"category": "...", "potential": "..."}],
  "recommendations": ["...", "...", "..."]
}

Jawab hanya dengan JSON, tanpa teks tambahan di luar JSON.
PROMPT;
    }

    /** @return array{0: array, 1: string|null} [result, errorMessage] */
    private function callAi(string $prompt): array
    {
        $key = config('services.groq.key');

        $response = Http::timeout(30)->withHeaders([
            'Authorization' => 'Bearer ' . $key,
            'Content-Type'  => 'application/json',
        ])->post('https://api.groq.com/openai/v1/chat/completions', [
            'model'       => 'llama-3.1-8b-instant',
            'temperature' => 0.7,
            'messages'    => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if (!$response->successful()) {
            $msg = $response->json('error.message', 'HTTP ' . $response->status());
            return [[], "Groq API error: {$msg}"];
        }

        $text = $response->json('choices.0.message.content', '');

        if (empty($text)) {
            return [[], 'Tidak ada respons dari AI. Coba lagi.'];
        }

        $text = preg_replace('/^```(?:json)?\s*/i', '', trim($text));
        $text = preg_replace('/\s*```$/m', '', $text);

        $decoded = json_decode($text, true);

        if (!is_array($decoded) || empty($decoded)) {
            return [[], 'Respons AI tidak valid. Coba lagi.'];
        }

        return [$decoded, null];
    }

    private function fmt(float $amount): string
    {
        return number_format($amount, 0, ',', '.');
    }
}
