'use client';

import { cn } from '@/lib/utils';
import {
    Calendar,
    ChevronRight,
    Sparkles,
    SearchIcon,
} from 'lucide-react';
import { useState, useMemo } from 'react';

export function MemoriesClient({ memories }: { memories: any[] }) {
    const [selected, setSelected] = useState(memories[0]?.id || null);
    const [search, setSearch] = useState('');
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
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

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

        // Sort groups: Recent first, then newest-first by label
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

    return (
        <div className="flex h-screen relative">
            {/* Left Sidebar */}
            <div className="w-80 border-r border-[#1a1a1a] flex flex-col bg-[#09090b]">
                <div className="p-6 space-y-5 flex flex-col h-full">
                    <div className="relative flex-shrink-0">
                        <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search memory..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#101010] border border-[#1a1a1a] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-slate-800"
                        />
                    </div>

                    {longTermMemories.length > 0 && (
                        <div
                            onClick={() => setSelected(longTermMemories[0]?.id)}
                            className={cn(
                                "flex-shrink-0 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4 flex items-center justify-between group cursor-pointer hover:bg-indigo-600/20 transition-all",
                                longTermMemories[0] && selected === longTermMemories[0].id && "ring-1 ring-indigo-500/40"
                            )}
                        >
                            <div className="flex items-center space-x-3">
                                <div className="bg-indigo-600 p-2 rounded-xl">
                                    <Sparkles className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white">Long-Term Memory</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                        {longTermMemories.length} files • {ltWordCount.toLocaleString()} words
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-5 pr-1">
                        <section>
                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] block mb-4">
                                Daily Journal{' '}
                                <span className="ml-2 bg-[#1a1a1a] px-1.5 py-0.5 rounded text-[#444]">
                                    {filteredMemories.length} entries
                                </span>
                            </label>
                            <div className="space-y-5">
                                {groups.map(([groupTitle, items]) => (
                                    <JournalSection
                                        key={groupTitle}
                                        title={groupTitle}
                                        count={items.length}
                                        items={items}
                                        selected={selected}
                                        onSelect={setSelected}
                                    />
                                ))}
                                {groups.length === 0 && (
                                    <p className="text-xs text-slate-600 text-center pt-4">No memories found</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 bg-[#000] overflow-y-auto">
                <div className="p-12">
                    {selectedItem ? (
                        <>
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 bg-[#101010] border border-[#1a1a1a] rounded-2xl text-slate-400">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-black text-white">{selectedItem.id}</h1>
                                        <p className="text-[13px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                                            {new Date(selectedItem.timestamp).toLocaleDateString('en-US', {
                                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                            })} • {(selectedItem.content.length / 1024).toFixed(1)} KB • {selectedItem.content.split(/\s+/).length.toLocaleString()} words
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <h2 className="text-3xl font-black text-white mb-8 border-b border-[#1a1a1a] pb-6">
                                    {selectedItem.id}
                                </h2>
                                <div className="text-slate-300 text-base leading-relaxed font-medium whitespace-pre-wrap">
                                    {selectedItem.content}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-slate-500 mt-20">
                            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-800" />
                            <p className="text-lg font-bold">Select a memory to view</p>
                            <p className="text-sm mt-2">Your OpenClaw daily journals will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function JournalSection({ title, count, items, selected, onSelect }: any) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                <span className="flex items-center">
                    <ChevronRight className="w-3 h-3 mr-1" />
                    {title}
                </span>
                <span className="opacity-50">({count})</span>
            </div>
            <div className="space-y-1.5">
                {items.map((item: any) => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={cn(
                            "p-3 rounded-xl transition-all cursor-pointer",
                            selected === item.id
                                ? "bg-[#1a1a1a] border border-[#222]"
                                : "hover:bg-[#101010] border border-transparent"
                        )}
                    >
                        <h4 className="text-sm font-black text-white mb-0.5 truncate">{item.id}</h4>
                        <div className="text-[10px] font-bold text-slate-500 tracking-tighter">
                            {(item.content.length / 1024).toFixed(1)} KB • {item.content.split(/\s+/).length.toLocaleString()} words
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
