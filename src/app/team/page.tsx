import { getAgents } from '@/lib/domain/agents';
import {
    Users,
    Shield,
    Cpu,
    Search,
    Code,
    TestTube,
    Target,
    Building2,
    User,
    Activity,
    Zap,
    Wrench,
    PenTool,
    Palette,
    Megaphone,
    Terminal,
    Sparkles,
    ChevronRight,
    Play,
    CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const getAgentIcon = (agent: any) => {
    const id = agent.id.toLowerCase();
    const role = (agent.role || '').toLowerCase();
    
    if (id === 'main' || id === 'max' || role.includes('orchestrat')) return '🎉';
    if (id.includes('alice') || role.includes('research')) return Search;
    if (id.includes('bob') || role.includes('implement') || role.includes('code')) return Code;
    if (id.includes('charlie') || role.includes('test') || role.includes('qa')) return TestTube;
    if (id.includes('aegis') || role.includes('review') || role.includes('standard')) return Shield;
    if (id.includes('tron') || role.includes('auto') || role.includes('cron') || role.includes('monitor')) return Zap;
    
    return User;
};

export default function TeamPage() {
    const agents = getAgents();
    
    const governanceAgents = agents.filter(a => a.layer === 'governance').sort((a, b) => (a.order || 0) - (b.order || 0));
    const pipelineAgents = agents.filter(a => a.layer === 'pipeline').sort((a, b) => (a.order || 0) - (b.order || 0));
    const automationAgents = agents.filter(a => a.layer === 'automation').sort((a, b) => (a.order || 0) - (b.order || 0));

    return (
        <div className="max-w-[1400px] p-12 space-y-20">
            {/* Header Content */}
            <div className="text-center space-y-8">
                <div className="inline-block px-8 py-4 bg-blue-500/10 border border-blue-500/20 rounded-[2rem] text-blue-400 font-medium italic text-lg">
                    "An autonomous organization of AI agents that does work for me and produces value 24/7"
                </div>

                <h1 className="text-6xl font-black text-white tracking-tight">The Organization</h1>

                <div className="space-y-4 max-w-3xl mx-auto">
                    <p className="text-xl font-bold text-slate-400">Canonical agent roster and workflow system.</p>
                </div>
            </div>

            {/* Hierarchy Layout */}
            <div className="space-y-24 relative pb-20">
                {/* Governance Layer */}
                {governanceAgents.length > 0 && (
                    <div className="flex flex-col items-center space-y-8">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Governance Layer</div>
                        <div className="flex flex-wrap justify-center gap-6">
                            {governanceAgents.map(a => (
                                <AgentCard key={a.id} agent={a} highlight="border-blue-500/30" />
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
                                <AgentCard key={a.id} agent={a} highlight={a.id === 'aegis' ? 'border-emerald-500/30' : undefined} />
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
                                <AgentCard key={a.id} agent={a} highlight="border-orange-500/30" />
                            ))}
                        </div>
                    </div>
                )}

                {/* Vertical Lines */}
                <div className="absolute top-48 left-1/2 -ml-px w-px h-[calc(100%-12rem)] bg-[#1a1a1a] -z-10" />
            </div>
        </div>
    );
}

function AgentCard({ agent, highlight, badge }: { agent: any, highlight?: string, badge?: string }) {
    if (!agent) return <div className="w-[280px] h-64 bg-[#101010] border border-dashed border-[#1a1a1a] rounded-3xl" />;

    const Icon = getAgentIcon(agent);

    return (
        <div className={cn(
            "w-[280px] bg-[#101010] border border-[#1a1a1a] rounded-3xl p-6 transition-all hover:border-slate-700 cursor-pointer group relative",
            highlight
        )}>
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
                {agent.responsibilities.map((chip: string, i: number) => (
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

