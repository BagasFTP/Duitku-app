import { Link, usePage } from '@inertiajs/react';
import { Bell, AlertTriangle, TrendingDown, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import DynamicIcon from '@/Components/DynamicIcon';

interface BudgetAlert {
    category_name: string;
    category_icon: string;
    category_color: string;
    actual: number;
    limit: number;
    percentage: number;
    is_over: boolean;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function BudgetAlertBell() {
    const { budgetAlerts } = usePage<{ auth: any; budgetAlerts: BudgetAlert[] }>().props;

    const now = new Date();
    // Key berubah setiap bulan → semua state auto-reset awal bulan baru
    const storageKey = `budget-bell-${now.getFullYear()}-${now.getMonth() + 1}`;

    const alerts = budgetAlerts ?? [];
    const overCount  = alerts.filter((a) => a.is_over).length;
    const nearCount  = alerts.filter((a) => !a.is_over).length;

    // Lacak dua hal secara terpisah:
    // 1. Jumlah total alert (kategori baru masuk 80%)
    // 2. Jumlah yang sudah melebihi (near → exceeded = notif baru)
    const storedSeenCount    = parseInt(localStorage.getItem(`${storageKey}-seenCount`) ?? '0', 10);
    const storedSeenOverCount = parseInt(localStorage.getItem(`${storageKey}-seenOverCount`) ?? '0', 10);
    const [seenCount,     setSeenCount]     = useState(storedSeenCount);
    const [seenOverCount, setSeenOverCount] = useState(storedSeenOverCount);

    // Cleared hanya menyembunyikan daftar pesan di dropdown (bukan ikon)
    const [cleared, setCleared] = useState(() => localStorage.getItem(`${storageKey}-cleared`) === 'true');

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Badge muncul jika: ada alert baru ATAU ada yang naik dari "hampir habis" ke "melebihi"
    const showBadge = !cleared && (alerts.length > seenCount || overCount > seenOverCount);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        setOpen((o) => !o);
        // Tandai status saat ini sudah dilihat
        setSeenCount(alerts.length);
        setSeenOverCount(overCount);
        localStorage.setItem(`${storageKey}-seenCount`,     String(alerts.length));
        localStorage.setItem(`${storageKey}-seenOverCount`, String(overCount));
    };

    if (alerts.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={handleOpen}
                className="relative p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                title="Notifikasi Anggaran"
            >
                <Bell size={18} />
                {showBadge && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                        {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white shadow-xl border border-slate-100 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <Bell size={14} className="text-slate-600" />
                            <span className="text-sm font-semibold text-slate-800">Notifikasi Anggaran</span>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Summary pill */}
                    {!cleared && (
                        <div className="px-4 pt-3 pb-2 flex gap-2">
                            {overCount > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                    <AlertTriangle size={10} /> {overCount} terlampaui
                                </span>
                            )}
                            {nearCount > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                    <TrendingDown size={10} /> {nearCount} hampir habis
                                </span>
                            )}
                        </div>
                    )}

                    {/* Alert list */}
                    <div className="max-h-72 overflow-y-auto px-3 pb-3 space-y-2">
                        {cleared ? (
                            <div className="py-6 flex flex-col items-center gap-2 text-slate-400">
                                <Bell size={22} className="opacity-40" />
                                <p className="text-xs">Tidak ada notifikasi</p>
                            </div>
                        ) : alerts.map((alert, i) => (
                            <div
                                key={i}
                                className={`rounded-xl p-3 border ${
                                    alert.is_over
                                        ? 'bg-red-50 border-red-100'
                                        : 'bg-amber-50 border-amber-100'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: (alert.category_color ?? '#6366f1') + '30' }}
                                    >
                                        <DynamicIcon
                                            name={alert.category_icon}
                                            size={15}
                                            style={{ color: alert.category_color ?? '#6366f1' }}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                            {alert.category_name}
                                        </p>
                                        <p className={`text-[10px] font-medium ${alert.is_over ? 'text-red-500' : 'text-amber-500'}`}>
                                            {alert.is_over ? 'Anggaran terlampaui' : 'Hampir mencapai batas'}
                                        </p>
                                    </div>
                                    <span className={`text-xs font-bold shrink-0 ${alert.is_over ? 'text-red-600' : 'text-amber-600'}`}>
                                        {alert.percentage}%
                                    </span>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                            width: Math.min(alert.percentage, 100) + '%',
                                            backgroundColor: alert.is_over ? '#ef4444' : '#f59e0b',
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
                                    <span>Terpakai: <span className="font-medium text-slate-700">{fmt(alert.actual)}</span></span>
                                    <span>Limit: <span className="font-medium text-slate-700">{fmt(alert.limit)}</span></span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                        <Link
                            href="/budget"
                            onClick={() => setOpen(false)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                            Kelola Anggaran →
                        </Link>
                        <button
                            onClick={() => {
                                setCleared(true);
                                setSeenCount(alerts.length);
                                setSeenOverCount(overCount);
                                localStorage.setItem(`${storageKey}-cleared`,      'true');
                                localStorage.setItem(`${storageKey}-seenCount`,     String(alerts.length));
                                localStorage.setItem(`${storageKey}-seenOverCount`, String(overCount));
                                setOpen(false);
                            }}
                            className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                        >
                            Hapus Notifikasi
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
