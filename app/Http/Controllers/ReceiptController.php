<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

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

Kembalikan HANYA JSON valid tanpa teks lain:
{
  "amount": <nilai Total/Subtotal dalam angka bulat tanpa titik/koma>,
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
                ->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($data['suggested_category']) . '%'])
                ->first();
            $categoryId = $cat?->id;
        }

        return response()->json([
            'amount'      => (string) intval($data['amount'] ?? 0),
            'type'        => 'expense',
            'description' => $data['description'] ?? '',
            'date'        => $data['date'] ?? $today,
            'category_id' => $categoryId ? (string) $categoryId : '',
        ]);
    }
}
