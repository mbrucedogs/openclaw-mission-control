import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { getOpenClawGatewayRuntimeConfig } from '../config'

type CallGatewayRequest = {
  method: string
  params?: unknown
  url?: string
  token?: string
  timeoutMs?: number
  expectFinal?: boolean
  clientName?: string
  clientDisplayName?: string
  mode?: string
}

export type OpenClawCallGateway = <T = unknown>(opts: CallGatewayRequest) => Promise<T>

type CallOpenClawGatewayDeps = {
  env?: NodeJS.ProcessEnv
  loadCallGateway?: () => Promise<OpenClawCallGateway>
  timeoutMs?: number
  expectFinal?: boolean
}

export async function loadOpenClawCallGateway(): Promise<OpenClawCallGateway> {
  const overridePath = String(process.env.OPENCLAW_GATEWAY_SDK_CALL_PATH || '').trim()
  const modulePath = overridePath || path.join(
    process.cwd(),
    'node_modules',
    'openclaw',
    'dist',
    'plugin-sdk',
    'gateway',
    'call.js',
  )

  if (!fs.existsSync(modulePath)) {
    throw new Error(`Mission Control requires the OpenClaw gateway SDK at ${modulePath}`)
  }

  const moduleUrl = pathToFileURL(modulePath).href
  const loaded = await import(moduleUrl) as { callGateway?: OpenClawCallGateway }

  if (typeof loaded.callGateway !== 'function') {
    throw new Error('Failed to load openclaw native gateway client')
  }

  return loaded.callGateway
}

export async function callOpenClawGateway<T = unknown>(
  method: string,
  params: unknown = {},
  deps: CallOpenClawGatewayDeps = {},
): Promise<T> {
  const config = getOpenClawGatewayRuntimeConfig(deps.env)
  const callGateway = deps.loadCallGateway ? await deps.loadCallGateway() : await loadOpenClawCallGateway()

  return await callGateway<T>({
    method,
    params,
    url: config.url,
    token: config.token,
    timeoutMs: deps.timeoutMs ?? config.timeoutMs,
    expectFinal: deps.expectFinal ?? false,
    clientName: 'gateway-client',
    clientDisplayName: 'Mission Control',
    mode: 'backend',
  })
}
