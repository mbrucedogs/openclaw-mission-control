'use client';

import { cn } from '@/lib/utils';
import {
    FileText,
    SearchIcon,
    Sparkles,
    Plus,
    FolderOpen,
    Trash2,
    Save,
    ExternalLink,
    Link2,
    X,
    Tag,
    Maximize2,
    Minimize2,
    RefreshCw,
    Hash,
    Clock,
    Layers,
    Type,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

// ─── Types ────────────────────────────────────────────────────────────────────

type Mode = 'repo' | 'viewer';

interface RepoDoc {
    id: number;
    title: string;
    summary?: string;
    content?: string;
    source_url?: string;
    document_type: string;
    folder_id?: number;
    tags: string[];
    updated_at: string;
    linkedTasks?: Array<{ id: number; task_id: string; title: string; status: string; link_type: string }>;
}

interface Folder {
    id: number;
    name: string;
}

interface LocalFileEntry {
    id: string;
    title: string;
    path: string;
    category: string;
    updatedAt: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DocsClient({ docs: initialLocalDocs }: { docs: LocalFileEntry[] }) {
    const [mode, setMode] = useState<Mode>('viewer');
    const [search, setSearch] = useState('');
    const [fullscreen, setFullscreen] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'alpha'>('date');

    // Viewer state
    const [viewerFiles, setViewerFiles] = useState<LocalFileEntry[]>(initialLocalDocs);
    const [viewerContent, setViewerContent] = useState('');
    const [viewerSelected, setViewerSelected] = useState<string | null>(initialLocalDocs[0]?.id || null);
    const [viewerRoot, setViewerRoot] = useState('');
    const [viewerRoots, setViewerRoots] = useState<string[]>([]);

    // Repo state
    const [repoDocs, setRepoDocs] = useState<RepoDoc[]>([]);
    const [repoSelected, setRepoSelected] = useState<number | null>(null);
    const [repoDetail, setRepoDetail] = useState<RepoDoc | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [repoFolderFilter, setRepoFolderFilter] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', summary: '', content: '', source_url: '', document_type: 'note', folder_id: 0, tags: '' });
    const [newFolderName, setNewFolderName] = useState('');
    const [taskLinkId, setTaskLinkId] = useState('');
    // Load viewer roots on mount
    useEffect(() => {
        fetch('/api/memory?action=list').then(r => r.json()).then(data => {
            if (data.roots) setViewerRoots(data.roots);
        }).catch(() => {});
    }, []);

    // ─── Viewer logic ─────────────────────────────────────────────────────────

    const selectedViewerFile = useMemo(
        () => viewerFiles.find(f => f.id === viewerSelected) || null,
        [viewerFiles, viewerSelected]
    );

    const filteredViewerFiles = useMemo(() => {
        let list = [...viewerFiles];
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(f => f.title.toLowerCase().includes(q) || f.category.toLowerCase().includes(q));
        }
        
        if (sortBy === 'date') {
            list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        } else {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }
        return list;
    }, [viewerFiles, search, sortBy]);

    useEffect(() => {
        if (mode !== 'viewer' || !selectedViewerFile?.path) return;
        fetch(`/api/memory?action=content&path=${encodeURIComponent(selectedViewerFile.path)}`)
            .then(r => r.json())
            .then(d => setViewerContent(d.content || 'Empty file'))
            .catch(() => setViewerContent('Failed to load content'));
    }, [selectedViewerFile, mode]);

    const switchViewerRoot = useCallback((root: string) => {
        const nextRoot = root === viewerRoot ? '' : root;
        setViewerRoot(nextRoot);
        fetch(`/api/memory?action=list&root=${encodeURIComponent(nextRoot)}`)
            .then(r => r.json())
            .then(data => {
                setViewerFiles(data.files || []);
                if (data.files?.length) setViewerSelected(data.files[0].id);
            }).catch(() => {});
    }, [viewerRoot]);

    const searchViewer = useCallback((q: string) => {
        if (!q.trim()) return;
        fetch(`/api/memory?action=search&query=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(data => setViewerFiles(data.files || []))
            .catch(() => {});
    }, []);

    // ─── Repo logic ───────────────────────────────────────────────────────────

    const sortedRepoDocs = useMemo(() => {
        const list = [...repoDocs];
        if (sortBy === 'date') {
            list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        } else {
            list.sort((a, b) => a.title.localeCompare(b.title));
        }
        return list;
    }, [repoDocs, sortBy]);

    const loadRepoDocs = useCallback(() => {
        let url = '/api/documents';
        const params: string[] = [];
        if (search.trim()) params.push(`search=${encodeURIComponent(search)}`);
        if (repoFolderFilter !== null) params.push(`folder_id=${repoFolderFilter}`);
        if (params.length) url += '?' + params.join('&');
        fetch(url).then(r => r.json()).then(setRepoDocs).catch(() => {});
    }, [search, repoFolderFilter]);

    const loadFolders = useCallback(() => {
        fetch('/api/document-folders').then(r => r.json()).then(setFolders).catch(() => {});
    }, []);

    useEffect(() => {
        if (mode === 'repo') {
            loadRepoDocs();
            loadFolders();
        }
    }, [mode, loadRepoDocs, loadFolders]);

    useEffect(() => {
        if (mode === 'viewer') {
            fetch(`/api/memory?action=list&root=${encodeURIComponent(viewerRoot)}`)
                .then(r => r.json())
                .then(data => {
                    setViewerFiles(data.files || []);
                }).catch(() => {});
        }
    }, [mode, viewerRoot]);

    const loadRepoDetail = useCallback((id: number) => {
        setRepoSelected(id);
        fetch(`/api/documents/${id}`).then(r => r.json()).then(setRepoDetail).catch(() => {});
    }, []);

    const saveRepoDoc = useCallback(async () => {
        const body = {
            ...editForm,
            folder_id: editForm.folder_id || undefined,
            tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        };
        if (repoSelected) {
            await fetch(`/api/documents/${repoSelected}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } else {
            await fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        }
        setEditing(false);
        loadRepoDocs();
    }, [editForm, repoSelected, loadRepoDocs]);

    const deleteRepoDoc = useCallback(async () => {
        if (!repoSelected) return;
        await fetch(`/api/documents/${repoSelected}`, { method: 'DELETE' });
        setRepoSelected(null);
        setRepoDetail(null);
        loadRepoDocs();
    }, [repoSelected, loadRepoDocs]);

    const startNewDoc = useCallback(() => {
        setRepoSelected(null);
        setRepoDetail(null);
        setEditForm({ title: '', summary: '', content: '', source_url: '', document_type: 'note', folder_id: 0, tags: '' });
        setEditing(true);
    }, []);

    const createFolder = useCallback(async () => {
        if (!newFolderName.trim()) return;
        await fetch('/api/document-folders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newFolderName.trim() }),
        });
        setNewFolderName('');
        loadFolders();
    }, [newFolderName, loadFolders]);

    const linkTask = useCallback(async () => {
        if (!repoSelected || !taskLinkId.trim()) return;
        await fetch(`/api/documents/${repoSelected}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: taskLinkId, link_type: 'reference' }),
        });
        setTaskLinkId('');
        loadRepoDetail(repoSelected);
    }, [repoSelected, taskLinkId, loadRepoDetail]);

    const startEditDoc = useCallback(() => {
        if (!repoDetail) return;
        setEditForm({
            title: repoDetail.title,
            summary: repoDetail.summary || '',
            content: repoDetail.content || '',
            source_url: repoDetail.source_url || '',
            document_type: repoDetail.document_type,
            folder_id: repoDetail.folder_id || 0,
            tags: (repoDetail.tags || []).join(', '),
        });
        setEditing(true);
    }, [repoDetail]);

    // Category colors
    const categoryColors: Record<string, string> = {
        Tasks: 'bg-blue-500/10 text-blue-500',
        Docs: 'bg-emerald-500/10 text-emerald-500',
        Memory: 'bg-amber-500/10 text-amber-500',
        Plans: 'bg-purple-500/10 text-purple-500',
        memory: 'bg-amber-500/10 text-amber-500',
        tmp: 'bg-blue-500/10 text-blue-500',
        plans: 'bg-purple-500/10 text-purple-500',
    };

    const getColor = (cat: string) => categoryColors[cat] || 'bg-slate-500/10 text-slate-500';

    const docTypeColors: Record<string, string> = {
        note: 'bg-slate-500/10 text-slate-400',
        research: 'bg-cyan-500/10 text-cyan-400',
        decision: 'bg-amber-500/10 text-amber-400',
        reference: 'bg-emerald-500/10 text-emerald-400',
        plan: 'bg-purple-500/10 text-purple-400',
    };

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="relative flex h-[100dvh] flex-col bg-[#09090b] text-slate-200 md:flex-row">
            {/* Left Sidebar */}
            <aside className={cn(
                "w-full md:w-[380px] border-r border-[#1a1a1a] flex flex-col bg-[#09090b] relative z-20",
                (viewerSelected || repoSelected || editing) && !fullscreen ? "hidden md:flex" : "flex"
            )}>
                <div className="px-6 py-6 border-b border-[#1a1a1a] bg-[#09090b] flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.05)]">
                                <FileText className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] leading-none">Documents</h2>
                                <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider opacity-70">Doc Repository</p>
                            </div>
                        </div>
                        <button onClick={mode === 'repo' ? loadRepoDocs : () => switchViewerRoot(viewerRoot)} className="p-2 hover:bg-[#1a1a1a] rounded-xl transition-all text-slate-500 hover:text-indigo-400">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-6 flex flex-col h-full overflow-hidden">

                    {/* Mode Toggle */}
                    <div className="flex bg-[#101010] border border-[#1a1a1a] rounded-2xl p-1 flex-shrink-0">
                        <button
                            onClick={() => setMode('repo')}
                            className={cn(
                                "flex-1 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300",
                                mode === 'repo' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Repo
                        </button>
                        <button
                            onClick={() => setMode('viewer')}
                            className={cn(
                                "flex-1 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all duration-300",
                                mode === 'viewer' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            Viewer
                        </button>
                    </div>

                    {/* Search & Sort */}
                    <div className="flex flex-col gap-4 flex-shrink-0">
                        <div className="relative group">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={mode === 'repo' ? 'Search curated database...' : 'Search workspace files...'}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    if (mode === 'viewer' && e.target.value.length > 2) searchViewer(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && mode === 'viewer') searchViewer(search);
                                }}
                                className="w-full bg-[#101010] border border-[#1a1a1a] rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 font-medium"
                            />
                        </div>

                        <div className="flex bg-[#101010] border border-[#1a1a1a] rounded-xl p-0.5 w-max">
                            <button
                                onClick={() => setSortBy('date')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    sortBy === 'date' ? "bg-[#1a1a1a] text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-400"
                                )}
                            >
                                <Clock className="w-3 h-3" />
                                Date
                            </button>
                            <button
                                onClick={() => setSortBy('alpha')}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    sortBy === 'alpha' ? "bg-[#1a1a1a] text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-400"
                                )}
                            >
                                <FileText className="w-3 h-3" />
                                Alpha
                            </button>
                        </div>
                    </div>

                    {/* Quick Filters / Roots */}
                    <div className="flex-shrink-0">
                        {mode === 'repo' ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <select
                                        value={repoFolderFilter ?? ''}
                                        onChange={(e) => setRepoFolderFilter(e.target.value ? Number(e.target.value) : null)}
                                        className="bg-[#101010] border border-[#1a1a1a] rounded-xl px-4 py-2 text-[11px] font-black text-slate-400 uppercase tracking-widest flex-1 focus:outline-none focus:border-indigo-500/50"
                                    >
                                        <option value="">All Folders</option>
                                        {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                    <button onClick={startNewDoc} className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-xl transition-all shadow-lg shadow-indigo-600/20">
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        placeholder="New folder..."
                                        value={newFolderName}
                                        onChange={e => setNewFolderName(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && createFolder()}
                                        className="bg-[#101010] border border-[#1a1a1a] rounded-xl px-4 py-2 text-[11px] flex-1 focus:outline-none focus:border-indigo-500/50 font-bold"
                                    />
                                    <button onClick={createFolder} className="px-3 bg-[#1a1a1a] hover:bg-[#222] rounded-xl border border-[#222] text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Add</button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => switchViewerRoot('')}
                                    className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all border",
                                        viewerRoot === '' 
                                            ? "bg-indigo-600/10 border-indigo-600/50 text-indigo-400" 
                                            : "bg-[#101010] border-[#1a1a1a] text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                    )}
                                >
                                    All
                                </button>
                                {viewerRoots.map(root => {
                                    const label = root.split('/').pop() || root;
                                    return (
                                        <button
                                            key={root}
                                            onClick={() => switchViewerRoot(root)}
                                            className={cn(
                                                "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all border",
                                                viewerRoot === root 
                                                    ? "bg-indigo-600/10 border-indigo-600/50 text-indigo-400" 
                                                    : "bg-[#101010] border-[#1a1a1a] text-slate-500 hover:border-slate-700 hover:text-slate-300"
                                            )}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Item List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {mode === 'viewer' && filteredViewerFiles.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => setViewerSelected(doc.id)}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start space-x-4 group",
                                    viewerSelected === doc.id 
                                        ? "bg-indigo-600/5 border-indigo-600/30" 
                                        : "hover:bg-[#101010] border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    viewerSelected === doc.id ? "bg-indigo-600 text-white" : "bg-[#1a1a1a] text-slate-500 group-hover:text-slate-300"
                                )}>
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                    <h4 className={cn(
                                        "text-[13px] font-bold truncate transition-colors",
                                        viewerSelected === doc.id ? "text-white" : "text-slate-300 group-hover:text-white"
                                    )}>{doc.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg", getColor(doc.category))}>{doc.category}</span>
                                        <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(doc.updatedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {mode === 'repo' && sortedRepoDocs.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => loadRepoDetail(doc.id)}
                                className={cn(
                                    "p-4 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start space-x-4 group",
                                    repoSelected === doc.id 
                                        ? "bg-indigo-600/5 border-indigo-600/30" 
                                        : "hover:bg-[#101010] border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    repoSelected === doc.id ? "bg-indigo-600 text-white" : "bg-[#1a1a1a] text-slate-500 group-hover:text-slate-300"
                                )}>
                                    <Hash className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 py-0.5">
                                    <h4 className={cn(
                                        "text-[13px] font-bold truncate transition-colors",
                                        repoSelected === doc.id ? "text-white" : "text-slate-300 group-hover:text-white"
                                    )}>{doc.title}</h4>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-lg", docTypeColors[doc.document_type] || docTypeColors.note)}>{doc.document_type}</span>
                                        <span className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" />
                                            {new Date(doc.updated_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {mode === 'repo' && repoDocs.length === 0 && (
                            <div className="text-center py-12 px-6">
                                <div className="w-16 h-16 bg-[#101010] rounded-3xl flex items-center justify-center mx-auto mb-4 border border-[#1a1a1a]">
                                    <Sparkles className="w-8 h-8 text-slate-800" />
                                </div>
                                <p className="text-sm font-bold text-slate-400">No documents found</p>
                                <p className="text-[11px] text-slate-600 mt-2 font-medium">Try a different search term or create a new document in the repo.</p>
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className={cn(
                "flex-1 bg-[#000] overflow-y-auto relative custom-scrollbar transition-all duration-500",
                fullscreen && "fixed inset-0 z-50 bg-[#000]"
            )}>
                {/* Header Section */}
                <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-[#1a1a1a] px-6 md:px-12 py-8 md:py-10 bg-[#09090b] mb-4 md:mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => { setViewerSelected(null); setRepoSelected(null); }}
                                className="md:hidden p-2 -ml-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                                <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-lg md:text-xl font-black text-white uppercase tracking-[0.2em] leading-none">Knowledge Base</h1>
                                <p className="hidden sm:block text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">System documentation and research logs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setFullscreen(!fullscreen)} 
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white px-4 py-2.5 rounded-xl bg-[#101010] border border-[#1a1a1a] hover:border-slate-700 transition-all"
                            >
                                {fullscreen ? (
                                    <><Minimize2 className="w-3.5 h-3.5" /> COLLAPSE</>
                                ) : (
                                    <><Maximize2 className="w-3.5 h-3.5" /> EXPAND VIEW</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-10 lg:p-16">
                    {/* ─── Viewer View ─────────────────────────────────────────── */}
                    {mode === 'viewer' && selectedViewerFile && (
                        <div className="space-y-12 animate-in fade-in duration-700">
                            <div className="space-y-6">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border-2", getColor(selectedViewerFile.category))}>
                                        {selectedViewerFile.category}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 bg-[#101010] px-3 py-1.5 rounded-xl border border-[#1a1a1a]">
                                        {selectedViewerFile.path.split('.').pop()}
                                    </span>
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter leading-tight italic">
                                    {selectedViewerFile.title}
                                </h1>
                                <div className="flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest border-t border-[#1a1a1a] pt-6">
                                    <span className="flex items-center gap-2"><Type className="w-4 h-4" /> {viewerContent.split(/\s+/).length} words</span>
                                    <span className="flex items-center gap-2"><Layers className="w-4 h-4" /> {selectedViewerFile.path}</span>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-[#1a1a1a]/50">
                                <MarkdownRenderer content={viewerContent} />
                            </div>
                        </div>
                    )}

                    {mode === 'viewer' && !selectedViewerFile && (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-center px-12 pb-20">
                            <div className="w-24 h-24 bg-[#0a0a0c] rounded-[40px] flex items-center justify-center mb-8 border border-[#1a1a1a] shadow-inner">
                                <FolderOpen className="w-10 h-10 text-slate-800" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-300 tracking-tight italic">NO FILE SELECTED</h2>
                            <p className="text-slate-600 mt-4 max-w-sm font-medium">Select a file from the sidebar to view its content and metadata.</p>
                        </div>
                    )}

                    {/* ─── Repo View ───────────────────────────────────────────── */}
                    {mode === 'repo' && editing && (
                        <div className="animate-in slide-in-from-bottom-4 space-y-10 px-0 pb-12 sm:pb-16 md:px-8 lg:px-12 duration-500">
                            <div className="flex flex-col gap-4 border-b border-[#1a1a1a] pb-6 sm:flex-row sm:items-center sm:justify-between sm:pb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter italic">
                                        {repoSelected ? 'EDIT DOCUMENT' : 'NEW DOCUMENT'}
                                    </h2>
                                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-2 px-1 border-l-2 border-indigo-600">Enter document details below</p>
                                </div>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <button onClick={() => setEditing(false)} className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white px-5 py-2.5 rounded-2xl bg-[#101010] border border-[#1a1a1a] transition-all">DISCARD</button>
                                    <button onClick={saveRepoDoc} className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20">
                                        <Save className="w-4 h-4" /> COMMIT
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-8">
                                <div className="space-y-2 group">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-indigo-500">Title</label>
                                    <input
                                        value={editForm.title}
                                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                        placeholder="Enter descriptive title..."
                                        className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-4 text-white text-lg font-bold focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Document Type</label>
                                        <select
                                            value={editForm.document_type}
                                            onChange={e => setEditForm(f => ({ ...f, document_type: e.target.value }))}
                                            className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                                        >
                                            {['note', 'research', 'decision', 'reference', 'plan'].map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Folder</label>
                                        <select
                                            value={editForm.folder_id}
                                            onChange={e => setEditForm(f => ({ ...f, folder_id: Number(e.target.value) }))}
                                            className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value={0}>NONE</option>
                                            {folders.map(f => <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Source URL</label>
                                    <input
                                        value={editForm.source_url}
                                        onChange={e => setEditForm(f => ({ ...f, source_url: e.target.value }))}
                                        placeholder="https://..."
                                        className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-4 text-blue-400 text-sm font-mono focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tags (Comma Separated)</label>
                                    <input
                                        value={editForm.tags}
                                        onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                                        placeholder="e.g. strategy, personal, urgent"
                                        className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-4 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Abstract / Summary</label>
                                    <textarea
                                        value={editForm.summary}
                                        onChange={e => setEditForm(f => ({ ...f, summary: e.target.value }))}
                                        placeholder="Quick summary of this document..."
                                        rows={2}
                                        className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-4 text-slate-300 text-sm font-medium focus:outline-none focus:border-indigo-500/50 resize-none transition-all"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Content (Markdown)</label>
                                    <textarea
                                        value={editForm.content}
                                        onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                                        placeholder="# Hello World..."
                                        rows={16}
                                        className="w-full bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-6 py-6 text-slate-200 text-sm font-mono focus:outline-none focus:border-indigo-500/50 resize-vertical custom-scrollbar transition-all leading-relaxed"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'repo' && !editing && repoDetail && (
                        <div className="animate-in fade-in space-y-16 px-0 pb-12 sm:pb-16 md:px-8 lg:px-12 duration-700">
                            <div className="space-y-8">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-6 flex-1">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={cn("text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border-2", docTypeColors[repoDetail.document_type] || docTypeColors.note)}>
                                                {repoDetail.document_type}
                                            </span>
                                            {repoDetail.source_url && (
                                                <a href={repoDetail.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:text-blue-400 bg-blue-500/5 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-all">
                                                    SOURCE <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter leading-tight italic">
                                            {repoDetail.title}
                                        </h1>
                                        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest pt-4">
                                            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> UPDATED {new Date(repoDetail.updated_at).toLocaleDateString()}</span>
                                            {repoDetail.folder_id && <span className="flex items-center gap-2"><FolderOpen className="w-4 h-4" /> {folders.find(f => f.id === repoDetail.folder_id)?.name}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-start">
                                        <button onClick={startEditDoc} className="text-[11px] font-black uppercase tracking-[0.2em] text-white px-6 py-2.5 rounded-2xl bg-[#1a1a1a] border border-[#222] hover:bg-[#222] transition-all">EDIT</button>
                                        <button onClick={deleteRepoDoc} className="p-3 rounded-2xl bg-[#101010] border border-[#1a1a1a] hover:bg-red-500/10 text-slate-600 hover:text-red-500 transition-all border-dashed"><Trash2 className="w-5 h-5" /></button>
                                    </div>
                                </div>

                                {repoDetail.summary && (
                                    <div className="bg-indigo-600/5 border-l-4 border-indigo-600 rounded-r-3xl p-8 shadow-2xl shadow-indigo-600/5">
                                        <p className="text-slate-300 text-lg leading-relaxed font-medium italic">&ldquo;{repoDetail.summary}&rdquo;</p>
                                    </div>
                                )}

                                {repoDetail.tags?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {repoDetail.tags.map(tag => (
                                            <span key={tag} className="flex items-center gap-2 bg-[#101010] border border-[#1a1a1a] text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-2xl">
                                                <Tag className="w-3 h-3 text-indigo-500" />{tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="pt-12 border-t border-[#1a1a1a]">
                                <MarkdownRenderer content={repoDetail.content || ''} />
                            </div>

                            {/* Linked Tasks */}
                            <div className="pt-20 border-t border-[#1a1a1a] space-y-8">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                                            <Link2 className="w-5 h-5 text-indigo-500" /> LINKED TASKS
                                        </h3>
                                        <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mt-2">{repoDetail.linkedTasks?.length || 0} COORDINATED ACTIONS</p>
                                    </div>
                                    <div className="flex w-full flex-col gap-2 sm:min-w-[300px] sm:flex-row">
                                        <input 
                                            value={taskLinkId} 
                                            onChange={(e) => setTaskLinkId(e.target.value)} 
                                            onKeyDown={e => e.key === 'Enter' && linkTask()}
                                            placeholder="TASK ID (E.G. 42)" 
                                            className="bg-[#0a0a0c] border border-[#1a1a1a] rounded-xl px-4 py-2 text-xs font-black flex-1 focus:outline-none focus:border-indigo-500/50" 
                                        />
                                        <button onClick={linkTask} className="px-4 bg-[#1a1a1a] hover:bg-indigo-600 border border-[#222] rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">LINK</button>
                                    </div>
                                </div>

                                <div className="grid gap-4">
                                    {repoDetail.linkedTasks?.map(lt => (
                                        <div key={lt.id} className="flex items-center justify-between bg-[#0a0a0c] border border-[#1a1a1a] rounded-2xl px-8 py-5 group hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-6">
                                                <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center font-black text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-lg shadow-indigo-600/5">
                                                    #{lt.task_id}
                                                </div>
                                                <div>
                                                    <h4 className="text-base font-black text-slate-100 italic tracking-tight">{lt.title || `TASK ${lt.task_id}`}</h4>
                                                    <div className="flex items-center gap-4 mt-1">
                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{lt.status}</span>
                                                        <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                                                        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-600">{lt.link_type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button className="p-2.5 rounded-xl bg-transparent hover:bg-red-500/5 border border-transparent hover:border-red-500/20 text-slate-700 hover:text-red-500 transition-all">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!repoDetail.linkedTasks || repoDetail.linkedTasks.length === 0) && (
                                        <div className="text-center py-10 bg-[#0a0a0c] border border-[#1a1a1a] border-dashed rounded-3xl">
                                            <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em]">No linked operational tasks</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'repo' && !editing && !repoDetail && (
                        <div className="h-[60vh] flex flex-col items-center justify-center text-center px-12 pb-20">
                            <div className="w-24 h-24 bg-[#0a0a0c] rounded-[40px] flex items-center justify-center mb-8 border border-[#1a1a1a] shadow-inner">
                                <RefreshCw className="w-10 h-10 text-slate-800" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-300 tracking-tight italic">NO SELECTION</h2>
                            <p className="text-slate-600 mt-4 max-w-sm font-medium">Browse the knowledge base or create a new entry to begin.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
