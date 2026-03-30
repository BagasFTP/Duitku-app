import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { router } from '@inertiajs/react';
import { offlineDb } from '@/lib/offlineDB';
import { syncPendingTransactions } from '@/lib/syncService';

export function useOfflineSync() {
    const [syncing, setSyncing]   = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const pendingCount = useLiveQuery(
        () => offlineDb.transactions.where('synced').equals(0).count(),
        [],
        0,
    );

    const syncNow = async () => {
        if (syncing || !navigator.onLine) return;
        setSyncing(true);
        try {
            const { synced } = await syncPendingTransactions();
            if (synced > 0) router.reload();
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            setSyncing(true);
            try {
                const { synced } = await syncPendingTransactions();
                if (synced > 0) router.reload();
            } finally {
                setSyncing(false);
            }
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { pendingCount: pendingCount ?? 0, syncing, isOnline, syncNow };
}
