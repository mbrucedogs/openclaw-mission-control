'use client';

import {
    Monitor,
    Zap,
    LayoutGrid,
    Activity,
    MoreHorizontal,
    Maximize2,
    Users,
    Waves,
    Calendar,
    SearchIcon,
    Plus,
    MessageCircle,
    Sparkles,
    Shield,
    TestTube,
    Code,
    Search,
    PenTool,
    Palette,
    Megaphone,
    Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Send, X } from 'lucide-react';

const getAgentIcon = (agentOrId: any) => {
    const id = (typeof agentOrId === 'string' ? agentOrId : agentOrId?.id || '').toLowerCase();
    const role = (typeof agentOrId === 'string' ? '' : agentOrId?.role || '').toLowerCase();
    
    if (id.includes('max')) return '🎉';
    if (id.includes('alice') || role.includes('research')) return '🔍';
    if (id.includes('bob') || role.includes('implement') || role.includes('code')) return '💻';
    if (id.includes('charlie') || role.includes('test') || role.includes('qa')) return '🧪';
    if (id.includes('aegis') || role.includes('review') || role.includes('standard')) return '🛡️';
    if (id.includes('tron') || id.includes('heartbeat') || role.includes('auto') || role.includes('cron') || role.includes('monitor')) return '⚡';
    
    return '👤';
};

