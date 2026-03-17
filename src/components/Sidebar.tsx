'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
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
    Settings
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
];

export function Sidebar({ username = 'Admin' }: { username?: string }) {
    const pathname = usePathname();
    const initials = username.slice(0, 2).toUpperCase();

    return (
        <div className="flex flex-col w-64 border-r border-[#1a1a1a] bg-[#09090b] h-screen text-slate-400">
            <div className="flex items-center h-20 px-6 border-b border-[#1a1a1a]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3">
                    <Command className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Mission Control</span>
            </div>

            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all',
                                isActive
                                    ? 'bg-[#1a1a1a] text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-200'
                            )}
                        >
                            <item.icon
                                className={cn(
                                    'mr-4 h-4 w-4 transition-colors',
                                    isActive ? 'text-white' : 'text-slate-600'
                                )}
                                aria-hidden="true"
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-[#1a1a1a] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-white/5">
                        <span className="text-[10px] font-black text-white">{initials}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white uppercase tracking-tight">{username}</span>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Authorized Session</span>
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
