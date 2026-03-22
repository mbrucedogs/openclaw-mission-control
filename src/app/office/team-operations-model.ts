export type TeamOperationsAgent = {
  id: string;
  name: string;
  role: string;
  layer?: string;
  mission?: string;
  status?: string;
  isLive?: boolean;
  liveStatus?: string;
};

export type TeamOperationsTask = {
  id: string;
  title: string;
  goal?: string;
  description?: string;
  status: string;
};

export type TeamOperationsSession = {
  agentId?: string;
  label?: string;
  updatedAt?: number | string;
  kind?: string;
  key?: string;
  sessionId?: string;
  type?: string;
  model?: string;
  totalTokens?: number;
};

import { hasFreshPresence } from '@/lib/agent-presence';
import {
  AGENT_GROUP_META,
  classifyAgentGroup,
  type AgentGroupId,
} from '@/lib/agent-groups';

export type AgentWorkState = 'active' | 'blocked' | 'assigned' | 'idle';
export type TeamOperationsGroupId = AgentGroupId;
export type TeamOperationsWorkState = 'active' | 'review' | 'blocked' | 'planned';

export type TeamOperationsAgentCard = {
  agent: TeamOperationsAgent;
  group: TeamOperationsGroupId;
  workState: AgentWorkState;
  assignedCount: number;
  liveSessionCount: number;
  taskTitles: string[];
};

export type TeamOperationsGroup = {
  id: TeamOperationsGroupId;
  label: string;
  description: string;
  agents: TeamOperationsAgentCard[];
};

export type TeamOperationsZone = {
  id: TeamOperationsGroupId;
  label: string;
  tone: string;
  seats: Array<{
    slotId: string;
    card: TeamOperationsAgentCard;
  }>;
};

export type TeamOperationsWorkItem = {
  id: string;
  title: string;
  summary?: string;
  state: TeamOperationsWorkState;
  agentId?: string;
  agentName?: string;
  stepTitle?: string;
  statusLabel?: string;
  group?: TeamOperationsGroupId;
  needsAttention?: boolean;
};

export type TeamOperationsWorkstream = {
  id: TeamOperationsWorkState;
  label: string;
  description: string;
  items: TeamOperationsWorkItem[];
};

export type TeamOperationsModel = {
  summary: {
    totalAgents: number;
    activeAgents: number;
    assignedAgents: number;
    blockedAgents: number;
    liveSessions: number;
    activeWorkItems: number;
    reviewLoad: number;
    blockedWorkItems: number;
    handoffPressure: number;
  };
  groups: TeamOperationsGroup[];
  sceneZones: TeamOperationsZone[];
  workstreams: TeamOperationsWorkstream[];
  selected: TeamOperationsAgentCard | null;
};

const GROUP_META = AGENT_GROUP_META;

const WORKSTREAM_META: Record<TeamOperationsWorkState, { label: string; description: string }> = {
  active: {
    label: 'Active Work',
    description: 'Tasks currently moving through implementation or execution',
  },
  review: {
    label: 'Review Queue',
    description: 'Tasks waiting on validation, approval, or handoff acceptance',
  },
  blocked: {
    label: 'Blocked',
    description: 'Tasks that need intervention before they can move again',
  },
  planned: {
    label: 'Planned',
    description: 'Queued work that is ready to be picked up next',
  },
};

function normalize(value: string | undefined): string {
  return String(value || '').toLowerCase();
}

function getAgentTaskList(
  agent: TeamOperationsAgent,
  tasksByAgent: Record<string, TeamOperationsTask[]>,
): TeamOperationsTask[] {
  const byId = tasksByAgent[agent.id] || [];
  const byName = tasksByAgent[agent.name] || [];
  const combined = [...byId, ...byName];

  return combined.filter((task, index, collection) => (
    collection.findIndex((candidate) => candidate.id === task.id) === index
  ));
}

function getLiveSessionsForAgent(
  agent: TeamOperationsAgent,
  liveSessions: TeamOperationsSession[],
): TeamOperationsSession[] {
  const agentId = normalize(agent.id);
  return liveSessions.filter((session) => {
    const sessionAgentId = normalize(session.agentId);
    const sessionLabel = normalize(session.label);
    return sessionAgentId === agentId || sessionLabel.includes(agentId);
  });
}

