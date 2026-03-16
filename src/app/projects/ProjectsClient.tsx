'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    LayoutGrid,
    FolderOpen,
    X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    progress: number;
    taskIds: string[];
}

export default function ProjectsClient({ projects }: { projects: Project[] }) {
    const router = useRouter();
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ id: '', name: '', description: '' });

    const activeCount = projects.filter(p => p.status === 'active').length;
    const holdCount = projects.filter(p => p.status === 'on-hold').length;
    const completedCount = projects.filter(p => p.status === 'completed').length;

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: form.id || form.name.toLowerCase().replace(/\s+/g, '-'),
                    name: form.name,
                    description: form.description,
                    status: 'active'
                })
            });
            if (res.ok) {
                setShowCreate(false);
                setForm({ id: '', name: '', description: '' });
                router.refresh();
            }
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="max-w-[1400px] p-12 space-y-10">
            <div className="flex items-center space-x-6">
                <div className="bg-[#101010] border border-[#1a1a1a] p-3 rounded-2xl text-emerald-500">
                    <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-white mb-1">Projects</h1>
                    <div className="flex items-center space-x-4 text-[13px] font-bold text-slate-500">
                        <span>{projects.length} total</span>
                        <span className="opacity-30">•</span>
                        <span>{activeCount} active</span>
                        {holdCount > 0 && (
                            <>
                                <span className="opacity-30">•</span>
                                <span>{holdCount} on hold</span>
                            </>
                        )}
                        {completedCount > 0 && (
                            <>
                                <span className="opacity-30">•</span>
                                <span>{completedCount} completed</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {projects.map((project) => {
                    const taskCount = project.taskIds.length;
                    return (
                        <Link key={project.id} href={`/projects/${project.id}`}>
                            <div className="bg-[#101010] border border-[#1a1a1a] rounded-3xl p-8 hover:border-emerald-500/30 transition-all cursor-pointer group flex flex-col min-h-[280px]">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/10 transition-colors">
                                            <FolderOpen className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-lg font-black text-white capitalize">{project.name}</h3>
                                    </div>
                                    <span className={cn(
                                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                        project.status === 'active' ? "bg-emerald-500/10 text-emerald-500" :
                                        project.status === 'completed' ? "bg-blue-500/10 text-blue-500" :
                                        "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {project.status}
                                    </span>
                                </div>

                                <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8 line-clamp-3 flex-1">
                                    {project.description || "No description available."}
                                </p>

                                <div className="mt-auto space-y-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-black text-[#666] tracking-widest uppercase">{Math.round(project.progress)}%</span>
                                            <span className="text-xs font-black text-[#666] tracking-widest uppercase">
                                                {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    project.progress >= 100
                                                        ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                                        : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                )}
                                                style={{ width: `${Math.min(project.progress, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {/* Add New — opens create modal */}
                <div
                    onClick={() => setShowCreate(true)}
                    className="border border-dashed border-[#1a1a1a] rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 hover:border-emerald-500/30 transition-all cursor-pointer group min-h-[280px]"
                >
                    <div className="w-12 h-12 rounded-full bg-[#101010] border border-[#1a1a1a] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-slate-600 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Initialize New Domain</span>
                </div>
            </div>

            {/* Create Project Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-black text-white">New Project</h2>
                            <button onClick={() => setShowCreate(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="e.g. Mobile App"
                                    required
                                    className="w-full bg-[#101010] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">ID (optional)</label>
                                <input
                                    type="text"
                                    value={form.id}
                                    onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                                    placeholder="auto-generated from name"
                                    className="w-full bg-[#101010] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Description</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    placeholder="What is this project about?"
                                    rows={3}
                                    className="w-full bg-[#101010] border border-[#1a1a1a] rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={creating || !form.name}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-xl transition-colors"
                            >
                                {creating ? 'Creating...' : 'Create Project'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
