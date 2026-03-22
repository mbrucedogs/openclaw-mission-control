import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterApprovals,
  getActiveApproval,
  normalizeExecApprovals,
} from '../src/components/exec-approvals/useExecApprovals'

test('normalizeExecApprovals sorts pending approvals oldest-first and defaults unknown risk to medium', () => {
  const approvals = normalizeExecApprovals([
    {
      id: 'newer',
      status: 'pending',
      risk: 'urgent',
      agentId: 'main',
      sessionKey: 'session:newer',
      command: 'npm run test',
      requestedAt: 200,
    },
    {
      id: 'older',
      status: 'pending',
      risk: 'high',
      agentId: 'alice',
      sessionKey: 'session:older',
      command: 'npm run build',
      requestedAt: 100,
    },
  ])

  assert.deepEqual(approvals.map((approval) => [approval.id, approval.risk]), [
    ['older', 'high'],
    ['newer', 'medium'],
  ])
})

test('getActiveApproval excludes expired approvals from the active modal queue', () => {
  const active = getActiveApproval([
    {
      id: 'expired',
      status: 'pending',
      risk: 'medium',
      agentId: 'main',
      sessionKey: 'session:expired',
      command: 'npm run build',
      requestedAt: 100,
      expiresAt: 150,
    },
    {
      id: 'active',
      status: 'pending',
      risk: 'medium',
      agentId: 'alice',
      sessionKey: 'session:active',
      command: 'npm run lint',
      requestedAt: 200,
    },
  ], 175)

  assert.equal(active?.id, 'active')
})

test('filterApprovals supports pending and resolved queues', () => {
  const approvals = normalizeExecApprovals([
    {
      id: 'pending',
      status: 'pending',
      risk: 'medium',
      agentId: 'main',
      sessionKey: 'session:pending',
      command: 'npm run build',
      requestedAt: 100,
    },
    {
      id: 'denied',
      status: 'denied',
      risk: 'low',
      agentId: 'main',
      sessionKey: 'session:denied',
      command: 'rm -rf dist',
      requestedAt: 200,
    },
  ])

  assert.deepEqual(filterApprovals(approvals, 'pending').map((approval) => approval.id), ['pending'])
  assert.deepEqual(filterApprovals(approvals, 'resolved').map((approval) => approval.id), ['denied'])
})
