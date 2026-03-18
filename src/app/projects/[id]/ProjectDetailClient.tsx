'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    FolderKanban,
    CheckCircle2,
    Layout,
    PlayCircle,
    Search,
    Shield,
    TestTube,
    Circle,
    Pencil,
    Trash2,
    X,
    Save
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Task {
    id: string;
    title: string;
    status: string;
    owner: string;
    updatedAt: string;
}

interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    progress: number;
    taskIds?: string[];
}

const statusIcons: Record<string, any> = {
    'Backlog': Circle,
    'Research': Search,
    'Implementation': PlayCircle,
    'QA': TestTube,
    'Review': Shield,
    'Complete': CheckCircle2,
};

const statusColors: Record<string, string> = {
    'Complete': 'text-emerald-500',
    'Implementation': 'text-amber-500',
    'QA': 'text-blue-400',
    'Review': 'text-purple-400',
    'Research': 'text-cyan-400',
    'Backlog': 'text-slate-500',
};

export default function ProjectDetailClient({ project, tasks }: { project: Project; tasks: Task[] }) {
    const router = useRouter();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        name: project.name,
        description: project.description || '',
        status: project.status
    });

    const doneCount = tasks.filter(t => t.status === 'Complete').length;
    const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : project.progress;

    async function handleSave() {
        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setEditing(false);
                router.refresh();
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
            if (res.ok) {
                router.push('/projects');
                router.refresh();
            }
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div className="max-w-[1400px] p-6 lg:p-12">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <Link href="/projects" className="flex items-center text-sm font-bold text-slate-500 hover:text-emerald-400 group transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Projects
                    </Link>
                    <div className="flex items-center space-x-2">
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-emerald-400 bg-[#101010] border border-[#1a1a1a] hover:border-emerald-500/30 transition-all"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>Edit</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>{saving ? 'Saving...' : 'Save'}</span>
                                </button>
                                <button
                                    onClick={() => { setEditing(false); setForm({ name: project.name, description: project.description || '', status: project.status }); }}
                                    className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 bg-[#101010] border border-[#1a1a1a] hover:text-white transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Cancel</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-red-400 bg-[#101010] border border-[#1a1a1a] hover:border-red-500/30 transition-all"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-6 sm:gap-0">
                    <div className="flex items-center space-x-4">
                        <div className="p-2 sm:p-3 bg-[#101010] border border-[#1a1a1a] rounded-xl">
                            <Layout className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                        </div>
                        <div>
                            {editing ? (
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    className="text-2xl sm:text-3xl font-black text-white bg-transparent border-b border-emerald-500/30 focus:outline-none focus:border-emerald-500 pb-1 capitalize w-full"
                                />
                            ) : (
                                <h1 className="text-2xl sm:text-3xl font-black text-white mb-1 capitalize leading-tight">{project.name}</h1>
                            )}
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">Project Domain</p>
                        </div>
                    </div>
                    <div className="text-left sm:text-right">
                        <div className="text-xl sm:text-2xl font-black text-white">{Math.round(progress)}%</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completion</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="border border-[#1a1a1a] rounded-2xl bg-[#101010] overflow-hidden">
                        <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
                            <h2 className="font-black text-white text-sm uppercase tracking-widest flex items-center">
                                <FolderKanban className="w-4 h-4 mr-2 text-emerald-500" />
                                Domain Tasks
                            </h2>
                            <span className="text-xs font-bold text-slate-400 bg-[#1a1a1a] px-2.5 py-0.5 rounded-full">
                                {tasks.length}
                            </span>
                        </div>
                        <div className="divide-y divide-[#1a1a1a]">
                            {tasks.map((task) => {
                                const Icon = statusIcons[task.status] || Circle;
                                return (
                                    <div key={task.id} className="p-4 hover:bg-[#151515] transition-colors cursor-pointer group">
                                        <div className="flex items-start">
                                            <div className="mt-1 mr-3">
                                                <Icon className={cn("w-4 h-4", statusColors[task.status] || "text-slate-500")} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-semibold text-white truncate group-hover:text-emerald-400 transition-colors">
                                                    {task.title}
                                                </h3>
                                                <div className="flex items-center space-x-3 mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    <span>{task.id}</span>
                                                    <span>•</span>
                                                    <span className="capitalize">{task.owner}</span>
                                                </div>
                                            </div>
                                            <div className="ml-4 text-[10px] font-bold text-slate-500 tabular-nums">
                                                {new Date(task.updatedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {tasks.length === 0 && (
                                <div className="p-12 text-center text-slate-500 text-sm">
                                    No active tasks for this project domain.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="border border-[#1a1a1a] rounded-2xl bg-[#101010] p-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Domain Info</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Status</label>
                                {editing ? (
                                    <select
                                        value={form.status}
                                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                                        className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                    >
                                        <option value="active">Active</option>
                                        <option value="on-hold">On Hold</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                ) : (
                                    <span className={cn(
                                        "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg",
                                        project.status === 'active' ? "bg-emerald-500/10 text-emerald-500" :
                                        project.status === 'completed' ? "bg-blue-500/10 text-blue-500" :
                                        "bg-amber-500/10 text-amber-500"
                                    )}>
                                        {project.status}
                                    </span>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Description</label>
                                {editing ? (
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        rows={4}
                                        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 resize-none"
                                    />
                                ) : (
                                    <p className="text-sm text-slate-400 leading-relaxed">
                                        {project.description || 'No description provided.'}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Progress</label>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-500 font-bold">
                                        <span>{doneCount} of {tasks.length} tasks complete</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[#1a1a1a] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-black text-white">Delete Project</h2>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">
                            Are you sure you want to delete <strong className="text-white">{project.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 bg-[#101010] border border-[#1a1a1a] hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-40 transition-colors"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
