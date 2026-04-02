import { useState, useRef, useEffect } from 'react';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    addDays, addMonths, subMonths, subDays, isSameDay, isSameMonth,
    isToday, parseISO,
} from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface Props {
    value: string;           // yyyy-MM-dd
    onChange: (val: string) => void;
    error?: string;
}

const DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function DatePicker({ value, onChange, error }: Props) {
    const selected  = value ? parseISO(value) : null;
    const [open, setOpen]       = useState(false);
    const [view, setView]       = useState(selected ?? new Date());
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const select = (day: Date) => {
        onChange(format(day, 'yyyy-MM-dd'));
    };

    // Build calendar grid
    const monthStart  = startOfMonth(view);
    const monthEnd    = endOfMonth(view);
    const gridStart   = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 });

    const days: Date[] = [];
    let cur = gridStart;
    while (cur <= gridEnd) { days.push(cur); cur = addDays(cur, 1); }

    return (
        <div className="relative" ref={ref}>
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm transition-all duration-150 ${
                    open
                        ? 'border-indigo-400 ring-2 ring-indigo-100'
                        : 'border-slate-200 hover:border-indigo-300'
                } ${error ? 'border-red-400' : ''} bg-white`}
            >
                <CalendarDays size={16} className="text-indigo-400 shrink-0" />
                <span className={`flex-1 text-left ${selected ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
                    {selected
                        ? format(selected, 'd MMMM yyyy', { locale: id })
                        : 'Pilih tanggal'}
                </span>
            </button>

            {/* Popover */}
            {open && (
                <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-150">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={() => setView(subMonths(view, 1))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <span className="text-sm font-bold text-slate-700">
                            {format(view, 'MMMM yyyy', { locale: id })}
                        </span>

                        <button
                            type="button"
                            onClick={() => setView(addMonths(view, 1))}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Day labels */}
                    <div className="grid grid-cols-7 mb-1">
                        {DAY_LABELS.map((d) => (
                            <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Days grid */}
                    <div className="grid grid-cols-7 gap-y-1">
                        {days.map((day, i) => {
                            const isSelected  = selected ? isSameDay(day, selected) : false;
                            const inMonth     = isSameMonth(day, view);
                            const todayFlag   = isToday(day);

                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => select(day)}
                                    className={`
                                        h-9 w-full rounded-xl text-xs font-medium transition-all duration-150
                                        ${isSelected
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                                            : todayFlag
                                                ? 'bg-indigo-50 text-indigo-600 font-bold'
                                                : inMonth
                                                    ? 'text-slate-700 hover:bg-slate-100'
                                                    : 'text-slate-300 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => { onChange(''); setOpen(false); }}
                            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Hapus
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onChange(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Kemarin
                            </button>
                            <button
                                type="button"
                                onClick={() => onChange(format(new Date(), 'yyyy-MM-dd'))}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                            >
                                Hari ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                disabled={!selected}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors"
                            >
                                Pilih
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
    );
}
