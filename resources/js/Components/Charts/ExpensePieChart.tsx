import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Category {
    id: number;
    name: string;
    color: string;
    icon: string;
}

interface ExpenseItem {
    category: Category | null;
    total: string | number;
}

interface Props {
    data: ExpenseItem[];
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default function ExpensePieChart({ data }: Props) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" className="opacity-40">
                    <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                    <circle cx="18" cy="18" r="6" fill="currentColor" opacity="0.3" />
                </svg>
                <span className="text-sm">Belum ada pengeluaran</span>
            </div>
        );
    }

    const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));
    const MAX_SLICES = 5;
    const top = sorted.slice(0, MAX_SLICES);
    const rest = sorted.slice(MAX_SLICES);
    const restTotal = rest.reduce((s, i) => s + Number(i.total), 0);

    const chartData = [
        ...top.map((item) => ({
            name: item.category?.name ?? 'Tanpa Kategori',
            value: Number(item.total),
            color: item.category?.color || '#6366f1',
        })),
        ...(restTotal > 0 ? [{ name: 'Lainnya', value: restTotal, color: '#cbd5e1' }] : []),
    ];

    const total = chartData.reduce((s, i) => s + i.value, 0);

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Donut Chart */}
            <div className="relative w-full" style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                            startAngle={90}
                            endAngle={450}
                            strokeWidth={0}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip
                            formatter={(value) => [formatRupiah(Number(value)), 'Pengeluaran']}
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none mb-0.5">Total</p>
                    <p className="text-sm font-bold text-slate-800 leading-none">{formatCompact(total)}</p>
                </div>
            </div>

            {/* Custom Legend */}
            <div className="w-full space-y-1.5">
                {chartData.map((item, i) => {
                    const pct = total > 0 ? (item.value / total) * 100 : 0;
                    return (
                        <div key={i} className="flex items-center gap-2 group">
                            <div
                                className="w-2.5 h-2.5 rounded-sm shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="text-xs text-slate-600 truncate font-medium">{item.name}</span>
                                    <span className="text-xs font-bold text-slate-700 ml-2 shrink-0">{pct.toFixed(0)}%</span>
                                </div>
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ width: `${pct}%`, backgroundColor: item.color }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
