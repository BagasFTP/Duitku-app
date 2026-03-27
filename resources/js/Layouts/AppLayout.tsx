import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, useState } from 'react';
import ChatWidget from '@/Components/ChatWidget';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Tag,
    Wallet,
    PiggyBank,
    BrainCircuit,
    LogOut,
    User,
    Menu,
    X,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard, routeName: 'dashboard' },
    { label: 'Transaksi', href: '/transactions', icon: ArrowLeftRight, routeName: 'transactions.index' },
    { label: 'Kategori', href: '/categories', icon: Tag, routeName: 'categories.index' },
    { label: 'Dompet', href: '/wallets', icon: Wallet, routeName: 'wallets.index' },
    { label: 'Anggaran', href: '/budget', icon: PiggyBank, routeName: 'budget.index' },
    { label: 'Analisis AI', href: '/analysis', icon: BrainCircuit, routeName: 'analysis.index' },
];

function SidebarContent({ user, onNavClick }: { user: { name: string; email: string }; onNavClick?: () => void }) {
    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-violet-700 via-indigo-700 to-indigo-800">
            {/* Logo */}
            <div className="h-16 flex items-center px-6 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                        <Wallet size={16} className="text-white" />
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">Duitku</span>
                </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = route().current(item.routeName);
                    return (
                        <Link
                            key={item.routeName}
                            href={item.href}
                            onClick={onNavClick}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                isActive
                                    ? 'bg-white/20 text-white shadow-sm'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <Icon size={18} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User */}
            <div className="p-4 shrink-0 border-t border-white/10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                        <User size={16} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                        <p className="text-xs text-white/60 truncate">{user.email}</p>
                    </div>
                </div>
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors w-full"
                >
                    <LogOut size={15} />
                    Keluar
                </Link>
            </div>
        </div>
    );
}

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<{ auth: { user: { name: string; email: string } } }>().props;
    const user = auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <>
        <div className="flex min-h-screen bg-slate-50">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile drawer */}
            <aside
                className={`fixed inset-y-0 left-0 z-30 w-64 flex flex-col transform transition-transform duration-250 lg:hidden ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <button
                    onClick={() => setSidebarOpen(false)}
                    className="absolute top-4 right-4 z-10 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                >
                    <X size={20} />
                </button>
                <SidebarContent user={user} onNavClick={() => setSidebarOpen(false)} />
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden lg:flex w-64 flex-col shrink-0 sticky top-0 h-screen">
                <SidebarContent user={user} />
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile topbar */}
                <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 sticky top-0 z-10 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
                            <Wallet size={12} className="text-white" />
                        </div>
                        <span className="text-base font-bold text-indigo-700">Duitku</span>
                    </div>
                </header>

                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
        <ChatWidget />
        </>
    );
}
