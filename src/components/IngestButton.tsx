'use client';

import { useState } from 'react';
import { triggerIngestion } from '@/app/actions';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IngestButton() {
    const [loading, setLoading] = useState(false);

    const handleIngest = async () => {
        setLoading(true);
        try {
            const result = await triggerIngestion();
            if (result.success) {
                alert('Ingestion successful!');
            } else {
                alert('Ingestion failed: ' + result.error);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleIngest}
            disabled={loading}
            className={cn(
                "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors",
                loading
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            )}
        >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span>{loading ? 'Ingesting...' : 'Sync Data'}</span>
        </button>
    );
}
