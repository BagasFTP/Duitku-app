import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import DatePicker from '@/Components/DatePicker';
import { Head, router, usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';
import {
    Plus, Pencil, Trash2, X, Target, CheckCircle2,
    CalendarDays, Wallet, AlertTriangle, Trophy, PiggyBank,
} from 'lucide-react';
import { useState } from 'react';

interface SavingsGoal {
    id: number;
    name: string;
    icon: string;
    color: string;
    target_amount: string;
    current_amount: string;
    deadline: string | null;
    notes: string | null;
    is_completed: boolean;
}

interface WalletOption {
    id: number;
    name: string;
    balance: string;
    icon: string;
    color: string;
}

interface Props {
    goals: SavingsGoal[];
    wallets: WalletOption[];
}

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
    if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1) + ' jt';
    if (v >= 1_000)     return 'Rp ' + (v / 1_000).toFixed(0) + ' rb';
    return fmt(v);
};

const ICON_OPTIONS = [
    'Target','Home','Car','Plane','Smartphone','GraduationCap',
    'Heart','Gift','ShoppingBag','Laptop','Baby','Umbrella',
    'Bike','Music','Camera','Book',
];
const COLOR_OPTIONS = [
    '#6366f1','#8b5cf6','#ec4899','#ef4444','#f97316',
    '#eab308','#22c55e','#14b8a6','#3b82f6','#06b6d4',
];

type ModalMode = 'create' | 'edit' | 'contribute' | null;

const emptyForm = { name: '', icon: 'Target', color: '#6366f1', target_amount: '', deadline: '', notes: '' };

