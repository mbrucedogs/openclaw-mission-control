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
export type OpenClawTransportMode = 'sdk' | 'cli-fallback' | 'failed'
export type OpenClawGatewayReasonCode =
  | 'ok'
  | 'partial_data'
  | 'auth_failed'
  | 'insufficient_scope'
  | 'unreachable'
  | 'timeout'
  | 'transport_missing'
  | 'unknown'

export type OpenClawGatewayDiagnostics = {
  transportMode: OpenClawTransportMode
  reasonCode: OpenClawGatewayReasonCode
  operatorMessage: string
  hasRawError: boolean
}

export type OpenClawGatewayCallResult<T> =
  | {
      ok: true
      data: T
      diagnostics: OpenClawGatewayDiagnostics
    }
  | {
      ok: false
      diagnostics: OpenClawGatewayDiagnostics
      error: Error
    }

export type LoadedOpenClawGatewayTransport = {
  transportMode: Exclude<OpenClawTransportMode, 'failed'>
  callGateway: OpenClawCallGateway
}

type CallOpenClawGatewayDeps = {
  env?: NodeJS.ProcessEnv
  loadCallGateway?: () => Promise<OpenClawCallGateway>
  loadGatewayTransport?: () => Promise<LoadedOpenClawGatewayTransport>
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

function buildSuccessDiagnostics(
  transportMode: Exclude<OpenClawTransportMode, 'failed'>,
): OpenClawGatewayDiagnostics {
  return {
    transportMode,
    reasonCode: 'ok',
    operatorMessage: transportMode === 'sdk'
      ? 'Connected via SDK transport.'
      : 'Connected via CLI fallback transport.',
    hasRawError: false,
  }
}

function buildFailureDiagnostics(
  transportMode: OpenClawTransportMode,
  reasonCode: Exclude<OpenClawGatewayReasonCode, 'ok' | 'partial_data'>,
): OpenClawGatewayDiagnostics {
  const operatorMessage = (() => {
    switch (reasonCode) {
      case 'auth_failed':
        return 'Gateway authentication failed.'
      case 'insufficient_scope':
        return 'Gateway access is missing the required scope.'
      case 'timeout':
        return 'Gateway did not respond before the timeout.'
      case 'unreachable':
        return 'OpenClaw is unreachable.'
      case 'transport_missing':
        return 'Mission Control could not initialize an OpenClaw transport.'
      default:
        return 'Mission Control could not read from OpenClaw.'
    }
  })()

  return {
    transportMode,
    reasonCode,
    operatorMessage,
    hasRawError: true,
  }
}

function normalizeGatewayError(err: unknown, transportMode: OpenClawTransportMode): OpenClawGatewayDiagnostics {
  const message = err instanceof Error ? err.message : String(err)
  const normalized = message.toLowerCase()

  if (
    normalized.includes('401')
    || normalized.includes('unauthorized')
    || normalized.includes('invalid token')
    || normalized.includes('authentication failed')
  ) {
    return buildFailureDiagnostics(transportMode, 'auth_failed')
  }

  if (
    normalized.includes('403')
    || normalized.includes('forbidden')
    || normalized.includes('missing scope')
    || normalized.includes('insufficient scope')
    || normalized.includes('operator.read')
  ) {
    return buildFailureDiagnostics(transportMode, 'insufficient_scope')
  }

  if (
    normalized.includes('timeout')
    || normalized.includes('timed out')
    || normalized.includes('etimedout')
    || normalized.includes('aborterror')
  ) {
    return buildFailureDiagnostics(transportMode, 'timeout')
  }

  if (
    normalized.includes('econnrefused')
    || normalized.includes('enotfound')
    || normalized.includes('socket hang up')
    || normalized.includes('unreachable')
    || (normalized.includes('enoent') && normalized.includes('openclaw'))
    || normalized.includes('fetch failed')
  ) {
    return buildFailureDiagnostics(transportMode, 'unreachable')
  }

  if (
    normalized.includes('transport module missing')
    || normalized.includes('cannot find module')
    || normalized.includes('failed to resolve module')
  ) {
    return buildFailureDiagnostics(transportMode, 'transport_missing')
  }

  return buildFailureDiagnostics(transportMode, 'unknown')
}

export async function loadOpenClawGatewayTransport(): Promise<LoadedOpenClawGatewayTransport> {
  try {
    const publicModule = await import('openclaw/plugin-sdk') as { callGateway?: OpenClawCallGateway }

    if (typeof publicModule.callGateway === 'function') {
      return {
        transportMode: 'sdk',
        callGateway: publicModule.callGateway,
      }
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
    return {
      transportMode: 'cli-fallback',
      callGateway: buildCliGatewayCaller(),
    }
  }

  const moduleUrl = pathToFileURL(modulePath).href
  const loaded = await import(moduleUrl) as { callGateway?: OpenClawCallGateway }

  if (typeof loaded.callGateway !== 'function') {
    return {
      transportMode: 'cli-fallback',
      callGateway: buildCliGatewayCaller(),
    }
  }

  return {
    transportMode: 'sdk',
    callGateway: loaded.callGateway,
  }
}

export async function loadOpenClawCallGateway(): Promise<OpenClawCallGateway> {
  const transport = await loadOpenClawGatewayTransport()
  return transport.callGateway
}

export async function callOpenClawGatewayWithDiagnostics<T = unknown>(
  method: string,
  params: unknown = {},
  deps: CallOpenClawGatewayDeps = {},
): Promise<OpenClawGatewayCallResult<T>> {
  let transport: LoadedOpenClawGatewayTransport

  try {
    if (deps.loadGatewayTransport) {
      transport = await deps.loadGatewayTransport()
    } else if (deps.loadCallGateway) {
      transport = {
        transportMode: 'sdk',
        callGateway: await deps.loadCallGateway(),
      }
    } else {
      transport = await loadOpenClawGatewayTransport()
    }
  } catch (err) {
    return {
      ok: false,
      diagnostics: normalizeGatewayError(err, 'failed'),
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }

  const config = getOpenClawGatewayRuntimeConfig(deps.env)

  try {
    const data = await transport.callGateway<T>({
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

    return {
      ok: true,
      data,
      diagnostics: buildSuccessDiagnostics(transport.transportMode),
    }
  } catch (err) {
    return {
      ok: false,
      diagnostics: normalizeGatewayError(err, transport.transportMode),
      error: err instanceof Error ? err : new Error(String(err)),
    }
  }
}

export async function callOpenClawGateway<T = unknown>(
  method: string,
  params: unknown = {},
  deps: CallOpenClawGatewayDeps = {},
): Promise<T> {
  const result = await callOpenClawGatewayWithDiagnostics<T>(method, params, deps)

  if (result.ok) {
    return result.data
  }

  throw result.error
}
