'use client';

import { useState, useEffect } from 'react';
import { 
    GitBranch, Layers, Settings, Play, Plus, Edit3, Trash2, 
    CheckCircle, AlertCircle, Clock, User, Cpu, ChevronRight,
    Save, X, ArrowRight, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    agentRole: string;
    agentId?: string;
    agentName?: string;
    timeoutSeconds: number;
    model: string;
    systemPrompt?: string;
    validationChecklist: string[];
    tags: string[];
    useCount: number;
}

interface Pipeline {
    id: string;
    name: string;
    description?: string;
    steps: PipelineStep[];
    isDynamic: boolean;
    useCount: number;
}

interface PipelineStep {
    workflow_id: string;
    workflowName?: string;
    on_failure: 'stop' | 'continue' | 'skip';
}


const AGENT_COLORS: Record<string, string> = {
    researcher: 'bg-pink-500',
    builder: 'bg-orange-500',
    tester: 'bg-sky-500',
    reviewer: 'bg-red-500',
    approver: 'bg-emerald-500',
    automation: 'bg-cyan-500',
};

const AGENT_ICONS: Record<string, string> = {
    researcher: '🔍',
    builder: '🔨',
    tester: '🧪',
    reviewer: '👁️',
    approver: '✅',
    automation: '⚡',
};

