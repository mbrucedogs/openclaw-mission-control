'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutWrapperProps {
    children: React.ReactNode;
    username?: string;
}

export function LayoutWrapper({ children, username = 'Admin' }: LayoutWrapperProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="relative flex h-[100dvh] flex-col overflow-x-hidden bg-black md:flex-row md:overflow-hidden">
            <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            
            <Sidebar 
                username={username} 
                isOpen={isSidebarOpen} 
                onClose={closeSidebar} 
            />
            
            <main className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
                {children}
            </main>
        </div>
    );
}
