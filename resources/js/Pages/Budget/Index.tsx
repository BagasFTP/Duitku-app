import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ChevronLeft, ChevronRight, Save,
    AlertTriangle, CheckCircle2, TrendingDown,
    CalendarDays, Calendar,
} from 'lucide-react';
import { useState } from 'react';
import {
    format, addMonths, subMonths, addWeeks, subWeeks,
    startOfISOWeek, endOfISOWeek, getISOWeek, getISOWeekYear,
} from 'date-fns';
import { id } from 'date-fns/locale';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
}

interface BudgetItem {
    category: Category;
    budget_id: number | null;
    limit: number;
    actual: number;
    remaining: number;
    percentage: number;
    is_fallback: boolean;
}

interface Props {
    budgetData: BudgetItem[];
    period: 'monthly' | 'weekly';
    month: number | null;
    week: number | null;
    year: number;
    weekStart: string | null;
    weekEnd: string | null;
    monthlyLimits: Record<number, number> | null;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
    if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + ' jt';
    if (v >= 1_000)     return 'Rp ' + (v / 1_000).toFixed(0) + ' rb';
    return fmt(v);
};

function ProgressBar({ pct, color }: { pct: number; color: string }) {
    const capped = Math.min(pct, 100);
    const barColor = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : color;
    return (
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: capped + '%', backgroundColor: barColor }}
            />
        </div>
    );
}

