import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Filter, Trash2, Pencil, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useState } from 'react';

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

interface Transaction {
    id: number;
    amount: string;
    type: 'income' | 'expense';
    description: string;
    date: string;
    is_recurring: boolean;
    recur_type: string | null;
    category: Category | null;
    wallet: Wallet | null;
}

interface PaginatedTransactions {
    data: Transaction[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Filters {
    month?: string;
    year?: string;
    type?: string;
    category_id?: string;
    wallet_id?: string;
}

interface Props {
    transactions: PaginatedTransactions;
    categories: Category[];
    wallets: Wallet[];
    filters: Filters;
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

const MONTHS = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function TransactionsIndex({ transactions, categories, wallets, filters }: Props) {
    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = props.flash;

    const now = new Date();
    const [localFilters, setLocalFilters] = useState<Filters>({
        month: filters.month ?? String(now.getMonth() + 1),
        year:  filters.year  ?? String(now.getFullYear()),
        type:        filters.type        ?? '',
        category_id: filters.category_id ?? '',
        wallet_id:   filters.wallet_id   ?? '',
    });

    const applyFilters = (updated: Filters) => {
        setLocalFilters(updated);
        const params: Record<string, string> = {};
        Object.entries(updated).forEach(([k, v]) => { if (v) params[k] = v; });
        router.get('/transactions', params, { preserveState: true, replace: true });
    };

    const handleDelete = (trx: Transaction) => {
        if (!confirm(`Hapus transaksi "${trx.description || trx.category?.name || 'ini'}"?`)) return;
        router.delete(`/transactions/${trx.id}`, { preserveScroll: true });
    };

    const totalIncome  = transactions.data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const totalExpense = transactions.data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

    return (
        <AppLayout>
            <Head title="Transaksi" />

            <div className="p-4 sm:p-6 space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Transaksi</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Kelola semua transaksi keuangan kamu</p>
                    </div>
                    <Link
                        href="/transactions/create"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus size={16} /> Tambah
                    </Link>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                        {flash.success}
                    </div>
                )}

                {/* Filters */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 mb-1">
                        <Filter size={14} /> Filter
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <select
                            value={localFilters.month}
                            onChange={(e) => applyFilters({ ...localFilters, month: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i} value={String(i + 1)}>{m}</option>
                            ))}
                        </select>

                        <select
                            value={localFilters.year}
                            onChange={(e) => applyFilters({ ...localFilters, year: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - i).map((y) => (
                                <option key={y} value={String(y)}>{y}</option>
                            ))}
                        </select>

                        <select
                            value={localFilters.type}
                            onChange={(e) => applyFilters({ ...localFilters, type: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            <option value="">Semua Jenis</option>
                            <option value="income">Pemasukan</option>
                            <option value="expense">Pengeluaran</option>
                        </select>

                        <select
                            value={localFilters.category_id}
                            onChange={(e) => applyFilters({ ...localFilters, category_id: e.target.value })}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                            <option value="">Semua Kategori</option>
                            {categories.map((c) => (
                                <option key={c.id} value={String(c.id)}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 text-white shadow-md shadow-emerald-100 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={15} className="text-white/80" />
                            <span className="text-xs font-medium text-white/80">Pemasukan</span>
                        </div>
                        <p className="text-lg font-bold">{formatRupiah(totalIncome)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-4 text-white shadow-md shadow-rose-100 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown size={15} className="text-white/80" />
                            <span className="text-xs font-medium text-white/80">Pengeluaran</span>
                        </div>
                        <p className="text-lg font-bold">{formatRupiah(totalExpense)}</p>
                    </div>
                </div>

                {/* List */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {transactions.data.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <TrendingUp size={36} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">Belum ada transaksi</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {transactions.data.map((trx) => (
                                <div
                                    key={trx.id}
                                    className="group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors duration-150"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-150"
                                        style={{ backgroundColor: (trx.category?.color ?? '#6366f1') + '20' }}
                                    >
                                        <DynamicIcon
                                            name={trx.category?.icon ?? 'CircleDashed'}
                                            size={18}
                                            style={{ color: trx.category?.color ?? '#6366f1' }}
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-800 truncate">
                                            {trx.description || trx.category?.name || '-'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-slate-400">
                                                {format(new Date(trx.date), 'd MMM yyyy', { locale: id })}
                                            </span>
                                            {trx.wallet && (
                                                <span className="text-xs text-slate-400">· {trx.wallet.name}</span>
                                            )}
                                            {trx.is_recurring && (
                                                <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                                                    berulang
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className={`text-sm font-bold ${trx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {trx.type === 'income' ? '+' : '-'} {formatRupiah(Number(trx.amount))}
                                        </span>
                                        <div className="hidden group-hover:flex items-center gap-1 transition-all">
                                            <Link
                                                href={`/transactions/${trx.id}/edit`}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(trx)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {transactions.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            {transactions.from}–{transactions.to} dari {transactions.total} transaksi
                        </p>
                        <div className="flex gap-2">
                            {transactions.links.map((link, i) => {
                                if (link.label.includes('Previous')) {
                                    return (
                                        <Link
                                            key={i}
                                            href={link.url ?? '#'}
                                            className={`p-2 rounded-xl border text-sm transition-colors ${
                                                link.url ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-slate-100 text-slate-300 cursor-not-allowed'
                                            }`}
                                        >
                                            <ChevronLeft size={16} />
                                        </Link>
                                    );
                                }
                                if (link.label.includes('Next')) {
                                    return (
                                        <Link
                                            key={i}
                                            href={link.url ?? '#'}
                                            className={`p-2 rounded-xl border text-sm transition-colors ${
                                                link.url ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-slate-100 text-slate-300 cursor-not-allowed'
                                            }`}
                                        >
                                            <ChevronRight size={16} />
                                        </Link>
                                    );
                                }
                                return (
                                    <Link
                                        key={i}
                                        href={link.url ?? '#'}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                                            link.active
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
