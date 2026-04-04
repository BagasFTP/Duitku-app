<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\ReceiptScan;
use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ReceiptController extends Controller
{
    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|string',
        ]);

        $imageData = $request->image;
        $mediaType = 'image/jpeg';

        if (str_contains($imageData, ',')) {
            [$meta, $imageData] = explode(',', $imageData, 2);
            preg_match('/data:([^;]+)/', $meta, $matches);
            $mediaType = $matches[1] ?? 'image/jpeg';
        }

        $categories = Category::where('type', 'expense')
            ->orderBy('name')
            ->pluck('name')
            ->join(', ');

        $today = now()->format('Y-m-d');

        $prompt = <<<PROMPT
Analisis struk belanja ini dan ekstrak informasinya.

Kategori yang tersedia: {$categories}
Tanggal hari ini: {$today}

PENTING untuk field "amount":
- Gunakan nilai "Total" atau "Subtotal" (harga barang yang dibeli)
- JANGAN gunakan nilai "Tunai", "Cash", "Bayar", atau "Pembayaran" (uang yang diserahkan)
- JANGAN gunakan nilai "Kembali" atau "Kembalian" (uang kembalian)
- Contoh: jika Total=58200, Tunai=60000, Kembali=1800 → amount harus 58200

FORMAT ANGKA STRUK INDONESIA:
- Titik (.) adalah pemisah ribuan, BUKAN pemisah desimal
- Koma (,) adalah pemisah desimal
- Angka setelah koma (,000) adalah sen/desimal, ABAIKAN bagian ini
- Contoh konversi:
  - "58.200,000" → 58200 (lima puluh delapan ribu dua ratus)
  - "48.200,000" → 48200 (empat puluh delapan ribu dua ratus)
  - "1.500.000,000" → 1500000 (satu juta lima ratus ribu)
  - "10.000,000" → 10000 (sepuluh ribu)

Kembalikan HANYA JSON valid tanpa teks lain:
{
  "amount": <nilai Total/Subtotal sebagai integer rupiah tanpa titik/koma>,
  "description": "<nama toko atau merchant>",
  "date": "<tanggal transaksi format YYYY-MM-DD, gunakan hari ini jika tidak terlihat>",
  "suggested_category": "<nama kategori dari daftar di atas yang paling sesuai>"
}

Jika bukan struk atau tidak bisa dibaca:
{"error": "Gambar bukan struk belanja atau tidak dapat dibaca"}
PROMPT;

        $apiKey   = config('services.anthropic.key');
        $response = Http::timeout(30)->withHeaders([
            'x-api-key'         => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type'      => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model'      => 'claude-haiku-4-5-20251001',
            'max_tokens' => 256,
            'messages'   => [
                [
                    'role'    => 'user',
                    'content' => [
                        [
                            'type'   => 'image',
                            'source' => [
                                'type'       => 'base64',
                                'media_type' => $mediaType,
                                'data'       => $imageData,
                            ],
                        ],
                        ['type' => 'text', 'text' => $prompt],
                    ],
                ],
            ],
        ]);

        if ($response->failed()) {
            return response()->json([
                'error'  => 'Gagal menghubungi AI. Coba lagi.',
                'status' => $response->status(),
                'detail' => $response->json() ?? $response->body(),
            ], 500);
        }

        $text = $response->json('content.0.text', '');

        preg_match('/\{.*\}/s', $text, $matches);
        $data = json_decode($matches[0] ?? '{}', true);

        if (!$data || isset($data['error'])) {
            return response()->json(['error' => $data['error'] ?? 'Tidak dapat membaca struk.'], 422);
        }

        $categoryId = null;
        if (!empty($data['suggested_category'])) {
            $cat = Category::where('type', 'expense')
                ->where('user_id', auth()->id())
                ->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($data['suggested_category']) . '%'])
                ->first();
            $categoryId = $cat?->id;
        }

        // Save image to storage
        $imagePath = null;
        try {
            $ext       = str_contains($mediaType, 'png') ? 'png' : 'jpg';
            $imagePath = 'receipts/' . auth()->id() . '/' . Str::uuid() . '.' . $ext;
            Storage::disk('public')->put($imagePath, base64_decode($imageData));
        } catch (\Exception) {
            $imagePath = null;
        }

        // Save scan record
        $scan = ReceiptScan::create([
            'user_id'     => auth()->id(),
            'category_id' => $categoryId,
            'image_path'  => $imagePath,
            'amount'      => intval($data['amount'] ?? 0),
            'description' => $data['description'] ?? '',
            'date'        => $data['date'] ?? $today,
            'status'      => 'pending',
        ]);

        return response()->json([
            'scan_id'     => $scan->id,
            'amount'      => (string) $scan->amount,
            'type'        => 'expense',
            'description' => $scan->description,
            'date'        => $scan->date->format('Y-m-d'),
            'category_id' => $categoryId ? (string) $categoryId : '',
        ]);
    }

    public function history(): Response
    {
        $scans = ReceiptScan::with(['category', 'transaction'])
            ->where('user_id', auth()->id())
            ->latest()
            ->paginate(20);

        return Inertia::render('Receipts/History', [
            'scans'      => $scans,
            'wallets'    => Wallet::where('user_id', auth()->id())->orderBy('name')->get(),
            'categories' => Category::where('user_id', auth()->id())->where('type', 'expense')->orderBy('name')->get(),
        ]);
    }

    public function saveToTransaction(Request $request, ReceiptScan $scan): JsonResponse
    {
        abort_if($scan->user_id !== auth()->id(), 403);

        if ($scan->status === 'saved') {
            return response()->json(['error' => 'Struk ini sudah disimpan sebagai transaksi.'], 422);
        }

        $validated = $request->validate([
            'wallet_id'   => ['required', Rule::exists('wallets', 'id')->where('user_id', auth()->id())],
            'category_id' => ['nullable', Rule::exists('categories', 'id')->where('user_id', auth()->id())],
            'amount'      => 'required|numeric|min:1',
            'description' => 'nullable|string|max:255',
            'date'        => 'required|date',
        ]);

        $transaction = Transaction::create([
            'user_id'     => auth()->id(),
            'amount'      => $validated['amount'],
            'type'        => 'expense',
            'description' => $validated['description'] ?? $scan->description,
            'date'        => $validated['date'],
            'category_id' => $validated['category_id'] ?? $scan->category_id,
            'wallet_id'   => $validated['wallet_id'],
        ]);

        // Update wallet balance
        $wallet = Wallet::find($validated['wallet_id']);
        $wallet->decrement('balance', $transaction->amount);

        // Mark scan as saved
        $scan->update([
            'transaction_id' => $transaction->id,
            'status'         => 'saved',
        ]);

        $this->forgetBudgetAlertCache(auth()->id(), Carbon::parse($validated['date']));

        return response()->json([
            'success'        => true,
            'transaction_id' => $transaction->id,
        ]);
    }

    public function destroy(ReceiptScan $scan): RedirectResponse
    {
        abort_if($scan->user_id !== auth()->id(), 403);

        if ($scan->image_path) {
            Storage::disk('public')->delete($scan->image_path);
        }

        $scan->delete();

        return back()->with('success', 'Riwayat scan berhasil dihapus.');
    }

    private function forgetBudgetAlertCache(int $userId, Carbon $date): void
    {
        Cache::forget("budget_alerts_{$userId}_{$date->year}_{$date->month}");
    }
}
