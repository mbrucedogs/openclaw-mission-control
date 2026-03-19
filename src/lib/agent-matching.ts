import type { Agent, RunStepRole } from './types';

const ROLE_KEYWORDS: Record<RunStepRole, string[]> = {
  researcher: ['research', 'plan', 'scope', 'analysis'],
  builder: ['builder', 'implement', 'implementation', 'engineer', 'developer', 'code'],
  tester: ['test', 'tester', 'qa', 'quality', 'verification', 'validate'],
  reviewer: ['review', 'reviewer', 'approval', 'approve'],
};

const ROLE_ORDER: RunStepRole[] = ['researcher', 'builder', 'tester', 'reviewer'];

export function agentMatchesStepRole(agent: Agent, role: RunStepRole) {
  const configuredType = (agent.type || '').trim().toLowerCase();
  if (configuredType) {
    return configuredType === role;
  }

  const haystack = `${agent.name} ${agent.role}`.toLowerCase();
  return ROLE_KEYWORDS[role].some((keyword) => haystack.includes(keyword));
}

export function inferStepRoleForAgent(agent: Agent): RunStepRole | null {
  const configuredType = (agent.type || '').trim().toLowerCase();
  if (ROLE_ORDER.includes(configuredType as RunStepRole)) {
    return configuredType as RunStepRole;
  }

  const haystack = `${agent.name} ${agent.role}`.toLowerCase();
  for (const role of ROLE_ORDER) {
    if (ROLE_KEYWORDS[role].some((keyword) => haystack.includes(keyword))) {
      return role;
    }
  }

  return null;
}
