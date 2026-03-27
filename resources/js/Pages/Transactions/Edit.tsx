import AppLayout from '@/Layouts/AppLayout';
import TransactionForm, { TrxFormData } from '@/Components/TransactionForm';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

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
    category_id: number;
    wallet_id: number;
    is_recurring: boolean;
    recur_type: string | null;
}

interface Props {
    transaction: Transaction;
    categories: Category[];
    wallets: Wallet[];
}

export default function TransactionEdit({ transaction, categories, wallets }: Props) {
    const { data, setData, put, processing, errors } = useForm<TrxFormData>({
        amount:       transaction.amount,
        type:         transaction.type,
        description:  transaction.description ?? '',
        date:         transaction.date,
        category_id:  String(transaction.category_id),
        wallet_id:    String(transaction.wallet_id),
        is_recurring: transaction.is_recurring,
        recur_type:   transaction.recur_type ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/transactions/${transaction.id}`);
    };

    return (
        <AppLayout>
            <Head title="Edit Transaksi" />

            <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/transactions"
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Edit Transaksi</h1>
                        <p className="text-sm text-slate-500">Ubah detail transaksi</p>
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <form onSubmit={submit} className="space-y-5">
                        <TransactionForm
                            data={data}
                            errors={errors}
                            categories={categories}
                            wallets={wallets}
                            onChange={(field, value) => setData(field as keyof TrxFormData, value as never)}
                        />

                        <div className="flex gap-3 pt-2">
                            <Link
                                href="/transactions"
                                className="flex-1 text-center py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
