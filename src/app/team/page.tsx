import { getAgents } from '@/lib/domain/agents';
import TeamClient from './TeamClient';

export default function TeamPage() {
    const agents = getAgents();
    
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
            <TeamClient agents={agents} />
        </div>
    );
}

