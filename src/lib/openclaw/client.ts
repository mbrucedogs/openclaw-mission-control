import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

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

const execFileAsync = promisify(execFile)

function resolveOpenClawBinary() {
  return 'openclaw'
}

function parseJsonFromStdout(stdout: string) {
  const trimmed = stdout.trim()
  const objectStart = trimmed.indexOf('{')
  const arrayStart = trimmed.indexOf('[')
  const starts = [objectStart, arrayStart].filter((idx) => idx >= 0)
  const start = starts.length > 0 ? Math.min(...starts) : -1

  if (start < 0) {
    throw new Error(`OpenClaw gateway call did not return JSON: ${trimmed}`)
  }

  return JSON.parse(trimmed.slice(start))
}

function buildCliGatewayCaller(): OpenClawCallGateway {
  return async function callGatewayViaCli<T = unknown>(opts: CallGatewayRequest): Promise<T> {
    const args = [
      'gateway',
      'call',
      opts.method,
      '--json',
      '--timeout',
      String(opts.timeoutMs ?? 10000),
      '--params',
      JSON.stringify(opts.params ?? {}),
    ]

    if (opts.expectFinal) {
      args.push('--expect-final')
    }
    if (opts.url) {
      args.push('--url', opts.url)
    }
    if (opts.token) {
      args.push('--token', opts.token)
    }

    const { stdout } = await execFileAsync(resolveOpenClawBinary(), args, {
      env: process.env,
      maxBuffer: 1024 * 1024 * 10,
    })

    return parseJsonFromStdout(stdout) as T
  }
}

export async function loadOpenClawCallGateway(): Promise<OpenClawCallGateway> {
  try {
    const publicModule = await import('openclaw/plugin-sdk') as { callGateway?: OpenClawCallGateway }

    if (typeof publicModule.callGateway === 'function') {
      return publicModule.callGateway
    }
  } catch {
    // Fall through to the legacy internal path for older package layouts.
  }

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
    return buildCliGatewayCaller()
  }

  const moduleUrl = pathToFileURL(modulePath).href
  const loaded = await import(moduleUrl) as { callGateway?: OpenClawCallGateway }

  if (typeof loaded.callGateway !== 'function') {
    return buildCliGatewayCaller()
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
