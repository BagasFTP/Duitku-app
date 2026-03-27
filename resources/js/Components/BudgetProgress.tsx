import DynamicIcon from '@/Components/DynamicIcon';

interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
}

interface Budget {
    id: number;
    category_id: number;
    amount: string;
    month: number;
    year: number;
    category: Category;
}

interface ExpenseByCategory {
    category: Category;
    total: string | number;
}

interface Props {
    budgets: Budget[];
    expenseByCategory: ExpenseByCategory[];
}

const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);

export default function BudgetProgress({ budgets, expenseByCategory }: Props) {
    if (budgets.length === 0) {
        return (
            <div className="text-sm text-gray-400 py-4 text-center">
                Belum ada anggaran bulan ini
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {budgets.map((budget) => {
                const spent = expenseByCategory.find((e) => e.category.id === budget.category_id);
                const actual = Number(spent?.total ?? 0);
                const limit = Number(budget.amount);
                const percent = limit > 0 ? Math.min((actual / limit) * 100, 100) : 0;
                const isOver = actual > limit;

                return (
                    <div key={budget.id}>
                        <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: (budget.category.color ?? '#6366f1') + '20' }}
                                >
                                    <DynamicIcon
                                        name={budget.category.icon}
                                        size={12}
                                        style={{ color: budget.category.color ?? '#6366f1' }}
                                    />
                                </div>
                                <span className="font-medium text-gray-700">{budget.category.name}</span>
                            </div>
                            <span className={isOver ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                                {formatRupiah(actual)} / {formatRupiah(limit)}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                        {isOver && (
                            <p className="text-xs text-red-500 mt-1">
                                Melebihi {formatRupiah(actual - limit)}
                            </p>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
