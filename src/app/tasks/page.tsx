'use client';

import { useState, useEffect, useCallback } from 'react';
import { TaskWorkflowSteps } from '@/components/TaskWorkflowSteps';
import {
    Plus, Search, RefreshCcw, X, MessageSquare, FileText, Activity,
    AlertCircle, CheckCircle, Clock, Zap, Pencil, Trash2, ChevronRight,
    Paperclip, PlayCircle, CheckCircle2, RotateCcw, ArrowRightLeft,
    Loader2, CheckSquare, GitBranch
} from 'lucide-react';
import { Task, TaskStatus, Priority, Agent, Project, TaskComment, TaskActivity, TaskEvidence, CommentType } from '@/lib/types';
import { cn } from '@/lib/utils';

// ─── Column definitions ──────────────────────────────────────────────────────

const COLUMNS: { label: string; status: TaskStatus; dot: string }[] = [
    { label: 'Recurring',   status: 'Recurring',    dot: 'bg-green-500' },
    { label: 'Backlog',     status: 'Backlog',       dot: 'bg-slate-500' },
    { label: 'In Progress', status: 'In Progress',   dot: 'bg-blue-500' },
    { label: 'Review',      status: 'Review',        dot: 'bg-amber-500' },
    { label: 'Complete',    status: 'Complete',      dot: 'bg-emerald-500' },
];

