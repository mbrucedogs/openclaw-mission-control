import assert from 'node:assert/strict'
import test from 'node:test'

import { buildExecApprovalsRoute } from '../src/app/api/exec-approvals/route'

test('GET /api/exec-approvals returns normalized pending approvals', async () => {
  const route = buildExecApprovalsRoute({
    listExecApprovals: async () => ([
      {
        id: 'appr-1',
        status: 'pending',
        risk: 'high',
        agentId: 'main',
        sessionKey: 'agent:main:session',
        command: 'npm run build',
        cwd: '/workspace/app',
        requestedAt: 1700000000000,
      },
    ]),
    resolveExecApproval: async () => ({ ok: true }),
  })

  const response = await route.GET()

  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    approvals: [
      {
        id: 'appr-1',
        status: 'pending',
        risk: 'high',
        agentId: 'main',
        sessionKey: 'agent:main:session',
        command: 'npm run build',
        cwd: '/workspace/app',
        requestedAt: 1700000000000,
      },
    ],
  })
})

test('POST /api/exec-approvals resolves approve and deny actions', async () => {
  const decisions: Array<{ id: string; decision: string }> = []
  const route = buildExecApprovalsRoute({
    listExecApprovals: async () => [],
    resolveExecApproval: async (input) => {
      decisions.push(input)
      return { ok: true }
    },
  })

  const approveRequest = new Request('http://localhost/api/exec-approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'abc', action: 'approve' }),
  })
  const denyRequest = new Request('http://localhost/api/exec-approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'def', action: 'deny' }),
  })

  const approveResponse = await route.POST(approveRequest)
  const denyResponse = await route.POST(denyRequest)

  assert.equal(approveResponse.status, 200)
  assert.equal(denyResponse.status, 200)
  assert.deepEqual(decisions, [
    { id: 'abc', decision: 'allow-once' },
    { id: 'def', decision: 'deny' },
  ])
})

test('POST /api/exec-approvals validates action', async () => {
  const route = buildExecApprovalsRoute({
    listExecApprovals: async () => [],
    resolveExecApproval: async () => ({ ok: true }),
  })

  const request = new Request('http://localhost/api/exec-approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'abc', action: 'invalid' }),
  })

  const response = await route.POST(request)

  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { error: 'Invalid action' })
})

test('GET /api/exec-approvals returns a stable gateway failure shape', async () => {
  const route = buildExecApprovalsRoute({
    listExecApprovals: async () => {
      throw new Error('gateway unavailable')
    },
    resolveExecApproval: async () => ({ ok: true }),
  })

  const response = await route.GET()

  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), {
    approvals: [],
    error: 'Failed to fetch exec approvals',
  })
})
