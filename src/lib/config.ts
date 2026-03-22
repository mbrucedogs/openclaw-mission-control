import { db } from './db/index';
import path from 'path';
import os from 'os';


// ============================================================================
// CONFIGURATION MANAGER
// Loads config from: Environment → Database → Defaults
// ============================================================================

interface ConfigValue {
  key: string;
  value: string;
  description?: string;
}

const DEFAULTS: Record<string, string> = {
  DOCUMENTS_ROOT: path.join(os.homedir(), '.openclaw', 'workspace', 'docs'),
  RESEARCH_PATH: path.join(os.homedir(), '.openclaw', 'workspace', 'docs', 'research'),
  PLANS_PATH: path.join(os.homedir(), '.openclaw', 'workspace', 'docs', 'plans'),
  API_KEY: '', // Must be set via env or database
  API_URL: 'http://localhost:4000',
  OPENCLAW_GATEWAY_URL: 'ws://127.0.0.1:18789',
  OPENCLAW_GATEWAY_TOKEN: '',
  OPENCLAW_GATEWAY_TIMEOUT_MS: '10000',
  MEMORY_ROOT: '', // Fallback to BASE_WORKSPACE/memory
  TMP_ROOT: '',    // Fallback to BASE_WORKSPACE/tmp
  DOCS_ROOT: '',   // Fallback to BASE_WORKSPACE/docs
};

/**
 * Expands character ~ at the start of a path to the user's home directory.
 */
export function expandHome(p: string): string {
  if (!p) return p;
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p === '~') {
    return os.homedir();
  }
  return p;
}

/** * Get configuration value
 * Priority: Environment (MC_*) → Database → Default
 */
export function getConfig(key: string): string {
  // 1. Check environment variable (Favor plain name first)
  let envValue = process.env[key];

  // Fallback to prefixed name if plain name is missing
  if (envValue === undefined) {
    const envKey = `MC_${key}`;
    envValue = process.env[envKey];
  }

  if (envValue !== undefined) {
    return envValue;
  }

  // 2. Check database
  try {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as ConfigValue | undefined;
    if (row?.value) {
      return row.value;
    }
  } catch {
    // Database not ready yet, fall through to defaults
  }

  // 3. Return default
  return DEFAULTS[key] || '';
}

/**
 * Set configuration value in database
 */
export function setConfig(key: string, value: string, description?: string): void {
  db.prepare(`
    INSERT INTO config (key, value, description, updated_at) 
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET 
      value = excluded.value,
      description = COALESCE(excluded.description, config.description),
      updated_at = datetime('now')
  `).run(key, value, description || null);
}

/**
 * Get all configuration values
 */
export function getAllConfig(): Record<string, string> {
  const config: Record<string, string> = { ...DEFAULTS };

  // Override with database values
  try {
    const rows = db.prepare('SELECT key, value FROM config').all() as ConfigValue[];
    for (const row of rows) {
      config[row.key] = row.value;
    }
  } catch {
    // Database not ready
  }

  // Override with environment variables
  for (const key of Object.keys(DEFAULTS)) {
    const envKey = `MC_${key}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      config[key] = envValue;
    }
  }

  return config;
}

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const DOCUMENTS_ROOT = () => getConfig('DOCUMENTS_ROOT');
export const RESEARCH_PATH = () => getConfig('RESEARCH_PATH');
export const PLANS_PATH = () => getConfig('PLANS_PATH');
export const API_KEY = () => getConfig('API_KEY');
export const API_URL = () => getConfig('API_URL');

export interface OpenClawGatewayRuntimeConfig {
  url: string;
  token?: string;
  timeoutMs: number;
}

export function getOpenClawGatewayRuntimeConfig(env: NodeJS.ProcessEnv = process.env): OpenClawGatewayRuntimeConfig {
  const rawUrl = String(env.OPENCLAW_GATEWAY_URL ?? env.MC_OPENCLAW_GATEWAY_URL ?? getConfig('OPENCLAW_GATEWAY_URL')).trim();
  const rawToken = String(env.OPENCLAW_GATEWAY_TOKEN ?? env.MC_OPENCLAW_GATEWAY_TOKEN ?? getConfig('OPENCLAW_GATEWAY_TOKEN')).trim();
  const rawTimeout = String(env.OPENCLAW_GATEWAY_TIMEOUT_MS ?? env.MC_OPENCLAW_GATEWAY_TIMEOUT_MS ?? getConfig('OPENCLAW_GATEWAY_TIMEOUT_MS')).trim();
  const parsedTimeout = Number.parseInt(rawTimeout, 10);

  return {
    url: rawUrl || 'ws://127.0.0.1:18789',
    token: rawToken || undefined,
    timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 10000,
  };
}

// ============================================================================
// WORKSPACE CONFIGURATION
// ============================================================================

export const BASE_WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), 'openclaw', 'workspace');

export const WORKSPACE_ROOTS = [
  expandHome(getConfig('MEMORY_ROOT') || path.join(BASE_WORKSPACE, 'memory')),
  expandHome(getConfig('TMP_ROOT') || path.join(BASE_WORKSPACE, 'tmp')),
  expandHome(getConfig('DOCS_ROOT') || path.join(BASE_WORKSPACE, 'docs')),
  expandHome(getConfig('DOCUMENTS_ROOT')),
].filter(Boolean);

export const EXCLUDED_FOLDERS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.gemini'
];

export const ALLOWED_EXTENSIONS = ['.md', '.txt'];
