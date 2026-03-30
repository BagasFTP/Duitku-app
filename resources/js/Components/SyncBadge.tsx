import { CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

export default function SyncBadge() {
    const { pendingCount, syncing, isOnline, syncNow } = useOfflineSync();

    if (!isOnline) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                <CloudOff size={13} />
                <span className="font-medium">Offline</span>
                {pendingCount > 0 && (
                    <span className="bg-amber-200 text-amber-800 rounded-full px-1.5 font-semibold">
                        {pendingCount}
                    </span>
                )}
            </div>
        );
    }

    if (pendingCount > 0) {
        return (
            <button
                onClick={syncNow}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 hover:bg-indigo-100 disabled:opacity-60 transition-colors"
            >
                <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? 'Sinkronisasi...' : `${pendingCount} belum tersinkron`}</span>
            </button>
        );
    }

    return null;
}
