import assert from 'node:assert/strict'
import test from 'node:test'

import { listExecApprovals, resolveExecApproval } from '../src/lib/openclaw/approvals'

test('listExecApprovals normalizes gateway snapshot', async () => {
  const approvals = await listExecApprovals({
    callGateway: async () => ({
      pending: [
        {
          id: 'appr-1',
          risk: 'high',
          request: {
            agentId: 'main',
            sessionKey: 'agent:main:session',
            command: 'npm run build',
            cwd: '/workspace/app',
            createdAt: 1700000000000,
          },
        },
      ],
    }),
  })

  assert.equal(approvals.length, 1)
  assert.deepEqual(approvals[0], {
    id: 'appr-1',
    status: 'pending',
    risk: 'high',
    agentId: 'main',
    sessionKey: 'agent:main:session',
    command: 'npm run build',
    cwd: '/workspace/app',
    requestedAt: 1700000000000,
  })
})

test('resolveExecApproval sends the requested gateway decision', async () => {
  const calls: Array<{ method: string; params: unknown }> = []

  await resolveExecApproval({
    id: 'appr-2',
    decision: 'allow-always',
  }, {
    callGateway: async (method, params) => {
      calls.push({ method, params })
      return { ok: true }
    },
  })

  assert.deepEqual(calls, [
    {
      method: 'exec.approval.resolve',
      params: { id: 'appr-2', decision: 'allow-always' },
    },
  ])
})

test('listExecApprovals fails safely on malformed or unrelated gateway payloads', async () => {
  const malformed = await listExecApprovals({
    callGateway: async () => ({
      path: '/Users/example/.openclaw/exec-approvals.json',
      exists: true,
      file: { agents: { main: { allowlist: [] } } },
    }),
  })

  assert.deepEqual(malformed, [])
})
