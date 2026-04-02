import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { router } from '@inertiajs/react';
import {
    MessageCircle, X, Send, Trash2, Bot, User, Loader2,
    CheckCircle2, ArrowLeftRight, PiggyBank, TrendingUp, TrendingDown,
} from 'lucide-react';

interface ActionResult {
    success: boolean;
    type?: 'transaction' | 'transfer' | 'savings';
    label?: string;
    detail?: string;
    message?: string; // error message
    data?: Record<string, unknown>;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    action_result?: ActionResult | string | null;
    created_at?: string;
}

function ActionCard({ result }: { result: ActionResult }) {
    if (!result.success) {
        return (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                {result.message ?? 'Tindakan gagal.'}
            </div>
        );
    }

    const icons: Record<string, React.ReactNode> = {
        transaction: result.data?.type === 'income'
            ? <TrendingUp size={13} className="text-emerald-600" />
            : <TrendingDown size={13} className="text-rose-500" />,
        transfer: <ArrowLeftRight size={13} className="text-indigo-600" />,
        savings:  <PiggyBank size={13} className="text-violet-600" />,
    };

    const colors: Record<string, string> = {
        transaction: result.data?.type === 'income' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200',
        transfer:    'bg-indigo-50 border-indigo-200',
        savings:     'bg-violet-50 border-violet-200',
    };

    const colorCls = colors[result.type ?? ''] ?? 'bg-slate-50 border-slate-200';

    return (
        <div className={`mt-2 ${colorCls} border rounded-xl px-3 py-2.5 text-xs`}>
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-0.5">
                {icons[result.type ?? '']}
                <CheckCircle2 size={12} className="text-emerald-500" />
                {result.label}
            </div>
            {result.detail && (
                <p className="text-slate-500 pl-0.5">{result.detail}</p>
            )}
        </div>
    );
}

const parseActionResult = (raw: ActionResult | string | null | undefined): ActionResult | null => {
    if (!raw) return null;
    if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
};

export default function ChatWidget() {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const bottomRef               = useRef<HTMLDivElement>(null);
    const inputRef                = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open && !fetched) {
            axios.get('/chat/history').then((res) => {
                setMessages(res.data);
                setFetched(true);
            });
        }
    }, [open]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100);
    }, [open]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: text }]);
        setLoading(true);

        try {
            const res = await axios.post('/chat/send', { message: text });
            const newMsg: Message = {
                role:          'assistant',
                content:       res.data.reply,
                action_result: res.data.action_result ?? null,
            };
            setMessages((prev) => [...prev, newMsg]);

            // Reload halaman jika ada tindakan berhasil, agar data di UI terbaru
            if (res.data.action_result?.success) {
                setTimeout(() => router.reload({ only: ['wallets', 'summary', 'recentTransactions', 'expenseByCategory', 'budgets', 'savingsGoals'] }), 600);
            }
        } catch {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Maaf, terjadi kesalahan. Coba lagi.' }]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        if (!confirm('Hapus semua riwayat chat?')) return;
        await axios.post('/chat/clear');
        setMessages([]);
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const quickPrompts = [
        'Catat pengeluaran makan 50rb dari dompet BCA',
        'Transfer 200rb dari BCA ke dompet tunai',
        'Bulan ini saya boros di mana?',
    ];

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen((o) => !o)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
                    open
                        ? 'bg-slate-700 hover:bg-slate-800 rotate-0 scale-95'
                        : 'bg-gradient-to-br from-violet-600 to-indigo-600 hover:shadow-violet-300 hover:-translate-y-1'
                }`}
            >
                {open
                    ? <X size={22} className="text-white" />
                    : <MessageCircle size={22} className="text-white" />
                }
            </button>

            {/* Chat panel */}
            <div
                className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col transition-all duration-300 origin-bottom-right ${
                    open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
                style={{ height: '520px' }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Asisten Keuangan</p>
                        <p className="text-xs text-violet-200">Bisa tanya & catat transaksi</p>
                    </div>
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded-lg hover:bg-white/20 text-violet-200 hover:text-white transition-colors"
                        title="Hapus riwayat"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                                <MessageCircle size={26} className="text-violet-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-600">Halo! Ada yang bisa saya bantu?</p>
                                <p className="text-xs mt-1">Coba:</p>
                                <div className="flex flex-col gap-1.5 mt-2">
                                    {quickPrompts.map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                            className="text-xs text-left bg-slate-50 hover:bg-violet-50 hover:text-violet-600 px-3 py-2 rounded-xl border border-slate-100 transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => {
                        const action = parseActionResult(msg.action_result);
                        return (
                            <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    msg.role === 'assistant' ? 'bg-violet-100' : 'bg-indigo-100'
                                }`}>
                                    {msg.role === 'assistant'
                                        ? <Bot size={12} className="text-violet-600" />
                                        : <User size={12} className="text-indigo-600" />
                                    }
                                </div>

                                {/* Bubble + action card */}
                                <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-indigo-600 text-white rounded-br-sm'
                                            : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                    {action && msg.role === 'assistant' && (
                                        <ActionCard result={action} />
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Loading bubble */}
                    {loading && (
                        <div className="flex items-end gap-2">
                            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                                <Bot size={12} className="text-violet-600" />
                            </div>
                            <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                                <Loader2 size={15} className="text-slate-400 animate-spin" />
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t border-slate-100 shrink-0">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ketik pesan atau perintah..."
                            className="flex-1 text-sm bg-transparent outline-none text-slate-800 placeholder-slate-400"
                        />
                        <button
                            onClick={send}
                            disabled={!input.trim() || loading}
                            className="w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
                        >
                            <Send size={14} className="text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
