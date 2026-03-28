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

Kembalikan HANYA JSON valid tanpa teks lain:
{
  "amount": <total belanja dalam angka bulat tanpa titik/koma>,
  "description": "<nama toko atau merchant>",
  "date": "<tanggal transaksi format YYYY-MM-DD, gunakan hari ini jika tidak terlihat>",
  "suggested_category": "<nama kategori dari daftar di atas yang paling sesuai>"
}

Jika bukan struk atau tidak bisa dibaca:
{"error": "Gambar bukan struk belanja atau tidak dapat dibaca"}
PROMPT;

        $apiKey   = config('services.gemini.key');
        $response = Http::timeout(30)->post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={$apiKey}",
            [
                'contents' => [
                    [
                        'parts' => [
                            [
                                'inline_data' => [
                                    'mime_type' => $mediaType,
                                    'data'      => $imageData,
                                ],
                            ],
                            ['text' => $prompt],
                        ],
                    ],
                ],
                'generationConfig' => ['maxOutputTokens' => 256, 'temperature' => 0],
            ]
        );

        if ($response->failed()) {
            return response()->json([
                'error'  => 'Gagal menghubungi AI. Coba lagi.',
                'status' => $response->status(),
                'detail' => $response->json() ?? $response->body(),
            ], 500);
        }

        $text = $response->json('candidates.0.content.parts.0.text', '');

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
