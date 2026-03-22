'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import {
    CheckSquare,
    Users,
    Calendar,
    FolderKanban,
    Brain,
    FileText,
    Monitor,
    LayoutGrid,
    Command,
    LogOut,
    Settings,
    ShieldAlert,
    X
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Memory', href: '/memories', icon: Brain },
    { name: 'Docs', href: '/docs', icon: FileText },
    { name: 'Office', href: '/office', icon: Monitor },
    { name: 'Approvals', href: '/approvals', icon: ShieldAlert },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ 
    username = 'Admin',
    isOpen = false,
    onClose
}: { 
    username?: string;
    isOpen?: boolean;
    onClose?: () => void;
}) {
    const pathname = usePathname();
    const [isReady, setIsReady] = useState<boolean | null>(null);
    const previousPathnameRef = useRef(pathname);

    useEffect(() => {
        fetch('/api/system/status')
            .then(res => res.json())
            .then(data => setIsReady(data.ready))
            .catch(() => setIsReady(false));
    }, [pathname]);

    // Close sidebar only when the route actually changes on mobile.
    useEffect(() => {
        const previousPathname = previousPathnameRef.current;
        previousPathnameRef.current = pathname;

        if (previousPathname !== pathname && isOpen && onClose) {
            onClose();
        }
    }, [pathname, isOpen, onClose]);

    const initials = username.slice(0, 2).toUpperCase();

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                id="mobile-sidebar"
                className={cn(
                    "fixed inset-y-0 left-0 z-[80] h-[100dvh] w-[85vw] max-w-72 border-r border-[#1a1a1a] bg-[#09090b] text-slate-400 transform transition-transform duration-300 ease-in-out md:relative md:z-auto md:h-[100dvh] md:w-64 md:max-w-none md:translate-x-0",
                    isOpen ? "translate-x-0 pointer-events-auto" : "-translate-x-full pointer-events-none md:pointer-events-auto"
                )}
            >
                <div className="flex h-full flex-col pb-[max(env(safe-area-inset-bottom),0px)] pt-[max(env(safe-area-inset-top),0px)]">
                <div className="flex items-center justify-between border-b border-[#1a1a1a] px-5 py-4 md:h-20 md:px-6">
                    <div className="flex min-w-0 items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                        <Command className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm font-black text-white uppercase tracking-widest">Mission Control</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white md:hidden"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex flex-1 flex-col overflow-y-auto">
                    {isReady === false && (
                        <Link 
                            href="/team"
                            className="mx-3 mt-6 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl group hover:bg-orange-500/20 transition-all cursor-pointer"
                        >
                            <div className="flex items-center space-x-3 text-orange-400">
                                <ShieldAlert className="w-4 h-4 animate-bounce" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Setup Required</span>
                            </div>
                            <p className="text-[9px] text-orange-200/60 mt-2 font-medium leading-tight">
                                Initial team configuration pending. Configure agents to unlock full capabilities.
                            </p>
                        </Link>
                    )}

                    <nav className="px-3 py-6 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                            const isTeamSetup = item.name === 'Team' && isReady === false;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all relative',
                                        isActive
                                            ? 'bg-[#1a1a1a] text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-200',
                                        isTeamSetup && !isActive && "text-orange-400/80 animate-pulse"
                                    )}
                                >
                                    <item.icon
                                        className={cn(
                                            'mr-4 h-4 w-4 transition-colors',
                                            isActive ? 'text-white' : 'text-slate-600',
                                            isTeamSetup && "text-orange-400"
                                        )}
                                        aria-hidden="true"
                                    />
                                    {item.name}
                                    {isTeamSetup && (
                                        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-orange-500" />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <div className="p-4 border-t border-[#1a1a1a] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/5">
                            <span className="text-[10px] font-black text-white">{initials}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-white uppercase tracking-tight">{username}</span>
                            <div className="flex items-center space-x-1.5">
                                {isReady ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                )}
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                                    {isReady ? 'System READY' : 'Initialization...'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
                            window.location.href = '/login';
                        }}
                        className="p-2 hover:bg-red-500/10 rounded-lg group transition-all"
                    >
                        <LogOut className="w-4 h-4 text-slate-600 group-hover:text-red-500 transition-colors" />
                    </button>
                </div>
                </div>
            </aside>
        </>
    );
}