/** Build a Date object that falls inside the given ISO week + year */
function isoWeekToDate(year: number, week: number): Date {
    // Jan 4 is always in week 1 of ISO calendar
    const jan4 = new Date(year, 0, 4);
    const startW1 = startOfISOWeek(jan4);
    return new Date(startW1.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
}

export default function BudgetIndex({ budgetData, period, month, week, year, weekStart, weekEnd, monthlyLimits }: Props) {
    const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash;

    const [activePeriod, setActivePeriod] = useState<'monthly' | 'weekly'>(period);

    // Local editable amounts: category_id → raw string
    const [amounts, setAmounts] = useState<Record<number, string>>(() => {
        const init: Record<number, string> = {};
        budgetData.forEach((item) => {
            init[item.category.id] = item.limit > 0 ? String(Math.round(Number(item.limit))) : '';
        });
        return init;
    });
    const [saving, setSaving] = useState(false);

    // --- Navigation ---
    const navigate = (params: Record<string, string | number>) => {
        router.get('/budget', params, { preserveState: false });
    };

    const switchPeriod = (p: 'monthly' | 'weekly') => {
        setActivePeriod(p);
        if (p === 'monthly') {
            const now = new Date();
            navigate({ period: 'monthly', month: (month ?? now.getMonth() + 1), year });
        } else {
            const now = new Date();
            navigate({ period: 'weekly', week: (week ?? getISOWeek(now)), year });
        }
    };

    // Monthly navigation
    const currentMonthDate = new Date(year, (month ?? 1) - 1, 1);
    const shiftMonth = (dir: 1 | -1) => {
        const next = dir === 1 ? addMonths(currentMonthDate, 1) : subMonths(currentMonthDate, 1);
        navigate({ period: 'monthly', month: next.getMonth() + 1, year: next.getFullYear() });
    };

    // Weekly navigation
    const currentWeekDate = isoWeekToDate(year, week ?? getISOWeek(new Date()));
    const weekStartDate   = startOfISOWeek(currentWeekDate);
    const weekEndDate     = endOfISOWeek(currentWeekDate);
    const shiftWeek = (dir: 1 | -1) => {
        const next = dir === 1 ? addWeeks(currentWeekDate, 1) : subWeeks(currentWeekDate, 1);
        navigate({ period: 'weekly', week: getISOWeek(next), year: getISOWeekYear(next) });
    };

    // --- Save ---
    const handleSave = () => {
        const budgets = Object.entries(amounts)
            .filter(([, v]) => v !== '' && Number(v) >= 0)
            .map(([catId, amount]) => ({ category_id: Number(catId), amount: Number(amount) }));

        if (budgets.length === 0) return;

        const payload: Record<string, any> = { budgets, period: activePeriod, year };
        if (activePeriod === 'monthly') payload.month = month;
        if (activePeriod === 'weekly')  payload.week  = week;

        setSaving(true);
        router.post('/budget', payload, { onFinish: () => setSaving(false) });
    };

    // --- Summary ---
    const totalLimit  = budgetData.reduce((s, i) => s + Number(i.limit), 0);
    const totalActual = budgetData.reduce((s, i) => s + Number(i.actual), 0);
    const totalPct    = totalLimit > 0 ? Math.round((totalActual / totalLimit) * 100) : 0;
    const setCount    = budgetData.filter((i) => i.limit > 0).length;
    const overCount   = budgetData.filter((i) => i.limit > 0 && Number(i.actual) > Number(i.limit)).length;

    return (
        <AppLayout>
            <Head title="Anggaran" />
            <div className="p-4 sm:p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Anggaran</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Atur batas pengeluaran per kategori</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Save size={15} />
                        {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                        <CheckCircle2 size={15} className="shrink-0" /> {flash.success}
                    </div>
                )}

                {/* Period toggle + navigator */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Period toggle */}
                    <div className="flex border-b border-slate-100">
                        {([
                            { value: 'monthly', label: 'Bulanan', Icon: Calendar },
                            { value: 'weekly',  label: 'Mingguan', Icon: CalendarDays },
                        ] as const).map(({ value, label, Icon }) => (
                            <button
                                key={value}
                                onClick={() => switchPeriod(value)}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                                    activePeriod === value
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                <Icon size={15} /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Navigator */}
                    <div className="flex items-center justify-between px-4 py-3">
                        <button
                            onClick={() => activePeriod === 'monthly' ? shiftMonth(-1) : shiftWeek(-1)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="text-center">
                            {activePeriod === 'monthly' ? (
                                <p className="text-base font-bold text-slate-800">
                                    {format(currentMonthDate, 'MMMM yyyy', { locale: id })}
                                </p>
                            ) : (
                                <>
                                    <p className="text-base font-bold text-slate-800">
                                        Minggu ke-{week ?? getISOWeek(new Date())}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {format(weekStartDate, 'd MMM', { locale: id })} – {format(weekEndDate, 'd MMM yyyy', { locale: id })}
                                    </p>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => activePeriod === 'monthly' ? shiftMonth(1) : shiftWeek(1)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {/* Summary banner */}
                {setCount > 0 && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-5 text-white shadow-lg shadow-indigo-200">
                        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                        <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-end justify-between mb-3">
                                <div>
                                    <p className="text-xs font-medium text-indigo-200 mb-0.5">Total Pengeluaran</p>
                                    <p className="text-2xl font-bold">{fmt(totalActual)}</p>
                                    <p className="text-xs text-indigo-300 mt-0.5">dari {fmt(totalLimit)} anggaran</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-3xl font-bold ${totalPct >= 100 ? 'text-red-300' : totalPct >= 80 ? 'text-amber-300' : 'text-emerald-300'}`}>
                                        {totalPct}%
                                    </p>
                                    <p className="text-xs text-indigo-300">{setCount} kategori</p>
                                </div>
                            </div>
                            <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: Math.min(totalPct, 100) + '%',
                                        backgroundColor: totalPct >= 100 ? '#fca5a5' : totalPct >= 80 ? '#fcd34d' : '#6ee7b7',
                                    }}
                                />
                            </div>
                            {overCount > 0 && (
                                <p className="flex items-center gap-1.5 mt-3 text-xs text-red-300 font-medium">
                                    <AlertTriangle size={12} /> {overCount} kategori melebihi anggaran
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Budget list */}
                {budgetData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <TrendingDown size={28} className="text-slate-400" />
                        </div>
                        <p className="font-semibold text-slate-600">Belum ada kategori pengeluaran</p>
                        <p className="text-sm text-slate-400 mt-1">Tambahkan kategori terlebih dahulu</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {budgetData.map((item) => {
                            const rawVal      = amounts[item.category.id] ?? '';
                            const limitVal    = rawVal ? Number(rawVal) : 0;
                            const pct         = limitVal > 0 ? Math.round((Number(item.actual) / limitVal) * 100) : 0;
                            const isOver      = limitVal > 0 && Number(item.actual) > limitVal;
                            const isNear      = !isOver && pct >= 80;
                            const color       = item.category.color ?? '#6366f1';
                            const monthlyMax  = monthlyLimits?.[item.category.id] ?? 0;
                            const exceedsMonthly = period === 'weekly' && monthlyMax > 0 && limitVal > monthlyMax;

                            return (
                                <div
                                    key={item.category.id}
                                    className={`bg-white rounded-2xl border shadow-sm p-4 transition-all duration-200 hover:shadow-md ${
                                        exceedsMonthly ? 'border-orange-300' : isOver ? 'border-red-200' : isNear ? 'border-amber-200' : 'border-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        {/* Icon */}
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: color + '20' }}
                                        >
                                            <DynamicIcon name={item.category.icon} size={18} style={{ color }} />
                                        </div>

                                        {/* Name + badge */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-slate-800 truncate">{item.category.name}</p>
                                                {isOver && (
                                                    <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                                        <AlertTriangle size={10} /> Melebihi
                                                    </span>
                                                )}
                                                {isNear && (
                                                    <span className="shrink-0 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        Hampir habis
                                                    </span>
                                                )}
                                                {item.is_fallback && !isOver && !isNear && (
                                                    <span className="shrink-0 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        dari sebelumnya
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Budget input */}
                                        <div className="relative shrink-0">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">Rp</span>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={rawVal ? new Intl.NumberFormat('id-ID').format(Number(rawVal)) : ''}
                                                onChange={(e) => {
                                                    const raw = e.target.value.replace(/\D/g, '');
                                                    setAmounts((prev) => ({ ...prev, [item.category.id]: raw }));
                                                }}
                                                placeholder="0"
                                                className={`w-36 rounded-xl border pl-8 pr-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:border-transparent transition placeholder-slate-400 text-right ${
                                                    exceedsMonthly
                                                        ? 'border-orange-400 focus:ring-orange-400'
                                                        : 'border-slate-200 focus:ring-indigo-400'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    {/* Warning: weekly exceeds monthly */}
                                    {exceedsMonthly && (
                                        <p className="text-xs text-orange-600 font-medium mt-1 mb-2 flex items-center gap-1">
                                            <AlertTriangle size={11} />
                                            Melebihi anggaran bulanan ({fmt(monthlyMax)}). Kurangi nominal.
                                        </p>
                                    )}

                                    {/* Monthly reference when in weekly mode */}
                                    {period === 'weekly' && monthlyMax > 0 && !exceedsMonthly && (
                                        <p className="text-xs text-slate-400 mt-1 mb-2">
                                            Maks. mingguan: {fmt(monthlyMax)} (batas bulanan)
                                        </p>
                                    )}

                                    {/* Progress bar */}
                                    <ProgressBar pct={pct} color={color} />

                                    {/* Stats */}
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">
                                                Terpakai:{' '}
                                                <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {fmtShort(Number(item.actual))}
                                                </span>
                                            </span>
                                            {limitVal > 0 && (
                                                <span className="text-xs text-slate-400">
                                                    Sisa:{' '}
                                                    <span className={`font-semibold ${isOver ? 'text-red-500' : 'text-emerald-600'}`}>
                                                        {isOver ? '-' : ''}{fmtShort(Math.abs(limitVal - Number(item.actual)))}
                                                    </span>
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-xs font-bold ${
                                            isOver ? 'text-red-500' : isNear ? 'text-amber-500' : limitVal > 0 ? 'text-emerald-600' : 'text-slate-400'
                                        }`}>
                                            {limitVal > 0 ? pct + '%' : 'Belum diset'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {budgetData.length > 0 && (
                    <p className="text-center text-xs text-slate-400 pb-2">
                        Edit nominal anggaran lalu tekan <span className="font-semibold text-slate-600">Simpan</span>
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
