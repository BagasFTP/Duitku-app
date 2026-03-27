import AppLayout from '@/Layouts/AppLayout';
import WalletForm, { WalletFormData } from '@/Components/WalletForm';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { ChevronLeft, Save, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

interface Wallet {
    id: number;
    name: string;
    type: 'bank' | 'cash' | 'ewallet';
    balance: string;
    icon: string;
    color: string;
}

interface Props {
    wallet: Wallet;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function WalletEdit({ wallet }: Props) {
    const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash;

    // --- Info form ---
    const { data, setData, put, processing, errors } = useForm<WalletFormData>({
        name: wallet.name,
        type: wallet.type,
        balance: wallet.balance,
        icon: wallet.icon,
        color: wallet.color,
    });

    const handleChange = (field: string, value: string) => {
        setData(field as keyof WalletFormData, value as any);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put('/wallets/' + wallet.id);
    };

    // --- Adjust form ---
    const [newBalance, setNewBalance] = useState('');
    const [note, setNote] = useState('');
    const [adjusting, setAdjusting] = useState(false);

    const handleAdjust = (e: React.FormEvent) => {
        e.preventDefault();
        setAdjusting(true);
        router.post(
            '/wallets/' + wallet.id + '/adjust',
            { new_balance: newBalance.replace(/\D/g, ''), note },
            {
                onSuccess: () => { setNewBalance(''); setNote(''); },
                onFinish: () => setAdjusting(false),
            },
        );
    };

    const rawNew = newBalance.replace(/\D/g, '');
    const currentBalance = Number(wallet.balance);
    const diff = rawNew ? Number(rawNew) - currentBalance : null;

    return (
        <AppLayout>
            <Head title="Edit Dompet" />
            <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <a
                        href="/wallets"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </a>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Edit Dompet</h1>
                        <p className="text-xs text-slate-500 mt-0.5">{wallet.name}</p>
                    </div>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{flash.error}</div>
                )}

                {/* Balance adjustment card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                            <SlidersHorizontal size={15} className="text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Edit Saldo</p>
                            <p className="text-xs text-slate-500">Saldo saat ini: <span className="font-semibold text-slate-700">{fmt(currentBalance)}</span></p>
                        </div>
                    </div>

                    <form onSubmit={handleAdjust} className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">Saldo Baru</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">Rp</span>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={newBalance ? new Intl.NumberFormat('id-ID').format(Number(newBalance.replace(/\D/g, ''))) : ''}
                                    onChange={(e) => setNewBalance(e.target.value.replace(/\D/g, ''))}
                                    placeholder={new Intl.NumberFormat('id-ID').format(currentBalance)}
                                    className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition placeholder-slate-400"
                                />
                            </div>
                            {/* Diff preview */}
                            {diff !== null && diff !== 0 && (
                                <p className={`mt-1.5 text-xs font-semibold ${diff > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {diff > 0 ? '+' : ''}{fmt(diff)} dari saldo saat ini
                                </p>
                            )}
                            {diff === 0 && rawNew && (
                                <p className="mt-1.5 text-xs text-slate-400">Saldo tidak berubah</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1.5">
                                Catatan <span className="text-slate-400 font-normal">(opsional)</span>
                            </label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Contoh: Koreksi saldo awal"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition placeholder-slate-400"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={adjusting || !rawNew || diff === 0}
                            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-amber-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <SlidersHorizontal size={15} />
                            {adjusting ? 'Menyimpan...' : 'Sesuaikan Saldo'}
                        </button>
                    </form>
                </div>

                {/* Info edit form */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
                    <p className="text-sm font-bold text-slate-700">Info Dompet</p>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <WalletForm
                            data={data}
                            errors={errors}
                            onChange={handleChange}
                            showBalance={false}
                        />

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Save size={16} />
                            {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
