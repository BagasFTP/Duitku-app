import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Landmark, Banknote, Wallet, ArrowUpRight } from 'lucide-react';

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
    const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash;
    const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

    const handleDelete = (w: WalletData) => {
        if (!confirm('Hapus dompet ' + w.name + '?')) return;
        router.delete('/wallets/' + w.id, { preserveScroll: true });
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
                    <Link
                        href="/wallets/create"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus size={16} /> Tambah
                    </Link>
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
        </AppLayout>
    );
}
