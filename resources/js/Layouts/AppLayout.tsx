import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Tag,
    Wallet,
    PiggyBank,
    BrainCircuit,
    LogOut,
    User,
} from 'lucide-react';

const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard, routeName: 'dashboard' },
    { label: 'Transaksi', href: '/transactions', icon: ArrowLeftRight, routeName: 'transactions.index' },
    { label: 'Kategori', href: '/categories', icon: Tag, routeName: 'categories.index' },
    { label: 'Dompet', href: '/wallets', icon: Wallet, routeName: 'wallets.index' },
    { label: 'Anggaran', href: '/budget', icon: PiggyBank, routeName: 'budget.index' },
    { label: 'Analisis AI', href: '/analysis', icon: BrainCircuit, routeName: 'analysis.index' },
];

export default function AppLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<{ auth: { user: { name: string; email: string } } }>().props;
    const user = auth.user;

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-gray-200">
                    <span className="text-xl font-bold text-indigo-600">Duitku</span>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = route().current(item.routeName);
                        return (
                            <Link
                                key={item.routeName}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isActive
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                            >
                                <Icon size={18} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-gray-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                            <User size={16} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors w-full"
                    >
                        <LogOut size={16} />
                        Keluar
                    </Link>
                </div>
            </aside>

            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
