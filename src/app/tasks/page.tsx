'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus, Search, RefreshCcw, X,
    Activity, Zap, Pencil, Trash2
} from 'lucide-react';
import { Task, TaskStatus, Priority, Agent, Project } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── Column definitions ──────────────────────────────────────────────────────

const COLUMNS: { label: string; status: TaskStatus; dot: string }[] = [
    { label: 'Recurring',   status: 'Recurring',    dot: 'bg-green-500' },
    { label: 'Backlog',     status: 'Backlog',       dot: 'bg-slate-500' },
    { label: 'In Progress', status: 'In Progress',   dot: 'bg-blue-500' },
    { label: 'Review',      status: 'Review',        dot: 'bg-amber-500' },
    { label: 'Done',        status: 'Complete',      dot: 'bg-emerald-500' },
];

// Tasks that map to "In Progress" column (covers legacy Implementation status too)
function getColumnTasks(tasks: Task[], status: TaskStatus): Task[] {
    if (status === 'In Progress') {
        return tasks.filter(t => t.status === 'In Progress' || t.status === 'Implementation');
    }
    return tasks.filter(t => t.status === status);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Canonical agent colors — matches the team page
const OWNER_COLORS: Record<string, string> = {
    matt:    'bg-indigo-600',
    max:     'bg-purple-600',
    alice:   'bg-pink-600',
    bob:     'bg-orange-600',
    charlie: 'bg-sky-600',
    aegis:   'bg-red-600',
    tron:    'bg-cyan-600',
};

// Priority badge config
const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
    urgent: { label: 'URGENT', className: 'text-red-400 bg-red-500/10 border-red-500/20' },
    high:   { label: 'HIGH',   className: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    normal: { label: 'NORMAL', className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
    low:    { label: 'LOW',    className: 'text-slate-600 bg-slate-600/10 border-slate-600/20' },
};

// Canonical workflow pipeline: which column each agent primarily works in
const AGENT_WORKFLOW: Record<string, TaskStatus> = {
    alice:   'In Progress',   // Research phase
    bob:     'In Progress',   // Implementation phase
    charlie: 'Review',        // QA phase
    aegis:   'Review',        // Final review/approval
    tron:    'Recurring',     // Automation
    max:     'Backlog',       // Orchestrator assigns from Backlog
};

function ownerColor(owner: string) {
    return OWNER_COLORS[owner?.toLowerCase()] ?? 'bg-slate-600';
}

function ownerInitial(owner: string) {
    return (owner ?? '?').charAt(0).toUpperCase();
}

function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ─── New Task Modal ───────────────────────────────────────────────────────────

function TaskFormModal({ task, onClose, onSaved, agents, projects }: {
    task?: Task;
    onClose: () => void;
    onSaved: () => void;
    agents: Agent[];
    projects: Project[];
}) {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [owner, setOwner] = useState(task?.owner || 'matt');
    const [projectId, setProjectId] = useState<string>(task?.project || projects[0]?.id || '');
    const [status, setStatus] = useState<TaskStatus>(task?.status || 'Backlog');
    const [priority, setPriority] = useState<Priority>((task?.priority as Priority) || 'normal');
    const [loading, setLoading] = useState(false);

    // When owner changes, suggest the right column based on workflow
    const handleOwnerChange = (newOwner: string) => {
        setOwner(newOwner);
        if (AGENT_WORKFLOW[newOwner] && !task) {
            setStatus(AGENT_WORKFLOW[newOwner]);
        }
    };

    const submit = async () => {
        if (!title.trim()) return;
        setLoading(true);
        const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
        const method = task ? 'PATCH' : 'POST';
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, owner, project: projectId || null, status, priority }),
        });
        setLoading(false);
        onSaved();
        onClose();
    };

    // All assignable people: Matt + all agents
    const assignees = [{ id: 'matt', name: 'Matt', role: 'Supervisor' }, ...agents];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg p-8 space-y-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-black text-white tracking-tight">{task ? 'Edit Task' : 'New Task'}</h2>
                    <button onClick={onClose}><X className="w-4 h-4 text-slate-500 hover:text-white" /></button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Title</label>
                        <input
                            autoFocus
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && submit()}
                            placeholder="What needs to be done?"
                            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
                        />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Optional details..."
                            rows={3}
                            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-none"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Assign to</label>
                            <select
                                value={owner}
                                onChange={e => handleOwnerChange(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"
                            >
                                {assignees.map(a => (
                                    <option key={a.id} value={a.id}>
                                        {a.name} — {a.role}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Priority</label>
                            <select
                                value={priority}
                                onChange={e => setPriority(e.target.value as Priority)}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"
                            >
                                <option value="urgent">🔴 Urgent</option>
                                <option value="high">🟠 High</option>
                                <option value="normal">⚪ Normal</option>
                                <option value="low">🔵 Low</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Column</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value as TaskStatus)}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"
                            >
                                {COLUMNS.map(c => <option key={c.status} value={c.status}>{c.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Project</label>
                            <select
                                value={projectId}
                                onChange={e => setProjectId(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"
                            >
                                <option value="">— None —</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Workflow hint */}
                    <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Workflow Pipeline</p>
                        <p className="text-[11px] text-slate-500">Max → Alice (Research) → Bob (Build) → Charlie (QA) → Aegis (Review) → Done</p>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white">Cancel</button>
                    <button
                        onClick={submit}
                        disabled={!title.trim() || loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-lg disabled:opacity-40 transition-colors"
                    >
                        {loading ? 'Saving...' : (task ? 'Save Changes' : 'Create Task')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({ task, onClose, onDeleted, onEdit }: { task: Task; onClose: () => void; onDeleted: () => void; onEdit: () => void; }) {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        setIsDeleting(true);
        await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
        setIsDeleting(false);
        onDeleted();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-2xl p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 mb-2">
                             <div className={cn(
                                'w-2 h-2 rounded-full',
                                task.isStuck ? 'bg-red-500 animate-pulse' : (
                                    task.status === 'Recurring' ? 'bg-green-500' :
                                    task.status === 'In Progress' || task.status === 'Implementation' ? 'bg-blue-500' :
                                    task.status === 'Review' ? 'bg-amber-500' :
                                    task.status === 'Complete' ? 'bg-emerald-500' :
                                    'bg-slate-500'
                                )
                            )} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{task.status}</span>
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight leading-snug">{task.title}</h2>
                    </div>
                    <div className="flex items-center gap-1 self-start -mt-2 -mr-2">
                        <button onClick={onEdit} className="p-2 text-slate-500 hover:text-white transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={handleDelete} disabled={isDeleting} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pb-6 border-b border-[#222] mt-6">
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Owner</span>
                        <div className="flex items-center gap-2">
                             <div className={cn('w-5 h-5 rounded flex items-center justify-center text-[10px] font-black text-white', ownerColor(task.owner))}>
                                {ownerInitial(task.owner)}
                            </div>
                            <span className="text-sm text-slate-300 font-medium">{task.owner}</span>
                        </div>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Priority</span>
                        <span className={cn(
                            'text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border inline-block',
                            PRIORITY_CONFIG[task.priority as Priority]?.className || 'text-slate-500 border-slate-500'
                        )}>
                            {PRIORITY_CONFIG[task.priority as Priority]?.label || task.priority}
                        </span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Project</span>
                        <span className="text-sm text-slate-300 font-medium">{task.project || '—'}</span>
                    </div>
                </div>

                <div className="space-y-6">
                    {task.description && (
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Description</span>
                            <div className="bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg p-5 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {task.description}
                            </div>
                        </div>
                    )}
                    
                    {task.supervisorNotes && (
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Supervisor Notes</span>
                            <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-5 text-sm text-blue-400 italic font-medium whitespace-pre-wrap leading-relaxed">
                                {task.supervisorNotes}
                            </div>
                        </div>
                    )}

                    {task.evidence && (
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Evidence</span>
                            <div className="bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg p-4">
                                <a 
                                    href={task.evidence.startsWith('http') ? task.evidence : '#'} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-sm font-bold text-blue-400 hover:text-blue-300 break-all"
                                >
                                    {task.evidence}
                                </a>
                            </div>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4 pt-6 mt-6 border-t border-[#222]">
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Created By</span>
                            <span className="text-xs text-slate-400">{task.requestedBy}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Last Updated</span>
                            <span className="text-xs text-slate-400">{new Date(task.updatedAt).toLocaleString()} ({timeAgo(task.updatedAt)})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onMoved, onClick }: { task: Task; onMoved: () => void; onClick: () => void }) {
    const [moving, setMoving] = useState(false);

    const move = async (newStatus: TaskStatus) => {
        setMoving(true);
        await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
        });
        setMoving(false);
        onMoved();
    };

    const nextCol = COLUMNS.find((_, i) => COLUMNS[i - 1]?.status === task.status || (task.status === 'Implementation' && COLUMNS[i]?.status === 'Review'));

    return (
        <div 
            onClick={onClick}
            className={cn(
            'bg-[#0d0d0f] border border-[#1d1d20] rounded-xl p-5 hover:border-slate-700 transition-all cursor-pointer group',
            task.isStuck ? 'border-red-500/30 bg-red-500/5' : '',
            task.priority === 'urgent' ? 'border-red-500/20' : '',
        )}>
                {/* Priority badge */}
                <div className="flex items-center gap-2 mb-3">
                    {task.priority && task.priority !== 'normal' && (
                        <span className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border',
                            PRIORITY_CONFIG[task.priority as Priority]?.className
                        )}>
                            {PRIORITY_CONFIG[task.priority as Priority]?.label}
                        </span>
                    )}
                    {task.retryCount != null && task.retryCount > 0 && (
                        <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">R:{task.retryCount}</span>
                    )}
                </div>
                {/* Title */}
                <div className="flex items-start gap-2 mb-3">
                    <div className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0 mt-1',
                        task.isStuck ? 'bg-red-500 animate-pulse' : (
                            task.status === 'Recurring' ? 'bg-green-500' :
                            task.status === 'In Progress' || task.status === 'Implementation' ? 'bg-blue-500' :
                            task.status === 'Review' ? 'bg-amber-500' :
                            task.status === 'Complete' ? 'bg-emerald-500' :
                            'bg-slate-500'
                        )
                    )} />
                    <h3 className="text-[13px] font-black text-slate-100 leading-snug line-clamp-2">{task.title}</h3>
                </div>

            {/* Supervisor notes & Evidence */}
            {(task.supervisorNotes || task.evidence) && (
                <div className="mb-3 px-3 py-2 bg-blue-500/5 border border-blue-500/10 rounded-lg">
                    {task.supervisorNotes && (
                        <p className="text-[10px] italic text-blue-400 font-medium pb-1.5 border-b border-blue-500/10">
                            "{task.supervisorNotes}"
                        </p>
                    )}
                    {task.evidence && (
                        <div className={cn("flex items-center gap-2", task.supervisorNotes ? "mt-1.5" : "")}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Evidence</span>
                            <a 
                                href={task.evidence.startsWith('http') ? task.evidence : '#'} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-bold text-blue-400 hover:text-blue-300 truncate max-w-[170px]"
                                onClick={e => e.stopPropagation()}
                                title={task.evidence}
                            >
                                {task.evidence.replace(/^https?:\/\//, '')}
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Description */}
            {task.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {task.description}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={cn('w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black text-white flex-shrink-0', ownerColor(task.owner))}>
                        {ownerInitial(task.owner)}
                    </div>
                    {task.project && (
                        <span className="text-[9px] font-bold text-slate-400 bg-[#1a1a1e] border border-[#222] rounded px-1.5 py-0.5">
                            {task.project}
                        </span>
                    )}
                </div>
                <span className="text-[9px] font-bold text-slate-600">{timeAgo(task.updatedAt)}</span>
            </div>


            {/* Move button */}
            {nextCol && (
                <button
                    onClick={(e) => { e.stopPropagation(); move(nextCol.status); }}
                    disabled={moving}
                    className="mt-2 w-full text-[9px] font-black text-slate-600 hover:text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity text-center"
                >
                    → Move to {nextCol.label}
                </button>
            )}
        </div>
    );
}

// ─── Activity Item ────────────────────────────────────────────────────────────

function ActivityItem({ act }: { act: any }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[#141416] last:border-0">
            <div className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 mt-0.5',
                ownerColor(act.actor?.toLowerCase())
            )}>
                {ownerInitial(act.actor)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[11px] font-black text-slate-200">{act.actor}</span>
                    <span className="text-[9px] font-bold text-slate-600 whitespace-nowrap">{timeAgo(act.timestamp)}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug line-clamp-2">{act.message}</p>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activity, setActivity] = useState<any[]>([]);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [ownerFilter, setOwnerFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [showNewTask, setShowNewTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const load = useCallback(async () => {
        const [t, a, ag, pr] = await Promise.all([
            fetch('/api/tasks').then(r => r.json()),
            fetch('/api/activity').then(r => r.json()),
            fetch('/api/agents').then(r => r.json()),
            fetch('/api/projects').then(r => r.json()),
        ]);
        setTasks(Array.isArray(t) ? t : []);
        setActivity(Array.isArray(a) ? a : []);
        setAgents(Array.isArray(ag) ? ag : []);
        setProjects(Array.isArray(pr) ? pr : []);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh tasks & activity every 3s so the board feels "live" with the agents
    useEffect(() => {
        const iv = setInterval(async () => {
            try {
                const [t, a] = await Promise.all([
                    fetch('/api/tasks').then(r => r.json()),
                    fetch('/api/activity').then(r => r.json())
                ]);
                setTasks(Array.isArray(t) ? t : []);
                setActivity(Array.isArray(a) ? a : []);
            } catch (err) {
                console.error('Auto-refresh failed', err);
            }
        }, 3000);
        return () => clearInterval(iv);
    }, []);

    const filtered = tasks.filter(t => {
        const matchOwner = ownerFilter === 'all' || t.owner === ownerFilter;
        const matchProject = projectFilter === 'all' || t.project === projectFilter;
        const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchOwner && matchProject && matchSearch;
    });

    const stats = {
        total: tasks.length,
        inProgress: tasks.filter(t => t.status === 'In Progress' || t.status === 'Implementation').length,
        done: tasks.filter(t => t.status === 'Complete').length,
        completion: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Complete').length / tasks.length) * 100) : 0,
    };

    // Filter tabs: all active agents (from DB) + Matt, in workflow order
    const WORKFLOW_ORDER = ['matt', 'max', 'alice', 'bob', 'charlie', 'aegis', 'tron'];
    const knownAgentIds = new Set(agents.map(a => a.id));
    // Show tabs for agents who have tasks OR are in the canonical roster
    const activeOwners = WORKFLOW_ORDER.filter(id =>
        id === 'matt' || knownAgentIds.has(id)
    );
    // Map id → display name from agents table
    const agentName = (id: string) => agents.find(a => a.id === id)?.name ?? (id === 'matt' ? 'Matt' : id);

    return (
        <div className="flex h-full overflow-hidden">
            {/* ── Left: Kanban area ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Top bar */}
                <div className="flex-shrink-0 px-10 pt-8 pb-0">
                    {/* Stats */}
                    <div className="flex items-center gap-10 mb-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-blue-500">{stats.inProgress}</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">In progress</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-300">{stats.total}</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-emerald-500">{stats.completion}%</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Completion</span>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => setShowNewTask(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New task
                        </button>

                        {/* Owner filter tabs — canonical workflow order */}
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setOwnerFilter('all')}
                                className={cn('px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors', ownerFilter === 'all' ? 'text-white bg-[#1a1a1e]' : 'text-slate-500 hover:text-white')}
                            >
                                All
                            </button>
                            {activeOwners.map(id => (
                                <button
                                    key={id}
                                    onClick={() => setOwnerFilter(id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors',
                                        ownerFilter === id ? 'text-white bg-[#1a1a1e]' : 'text-slate-500 hover:text-white'
                                    )}
                                >
                                    <div className={cn('w-1.5 h-1.5 rounded-full', ownerColor(id))} />
                                    {agentName(id)}
                                </button>
                            ))}
                        </div>

                        {/* Project filter dropdown */}
                        {projects.length > 0 && (
                            <select
                                value={projectFilter}
                                onChange={e => setProjectFilter(e.target.value)}
                                className="ml-2 bg-[#0d0d0f] border border-[#1d1d20] rounded-lg px-3 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-slate-600"
                            >
                                <option value="all">All projects</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        )}
                        <div className="relative ml-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="bg-[#0d0d0f] border border-[#1d1d20] rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-300 w-44 focus:outline-none focus:border-slate-600 placeholder:text-slate-600"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Kanban columns (horizontal scroll) ── */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-10 pb-8">
                    <div className="flex gap-5 h-full" style={{ minWidth: `${COLUMNS.length * 300}px` }}>
                        {COLUMNS.map(col => {
                            const colTasks = getColumnTasks(filtered, col.status);
                            return (
                                <div key={col.status} className="flex flex-col w-72 flex-shrink-0">
                                    {/* Column header */}
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-1.5 h-1.5 rounded-full', col.dot)} />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-[#555]">{col.label}</span>
                                            <span className="text-[10px] font-bold text-[#333]">{colTasks.length}</span>
                                        </div>
                                        <button
                                            onClick={() => setShowNewTask(true)}
                                            className="text-[#2a2a2a] hover:text-slate-500 transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    {/* Cards */}
                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                        {colTasks.length === 0 ? (
                                            <div className="flex items-center justify-center h-24 border border-dashed border-[#1a1a1a] rounded-xl">
                                                <span className="text-[11px] font-bold text-[#2a2a2a]">No tasks</span>
                                            </div>
                                        ) : (
                                            colTasks.map(task => (
                                                <TaskCard key={task.id} task={task} onMoved={load} onClick={() => setSelectedTask(task)} />
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Right: Fixed Live Activity panel ── */}
            <div className="flex-shrink-0 w-72 border-l border-[#141416] flex flex-col bg-[#080809]">
                <div className="px-6 pt-8 pb-4 border-b border-[#141416] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Live Activity</h2>
                    </div>
                    <button onClick={load} className="text-slate-600 hover:text-slate-400 transition-colors">
                        <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-2">
                    {activity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Activity className="w-6 h-6 text-slate-700 mb-2" />
                            <p className="text-[11px] font-bold text-slate-600">No activity yet</p>
                            <p className="text-[10px] text-slate-700 mt-1">Agent actions will appear here</p>
                        </div>
                    ) : (
                        activity.map(act => <ActivityItem key={act.id} act={act} />)
                    )}
                </div>
            </div>

            {/* New / Edit Task Modal */}
            {(showNewTask || editingTask) && (
                <TaskFormModal
                    task={editingTask || undefined}
                    onClose={() => {
                        setShowNewTask(false);
                        setEditingTask(null);
                    }}
                    onSaved={load}
                    agents={agents}
                    projects={projects}
                />
            )}
            
            {/* Task Detail Modal */}
            {selectedTask && !editingTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onDeleted={() => { setSelectedTask(null); load(); }}
                    onEdit={() => setEditingTask(selectedTask)}
                />
            )}
        </div>
    );
}
