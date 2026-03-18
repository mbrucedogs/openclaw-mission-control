'use client';

import { useState } from 'react';
import { Agent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { 
    X, Search, Code, TestTube, Shield, Zap, User, 
    ChevronRight, Target, Activity, Cpu, Users 
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

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a]">
            {/* Page Header */}
            <div className="px-12 py-10 border-b border-[#1a1a1a] bg-[#09090b] mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                        <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-[0.2em] leading-none">Agent Registry</h1>
                        <p className="text-[10px] font-bold text-slate-500 mt-1.5 uppercase tracking-wider italic opacity-70">Authorized autonomous agents and human coordinators</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-12 pb-20 relative">
                {/* Governance Layer */}
                {governanceAgents.length > 0 && (
                    <div className="flex flex-col items-center space-y-8">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Governance Layer</div>
                        <div className="flex flex-wrap justify-center gap-6">
                            {governanceAgents.map(a => (
                                <AgentCard key={a.id} agent={a} highlight="border-blue-500/30" onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Pipeline Layer */}
                {pipelineAgents.length > 0 && (
                    <div className="space-y-12">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="h-px w-24 bg-[#1a1a1a]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center">
                                WORKFLOW PIPELINE
                            </span>
                            <div className="h-px w-24 bg-[#1a1a1a]" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl mx-auto">
                            {pipelineAgents.map(a => (
                                <AgentCard key={a.id} agent={a} onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Automation Layer */}
                {automationAgents.length > 0 && (
                    <div className="space-y-12">
                        <div className="flex items-center justify-center space-x-4">
                            <div className="h-px w-24 bg-[#1a1a1a]" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center">
                                AUTOMATION LAYER
                            </span>
                            <div className="h-px w-24 bg-[#1a1a1a]" />
                        </div>

                        <div className="flex flex-wrap justify-center gap-6">
                            {automationAgents.map(a => (
                                <AgentCard key={a.id} agent={a} highlight="border-orange-500/30" onClick={() => setSelectedAgent(a)} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Vertical Lines */}
                <div className="absolute top-48 left-1/2 -ml-px w-px h-[calc(100%-12rem)] bg-[#1a1a1a] -z-10" />
            </div>

            {selectedAgent && (
                <RoleCardModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
            )}
        </div>
    );
}

function AgentCard({ agent, highlight, badge, onClick }: { agent: Agent, highlight?: string, badge?: string, onClick: () => void }) {
    const Icon = getAgentIcon(agent);

    return (
        <div 
            onClick={onClick}
            className={cn(
                "w-[280px] bg-[#101010] border border-[#1a1a1a] rounded-3xl p-6 transition-all hover:border-slate-700 cursor-pointer group relative",
                highlight
            )}
        >
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6" onClick={onClose}>
            <div 
                className="bg-[#0a0a0b] border border-[#1a1a1f] rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
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
                                <h2 className="text-3xl font-black text-white tracking-tight">{agent.name}</h2>
                                <div className={cn(
                                    "w-3 h-3 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)]",
                                    agent.status === 'busy' ? "bg-amber-500 shadow-amber-500/40 animate-pulse" : (agent.status === 'offline' ? "bg-slate-700 shadow-none" : "bg-emerald-500")
                                )} />
                            </div>
                            <p className="text-blue-400 font-black uppercase tracking-widest text-xs italic">{agent.role}</p>
                            <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">{agent.folder}</p>
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
                <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 custom-scrollbar">
                    {/* Mission Section */}
                    <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-3xl">
                        <div className="flex items-center space-x-2 mb-4">
                            <Target className="w-4 h-4 text-blue-400" />
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Core Mission</span>
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
                <div className="p-8 border-t border-[#1a1a1f] bg-[#0d0d0f] flex justify-between items-center">
                    <div className="flex space-x-6">
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
                        <div className="flex flex-col min-w-[140px]">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">System Type</span>
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
                                            // Ideally we would refresh the parent state here, 
                                            // but for now we just show it updated in the DB.
                                            // In a real app we'd use a context or state management.
                                            window.location.reload(); 
                                        }
                                    } catch (err) {
                                        console.error('Failed to update agent type', err);
                                    }
                                }}
                                className="bg-[#111113] border border-[#1a1a1f] rounded-lg text-xs font-bold text-blue-400 uppercase tracking-tight px-2 py-1 outline-none hover:border-blue-500/30 transition-colors"
                            >
                                <option value="">UNASSIGNED</option>
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
                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black text-white uppercase tracking-widest transition-all"
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
