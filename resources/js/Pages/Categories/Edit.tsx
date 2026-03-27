import AppLayout from '@/Layouts/AppLayout';
import CategoryForm, { CatFormData } from '@/Components/CategoryForm';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    budget: string | null;
    is_default: boolean;
}

interface Props {
    category: Category;
}

export default function CategoryEdit({ category }: Props) {
    const { data, setData, put, processing, errors } = useForm<CatFormData>({
        name:   category.name,
        icon:   category.icon,
        color:  category.color,
        type:   category.type,
        budget: category.budget ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/categories/${category.id}`);
    };

    return (
        <AppLayout>
            <Head title="Edit Kategori" />
            <div className="p-4 sm:p-6 max-w-lg mx-auto space-y-5">
                <div className="flex items-center gap-3">
                    <Link
                        href="/categories"
                        className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 shadow-sm transition-all"
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Edit Kategori</h1>
                        <p className="text-sm text-slate-500">Ubah detail kategori</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                    <form onSubmit={submit} className="space-y-5">
                        <CategoryForm
                            data={data}
                            errors={errors}
                            onChange={(field, value) => setData(field as keyof CatFormData, value)}
                        />
                        <div className="flex gap-3 pt-2">
                            <Link
                                href="/categories"
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
