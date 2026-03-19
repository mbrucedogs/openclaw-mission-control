'use client';

import { Command, Menu, X } from 'lucide-react';

interface HeaderProps {
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
}

export function Header({ isSidebarOpen, toggleSidebar }: HeaderProps) {
    return (
        <header className="sticky top-0 z-[70] flex min-h-16 shrink-0 items-center justify-between border-b border-[#1a1a1a] bg-[#09090b] px-4 pt-[max(env(safe-area-inset-top),0px)] md:hidden">
            <div className="flex items-center">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-[#1a1a1a]">
                    <Command className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-black text-white uppercase tracking-widest">Mission Control</span>
            </div>

            <button
                onClick={toggleSidebar}
                type="button"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={isSidebarOpen}
                aria-controls="mobile-sidebar"
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
