'use client';

import { Command, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

export function Header({ isSidebarOpen, toggleSidebar }: HeaderProps) {
    return (
        <header className="md:hidden flex items-center justify-between h-16 px-4 border-b border-[#1a1a1a] bg-[#09090b] sticky top-0 z-30">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-[#1a1a1a]">
                    <Command className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Mission Control</span>
            </div>

            <button
                onClick={toggleSidebar}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
            >
                {isSidebarOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <Menu className="w-6 h-6" />
                )}
            </button>
        </header>
    );
}
