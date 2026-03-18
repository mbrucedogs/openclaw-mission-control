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
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-black relative">
            <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            
            <Sidebar 
                username={username} 
                isOpen={isSidebarOpen} 
                onClose={closeSidebar} 
            />
            
            <main className="flex-1 overflow-y-auto relative">
                {children}
            </main>
        </div>
    );
}
