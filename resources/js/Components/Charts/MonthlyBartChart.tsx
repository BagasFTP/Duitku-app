interface Props {
    income: number;
    expense: number;
    monthName: string;
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const formatCompact = (value: number) =>
    new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

export default function MonthlyBartChart({ income, expense, monthName }: Props) {
    const net = income - expense;
    const maxVal = Math.max(income, expense, 1);
    const incomeWidth = Math.min((income / maxVal) * 100, 100);
    const expenseWidth = Math.min((expense / maxVal) * 100, 100);
    const savingRate = income > 0 ? Math.round((net / income) * 100) : 0;

    return (
        <div className="space-y-5">
            {/* Income Row */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">Pemasukan</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-emerald-600">{formatCompact(income)}</span>
                    </div>
                </div>
                <div className="h-2.5 bg-emerald-50 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${incomeWidth}%`,
                            background: 'linear-gradient(90deg, #34d399, #10b981)',
                        }}
                    />
                </div>
            </div>

            {/* Expense Row */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 2V10M6 10L2 6M6 10L10 6" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-600">Pengeluaran</span>
                    </div>
                    <div className="text-right">
                        <span className="text-sm font-bold text-rose-500">{formatCompact(expense)}</span>
                    </div>
                </div>
                <div className="h-2.5 bg-rose-50 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${expenseWidth}%`,
                            background: 'linear-gradient(90deg, #fb7185, #f43f5e)',
                        }}
                    />
                </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100" />

            {/* Net Savings */}
            <div className={`rounded-xl p-3 flex items-center justify-between ${net >= 0 ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100' : 'bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100'}`}>
                <div>
                    <p className="text-xs text-slate-500 mb-0.5">{net >= 0 ? 'Tabungan bulan ini' : 'Defisit bulan ini'}</p>
                    <p className={`text-base font-bold ${net >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                        {net >= 0 ? '+' : ''}{formatRupiah(net)}
                    </p>
                </div>
                {income > 0 && (
                    <div className={`text-center px-3 py-1.5 rounded-lg ${net >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                        <p className={`text-lg font-bold leading-none ${net >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {savingRate}%
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {net >= 0 ? 'disimpan' : 'lebih'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
