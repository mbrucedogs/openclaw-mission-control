'use client';

import { useState, useEffect } from 'react';
import { triggerIngestion } from '@/app/actions';
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function IngestButton() {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (status === 'success' || status === 'error') {
            const timer = setTimeout(() => setStatus('idle'), 3000);
            return () => clearTimeout(timer);
        }
    }, [status]);

    const handleIngest = async () => {
        setStatus('loading');
        try {
            const result = await triggerIngestion();
            if (result.success) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage(result.error || 'Sync failed');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage('Network error');
        }
    };

    return (
        <div className="flex flex-col items-end space-y-2">
            <button
                onClick={handleIngest}
                disabled={status === 'loading'}
                className={cn(
                    "flex items-center space-x-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg",
                    status === 'loading'
                        ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                        : status === 'success'
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : status === 'error'
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-blue-600 text-white hover:bg-blue-500 active:scale-95 border border-blue-400/20"
                )}
            >
                {status === 'loading' ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                ) : status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4" />
                ) : status === 'error' ? (
                    <XCircle className="w-4 h-4" />
                ) : (
                    <RefreshCw className="w-4 h-4" />
                )}
                <span>
                    {status === 'loading' ? 'Syncing...' : 
                     status === 'success' ? 'Synced' : 
                     status === 'error' ? 'Failed' : 'Sync System'}
                </span>
            </button>
            {status === 'error' && errorMessage && (
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded">
                    {errorMessage}
                </span>
            )}
        </div>
    );
}
