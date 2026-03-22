export type AgentGroupId = 'governance' | 'build' | 'review' | 'automation';

export const AGENT_GROUP_META: Record<AgentGroupId, { label: string; description: string; tone: string }> = {
  governance: {
    label: 'Governance',
    description: 'Routing, orchestration, and supervision',
    tone: 'amber',
  },
  build: {
    label: 'Build',
    description: 'Research, implementation, and delivery',
    tone: 'blue',
  },
  review: {
    label: 'Review',
    description: 'Validation, approval, and quality control',
    tone: 'emerald',
  },
  automation: {
    label: 'Automation',
    description: 'Monitoring, scheduled work, and support systems',
    tone: 'violet',
  },
};

function normalize(value: string | undefined): string {
  return String(value || '').toLowerCase();
}

export function classifyAgentGroup(agent: {
  role?: string;
  layer?: string;
  status?: string;
}): AgentGroupId {
  const role = normalize(agent.role);
  const layer = normalize(agent.layer);
  const status = normalize(agent.status);

  if (layer === 'governance' || role.includes('orchestrat') || role.includes('governance')) {
    return 'governance';
  }

  if (
    layer === 'build'
  ) {
    return 'build';
  }

  if (
    layer === 'review' ||
    role.includes('review') ||
    role.includes('qa') ||
    role.includes('test') ||
    role.includes('security')
  ) {
    return 'review';
  }

  if (
    layer === 'automation' ||
    role.includes('auto') ||
    role.includes('monitor') ||
    role.includes('cron') ||
    role.includes('reliability') ||
    status === 'automation'
  ) {
    return 'automation';
  }

  return 'build';
}
