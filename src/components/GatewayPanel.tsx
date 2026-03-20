'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type GatewayInfo = {
    connected: boolean;
    gateway?: {
        ts: string;
        heartbeatSeconds: number;
        defaultAgentId: string;
        channels: Record<string, any>;
        channelOrder: string[];
    };
    agents: Array<{
        id: string;
        name: string;
        isDefault: boolean;
        heartbeatEnabled: boolean;
        heartbeatEvery: string;
        sessionCount: number;
    }>;
    sessions?: {
        count: number;
        defaults: { model: string; contextTokens: number };
        recent: Array<{
            agentId: string;
            key: string;
            sessionId: string;
            updatedAt: number;
            age: number;
            inputTokens: number;
            outputTokens: number;
            totalTokens: number;
            remainingTokens: number;
            percentUsed: number;
            model: string;
        }>;
        byAgent: Array<{ agentId: string; count: number }>;
    };
};

function ago(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

export function GatewayPanel() {
    const [data, setData] = useState<GatewayInfo | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch_ = async () => {
            try {
                const res = await fetch('/api/gateway');
                if (res.ok) setData(await res.json());
            } catch { /* */ }
            setLoading(false);
        };
        fetch_();
        const t = setInterval(fetch_, 30000);
        return () => clearInterval(t);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="h-4 w-4 rounded-full bg-blue-500 animate-ping" />
            </div>
        );
    }

    if (!data?.connected) {
        return (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 text-red-400 text-sm font-bold">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    Gateway Offline
                </div>
                <p className="mt-2 text-xs text-slate-500">OpenClaw gateway unreachable.</p>
            </div>
        );
    }

    const activeAgents = data.agents?.filter(a => a.sessionCount > 0) ?? [];
    const heartbeatAgents = data.agents?.filter(a => a.heartbeatEnabled) ?? [];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-sm font-bold text-white">Gateway</span>
                </div>
                <span className="text-xs text-slate-500">v2026.3.13</span>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-[#1a1a1a] bg-[#101010] p-3 text-center">
                    <p className="text-lg font-black text-white">{data.agents?.length ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Agents</p>
                </div>
                <div className="rounded-xl border border-[#1a1a1a] bg-[#101010] p-3 text-center">
                    <p className="text-lg font-black text-white">{activeAgents.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active</p>
                </div>
                <div className="rounded-xl border border-[#1a1a1a] bg-[#101010] p-3 text-center">
                    <p className="text-lg font-black text-white">{data.sessions?.count ?? 0}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sessions</p>
                </div>
            </div>

            {/* Heartbeat agents */}
            {heartbeatAgents.length > 0 && (
                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Heartbeats</p>
                    <div className="space-y-1">
                        {heartbeatAgents.slice(0, 5).map(a => (
                            <div key={a.id} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-black/50 px-3 py-2">
                                <span className="text-xs text-slate-300">{a.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-red-400">❤</span>
                                    <span className="text-[10px] font-mono text-slate-500">{a.heartbeatEvery}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent sessions */}
            {data.sessions?.recent && data.sessions.recent.length > 0 && (
                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Sessions</p>
                    <div className="space-y-1">
                        {data.sessions.recent.slice(0, 5).map((s, i) => (
                            <div key={i} className="flex items-center justify-between rounded-lg border border-[#1a1a1a] bg-black/50 px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        s.percentUsed > 80 ? "bg-red-500" :
                                        s.percentUsed > 50 ? "bg-amber-500" : "bg-blue-500"
                                    )} />
                                    <span className="text-[10px] text-slate-400 font-mono">{s.agentId}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                    <span className="font-mono">{s.percentUsed}%</span>
                                    <span>{ago(s.age)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Channels */}
            {(data.gateway && data.gateway.channelOrder && data.gateway.channelOrder.length > 0) && (
                <div>
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">Channels</p>
                    <div className="flex flex-wrap gap-1">
                        {data.gateway.channelOrder.map(ch => {
                            const chan = (data.gateway as any)?.channels?.[ch];
                            const isRunning = chan?.running;
                            return (
                                <span key={ch} className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                                    isRunning ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                                               "border-[#2a2a2a] bg-black text-slate-500"
                                )}>
                                    {ch} {isRunning ? '●' : '○'}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
