import AppLayout from '@/Layouts/AppLayout';
import WalletForm, { WalletFormData } from '@/Components/WalletForm';
import { Head, useForm } from '@inertiajs/react';
import { ChevronLeft, Save } from 'lucide-react';

export default function WalletCreate() {
    const { data, setData, post, processing, errors } = useForm<WalletFormData>({
        name: '',
        type: 'bank',
        balance: '',
        icon: 'wallet',
        color: '#6366f1',
    });

    const handleChange = (field: string, value: string) => {
        setData(field as keyof WalletFormData, value as any);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/wallets');
    };

    return (
        <AppLayout>
            <Head title="Tambah Dompet" />
            <div className="p-4 sm:p-6 max-w-lg mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <a
                        href="/wallets"
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm"
                    >
                        <ChevronLeft size={18} />
                    </a>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Tambah Dompet</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Tambahkan rekening atau dompet baru</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
                    <WalletForm
                        data={data}
                        errors={errors}
                        onChange={handleChange}
                        showBalance={true}
                    />

                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                    >
                        <Save size={16} />
                        {processing ? 'Menyimpan...' : 'Simpan Dompet'}
                    </button>
                </form>
            </div>
        </AppLayout>
    );
}
