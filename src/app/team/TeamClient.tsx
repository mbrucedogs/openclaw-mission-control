'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Agent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import {
    Activity,
    Bot,
    CheckCircle2,
    Code2,
    Cpu,
    Search,
    ShieldCheck,
    Sparkles,
    TestTube2,
    Users,
    Wrench,
    X,
    Zap,
} from 'lucide-react';
import { buildTeamRegistryModel, type TeamRegistryAgentCard, type TeamRegistryGroup } from './team-registry-model';

function renderAgentIcon(agent: Agent, className: string) {
    const role = String(agent.role || '').toLowerCase();
    const layer = String(agent.layer || '').toLowerCase();

    if (layer === 'governance' || role.includes('orchestrat') || role.includes('governance')) return <Users className={className} />;
    if (role.includes('research')) return <Search className={className} />;
    if (role.includes('implement') || role.includes('build') || role.includes('code')) return <Code2 className={className} />;
    if (role.includes('test') || role.includes('qa')) return <TestTube2 className={className} />;
    if (role.includes('review') || role.includes('security')) return <ShieldCheck className={className} />;
    if (layer === 'automation' || role.includes('auto') || role.includes('monitor') || role.includes('cron')) return <Zap className={className} />;
    return <Bot className={className} />;
}

function groupTone(groupId: TeamRegistryGroup['id']) {
    if (groupId === 'governance') return 'border-amber-500/20 bg-amber-500/[0.04] text-amber-300';
    if (groupId === 'build') return 'border-blue-500/20 bg-blue-500/[0.04] text-blue-300';
    if (groupId === 'review') return 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300';
    return 'border-violet-500/20 bg-violet-500/[0.04] text-violet-300';
}

function agentStatusTone(card: TeamRegistryAgentCard) {
    if (card.needsSetup) return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    if (card.isActive) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    return 'border-white/10 bg-white/[0.03] text-slate-400';
}

