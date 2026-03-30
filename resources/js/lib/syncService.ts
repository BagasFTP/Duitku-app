import axios from 'axios';
import { offlineDb, type OfflineTransaction } from './offlineDB';

export async function saveOfflineTransaction(
    data: Omit<OfflineTransaction, 'id' | 'synced' | 'createdAt'>,
): Promise<void> {
    await offlineDb.transactions.add({
        ...data,
        synced: false,
        createdAt: new Date().toISOString(),
    });
}

export async function getPendingCount(): Promise<number> {
    return offlineDb.transactions.where('synced').equals(0).count();
}

export async function syncPendingTransactions(): Promise<{ synced: number; failed: number }> {
    const pending = await offlineDb.transactions.where('synced').equals(0).toArray();

    if (pending.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;

    try {
        const res = await axios.post<{
            results: Array<{ tempId: string; success: boolean; error?: string }>;
        }>('/transactions/sync-offline', {
            items: pending.map((trx) => ({
                tempId: trx.tempId,
                amount: trx.amount,
                type: trx.type,
                description: trx.description,
                date: trx.date,
                category_id: trx.category_id,
                wallet_id: trx.wallet_id,
                is_recurring: trx.is_recurring,
                recur_type: trx.recur_type,
            })),
        });

        for (const result of res.data.results) {
            const record = pending.find((p) => p.tempId === result.tempId);
            if (!record?.id) continue;

            if (result.success) {
                await offlineDb.transactions.update(record.id, {
                    synced: true,
                    syncError: undefined,
                });
                synced++;
            } else {
                await offlineDb.transactions.update(record.id, {
                    syncError: result.error ?? 'Unknown error',
                });
                failed++;
            }
        }
    } catch {
        failed = pending.length;
    }

    return { synced, failed };
}
