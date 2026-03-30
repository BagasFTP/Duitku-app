export interface Category {
    id: number;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    budget: number | null;
    is_default: boolean;
}

export interface Wallet {
    id: number;
    name: string;
    type: 'bank' | 'cash' | 'ewallet';
    balance: number;
    icon: string;
    color: string;
}

export interface Transaction {
    id: number;
    amount: number;
    type: 'income' | 'expense';
    description: string | null;
    date: string;
    category_id: number;
    wallet_id: number;
    category: Category;
    wallet: Wallet;
    is_recurring: boolean;
    recur_type: string | null;
}

export interface Budget {
    id: number;
    category_id: number;
    amount: number;
    month: number;
    year: number;
    category: Category;
}

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
