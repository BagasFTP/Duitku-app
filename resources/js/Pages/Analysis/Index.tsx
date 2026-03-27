import AppLayout from '@/Layouts/AppLayout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ChevronLeft, ChevronRight, Sparkles, RefreshCw,
    AlertTriangle, Lightbulb, CheckCircle2, TrendingDown,
    TrendingUp, Heart,
} from 'lucide-react';
import { useState } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';

interface OverBudget {
    category: string;
    suggestion: string;
}

interface SavingsOpportunity {
    category: string;
    potential: string;
}

interface AnalysisResult {
    health_score: number;
    summary: string;
    over_budget: OverBudget[];
    savings_opportunity: SavingsOpportunity[];
    recommendations: string[];
}

interface Analysis {
    id: number;
    month: number;
    year: number;
    result: AnalysisResult;
    health_score: number;
    updated_at: string;
}

interface Props {
    analysis: Analysis | null;
    month: number;
    year: number;
}

function HealthGauge({ score }: { score: number }) {
    const r = 54;
    const circ = 2 * Math.PI * r;
    const pct  = Math.min(Math.max(score, 0), 100);
    const dash = (pct / 100) * circ;

    const color =
        pct >= 80 ? '#10b981' :
        pct >= 60 ? '#f59e0b' :
                    '#ef4444';

    const label =
        pct >= 80 ? 'Sehat' :
        pct >= 60 ? 'Cukup' :
                    'Perlu Perhatian';

    return (
        <div className="flex flex-col items-center">
            <div className="relative w-36 h-36">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                    <circle
                        cx="64" cy="64" r={r}
                        fill="none"
                        stroke={color}
                        strokeWidth="10"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-slate-800">{pct}</span>
                    <span className="text-xs text-slate-500 -mt-1">/ 100</span>
                </div>
            </div>
            <span className="mt-1 text-sm font-semibold" style={{ color }}>{label}</span>
        </div>
    );
}

export default function AnalysisIndex({ analysis, month, year }: Props) {
    const flash   = usePage<{ flash?: { success?: string; error?: string } }>().props.flash;
    const [generating, setGenerating] = useState(false);

    const currentDate = new Date(year, month - 1, 1);

    const shiftMonth = (dir: 1 | -1) => {
        const next = dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1);
        router.get('/analysis', { month: next.getMonth() + 1, year: next.getFullYear() });
    };

    const handleGenerate = () => {
        setGenerating(true);
        router.post('/analysis/generate', { month, year }, {
            onFinish: () => setGenerating(false),
        });
    };

    const result = analysis?.result;

    return (
        <AppLayout>
            <Head title="Analisis AI" />
            <div className="p-4 sm:p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Analisis AI</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Insight keuangan berbasis AI</p>
                    </div>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-violet-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                        {generating
                            ? <><RefreshCw size={15} className="animate-spin" /> Menganalisis...</>
                            : <><Sparkles size={15} /> {analysis ? 'Perbarui' : 'Analisis'}</>
                        }
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                        <CheckCircle2 size={15} className="shrink-0" /> {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                        <AlertTriangle size={15} className="shrink-0" /> {flash.error}
                    </div>
                )}

                {/* Month navigator */}
                <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
                    <button onClick={() => shiftMonth(-1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="text-base font-bold text-slate-800">
                        {format(currentDate, 'MMMM yyyy', { locale: id })}
                    </span>
                    <button onClick={() => shiftMonth(1)} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* Empty state */}
                {!result && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mb-5 shadow-sm">
                            <Sparkles size={34} className="text-violet-500" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-700">Belum ada analisis</h2>
                        <p className="text-sm text-slate-400 mt-1 max-w-xs">
                            Tekan tombol <span className="font-semibold text-violet-600">Analisis</span> untuk mendapatkan insight keuangan bulan ini dari AI
                        </p>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="mt-6 flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl shadow-md shadow-violet-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                        >
                            {generating
                                ? <><RefreshCw size={16} className="animate-spin" /> Menganalisis...</>
                                : <><Sparkles size={16} /> Mulai Analisis</>
                            }
                        </button>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="space-y-4">

                        {/* Health score + summary */}
                        <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-violet-200 relative overflow-hidden">
                            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                            <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
                            <div className="relative flex items-center gap-5">
                                <HealthGauge score={result.health_score ?? 0} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Heart size={14} className="text-violet-300" />
                                        <span className="text-xs font-semibold text-violet-300 uppercase tracking-wide">Skor Kesehatan</span>
                                    </div>
                                    <p className="text-sm text-white/90 leading-relaxed">{result.summary}</p>
                                    {analysis?.updated_at && (
                                        <p className="text-xs text-violet-300 mt-2">
                                            Diperbarui {new Date(analysis.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Over budget */}
                        {result.over_budget?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-red-50 border-b border-red-100">
                                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                                        <TrendingDown size={14} className="text-red-500" />
                                    </div>
                                    <p className="text-sm font-bold text-red-700">Melebihi Anggaran</p>
                                    <span className="ml-auto text-xs font-semibold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">
                                        {result.over_budget.length} kategori
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {result.over_budget.map((item, i) => (
                                        <div key={i} className="px-5 py-3.5">
                                            <p className="text-sm font-semibold text-slate-800">{item.category}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Savings opportunity */}
                        {result.savings_opportunity?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-emerald-50 border-b border-emerald-100">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                        <TrendingUp size={14} className="text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-bold text-emerald-700">Peluang Hemat</p>
                                    <span className="ml-auto text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        {result.savings_opportunity.length} peluang
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {result.savings_opportunity.map((item, i) => (
                                        <div key={i} className="px-5 py-3.5">
                                            <p className="text-sm font-semibold text-slate-800">{item.category}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.potential}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        {result.recommendations?.length > 0 && (
                            <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                                <div className="flex items-center gap-2.5 px-5 py-3.5 bg-amber-50 border-b border-amber-100">
                                    <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                        <Lightbulb size={14} className="text-amber-500" />
                                    </div>
                                    <p className="text-sm font-bold text-amber-700">Rekomendasi</p>
                                </div>
                                <div className="p-5 space-y-3">
                                    {result.recommendations.map((rec, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-xs font-bold text-amber-600">{i + 1}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Regenerate hint */}
                        <p className="text-center text-xs text-slate-400 pb-2">
                            Tekan <span className="font-semibold text-violet-600">Perbarui</span> untuk generate ulang analisis
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
