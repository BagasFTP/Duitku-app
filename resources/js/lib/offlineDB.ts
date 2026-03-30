import Dexie, { type Table } from 'dexie';

export interface OfflineTransaction {
    id?: number;
    tempId: string;
    amount: number;
    type: 'income' | 'expense';
    description: string;
    date: string;
    category_id: number;
    wallet_id: number;
    is_recurring: boolean;
    recur_type: string;
    synced: boolean;
    syncError?: string;
    createdAt: string;
}

class DuitKuOfflineDB extends Dexie {
    transactions!: Table<OfflineTransaction>;

    constructor() {
        super('duitku_offline');
        this.version(1).stores({
            transactions: '++id, tempId, synced, date',
        });
    }
}

export const offlineDb = new DuitKuOfflineDB();
