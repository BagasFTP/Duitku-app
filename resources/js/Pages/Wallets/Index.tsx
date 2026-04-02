import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';
import { Plus, Pencil, Trash2, Landmark, Banknote, Wallet, ArrowUpRight, ArrowLeftRight, X, ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface WalletData {
    id: number;
    name: string;
    type: 'bank' | 'cash' | 'ewallet';
    balance: string;
    icon: string;
    color: string;
    transactions_count: number;
}

interface Props {
    wallets: WalletData[];
}

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const TYPE_META = {
    bank:    { label: 'Bank',     Icon: Landmark, bg: 'bg-blue-100',    text: 'text-blue-600'    },
    cash:    { label: 'Tunai',    Icon: Banknote, bg: 'bg-emerald-100', text: 'text-emerald-600' },
    ewallet: { label: 'E-Wallet', Icon: Wallet,   bg: 'bg-violet-100',  text: 'text-violet-600'  },
} as const;

export default function WalletsIndex({ wallets }: Props) {
    const flash = usePage<PageProps<{ flash?: { success?: string; error?: string } }>>().props.flash;
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const handleDelete = (w: WalletData) => {
        if (!confirm('Hapus dompet ' + w.name + '?')) return;
        router.delete('/wallets/' + w.id, { preserveScroll: true });
    };

    // --- Transfer modal ---
    const [showTransfer, setShowTransfer] = useState(false);
    const [fromId, setFromId]             = useState('');
    const [toId, setToId]                 = useState('');
    const [amount, setAmount]             = useState('');
    const [note, setNote]                 = useState('');
    const [transferring, setTransferring] = useState(false);
    const [pickerOpen, setPickerOpen]     = useState<'from' | 'to' | null>(null);
    const pickerRef                       = useRef<HTMLDivElement>(null);

    const fromWallet = wallets.find((w) => String(w.id) === fromId);
    const toWallet   = wallets.find((w) => String(w.id) === toId);
    const rawAmount  = amount.replace(/\D/g, '');

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setPickerOpen(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const closeTransfer = () => {
        setShowTransfer(false);
        setFromId(''); setToId(''); setAmount(''); setNote('');
        setPickerOpen(null);
    };

    const handleTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        setTransferring(true);
        router.post(
            '/wallets/transfer',
            { from_wallet_id: fromId, to_wallet_id: toId, amount: rawAmount, note },
            {
                onSuccess: () => closeTransfer(),
                onFinish:  () => setTransferring(false),
            },
        );
    };

    return (
        <AppLayout>
            <Head title="Dompet" />
            <div className="p-4 sm:p-6 space-y-6">

                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Dompet</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{wallets.length} dompet terdaftar</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {wallets.length >= 2 && (
                            <button
                                onClick={() => setShowTransfer(true)}
                                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                            >
                                <ArrowLeftRight size={15} /> Transfer
                            </button>
                        )}
                        <Link
                            href="/wallets/create"
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Plus size={16} /> Tambah
                        </Link>
                    </div>
                </div>

                {/* Flash messages */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{flash.error}</div>
                )}

                {/* Total balance banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-5 text-white shadow-lg shadow-indigo-200">
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-white/5" />
                    <p className="text-sm font-medium text-indigo-200 mb-1">Total Saldo</p>
                    <p className="text-3xl font-bold tracking-tight">{fmt(totalBalance)}</p>
                    <p className="text-xs text-indigo-300 mt-1">dari {wallets.length} dompet</p>
                </div>

                {/* Wallet grid */}
                {wallets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                            <Wallet size={28} className="text-slate-400" />
                        </div>
                        <p className="font-semibold text-slate-600">Belum ada dompet</p>
                        <p className="text-sm text-slate-400 mt-1">Tambahkan dompet pertamamu</p>
                        <Link
                            href="/wallets/create"
                            className="mt-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all"
                        >
                            <Plus size={15} /> Tambah Dompet
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wallets.map((w) => {
                            const meta = TYPE_META[w.type];
                            const color = w.color ?? '#6366f1';
                            return (
                                <div
                                    key={w.id}
                                    className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
                                    style={{ background: `linear-gradient(135deg, ${color}ee 0%, ${color} 100%)` }}
                                >
                                    {/* Decorative circles */}
                                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
                                    <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
                                    <div className="absolute top-10 -right-2 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />

                                    <div className="relative p-5">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm">
                                                <DynamicIcon name={w.icon} size={20} color="white" />
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {/* Type badge */}
                                                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                                                    <meta.Icon size={10} />
                                                    {meta.label}
                                                </span>
                                                {/* Actions (hover) */}
                                                <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                                                    <Link
                                                        href={'/wallets/' + w.id + '/edit'}
                                                        className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Pencil size={13} />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(w); }}
                                                        className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60 text-white transition-colors"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Wallet name */}
                                        <p className="text-sm font-medium text-white/80 mb-0.5">{w.name}</p>

                                        {/* Balance */}
                                        <p className="text-2xl font-bold text-white tracking-tight">{fmt(Number(w.balance))}</p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-5 pt-3 border-t border-white/20">
                                            <span className="text-xs text-white/60">{w.transactions_count} transaksi</span>
                                            <Link
                                                href={'/wallets/' + w.id + '/edit'}
                                                className="flex items-center gap-0.5 text-xs text-white/80 hover:text-white font-medium transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                Detail <ArrowUpRight size={12} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Add card */}
                        <Link
                            href="/wallets/create"
                            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-6 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all duration-300 min-h-[172px] group"
                        >
                            <div className="w-11 h-11 rounded-2xl border-2 border-dashed border-slate-300 group-hover:border-indigo-300 flex items-center justify-center transition-colors">
                                <Plus size={20} />
                            </div>
                            <span className="text-sm font-semibold">Tambah Dompet</span>
                        </Link>
                    </div>
                )}
            </div>

            {/* ── Transfer Modal ── */}
            {showTransfer && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">

                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <ArrowLeftRight size={16} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-800">Transfer Antar Dompet</p>
                                    <p className="text-xs text-slate-400">Pindahkan saldo antar dompetmu</p>
                                </div>
                            </div>
                            <button onClick={closeTransfer} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleTransfer} className="p-5 space-y-4">

                            {/* Wallet pickers */}
                            <div ref={pickerRef}>
                                {/* From & To row */}
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
                                    {/* FROM */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Dari</p>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setPickerOpen(pickerOpen === 'from' ? null : 'from')}
                                                className={`w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                                    pickerOpen === 'from'
                                                        ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white'
                                                        : fromWallet
                                                        ? 'border-slate-200 bg-white hover:border-indigo-300'
                                                        : 'border-dashed border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
                                                }`}
                                            >
                                                {fromWallet ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: fromWallet.color + '25' }}>
                                                            <DynamicIcon name={fromWallet.icon} size={15} style={{ color: fromWallet.color }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{fromWallet.name}</p>
                                                            <p className="text-xs text-slate-400 truncate">{fmt(Number(fromWallet.balance))}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-slate-400 flex-1">Pilih dompet</p>
                                                )}
                                                <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform ${pickerOpen === 'from' ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* FROM dropdown */}
                                            {pickerOpen === 'from' && (
                                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-10 overflow-hidden">
                                                    {wallets.filter((w) => String(w.id) !== toId).map((w) => (
                                                        <button
                                                            key={w.id}
                                                            type="button"
                                                            onClick={() => { setFromId(String(w.id)); setPickerOpen(null); }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: w.color + '25' }}>
                                                                <DynamicIcon name={w.icon} size={14} style={{ color: w.color }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-slate-800 truncate">{w.name}</p>
                                                                <p className="text-xs text-slate-400">{fmt(Number(w.balance))}</p>
                                                            </div>
                                                            {String(w.id) === fromId && <Check size={13} className="text-indigo-600 shrink-0" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 mb-0.5">
                                        <ArrowLeftRight size={13} className="text-indigo-600" />
                                    </div>

                                    {/* TO */}
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ke</p>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setPickerOpen(pickerOpen === 'to' ? null : 'to')}
                                                className={`w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                                                    pickerOpen === 'to'
                                                        ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white'
                                                        : toWallet
                                                        ? 'border-slate-200 bg-white hover:border-indigo-300'
                                                        : 'border-dashed border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50'
                                                }`}
                                            >
                                                {toWallet ? (
                                                    <>
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: toWallet.color + '25' }}>
                                                            <DynamicIcon name={toWallet.icon} size={15} style={{ color: toWallet.color }} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 truncate">{toWallet.name}</p>
                                                            <p className="text-xs text-slate-400 truncate">{fmt(Number(toWallet.balance))}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <p className="text-xs text-slate-400 flex-1">Pilih dompet</p>
                                                )}
                                                <ChevronDown size={13} className={`shrink-0 text-slate-400 transition-transform ${pickerOpen === 'to' ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* TO dropdown */}
                                            {pickerOpen === 'to' && (
                                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-10 overflow-hidden">
                                                    {wallets.filter((w) => String(w.id) !== fromId).map((w) => (
                                                        <button
                                                            key={w.id}
                                                            type="button"
                                                            onClick={() => { setToId(String(w.id)); setPickerOpen(null); }}
                                                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: w.color + '25' }}>
                                                                <DynamicIcon name={w.icon} size={14} style={{ color: w.color }} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-slate-800 truncate">{w.name}</p>
                                                                <p className="text-xs text-slate-400">{fmt(Number(w.balance))}</p>
                                                            </div>
                                                            {String(w.id) === toId && <Check size={13} className="text-indigo-600 shrink-0" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Jumlah + saldo hint */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Jumlah Transfer</label>
                                    {fromWallet && (
                                        <span className="text-xs text-slate-400">
                                            Tersedia: <span className="font-semibold text-slate-600">{fmt(Number(fromWallet.balance))}</span>
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={rawAmount ? new Intl.NumberFormat('id-ID').format(Number(rawAmount)) : ''}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0"
                                        required
                                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Catatan */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Catatan <span className="text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Contoh: Bayar tagihan"
                                    maxLength={255}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition placeholder-slate-300"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={closeTransfer}
                                    className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={transferring || !fromId || !toId || !rawAmount}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <ArrowLeftRight size={14} />
                                    {transferring ? 'Memproses...' : 'Transfer Sekarang'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
