'use client';

import Link from 'next/link';
import {
    Activity,
    AlertTriangle,
    Clock3,
    LayoutGrid,
    Monitor,
    Sparkles,
    Users,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildRuntimeEventsStreamPath } from '@/lib/runtime-events';
import { isPresenceFresh } from '@/lib/agent-presence';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    buildTeamOperationsModel,
    type TeamOperationsAgent,
    type TeamOperationsAgentCard,
    type TeamOperationsGroup,
    type TeamOperationsSession,
    type TeamOperationsTask,
    type TeamOperationsWorkItem,
    type TeamOperationsZone,
} from './team-operations-model';

type AgentSummary = TeamOperationsAgent;

type OfficeTask = TeamOperationsTask & {
    owner?: string;
    currentRun?: {
        currentStepId?: string;
        steps?: Array<{
            id: string;
            stepNumber: number;
            title: string;
            role: string;
            assignedAgentId?: string;
            assignedAgentName?: string;
            status: string;
            goal?: string;
        }>;
    };
    stagePlan?: Array<{
        id: string;
        stepNumber: number;
        title: string;
        role: string;
        assignedAgentId?: string;
        assignedAgentName?: string;
        goal?: string;
    }>;
    issues?: Array<{
        id: string;
        status: string;
        assignedTo: string;
    }>;
};

type LiveSession = TeamOperationsSession;

type SSERuntimeEvent = {
    id: string;
    type: string;
    actor: string;
    payload: Record<string, unknown>;
    cursor: number;
    createdAt: string;
};

function useSSERuntimeEvents(onEvent?: (event: SSERuntimeEvent) => void) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const connectRef = useRef<() => void>(() => {});
    const lastEventIdRef = useRef<number>(0);
    const [sseIsConnected, setSseIsConnected] = useState(false);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(buildRuntimeEventsStreamPath(lastEventIdRef.current));
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setSseIsConnected(true);
        };

        eventSource.addEventListener('connection', (event) => {
            try {
                const data = JSON.parse(event.data);
                lastEventIdRef.current = data.cursor ?? 0;
            } catch {
                // Ignore parse errors from connection payloads.
            }
        });

        eventSource.addEventListener('event', (event) => {
            try {
                const data = JSON.parse(event.data) as SSERuntimeEvent;
                if (data.cursor) {
                    lastEventIdRef.current = data.cursor;
                }
                onEvent?.(data);
            } catch {
                // Ignore malformed event payloads.
            }
        });

        eventSource.onerror = () => {
            setSseIsConnected(false);
            eventSource.close();

            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }

            reconnectTimeoutRef.current = setTimeout(() => {
                connectRef.current();
            }, 5000);
        };
    }, [onEvent]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [connect]);

    return { sseIsConnected };
}

function sessionUpdatedAt(session: LiveSession) {
    if (typeof session.updatedAt === 'number') return session.updatedAt;
    if (typeof session.updatedAt === 'string') {
        const value = new Date(session.updatedAt).getTime();
        return Number.isNaN(value) ? 0 : value;
    }
    return 0;
}

function uniquePresenceKey(session: LiveSession) {
    if (session.key) return session.key;
    if (session.sessionId) return session.sessionId;
    if (session.agentId && session.kind?.startsWith('activity:')) return `activity:${session.agentId}`;
    return `${session.agentId || session.label || 'unknown'}:${session.kind || 'presence'}`;
}

function mergePresenceSignals(incoming: LiveSession[]) {
    const unique = new Map<string, LiveSession>();

    incoming
        .filter((session) => isPresenceFresh(session))
        .sort((left, right) => sessionUpdatedAt(right) - sessionUpdatedAt(left))
        .forEach((session) => {
            unique.set(uniquePresenceKey(session), session);
        });

    return [...unique.values()];
}

function getAgentIcon(agentOrId?: string | Partial<AgentSummary>) {
    const id = (typeof agentOrId === 'string' ? agentOrId : agentOrId?.id || '').toLowerCase();
    const role = (typeof agentOrId === 'string' ? '' : agentOrId?.role || '').toLowerCase();

    if (role.includes('orchestrat') || role.includes('governance')) return 'O';
    if (role.includes('research') || role.includes('intelligence')) return 'R';
    if (role.includes('implement') || role.includes('code') || role.includes('builder')) return 'B';
    if (role.includes('test') || role.includes('qa')) return 'Q';
    if (role.includes('review') || role.includes('security')) return 'V';
    if (role.includes('auto') || role.includes('cron') || role.includes('monitor') || id.includes('heartbeat')) return 'A';
    return 'T';
}

