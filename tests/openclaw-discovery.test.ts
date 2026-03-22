import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createRootAgentFromWorkspace,
  enrichDiscoveredAgentMetadata,
  inferAgentLayerHints,
  parseRegistryTable,
  parseTechnicalAgentsConfig,
  remapAgentsWithTechnicalConfig,
  type DiscoveredAgent,
} from '../src/lib/openclaw/discovery'

test('parseRegistryTable extracts registry rows into dynamic discovered agents', () => {
  const agents = parseRegistryTable([
    '# Team Registry',
    '',
    '| Name | Role | Folder |',
    '| --- | --- | --- |',
    '| **Rita-Researcher** | Research Specialist | `agents/researcher` |',
    '| Quinn Reviewer | QA Reviewer | `agents/reviewer` |',
  ].join('\n'))

  assert.deepEqual(agents, [
    {
      id: 'agent-rita',
      name: 'Rita',
      role: 'Research Specialist',
      folder: 'agents/researcher',
      status: 'idle',
      mission: '',
      responsibilities: [],
    },
    {
      id: 'agent-quinn',
      name: 'Quinn Reviewer',
      role: 'QA Reviewer',
      folder: 'agents/reviewer',
      status: 'idle',
      mission: '',
      responsibilities: [],
    },
  ])
})

test('createRootAgentFromWorkspace derives the main agent from root identity and soul content', () => {
  const rootAgent = createRootAgentFromWorkspace({
    identityContent: [
      '# Identity',
      '- **Name:** Max',
      '- **Role:** Primary Orchestrator & Companion',
    ].join('\n'),
    soulContent: [
      '# Soul',
      '## Core Identity',
      '- **Mission:** Keep the workspace coordinated and moving.',
      '- **Model:** openai-codex/gpt-5.4',
    ].join('\n'),
  })

  assert.deepEqual(rootAgent, {
    id: 'main',
    name: 'Max',
    role: 'Primary Orchestrator & Companion',
    mission: 'Keep the workspace coordinated and moving.',
    status: 'idle',
    responsibilities: [],
    folder: '.',
    soulContent: [
      '# Soul',
      '## Core Identity',
      '- **Mission:** Keep the workspace coordinated and moving.',
      '- **Model:** openai-codex/gpt-5.4',
    ].join('\n'),
    model: 'openai-codex/gpt-5.4',
    layer: 'governance',
    order: 0,
  })
})

test('parseTechnicalAgentsConfig and remapAgentsWithTechnicalConfig remap friendly discovery IDs to OpenClaw technical IDs', () => {
  const technicalAgents = parseTechnicalAgentsConfig(JSON.stringify({
    agents: {
      list: [
        {
          id: 'alice-researcher',
          name: 'Alice',
          agentDir: '/tmp/workspace/agents/researcher',
        },
        {
          id: 'main',
          identity: { name: 'Max' },
        },
      ],
    },
  }))

  const agents: DiscoveredAgent[] = [
    {
      id: 'agent-rita',
      name: 'Rita',
      role: 'Research Specialist',
      folder: 'agents/researcher',
      status: 'idle',
      mission: '',
      responsibilities: [],
    },
    {
      id: 'main',
      name: 'Max',
      role: 'Primary Orchestrator',
      folder: '.',
      status: 'idle',
      mission: '',
      responsibilities: [],
    },
  ]

  assert.deepEqual(remapAgentsWithTechnicalConfig(agents, technicalAgents), [
    {
      id: 'alice-researcher',
      name: 'Alice',
      role: 'Research Specialist',
      folder: 'agents/researcher',
      status: 'idle',
      mission: '',
      responsibilities: [],
    },
    {
      id: 'main',
      name: 'Max',
      role: 'Primary Orchestrator',
      folder: '.',
      status: 'idle',
      mission: '',
      responsibilities: [],
    },
  ])
})

test('enrichDiscoveredAgentMetadata reads SOUL and AGENTS content and inferAgentLayerHints aligns tester work to review', () => {
  const agent: DiscoveredAgent = {
    id: 'charlie-tester',
    name: 'Charlie',
    role: 'Quality Tester',
    folder: 'agents/tester',
    status: 'idle',
    mission: '',
    responsibilities: [],
  }

  const enriched = enrichDiscoveredAgentMetadata(agent, {
    resolvedFolder: 'agents/tester',
    soulContent: [
      '## Core Identity',
      '- **Mission:** Validate the work before it ships.',
      '- **Model:** ollama/kimi-k2.5:cloud',
    ].join('\n'),
    agentsContent: [
      '## Type: tester',
      '## Skills',
      '- Regression testing',
      '- Release validation',
    ].join('\n'),
  })

  assert.equal(enriched.folder, 'agents/tester')
  assert.equal(enriched.mission, 'Validate the work before it ships.')
  assert.equal(enriched.model, 'ollama/kimi-k2.5:cloud')
  assert.equal(enriched.type, 'tester')
  assert.deepEqual(enriched.responsibilities, ['Regression testing', 'Release validation'])
  assert.deepEqual(inferAgentLayerHints(enriched, 'Matt (creates) → Rita → Bob → Charlie → Done'), {
    layer: 'review',
    order: 40,
  })
})

test('technical config parsing and metadata enrichment stay resilient when inputs are missing or malformed', () => {
  assert.deepEqual(parseTechnicalAgentsConfig('{not-json'), [])

  const enriched = enrichDiscoveredAgentMetadata({
    id: 'agent-ava',
    name: 'Ava',
    role: 'Builder',
    folder: 'agents/ava',
    status: 'idle',
    mission: '',
    responsibilities: [],
  }, {
    resolvedFolder: 'agents/ava',
    soulContent: '# Soul without expected sections',
    agentsContent: '## Skills\n-\n',
  })

  assert.equal(enriched.folder, 'agents/ava')
  assert.equal(enriched.mission, '')
  assert.deepEqual(enriched.responsibilities, [])
  assert.equal(createRootAgentFromWorkspace({ identityContent: '', soulContent: '' }), null)
})
