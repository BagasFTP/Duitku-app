<?php

namespace App\Http\Controllers;

use App\Models\AiAnalysis;
use App\Models\Budget;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

class AnalysisController extends Controller
{
    public function index(Request $request): Response
    {
        $month = $request->integer('month', Carbon::now()->month);
        $year  = $request->integer('year', Carbon::now()->year);

        $analysis = AiAnalysis::where('user_id', auth()->id())->where('month', $month)->where('year', $year)->first();

        return Inertia::render('Analysis/Index', [
            'analysis' => $analysis,
            'month'    => $month,
            'year'     => $year,
        ]);
    }

    public function generate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month' => 'required|integer|min:1|max:12',
            'year'  => 'required|integer|min:2000',
        ]);

        $month = $validated['month'];
        $year  = $validated['year'];

        $transactions = Transaction::with('category')
            ->where('user_id', auth()->id())
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->get();

        $totalIncome  = $transactions->where('type', 'income')->sum('amount');
        $totalExpense = $transactions->where('type', 'expense')->sum('amount');

        $expenseByCategory = $transactions
            ->where('type', 'expense')
            ->groupBy('category_id')
            ->map(fn($group) => [
                'category' => $group->first()->category->name,
                'budget'   => Budget::where('user_id', auth()->id())
                                ->where('category_id', $group->first()->category_id)
                                ->where('month', $month)->where('year', $year)
                                ->value('amount') ?? $group->first()->category->budget ?? 0,
                'actual'   => $group->sum('amount'),
            ])
            ->values();

        $prompt = $this->buildPrompt($month, $year, $totalIncome, $totalExpense, $expenseByCategory->toArray());

        if (!config('services.groq.key')) {
            return redirect()->route('analysis.index', ['month' => $month, 'year' => $year])
                ->with('error', 'API key Groq belum diset. Tambahkan GROQ_API_KEY di file .env');
        }

        [$result, $error] = $this->callAi($prompt);

        if ($error) {
            return redirect()->route('analysis.index', ['month' => $month, 'year' => $year])
                ->with('error', $error);
        }

        AiAnalysis::updateOrCreate(
            ['user_id' => auth()->id(), 'month' => $month, 'year' => $year],
            [
                'result'       => $result,
                'health_score' => $result['health_score'] ?? null,
            ]
        );

        return redirect()->route('analysis.index', ['month' => $month, 'year' => $year])
            ->with('success', 'Analisis AI berhasil dibuat.');
    }

    private function buildPrompt(int $month, int $year, float $income, float $expense, array $categories): string
    {
        $monthName  = Carbon::createFromDate($year, $month, 1)->translatedFormat('F Y');
        $balance    = $income - $expense;
        $categoryLines = collect($categories)->map(function ($item) {
            $pct = $item['budget'] > 0 ? round(($item['actual'] / $item['budget']) * 100) : 0;
            return "- {$item['category']}: budget Rp " . number_format($item['budget'], 0, ',', '.') .
                   ", aktual Rp " . number_format($item['actual'], 0, ',', '.') . " ({$pct}%)";
        })->join("\n");

        return <<<PROMPT
Kamu adalah asisten keuangan pribadi. Analisis data keuangan bulan {$monthName}:

Total pemasukan : Rp {$this->fmt($income)}
Total pengeluaran: Rp {$this->fmt($expense)}
Sisa             : Rp {$this->fmt($balance)}

Pengeluaran per kategori:
{$categoryLines}

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
