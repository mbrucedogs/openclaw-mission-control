'use client';

import { useState, useEffect } from 'react';
import { 
    Settings, Plus, Trash2, 
    User, Save, X, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
    username: string;
    role: string;
    createdAt: string;
}

export default function SettingsPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users');
            if (res.ok) setUsers(await res.json());
        } catch (err) {
            console.error('Failed to load users:', err);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {/* Header */}
            <div className="px-6 sm:px-12 py-8 sm:py-10 border-b border-[#1a1a1a] bg-[#09090b] mb-4 sm:mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20 shadow-[0_0_15px_rgba(148,163,184,0.05)]">
                        <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-[0.2em] leading-none">System Settings</h1>
                        <p className="hidden sm:block text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Configuration and user management system</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 sm:px-12 pb-20">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <UsersTab users={users} onRefresh={loadUsers} />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// USERS TAB (Ported from Orchestration)
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
