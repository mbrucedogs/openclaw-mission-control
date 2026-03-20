'use client';

import { useState, useEffect } from 'react';
import { 
    Settings, Plus, Trash2, 
    User, Save, X, Loader2,
    Users, Bot, Edit3, Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
    username: string;
    role: string;
    createdAt: string;
}

interface AgentData {
    id: string;
    name: string;
    role: string;
    type: string | null;
    mission: string | null;
    status: string;
}

const AGENT_TYPES = [
    { value: 'orchestrator', label: 'Orchestrator' },
    { value: 'researcher', label: 'Researcher' },
    { value: 'builder', label: 'Builder' },
    { value: 'tester', label: 'Tester' },
    { value: 'reviewer', label: 'Reviewer' },
    { value: 'ux', label: 'UX' },
    { value: 'product', label: 'Product' },
    { value: 'prototyper', label: 'Prototyper' },
    { value: 'sre', label: 'SRE' },
    { value: 'security', label: 'Security' },
    { value: 'automation', label: 'Automation' },
];

type TabType = 'users' | 'agents';

export default function SettingsPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [agents, setAgents] = useState<AgentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('users');

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const res = await fetch('/api/users');
                if (res.ok) setUsers(await res.json());
            } else {
                const res = await fetch('/api/agents');
                if (res.ok) setAgents(await res.json());
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {/* Header */}
            <div className="px-6 sm:px-12 py-8 sm:py-10 border-b border-[#1a1a1a] bg-[#09090b] mb-4 sm:mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20 shadow-[0_0_15px_rgba(148,163,184,0.05)]">
                            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-[0.2em] leading-none">System Settings</h1>
                            <p className="hidden sm:block text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Configuration and user management system</p>
                        </div>
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex gap-1 bg-[#111] p-1 rounded-lg border border-[#222]">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all",
                                activeTab === 'users' 
                                    ? "bg-blue-600 text-white" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Users</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('agents')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all",
                                activeTab === 'agents' 
                                    ? "bg-blue-600 text-white" 
                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <Bot className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Agents</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-12 pb-20">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    activeTab === 'users' 
                        ? <UsersTab users={users} onRefresh={() => loadData()} />
                        : <AgentsTab agents={agents} onRefresh={() => loadData()} />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// USERS TAB
// ============================================================================

function UsersTab({ users, onRefresh }: { users: UserData[]; onRefresh: () => void }) {
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'user'
    });

    const handleDelete = async (username: string) => {
        if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
        
        try {
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });
            
            if (res.ok) {
                onRefresh();
            } else {
                alert('Failed to delete user');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting user');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            
            if (res.ok) {
                setIsCreating(false);
                setFormData({ username: '', password: '', role: 'user' });
                onRefresh();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to create user');
            }
        } catch (err) {
            console.error('Create error:', err);
            alert('Error creating user');
        }
        setIsSaving(false);
    };

    return (
        <div className="max-w-6xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-white">User Management</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage authorized users who can access Mission Control.
                    </p>
                </div>
                {!isCreating && (
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-500/10"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New User
                    </button>
                )}
            </div>

            {isCreating && (
                <form onSubmit={handleSubmit} className="bg-[#111] border border-[#222] rounded-xl p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
                    <h3 className="text-sm font-bold text-white mb-4">Create New User</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-colors"
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Role</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none transition-colors"
                            >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-lg transition-all"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {isSaving ? 'Creating...' : 'Create User'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black px-4 py-2 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(user => (
                    <div key={user.username} className="bg-[#111] border border-[#222] rounded-xl p-5 hover:border-slate-700 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                <User className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className={cn(
                                "text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-widest",
                                user.role === 'admin' ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                            )}>
                                {user.role}
                            </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{user.username}</h4>
                        <p className="text-[10px] text-slate-500 mb-4 tracking-tight font-medium">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                        
                        <div className="flex pt-4 border-t border-[#222]">
                            <button 
                                onClick={() => handleDelete(user.username)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 py-2 rounded-lg hover:bg-red-500/5 transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete User
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {users.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-[#222] rounded-2xl bg-[#09090b]">
                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                        <User className="w-6 h-6 text-slate-700" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400">No persistent users found</h3>
                    <p className="text-xs text-slate-600 mt-1">The system administrator is managed via environment variables.</p>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// AGENTS TAB
// ============================================================================

function AgentsTab({ agents, onRefresh }: { agents: AgentData[]; onRefresh: () => void }) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editType, setEditType] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const handleSave = async (id: string) => {
        setSaving(true);
        try {
            const res = await fetch('/api/agents/type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, type: editType }),
            });
            
            if (res.ok) {
                setEditingId(null);
                onRefresh();
            } else {
                alert('Failed to update agent type');
            }
        } catch (err) {
            console.error('Update error:', err);
            alert('Error updating agent');
        }
        setSaving(false);
    };

    const startEdit = (agent: AgentData) => {
        setEditingId(agent.id);
        setEditType(agent.type || '');
    };

    const getTypeColor = (type: string | null) => {
        switch (type) {
            case 'orchestrator': return 'bg-purple-500/10 text-purple-400';
            case 'researcher': return 'bg-blue-500/10 text-blue-400';
            case 'builder': return 'bg-green-500/10 text-green-400';
            case 'tester': return 'bg-orange-500/10 text-orange-400';
            case 'reviewer': return 'bg-yellow-500/10 text-yellow-400';
            case 'ux': return 'bg-pink-500/10 text-pink-400';
            case 'product': return 'bg-cyan-500/10 text-cyan-400';
            case 'prototyper': return 'bg-red-500/10 text-red-400';
            case 'sre': return 'bg-emerald-500/10 text-emerald-400';
            case 'security': return 'bg-amber-500/10 text-amber-400';
            case 'automation': return 'bg-slate-500/10 text-slate-400';
            default: return 'bg-gray-500/10 text-gray-400';
        }
    };

    return (
        <div className="max-w-6xl space-y-8">
            <div>
                <h2 className="text-lg font-black text-white">Agent Management</h2>
                <p className="text-sm text-slate-500 mt-1">
                    Configure agent types and roles. Changes sync with OpenClaw workspace.
                </p>
            </div>

            <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#0a0a0a] border-b border-[#222] text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <div className="col-span-3">Agent</div>
                    <div className="col-span-4">Role</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-2 text-right">Actions</div>
                </div>

                {/* Agent Rows */}
                {agents.map(agent => (
                    <div 
                        key={agent.id}
                        className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors items-center"
                    >
                        {/* Agent Name */}
                        <div className="col-span-3 flex items-center gap-3">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                agent.type ? getTypeColor(agent.type).replace('/10', '/20').replace('text-', 'bg-').replace('text-', 'border-') : 'bg-slate-500/20'
                            )}>
                                <Bot className={cn("w-4 h-4", agent.type ? getTypeColor(agent.type).replace('/10', '') : 'text-slate-400')} />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">{agent.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">{agent.id}</div>
                            </div>
                        </div>

                        {/* Role Description */}
                        <div className="col-span-4 flex items-center">
                            <span className="text-xs text-slate-400 truncate">{agent.role}</span>
                        </div>

                        {/* Type Selector */}
                        <div className="col-span-3">
                            {editingId === agent.id ? (
                                <select
                                    value={editType}
                                    onChange={e => setEditType(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white focus:border-blue-500 outline-none transition-colors"
                                >
                                    <option value="">Select Type...</option>
                                    {AGENT_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <span className={cn(
                                    "inline-flex text-[9px] font-bold px-2 py-1 rounded uppercase tracking-widest",
                                    getTypeColor(agent.type)
                                )}>
                                    {agent.type || 'unset'}
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex justify-end gap-2">
                            {editingId === agent.id ? (
                                <>
                                    <button
                                        onClick={() => handleSave(agent.id)}
                                        disabled={saving}
                                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                                    >
                                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="flex items-center gap-1 text-slate-400 hover:text-white text-[10px] font-bold px-2.5 py-1.5 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => startEdit(agent)}
                                    className="flex items-center gap-1 text-slate-400 hover:text-blue-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-blue-500/5 transition-all"
                                >
                                    <Edit3 className="w-3 h-3" />
                                    Edit
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {agents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-[#222] rounded-2xl bg-[#09090b]">
                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-4">
                        <Bot className="w-6 h-6 text-slate-700" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-400">No agents found</h3>
                    <p className="text-xs text-slate-600 mt-1">Agents are discovered from the OpenClaw workspace.</p>
                </div>
            )}

            {/* Agent Types Legend */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Available Agent Types</h3>
                <div className="flex flex-wrap gap-2">
                    {AGENT_TYPES.map(t => (
                        <span 
                            key={t.value}
                            className={cn(
                                "text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-widest",
                                getTypeColor(t.value)
                            )}
                        >
                            {t.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
