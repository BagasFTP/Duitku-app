import DynamicIcon from '@/Components/DynamicIcon';
import DatePicker from '@/Components/DatePicker';
import ReceiptScanner from '@/Components/ReceiptScanner';
import { TrendingUp, TrendingDown, RefreshCw, CalendarClock, CalendarDays, Calendar } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: string;
}

interface Wallet {
    id: number;
    name: string;
    icon: string;
    color: string;
}

export interface TrxFormData {
    amount: string;
    type: 'income' | 'expense';
    description: string;
    date: string;
    category_id: string;
    wallet_id: string;
    is_recurring: boolean;
    recur_type: string;
    [key: string]: string | boolean;
}

interface Props {
    data: TrxFormData;
    errors: Partial<Record<string, string>>;
    categories: Category[];
    wallets: Wallet[];
    onChange: (field: string, value: string | boolean) => void;
}

const parseRaw = (display: string) => display.replace(/\D/g, '');

const formatDisplay = (raw: string) => {
    if (!raw) return '';
    const num = parseInt(raw, 10);
    if (isNaN(num)) return '';
    return new Intl.NumberFormat('id-ID').format(num);
};

const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-slate-400';

const labelClass = 'block text-sm font-medium text-slate-600 mb-1.5';

export default function TransactionForm({ data, errors, categories, wallets, onChange }: Props) {
    const filtered = categories.filter((c) => c.type === data.type);

    return (
        <div className="space-y-5">
            {/* Receipt Scanner */}
            <ReceiptScanner
                onScanned={(scanned) => {
                    onChange('amount', scanned.amount);
                    onChange('type', scanned.type);
                    onChange('description', scanned.description);
                    onChange('date', scanned.date);
                    if (scanned.category_id) onChange('category_id', scanned.category_id);
                }}
            />

            {/* Type Toggle */}
            <div>
                <label className={labelClass}>Jenis Transaksi</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => { onChange('type', 'income'); onChange('category_id', ''); }}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                            data.type === 'income'
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600'
                        }`}
                    >
                        <TrendingUp size={16} /> Pemasukan
                    </button>
                    <button
                        type="button"
                        onClick={() => { onChange('type', 'expense'); onChange('category_id', ''); }}
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                            data.type === 'expense'
                                ? 'bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-600'
                        }`}
                    >
                        <TrendingDown size={16} /> Pengeluaran
                    </button>
                </div>
            </div>

            {/* Amount */}
            <div>
                <label className={labelClass}>Jumlah</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={formatDisplay(data.amount)}
                        onChange={(e) => onChange('amount', parseRaw(e.target.value))}
                        placeholder="0"
                        className={`${inputClass} pl-10`}
                    />
                </div>
                {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
            </div>

            {/* Date */}
            <div>
                <label className={labelClass}>Tanggal</label>
                <DatePicker
                    value={data.date}
                    onChange={(val) => onChange('date', val)}
                    error={errors.date}
                />
            </div>

            {/* Category */}
            <div>
                <label className={labelClass}>Kategori</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {filtered.map((cat) => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => onChange('category_id', String(cat.id))}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-medium transition-all duration-150 ${
                                String(data.category_id) === String(cat.id)
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: (cat.color ?? '#6366f1') + '20' }}
                            >
                                <DynamicIcon name={cat.icon} size={16} style={{ color: cat.color ?? '#6366f1' }} />
                            </div>
                            <span className="truncate w-full text-center">{cat.name}</span>
                        </button>
                    ))}
                    {filtered.length === 0 && (
                        <p className="col-span-4 text-xs text-slate-400 py-2">Belum ada kategori untuk jenis ini.</p>
                    )}
                </div>
                {errors.category_id && <p className="mt-1 text-xs text-red-500">{errors.category_id}</p>}
            </div>

            {/* Wallet */}
            <div>
                <label className={labelClass}>Dompet</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {wallets.map((w) => (
                        <button
                            key={w.id}
                            type="button"
                            onClick={() => onChange('wallet_id', String(w.id))}
                            className={`flex items-center gap-2 p-3 rounded-xl border-2 text-xs font-medium transition-all duration-150 ${
                                String(data.wallet_id) === String(w.id)
                                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                        >
                            <div
                                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: (w.color ?? '#6366f1') + '20' }}
                            >
                                <DynamicIcon name={w.icon ?? 'Wallet'} size={14} style={{ color: w.color ?? '#6366f1' }} />
                            </div>
                            <span className="truncate">{w.name}</span>
                        </button>
                    ))}
                </div>
                {errors.wallet_id && <p className="mt-1 text-xs text-red-500">{errors.wallet_id}</p>}
            </div>

            {/* Description */}
            <div>
                <label className={labelClass}>Catatan <span className="text-slate-400 font-normal">(opsional)</span></label>
                <textarea
                    value={data.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    rows={2}
                    placeholder="Tulis catatan..."
                    className={inputClass}
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
            </div>

            {/* Recurring */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <div
                        onClick={() => onChange('is_recurring', !data.is_recurring)}
                        className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${
                            data.is_recurring ? 'bg-indigo-500' : 'bg-slate-300'
                        }`}
                    >
                        <span
                            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                                data.is_recurring ? 'translate-x-5' : 'translate-x-1'
                            }`}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <RefreshCw size={15} className="text-indigo-400" />
                        Transaksi berulang
                    </div>
                </label>

                {data.is_recurring && (
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { value: 'daily',   label: 'Harian',   icon: CalendarClock },
                            { value: 'weekly',  label: 'Mingguan', icon: CalendarDays  },
                            { value: 'monthly', label: 'Bulanan',  icon: Calendar      },
                        ].map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => onChange('recur_type', value)}
                                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all duration-150 ${
                                    data.recur_type === value
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200'
                                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                }`}
                            >
                                <Icon size={16} />
                                {label}
                            </button>
                        ))}
                    </div>
                )}
                {errors.recur_type && <p className="mt-1 text-xs text-red-500">{errors.recur_type}</p>}
            </div>
        </div>
    );
}