function isOrchestratorAgent(agent?: Partial<AgentSummary>) {
    const role = String(agent?.role || '').toLowerCase();
    const layer = String(agent?.layer || '').toLowerCase();
    return layer === 'governance' || role.includes('orchestrat') || role.includes('governance');
}

function getActiveTaskAssignment(task: OfficeTask) {
    const currentStep = task.currentRun?.steps?.find((step) => step.id === task.currentRun?.currentStepId)
        || task.currentRun?.steps?.find((step) => ['ready', 'running', 'submitted', 'blocked'].includes(step.status));

    if (currentStep) {
        return {
            assignedAgentId: currentStep.assignedAgentId,
            assignedAgentName: currentStep.assignedAgentName,
            title: currentStep.title,
            status: currentStep.status,
        };
    }

    const plannedStep = task.stagePlan?.[0];
    if (plannedStep) {
        return {
            assignedAgentId: plannedStep.assignedAgentId,
            assignedAgentName: plannedStep.assignedAgentName,
            title: plannedStep.title,
            status: task.status === 'Backlog' ? 'planned' : task.status,
        };
    }

    return null;
}

function taskNeedsOrchestrator(task: OfficeTask) {
    if (task.status === 'Blocked' || task.status === 'In Review') return true;
    if (task.currentRun?.steps?.some((step) => step.status === 'submitted' || step.status === 'blocked')) return true;
    if (task.issues?.some((issue) => issue.assignedTo === 'orchestrator' && issue.status !== 'resolved')) return true;
    return false;
}

function deriveTaskWorkItem(task: OfficeTask): TeamOperationsWorkItem | null {
    if (task.status === 'Done') return null;

    const assignment = getActiveTaskAssignment(task);
    let state: TeamOperationsWorkItem['state'] = 'planned';

    if (task.status === 'Blocked' || assignment?.status === 'blocked') {
        state = 'blocked';
    } else if (task.status === 'In Review' || assignment?.status === 'submitted') {
        state = 'review';
    } else if (task.status === 'In Progress' || assignment?.status === 'running' || assignment?.status === 'ready') {
        state = 'active';
    }

    return {
        id: task.id,
        title: task.title,
        summary: task.goal || task.description,
        state,
        agentId: assignment?.assignedAgentId,
        agentName: assignment?.assignedAgentName,
        stepTitle: assignment?.title,
        statusLabel: assignment?.status || task.status,
        needsAttention: taskNeedsOrchestrator(task),
    };
}

function statusTone(state: TeamOperationsAgentCard['workState']) {
    if (state === 'active') return 'border-blue-500/40 bg-blue-500/10 text-blue-200';
    if (state === 'blocked') return 'border-red-500/40 bg-red-500/10 text-red-200';
    if (state === 'assigned') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
    return 'border-white/10 bg-white/[0.03] text-slate-400';
}

function zoneTone(tone: string) {
    if (tone === 'amber') return 'border-amber-500/25 bg-amber-500/[0.04]';
    if (tone === 'blue') return 'border-blue-500/25 bg-blue-500/[0.04]';
    if (tone === 'emerald') return 'border-emerald-500/25 bg-emerald-500/[0.04]';
    if (tone === 'violet') return 'border-violet-500/25 bg-violet-500/[0.04]';
    return 'border-white/10 bg-white/[0.03]';
}

function laneAccent(groupId: TeamOperationsGroup['id']) {
    if (groupId === 'governance') return 'text-amber-400';
    if (groupId === 'build') return 'text-blue-400';
    if (groupId === 'review') return 'text-emerald-400';
    return 'text-violet-400';
}

