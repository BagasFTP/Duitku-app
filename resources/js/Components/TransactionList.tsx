import DynamicIcon from '@/Components/DynamicIcon';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Category {
    name: string;
    icon: string;
    color: string;
}

interface Wallet {
    name: string;
}

interface Transaction {
    id: number;
    amount: string;
    type: 'income' | 'expense';
    description: string;
    date: string;
    category: Category | null;
    wallet: Wallet | null;
}

interface Props {
    transactions: Transaction[];
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function TransactionList({ transactions }: Props) {
    if (transactions.length === 0) {
        return (
            <div className="text-sm text-gray-400 py-6 text-center">
                Belum ada transaksi bulan ini
            </div>
        );
    }

    return (
        <div className="divide-y divide-gray-100">
            {transactions.map((trx) => (
                <div key={trx.id} className="group flex items-center gap-3 py-3 rounded-xl px-2 -mx-2 hover:bg-slate-50 transition-colors duration-150 cursor-default">
                    <div
                        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-150"
                        style={{ backgroundColor: (trx.category?.color ?? '#6366f1') + '20' }}
                    >
                        <DynamicIcon
                            name={trx.category?.icon ?? 'CircleDashed'}
                            size={16}
                            style={{ color: trx.category?.color ?? '#6366f1' }}
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                            {trx.description || trx.category?.name || '-'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {format(new Date(trx.date), 'd MMM yyyy', { locale: id })} · {trx.wallet?.name ?? '-'}
                        </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${trx.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {trx.type === 'income' ? '+' : '-'} {formatRupiah(Number(trx.amount))}
                    </span>
                </div>
            ))}
        </div>
    );
}
