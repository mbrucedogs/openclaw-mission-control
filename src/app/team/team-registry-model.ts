import type { Agent } from '@/lib/types';
import { hasFreshPresence } from '@/lib/agent-presence';
import {
  AGENT_GROUP_META,
  classifyAgentGroup,
  type AgentGroupId,
} from '@/lib/agent-groups';

export type TeamRegistryAgentCard = {
  agent: Agent;
  group: AgentGroupId;
  needsSetup: boolean;
  isActive: boolean;
};

export type TeamRegistryGroup = {
  id: AgentGroupId;
  label: string;
  description: string;
  agents: TeamRegistryAgentCard[];
};

export type TeamRegistryModel = {
  summary: {
    totalAgents: number;
    configuredAgents: number;
    unassignedAgents: number;
    activeAgents: number;
    automationAgents: number;
  };
  groups: TeamRegistryGroup[];
  selected: TeamRegistryAgentCard | null;
};

function isAgentActive(agent: Agent): boolean {
  const status = String(agent.status || '').toLowerCase();
  const extended = agent as Agent & { isActive?: boolean; gatewaySessionCount?: number };
  return Boolean(
    extended.isActive ||
    hasFreshPresence(agent.recentSessions) ||
    status === 'active' ||
    status === 'busy',
  );
}

function sortCards(cards: TeamRegistryAgentCard[]): TeamRegistryAgentCard[] {
  return [...cards].sort((left, right) => {
    const setupDiff = Number(left.needsSetup) - Number(right.needsSetup);
    if (setupDiff !== 0) return setupDiff * -1;

    const activeDiff = Number(right.isActive) - Number(left.isActive);
    if (activeDiff !== 0) return activeDiff;

    return left.agent.name.localeCompare(right.agent.name);
  });
}

export function buildTeamRegistryModel(input: {
  agents: Agent[];
  selectedAgentId?: string;
}): TeamRegistryModel {
  const cards = input.agents.map((agent) => ({
    agent,
    group: classifyAgentGroup(agent),
    needsSetup: !agent.type,
    isActive: isAgentActive(agent),
  }));

  const groups = (Object.keys(AGENT_GROUP_META) as AgentGroupId[]).map((groupId) => ({
    id: groupId,
    label: AGENT_GROUP_META[groupId].label,
    description: AGENT_GROUP_META[groupId].description,
    agents: sortCards(cards.filter((card) => card.group === groupId)),
  }));

  const selected = cards.find((card) => card.agent.id === input.selectedAgentId) ?? cards[0] ?? null;

  return {
    summary: {
      totalAgents: cards.length,
      configuredAgents: cards.filter((card) => !card.needsSetup).length,
      unassignedAgents: cards.filter((card) => card.needsSetup).length,
      activeAgents: cards.filter((card) => card.isActive).length,
      automationAgents: cards.filter((card) => card.group === 'automation').length,
    },
    groups,
    selected,
  };
}
