import AppLayout from '@/Layouts/AppLayout';
import TransactionForm, { TrxFormData } from '@/Components/TransactionForm';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, WifiOff } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { saveOfflineTransaction } from '@/lib/syncService';

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

interface Props {
    categories: Category[];
    wallets: Wallet[];
}

const defaultForm: TrxFormData = {
    amount:       '',
    type:         'expense',
    description:  '',
    date:         format(new Date(), 'yyyy-MM-dd'),
    category_id:  '',
    wallet_id:    '',
    is_recurring: false,
    recur_type:   '',
};

export default function TransactionCreate({ categories, wallets }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm<TrxFormData>(defaultForm);
    const [offlineSaved, setOfflineSaved] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!navigator.onLine) {
            await saveOfflineTransaction({
                tempId:       crypto.randomUUID(),
                amount:       Number(data.amount),
                type:         data.type,
                description:  data.description,
                date:         data.date,
                category_id:  Number(data.category_id),
                wallet_id:    Number(data.wallet_id),
                is_recurring: data.is_recurring,
                recur_type:   data.recur_type,
            });
            reset();
            setOfflineSaved(true);
            return;
        }

        setOfflineSaved(false);
        post('/transactions');
    };

    return (
        <AppLayout>
            <Head title="Tambah Transaksi" />

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
                        <h1 className="text-xl font-bold text-slate-800">Tambah Transaksi</h1>
                        <p className="text-sm text-slate-500">Catat pemasukan atau pengeluaran baru</p>
                    </div>
                </div>

                {/* Offline saved banner */}
                {offlineSaved && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <WifiOff size={18} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">Disimpan offline</p>
                            <p className="text-xs text-amber-600 mt-0.5">
                                Transaksi akan dikirim ke server saat koneksi kembali aktif.
                            </p>
                        </div>
                        <CheckCircle2 size={18} className="text-amber-500 shrink-0 mt-0.5 ml-auto" />
                    </div>
                )}

                {/* Form Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <form onSubmit={submit} className="space-y-5">
                        <TransactionForm
                            data={data}
                            errors={errors}
                            categories={categories}
                            wallets={wallets}
                            onChange={(field, value) => {
                                setOfflineSaved(false);
                                setData(field, value as never);
                            }}
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
                                {processing ? 'Menyimpan...' : 'Simpan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
