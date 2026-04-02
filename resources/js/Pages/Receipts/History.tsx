import AppLayout from '@/Layouts/AppLayout';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import {
    ArrowLeft, ScanLine, CheckCircle2, Clock, Trash2, Receipt,
    Wallet as WalletIcon, Calendar, ChevronLeft, ChevronRight, X, Loader2, Tag,
} from 'lucide-react';
import DynamicIcon from '@/Components/DynamicIcon';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
}

interface Wallet {
    id: number;
    name: string;
    icon: string;
    color: string;
}

interface ReceiptScan {
    id: number;
    amount: number;
    description: string | null;
    date: string;
    status: 'pending' | 'saved';
    image_url: string | null;
    category: Category | null;
    transaction: { id: number } | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    scans: Paginated<ReceiptScan>;
    wallets: Wallet[];
    categories: Category[];
}

const fmt = (n: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

// ─── Save-to-transaction modal ─────────────────────────────────────────────
interface SaveModalProps {
    scan: ReceiptScan;
    wallets: Wallet[];
    categories: Category[];
    onClose: () => void;
    onSaved: () => void;
}

function SaveModal({ scan, wallets, categories, onClose, onSaved }: SaveModalProps) {
    const [walletId, setWalletId]       = useState('');
    const [categoryId, setCategoryId]   = useState(scan.category?.id ? String(scan.category.id) : '');
    const [amount, setAmount]           = useState(String(scan.amount));
    const [description, setDescription] = useState(scan.description ?? '');
    const [date, setDate]               = useState(scan.date.slice(0, 10));
    const [loading, setLoading]         = useState(false);
    const [error, setError]             = useState<string | null>(null);

    const handleSave = async () => {
        if (!walletId) { setError('Pilih dompet terlebih dahulu.'); return; }
        setLoading(true);
        setError(null);
        try {
            await axios.post(`/receipt/${scan.id}/transaction`, {
                wallet_id:   walletId,
                category_id: categoryId || null,
                amount,
                description,
                date,
            });
            onSaved();
        } catch (err: any) {
            setError(err.response?.data?.error ?? 'Gagal menyimpan transaksi.');
        } finally {
            setLoading(false);
        }
    };

    const parseRaw    = (v: string) => v.replace(/\D/g, '');
    const formatDisp  = (raw: string) => {
        if (!raw) return '';
        const n = parseInt(raw, 10);
        return isNaN(n) ? '' : new Intl.NumberFormat('id-ID').format(n);
    };

    const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition';
    const labelCls = 'block text-xs font-medium text-slate-500 mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <Receipt size={18} className="text-indigo-500" />
                        <span className="font-semibold text-slate-700">Simpan sebagai Transaksi</span>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Amount */}
                    <div>
                        <label className={labelCls}>Jumlah</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatDisp(amount)}
                                onChange={(e) => setAmount(parseRaw(e.target.value))}
                                className={`${inputCls} pl-9`}
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className={labelCls}>Tanggal</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={inputCls}
                        />
                    </div>

                    {/* Wallet */}
                    <div>
                        <label className={labelCls}>Dompet <span className="text-red-400">*</span></label>
                        <div className="grid grid-cols-2 gap-2">
                            {wallets.map((w) => (
                                <button
                                    key={w.id}
                                    type="button"
                                    onClick={() => setWalletId(String(w.id))}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                                        walletId === String(w.id)
                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    <div
                                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                                        style={{ backgroundColor: (w.color ?? '#6366f1') + '20' }}
                                    >
                                        <DynamicIcon name={w.icon ?? 'Wallet'} size={13} style={{ color: w.color ?? '#6366f1' }} />
                                    </div>
                                    <span className="truncate">{w.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={labelCls}>Kategori <span className="text-slate-400">(opsional)</span></label>
                        <div className="grid grid-cols-3 gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryId(categoryId === String(cat.id) ? '' : String(cat.id))}
                                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-all ${
                                        categoryId === String(cat.id)
                                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                            : 'border-slate-100 text-slate-600 hover:border-slate-300'
                                    }`}
                                >
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center"
                                        style={{ backgroundColor: (cat.color ?? '#6366f1') + '20' }}
                                    >
                                        <DynamicIcon name={cat.icon} size={14} style={{ color: cat.color ?? '#6366f1' }} />
                                    </div>
                                    <span className="truncate w-full text-center">{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={labelCls}>Catatan</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Nama toko / keterangan"
                            className={inputCls}
                        />
                    </div>

                    {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
                </div>

                <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition"
                    >
                        {loading ? <><Loader2 size={14} className="animate-spin" /> Menyimpan...</> : 'Simpan Transaksi'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function ReceiptHistory({ scans, wallets, categories }: Props) {
    const [saveScan, setSaveScan]     = useState<ReceiptScan | null>(null);
    const [lightbox, setLightbox]     = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const handleDelete = (scan: ReceiptScan) => {
        if (!confirm('Hapus riwayat scan ini?')) return;
        setDeletingId(scan.id);
        router.delete(`/receipt/${scan.id}`, {
            onFinish: () => setDeletingId(null),
        });
    };

    const handleSaved = () => {
        setSaveScan(null);
        router.reload({ only: ['scans'] });
    };

    return (
        <AppLayout>
            <Head title="Riwayat Scan Struk" />

            <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/transactions/create"
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Riwayat Scan Struk</h1>
                        <p className="text-sm text-slate-500">
                            {scans.total} struk terscan · {scans.data.filter((s) => s.status === 'pending').length} belum disimpan
                        </p>
                    </div>
                    <Link
                        href="/transactions/create"
                        className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
                    >
                        <ScanLine size={14} />
                        Scan Baru
                    </Link>
                </div>

                {/* Empty state */}
                {scans.data.length === 0 && (
                    <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center shadow-sm">
                        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Receipt size={28} className="text-indigo-400" />
                        </div>
                        <p className="text-slate-700 font-semibold">Belum ada struk dipindai</p>
                        <p className="text-sm text-slate-400 mt-1 mb-4">Scan struk belanja pertamamu saat tambah transaksi</p>
                        <Link
                            href="/transactions/create"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
                        >
                            <ScanLine size={15} />
                            Scan Sekarang
                        </Link>
                    </div>
                )}

                {/* List */}
                <div className="space-y-3">
                    {scans.data.map((scan) => (
                        <div
                            key={scan.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
                        >
                            <div className="flex gap-3 p-4">
                                {/* Thumbnail */}
                                <div
                                    className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center ${scan.image_url ? 'cursor-zoom-in' : ''}`}
                                    onClick={() => scan.image_url && setLightbox(scan.image_url)}
                                >
                                    {scan.image_url ? (
                                        <img
                                            src={scan.image_url}
                                            alt="Struk"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Receipt size={24} className="text-slate-300" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-semibold text-slate-800 text-sm truncate">
                                            {scan.description || 'Tanpa keterangan'}
                                        </p>
                                        {scan.status === 'saved' ? (
                                            <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 size={11} />
                                                Tersimpan
                                            </span>
                                        ) : (
                                            <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                <Clock size={11} />
                                                Pending
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-base font-bold text-indigo-600 mt-0.5">{fmt(scan.amount)}</p>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={11} />
                                            {fmtDate(scan.date)}
                                        </span>
                                        {scan.category && (
                                            <span className="flex items-center gap-1">
                                                <Tag size={11} />
                                                {scan.category.name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="border-t border-slate-50 px-4 py-2.5 flex items-center justify-between gap-2">
                                {scan.status === 'pending' ? (
                                    <button
                                        type="button"
                                        onClick={() => setSaveScan(scan)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                                    >
                                        <WalletIcon size={13} />
                                        Simpan ke Transaksi
                                    </button>
                                ) : (
                                    <Link
                                        href="/transactions"
                                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-800 transition"
                                    >
                                        <CheckCircle2 size={13} />
                                        Lihat Transaksi
                                    </Link>
                                )}

                                <button
                                    type="button"
                                    onClick={() => handleDelete(scan)}
                                    disabled={deletingId === scan.id}
                                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 disabled:opacity-40 transition"
                                >
                                    {deletingId === scan.id
                                        ? <Loader2 size={13} className="animate-spin" />
                                        : <Trash2 size={13} />
                                    }
                                    Hapus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {scans.last_page > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-slate-400">
                            Halaman {scans.current_page} dari {scans.last_page}
                        </span>
                        <div className="flex gap-2">
                            {scans.prev_page_url && (
                                <Link
                                    href={scans.prev_page_url}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <ChevronLeft size={14} /> Prev
                                </Link>
                            )}
                            {scans.next_page_url && (
                                <Link
                                    href={scans.next_page_url}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Next <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Save modal */}
            {saveScan && (
                <SaveModal
                    scan={saveScan}
                    wallets={wallets}
                    categories={categories}
                    onClose={() => setSaveScan(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* Image lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-4"
                    onClick={() => setLightbox(null)}
                >
                    <button
                        type="button"
                        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition"
                        onClick={() => setLightbox(null)}
                    >
                        <X size={20} />
                    </button>
                    <img
                        src={lightbox}
                        alt="Struk"
                        className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </AppLayout>
    );
}