export default function TeamClient({ agents }: { agents: Agent[] }) {
    const [registryAgents, setRegistryAgents] = useState(agents);
    const [selectedAgentId, setSelectedAgentId] = useState('');
    const [savingAgentId, setSavingAgentId] = useState<string | null>(null);

    const model = useMemo(() => buildTeamRegistryModel({
        agents: registryAgents,
        selectedAgentId,
    }), [registryAgents, selectedAgentId]);

    const selectedAgent = useMemo(() => (
        registryAgents.find((agent) => agent.id === selectedAgentId) || null
    ), [registryAgents, selectedAgentId]);

    useEffect(() => {
        if (!selectedAgent) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setSelectedAgentId('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAgent]);

    const updateAgentType = async (agentId: string, nextType: string) => {
        setSavingAgentId(agentId);
        try {
            const response = await fetch('/api/agents/type', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: agentId, type: nextType }),
            });

            if (!response.ok) {
                throw new Error('Failed to update agent type');
            }

            setRegistryAgents((current) => current.map((agent) => (
                agent.id === agentId ? { ...agent, type: nextType } : agent
            )));
        } catch (error) {
            console.error('Failed to update agent type', error);
        } finally {
            setSavingAgentId(null);
        }
    };

    return (
        <div className="min-h-[100dvh] bg-[#09090b]">
            <div className="border-b border-[#1a1a1a] bg-[#09090b] px-6 py-8 md:px-12 md:py-10">
                <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                                <Users className="h-5 w-5 text-emerald-300" />
                            </div>
                            <div>
                                <h1 className="text-lg font-black uppercase tracking-[0.2em] text-white md:text-xl">Agent Registry</h1>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    Canonical roster, onboarding state, and role configuration
                                </p>
                            </div>
                        </div>
                        <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
                            Team Operations shows live work. This screen is for the structure behind it: who exists, what function they belong to,
                            and which agents still need system assignment before the organization is fully configured.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {model.summary.totalAgents} agents
                        </span>
                        {model.summary.unassignedAgents > 0 && (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                                {model.summary.unassignedAgents} need setup
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-6 pb-20 pt-6 md:px-12">
                <SummaryRail
                    totalAgents={model.summary.totalAgents}
                    configuredAgents={model.summary.configuredAgents}
                    unassignedAgents={model.summary.unassignedAgents}
                    activeAgents={model.summary.activeAgents}
                    automationAgents={model.summary.automationAgents}
                />

                {model.summary.unassignedAgents > 0 && (
                    <OnboardingBanner unassignedAgents={model.summary.unassignedAgents} />
                )}

                <div className="mt-6">
                    <RegistryBoard
                        groups={model.groups}
                        selectedAgentId={selectedAgentId}
                        onSelect={setSelectedAgentId}
                    />
                </div>
            </div>

            <AgentInspectorDrawer
                agent={selectedAgent}
                saving={savingAgentId === selectedAgent?.id}
                onClose={() => setSelectedAgentId('')}
                onTypeChange={updateAgentType}
            />
        </div>
    );
}

function SummaryRail({
    totalAgents,
    configuredAgents,
    unassignedAgents,
    activeAgents,
    automationAgents,
}: {
    totalAgents: number;
    configuredAgents: number;
    unassignedAgents: number;
    activeAgents: number;
    automationAgents: number;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard icon={Users} label="Roster Size" value={totalAgents} tone="blue" />
            <SummaryCard icon={CheckCircle2} label="Configured" value={configuredAgents} tone="emerald" />
            <SummaryCard icon={Wrench} label="Needs Setup" value={unassignedAgents} tone="amber" />
            <SummaryCard icon={Activity} label="Live Agents" value={activeAgents} tone="blue" />
            <SummaryCard icon={Zap} label="Automation" value={automationAgents} tone="violet" />
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: typeof Users;
    label: string;
    value: number;
    tone: 'blue' | 'emerald' | 'amber' | 'violet';
}) {
    const toneClasses = {
        blue: 'border-blue-500/20 bg-blue-500/[0.05] text-blue-300',
        emerald: 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300',
        amber: 'border-amber-500/20 bg-amber-500/[0.05] text-amber-200',
        violet: 'border-violet-500/20 bg-violet-500/[0.05] text-violet-300',
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

function OnboardingBanner({ unassignedAgents }: { unassignedAgents: number }) {
    return (
        <section className="mt-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/[0.05] p-5 md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <p className="text-sm font-bold text-white">Registry Setup Required</p>
                    </div>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
                        {unassignedAgents} agent{unassignedAgents === 1 ? '' : 's'} still need a system type. Until those assignments are finished,
                        workflow routing and reporting will stay partially incomplete.
                    </p>
                </div>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                    Select an agent to configure
                </span>
            </div>
        </section>
    );
}

function RegistryBoard({
    groups,
    selectedAgentId,
    onSelect,
}: {
    groups: TeamRegistryGroup[];
    selectedAgentId: string;
    onSelect: (agentId: string) => void;
}) {
    return (
        <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5 md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-emerald-300" />
                        <p className="text-sm font-bold text-white">Registry Board</p>
                    </div>
                    <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">
                        Agents are grouped by function, with setup gaps called out directly on the roster instead of hidden behind a modal flow.
                    </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Function-aligned roster
                </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {groups.map((group) => (
                    <div key={group.id} className="rounded-3xl border border-[#1a1a1a] bg-black/60 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]', groupTone(group.id))}>
                                    {group.label}
                                </p>
                                <p className="mt-3 text-xs leading-relaxed text-slate-500">{group.description}</p>
                            </div>
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                {group.agents.length}
                            </span>
                        </div>

                        <div className="mt-4 space-y-3">
                            {group.agents.map((card) => (
                                <AgentCard
                                    key={card.agent.id}
                                    card={card}
                                    selected={selectedAgentId === card.agent.id}
                                    onSelect={() => onSelect(card.agent.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function AgentCard({
    card,
    selected,
    onSelect,
}: {
    card: TeamRegistryAgentCard;
    selected: boolean;
    onSelect: () => void;
}) {
    return (
        <button
            onClick={onSelect}
            className={cn(
                'w-full rounded-2xl border p-4 text-left transition-all',
                selected ? 'border-emerald-400/30 bg-emerald-500/10' : 'border-[#202020] bg-[#101012] hover:border-slate-600',
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black text-white">
                        {renderAgentIcon(card.agent, 'h-4 w-4')}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">{card.agent.name}</p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{card.agent.role}</p>
                    </div>
                </div>
                <span className={cn('rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.18em]', agentStatusTone(card))}>
                    {card.needsSetup ? 'needs setup' : (card.isActive ? 'active' : 'ready')}
                </span>
            </div>

            <p className="mt-4 line-clamp-2 text-xs leading-relaxed text-slate-500">
                {card.agent.mission || 'No mission statement recorded.'}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
                {card.agent.type && (
                    <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        {card.agent.type}
                    </span>
                )}
                {card.agent.folder && (
                    <span className="rounded-full border border-white/10 bg-black px-2 py-1 text-[10px] font-bold text-slate-500">
                        {card.agent.folder}
                    </span>
                )}
            </div>
        </button>
    );
}

function AgentInspectorDrawer({
    agent,
    saving,
    onClose,
    onTypeChange,
}: {
    agent: Agent | null;
    saving: boolean;
    onClose: () => void;
    onTypeChange: (agentId: string, nextType: string) => Promise<void>;
}) {
    if (!agent) return null;

    return (
        <div className="fixed inset-0 z-50">
            <button
                aria-label="Close agent inspector"
                className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                onClick={onClose}
            />
            <aside className="absolute inset-y-0 right-0 w-full max-w-[440px] overflow-y-auto border-l border-[#1a1a1a] bg-[#0c0c0e] p-5 shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0a0a0c] p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Agent Details</p>
                        <p className="mt-1 text-sm font-bold text-white">Registry Inspector</p>
                    </div>
                    <button
                        aria-label="Close agent inspector"
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/60 text-slate-400 transition-colors hover:border-slate-600 hover:text-white"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black text-white">
                        {renderAgentIcon(agent, 'h-5 w-5')}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected Agent</p>
                        <h2 className="mt-1 truncate text-xl font-black text-white">{agent.name}</h2>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">{agent.role}</p>
                    </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InspectorMetric label="Layer" value={agent.layer || 'unassigned'} />
                    <InspectorMetric label="Status" value={agent.status || 'idle'} />
                </div>

                <Link
                    href={`/team/${agent.id}`}
                    className="mt-4 inline-flex items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/20"
                >
                    Open Detail Page
                </Link>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/60 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">System Type</p>
                    <select
                        value={agent.type || ''}
                        disabled={saving}
                        onChange={(event) => {
                            const nextType = event.target.value;
                            if (nextType) {
                                void onTypeChange(agent.id, nextType);
                            }
                        }}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-sm font-bold uppercase tracking-[0.12em] text-white outline-none transition-colors hover:border-slate-600 disabled:opacity-60"
                    >
                        <option value="">Select role...</option>
                        <option value="orchestrator">Orchestrator</option>
                        <option value="researcher">Researcher</option>
                        <option value="builder">Builder</option>
                        <option value="tester">Tester</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="automation">Automation</option>
                    </select>
                    <p className="mt-3 text-xs text-slate-500">
                        {saving ? 'Saving role assignment...' : 'This setting controls workflow routing and assignable task roles.'}
                    </p>
                </div>
            </section>

            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-300" />
                    <p className="text-sm font-bold text-white">Mission</p>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    {agent.mission || 'No mission statement recorded yet.'}
                </p>
            </section>

            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-300" />
                    <p className="text-sm font-bold text-white">Definition</p>
                </div>
                <div className="mt-4">
                    {agent.soulContent ? (
                        <div className="prose prose-invert prose-slate max-w-none rounded-2xl border border-[#202020] bg-black/70 p-5">
                            <MarkdownRenderer content={agent.soulContent} />
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-slate-600">
                            No long-form system definition recorded.
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-[2rem] border border-[#1a1a1a] bg-[#0c0c0e] p-5">
                <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-violet-300" />
                    <p className="text-sm font-bold text-white">Responsibilities</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                    {(agent.responsibilities || []).length > 0 ? (
                        agent.responsibilities?.map((responsibility) => (
                            <span key={responsibility} className="rounded-full border border-blue-500/15 bg-blue-500/[0.05] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200">
                                {responsibility}
                            </span>
                        ))
                    ) : (
                        <p className="text-xs text-slate-600">No responsibility tags recorded.</p>
                    )}
                </div>
            </section>
            </aside>
        </div>
    );
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-black/60 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.12em] text-white">{value}</p>
        </div>
    );
}