// Tasks that map to columns
function getColumnTasks(tasks: Task[], status: TaskStatus): Task[] {
    if (status === 'In Progress') {
        // All active work statuses go to "In Progress" column
        return tasks.filter(t => 
            t.status === 'In Progress' || 
            t.status === 'Implementation' ||
            t.status === 'Research' ||
            t.status === 'Ready for Implementation'
        );
    }
    if (status === 'Review') {
        // All review/QA statuses go to "Review" column
        return tasks.filter(t => 
            t.status === 'Review' || 
            t.status === 'Ready for QA' || 
            t.status === 'Ready for Review' || 
            t.status === 'QA' ||
            t.status === 'Changes Requested'
        );
    }
    // "Complete" column only shows "Complete" status
    return tasks.filter(t => t.status === status);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const OWNER_COLORS: Record<string, string> = {
    'orchestrator': 'bg-purple-600',
    'researcher':   'bg-pink-600',
    'builder':      'bg-blue-600',
    'reviewer':     'bg-green-600',
    'tester':       'bg-amber-600',
    'automation':   'bg-slate-600',
    'default':      'bg-slate-800'
,
};

const PRIORITY_CONFIG: Record<Priority, { label: string; className: string }> = {
    urgent: { label: 'URGENT', className: 'text-red-400 bg-red-500/10 border-red-500/20' },
    high:   { label: 'HIGH',   className: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    normal: { label: 'NORMAL', className: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
    low:    { label: 'LOW',    className: 'text-slate-600 bg-slate-600/10 border-slate-600/20' },
};

const COMMENT_TYPE_ICONS: Record<CommentType, React.ReactNode> = {
    note: <MessageSquare className="w-3 h-3" />,
    blocker: <AlertCircle className="w-3 h-3" />,
    handover: <ArrowRightLeft className="w-3 h-3" />,
    qa_finding: <CheckCircle className="w-3 h-3" />,
    evidence_ref: <FileText className="w-3 h-3" />,
    system: <Activity className="w-3 h-3" />,
};

const COMMENT_TYPE_COLORS: Record<CommentType, string> = {
    note: 'text-slate-400 bg-slate-500/10',
    blocker: 'text-red-400 bg-red-500/10',
    handover: 'text-blue-400 bg-blue-500/10',
    qa_finding: 'text-emerald-400 bg-emerald-500/10',
    evidence_ref: 'text-amber-400 bg-amber-500/10',
    system: 'text-slate-500 bg-slate-500/5',
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

function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
}

// ─── Activity Type Labels ────────────────────────────────────────────────────

function getActivityIcon(type: string) {
    switch (type) {
        case 'created': return <Plus className="w-3 h-3" />;
        case 'started': return <PlayCircle className="w-3 h-3" />;
        case 'completed': return <CheckCircle2 className="w-3 h-3" />;
        case 'blocked': return <AlertCircle className="w-3 h-3" />;
        case 'unblocked': return <CheckCircle className="w-3 h-3" />;
        case 'handover': return <ArrowRightLeft className="w-3 h-3" />;
        case 'retry_attempt': return <RotateCcw className="w-3 h-3" />;
        case 'status_changed': return <Activity className="w-3 h-3" />;
        default: return <Activity className="w-3 h-3" />;
    }
}

function getActivityColor(type: string) {
    switch (type) {
        case 'created': return 'text-emerald-400 bg-emerald-500/10';
        case 'started': return 'text-blue-400 bg-blue-500/10';
        case 'completed': return 'text-emerald-400 bg-emerald-500/10';
        case 'blocked': return 'text-red-400 bg-red-500/10';
        case 'unblocked': return 'text-green-400 bg-green-500/10';
        case 'handover': return 'text-purple-400 bg-purple-500/10';
        case 'retry_attempt': return 'text-amber-400 bg-amber-500/10';
        default: return 'text-slate-400 bg-slate-500/10';
    }
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

type DetailTab = 'overview' | 'comments' | 'activity' | 'evidence' | 'pipeline';

function TaskDetailModal({ task, onClose, onDeleted, onEdit }: { 
    task: Task; 
    onClose: () => void; 
    onDeleted: () => void; 
    onEdit: () => void; 
}) {
    const [activeTab, setActiveTab] = useState<DetailTab>('overview');
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [activity, setActivity] = useState<TaskActivity[]>([]);
    const [evidence, setEvidence] = useState<TaskEvidence[]>([]);
    const [newComment, setNewComment] = useState('');
    const [commentType, setCommentType] = useState<CommentType>('note');
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    const loadDetails = useCallback(async () => {
        console.log('TaskDetailModal: Loading details for task:', task.id);
        try {
            const [cRes, aRes, eRes] = await Promise.all([
                fetch(`/api/tasks/${task.id}/comments`, { credentials: "include" }),
                fetch(`/api/tasks/${task.id}/activity`, { credentials: "include" }),
                fetch(`/api/tasks/${task.id}/evidence`, { credentials: "include" }),
            ]);
            
            console.log('TaskDetailModal: Responses:', { 
                comments: cRes.status, 
                activity: aRes.status, 
                evidence: eRes.status 
            });
            
            if (cRes.ok) {
                const cData = await cRes.json();
                console.log('TaskDetailModal: Comments loaded:', cData.length);
                setComments(Array.isArray(cData) ? cData : []);
            } else {
                console.error('TaskDetailModal: Comments fetch failed:', cRes.status);
                setComments([]);
            }
            
            if (aRes.ok) {
                const aData = await aRes.json();
                console.log('TaskDetailModal: Activity loaded:', aData.length);
                setActivity(Array.isArray(aData) ? aData : []);
            } else {
                console.error('TaskDetailModal: Activity fetch failed:', aRes.status);
                setActivity([]);
            }
            
            if (eRes.ok) {
                const eData = await eRes.json();
                console.log('TaskDetailModal: Evidence loaded:', eData.length);
                setEvidence(Array.isArray(eData) ? eData : []);
            } else {
                console.error('TaskDetailModal: Evidence fetch failed:', eRes.status);
                setEvidence([]);
            }
            
            setDataLoaded(true);
        } catch (err) {
            console.error('TaskDetailModal: Failed to load task details:', err);
            setComments([]);
            setActivity([]);
            setEvidence([]);
            setDataLoaded(true);
        }
    }, [task.id]);

    useEffect(() => { 
        loadDetails(); 
    }, [loadDetails]);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks/${task.id}/comments`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    content: newComment, 
                    commentType,
                    author: 'matt',
                    authorType: 'user'
                }),
            });
            if (res.ok) {
                setNewComment('');
                await loadDetails();
            }
        } catch (err) {
            console.error('Failed to add comment:', err);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this task?')) return;
        setIsDeleting(true);
        try {
            await fetch(`/api/tasks/${task.id}`, { method: 'DELETE', credentials: 'include' });
            onDeleted();
            onClose();
        } catch (err) {
            console.error('Failed to delete task:', err);
        }
        setIsDeleting(false);
    };

    const tabButton = (tab: DetailTab, label: string, icon: React.ReactNode, count?: number) => (
        <button
            onClick={() => setActiveTab(tab)}
            className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors',
                activeTab === tab 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            )}
        >
            {icon}
            {label}
            {count !== undefined && count > 0 && (
                <span className="ml-1 text-[9px] font-black text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">{count}</span>
            )}
        </button>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
            <div 
                className="bg-[#111] border border-[#222] rounded-none sm:rounded-2xl w-full max-w-3xl h-full sm:h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex-shrink-0 p-6 border-b border-[#222]">
                    <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    'w-2 h-2 rounded-full',
                                    task.isStuck ? 'bg-red-500 animate-pulse' : (
                                        task.status === 'Recurring' ? 'bg-green-500' :
                                        task.status === 'In Progress' ? 'bg-blue-500' :
                                        task.status === 'Review' ? 'bg-amber-500' :
                                        task.status === 'Complete' ? 'bg-emerald-500' :
                                        'bg-slate-500'
                                    )
                                )} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{task.status}</span>
                                {task.isStuck && (
                                    <span className="text-[9px] font-black text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">BLOCKED</span>
                                )}
                            </div>
                            <h2 className="text-xl font-black text-white tracking-tight leading-snug">{task.title}</h2>
                            <p className="text-[10px] text-slate-600 font-mono">{task.id}</p>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={onEdit} className="p-2 text-slate-500 hover:text-white transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                            <button onClick={handleDelete} disabled={isDeleting} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-white', ownerColor(task.owner))}>
                                {ownerInitial(task.owner)}
                            </div>
                            <span className="text-sm text-slate-300">{task.owner}</span>
                        </div>
                        <span className={cn(
                            'text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded border',
                            PRIORITY_CONFIG[task.priority as Priority]?.className
                        )}>
                            {PRIORITY_CONFIG[task.priority as Priority]?.label}
                        </span>
                        {task.project && (
                            <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded">{task.project}</span>
                        )}
                        <span className="text-xs text-slate-500 ml-auto">Updated {timeAgo(task.updatedAt)}</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 px-6 pt-4 pb-0 border-b border-[#222]">
                    <div className="flex gap-2">
                        {tabButton('overview', 'Overview', <Activity className="w-3.5 h-3.5" />)}
                        {tabButton('comments', 'Comments', <MessageSquare className="w-3.5 h-3.5" />, comments.length)}
                        {tabButton('activity', 'Activity', <Clock className="w-3.5 h-3.5" />, activity.length)}
                        {tabButton('evidence', 'Evidence', <Paperclip className="w-3.5 h-3.5" />, evidence.length)}
                        {tabButton('pipeline', 'Pipeline', <GitBranch className="w-3.5 h-3.5" />)}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {!dataLoaded ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    {task.description && (
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Description</h3>
                                            <div className="bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap">
                                                {task.description}
                                            </div>
                                        </div>
                                    )}

                                    {task.isStuck && (
                                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertCircle className="w-4 h-4 text-red-400" />
                                                <h3 className="text-[11px] font-black text-red-400 uppercase tracking-widest">Blocked</h3>
                                            </div>
                                            <p className="text-sm text-red-300/80">{task.stuckReason || 'No reason provided'}</p>
                                            {task.stuckSince && (
                                                <p className="text-xs text-red-400/60 mt-1">Since {formatDate(task.stuckSince)}</p>
                                            )}
                                        </div>
                                    )}

                                    {task.validationCriteria && (
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Validation Criteria</h3>
                                            <div className="bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg p-4">
                                                <p className="text-sm text-slate-300 font-medium mb-3"><strong>Done means:</strong> {task.validationCriteria.doneMeans}</p>
                                                {task.validationCriteria.checklist?.length > 0 && (
                                                    <ul className="space-y-1">
                                                        {task.validationCriteria.checklist.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                                                <span className="text-slate-600 mt-0.5">•</span>
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {activity.length > 0 && (
                                        <div>
                                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Recent Activity</h3>
                                            <div className="space-y-2">
                                                {activity.slice(0, 3).map(act => (
                                                    <div key={act.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg">
                                                        <div className={cn('w-7 h-7 rounded flex items-center justify-center', getActivityColor(act.activityType))}>
                                                            {getActivityIcon(act.activityType)}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs text-slate-300">
                                                                <span className="font-bold">{act.actor}</span> {act.activityType.replace(/_/g, ' ')}
                                                            </p>
                                                            {act.details?.blockerReason && (
                                                                <p className="text-[10px] text-slate-500 mt-0.5">{act.details.blockerReason}</p>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-600">{timeAgo(act.createdAt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#222]">
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Created</p>
                                            <p className="text-xs text-slate-400">{formatDate(task.createdAt)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Retry Count</p>
                                            <p className="text-xs text-slate-400">{task.retryCount} / {task.maxRetries}</p>
                                        </div>
                                        {task.startedAt && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Started</p>
                                                <p className="text-xs text-slate-400">{formatDate(task.startedAt)}</p>
                                            </div>
                                        )}
                                        {task.completedAt && (
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Completed</p>
                                                <p className="text-xs text-slate-400">{formatDate(task.completedAt)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'comments' && (
                                <div className="space-y-4">
                                    <div className="bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg p-4">
                                        <div className="flex gap-2 mb-3">
                                            {(['note', 'blocker', 'qa_finding'] as CommentType[]).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setCommentType(type)}
                                                    className={cn(
                                                        'flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-colors',
                                                        commentType === type 
                                                            ? COMMENT_TYPE_COLORS[type] + ' border border-current opacity-100'
                                                            : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                                    )}
                                                >
                                                    {COMMENT_TYPE_ICONS[type]}
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                        <textarea
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Add a comment..."
                                            rows={3}
                                            className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-none"
                                        />
                                        <div className="flex justify-end mt-2">
                                            <button
                                                onClick={handleAddComment}
                                                disabled={!newComment.trim() || loading}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-lg disabled:opacity-40"
                                            >
                                                {loading ? 'Posting...' : 'Post Comment'}
                                            </button>
                                        </div>
                                    </div>

                                    {comments.length === 0 ? (
                                        <div className="text-center py-12">
                                            <MessageSquare className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500">No comments yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {comments.map(comment => (
                                                <div key={comment.id} className="flex gap-3 p-4 bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg">
                                                    <div className={cn('w-8 h-8 rounded flex items-center justify-center flex-shrink-0', ownerColor(comment.author))}>
                                                        <span className="text-[10px] font-black text-white">{ownerInitial(comment.author)}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-300">{comment.author}</span>
                                                            <span className={cn('text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded', COMMENT_TYPE_COLORS[comment.commentType])}>
                                                                {comment.commentType}
                                                            </span>
                                                            <span className="text-[10px] text-slate-600">{timeAgo(comment.createdAt)}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-400 whitespace-pre-wrap">{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'activity' && (
                                <div className="space-y-2">
                                    {activity.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Clock className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500">No activity yet</p>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#1a1a1e]" />
                                            {activity.map((act, i) => (
                                                <div key={act.id} className="flex gap-4 py-3 relative">
                                                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10', getActivityColor(act.activityType))}>
                                                        {getActivityIcon(act.activityType)}
                                                    </div>
                                                    <div className="flex-1 pt-0.5">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-bold text-slate-300">{act.actor}</span>
                                                            <span className="text-xs text-slate-500">{act.activityType.replace(/_/g, ' ')}</span>
                                                            <span className="text-[10px] text-slate-600">{timeAgo(act.createdAt)}</span>
                                                        </div>
                                                        {act.details && (
                                                            <div className="text-xs text-slate-500 space-y-0.5">
                                                                {act.details.oldStatus && act.details.newStatus && (
                                                                    <p>{act.details.oldStatus} → {act.details.newStatus}</p>
                                                                )}
                                                                {act.details.fromOwner && act.details.toOwner && (
                                                                    <p>Handover: {act.details.fromOwner} → {act.details.toOwner}</p>
                                                                )}
                                                                {act.details.blockerReason && (
                                                                    <p className="text-red-400/80">{act.details.blockerReason}</p>
                                                                )}
                                                                {act.details.errorMessage && (
                                                                    <p className="text-amber-400/80">{act.details.errorMessage}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'evidence' && (
                                <div className="space-y-4">
                                    {evidence.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Paperclip className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500">No evidence yet</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {evidence.map(ev => (
                                                <div key={ev.id} className="flex items-start gap-3 p-4 bg-[#0a0a0a] border border-[#1a1a1e] rounded-lg hover:border-slate-700 transition-colors">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                        {ev.evidenceType === 'file' ? <FileText className="w-5 h-5 text-blue-400" /> :
                                                         ev.evidenceType === 'url' ? <Activity className="w-5 h-5 text-blue-400" /> :
                                                         ev.evidenceType === 'screenshot' ? <Activity className="w-5 h-5 text-blue-400" /> :
                                                         <FileText className="w-5 h-5 text-blue-400" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-0.5">{ev.evidenceType}</p>
                                                        <a 
                                                            href={ev.url} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className="text-sm text-blue-400 hover:text-blue-300 break-all"
                                                        >
                                                            {ev.url}
                                                        </a>
                                                        {ev.description && (
                                                            <p className="text-xs text-slate-500 mt-1">{ev.description}</p>
                                                        )}
                                                        <p className="text-[10px] text-slate-600 mt-2">Added by {ev.addedBy} • {timeAgo(ev.addedAt)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'pipeline' && (
                                <div className="space-y-4">
                                    {task.validationCriteria?._pipelineId && (
                                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <GitBranch className="w-4 h-4 text-blue-400" />
                                                <h3 className="text-sm font-bold text-white">Pipeline</h3>
                                            </div>
                                            <p className="text-xs text-slate-400">{task.validationCriteria._pipelineId}</p>
                                        </div>
                                    )}
                                    <TaskWorkflowSteps taskId={task.id} />
                                </div>
                            )}
                        </>
                    )}
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

    const nextCol = COLUMNS.find((_, i) => COLUMNS[i - 1]?.status === task.status);

    return (
        <div 
            onClick={onClick}
            className={cn(
                'bg-[#0d0d0f] border border-[#1d1d20] rounded-xl p-5 hover:border-slate-700 transition-all cursor-pointer group',
                task.isStuck ? 'border-red-500/30 bg-red-500/5' : '',
                task.priority === 'urgent' ? 'border-red-500/20' : '',
            )}
        >
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
                    <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        R:{task.retryCount}
                    </span>
                )}
                {(task.comments?.length || 0) > 0 && (
                    <span className="flex items-center gap-1 text-[9px] text-slate-500">
                        <MessageSquare className="w-3 h-3" />
                        {task.comments?.length}
                    </span>
                )}
                {(task.evidence?.length || 0) > 0 && (
                    <span className="flex items-center gap-1 text-[9px] text-slate-500">
                        <Paperclip className="w-3 h-3" />
                        {task.evidence?.length}
                    </span>
                )}
            </div>

            <div className="flex items-start gap-2 mb-3">
                <div className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0 mt-1',
                    task.isStuck ? 'bg-red-500 animate-pulse' : (
                        task.status === 'Recurring' ? 'bg-green-500' :
                        task.status === 'In Progress' ? 'bg-blue-500' :
                        task.status === 'Review' ? 'bg-amber-500' :
                        task.status === 'Complete' ? 'bg-emerald-500' :
                        'bg-slate-500'
                    )
                )} />
                <h3 className="text-[13px] font-black text-slate-100 leading-snug line-clamp-2">{task.title}</h3>
            </div>

            {task.isStuck && (
                <div className="mb-3 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded">
                    <p className="text-[10px] text-red-400/80 line-clamp-1">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {task.stuckReason || 'Blocked'}
                    </p>
                </div>
            )}

            {task.description && (
                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
                    {task.description}
                </p>
            )}

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

// ─── New Task Modal ────────────────────────────────────────────────────────────

function TaskFormModal({ task, onClose, onSaved, agents, projects, pipelines }: {
    task?: Task;
    onClose: () => void;
    onSaved: () => void;
    agents: Agent[];
    projects: Project[];
    pipelines: any[];
}) {
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [owner, setOwner] = useState(task?.owner || 'matt');
    const [projectId, setProjectId] = useState<string>(task?.project || '');
    const [status, setStatus] = useState<TaskStatus>(task?.status || 'Backlog');
    const [priority, setPriority] = useState<Priority>((task?.priority as Priority) || 'normal');
    const [doneMeans, setDoneMeans] = useState(task?.validationCriteria?.doneMeans || '');
    const [checklist, setChecklist] = useState(task?.validationCriteria?.checklist?.join('\n') || '');
    const [pipelineId, setPipelineId] = useState<string>(task?.validationCriteria?._pipelineId || '');
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!title.trim()) return;
        setLoading(true);
        
        const validationCriteria = {
            doneMeans: doneMeans || 'Task completed',
            checklist: checklist.split('\n').filter(s => s.trim()),
            ...(pipelineId && { _pipelineId: pipelineId }),
        };

        const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
        const method = task ? 'PATCH' : 'POST';
        
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                title, 
                description, 
                owner, 
                project: projectId || null, 
                status, 
                priority,
                validationCriteria,
            }),
        });
        
        setLoading(false);
        onSaved();
        onClose();
    };

    const assignees = [{ id: 'matt', name: 'Matt', role: 'Supervisor' }, ...agents];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#111] border border-[#222] rounded-2xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                                onChange={e => setOwner(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"
                            >
                                {assignees.map(a => (
                                    <option key={a.id} value={a.id}>{a.name} — {a.role}</option>
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
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Status</label>
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
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Pipeline</label>
                        <select
                            value={pipelineId}
                            onChange={e => setPipelineId(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-slate-600"
                        >
                            <option value="">— Auto-detect —</option>
                            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">Leave empty to auto-detect based on task description</p>
                    </div>

                    <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg space-y-3">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Validation Criteria</p>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Done means:</label>
                            <input
                                value={doneMeans}
                                onChange={e => setDoneMeans(e.target.value)}
                                placeholder="What does 'done' look like?"
                                className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">Checklist (one per line):</label>
                            <textarea
                                value={checklist}
                                onChange={e => setChecklist(e.target.value)}
                                placeholder="- [ ] Step 1\n- [ ] Step 2"
                                rows={3}
                                className="w-full bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-slate-600 resize-none"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white">Cancel</button>
                    <button
                        onClick={submit}
                        disabled={!title.trim() || loading}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-lg disabled:opacity-40"
                    >
                        {loading ? 'Saving...' : (task ? 'Save Changes' : 'Create Task')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Activity Item ────────────────────────────────────────────────────────────

function ActivityItem({ act }: { act: any }) {
    return (
        <div className="flex items-start gap-3 py-3 border-b border-[#141416] last:border-0">
            <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 mt-0.5', ownerColor(act.actor?.toLowerCase()))}>
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
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [ownerFilter, setOwnerFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [showNewTask, setShowNewTask] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const load = useCallback(async () => {
        const [t, a, ag, pr, pl] = await Promise.all([
            fetch('/api/tasks').then(r => r.json()),
            fetch('/api/activity').then(r => r.json()),
            fetch('/api/agents').then(r => r.json()),
            fetch('/api/projects').then(r => r.json()),
            fetch('/api/pipelines').then(r => r.json()),
        ]);
        setTasks(Array.isArray(t) ? t : []);
        setActivity(Array.isArray(a) ? a : []);
        setAgents(Array.isArray(ag) ? ag : []);
        setProjects(Array.isArray(pr) ? pr : []);
        setPipelines(Array.isArray(pl) ? pl : []);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh
    useEffect(() => {
        const iv = setInterval(load, 3000);
        return () => clearInterval(iv);
    }, [load]);

    const filtered = tasks.filter(t => {
        const matchOwner = ownerFilter === 'all' || t.owner === ownerFilter;
        const matchProject = projectFilter === 'all' || t.project === projectFilter;
        const matchSearch = !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchOwner && matchProject && matchSearch;
    });

    const stats = {
        total: tasks.length,
        inProgress: tasks.filter(t => t.status === 'In Progress').length,
        done: tasks.filter(t => t.status === 'Complete').length,
        completion: tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'Complete').length / tasks.length) * 100) : 0,
    };

    const WORKFLOW_ORDER = ['orchestrator', 'researcher', 'builder', 'tester', 'reviewer', 'automation'];
    const activeOwners = WORKFLOW_ORDER.filter(id => agents.some(a => a.id === id));
    const agentName = (id: string) => agents.find(a => a.id === id)?.name ?? id;

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left: Kanban */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-shrink-0 px-6 sm:px-12 py-8 sm:py-10 border-b border-[#1a1a1a] bg-[#09090b] mb-4 sm:mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                            <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-[0.2em] leading-none">Task Matrix</h1>
                            <p className="hidden sm:block text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Operational objectives and agent execution logs</p>
                        </div>
                    </div>
                </div>
                <div className="px-6 sm:px-12">
                    <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-black text-blue-500">{stats.inProgress}</span>
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

                    <div className="flex items-center gap-4 mb-6">
                        <button
                            onClick={() => setShowNewTask(true)}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            New task
                        </button>

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
                                    className={cn('flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold rounded-lg transition-colors', ownerFilter === id ? 'text-white bg-[#1a1a1e]' : 'text-slate-500 hover:text-white')}
                                >
                                    <div className={cn('w-1.5 h-1.5 rounded-full', ownerColor(id))} />
                                    {agentName(id)}
                                </button>
                            ))}
                        </div>

                        {projects.length > 0 && (
                            <select
                                value={projectFilter}
                                onChange={e => setProjectFilter(e.target.value)}
                                className="ml-2 bg-[#0d0d0f] border border-[#1d1d20] rounded-lg px-3 py-1.5 text-xs text-slate-400"
                            >
                                <option value="all">All projects</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        )}
                        <div className="relative ml-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search tasks..."
                                className="bg-[#0d0d0f] border border-[#1d1d20] rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-300 w-44"
                            />
                        </div>
                    </div>
                </div>

                {/* Kanban columns */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-6 sm:px-10 pb-8">
                    <div className="flex gap-5 h-full" style={{ minWidth: `${COLUMNS.length * 300}px` }}>
                        {COLUMNS.map(col => {
                            const colTasks = getColumnTasks(filtered, col.status);
                            return (
                                <div key={col.status} className="flex flex-col w-72 flex-shrink-0">
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <div className="flex items-center gap-2">
                                            <div className={cn('w-1.5 h-1.5 rounded-full', col.dot)} />
                                            <span className="text-[11px] font-black uppercase tracking-widest text-[#555]">{col.label}</span>
                                            <span className="text-[10px] font-bold text-[#333]">{colTasks.length}</span>
                                        </div>
                                        <button onClick={() => setShowNewTask(true)} className="text-[#2a2a2a] hover:text-slate-500">
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
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

            {/* Right: Activity panel */}
            <div className="hidden lg:flex flex-shrink-0 w-72 border-l border-[#141416] flex-col bg-[#080809]">
                <div className="px-6 pt-8 pb-4 border-b border-[#141416] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Live Activity</h2>
                    </div>
                    <button onClick={load} className="text-slate-600 hover:text-slate-400">
                        <RefreshCcw className="w-3.5 h-3.5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-2">
                    {activity.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Activity className="w-6 h-6 text-slate-700 mb-2" />
                            <p className="text-[11px] font-bold text-slate-600">No activity yet</p>
                        </div>
                    ) : (
                        activity.map(act => <ActivityItem key={act.id} act={act} />)
                    )}
                </div>
            </div>

            {/* Modals */}
            {(showNewTask || editingTask) && (
                <TaskFormModal
                    task={editingTask || undefined}
                    onClose={() => { setShowNewTask(false); setEditingTask(null); }}
                    onSaved={load}
                    agents={agents}
                    projects={projects}
                    pipelines={pipelines}
                />
            )}
            
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
