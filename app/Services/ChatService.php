<?php

namespace App\Services;

use App\Models\Budget;
use App\Models\Category;
use App\Models\ChatMessage;
use App\Models\SavingsGoal;
use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class ChatService
{
    // ─── Public API ────────────────────────────────────────────────────────

    /**
     * Persist the user message, call the AI (with tools), persist the reply,
     * and return ['reply' => string, 'action_result' => array|null].
     */
    public function send(int $userId, string $content): array
    {
        ChatMessage::create(['user_id' => $userId, 'role' => 'user', 'content' => $content]);

        $history = ChatMessage::where('user_id', $userId)
            ->orderBy('created_at')
            ->get(['role', 'content'])
            ->map(fn($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        [$reply, $actionResult] = $this->callAiWithTools($history, $this->buildContext($userId), $userId);

        ChatMessage::create([
            'user_id'       => $userId,
            'role'          => 'assistant',
            'content'       => $reply,
            'action_result' => $actionResult ? json_encode($actionResult) : null,
        ]);

        return ['reply' => $reply, 'action_result' => $actionResult];
    }

    // ─── Context builder ───────────────────────────────────────────────────

    private function buildContext(int $userId): string
    {
        $now   = Carbon::now();
        $month = $now->month;
        $year  = $now->year;

        $wallets      = Wallet::where('user_id', $userId)->orderBy('name')->get();
        $totalBalance = $wallets->sum('balance');
        $walletLines  = $wallets->map(fn($w) => "- {$w->name} (ID:{$w->id}, {$w->type}): Rp " . number_format((float)$w->balance, 0, ',', '.'))->join("\n");

        $transactions      = Transaction::where('user_id', $userId)->whereMonth('date', $month)->whereYear('date', $year)->get();
        $income            = $transactions->where('type', 'income')->sum('amount');
        $expense           = $transactions->where('type', 'expense')->sum('amount');
        $expenseByCategory = $transactions->where('type', 'expense')
            ->groupBy('category_id')
            ->map(function ($group) {
                $cat = Category::find($group->first()->category_id);
                return '- ' . ($cat?->name ?? 'Lainnya') . ': Rp ' . number_format($group->sum('amount'), 0, ',', '.');
            })->join("\n");

        $budgets     = Budget::with('category')->where('user_id', $userId)->where('period_type', 'monthly')->where('month', $month)->where('year', $year)->get();
        $budgetLines = $budgets->map(function ($b) use ($transactions) {
            $actual = $transactions->where('type', 'expense')->where('category_id', $b->category_id)->sum('amount');
            $pct    = $b->amount > 0 ? round(($actual / $b->amount) * 100) : 0;
            return "- {$b->category->name}: anggaran Rp " . number_format((float)$b->amount, 0, ',', '.') .
                   ", terpakai Rp " . number_format((float)$actual, 0, ',', '.') . " ({$pct}%)";
        })->join("\n");

        $recent = Transaction::with(['category', 'wallet'])
            ->where('user_id', $userId)->whereMonth('date', $month)->whereYear('date', $year)
            ->latest('date')->limit(5)->get()
            ->map(fn($t) => "- [{$t->date->format('d M')}] {$t->category?->name}: " .
                ($t->type === 'income' ? '+' : '-') . 'Rp ' . number_format((float)$t->amount, 0, ',', '.'))
            ->join("\n");

        $savingsGoals = SavingsGoal::where('user_id', $userId)->orderBy('is_completed')->orderByDesc('created_at')->get();
        $savingsLines = $savingsGoals->isEmpty()
            ? '- Belum ada target tabungan.'
            : $savingsGoals->map(function ($g) {
                $current  = (float) $g->current_amount;
                $target   = (float) $g->target_amount;
                $pct      = $target > 0 ? round(($current / $target) * 100) : 0;
                $status   = $g->is_completed ? 'Selesai' : "Progres {$pct}%";
                $deadline = $g->deadline ? ', deadline: ' . Carbon::parse($g->deadline)->format('d M Y') : '';
                return "- {$g->name} (ID:{$g->id}): Rp " . number_format($current, 0, ',', '.') .
                       " / Rp " . number_format($target, 0, ',', '.') . " ({$status}{$deadline})";
            })->join("\n");

        $categories    = Category::where('user_id', $userId)->orderBy('name')->get();
        $categoryLines = $categories->map(fn($c) => "- {$c->name} (ID:{$c->id}, tipe:{$c->type})")->join("\n");

        $monthName = $now->translatedFormat('F Y');

        return <<<CONTEXT
        Data keuangan user bulan {$monthName}:

        DOMPET (Total: Rp {$this->fmt($totalBalance)}):
        {$walletLines}

        KATEGORI TERSEDIA:
        {$categoryLines}

        RINGKASAN BULAN INI:
        - Pemasukan : Rp {$this->fmt((float)$income)}
        - Pengeluaran: Rp {$this->fmt((float)$expense)}
        - Sisa       : Rp {$this->fmt((float)($income - $expense))}

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

    // ─── Tool definitions ──────────────────────────────────────────────────

    private function getTools(): array
    {
        return [
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'create_transaction',
                    'description' => 'Mencatat SATU sisi transaksi: pemasukan (income) atau pengeluaran (expense) pada satu dompet. JANGAN gunakan tool ini jika user menyebut dua dompet sekaligus atau minta pindah/transfer uang antar dompet — gunakan transfer_between_wallets untuk itu.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'amount'      => ['type' => 'number', 'description' => 'Jumlah uang dalam Rupiah (angka saja, tanpa titik/koma)'],
                            'type'        => ['type' => 'string', 'enum' => ['income', 'expense'], 'description' => '"income" untuk pemasukan ke dompet, "expense" untuk pengeluaran dari dompet'],
                            'wallet_id'   => ['type' => 'integer', 'description' => 'ID dompet (lihat daftar dompet di context)'],
                            'category_id' => ['type' => 'integer', 'description' => 'ID kategori yang sesuai (lihat daftar kategori di context). Opsional — kosongkan jika tidak ada kategori yang cocok.'],
                            'description' => ['type' => 'string', 'description' => 'Keterangan singkat transaksi (opsional)'],
                            'date'        => ['type' => 'string', 'description' => 'Tanggal transaksi format YYYY-MM-DD. Default hari ini jika tidak disebutkan.'],
                        ],
                        'required'   => ['amount', 'type', 'wallet_id'],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'transfer_between_wallets',
                    'description' => 'Pindahkan/transfer uang dari satu dompet ke dompet lain. Gunakan ini setiap kali user menyebut dua dompet sekaligus, atau menggunakan kata: pindah, transfer, kirim, dari X ke Y.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'amount'         => ['type' => 'number', 'description' => 'Jumlah uang yang ditransfer dalam Rupiah'],
                            'from_wallet_id' => ['type' => 'integer', 'description' => 'ID dompet asal'],
                            'to_wallet_id'   => ['type' => 'integer', 'description' => 'ID dompet tujuan'],
                            'description'    => ['type' => 'string', 'description' => 'Keterangan transfer (opsional)'],
                        ],
                        'required'   => ['amount', 'from_wallet_id', 'to_wallet_id'],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'create_budget',
                    'description' => 'Membuat atau memperbarui anggaran (budget) pengeluaran untuk kategori tertentu pada bulan tertentu. Gunakan HANYA jika user minta buat/set/ubah anggaran — BUKAN untuk mencatat transaksi.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'category_id' => ['type' => 'integer', 'description' => 'ID kategori pengeluaran (lihat daftar kategori di context)'],
                            'amount'      => ['type' => 'number', 'description' => 'Batas anggaran dalam Rupiah'],
                            'month'       => ['type' => 'integer', 'description' => 'Bulan (1-12). Default bulan ini jika tidak disebutkan.'],
                            'year'        => ['type' => 'integer', 'description' => 'Tahun (misal 2026). Default tahun ini jika tidak disebutkan.'],
                        ],
                        'required'   => ['category_id', 'amount'],
                    ],
                ],
            ],
            [
                'type'     => 'function',
                'function' => [
                    'name'        => 'contribute_to_savings',
                    'description' => 'Menambah uang ke target tabungan. Bisa sekaligus mengurangi saldo dompet.',
                    'parameters'  => [
                        'type'       => 'object',
                        'properties' => [
                            'savings_goal_id' => ['type' => 'integer', 'description' => 'ID target tabungan (lihat daftar target tabungan di context)'],
                            'amount'          => ['type' => 'number', 'description' => 'Jumlah uang yang ditabung dalam Rupiah'],
                            'wallet_id'       => ['type' => 'integer', 'description' => 'ID dompet yang saldonya akan dikurangi (opsional)'],
                            'note'            => ['type' => 'string', 'description' => 'Catatan (opsional)'],
                        ],
                        'required'   => ['savings_goal_id', 'amount'],
                    ],
                ],
            ],
        ];
    }

    // ─── Tool executor ─────────────────────────────────────────────────────

    private function executeTool(string $name, array $args, int $userId): array
    {
        try {
            return match ($name) {
                'create_transaction'       => $this->toolCreateTransaction($args, $userId),
                'transfer_between_wallets' => $this->toolTransfer($args, $userId),
                'create_budget'            => $this->toolCreateBudget($args, $userId),
                'contribute_to_savings'    => $this->toolContribute($args, $userId),
                default                    => ['success' => false, 'message' => "Tool '{$name}' tidak dikenal."],
            };
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Gagal: ' . $e->getMessage()];
        }
    }

    private function toolCreateTransaction(array $args, int $userId): array
    {
        $wallet = Wallet::where('id', $args['wallet_id'])->where('user_id', $userId)->firstOrFail();

        $catId   = null;
        $catName = 'Tanpa kategori';
        if (!empty($args['category_id'])) {
            $cat = Category::where('id', $args['category_id'])->where('user_id', $userId)->first();
            if ($cat) {
                $catId   = $cat->id;
                $catName = (string) $cat->name;
            }
        }

        $amount = (float) $args['amount'];
        $type   = $args['type'];
        $date   = $args['date'] ?? Carbon::today()->toDateString();

        $trx = Transaction::create([
            'user_id'     => $userId,
            'amount'      => $amount,
            'type'        => $type,
            'description' => $args['description'] ?? null,
            'date'        => $date,
            'category_id' => $catId,
            'wallet_id'   => $wallet->id,
        ]);

        if ($type === 'income') {
            $wallet->increment('balance', $amount);
        } else {
            $wallet->decrement('balance', $amount);
        }

        $label      = $type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        $walletName = (string) $wallet->name;

        return [
            'success' => true,
            'type'    => 'transaction',
            'label'   => "{$label} berhasil dicatat",
            'detail'  => "Rp " . number_format($amount, 0, ',', '.') . " · {$catName} · {$walletName}",
            'data'    => ['transaction_id' => $trx->id, 'wallet' => $walletName, 'category' => $catName, 'amount' => $amount, 'type' => $type],
        ];
    }

    private function toolCreateBudget(array $args, int $userId): array
    {
        $cat    = Category::where('id', $args['category_id'])->where('user_id', $userId)->where('type', 'expense')->firstOrFail();
        $amount = (float) $args['amount'];
        $month  = (int) ($args['month'] ?? Carbon::now()->month);
        $year   = (int) ($args['year']  ?? Carbon::now()->year);

        Budget::updateOrCreate(
            ['user_id' => $userId, 'category_id' => $cat->id, 'month' => $month, 'year' => $year],
            ['amount' => $amount, 'period_type' => 'monthly']
        );

        $catName   = (string) $cat->name;
        $monthName = Carbon::createFromDate($year, $month, 1)->translatedFormat('F Y');

        return [
            'success' => true,
            'type'    => 'budget',
            'label'   => 'Anggaran berhasil disimpan',
            'detail'  => "Rp " . number_format($amount, 0, ',', '.') . " · {$catName} · {$monthName}",
            'data'    => ['category' => $catName, 'amount' => $amount, 'month' => $month, 'year' => $year],
        ];
    }

    private function toolTransfer(array $args, int $userId): array
    {
        $from   = Wallet::where('id', $args['from_wallet_id'])->where('user_id', $userId)->firstOrFail();
        $to     = Wallet::where('id', $args['to_wallet_id'])->where('user_id', $userId)->firstOrFail();
        $amount = (float) $args['amount'];

        if ((float) $from->balance < $amount) {
            return ['success' => false, 'message' => "Saldo {$from->name} tidak mencukupi (Rp " . number_format((float)$from->balance, 0, ',', '.') . ")."];
        }

        $fromName = (string) $from->name;
        $toName   = (string) $to->name;
        $desc     = $args['description'] ?? "Transfer ke {$toName}";
        $date     = Carbon::today()->toDateString();

        // Debit from source — adjustment agar tidak masuk pengeluaran
        Transaction::create([
            'user_id'     => $userId,
            'amount'      => $amount,
            'type'        => 'adjustment',
            'description' => $desc,
            'date'        => $date,
            'category_id' => null,
            'wallet_id'   => $from->id,
        ]);
        $from->decrement('balance', $amount);

        // Credit to destination — adjustment agar tidak masuk pemasukan
        Transaction::create([
            'user_id'     => $userId,
            'amount'      => $amount,
            'type'        => 'adjustment',
            'description' => "Transfer dari {$fromName}",
            'date'        => $date,
            'category_id' => null,
            'wallet_id'   => $to->id,
        ]);
        $to->increment('balance', $amount);

        return [
            'success' => true,
            'type'    => 'transfer',
            'label'   => 'Transfer berhasil',
            'detail'  => "Rp " . number_format($amount, 0, ',', '.') . " dari {$fromName} → {$toName}",
            'data'    => ['from' => $fromName, 'to' => $toName, 'amount' => $amount],
        ];
    }

    private function toolContribute(array $args, int $userId): array
    {
        $goal   = SavingsGoal::where('id', $args['savings_goal_id'])->where('user_id', $userId)->firstOrFail();
        $amount = (float) $args['amount'];

        if (!empty($args['wallet_id'])) {
            $wallet = Wallet::where('id', $args['wallet_id'])->where('user_id', $userId)->firstOrFail();

            if ((float) $wallet->balance < $amount) {
                return ['success' => false, 'message' => "Saldo {$wallet->name} tidak mencukupi."];
            }

            $wallet->decrement('balance', $amount);
            Transaction::create([
                'user_id'     => $userId,
                'amount'      => $amount,
                'type'        => 'adjustment',
                'description' => 'Tabungan: ' . $goal->name . (isset($args['note']) ? ' — ' . $args['note'] : ''),
                'date'        => Carbon::today()->toDateString(),
                'category_id' => null,
                'wallet_id'   => $wallet->id,
            ]);
        }

        $newAmount = (float) $goal->current_amount + $amount;
        $completed = $newAmount >= (float) $goal->target_amount;
        $goal->update(['current_amount' => $newAmount, 'is_completed' => $completed]);

        $label = $completed ? "Target \"{$goal->name}\" tercapai! 🎉" : 'Tabungan berhasil ditambahkan';

        return [
            'success' => true,
            'type'    => 'savings',
            'label'   => $label,
            'detail'  => "Rp " . number_format($amount, 0, ',', '.') . " → {$goal->name}",
            'data'    => ['goal' => $goal->name, 'amount' => $amount, 'new_total' => $newAmount, 'completed' => $completed],
        ];
    }

    // ─── AI call with tool use ─────────────────────────────────────────────

    /** @return array{0: string, 1: array|null} [reply, actionResult] */
    private function callAiWithTools(array $history, string $context, int $userId): array
    {
        $systemPrompt = <<<SYSTEM
        Kamu adalah asisten keuangan pribadi yang bisa membaca DAN mengubah data keuangan user.

        {$context}

        Kemampuan kamu:
        1. Menjawab pertanyaan tentang keuangan
        2. Mencatat transaksi pemasukan/pengeluaran → create_transaction
        3. Pindahkan uang antar dompet → transfer_between_wallets
        4. Buat/set anggaran bulanan → create_budget
        5. Menabung ke target tabungan → contribute_to_savings

        ATURAN PEMILIHAN TOOL — baca dengan cermat:
        - "buat anggaran", "set budget", "anggaran makan", "limit pengeluaran" → WAJIB create_budget, BUKAN create_transaction
        - "catat pengeluaran", "beli", "bayar", "keluar uang" → create_transaction
        - "transfer", "pindah", "kirim" + dua dompet → transfer_between_wallets
        - "tabung", "nabung", "cicil target" → contribute_to_savings

        ATURAN UMUM:
        - Jika ada ambiguitas, tanya dulu sebelum eksekusi
        - Jangan mengarang saldo atau data setelah tindakan
        - Jawab Bahasa Indonesia, singkat dan ramah
        SYSTEM;

        $messages = array_merge(
            [['role' => 'system', 'content' => $systemPrompt]],
            array_slice($history, -10)
        );

        $response = Http::timeout(30)->withHeaders([
            'Authorization' => 'Bearer ' . config('services.groq.key'),
            'Content-Type'  => 'application/json',
        ])->post('https://api.groq.com/openai/v1/chat/completions', [
            'model'       => 'llama-3.3-70b-versatile',
            'temperature' => 0.4,
            'messages'    => $messages,
            'tools'       => $this->getTools(),
            'tool_choice' => 'auto',
        ]);

        if (!$response->successful()) {
            return ['Maaf, terjadi kesalahan koneksi ke AI. Coba lagi.', null];
        }

        $choice = $response->json('choices.0');

        // ── Tool call requested by AI ──
        if (($choice['finish_reason'] ?? '') === 'tool_calls') {
            $toolCalls    = $choice['message']['tool_calls'] ?? [];
            $actionResult = null;
            $toolResults  = [];

            foreach ($toolCalls as $call) {
                $name   = $call['function']['name'];
                $args   = json_decode($call['function']['arguments'] ?? '{}', true) ?? [];
                $result = $this->executeTool($name, $args, $userId);

                if ($result['success'] && !$actionResult) {
                    $actionResult = $result;
                }

                $toolResults[] = [
                    'role'         => 'tool',
                    'tool_call_id' => $call['id'],
                    'content'      => json_encode($result),
                ];
            }

            // Send tool results back to AI for natural language reply
            $followUp = Http::timeout(30)->withHeaders([
                'Authorization' => 'Bearer ' . config('services.groq.key'),
                'Content-Type'  => 'application/json',
            ])->post('https://api.groq.com/openai/v1/chat/completions', [
                'model'       => 'llama-3.3-70b-versatile',
                'temperature' => 0.4,
                'messages'    => array_merge($messages, [$choice['message']], $toolResults),
            ]);

            // Fallback jika follow-up call gagal
            if (!$followUp->successful()) {
                $reply = $actionResult
                    ? ($actionResult['label'] . ': ' . $actionResult['detail'])
                    : 'Tindakan dijalankan, tapi gagal mendapat konfirmasi dari AI.';

                return [$reply, $actionResult];
            }

            $reply = $followUp->json('choices.0.message.content', 'Selesai.');

            return [$reply, $actionResult];
        }

        // ── Regular text reply ──
        $reply = $choice['message']['content'] ?? 'Maaf, tidak ada respons dari AI.';

        return [$reply, null];
    }

    private function fmt(float $amount): string
    {
        return number_format($amount, 0, ',', '.');
    }
}
