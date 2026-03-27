import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageCircle, X, Send, Trash2, Bot, User, Loader2 } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    created_at?: string;
}

export default function ChatWidget() {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const [fetched, setFetched]   = useState(false);
    const bottomRef               = useRef<HTMLDivElement>(null);
    const inputRef                = useRef<HTMLInputElement>(null);

    // Load history when first opened
    useEffect(() => {
        if (open && !fetched) {
            axios.get('/chat/history').then((res) => {
                setMessages(res.data);
                setFetched(true);
            });
        }
    }, [open]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    // Focus input when opened
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
            setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }]);
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
            <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col transition-all duration-300 origin-bottom-right ${
                open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`} style={{ height: '520px' }}>

                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot size={16} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Asisten Keuangan</p>
                        <p className="text-xs text-violet-200">Tanya apa saja soal keuanganmu</p>
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
                                <p className="text-xs mt-1">Coba tanya:</p>
                                <div className="flex flex-col gap-1.5 mt-2">
                                    {[
                                        'Bulan ini saya boros di mana?',
                                        'Berapa sisa anggaran makan saya?',
                                        'Kasih tips hemat bulan ini',
                                    ].map((q) => (
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

                    {messages.map((msg, i) => (
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

                            {/* Bubble */}
                            <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-sm'
                                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

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
                <div className="p-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-3 py-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ketik pesan..."
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
