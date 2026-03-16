'use client';

import { cn } from '@/lib/utils';
import {
    Calendar,
    ChevronRight,
    Sparkles,
    SearchIcon,
    Clock,
    Maximize2,
    X,
    FileText,
    RefreshCw,
    Brain
} from 'lucide-react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

export function MemoriesClient({ memories }: { memories: any[] }) {
    const [selected, setSelected] = useState(memories[0]?.id || null);
    const [search, setSearch] = useState('');
    const [fullscreen, setFullscreen] = useState(false);

    const selectedItem = memories.find((m) => m.id === selected) || null;

    const dailyMemories = useMemo(() =>
        memories.filter(m => m.category !== 'long-term'),
        [memories]
    );

    const longTermMemories = useMemo(() =>
        memories.filter(m => m.category === 'long-term'),
        [memories]
    );

    const filteredMemories = useMemo(() => {
        if (!search.trim()) return dailyMemories;
        const q = search.toLowerCase();
        return dailyMemories.filter(m =>
            m.id.toLowerCase().includes(q) || m.content.toLowerCase().includes(q)
        );
    }, [dailyMemories, search]);

    // Group by month label
    const groups = useMemo(() => {
        const now = new Date();
        const grouped: Record<string, any[]> = {};

        for (const m of filteredMemories) {
            const dateMatch = m.id.match(/^(\d{4}-\d{2}-\d{2})/);
            if (!dateMatch) {
                const key = 'Reference';
                grouped[key] = grouped[key] || [];
                grouped[key].push(m);
                continue;
            }
            const date = new Date(dateMatch[1]);
            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

            let key: string;
            if (diffDays <= 1) key = 'Recent';
            else if (diffDays <= 7) key = 'This Week';
            else {
                key = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            }
            grouped[key] = grouped[key] || [];
            grouped[key].push(m);
        }

        const order = ['Recent', 'This Week'];
        const sorted = Object.entries(grouped).sort(([a], [b]) => {
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a > b ? -1 : 1;
        });

        return sorted;
    }, [filteredMemories]);

    const ltWordCount = longTermMemories.reduce((acc, m) => acc + m.content.split(/\s+/).length, 0);

    useEffect(() => {
        if (!fullscreen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setFullscreen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [fullscreen]);

    return (
        <div className="flex h-screen relative bg-[#09090b] text-slate-200 overflow-hidden">
            {/* Left Sidebar */}
            <aside className="w-[380px] border-r border-[#1a1a1a] flex flex-col bg-[#09090b] relative z-20">
                <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tighter">MEMORIES</h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Neural Logs & Journals</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="p-2 hover:bg-[#1a1a1a] rounded-xl transition-all text-slate-500 hover:text-indigo-400">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-shrink-0 group">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search neural logs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#101010] border border-[#1a1a1a] rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
                        />
                    </div>

                    {/* Long Term Memory Highlight */}
                    {longTermMemories.length > 0 && (
                        <div
                            onClick={() => setSelected(longTermMemories[0]?.id)}
                            className={cn(
                                "flex-shrink-0 p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between group",
                                selected === longTermMemories[0].id 
                                    ? "bg-indigo-600/10 border-indigo-600/30 ring-1 ring-indigo-500/20" 
                                    : "bg-[#101010]/40 border-[#1a1a1a] hover:border-indigo-500/30 hover:bg-indigo-600/[0.02]"
                            )}
                        >
                            <div className="flex items-center space-x-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    selected === longTermMemories[0].id ? "bg-indigo-600 text-white" : "bg-indigo-600/10 text-indigo-400"
                                )}>
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[13px] font-black text-white leading-none">Long-Term Memory</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">
                                        {ltWordCount.toLocaleString()} words
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className={cn("w-4 h-4 transition-all", selected === longTermMemories[0].id ? "text-indigo-400 translate-x-1" : "text-slate-700")} />
                        </div>
                    )}

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {groups.map(([groupTitle, items]) => (
                            <section key={groupTitle} className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                        {groupTitle}
                                    </label>
                                    <span className="text-[9px] font-black text-slate-800 bg-[#101010] px-1.5 py-0.5 rounded-lg border border-[#1a1a1a]">
                                        {items.length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {items.map((item: any) => (
                                        <div
                                            key={item.id}
                                            onClick={() => setSelected(item.id)}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start space-x-4 group",
                                                selected === item.id 
                                                    ? "bg-indigo-600/5 border-indigo-600/30" 
                                                    : "hover:bg-[#101010] border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                                selected === item.id ? "bg-indigo-600 text-white" : "bg-[#1a1a1a] text-slate-500 group-hover:text-slate-300"
                                            )}>
                                                <Brain className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0 py-0.5">
                                                <h4 className={cn(
                                                    "text-[13px] font-bold truncate transition-colors",
                                                    selected === item.id ? "text-white" : "text-slate-300 group-hover:text-white"
                                                )}>{item.id}</h4>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg bg-slate-800/50 text-slate-400">Journal</span>
                                                    <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        {new Date(item.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}

                        {!groups.length && (
                            <div className="text-center py-12 px-6">
                                <div className="w-16 h-16 bg-[#101010] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#1a1a1a]">
                                    <SearchIcon className="w-8 h-8 text-slate-800" />
                                </div>
                                <p className="text-sm font-bold text-slate-400">No memories found</p>
                                <p className="text-[11px] text-slate-600 mt-2 font-medium">Try a different search term.</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 bg-[#000] overflow-y-auto relative custom-scrollbar p-10">
                {selectedItem ? (
                    <div className="max-w-4xl mx-auto py-10">
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-indigo-500">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-white tracking-tight">{selectedItem.id}</h1>
                                    <p className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mt-1">
                                        {new Date(selectedItem.timestamp).toLocaleDateString('en-US', {
                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setFullscreen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#101010] hover:bg-[#1a1a1a] border border-[#1a1a1a] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all shadow-lg shadow-black/20"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                                Expand View
                            </button>
                        </div>

                        <div className="prose prose-invert max-w-none">
                             <MarkdownRenderer 
                                content={selectedItem.content} 
                                preview={false}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 bg-[#0a0a0a] rounded-[2rem] border border-[#1a1a1a] flex items-center justify-center mb-6">
                            <Brain className="w-8 h-8 text-slate-800" />
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight">Select a Neural Log</h2>
                        <p className="text-sm text-slate-600 mt-2 font-medium">Choose a daily journal or long-term memory to view.</p>
                    </div>
                )}
            </main>

            {fullscreen && selectedItem && (
                <div className="fixed inset-0 z-[100] bg-black p-10 lg:p-20 overflow-y-auto animate-in fade-in zoom-in duration-300">
                    <div className="max-w-5xl mx-auto relative">
                        <div className="flex justify-end mb-8">
                            <button 
                                onClick={() => setFullscreen(false)}
                                className="p-3 bg-[#101010] border border-[#1a1a1a] rounded-2xl text-slate-500 hover:text-white transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                            >
                                <X className="w-5 h-5" />
                                Close
                            </button>
                        </div>
                        
                        <div className="mb-12">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                    {selectedItem.category === 'long-term' ? 'Core Memory' : 'Journal'}
                                </div>
                                <span className="text-xs font-bold text-slate-500">
                                    {new Date(selectedItem.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            <h1 className="text-6xl font-black text-white tracking-tighter mb-4">{selectedItem.id}</h1>
                            <div className="w-20 h-1.5 bg-indigo-600 rounded-full" />
                        </div>

                        <div className="prose prose-invert max-w-none pb-20">
                            <MarkdownRenderer 
                                content={selectedItem.content} 
                                preview={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1a1a1a;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #252525;
                }
            `}</style>
        </div>
    );
}