export default function OrchestrationPage() {
    const [activeTab, setActiveTab] = useState<'workflows' | 'pipelines'>('workflows');
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [wfRes, plRes] = await Promise.all([
                fetch('/api/workflows'),
                fetch('/api/pipelines'),
            ]);
            if (wfRes.ok) setWorkflows(await wfRes.json());
            if (plRes.ok) setPipelines(await plRes.json());
        } catch (err) {
            console.error('Failed to load orchestration data:', err);
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Sidebar */}
            <div className="hidden lg:flex w-64 border-r border-[#222] bg-[#0a0a0a] flex-col">
                <div className="px-6 py-6 border-b border-[#1a1a1a] bg-[#09090b]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.05)]">
                            <Settings className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xs font-black text-white uppercase tracking-[0.2em] leading-none">Orchestration</h2>
                            <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wider opacity-70">Control Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <button
                        onClick={() => setActiveTab('workflows')}
                        className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                            activeTab === 'workflows' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        )}
                    >
                        <Layers className="w-4 h-4" />
                        <span className="text-xs font-bold">Workflows</span>
                        <span className="ml-auto text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
                            {workflows.length}
                        </span>
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('pipelines')}
                        className={cn(
                            'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                            activeTab === 'pipelines' 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        )}
                    >
                        <GitBranch className="w-4 h-4" />
                        <span className="text-xs font-bold">Pipelines</span>
                        <span className="ml-auto text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
                            {pipelines.length}
                        </span>
                    </button>

                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-6 sm:px-12 py-8 sm:py-10 border-b border-[#1a1a1a] bg-[#09090b] mb-4 sm:mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                            <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-[0.2em] leading-none">Orchestrator</h1>
                            <p className="hidden sm:block text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Define agent logic and pipeline execution paths</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 sm:px-12 pb-20">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                        </div>
                    ) : activeTab === 'workflows' ? (
                        <WorkflowsTab workflows={workflows} onRefresh={loadData} />
                    ) : (
                        <PipelinesTab pipelines={pipelines} workflows={workflows} onRefresh={loadData} />
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// WORKFLOWS TAB
// ============================================================================

function WorkflowsTab({ workflows, onRefresh }: { workflows: Workflow[]; onRefresh: () => void }) {
    const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
    const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const groupedByRole = workflows.reduce((acc, wf) => {
        if (!acc[wf.agentRole]) acc[wf.agentRole] = [];
        acc[wf.agentRole].push(wf);
        return acc;
    }, {} as Record<string, Workflow[]>);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this workflow?')) return;
        
        try {
            const res = await fetch('/api/workflows', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            
            if (res.ok) {
                onRefresh();
            } else {
                alert('Failed to delete workflow');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting workflow');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
                <div>
                    <h2 className="text-lg font-black text-white">Workflow Templates</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Reusable work definitions for agents.
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Workflow
                </button>
            </div>

            {(isCreating || editingWorkflow) && (
                <WorkflowForm 
                    workflow={editingWorkflow} 
                    onSave={async (data) => {
                        setIsSaving(true);
                        try {
                            const url = '/api/workflows';
                            const method = editingWorkflow ? 'PUT' : 'POST';
                            const body = editingWorkflow ? { ...data, id: editingWorkflow.id } : data;
                            
                            const res = await fetch(url, {
                                method,
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                            });
                            
                            if (res.ok) {
                                setIsCreating(false);
                                setEditingWorkflow(null);
                                onRefresh();
                            } else {
                                alert('Failed to save workflow');
                            }
                        } catch (err) {
                            console.error('Save error:', err);
                            alert('Error saving workflow');
                        }
                        setIsSaving(false);
                    }}
                    onCancel={() => {
                        setIsCreating(false);
                        setEditingWorkflow(null);
                    }}
                    isSaving={isSaving}
                />
            )}

            <div className="space-y-6">
                {Object.entries(groupedByRole).map(([role, roleWorkflows]) => (
                    <div key={role} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className={cn('w-2 h-2 rounded-full', AGENT_COLORS[role])} />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                {AGENT_ICONS[role]} {role}s
                            </h3>
                            <span className="text-[10px] text-slate-600">({roleWorkflows.length})</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roleWorkflows.map(workflow => (
                                <WorkflowCard 
                                    key={workflow.id} 
                                    workflow={workflow}
                                    isExpanded={expandedWorkflow === workflow.id}
                                    onToggle={() => setExpandedWorkflow(
                                        expandedWorkflow === workflow.id ? null : workflow.id
                                    )}
                                    onEdit={() => setEditingWorkflow(workflow)}
                                    onDelete={() => handleDelete(workflow.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WorkflowForm({ workflow, onSave, onCancel, isSaving }: { 
    workflow?: Workflow | null;
    onSave: (data: any) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const [agents, setAgents] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: workflow?.name || '',
        description: workflow?.description || '',
        agentId: workflow?.agentId || '',
        timeoutSeconds: workflow?.timeoutSeconds || 30,
        systemPrompt: workflow?.systemPrompt || '',
        validationChecklist: workflow?.validationChecklist?.join('\n') || '',
        tags: workflow?.tags?.join(', ') || '',
    });

    // Update formData when workflow prop changes (for edit mode)
    useEffect(() => {
        if (workflow) {
            setFormData({
                name: workflow.name || '',
                description: workflow.description || '',
                agentId: workflow.agentId || '',
                timeoutSeconds: workflow.timeoutSeconds || 30,
                systemPrompt: workflow.systemPrompt || '',
                validationChecklist: workflow.validationChecklist?.join('\n') || '',
                tags: workflow.tags?.join(', ') || '',
            });
        }
    }, [workflow?.id]); // Only re-run when workflow ID changes

    useEffect(() => {
        fetch('/api/agents')
            .then(r => r.json())
            .then(setAgents)
            .catch(console.error);
    }, []);

    const selectedAgent = agents.find(a => a.id === formData.agentId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.agentId) {
            alert('Please select an agent');
            return;
        }
        onSave({
            ...formData,
            agentRole: selectedAgent?.role || 'researcher',
            timeoutSeconds: parseInt(formData.timeoutSeconds as any),
            validationChecklist: formData.validationChecklist.split('\n').filter(s => s.trim()),
            tags: formData.tags.split(',').map(s => s.trim()).filter(s => s),
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-[#111] border border-[#222] rounded-xl p-6 mb-6">
            <h3 className="text-sm font-bold text-white mb-4">{workflow ? 'Edit Workflow' : 'New Workflow'}</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                        required
                    />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Description</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                    />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Agent *</label>
                    <select
                        value={formData.agentId}
                        onChange={e => setFormData({ ...formData, agentId: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                        required
                    >
                        <option value="">Select an agent...</option>
                        {agents.filter(a => a.type).map(agent => (
                            <option key={agent.id} value={agent.id}>
                                {agent.name} ({agent.role})
                            </option>
                        ))}
                    </select>
                    {agents.some(a => !a.type) && (
                        <p className="text-[9px] text-amber-500 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Some agents are missing System Types. 
                            <a href="/team" className="underline ml-1 font-bold">Manage Agents in Team Registry</a>
                        </p>
                    )}
                    {selectedAgent && (
                        <p className="text-[10px] text-slate-500 mt-1">
                            Uses model: {selectedAgent.model || 'Default'}
                        </p>
                    )}
                </div>
                
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Estimated Minutes</label>
                    <input
                        type="number"
                        value={formData.timeoutSeconds}
                        onChange={e => setFormData({ ...formData, timeoutSeconds: parseInt(e.target.value) })}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                    />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">System Prompt</label>
                    <textarea
                        value={formData.systemPrompt}
                        onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                        rows={3}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white resize-none"
                    />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Validation Checklist (one per line)</label>
                    <textarea
                        value={formData.validationChecklist}
                        onChange={e => setFormData({ ...formData, validationChecklist: e.target.value })}
                        rows={3}
                        placeholder="- Item 1&#10;- Item 2&#10;- Item 3"
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white resize-none"
                    />
                </div>
                
                <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Tags (comma separated)</label>
                    <input
                        type="text"
                        value={formData.tags}
                        onChange={e => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="research, analysis, quick"
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                    />
                </div>
            </div>
            
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={isSaving || !formData.agentId}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-lg"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? 'Saving...' : 'Save Workflow'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black px-4 py-2"
                >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                </button>
            </div>
        </form>
    );
}

function WorkflowCard({ 
    workflow, 
    isExpanded, 
    onToggle,
    onEdit,
    onDelete
}: { 
    workflow: Workflow; 
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    return (
        <div 
            className={cn(
                'bg-[#111] border border-[#222] rounded-xl overflow-hidden transition-all',
                isExpanded ? 'ring-1 ring-blue-500/30' : 'hover:border-slate-700'
            )}
        >
            <div className="p-5 cursor-pointer" onClick={onToggle}>
                <div className="flex items-start justify-between mb-3">
                    <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm',
                        AGENT_COLORS[workflow.agentRole],
                        'bg-opacity-20'
                    )}>
                        {AGENT_ICONS[workflow.agentRole]}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
                            {workflow.useCount} uses
                        </span>
                    </div>
                </div>

                <h4 className="text-sm font-bold text-white mb-1">{workflow.name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{workflow.description}</p>

                <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {workflow.timeoutSeconds}min
                    </span>
                    {workflow.agentName && (
                        <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-blue-400" />
                            {workflow.agentName}
                        </span>
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#222]">
                    <div className="pt-4 space-y-4">
                        {workflow.systemPrompt && (
                            <div>
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    System Prompt
                                </h5>
                                <p className="text-xs text-slate-400 bg-[#0a0a0a] p-3 rounded">{workflow.systemPrompt}</p>
                            </div>
                        )}

                        <div>
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                Validation Checklist
                            </h5>
                            <ul className="space-y-1">
                                {workflow.validationChecklist.map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                        <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {workflow.tags.length > 0 && (
                            <div>
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    Tags
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                    {workflow.tags.map(tag => (
                                        <span key={tag} className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// PIPELINES TAB
// ============================================================================

function PipelinesTab({ pipelines, workflows, onRefresh }: { 
    pipelines: Pipeline[]; 
    workflows: Workflow[];
    onRefresh: () => void;
}) {
    const [expandedPipeline, setExpandedPipeline] = useState<string | null>(null);
    const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const workflowMap = new Map(workflows.map(w => [w.id, w]));

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this pipeline?')) return;
        
        try {
            const res = await fetch('/api/pipelines', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            
            if (res.ok) {
                onRefresh();
            } else {
                alert('Failed to delete pipeline');
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('Error deleting pipeline');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-white">Pipelines</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Sequences of workflows. Pipelines define the path a task takes through agents.
                    </p>
                </div>
                <button 
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-3.5 h-3.5" />
                    New Pipeline
                </button>
            </div>

            {(isCreating || editingPipeline) && (
                <PipelineForm 
                    pipeline={editingPipeline}
                    workflows={workflows}
                    onSave={async (data) => {
                        setIsSaving(true);
                        try {
                            const url = '/api/pipelines';
                            const method = editingPipeline ? 'PUT' : 'POST';
                            const body = editingPipeline ? { ...data, id: editingPipeline.id } : data;
                            
                            const res = await fetch(url, {
                                method,
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(body),
                            });
                            
                            if (res.ok) {
                                setIsCreating(false);
                                setEditingPipeline(null);
                                onRefresh();
                            } else {
                                alert('Failed to save pipeline');
                            }
                        } catch (err) {
                            console.error('Save error:', err);
                            alert('Error saving pipeline');
                        }
                        setIsSaving(false);
                    }}
                    onCancel={() => {
                        setIsCreating(false);
                        setEditingPipeline(null);
                    }}
                    isSaving={isSaving}
                />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {pipelines.map(pipeline => (
                    <PipelineCard
                        key={pipeline.id}
                        pipeline={pipeline}
                        workflowMap={workflowMap}
                        isExpanded={expandedPipeline === pipeline.id}
                        onToggle={() => setExpandedPipeline(
                            expandedPipeline === pipeline.id ? null : pipeline.id
                        )}
                        onEdit={() => setEditingPipeline(pipeline)}
                        onDelete={() => handleDelete(pipeline.id)}
                    />
                ))}
            </div>
        </div>
    );
}

function PipelineForm({
    pipeline,
    workflows,
    onSave,
    onCancel,
    isSaving
}: {
    pipeline?: Pipeline | null;
    workflows: Workflow[];
    onSave: (data: any) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const [formData, setFormData] = useState({
        name: pipeline?.name || '',
        description: pipeline?.description || '',
        steps: pipeline?.steps || [],
    });
    const [selectedWorkflow, setSelectedWorkflow] = useState('');

    // Update formData when pipeline prop changes (for edit mode)
    useEffect(() => {
        if (pipeline) {
            setFormData({
                name: pipeline.name || '',
                description: pipeline.description || '',
                steps: pipeline.steps || [],
            });
        }
    }, [pipeline?.id]); // Only re-run when pipeline ID changes

    const addStep = () => {
        if (!selectedWorkflow) return;
        setFormData({
            ...formData,
            steps: [...formData.steps, { workflow_id: selectedWorkflow, on_failure: 'stop' }],
        });
        setSelectedWorkflow('');
    };

    const removeStep = (index: number) => {
        setFormData({
            ...formData,
            steps: formData.steps.filter((_, i) => i !== index),
        });
    };

    const updateStep = (index: number, updates: any) => {
        const newSteps = [...formData.steps];
        newSteps[index] = { ...newSteps[index], ...updates };
        setFormData({ ...formData, steps: newSteps });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const workflowMap = new Map(workflows.map(w => [w.id, w]));

    return (
        <form onSubmit={handleSubmit} className="bg-[#111] border border-[#222] rounded-xl p-6 mb-6">
            <h3 className="text-sm font-bold text-white mb-4">{pipeline ? 'Edit Pipeline' : 'New Pipeline'}</h3>
            
            <div className="space-y-4 mb-6">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Name</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                        required
                    />
                </div>
                
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Description</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Steps</label>
                    
                    <div className="space-y-2 mb-4">
                        {formData.steps.map((step, i) => {
                            const wf = workflowMap.get(step.workflow_id);
                            return (
                                <div key={i} className="flex items-center gap-2 p-3 bg-[#0a0a0a] rounded-lg">
                                    <span className="text-xs text-slate-500 w-6">{i + 1}.</span>
                                    <div className="flex-1">
                                        <span className="text-sm text-white">{wf?.name || step.workflow_id}</span>
                                        <span className="text-xs text-slate-500 ml-2">({wf?.agentRole})</span>
                                    </div>
                                    <select
                                        value={step.on_failure}
                                        onChange={e => updateStep(i, { on_failure: e.target.value })}
                                        className="bg-[#111] border border-[#222] rounded px-2 py-1 text-xs text-white"
                                    >
                                        <option value="stop">Stop</option>
                                        <option value="continue">Continue</option>
                                        <option value="skip">Skip</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => removeStep(i)}
                                        className="p-1 text-slate-500 hover:text-red-400"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-2">
                        <select
                            value={selectedWorkflow}
                            onChange={e => setSelectedWorkflow(e.target.value)}
                            className="flex-1 bg-[#0a0a0a] border border-[#222] rounded-lg px-3 py-2 text-sm text-white"
                        >
                            <option value="">Select workflow...</option>
                            {workflows.map(w => (
                                <option key={w.id} value={w.id}>
                                    {w.name} ({w.agentRole})
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={addStep}
                            disabled={!selectedWorkflow}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                        >
                            Add Step
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button
                    type="submit"
                    disabled={isSaving || formData.steps.length === 0}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black px-4 py-2 rounded-lg"
                >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaving ? 'Saving...' : 'Save Pipeline'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-black px-4 py-2"
                >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                </button>
            </div>
        </form>
    );
}

function PipelineCard({ 
    pipeline, 
    workflowMap, 
    isExpanded, 
    onToggle,
    onEdit,
    onDelete
}: { 
    pipeline: Pipeline; 
    workflowMap: Map<string, Workflow>;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const stepsWithData = pipeline.steps.map(step => ({
        ...step,
        workflow: workflowMap.get(step.workflow_id),
    }));

    return (
        <div 
            className={cn(
                'bg-[#111] border border-[#222] rounded-xl overflow-hidden transition-all',
                pipeline.isDynamic && 'border-dashed border-blue-500/30',
                isExpanded ? 'ring-1 ring-blue-500/30' : 'hover:border-slate-700'
            )}
        >
            <div className="p-5 cursor-pointer" onClick={onToggle}>
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <GitBranch className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                {pipeline.name}
                                {pipeline.isDynamic && (
                                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                        DYNAMIC
                                    </span>
                                )}
                            </h4>
                            <p className="text-xs text-slate-500">{pipeline.description}</p>
                        </div>
                    </div>
                    <span className="text-[10px] text-slate-600 bg-slate-800 px-2 py-0.5 rounded">
                        {pipeline.useCount} runs
                    </span>
                </div>

                {/* Pipeline visualization */}
                <div className="flex items-center gap-1 mt-4 overflow-x-auto pb-2">
                    {stepsWithData.map((step, i) => (
                        <div key={i} className="flex items-center">
                            <div className={cn(
                                'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold',
                                step.workflow 
                                    ? AGENT_COLORS[step.workflow.agentRole] + ' bg-opacity-10 text-white'
                                    : 'bg-slate-800 text-slate-500'
                            )}>
                                <span>{step.workflow ? AGENT_ICONS[step.workflow.agentRole] : '?'}</span>
                                <span className="truncate max-w-[120px]">
                                    {step.workflow?.name || step.workflow_id}
                                    {step.workflow?.agentName && (
                                        <span className="text-blue-400 opacity-70 ml-1 font-medium">
                                            ({step.workflow.agentName})
                                        </span>
                                    )}
                                </span>
                            </div>
                            {i < stepsWithData.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-slate-600 mx-0.5" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#222]">
                    <div className="pt-4 space-y-4">
                        <div>
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                Pipeline Steps
                            </h5>
                            <div className="space-y-2">
                                {stepsWithData.map((step, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                                        <div className={cn(
                                            'w-6 h-6 rounded flex items-center justify-center text-xs',
                                            step.workflow ? AGENT_COLORS[step.workflow.agentRole] : 'bg-slate-700'
                                        )}>
                                            {step.workflow ? AGENT_ICONS[step.workflow.agentRole] : '?'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-white">
                                                {step.workflow?.name || step.workflow_id}
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                {step.workflow?.agentName ? (
                                                    <>
                                                        <span className="font-bold text-blue-400/80">{step.workflow.agentName}</span>
                                                        <span className="text-slate-500 ml-1">({step.workflow.agentRole})</span>
                                                    </>
                                                ) : step.workflow?.agentRole} • {step.workflow?.timeoutSeconds}min
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {step.on_failure === 'stop' && (
                                                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                            )}
                                            {step.on_failure === 'continue' && (
                                                <Play className="w-3.5 h-3.5 text-emerald-400" />
                                            )}
                                            {step.on_failure === 'skip' && (
                                                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            {!pipeline.isDynamic && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); }}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <Play className="w-3.5 h-3.5" />
                                    Test Run
                                </button>
                            )}
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

