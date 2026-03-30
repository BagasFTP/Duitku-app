import { usePage } from '@inertiajs/react';
import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BudgetAlertFlash {
    category: string;
    percentage: number;
    type: 'near' | 'over';
}

export default function BudgetToast() {
    const { flash } = usePage<{ auth: any; flash: { budget_alert?: BudgetAlertFlash | null } }>().props;
    const alert = flash?.budget_alert;

    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Trigger setiap kali ada budget_alert baru dari flash
    useEffect(() => {
        if (!alert) return;

        setMounted(true);
        const enterTimer = setTimeout(() => setVisible(true), 50);
        const exitTimer  = setTimeout(() => setVisible(false), 6000);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(exitTimer);
        };
    }, [alert?.category, alert?.percentage, alert?.type]);

    // Hapus dari DOM setelah transisi keluar selesai
    const handleTransitionEnd = () => {
        if (!visible) setMounted(false);
    };

    if (!mounted || !alert) return null;

    const isOver = alert.type === 'over';

    return (
        <div
            onTransitionEnd={handleTransitionEnd}
            className={`fixed top-5 right-5 z-[200] w-80 rounded-2xl shadow-xl border p-4 transition-all duration-300 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
            } ${isOver ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isOver ? 'bg-red-100' : 'bg-amber-100'
                }`}>
                    <AlertTriangle size={18} className={isOver ? 'text-red-600' : 'text-amber-600'} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isOver ? 'text-red-800' : 'text-amber-800'}`}>
                        {isOver ? 'Anggaran Terlampaui!' : 'Anggaran Hampir Habis!'}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        <span className="font-semibold">{alert.category}</span>
                        {' '}sudah terpakai{' '}
                        <span className={`font-bold ${isOver ? 'text-red-600' : 'text-amber-600'}`}>
                            {alert.percentage}%
                        </span>
                        {' '}dari anggaran bulan ini.
                    </p>
                </div>

                {/* Close */}
                <button
                    onClick={() => setVisible(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-colors shrink-0"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-1.5 w-full rounded-full bg-white/70 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                        width: Math.min(alert.percentage, 100) + '%',
                        backgroundColor: isOver ? '#ef4444' : '#f59e0b',
                    }}
                />
            </div>

            {/* Auto-dismiss indicator */}
            <div className={`mt-2 h-0.5 w-full rounded-full origin-left ${
                isOver ? 'bg-red-200' : 'bg-amber-200'
            }`}>
                <div
                    className={`h-full rounded-full transition-none ${
                        isOver ? 'bg-red-400' : 'bg-amber-400'
                    } ${visible ? 'w-0 transition-all duration-[6000ms] ease-linear' : 'w-full'}`}
                />
            </div>
        </div>
    );
}