export function deriveAgentWorkState(
  agent: TeamOperationsAgent,
  tasks: TeamOperationsTask[],
  sessions: TeamOperationsSession[],
): AgentWorkState {
  if (hasFreshPresence(sessions) || agent.isLive) return 'active';
  if (tasks.some((task) => task.status === 'Blocked' || task.status === 'In Review')) return 'blocked';
  if (tasks.length > 0) return 'assigned';
  return 'idle';
}

function sortCards(cards: TeamOperationsAgentCard[]): TeamOperationsAgentCard[] {
  const rank: Record<AgentWorkState, number> = {
    active: 0,
    blocked: 1,
    assigned: 2,
    idle: 3,
  };

  return [...cards].sort((left, right) => {
    const rankDiff = rank[left.workState] - rank[right.workState];
    if (rankDiff !== 0) return rankDiff;
    return left.agent.name.localeCompare(right.agent.name);
  });
}

function sortWorkItems(items: TeamOperationsWorkItem[]): TeamOperationsWorkItem[] {
  return [...items].sort((left, right) => {
    const attentionDiff = Number(right.needsAttention) - Number(left.needsAttention);
    if (attentionDiff !== 0) return attentionDiff;
    return left.title.localeCompare(right.title);
  });
}

export function buildTeamOperationsModel(input: {
  agents: TeamOperationsAgent[];
  tasksByAgent: Record<string, TeamOperationsTask[]>;
  liveSessions: TeamOperationsSession[];
  workItems?: TeamOperationsWorkItem[];
  selectedAgentId?: string;
}): TeamOperationsModel {
  const agentLookup = new Map<string, TeamOperationsAgent>();
  input.agents.forEach((agent) => {
    agentLookup.set(normalize(agent.id), agent);
    agentLookup.set(normalize(agent.name), agent);
  });

  const cards = input.agents.map((agent) => {
    const tasks = getAgentTaskList(agent, input.tasksByAgent);
    const sessions = getLiveSessionsForAgent(agent, input.liveSessions);
    const group = classifyAgentGroup(agent);
    const workState = deriveAgentWorkState(agent, tasks, sessions);

    return {
      agent,
      group,
      workState,
      assignedCount: tasks.length,
      liveSessionCount: sessions.length,
      taskTitles: tasks.map((task) => task.title),
    } satisfies TeamOperationsAgentCard;
  });

  const groups = (Object.keys(GROUP_META) as TeamOperationsGroupId[]).map((groupId) => ({
    id: groupId,
    label: GROUP_META[groupId].label,
    description: GROUP_META[groupId].description,
    agents: sortCards(cards.filter((card) => card.group === groupId)),
  }));

  const sceneZones = groups.map((group) => ({
    id: group.id,
    label: group.label,
    tone: GROUP_META[group.id].tone,
    seats: group.agents.map((card, index) => ({
      slotId: `${group.id}-${index}`,
      card,
    })),
  }));

  const workItems = (input.workItems || []).map((item) => {
    if (item.group) return item;
    const matchedAgent = agentLookup.get(normalize(item.agentId)) || agentLookup.get(normalize(item.agentName));
    return {
      ...item,
      group: matchedAgent ? classifyAgentGroup(matchedAgent) : undefined,
    };
  });

  const workstreams = (Object.keys(WORKSTREAM_META) as TeamOperationsWorkState[]).map((state) => ({
    id: state,
    label: WORKSTREAM_META[state].label,
    description: WORKSTREAM_META[state].description,
    items: sortWorkItems(workItems.filter((item) => item.state === state)),
  }));

  const selected = cards.find((card) => card.agent.id === input.selectedAgentId) ?? cards[0] ?? null;

  return {
    summary: {
      totalAgents: cards.length,
      activeAgents: cards.filter((card) => card.workState === 'active').length,
      assignedAgents: cards.filter((card) => card.workState === 'assigned').length,
      blockedAgents: cards.filter((card) => card.workState === 'blocked').length,
      liveSessions: input.liveSessions.length,
      activeWorkItems: workstreams.find((stream) => stream.id === 'active')?.items.length || 0,
      reviewLoad: workstreams.find((stream) => stream.id === 'review')?.items.length || 0,
      blockedWorkItems: workstreams.find((stream) => stream.id === 'blocked')?.items.length || 0,
      handoffPressure: workItems.filter((item) => item.state === 'review' || item.needsAttention).length,
    },
    groups,
    sceneZones,
    workstreams,
    selected,
  };
}
