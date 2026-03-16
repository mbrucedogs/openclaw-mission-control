'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Zap, Lock, Fingerprint, Activity, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [status, setStatus] = useState('Standby');
    const [shake, setShake] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAuthenticating(true);
        setStatus('Initializing Auth Protocol...');

        // Simulate a high-tech "handshake"
        setTimeout(() => {
            if (password.toLowerCase() === 'admin' || password.toLowerCase() === 'matt') {
                setStatus('Handshake Verified. Access Granted.');
                // In a real app, this would be an API call setting a secure cookie
                document.cookie = 'auth-token=authorized; path=/; max-age=86400';
                setTimeout(() => {
                    router.push('/');
                }, 800);
            } else {
                setShake(true);
                setStatus('Unauthorized Access Detected.');
                setIsAuthenticating(false);
                setTimeout(() => setShake(false), 500);
            }
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 z-[9999]">
            {/* Background Grid & Pulse */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(26,26,26,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,0.3)_1px,transparent_1px)] bg-[size:50px_50px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

            <div className={cn(
                "relative w-full max-w-[420px] bg-[#0c0c0e] border border-[#1a1a1a] rounded-[2.5rem] p-12 shadow-2xl transition-all duration-300",
                shake ? "translate-x-2 border-red-500/50" : ""
            )}>
                {/* Logo Area */}
                <div className="flex flex-col items-center mb-12">
                    <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.1)] group">
                        <Shield className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Mission <span className="text-blue-500">Control</span></h1>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Durable Orchestration Layer</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Authorized Identity</label>
                        <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                            <input
                                type="password"
                                placeholder="Enter system key"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#09090b] border border-[#1a1a1a] rounded-2xl py-4 pl-14 pr-6 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-700"
                            />
                        </div>
                    </div>

                    <button
                        disabled={isAuthenticating}
                        className={cn(
                            "w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-500/10 active:scale-95 flex items-center justify-center space-x-3",
                            isAuthenticating ? "opacity-50 cursor-not-allowed" : ""
                        )}
                    >
                        {isAuthenticating ? (
                            <Activity className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Fingerprint className="w-5 h-5 border-blue-400" />
                                <span className="text-xs uppercase tracking-widest">Verify Identity</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Status Bar */}
                <div className="mt-12 pt-8 border-t border-[#1a1a1a] flex flex-col items-center">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full animate-pulse",
                            isAuthenticating ? "bg-blue-500" : shake ? "bg-red-500" : "bg-emerald-500"
                        )} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{status}</span>
                    </div>
                </div>

                {/* Global Message */}
                <div className="absolute -bottom-20 left-0 right-0 text-center">
                    <p className="text-[11px] font-bold text-slate-600 italic">"Supervisor MAX is monitoring all access attempts"</p>
                </div>
            </div>

            {/* Floating Terminal Snippets for Vibe */}
            <div className="fixed bottom-10 right-10 text-[9px] font-mono text-blue-500/20 pointer-events-none hidden lg:block">
                <div>{'>'} INITIALIZING HANDSHAKE...</div>
                <div>{'>'} RSA KEY DEPLOYED</div>
                <div>{'>'} CANONICAL ROSTER LOADED</div>
                <div>{'>'} STATUS: STANDBY</div>
            </div>
        </div>
    );
}
