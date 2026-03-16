'use client';

import { useState, useEffect } from 'react';
import { 
    GitBranch, Layers, Settings, Play, Plus, Edit3, Trash2, 
    CheckCircle, AlertCircle, Clock, User, Cpu, ChevronRight,
    Save, X, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    agentRole: string;
    agentId?: string;
    estimatedMinutes: number;
    model: string;
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
    workflowId: string;
    workflowName?: string;
    onFailure: 'stop' | 'continue' | 'skip';
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
        <div className="flex h-full overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-[#222] bg-[#0a0a0a] flex flex-col">
                <div className="p-6 border-b border-[#222]">
                    <div className="flex items-center gap-2 mb-1">
                        <Settings className="w-4 h-4 text-blue-400" />
                        <h1 className="text-sm font-black text-white uppercase tracking-widest">Orchestration</h1>
                    </div>
                    <p className="text-[10px] text-slate-600">Workflows & Pipelines</p>
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
            <div className="flex-1 overflow-y-auto p-8">
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
    );
}

// ============================================================================
// WORKFLOWS TAB
// ============================================================================

function WorkflowsTab({ workflows, onRefresh }: { workflows: Workflow[]; onRefresh: () => void }) {
    const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

    const groupedByRole = workflows.reduce((acc, wf) => {
        if (!acc[wf.agentRole]) acc[wf.agentRole] = [];
        acc[wf.agentRole].push(wf);
        return acc;
    }, {} as Record<string, Workflow[]>);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-white">Workflow Templates</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Reusable work definitions for agents. Each workflow defines what an agent does.
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    New Workflow
                </button>
            </div>

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
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WorkflowCard({ workflow, isExpanded, onToggle }: { 
    workflow: Workflow; 
    isExpanded: boolean;
    onToggle: () => void;
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
                        {workflow.estimatedMinutes}min
                    </span>
                    <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3" />
                        {workflow.model.split('-')[0]}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#222]">
                    <div className="pt-4 space-y-4">
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
                            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors">
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 py-2 rounded-lg hover:bg-slate-800 transition-colors">
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

    const workflowMap = new Map(workflows.map(w => [w.id, w]));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-black text-white">Pipelines</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Sequences of workflows. Pipelines define the path a task takes through agents.
                    </p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-lg transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    New Pipeline
                </button>
            </div>

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
                    />
                ))}
            </div>
        </div>
    );
}

function PipelineCard({ 
    pipeline, 
    workflowMap, 
    isExpanded, 
    onToggle 
}: { 
    pipeline: Pipeline; 
    workflowMap: Map<string, Workflow>;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const stepsWithData = pipeline.steps.map(step => ({
        ...step,
        workflow: workflowMap.get(step.workflowId),
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
                                <span className="truncate max-w-[80px]">
                                    {step.workflow?.name || step.workflowId}
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
                                                {step.workflow?.name || step.workflowId}
                                            </p>
                                            <p className="text-[10px] text-slate-500">
                                                {step.workflow?.agentRole} • {step.workflow?.estimatedMinutes}min
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {step.onFailure === 'stop' && (
                                                <AlertCircle className="w-3.5 h-3.5 text-red-400" title="Stop on failure" />
                                            )}
                                            {step.onFailure === 'continue' && (
                                                <Play className="w-3.5 h-3.5 text-emerald-400" title="Continue on failure" />
                                            )}
                                            {step.onFailure === 'skip' && (
                                                <ArrowRight className="w-3.5 h-3.5 text-amber-400" title="Skip on failure" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors">
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit
                            </button>
                            {!pipeline.isDynamic && (
                                <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white py-2 rounded-lg hover:bg-slate-800 transition-colors">
                                    <Play className="w-3.5 h-3.5" />
                                    Test Run
                                </button>
                            )}
                            <button className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 py-2 rounded-lg hover:bg-slate-800 transition-colors">
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