export function OfficeClient({ agents }: { agents: AgentSummary[] }) {
    const [selectedAgent, setSelectedAgent] = useState(() => {
        const orchestrator = agents.find((agent) => isOrchestratorAgent(agent));
        return orchestrator?.id || agents[0]?.id || '';
    });
    const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
    const [agentTasks, setAgentTasks] = useState<Record<string, OfficeTask[]>>({});
    const [allTasks, setAllTasks] = useState<OfficeTask[]>([]);
    const [sseConnected, setSseConnected] = useState(false);

    const refreshLiveAgentStatus = useCallback(async () => {
        const nextSignals: LiveSession[] = [];

        try {
            const activityResponse = await fetch('/api/activity/agents');
            if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                nextSignals.push(...(activityData.agents || []).map((agent: {
                    agentId?: string;
                    agentName?: string;
                    lastSeen?: string;
                    status?: string;
                    stepTitle?: string;
                    taskTitle?: string;
                }) => ({
                    agentId: agent.agentId,
                    label: agent.agentName,
                    updatedAt: agent.lastSeen,
                    kind: `activity:${agent.status || 'unknown'}`,
                    key: `${agent.stepTitle || agent.agentId} @ ${agent.taskTitle || 'no task'}`,
                })));
            }
        } catch (error) {
            console.error('Failed to fetch activity agents', error);
        }

        try {
            const sessionsResponse = await fetch('/api/sessions');
            if (sessionsResponse.ok) {
                const sessionsData = await sessionsResponse.json();
                nextSignals.push(...(sessionsData.sessions || []));
            }
        } catch (error) {
            console.error('Failed to fetch live sessions', error);
        }

        setLiveSessions(mergePresenceSignals(nextSignals));
    }, []);

    const handleRuntimeEvent = useCallback((event: SSERuntimeEvent) => {
        if (event.type.startsWith('openclaw.')) {
            void refreshLiveAgentStatus();
        }
    }, [refreshLiveAgentStatus]);

    const { sseIsConnected } = useSSERuntimeEvents(handleRuntimeEvent);

    useEffect(() => {
        setSseConnected(sseIsConnected);
    }, [sseIsConnected]);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const response = await fetch('/api/tasks?include=currentRun,plan,issues');
                if (!response.ok) return;

                const tasks = await response.json();
                setAllTasks(tasks as OfficeTask[]);
                const tasksByAgent: Record<string, OfficeTask[]> = {};
                (tasks as OfficeTask[]).forEach((task) => {
                    const assignment = getActiveTaskAssignment(task);

                    if (assignment?.assignedAgentId) {
                        if (!tasksByAgent[assignment.assignedAgentId]) tasksByAgent[assignment.assignedAgentId] = [];
                        tasksByAgent[assignment.assignedAgentId].push(task);
                    }

                    if (assignment?.assignedAgentName) {
                        if (!tasksByAgent[assignment.assignedAgentName]) tasksByAgent[assignment.assignedAgentName] = [];
                        tasksByAgent[assignment.assignedAgentName].push(task);
                    }

                    if (taskNeedsOrchestrator(task)) {
                        if (!tasksByAgent.orchestrator) tasksByAgent.orchestrator = [];
                        tasksByAgent.orchestrator.push(task);
                    }
                });
                setAgentTasks(tasksByAgent);
            } catch (error) {
                console.error('Failed to fetch tasks', error);
            }
        };

        void fetchTasks();
        const interval = setInterval(() => {
            void fetchTasks();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        void refreshLiveAgentStatus();
        const interval = setInterval(() => {
            void refreshLiveAgentStatus();
        }, 15000);
        return () => clearInterval(interval);
    }, [refreshLiveAgentStatus]);

    const displayAgents = useMemo(() => (
        agents.map((agent) => {
            const session = liveSessions.find((liveSession) => (
                (
                    liveSession.agentId === agent.id ||
                    String(liveSession.label || '').toLowerCase().includes(agent.id.toLowerCase())
                ) && isPresenceFresh(liveSession)
            ));

            const isLive = Boolean(session);
            return {
                ...agent,
                isLive,
                liveStatus: isLive ? 'Active' : agent.status,
            };
        })
    ), [agents, liveSessions]);

    const workItems = useMemo(() => (
        allTasks
            .map((task) => deriveTaskWorkItem(task))
            .filter((item): item is TeamOperationsWorkItem => Boolean(item))
    ), [allTasks]);

    useEffect(() => {
        if (!displayAgents.find((agent) => agent.id === selectedAgent)) {
            setSelectedAgent(displayAgents[0]?.id || '');
        }
    }, [displayAgents, selectedAgent]);

    const model = useMemo(() => buildTeamOperationsModel({
        agents: displayAgents,
        tasksByAgent: agentTasks,
        liveSessions,
        workItems,
        selectedAgentId: selectedAgent,
    }), [agentTasks, displayAgents, liveSessions, selectedAgent, workItems]);

    const selectedAgentData = model.selected?.agent || displayAgents[0];
    const selectedAgentTasks = selectedAgentData
        ? [
            ...(agentTasks[selectedAgentData.name] || []),
            ...(agentTasks[selectedAgentData.id] || []),
            ...(isOrchestratorAgent(selectedAgentData) ? (agentTasks.orchestrator || []) : []),
        ].filter((task, index, collection) => collection.findIndex((candidate) => candidate.id === task.id) === index)
        : [];

    const agentSessions = useMemo(() => (
        liveSessions
            .filter((session) => (
                session.agentId === selectedAgent ||
                String(session.label || '').toLowerCase().includes(selectedAgent.toLowerCase())
            ))
            .sort((left, right) => sessionUpdatedAt(right) - sessionUpdatedAt(left))
            .slice(0, 30)
    ), [liveSessions, selectedAgent]);

    return (
        <div className="relative flex h-[100dvh] min-h-0 flex-col overflow-hidden">
            <div className="shrink-0 border-b border-[#1a1a1a] bg-[#09090b] px-6 py-8 md:px-12 md:py-10">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.08)]">
                                <Monitor className="h-5 w-5 text-cyan-300" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white md:text-xl">Team Operations</h1>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    Live collaboration, active work, and agent visibility
                                </p>
                            </div>
                        </div>
                        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                            This is the operational view of the team. Lanes show who is working, who is blocked, and where load is accumulating.
                            The desktop live scene mirrors the same state without becoming the primary source of truth.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className={cn(
                            'rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]',
                            sseConnected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/[0.03] text-slate-400',
                        )}>
                            {sseConnected ? 'Live Runtime' : 'Polling Runtime'}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {model.summary.totalAgents} Agents
                        </span>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-20 pt-6 md:px-12">
                <SummaryRail
                    activeAgents={model.summary.activeAgents}
                    activeWorkItems={model.summary.activeWorkItems}
                    reviewLoad={model.summary.reviewLoad}
                    blockedWorkItems={model.summary.blockedWorkItems}
                    liveSessions={model.summary.liveSessions}
                    handoffPressure={model.summary.handoffPressure}
                />

                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_360px]">
                    <div className="space-y-6">
                        <WorkstreamBoard
                            workstreams={model.workstreams}
                            onSelectAgent={setSelectedAgent}
                        />
                        <LiveScene
                            zones={model.sceneZones}
                            selectedAgentId={selectedAgent}
                            onSelect={setSelectedAgent}
                        />
                        <OperationsBoard
                            groups={model.groups}
                            selectedAgentId={selectedAgent}
                            onSelect={setSelectedAgent}
                        />
                    </div>

                    <div className="space-y-6">
                        <AgentInspector
                            selectedAgent={selectedAgentData}
                            selectedCard={model.selected}
                            tasks={selectedAgentTasks}
                            sessions={agentSessions}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function SummaryRail(props: {
    activeAgents: number;
    activeWorkItems: number;
    reviewLoad: number;
    blockedWorkItems: number;
    liveSessions: number;
    handoffPressure: number;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard icon={Zap} label="Active Agents" value={props.activeAgents} tone="blue" />
            <SummaryCard icon={LayoutGrid} label="Active Work" value={props.activeWorkItems} tone="amber" />
            <SummaryCard icon={Users} label="Review Load" value={props.reviewLoad} tone="emerald" />
            <SummaryCard icon={AlertTriangle} label="Blocked Items" value={props.blockedWorkItems} tone="red" />
            <SummaryCard icon={Activity} label="Live Sessions" value={props.liveSessions} tone="emerald" />
            <SummaryCard icon={Sparkles} label="Handoff Pressure" value={props.handoffPressure} tone="blue" />
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Activity;
    label: string;
    value: number;
    tone: 'blue' | 'red' | 'amber' | 'emerald';
}) {
    const toneClasses = {
        blue: 'border-blue-500/20 bg-blue-500/[0.05] text-blue-300',
        red: 'border-red-500/20 bg-red-500/[0.05] text-red-300',
        amber: 'border-amber-500/20 bg-amber-500/[0.05] text-amber-200',
        emerald: 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300',
    }[tone];

    return (
        <div className="rounded-3xl border border-[#1a1a1a] bg-[#0c0c0e] p-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p>
                </div>
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-2xl border', toneClasses)}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

function OperationsBoard({
    groups,
    selectedAgentId,
    onSelect,
}: {
    groups: TeamOperationsGroup[];
    selectedAgentId: string;
    onSelect: (agentId: string) => void;
}) {
    return (
        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-cyan-300" />
                        <p className="text-sm font-bold text-white">Operations Board</p>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                        The board groups the team by function so you can see load, activity, and blockers without decoding a map.
                    </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Function-aligned lanes
                </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {groups.map((group) => (
                    <div key={group.id} className="rounded-3xl border border-[#1a1a1a] bg-black/60 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className={cn('text-[10px] font-black uppercase tracking-[0.18em]', laneAccent(group.id))}>
                                    {group.label}
                                </p>
                                <p className="mt-2 text-xs leading-relaxed text-slate-500">{group.description}</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                {group.agents.length}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {group.agents.map((card) => (
                                <button
                                    key={card.agent.id}
                                    onClick={() => onSelect(card.agent.id)}
                                    className={cn(
                                        'w-full rounded-2xl border p-4 text-left transition-all',
                                        selectedAgentId === card.agent.id ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-[#202020] bg-[#101012] hover:border-slate-600',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black text-sm font-black text-white">
                                                {getAgentIcon(card.agent)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{card.agent.name}</p>
                                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{card.agent.role}</p>
                                            </div>
                                        </div>
                                        <span className={cn('rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]', statusTone(card.workState))}>
                                            {card.workState}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            {card.assignedCount} assigned
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                            {card.liveSessionCount} live sessions
                                        </span>
                                    </div>

                                    {card.taskTitles.length > 0 ? (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {card.taskTitles.slice(0, 2).map((title) => (
                                                <span key={title} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-100">
                                                    {title}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-4 text-xs text-slate-600">No active assignments in this lane.</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function workstreamTone(id: string) {
    if (id === 'active') return 'border-blue-500/20 bg-blue-500/[0.04]';
    if (id === 'review') return 'border-emerald-500/20 bg-emerald-500/[0.04]';
    if (id === 'blocked') return 'border-red-500/20 bg-red-500/[0.04]';
    return 'border-white/10 bg-white/[0.03]';
}

function WorkstreamBoard({
    workstreams,
    onSelectAgent,
}: {
    workstreams: Array<{
        id: string;
        label: string;
        description: string;
        items: TeamOperationsWorkItem[];
    }>;
    onSelectAgent: (agentId: string) => void;
}) {
    return (
        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-cyan-300" />
                        <p className="text-sm font-bold text-white">Workstream Flow</p>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                        This is the active work picture: what is moving, what is waiting on review, and what is blocked hard enough to need intervention.
                    </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Task-state view
                </span>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-4">
                {workstreams.map((stream) => (
                    <div key={stream.id} className={cn('rounded-3xl border p-4', workstreamTone(stream.id))}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">{stream.label}</p>
                                <p className="mt-2 text-xs leading-relaxed text-slate-500">{stream.description}</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                {stream.items.length}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {stream.items.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-600">
                                    No tasks in this lane.
                                </div>
                            ) : (
                                stream.items.slice(0, 4).map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => item.agentId && onSelectAgent(item.agentId)}
                                        className={cn(
                                            'w-full rounded-2xl border border-[#202020] bg-black/70 p-4 text-left',
                                            item.agentId ? 'transition-colors hover:border-slate-600' : 'cursor-default',
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-sm font-bold text-white">{item.title}</p>
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                                {item.statusLabel || item.state}
                                            </span>
                                        </div>
                                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                            {item.summary || 'No task summary available.'}
                                        </p>
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {item.stepTitle && (
                                                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                                                    {item.stepTitle}
                                                </span>
                                            )}
                                            {(item.agentName || item.agentId) && (
                                                <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                                    {item.agentName || item.agentId}
                                                </span>
                                            )}
                                            {item.needsAttention && (
                                                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-200">
                                                    attention
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function LiveScene({
    zones,
    selectedAgentId,
    onSelect,
}: {
    zones: TeamOperationsZone[];
    selectedAgentId: string;
    onSelect: (agentId: string) => void;
}) {
    return (
        <section className="hidden rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5 md:p-6 xl:block">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-cyan-300" />
                        <p className="text-sm font-bold text-white">Live Scene</p>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                        Desktop-only 2D stage. Agents are seated by zone and state, not arbitrary coordinates, so the scene stays readable as the team grows.
                    </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    deterministic seats
                </span>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {zones.map((zone) => (
                    <div key={zone.id} className={cn('rounded-[1.75rem] border p-4', zoneTone(zone.tone))}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white">{zone.label}</p>
                                <p className="mt-2 text-xs text-slate-500">{zone.seats.length} seats occupied</p>
                            </div>
                            <div className="rounded-full border border-white/10 bg-black/50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                zone
                            </div>
                        </div>

                        <div className="mt-4 grid min-h-40 gap-3 sm:grid-cols-2">
                            {zone.seats.map((seat) => (
                                <button
                                    key={seat.slotId}
                                    onClick={() => onSelect(seat.card.agent.id)}
                                    className={cn(
                                        'relative rounded-2xl border border-white/10 bg-black/60 p-3 text-left transition-all',
                                        selectedAgentId === seat.card.agent.id ? 'scale-[1.02] border-cyan-400/40 shadow-[0_0_30px_rgba(34,211,238,0.08)]' : 'hover:border-white/20',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                'flex h-9 w-9 items-center justify-center rounded-2xl border text-sm font-black transition-transform',
                                                seat.card.workState === 'active' ? 'border-blue-400/40 bg-blue-500/10 text-blue-100 animate-pulse' : 'border-white/10 bg-white/[0.04] text-white',
                                            )}>
                                                {getAgentIcon(seat.card.agent)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{seat.card.agent.name}</p>
                                                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                                    {seat.card.workState}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            'mt-1 h-2.5 w-2.5 rounded-full',
                                            seat.card.workState === 'active' ? 'bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)]' :
                                            seat.card.workState === 'blocked' ? 'bg-red-400' :
                                            seat.card.workState === 'assigned' ? 'bg-amber-300' :
                                            'bg-slate-700',
                                        )} />
                                    </div>

                                    <div className="mt-3 h-8 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.05] to-transparent" />
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AgentInspector({
    selectedAgent,
    selectedCard,
    tasks,
    sessions,
}: {
    selectedAgent?: TeamOperationsAgent;
    selectedCard: TeamOperationsAgentCard | null;
    tasks: OfficeTask[];
    sessions: LiveSession[];
}) {
    if (!selectedAgent || !selectedCard) {
        return (
            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <p className="text-sm text-slate-500">No agent selected.</p>
            </section>
        );
    }

    return (
        <>
            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black text-lg font-black text-white">
                            {getAgentIcon(selectedAgent)}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected Agent</p>
                            <h2 className="mt-1 text-xl font-black text-white">{selectedAgent.name}</h2>
                            <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{selectedAgent.role}</p>
                        </div>
                    </div>
                    <span className={cn('rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]', statusTone(selectedCard.workState))}>
                        {selectedCard.workState}
                    </span>
                </div>

                {selectedAgent.mission && (
                    <p className="mt-4 text-sm leading-relaxed text-slate-400">{selectedAgent.mission}</p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InspectorMetric icon={LayoutGrid} label="Assigned" value={selectedCard.assignedCount} />
                    <InspectorMetric icon={Activity} label="Live Sessions" value={selectedCard.liveSessionCount} />
                </div>

                <Link
                    href={`/team/${selectedAgent.id}`}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/20"
                >
                    Open Agent Detail
                </Link>
            </section>

            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 text-amber-300" />
                        <p className="text-sm font-bold text-white">Assigned Work</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{tasks.length}</span>
                </div>
                <div className="mt-4 space-y-3">
                    {tasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-600">
                            No active assignments for this agent.
                        </div>
                    ) : (
                        tasks.map((task) => {
                            const assignment = getActiveTaskAssignment(task);
                            return (
                                <div key={task.id} className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-bold text-white">{task.title}</p>
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                                            {task.status}
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                        {task.goal || task.description || 'No task summary available.'}
                                    </p>
                                    {assignment && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                                                {assignment.title}
                                            </span>
                                            <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                                {assignment.status}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Clock3 className="h-4 w-4 text-blue-300" />
                        <p className="text-sm font-bold text-white">Recent Sessions</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Live</span>
                </div>
                <div className="mt-4 space-y-3">
                    {sessions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-600">
                            No recent session activity for this agent.
                        </div>
                    ) : (
                        sessions.map((session, index) => (
                            <div key={`${session.sessionId || session.key || index}`} className="rounded-2xl border border-[#202020] bg-black/70 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">
                                        {session.kind || 'Session'}
                                    </p>
                                    <span className="text-[10px] text-slate-500">
                                        {session.updatedAt ? new Date(session.updatedAt).toLocaleTimeString() : ''}
                                    </span>
                                </div>
                                <p className="mt-2 break-all text-sm text-slate-300">{session.key || session.sessionId}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {session.model && (
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                            {session.model}
                                        </span>
                                    )}
                                    {session.totalTokens && (
                                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                            {session.totalTokens} tokens
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </>
    );
}

function InspectorMetric({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof Activity;
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <Icon className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <p className="mt-2 text-xl font-black text-white">{value}</p>
        </div>
    );
}
