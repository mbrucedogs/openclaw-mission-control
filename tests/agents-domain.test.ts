import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function makeTempDbPath() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-agents-db-'));
  return path.join(dir, 'mission-control.db');
}

function makeTempWorkspace() {
  const workspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mission-control-agents-workspace-'));
  const agentsDir = path.join(workspaceDir, 'agents');
  fs.mkdirSync(path.join(agentsDir, 'researcher'), { recursive: true });
  fs.writeFileSync(
    path.join(agentsDir, 'TEAM-REGISTRY.md'),
    [
      '| Name | Role | Folder |',
      '| --- | --- | --- |',
      '| **Rita** | Research Specialist | `agents/researcher` |',
      '',
    ].join('\n'),
  );
  return workspaceDir;
}

async function loadFreshAgentsModule() {
  process.env.DATABASE_URL = makeTempDbPath();
  process.env.OPENCLAW_WORKSPACE = makeTempWorkspace();

  const stamp = `${Date.now()}-${Math.random()}`;
  return import(`../src/lib/domain/agents.ts?agents=${stamp}`);
}

test('updateAgentType persists the selected type and getAgents reflects it', async () => {
  const { getAgents, updateAgentType, getAgentById } = await loadFreshAgentsModule();

  const agent = getAgents().find((item) => item.id !== 'main');
  assert.ok(agent, 'expected at least one discovered agent');

  updateAgentType(agent.id, 'researcher');

  const updated = getAgentById(agent.id);
  assert.equal(updated?.type, 'researcher');
  assert.equal(getAgents().find((item) => item.id === agent.id)?.type, 'researcher');
});
