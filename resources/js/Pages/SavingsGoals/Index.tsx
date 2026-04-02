import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, router, usePage } from '@inertiajs/react';
import { type PageProps } from '@/types';
import {
    Plus, Pencil, Trash2, X, Target, CheckCircle2,
    CalendarDays, Wallet, AlertTriangle, Trophy,
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

    const active    = goals.filter((g) => !g.is_completed);
    const completed = goals.filter((g) => g.is_completed);

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

                {/* Empty state */}
                {goals.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                            <Target size={28} className="text-indigo-500" />
                        </div>
                        <p className="font-semibold text-slate-600">Belum ada target tabungan</p>
                        <p className="text-sm text-slate-400 mt-1 mb-5">Mulai buat target pertamamu!</p>
                        <button
                            onClick={openCreate}
                            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md shadow-indigo-200"
                        >
                            <Plus size={15} /> Buat Target
                        </button>
                    </div>
                )}

                {/* Active goals */}
                {active.length > 0 && (
                    <div className="space-y-3">
                        {active.map((g) => {
                            const current = Number(g.current_amount);
                            const target  = Number(g.target_amount);
                            const pct     = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
                            const remaining = target - current;
                            const isNear  = pct >= 80;
                            const color   = g.color;

                            return (
                                <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + '20' }}>
                                            <DynamicIcon name={g.icon} size={22} style={{ color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="font-bold text-slate-800">{g.name}</p>
                                                    {g.deadline && (
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <CalendarDays size={11} />
                                                            Target: {new Date(g.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => openContrib(g)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Tambah tabungan">
                                                        <Plus size={15} />
                                                    </button>
                                                    <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button onClick={() => handleDelete(g)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="mt-3">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs text-slate-500">
                                                        <span className="font-bold text-slate-800">{fmtShort(current)}</span> dari {fmtShort(target)}
                                                    </span>
                                                    <span className={`text-xs font-bold ${isNear ? 'text-emerald-600' : 'text-indigo-600'}`}>{pct}%</span>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{ width: pct + '%', backgroundColor: isNear ? '#22c55e' : color }}
                                                    />
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1.5">Sisa: <span className="font-semibold text-slate-600">{fmtShort(remaining)}</span></p>
                                            </div>

                                            {g.notes && (
                                                <p className="text-xs text-slate-400 mt-2 italic">"{g.notes}"</p>
                                            )}
                                        </div>
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
                        <div className="space-y-2">
                            {completed.map((g) => (
                                <div key={g.id} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: g.color + '20' }}>
                                        <DynamicIcon name={g.icon} size={18} style={{ color: g.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700">{g.name}</p>
                                        <p className="text-xs text-emerald-600 font-medium">{fmt(Number(g.target_amount))} — Tercapai!</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                        <button onClick={() => handleDelete(g)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
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
                                <input
                                    type="date"
                                    value={form.deadline}
                                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
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
