import AppLayout from '@/Layouts/AppLayout';
import BudgetProgress from '@/Components/BudgetProgress';
import TransactionList from '@/Components/TransactionList';
import ExpensePieChart from '@/Components/Charts/ExpensePieChart';
import MonthlyBartChart from '@/Components/Charts/MonthlyBartChart';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, Link, usePage } from '@inertiajs/react';
import { TrendingUp, TrendingDown, BarChart2, ArrowRight, Sparkles } from 'lucide-react';
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
    const { auth } = usePage<{ auth: { user: { name: string } } }>().props;
    const monthName = format(new Date(summary.year, summary.month - 1, 1), 'MMMM yyyy', { locale: id });
    const firstName = auth.user.name.split(' ')[0];

    return (
        <AppLayout>
            <Head title="Dashboard" />

            <div className="p-4 sm:p-6 space-y-6">

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-6 text-white shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 cursor-default">
                    {/* Decorative circles */}
                    <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -right-2 w-24 h-24 rounded-full bg-white/5" />
                    <div className="absolute top-4 right-20 w-10 h-10 rounded-full bg-white/10" />

                    <div className="relative">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={16} className="text-yellow-300" />
                            <span className="text-sm text-white/80">Halo, {firstName}!</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Keuangan kamu bulan ini</h1>
                        <p className="text-white/70 text-sm">{monthName}</p>

                        <div className="mt-5">
                            <p className="text-sm text-white/70 mb-1">Total saldo tersisa</p>
                            <p className={`text-3xl sm:text-4xl font-bold ${summary.balance < 0 ? 'text-red-300' : 'text-white'}`}>
                                {formatRupiah(summary.balance)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-emerald-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-200 transition-all duration-200 cursor-default">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-white/90">Pemasukan</span>
                            <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center">
                                <TrendingUp size={18} className="text-white" />
                            </div>
                        </div>
                        <p className="text-lg sm:text-xl font-bold leading-tight">{formatRupiah(summary.income)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-rose-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-rose-200 transition-all duration-200 cursor-default">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-white/90">Pengeluaran</span>
                            <div className="w-9 h-9 rounded-xl bg-white/25 flex items-center justify-center">
                                <TrendingDown size={18} className="text-white" />
                            </div>
                        </div>
                        <p className="text-lg sm:text-xl font-bold leading-tight">{formatRupiah(summary.expense)}</p>
                    </div>
                </div>

                {/* Wallets */}
                {wallets.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="font-bold text-slate-700">Dompet Kamu</h2>
                            <Link href="/wallets" className="group text-xs text-indigo-600 flex items-center gap-1 font-medium hover:text-indigo-800 transition-colors">
                                Lihat semua <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {wallets.map((wallet) => (
                                <div
                                    key={wallet.id}
                                    className="relative overflow-hidden rounded-2xl p-4 text-white shadow-md hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-default"
                                    style={{
                                        background: wallet.color
                                            ? `linear-gradient(135deg, ${wallet.color}dd, ${wallet.color}99)`
                                            : 'linear-gradient(135deg, #6366f1dd, #6366f199)',
                                    }}
                                >
                                    <div className="absolute -bottom-3 -right-3 w-14 h-14 rounded-full bg-white/10" />
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-7 h-7 rounded-lg bg-white/25 flex items-center justify-center">
                                            <DynamicIcon name={wallet.icon ?? 'Wallet'} size={14} className="text-white" />
                                        </div>
                                        <span className="text-xs font-semibold text-white/90 truncate">{wallet.name}</span>
                                    </div>
                                    <p className="text-sm font-bold">{formatRupiah(Number(wallet.balance))}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                                <BarChart2 size={14} className="text-indigo-600" />
                            </div>
                            <h2 className="font-bold text-slate-700">Pemasukan vs Pengeluaran</h2>
                        </div>
                        <MonthlyBartChart
                            income={summary.income}
                            expense={summary.expense}
                            monthName={monthName}
                        />
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
                                <TrendingDown size={14} className="text-rose-500" />
                            </div>
                            <h2 className="font-bold text-slate-700">Pengeluaran per Kategori</h2>
                        </div>
                        <ExpensePieChart data={expenseByCategory} />
                    </div>
                </div>

                {/* Budget + Transactions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                    <TrendingUp size={14} className="text-amber-500" />
                                </div>
                                <h2 className="font-bold text-slate-700">Anggaran Bulan Ini</h2>
                            </div>
                            <Link href="/budget" className="group text-xs text-indigo-600 flex items-center gap-1 font-medium hover:text-indigo-800 transition-colors">
                                Kelola <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                        <BudgetProgress budgets={budgets} expenseByCategory={expenseByCategory} />
                    </div>

                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                                    <ArrowRight size={14} className="text-violet-500" />
                                </div>
                                <h2 className="font-bold text-slate-700">Transaksi Terbaru</h2>
                            </div>
                            <Link href="/transactions" className="group text-xs text-indigo-600 flex items-center gap-1 font-medium hover:text-indigo-800 transition-colors">
                                Lihat semua <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                            </Link>
                        </div>
                        <TransactionList transactions={recentTransactions} />
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