export function OfficeClient({ agents }: { agents: any[] }) {
    // Dynamically pick the first agent or a sensible default
    const [selectedAgent, setSelectedAgent] = useState(() => {
        const main = agents.find(a => a.id === 'main' || a.id === 'max');
        return main?.id || agents[0]?.id || '';
    });
    const [liveSessions, setLiveSessions] = useState<any[]>([]);
    const [agentTasks, setAgentTasks] = useState<Record<string, any[]>>({});
    const [loading, setLoading] = useState(true);

    // Fetch assigned tasks for all agents
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await fetch('/api/tasks');
                if (res.ok) {
                    const tasks = await res.json();
                    // Group tasks by owner
                    const tasksByAgent: Record<string, any[]> = {};
                    tasks.forEach((task: any) => {
                        const owner = task.owner || 'unassigned';
                        if (!tasksByAgent[owner]) tasksByAgent[owner] = [];
                        tasksByAgent[owner].push(task);
                    });
                    setAgentTasks(tasksByAgent);
                }
            } catch (err) {
                console.error('Failed to fetch tasks', err);
            }
            setLoading(false);
        };

        fetchTasks();
        const interval = setInterval(fetchTasks, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);
    
    // Default Positions (Mapping both technical IDs and friendly aliases)
    const defaultPositions: Record<string, {x: number, y: number}> = {
        max: { x: 2, y: 1 },
        main: { x: 2, y: 1 },
        alice: { x: 1, y: 4 },
        'alice-researcher': { x: 1, y: 4 },
        bob: { x: 2, y: 4 },
        'bob-implementer': { x: 2, y: 4 },
        charlie: { x: 3, y: 4 },
        'charlie-tester': { x: 3, y: 4 },
        aegis: { x: 4, y: 4 },
        tron: { x: 3, y: 1 },
    };

    // Auto-generate positions for new agents
    const allPositions = { ...defaultPositions };
    let nextX = 0;
    
    agents.forEach(agent => {
        if (!allPositions[agent.id]) {
            allPositions[agent.id] = { x: nextX % 6, y: 5 };
            nextX++;
        }
    });

    const [positions, setPositions] = useState<Record<string, {x: number, y: number}>>(allPositions);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await fetch('/api/sessions');
                if (res.ok) {
                    const data = await res.json();
                    setLiveSessions(data.sessions || []);
                }
            } catch (err) {
                console.error("Failed to fetch live sessions", err);
            }
        };

        fetchSessions();
        const interval = setInterval(fetchSessions, 5000);
        return () => clearInterval(interval);
    }, []);

    // Merge static agents from DB with live status from OpenClaw
    const displayAgents = agents.map(agent => {
        // OpenClaw often uses names directly or prefixed IDs
        const session = liveSessions.find(s => 
            s.agentId === agent.id || 
            s.label?.toLowerCase().includes(agent.id.toLowerCase())
        );
        return {
            ...agent,
            isLive: !!session,
            liveStatus: session ? 'Active' : agent.status
        };
    });

    const getAgentStatus = (agentId: string) => {
        const agent = displayAgents.find(a => a.id === agentId);
        return agent?.isLive ? 'Active' : undefined;
    };

    const selectedAgentData = displayAgents.find(a => a.id === selectedAgent) || displayAgents[0];
    const agentSessions = liveSessions
        .filter(s => s.agentId === selectedAgent || s.label?.toLowerCase().includes(selectedAgent.toLowerCase()))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 50);

    // Map Actions
    const handleReset = () => {
        setPositions(allPositions);
    };

    const handleGather = () => {
        const gatherPositions: any = {};
        displayAgents.forEach((a, i) => {
            gatherPositions[a.id] = { x: (i % 3) + 2, y: Math.floor(i / 3) + 4 };
        });
        setPositions(gatherPositions);
    };

    const handleWatercooler = () => {
        setPositions({
            ...allPositions,
            alice: { x: 0, y: 5 },
            bob: { x: 1, y: 5 },
        });
    };

    return (
        <div className="flex flex-col h-screen relative overflow-hidden">
            {/* Top Demo Bar */}
            <div className="h-16 border-b border-[#1a1a1a] bg-[#0c0c0e] flex items-center justify-between px-8 z-10">
                <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-purple-600/20 border border-purple-500/30 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-xs font-black text-slate-300 uppercase tracking-widest">Demo Controls</span>
                </div>

                <div className="flex items-center space-x-2">
                    <ControlBtn icon={Monitor} label="Reset Desks" color="text-emerald-400" onClick={handleReset} />
                    <ControlBtn icon={Users} label="Gather" color="text-blue-400" onClick={handleGather} />
                    <ControlBtn icon={Waves} label="Watercooler" color="text-cyan-400" onClick={handleWatercooler} />
                </div>
            </div>

            <div className="flex flex-1 min-h-0 relative">
                {/* Main 2D Floor Plan Area */}
                <div className="flex-1 bg-black relative p-6 overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(26,26,26,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(26,26,26,0.3)_1px,transparent_1px)] bg-[size:40px_40px]" />

                    {/* The Map Container */}
                    <div className="relative w-full h-full max-w-5xl max-h-[600px] border border-[#1a1a1a] rounded-3xl bg-[#09090b] shadow-2xl overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

                        {/* Rendering Agents on the Map */}
                        <div className="relative w-full h-full p-20 grid grid-cols-6 grid-rows-6 gap-0">
                            {/* Static Desks for Anchors */}
                            {(() => {
                                const mainAgent = displayAgents.find(a => a.layer === 'governance' || a.role.toLowerCase().includes('orchestrat'));
                                const tronAgent = displayAgents.find(a => a.layer === 'automation' || a.role.toLowerCase().includes('auto'));
                                
                                return (
                                    <>
                                        {mainAgent && (
                                            <MapObject 
                                                x={2} y={1} type="desk" agent={mainAgent.name} 
                                                status={getAgentStatus(mainAgent.id) || "Orchestrating..."} 
                                                selected={selectedAgent === mainAgent.id} 
                                                onClick={() => setSelectedAgent(mainAgent.id)} 
                                                showAvatar={positions[mainAgent.id]?.x === 2 && positions[mainAgent.id]?.y === 1} 
                                            />
                                        )}
                                        {tronAgent && (
                                            <MapObject 
                                                x={3} y={1} type="desk" agent={tronAgent.name} 
                                                status={getAgentStatus(tronAgent.id) || "Cron"} 
                                                selected={selectedAgent === tronAgent.id} 
                                                onClick={() => setSelectedAgent(tronAgent.id)} 
                                                showAvatar={positions[tronAgent.id]?.x === 3 && positions[tronAgent.id]?.y === 1} 
                                            />
                                        )}
                                    </>
                                );
                            })()}

                            {/* Dynamic Characters */}
                            {displayAgents.map(agent => {
                                const pos = positions[agent.id];
                                if (!pos) return null;

                                // Don't render character if they are currently shown AT their desk (Governance/Automation anchors)
                                const isMain = agent.layer === 'governance' || agent.role.toLowerCase().includes('orchestrat');
                                const isTron = agent.layer === 'automation' || agent.role.toLowerCase().includes('auto');
                                
                                if (isMain && pos.x === 2 && pos.y === 1) return null;
                                if (isTron && pos.x === 3 && pos.y === 1) return null;

                                return (
                                    <MapObject 
                                        key={agent.id}
                                        x={pos.x} y={pos.y} 
                                        type="character" 
                                        agent={agent.name} 
                                        status={getAgentStatus(agent.id)} 
                                        selected={selectedAgent === agent.id} 
                                        onClick={() => setSelectedAgent(agent.id)} 
                                    />
                                );
                            })}

                            {/* Decorations */}
                            <MapObject x={0} y={4} type="fountain" />
                            <MapObject x={5} y={4} type="plant" />
                            <MapObject x={0} y={6} type="plant" />
                            <MapObject x={1} y={6} type="terminal" />
                            <MapObject x={3} y={5} type="table" />
                        </div>
                    </div>
                </div>

                {/* Right Activity / Chat Sidebar */}
                <div className="w-80 border-l border-[#1a1a1a] bg-[#0c0c0e] flex flex-col p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                            <Activity className="w-4 h-4 text-blue-500" />
                            <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest">Live Activity</h2>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Last hour</span>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                        {agentSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center text-center space-y-4 opacity-30 h-full mt-24">
                                <Activity className="w-8 h-8 text-slate-800" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No recent activity</p>
                                <p className="text-[10px] font-medium text-slate-600">Events for {selectedAgent} will appear here.</p>
                            </div>
                        ) : (
                            agentSessions.map((session: any, i: number) => (
                                <div key={i} className="p-3 rounded-xl bg-[#131315] border border-[#1e1e20] flex flex-col gap-2 relative">
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{session.kind || 'Session'}</span>
                                        <span className="text-[9px] text-slate-500">
                                            {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString() : ''}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-300 font-medium break-all line-clamp-2" title={session.key || session.sessionId}>
                                        {session.key || session.sessionId}
                                    </div>
                                    {session.type && (
                                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                                            {session.type}
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center mt-1 pt-2 border-t border-[#1e1e20]">
                                        <div className="flex items-center space-x-1">
                                            <Code className="w-3 h-3 text-slate-500" />
                                            <span className="text-[9px] text-slate-400">{session.model || 'Unknown'}</span>
                                        </div>
                                        {session.totalTokens && (
                                            <div className="flex items-center space-x-1">
                                                <Zap className="w-3 h-3 text-emerald-500/70" />
                                                <span className="text-[9px] text-slate-400">{session.totalTokens}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Agents Bar */}
            <div className="h-48 border-t border-[#1a1a1a] bg-[#0c0c0e] p-6">
                <div className="flex space-x-4 overflow-x-auto pb-2 h-full items-center">
                    {displayAgents.map((agent) => (
                        <div
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent.id)}
                            className={cn(
                                "flex-shrink-0 w-48 h-full bg-[#101010] border rounded-2xl p-4 transition-all cursor-pointer group flex flex-col justify-between",
                                selectedAgent === agent.id ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : "border-[#1a1a1a] hover:border-slate-700",
                                agent.isLive && "border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-lg">{getAgentIcon(agent.id)}</span>
                                    <h4 className="text-xs font-black text-white">{agent.name}</h4>
                                </div>
                                {agent.isLive ? (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                ) : (
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                                )}
                            </div>

                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">
                                {agent.isLive ? 'Working...' : 'Standby'}
                            </div>

                            <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-[#1a1a1a]">
                                <Activity className={cn("w-3 h-3", agent.isLive ? "text-blue-500" : "text-slate-600")} />
                                <span className="text-[10px] font-black text-slate-400 truncate tracking-tight">{agent.role}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ControlBtn({ icon: Icon, label, color, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className="flex items-center space-x-2 bg-[#1a1a1a] px-4 py-2 rounded-xl border border-transparent hover:border-[#333] transition-all hover:scale-105 active:scale-95">
            <Icon className={cn("w-4 h-4", color)} />
            <span className="text-[11px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
        </button>
    )
}

function MapObject({ x, y, type, agent, status, selected, showAvatar = true, onClick }: any) {
    const style = {
        gridColumnStart: x + 1,
        gridRowStart: y + 1,
    };

    if (type === 'desk') {
        return (
            <div 
                style={style} 
                className={cn("relative flex flex-col items-center justify-center transition-all cursor-pointer", selected && "scale-110 z-10")}
                onClick={onClick}
            >
                {selected && <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />}
                <div className={cn("w-16 h-10 bg-[#222] border-2 rounded-sm relative shadow-lg z-10 transition-colors", selected ? "border-blue-500/50" : "border-[#333]")}>
                    <div className="absolute top-1 left-2 w-10 h-6 bg-blue-600/20 border border-blue-500/30 rounded-sm" />
                </div>
                {agent && showAvatar && (
                    <div className="absolute -top-4 flex flex-col items-center z-20">
                        {status && (
                            <div className="absolute -top-10 bg-black text-white px-3 py-1 text-[10px] font-bold rounded-lg border border-[#333] whitespace-nowrap z-20 transition-all scale-110">
                                {status}
                            </div>
                        )}
                        <span className={cn("text-2xl mt-2 transition-transform", status === 'Active' ? "animate-bounce" : (selected ? "scale-125 drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]" : ""))}>{getAgentIcon(agent)}</span>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest mt-1 bg-black/80 px-1 rounded transition-colors", selected ? "text-blue-400" : "text-slate-500")}>{agent}</span>
                    </div>
                )}
            </div>
        )
    }

    if (type === 'character') {
        return (
            <div 
                style={{
                    gridColumnStart: x + 1,
                    gridRowStart: y + 1,
                    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                className={cn("flex flex-col items-center justify-center cursor-pointer transition-all", selected && "scale-125 z-10")}
                onClick={onClick}
            >
                {selected && <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />}
                {status && (
                    <div className="absolute -top-6 bg-black text-white px-2 py-0.5 text-[9px] font-bold rounded border border-blue-900/50 whitespace-nowrap z-20 text-blue-400 transition-all scale-110">
                        {status}
                    </div>
                )}
                <span className={cn(
                    "text-2xl hover:scale-125 transition-transform drop-shadow-[0_0_10px_rgba(255,255,255,0.1)] z-10",
                    status === 'Active' && "animate-bounce drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]",
                    selected && !status && "drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                )}>{getAgentIcon(agent)}</span>
                <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] mt-1 z-10 transition-colors", selected ? "text-blue-400" : "text-slate-600")}>{agent}</span>
            </div>
        )
    }

    if (type === 'table') {
        return (
            <div style={style} className="w-24 h-16 bg-[#1a1a1a] border-4 border-[#222] rounded-[2rem] shadow-xl" />
        )
    }

    if (type === 'fountain') return <div style={style} className="w-12 h-12 rounded-full bg-blue-500/20 border-4 border-blue-400/30 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.3)]" />;
    if (type === 'plant') return <div style={style} className="w-10 h-10 bg-emerald-700/40 rounded-t-full border-b-8 border-orange-950/50" />;
    if (type === 'terminal') return <div style={style} className="w-10 h-14 bg-slate-800 rounded-lg border-b-4 border-slate-900 flex items-center justify-center"><div className="w-6 h-6 bg-black rounded p-1"><div className="w-1 h-3 bg-green-500 animate-pulse" /></div></div>;

    return null;
}


