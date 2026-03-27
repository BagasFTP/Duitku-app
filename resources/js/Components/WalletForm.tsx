import DynamicIcon from '@/Components/DynamicIcon';
import { Landmark, Banknote, Wallet } from 'lucide-react';

export interface WalletFormData {
    name: string;
    type: 'bank' | 'cash' | 'ewallet';
    balance: string;
    icon: string;
    color: string;
    [key: string]: string;
}

interface Props {
    data: WalletFormData;
    errors: Partial<Record<string, string>>;
    onChange: (field: string, value: string) => void;
    showBalance?: boolean;
}

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899',
    '#64748b', '#78716c', '#15803d', '#1d4ed8', '#7c3aed',
];

const ICONS = [
    'wallet', 'credit-card', 'landmark', 'banknote', 'coins',
    'piggy-bank', 'briefcase', 'circle-dollar-sign', 'smartphone', 'bitcoin',
    'trending-up', 'trending-down', 'shopping-bag', 'gift', 'star',
    'shield', 'lock', 'home', 'building-2', 'zap',
];

const WALLET_TYPES = [
    { value: 'bank',    label: 'Bank',     Icon: Landmark, active: 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-200',    hover: 'hover:border-blue-300 hover:text-blue-600' },
    { value: 'cash',    label: 'Tunai',    Icon: Banknote, active: 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200', hover: 'hover:border-emerald-300 hover:text-emerald-600' },
    { value: 'ewallet', label: 'E-Wallet', Icon: Wallet,   active: 'bg-violet-500 border-violet-500 text-white shadow-md shadow-violet-200',  hover: 'hover:border-violet-300 hover:text-violet-600' },
] as const;

const inputClass =
    'w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-slate-400';

const labelClass = 'block text-sm font-medium text-slate-600 mb-1.5';

export default function WalletForm({ data, errors, onChange, showBalance = true }: Props) {
    return (
        <div className="space-y-5">

            {/* Type */}
            <div>
                <label className={labelClass}>Jenis Dompet</label>
                <div className="grid grid-cols-3 gap-3">
                    {WALLET_TYPES.map(({ value, label, Icon, active, hover }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => onChange('type', value)}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${
                                data.type === value ? active : `bg-white border-slate-200 text-slate-500 ${hover}`
                            }`}
                        >
                            <Icon size={15} /> {label}
                        </button>
                    ))}
                </div>
                {errors.type && <p className="mt-1 text-xs text-red-500">{errors.type}</p>}
            </div>

            {/* Name */}
            <div>
                <label className={labelClass}>Nama Dompet</label>
                <input
                    type="text"
                    value={data.name}
                    onChange={(e) => onChange('name', e.target.value)}
                    placeholder="Contoh: BCA, Dompet Tunai, GoPay"
                    className={inputClass}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Balance (create only) */}
            {showBalance && (
                <div>
                    <label className={labelClass}>Saldo Awal</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={data.balance ? new Intl.NumberFormat('id-ID').format(Number(data.balance)) : ''}
                            onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                onChange('balance', raw);
                            }}
                            placeholder="0"
                            className={`${inputClass} pl-10`}
                        />
                    </div>
                    {errors.balance && <p className="mt-1 text-xs text-red-500">{errors.balance}</p>}
                </div>
            )}

            {/* Color */}
            <div>
                <label className={labelClass}>Warna</label>
                <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => onChange('color', c)}
                            className="w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-110"
                            style={{
                                backgroundColor: c,
                                borderColor: data.color === c ? '#fff' : c,
                                outline: data.color === c ? `3px solid ${c}` : 'none',
                                outlineOffset: '2px',
                            }}
                        />
                    ))}
                    <label className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors overflow-hidden">
                        <input
                            type="color"
                            value={data.color || '#6366f1'}
                            onChange={(e) => onChange('color', e.target.value)}
                            className="opacity-0 absolute w-px h-px"
                        />
                        <span className="text-slate-400 text-xs">+</span>
                    </label>
                </div>
                {errors.color && <p className="mt-1 text-xs text-red-500">{errors.color}</p>}
            </div>

            {/* Icon picker */}
            <div>
                <label className={labelClass}>Icon</label>
                <div className="grid grid-cols-8 sm:grid-cols-10 gap-2">
                    {ICONS.map((icon) => {
                        const isActive = data.icon === icon;
                        return (
                            <button
                                key={icon}
                                type="button"
                                onClick={() => onChange('icon', icon)}
                                className={`w-full aspect-square rounded-xl flex items-center justify-center border-2 transition-all duration-150 hover:scale-110 ${
                                    isActive
                                        ? 'border-indigo-400 bg-indigo-50'
                                        : 'border-slate-100 bg-white hover:border-slate-300'
                                }`}
                                style={isActive ? { borderColor: data.color || '#6366f1', backgroundColor: (data.color || '#6366f1') + '15' } : {}}
                                title={icon}
                            >
                                <DynamicIcon
                                    name={icon}
                                    size={18}
                                    style={{ color: isActive ? (data.color || '#6366f1') : '#94a3b8' }}
                                />
                            </button>
                        );
                    })}
                </div>
                {errors.icon && <p className="mt-1 text-xs text-red-500">{errors.icon}</p>}
            </div>
        </div>
    );
}
