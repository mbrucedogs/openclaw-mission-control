'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import {
    CheckSquare,
    Users,
    FileCode,
    ShieldCheck,
    Users2,
    Calendar,
    FolderKanban,
    Brain,
    FileText,
    User,
    Monitor,
    LayoutGrid,
    Search,
    Factory,
    GitBranch,
    MessageSquare,
    Command,
    SearchCode,
    Activity,
    SearchIcon,
    LogOut,
    Settings,
    AlertCircle,
    ShieldAlert
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutGrid },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Orchestration', href: '/orchestration', icon: Settings },
    { name: 'Memory', href: '/memories', icon: Brain },
    { name: 'Docs', href: '/docs', icon: FileText },
    { name: 'Office', href: '/office', icon: Monitor },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ username = 'Admin' }: { username?: string }) {
    const pathname = usePathname();
    const [isReady, setIsReady] = useState<boolean | null>(null);

    useEffect(() => {
        fetch('/api/system/status')
            .then(res => res.json())
            .then(data => setIsReady(data.ready))
            .catch(() => setIsReady(false));
    }, [pathname]);

    const initials = username.slice(0, 2).toUpperCase();

    return (
        <div className="flex flex-col w-64 border-r border-[#1a1a1a] bg-[#09090b] h-screen text-slate-400">
            <div className="flex items-center h-20 px-6 border-b border-[#1a1a1a]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                    <Command className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Mission Control</span>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
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
    );
}
