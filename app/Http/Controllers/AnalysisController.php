<?php

namespace App\Http\Controllers;

use App\Jobs\GenerateAnalysisJob;
use App\Models\AiAnalysis;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

        if (!config('services.groq.key')) {
            return redirect()->route('analysis.index', $validated)
                ->with('error', 'API key Groq belum diset. Tambahkan GROQ_API_KEY di file .env');
        }

        $month = $validated['month'];
        $year  = $validated['year'];

        AiAnalysis::updateOrCreate(
            ['user_id' => auth()->id(), 'month' => $month, 'year' => $year],
            ['status' => 'pending', 'result' => null, 'health_score' => null]
        );

        GenerateAnalysisJob::dispatch(auth()->id(), $month, $year);

        return redirect()->route('analysis.index', ['month' => $month, 'year' => $year])
            ->with('info', 'Analisis sedang diproses. Refresh halaman beberapa saat lagi.');
    }
}
