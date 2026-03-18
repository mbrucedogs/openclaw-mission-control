'use client';

import { useState } from 'react';
import { Agent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
    X, Search, Code, TestTube, Shield, Zap, User, 
    ChevronRight, Target, Activity, Cpu, Users,
    ArrowRight
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

const getAgentIcon = (agent: Agent) => {
    const id = agent.id.toLowerCase();
    const role = (agent.role || '').toLowerCase();
    
    if (id === 'main' || role.toLowerCase().includes('orchestrat')) return '🎉';
    if (role.toLowerCase().includes('research')) return Search;
    if (role.toLowerCase().includes('implement') || role.toLowerCase().includes('code') || role.toLowerCase().includes('build')) return Code;
    if (role.toLowerCase().includes('test') || role.toLowerCase().includes('qa')) return TestTube;
    if (role.toLowerCase().includes('review') || role.toLowerCase().includes('standard')) return Shield;
    if (role.toLowerCase().includes('auto') || role.toLowerCase().includes('cron') || role.toLowerCase().includes('monitor')) return Zap;
    
    return User;
};

export default function TeamClient({ agents }: { agents: Agent[] }) {
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

    const governanceAgents = agents.filter(a => a.layer === 'governance').sort((a, b) => (a.order || 0) - (b.order || 0));
    const pipelineAgents = agents.filter(a => a.layer === 'pipeline').sort((a, b) => (a.order || 0) - (b.order || 0));
    const automationAgents = agents.filter(a => a.layer === 'automation').sort((a, b) => (a.order || 0) - (b.order || 0));
    const unassignedAgents = agents.filter(a => !a.layer || (a.layer !== 'governance' && a.layer !== 'pipeline' && a.layer !== 'automation'));
    
    const unassignedCount = agents.filter(a => !a.type).length;
    const isOnboarding = unassignedCount > 0;

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {/* Page Header */}
            <div className="px-6 sm:px-12 py-8 sm:py-10 border-b border-[#1a1a1a] bg-[#09090b]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                            <Users className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-black text-white uppercase tracking-[0.2em] leading-none">Agent Registry</h1>
                            <p className="hidden sm:block text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Authorized autonomous agents and human coordinators</p>
                        </div>
                    </div>

                    {isOnboarding && (
                        <div className="hidden sm:flex items-center space-x-6 bg-orange-500/5 border border-orange-500/20 rounded-2xl px-6 py-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Initialization Pending</span>
                                <span className="text-[9px] text-orange-200/40 font-bold uppercase mt-0.5">{unassignedCount} Agents Requiring Setup</span>
                            </div>
                            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center border border-orange-500/30">
                                <Activity className="w-5 h-5 text-orange-400 animate-pulse" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isOnboarding && (
                <div className="mx-6 sm:mx-12 mt-6 sm:mt-8 p-6 sm:p-8 bg-blue-600/5 border border-blue-500/20 rounded-[1.5rem] sm:rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Shield className="w-32 h-32 text-white" />
                    </div>
                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="px-3 py-1 bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full">Step 1: Onboarding</div>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Foundational Setup</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight mb-3 italic">Welcome to Mission Control</h2>
                        <p className="text-sm text-slate-400 font-medium leading-relaxed">
                            To activate the orchestration engine, you must first assign a <span className="text-blue-400 font-bold uppercase tracking-wider">System Type</span> to each discovered agent. 
                            This maps their unique capabilities to our workflow templates.
                        </p>
                        <div className="mt-6 flex items-center space-x-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span>Assign All Roles</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-700" />
                            <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                <span>Unlock Workflows</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-700" />
                            <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                <span>Begin Mission</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 sm:px-12 pb-20 relative">
                {/* Governance Layer */}
                {governanceAgents.length > 0 && (
                    <div className="flex flex-col items-center space-y-12 mt-12 mb-20">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] opacity-80 border-b border-slate-800 pb-2 px-8">Governance Layer</div>
                        <div className="flex flex-wrap justify-center gap-8">
                            {governanceAgents.map(a => (
                                <AgentCard key={a.id} agent={a} highlight="border-blue-500/30" onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Pipeline Layer */}
                {pipelineAgents.length > 0 && (
                    <div className="space-y-16 mb-24">
                        <div className="flex items-center justify-center space-x-6">
                            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-[#1a1a1a]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center opacity-80">
                                WORKFLOW PIPELINE
                            </span>
                            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-[#1a1a1a]" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl mx-auto">
                            {pipelineAgents.map(a => (
                                <AgentCard key={a.id} agent={a} onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Automation Layer */}
                {automationAgents.length > 0 && (
                    <div className="space-y-16 mb-24">
                        <div className="flex items-center justify-center space-x-6">
                            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-r from-transparent to-[#222]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center opacity-80">
                                AUTOMATION LAYER
                            </span>
                            <div className="h-px flex-1 max-w-[100px] bg-gradient-to-l from-transparent to-[#222]" />
                        </div>

                        <div className="flex flex-wrap justify-center gap-8">
                            {automationAgents.map(a => (
                                <AgentCard key={a.id} agent={a} highlight="border-orange-500/30" onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Vertical Lines */}
                <div className="absolute top-48 left-1/2 -ml-px w-px h-[calc(100%-12rem)] bg-[#1a1a1a] -z-10" />

                {/* Unassigned / Available Agents */}
                {unassignedAgents.length > 0 && (
                    <div className="mt-20 space-y-12">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="h-px w-24 bg-amber-500/10" />
                            <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.3em] flex items-center">
                                UNASSIGNED AGENTS
                            </span>
                            <div className="h-px w-24 bg-amber-500/10" />
                        </div>

                        <div className="flex flex-wrap justify-center gap-6">
                            {unassignedAgents.map(a => (
                                <AgentCard key={a.id} agent={a} onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {selectedAgent && (
                <RoleCardModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
            )}
        </div>
    );
}

function AgentCard({ agent, highlight, badge, onClick }: { agent: Agent, highlight?: string, badge?: string, onClick: () => void }) {
    const Icon = getAgentIcon(agent);
    const isUnassigned = !agent.type || agent.type === '';

    return (
        <div 
            onClick={onClick}
            className={cn(
                "w-[280px] bg-[#101010] border border-[#1a1a1a] rounded-3xl p-6 transition-all hover:border-slate-700 cursor-pointer group relative",
                isUnassigned ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/50" : highlight
            )}
        >
            {isUnassigned && (
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-amber-500 text-black text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg z-10">
                    Setup Required
                </div>
            )}
            <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-[#1a1a1a] rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {typeof Icon === 'string' ? Icon : <Icon className="w-6 h-6 text-slate-400" />}
                </div>
                <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-black text-white truncate">{agent.name}</h3>
                        {badge && (
                            <span className="bg-orange-600/20 text-orange-500 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded italic">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 truncate">{agent.role}</p>
                </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 mb-6 h-8">
                {agent.mission}
            </p>

            <div className="flex flex-wrap gap-1.5 mb-8">
                {agent.responsibilities?.map((chip, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/5 text-blue-400/80 text-[9px] font-bold uppercase tracking-widest rounded border border-blue-500/10">
                        {chip}
                    </span>
                ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-[#1a1a1a]">
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest group-hover:text-white transition-colors">Role Card →</span>
            </div>
        </div>
    );
}

function RoleCardModal({ agent, onClose }: { agent: Agent, onClose: () => void }) {
    const Icon = getAgentIcon(agent);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-6" onClick={onClose}>
            <div 
                className="bg-[#0a0a0b] border border-[#1a1a1f] rounded-none sm:rounded-[2.5rem] w-full max-w-3xl h-full sm:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-8 pb-0 flex items-start justify-between">
                    <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-[#161618] rounded-2xl flex items-center justify-center text-4xl border border-[#1a1a1f]">
                            {typeof Icon === 'string' ? Icon : <Icon className="w-10 h-10 text-slate-400" />}
                        </div>
                        <div>
                            <div className="flex items-center space-x-3 mb-1">
                                <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">{agent.name}</h2>
                                <div className={cn(
                                    "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]",
                                    agent.status === 'busy' ? "bg-amber-500 shadow-amber-500/40 animate-pulse" : (agent.status === 'offline' ? "bg-slate-700 shadow-none" : "bg-emerald-500")
                                )} />
                            </div>
                            <p className="text-blue-400 font-black uppercase tracking-widest text-[10px] sm:text-xs italic">{agent.role}</p>
                            <p className="text-slate-500 text-[10px] sm:text-xs font-bold mt-1 uppercase tracking-wider">{agent.folder}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors group"
                    >
                        <X className="w-5 h-5 text-slate-500 group-hover:text-white" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-6 space-y-8 sm:space-y-10 custom-scrollbar">
                    {/* Mission Section */}
                    <div className={cn(
                        "p-6 border rounded-3xl",
                        !agent.type ? "bg-amber-500/10 border-amber-500/20" : "bg-blue-500/5 border-blue-500/10"
                    )}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Target className={cn("w-4 h-4", !agent.type ? "text-amber-500" : "text-blue-400")} />
                                <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", !agent.type ? "text-amber-500" : "text-blue-500")}>
                                    {!agent.type ? "Identity Required" : "Core Mission"}
                                </span>
                            </div>
                            {!agent.type && (
                                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded italic">
                                    Registration Pending
                                </span>
                            )}
                        </div>
                        <p className="text-base text-slate-300 font-medium leading-relaxed italic">
                            "{agent.mission}"
                        </p>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-6">
                        {agent.soulContent ? (
                            <div className="prose prose-invert prose-slate max-w-none">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Cpu className="w-4 h-4 text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System Definition</span>
                                </div>
                                <div className="bg-[#111113] border border-[#1a1a1f] rounded-3xl p-8">
                                    <MarkdownRenderer content={agent.soulContent} />
                                </div>
                            </div>
                        ) : (
                             <div className="space-y-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Activity className="w-4 h-4 text-slate-400" />
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Capabilities</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {agent.responsibilities?.map((r, i) => (
                                        <div key={i} className="flex items-center space-x-4 p-4 bg-[#111113] border border-[#1a1a1f] rounded-2xl group hover:border-blue-500/30 transition-colors">
                                            <div className="w-2 h-2 rounded-full bg-blue-500/20 group-hover:bg-blue-500 transition-colors" />
                                            <span className="text-sm font-medium text-slate-300">{r}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 sm:p-8 border-t border-[#1a1a1f] bg-[#0d0d0f] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-0">
                    <div className="flex flex-wrap gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Layer</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">{agent.layer ?? 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Status</span>
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-tight",
                                (agent.status === 'idle' || !agent.status) ? "text-emerald-500" : "text-amber-500"
                            )}>{agent.status ?? 'idle'}</span>
                        </div>
                        <div className={cn(
                            "flex flex-col p-4 rounded-xl transition-all",
                            !agent.type ? "bg-amber-500/10 border border-amber-500/30 ring-4 ring-amber-500/5" : "bg-[#111113] border border-[#1a1a1f]"
                        )}>
                            <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest mb-2",
                                !agent.type ? "text-amber-500" : "text-slate-600"
                            )}>
                                {!agent.type ? "Step 1: Assign System Type" : "System Type"}
                            </span>
                            <select 
                                value={agent.type || ''} 
                                onChange={async (e) => {
                                    const newType = e.target.value;
                                    try {
                                        const response = await fetch('/api/agents/type', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ id: agent.id, type: newType })
                                        });
                                        if (response.ok) {
                                            window.location.reload(); 
                                        }
                                    } catch (err) {
                                        console.error('Failed to update agent type', err);
                                    }
                                }}
                                className={cn(
                                    "rounded-lg text-xs font-bold uppercase tracking-tight px-3 py-2 outline-none transition-all",
                                    !agent.type 
                                        ? "bg-amber-500 text-black hover:bg-amber-400 cursor-pointer" 
                                        : "bg-[#0a0a0c] border border-[#1a1a1f] text-blue-400 hover:border-blue-500/30"
                                )}
                            >
                                <option value="" disabled={!!agent.type}>SELECT ROLE...</option>
                                <option value="orchestrator">ORCHESTRATOR</option>
                                <option value="researcher">RESEARCHER</option>
                                <option value="builder">BUILDER</option>
                                <option value="tester">TESTER</option>
                                <option value="reviewer">REVIEWER</option>
                                <option value="automation">AUTOMATION</option>
                            </select>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-full sm:w-auto px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all"
                    >
                        Close Registry
                    </button>
                </div>
            </div>
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #1a1a1f;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #2a2a2f;
                }
            `}</style>
        </div>
    );
}
