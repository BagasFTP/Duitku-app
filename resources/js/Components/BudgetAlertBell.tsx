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

// Key unik per alert — berubah otomatis jika status near → over
const alertKey = (a: BudgetAlert) => `${a.category_name}::${a.is_over ? 'over' : 'near'}`;

export default function BudgetAlertBell() {
    const { budgetAlerts } = usePage<{ auth: any; budgetAlerts: BudgetAlert[] }>().props;

    const now = new Date();
    const storageKey = `budget-bell-${now.getFullYear()}-${now.getMonth() + 1}`;

    const alerts = budgetAlerts ?? [];

    // seenKeys   : alert yang sudah pernah dibuka user di bell (hilang dari list)
    // dismissedKeys : alert yang di-dismiss via "Hapus Notifikasi"
    const [seenKeys, setSeenKeys] = useState<string[]>(
        () => JSON.parse(localStorage.getItem(`${storageKey}-seenKeys`) ?? '[]')
    );
    const [dismissedKeys, setDismissedKeys] = useState<string[]>(
        () => JSON.parse(localStorage.getItem(`${storageKey}-dismissedKeys`) ?? '[]')
    );

    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Tampilkan hanya alert yang belum pernah dilihat dan belum di-dismiss
    const visibleAlerts    = alerts.filter(a => !seenKeys.includes(alertKey(a)) && !dismissedKeys.includes(alertKey(a)));
    const visibleOverCount = visibleAlerts.filter(a => a.is_over).length;
    const visibleNearCount = visibleAlerts.filter(a => !a.is_over).length;

    // Badge muncul selama ada alert yang belum dilihat
    const showBadge = visibleAlerts.length > 0;

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
        setOpen(o => !o);
        // Tandai semua yang sedang ditampilkan sebagai "sudah dilihat"
        const newSeenKeys = [...new Set([...seenKeys, ...visibleAlerts.map(alertKey)])];
        setSeenKeys(newSeenKeys);
        localStorage.setItem(`${storageKey}-seenKeys`, JSON.stringify(newSeenKeys));
    };

    // Hapus Notifikasi: dismiss semua yang sedang terlihat
    const handleClear = () => {
        const newDismissed = [...new Set([...dismissedKeys, ...visibleAlerts.map(alertKey)])];
        setDismissedKeys(newDismissed);
        localStorage.setItem(`${storageKey}-dismissedKeys`, JSON.stringify(newDismissed));
        setOpen(false);
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
                        {visibleAlerts.length > 9 ? '9+' : visibleAlerts.length}
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

                    {/* Summary pills */}
                    {visibleAlerts.length > 0 && (
                        <div className="px-4 pt-3 pb-2 flex gap-2 flex-wrap">
                            {visibleOverCount > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                                    <AlertTriangle size={10} /> {visibleOverCount} terlampaui
                                </span>
                            )}
                            {visibleNearCount > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                                    <TrendingDown size={10} /> {visibleNearCount} hampir habis
                                </span>
                            )}
                        </div>
                    )}

                    {/* Alert list */}
                    <div className="max-h-72 overflow-y-auto px-3 pb-3 space-y-2">
                        {visibleAlerts.length === 0 ? (
                            <div className="py-6 flex flex-col items-center gap-2 text-slate-400">
                                <Bell size={22} className="opacity-40" />
                                <p className="text-xs">Tidak ada notifikasi baru</p>
                            </div>
                        ) : visibleAlerts.map((alert, i) => (
                            <div
                                key={i}
                                className={`rounded-xl p-3 border ${
                                    alert.is_over ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
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
                        {visibleAlerts.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
                            >
                                Hapus Notifikasi
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