export default function SavingsGoalsIndex({ goals, wallets }: Props) {
    const flash = usePage<PageProps<{ flash?: { success?: string; error?: string } }>>().props.flash;

    const [modal, setModal]               = useState<ModalMode>(null);
    const [selected, setSelected]         = useState<SavingsGoal | null>(null);
    const [form, setForm]                 = useState(emptyForm);
    const [contribAmount, setContribAmount] = useState('');
    const [contribWallet, setContribWallet] = useState('');
    const [contribNote, setContribNote]   = useState('');
    const [saving, setSaving]             = useState(false);

    const openCreate = () => {
        setForm(emptyForm);
        setSelected(null);
        setModal('create');
    };

    const openEdit = (g: SavingsGoal) => {
        setSelected(g);
        setForm({
            name:          g.name,
            icon:          g.icon,
            color:         g.color,
            target_amount: String(Math.round(Number(g.target_amount))),
            deadline:      g.deadline ?? '',
            notes:         g.notes ?? '',
        });
        setModal('edit');
    };

    const openContrib = (g: SavingsGoal) => {
        setSelected(g);
        setContribAmount('');
        setContribWallet('');
        setContribNote('');
        setModal('contribute');
    };

    const closeModal = () => { setModal(null); setSelected(null); };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            name:          form.name,
            icon:          form.icon,
            color:         form.color,
            target_amount: form.target_amount.replace(/\D/g, ''),
            deadline:      form.deadline || null,
            notes:         form.notes || null,
        };
        if (modal === 'create') {
            router.post('/savings', payload, { onSuccess: closeModal, onFinish: () => setSaving(false) });
        } else if (modal === 'edit' && selected) {
            router.put('/savings/' + selected.id, payload, { onSuccess: closeModal, onFinish: () => setSaving(false) });
        }
    };

    const handleContrib = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        setSaving(true);
        router.post(
            '/savings/' + selected.id + '/contribute',
            { amount: contribAmount.replace(/\D/g, ''), wallet_id: contribWallet || null, note: contribNote || null },
            { onSuccess: closeModal, onFinish: () => setSaving(false) },
        );
    };

    const handleDelete = (g: SavingsGoal) => {
        if (!confirm('Hapus target "' + g.name + '"?')) return;
        router.delete('/savings/' + g.id, { preserveScroll: true });
    };

    const active       = goals.filter((g) => !g.is_completed);
    const completed    = goals.filter((g) => g.is_completed);
    const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount), 0);
    const totalTarget  = goals.reduce((s, g) => s + Number(g.target_amount), 0);
    const totalPct     = totalTarget > 0 ? Math.min(Math.round((totalCurrent / totalTarget) * 100), 100) : 0;

    return (
        <AppLayout>
            <Head title="Target Nabung" />
            <div className="p-4 sm:p-6 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Target Nabung</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Pantau dan capai tujuan keuanganmu</p>
                    </div>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Plus size={16} /> Tambah Target
                    </button>
                </div>

                {/* Flash */}
                {flash?.success && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                        <CheckCircle2 size={15} className="shrink-0" /> {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                        <AlertTriangle size={15} className="shrink-0" /> {flash.error}
                    </div>
                )}

                {/* Summary banner */}
                {goals.length > 0 && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-5 text-white shadow-lg shadow-indigo-200">
                        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                        <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
                        <div className="relative">
                            <div className="flex items-end justify-between mb-3">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <PiggyBank size={15} className="text-indigo-300" />
                                        <p className="text-xs font-medium text-indigo-200">Total Terkumpul</p>
                                    </div>
                                    <p className="text-3xl font-bold tracking-tight">{fmt(totalCurrent)}</p>
                                    <p className="text-xs text-indigo-300 mt-0.5">dari {fmt(totalTarget)} total target</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-3xl font-bold ${totalPct >= 100 ? 'text-emerald-300' : totalPct >= 80 ? 'text-amber-300' : 'text-white'}`}>
                                        {totalPct}%
                                    </p>
                                    <p className="text-xs text-indigo-300">{active.length} aktif · {completed.length} tercapai</p>
                                </div>
                            </div>
                            <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: totalPct + '%', backgroundColor: totalPct >= 100 ? '#6ee7b7' : '#a5b4fc' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {goals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="relative mb-5">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Target size={36} className="text-white" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                                <Plus size={14} className="text-white" />
                            </div>
                        </div>
                        <p className="font-bold text-slate-700 text-lg">Belum ada target tabungan</p>
                        <p className="text-sm text-slate-400 mt-1 mb-6 max-w-xs">Tetapkan tujuan keuanganmu dan pantau progressnya setiap hari</p>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                        >
                            <Plus size={15} /> Buat Target Pertama
                        </button>
                    </div>
                )}

                {/* Active goals */}
                {active.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {active.map((g) => {
                            const current   = Number(g.current_amount);
                            const target    = Number(g.target_amount);
                            const pct       = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
                            const remaining = target - current;
                            const color     = g.color;

                            return (
                                <div
                                    key={g.id}
                                    className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                                    style={{ background: `linear-gradient(135deg, ${color}dd 0%, ${color} 100%)` }}
                                >
                                    {/* Decorative circles */}
                                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
                                    <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/10 pointer-events-none" />
                                    <div className="absolute top-10 -right-2 w-14 h-14 rounded-full bg-white/5 pointer-events-none" />

                                    <div className="relative p-5">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-sm shrink-0">
                                                    <DynamicIcon name={g.icon} size={20} color="white" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-base leading-tight">{g.name}</p>
                                                    {g.deadline && (
                                                        <p className="text-xs text-white/70 flex items-center gap-1 mt-0.5">
                                                            <CalendarDays size={10} />
                                                            {new Date(g.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Action buttons — appear on hover */}
                                            <div className="hidden group-hover:flex items-center gap-0.5">
                                                <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(g)} className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/60 text-white transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Amount */}
                                        <p className="text-2xl font-bold text-white tracking-tight">{fmtShort(current)}</p>
                                        <p className="text-xs text-white/70 mt-0.5">dari {fmt(target)}</p>

                                        {/* Progress bar */}
                                        <div className="mt-4 mb-1">
                                            <div className="h-2 w-full bg-white/25 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-white transition-all duration-700"
                                                    style={{ width: pct + '%' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-xs text-white/70">
                                                Sisa: <span className="font-semibold text-white">{fmtShort(remaining)}</span>
                                            </p>
                                            <span className="text-sm font-bold text-white">{pct}%</span>
                                        </div>

                                        {/* Contribute button */}
                                        <button
                                            onClick={() => openContrib(g)}
                                            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors border border-white/20"
                                        >
                                            <Plus size={13} /> Tambah Tabungan
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Completed goals */}
                {completed.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Trophy size={15} className="text-amber-500" />
                            <p className="text-sm font-bold text-slate-600">Tercapai ({completed.length})</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {completed.map((g) => (
                                <div
                                    key={g.id}
                                    className="relative overflow-hidden rounded-2xl p-4 flex items-center gap-3"
                                    style={{ background: `linear-gradient(135deg, ${g.color}22 0%, ${g.color}15 100%)`, border: `1px solid ${g.color}30` }}
                                >
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: g.color + '20' }}>
                                        <DynamicIcon name={g.icon} size={18} style={{ color: g.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700">{g.name}</p>
                                        <p className="text-xs text-emerald-600 font-semibold">{fmt(Number(g.target_amount))} ✓</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <CheckCircle2 size={15} className="text-emerald-500" />
                                        </div>
                                        <button onClick={() => handleDelete(g)} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Create / Edit Modal ── */}
            {(modal === 'create' || modal === 'edit') && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                                    <Target size={16} className="text-indigo-600" />
                                </div>
                                <p className="text-base font-bold text-slate-800">
                                    {modal === 'create' ? 'Buat Target Baru' : 'Edit Target'}
                                </p>
                            </div>
                            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nama Target</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="Contoh: Beli Laptop, DP Rumah"
                                    required
                                    maxLength={100}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition placeholder-slate-300"
                                />
                            </div>

                            {/* Target Amount */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Jumlah Target</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={form.target_amount ? new Intl.NumberFormat('id-ID').format(Number(form.target_amount.replace(/\D/g, ''))) : ''}
                                        onChange={(e) => setForm({ ...form, target_amount: e.target.value.replace(/\D/g, '') })}
                                        placeholder="0"
                                        required
                                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition placeholder-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Icon picker */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ikon</label>
                                <div className="flex flex-wrap gap-2">
                                    {ICON_OPTIONS.map((ic) => (
                                        <button
                                            key={ic}
                                            type="button"
                                            onClick={() => setForm({ ...form, icon: ic })}
                                            className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${
                                                form.icon === ic
                                                    ? 'border-indigo-500 bg-indigo-50'
                                                    : 'border-slate-200 hover:border-indigo-300 bg-white'
                                            }`}
                                        >
                                            <DynamicIcon name={ic} size={18} style={{ color: form.icon === ic ? form.color : '#94a3b8' }} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Color picker */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Warna</label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_OPTIONS.map((c) => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setForm({ ...form, color: c })}
                                            className={`w-8 h-8 rounded-full border-4 transition-all ${form.color === c ? 'border-slate-400 scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Deadline */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Deadline <span className="text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <DatePicker
                                    value={form.deadline}
                                    onChange={(val) => setForm({ ...form, deadline: val })}
                                />
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Catatan <span className="text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    placeholder="Motivasi atau catatan tambahan..."
                                    maxLength={500}
                                    rows={2}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition placeholder-slate-300 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !form.name || !form.target_amount}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 transition-all"
                                >
                                    <Target size={14} />
                                    {saving ? 'Menyimpan...' : modal === 'create' ? 'Buat Target' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Contribute Modal ── */}
            {modal === 'contribute' && selected && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-2xl flex items-center justify-center" style={{ backgroundColor: selected.color + '20' }}>
                                    <DynamicIcon name={selected.icon} size={17} style={{ color: selected.color }} />
                                </div>
                                <div>
                                    <p className="text-base font-bold text-slate-800">Tambah Tabungan</p>
                                    <p className="text-xs text-slate-400">{selected.name}</p>
                                </div>
                            </div>
                            <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleContrib} className="p-5 space-y-4">
                            {/* Progress recap */}
                            <div className="bg-slate-50 rounded-xl p-3">
                                <div className="flex justify-between text-xs mb-1.5">
                                    <span className="text-slate-500">Terkumpul</span>
                                    <span className="font-bold text-slate-700">
                                        {fmtShort(Number(selected.current_amount))} / {fmtShort(Number(selected.target_amount))}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: Math.min(Math.round((Number(selected.current_amount) / Number(selected.target_amount)) * 100), 100) + '%',
                                            backgroundColor: selected.color,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Jumlah Tabungan</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={contribAmount ? new Intl.NumberFormat('id-ID').format(Number(contribAmount.replace(/\D/g, ''))) : ''}
                                        onChange={(e) => setContribAmount(e.target.value)}
                                        placeholder="0"
                                        required
                                        className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition placeholder-slate-300"
                                    />
                                </div>
                            </div>

                            {/* Wallet (optional) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Kurangi dari dompet <span className="text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <div className="space-y-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setContribWallet('')}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                                            contribWallet === '' ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                            <Wallet size={13} className="text-slate-400" />
                                        </div>
                                        <span className="text-slate-500 text-xs">Tidak dari dompet (manual)</span>
                                    </button>
                                    {wallets.map((w) => (
                                        <button
                                            key={w.id}
                                            type="button"
                                            onClick={() => setContribWallet(String(w.id))}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all ${
                                                contribWallet === String(w.id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: w.color + '25' }}>
                                                <DynamicIcon name={w.icon} size={13} style={{ color: w.color }} />
                                            </div>
                                            <span className="flex-1 text-left text-xs font-semibold text-slate-700">{w.name}</span>
                                            <span className="text-xs text-slate-400">{fmtShort(Number(w.balance))}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                    Catatan <span className="text-slate-400 font-normal normal-case">(opsional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={contribNote}
                                    onChange={(e) => setContribNote(e.target.value)}
                                    placeholder="Contoh: Gajian bulan ini"
                                    maxLength={255}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition placeholder-slate-300"
                                />
                            </div>

                            <div className="flex gap-3 pt-1">
                                <button type="button" onClick={closeModal} className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !contribAmount.replace(/\D/g, '')}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                                >
                                    <Plus size={14} />
                                    {saving ? 'Menyimpan...' : 'Tambah Tabungan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
