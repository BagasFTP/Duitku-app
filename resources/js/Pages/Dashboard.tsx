import AppLayout from '@/Layouts/AppLayout';
import BudgetProgress from '@/Components/BudgetProgress';
import TransactionList from '@/Components/TransactionList';
import ExpensePieChart from '@/Components/Charts/ExpensePieChart';
import MonthlyBartChart from '@/Components/Charts/MonthlyBartChart';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, Link } from '@inertiajs/react';
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: string;
    budget: string;
    is_default: boolean;
}

interface WalletItem {
    id: number;
    name: string;
    type: string;
    balance: string;
    icon: string;
    color: string;
}

interface Transaction {
    id: number;
    amount: string;
    type: 'income' | 'expense';
    description: string;
    date: string;
    category: Category | null;
    wallet: WalletItem | null;
}

interface ExpenseByCategory {
    category: Category;
    total: string | number;
}

interface Budget {
    id: number;
    category_id: number;
    amount: string;
    month: number;
    year: number;
    category: Category;
}

interface Summary {
    income: number;
    expense: number;
    balance: number;
    month: number;
    year: number;
}

interface Props {
    summary: Summary;
    recentTransactions: Transaction[];
    expenseByCategory: ExpenseByCategory[];
    budgets: Budget[];
    wallets: WalletItem[];
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function Dashboard({ summary, recentTransactions, expenseByCategory, budgets, wallets }: Props) {
    const monthName = format(new Date(summary.year, summary.month - 1, 1), 'MMMM yyyy', { locale: id });

    return (
        <AppLayout>
            <Head title="Dashboard" />

            <div className="p-6 space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">Ringkasan keuangan {monthName}</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-500 font-medium">Pemasukan</span>
                            <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                                <TrendingUp size={18} className="text-emerald-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatRupiah(summary.income)}</p>
                    </div>

                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-gray-500 font-medium">Pengeluaran</span>
                            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                                <TrendingDown size={18} className="text-red-500" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{formatRupiah(summary.expense)}</p>
                    </div>

                    <div className={`rounded-xl p-5 border shadow-sm ${summary.balance >= 0 ? 'bg-indigo-600 border-indigo-600' : 'bg-red-600 border-red-600'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-white/80 font-medium">Sisa</span>
                            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                                <Wallet size={18} className="text-white" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white">{formatRupiah(summary.balance)}</p>
                    </div>
                </div>

                {/* Wallets */}
                {wallets.length > 0 && (
                    <div>
                        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Dompet</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {wallets.map((wallet) => (
                                <div key={wallet.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: (wallet.color ?? '#6366f1') + '20' }}
                                        >
                                            <DynamicIcon
                                                name={wallet.icon ?? 'Wallet'}
                                                size={14}
                                                style={{ color: wallet.color ?? '#6366f1' }}
                                            />
                                        </div>
                                        <span className="text-xs font-medium text-gray-600 truncate">{wallet.name}</span>
                                    </div>
                                    <p className="text-sm font-bold text-gray-900">{formatRupiah(Number(wallet.balance))}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Charts + Recent Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pemasukan vs Pengeluaran</h2>
                        <MonthlyBartChart
                            income={summary.income}
                            expense={summary.expense}
                            monthName={monthName}
                        />
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-semibold text-gray-700 mb-4">Pengeluaran per Kategori</h2>
                        <ExpensePieChart data={expenseByCategory} />
                    </div>
                </div>

                {/* Budget + Recent Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Budget Progress */}
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-700">Anggaran Bulan Ini</h2>
                            <Link href="/budget" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                Kelola <ArrowRight size={12} />
                            </Link>
                        </div>
                        <BudgetProgress budgets={budgets} expenseByCategory={expenseByCategory} />
                    </div>

                    {/* Recent Transactions */}
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-700">Transaksi Terbaru</h2>
                            <Link href="/transactions" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                Lihat semua <ArrowRight size={12} />
                            </Link>
                        </div>
                        <TransactionList transactions={recentTransactions} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
