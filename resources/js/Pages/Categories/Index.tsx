import AppLayout from '@/Layouts/AppLayout';
import DynamicIcon from '@/Components/DynamicIcon';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, ShieldCheck } from 'lucide-react';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    budget: string | null;
    is_default: boolean;
    transactions_count: number;
}

interface Props {
    categories: Category[];
}

const fmt = (v: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

export default function CategoriesIndex({ categories }: Props) {
    const flash = usePage<{ flash?: { success?: string; error?: string } }>().props.flash;
    const income  = categories.filter((c) => c.type === 'income');
    const expense = categories.filter((c) => c.type === 'expense');

    const handleDelete = (cat: Category) => {
        if (!confirm('Hapus kategori ' + cat.name + '?')) return;
        router.delete('/categories/' + cat.id, { preserveScroll: true });
    };

    const Card = ({ cat }: { cat: Category }) => (
        <div className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-start justify-between mb-3">
                <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: (cat.color ?? '#6366f1') + '20' }}
                >
                    <DynamicIcon name={cat.icon} size={22} style={{ color: cat.color ?? '#6366f1' }} />
                </div>
                <div className="hidden group-hover:flex items-center gap-1">
                    <Link href={'/categories/' + cat.id + '/edit'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                        <Pencil size={14} />
                    </Link>
                    {!cat.is_default && (
                        <button onClick={() => handleDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>
            <p className="font-semibold text-slate-800 text-sm truncate">{cat.name}</p>
            <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">{cat.transactions_count} transaksi</span>
                {cat.is_default && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                        <ShieldCheck size={11} /> default
                    </span>
                )}
            </div>
            {cat.budget && (
                <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                        Anggaran: <span className="font-medium text-slate-700">{fmt(Number(cat.budget))}</span>
                    </p>
                </div>
            )}
        </div>
    );

    const AddCard = () => (
        <Link href="/categories/create"
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all duration-200 min-h-[120px]">
            <Plus size={20} />
            <span className="text-xs font-medium">Tambah</span>
        </Link>
    );

    const Section = ({ title, list, Icon, iconClass }: { title: string; list: Category[]; Icon: any; iconClass: string }) => (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className={'w-7 h-7 rounded-lg flex items-center justify-center ' + iconClass}>
                    <Icon size={14} />
                </div>
                <h2 className="font-bold text-slate-700">{title}</h2>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{list.length}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {list.map((cat) => <Card key={cat.id} cat={cat} />)}
                <AddCard />
            </div>
        </div>
    );

    return (
        <AppLayout>
            <Head title="Kategori" />
            <div className="p-4 sm:p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Kategori</h1>
                        <p className="text-sm text-slate-500 mt-0.5">{categories.length} kategori tersedia</p>
                    </div>
                    <Link href="/categories/create"
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                        <Plus size={16} /> Tambah
                    </Link>
                </div>

                {flash?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{flash.error}</div>
                )}

                <Section title="Pemasukan" list={income}
                    Icon={(p: any) => <TrendingUp {...p} className="text-emerald-600" />}
                    iconClass="bg-emerald-100" />

                <Section title="Pengeluaran" list={expense}
                    Icon={(p: any) => <TrendingDown {...p} className="text-rose-500" />}
                    iconClass="bg-rose-100" />

            </div>
        </AppLayout>
    );
}
