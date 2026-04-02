<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\ChatMessage;
use App\Models\SavingsGoal;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

class ChatController extends Controller
{
    public function history(): JsonResponse
    {
        $messages = ChatMessage::where('user_id', auth()->id())
            ->orderBy('created_at')
            ->get(['role', 'content', 'created_at']);

        return response()->json($messages);
    }

    public function send(Request $request): JsonResponse
    {
        $request->validate(['message' => 'required|string|max:1000']);

        $userId  = auth()->id();
        $content = trim($request->message);

        // Save user message
        ChatMessage::create(['user_id' => $userId, 'role' => 'user', 'content' => $content]);

        // Build conversation history (last 10 messages)
        $history = ChatMessage::where('user_id', $userId)
            ->orderBy('created_at')
            ->get(['role', 'content'])
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        // Call AI
        $reply = $this->callAi($history, $this->buildContext());

        // Save assistant reply
        ChatMessage::create(['user_id' => $userId, 'role' => 'assistant', 'content' => $reply]);

        return response()->json(['reply' => $reply]);
    }

    public function clear(): JsonResponse
    {
        ChatMessage::where('user_id', auth()->id())->delete();
        return response()->json(['ok' => true]);
    }

    private function buildContext(): string
    {
        $now   = Carbon::now();
        $month = $now->month;
        $year  = $now->year;

        // Wallets
        $wallets = Wallet::where('user_id', auth()->id())->orderBy('name')->get();
        $totalBalance = $wallets->sum('balance');
        $walletLines  = $wallets->map(fn ($w) => "- {$w->name} ({$w->type}): Rp " . number_format($w->balance, 0, ',', '.'))->join("\n");

        // This month income & expense
        $transactions = Transaction::where('user_id', auth()->id())->whereMonth('date', $month)->whereYear('date', $year)->get();
        $income  = $transactions->where('type', 'income')->sum('amount');
        $expense = $transactions->where('type', 'expense')->sum('amount');

        // Expense by category
        $expenseByCategory = $transactions->where('type', 'expense')
            ->groupBy('category_id')
            ->map(function ($group) {
                $cat = Category::find($group->first()->category_id);
                return '- ' . ($cat?->name ?? 'Lainnya') . ': Rp ' . number_format($group->sum('amount'), 0, ',', '.');
            })->join("\n");

        // Budget status
        $budgets = Budget::with('category')
            ->where('user_id', auth()->id())
            ->where('period_type', 'monthly')
            ->where('month', $month)
            ->where('year', $year)
            ->get();
        $budgetLines = $budgets->map(function ($b) use ($transactions) {
            $actual = $transactions->where('type', 'expense')
                ->where('category_id', $b->category_id)->sum('amount');
            $pct = $b->amount > 0 ? round(($actual / $b->amount) * 100) : 0;
            return "- {$b->category->name}: anggaran Rp " . number_format($b->amount, 0, ',', '.') .
                   ", terpakai Rp " . number_format($actual, 0, ',', '.') . " ({$pct}%)";
        })->join("\n");

        // Recent 5 transactions
        $recent = Transaction::with(['category', 'wallet'])
            ->where('user_id', auth()->id())
            ->whereMonth('date', $month)->whereYear('date', $year)
            ->latest('date')->limit(5)->get()
            ->map(fn ($t) => "- [{$t->date->format('d M')}] {$t->category?->name}: " .
                ($t->type === 'income' ? '+' : '-') . 'Rp ' . number_format($t->amount, 0, ',', '.'))
            ->join("\n");

        // Savings goals
        $savingsGoals = SavingsGoal::where('user_id', auth()->id())
            ->orderBy('is_completed')
            ->orderBy('created_at', 'desc')
            ->get();

        $savingsLines = $savingsGoals->isEmpty()
            ? '- Belum ada target tabungan.'
            : $savingsGoals->map(function ($g) {
                $current  = (float) $g->current_amount;
                $target   = (float) $g->target_amount;
                $pct      = $target > 0 ? round(($current / $target) * 100) : 0;
                $status   = $g->is_completed ? 'Selesai' : "Progres {$pct}%";
                $deadline = $g->deadline ? ', deadline: ' . $g->deadline->format('d M Y') : '';
                $name     = (string) $g->name;
                return "- {$name}: Rp " . number_format($current, 0, ',', '.') .
                       " / Rp " . number_format($target, 0, ',', '.') .
                       " ({$status}{$deadline})";
            })->join("\n");

        $monthName = $now->translatedFormat('F Y');

        return <<<CONTEXT
Data keuangan user bulan {$monthName}:

DOMPET (Total: Rp {$this->fmt($totalBalance)}):
{$walletLines}

RINGKASAN BULAN INI:
- Pemasukan : Rp {$this->fmt($income)}
- Pengeluaran: Rp {$this->fmt($expense)}
- Sisa       : Rp {$this->fmt($income - $expense)}

PENGELUARAN PER KATEGORI:
{$expenseByCategory}

STATUS ANGGARAN:
{$budgetLines}

TARGET TABUNGAN:
{$savingsLines}

5 TRANSAKSI TERAKHIR:
{$recent}
CONTEXT;
    }

    private function callAi(array $history, string $context): string
    {
        $systemPrompt = <<<SYSTEM
Kamu adalah asisten keuangan pribadi yang ramah dan helpful. Kamu memiliki akses ke data keuangan user berikut:

{$context}

Jawab pertanyaan user dalam Bahasa Indonesia. Berikan jawaban yang singkat, jelas, dan actionable. Gunakan data di atas untuk memberikan insight yang spesifik dan personal. Jika user bertanya di luar topik keuangan, arahkan kembali ke topik keuangan dengan sopan.
SYSTEM;

        $response = Http::timeout(30)->withHeaders([
            'Authorization' => 'Bearer ' . config('services.groq.key'),
            'Content-Type'  => 'application/json',
        ])->post('https://api.groq.com/openai/v1/chat/completions', [
            'model'       => 'llama-3.1-8b-instant',
            'temperature' => 0.7,
            'messages'    => array_merge(
                [['role' => 'system', 'content' => $systemPrompt]],
                array_slice($history, -10) // last 10 messages for context
            ),
        ]);

        return $response->json('choices.0.message.content', 'Maaf, terjadi kesalahan. Coba lagi.');
    }

    private function fmt(float $amount): string
    {
        return number_format($amount, 0, ',', '.');
    }
}
