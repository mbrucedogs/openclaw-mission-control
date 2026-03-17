import { db } from './db/index';
import path from 'path';

// ============================================================================
// CONFIGURATION MANAGER
// Loads config from: Environment → Database → Defaults
// ============================================================================

interface ConfigValue {
  key: string;
  value: string;
  description?: string;
}

// Default configuration values
const DEFAULTS: Record<string, string> = {
  DOCUMENTS_ROOT: '~/.openclaw/workspace/docs',
  RESEARCH_PATH: '~/.openclaw/workspace/docs/research',
  PLANS_PATH: '~/.openclaw/workspace/docs/plans',
  API_KEY: '', // Must be set via env or database
  API_URL: 'http://localhost:4000',
};

/** * Get configuration value
 * Priority: Environment (MC_*) → Database → Default
 */
export function getConfig(key: string): string {
  // 1. Check environment variable (Favor plain name first)
  let envValue = process.env[key];
  
  // Fallback to MC_ prefixed if plain name is missing
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
  } catch (err) {
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
  } catch (err) {
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

// ============================================================================
// WORKSPACE CONFIGURATION
// ============================================================================

const BASE_WORKSPACE = process.env.OPENCLAW_WORKSPACE || '/Volumes/Data/openclaw/workspace';

export const WORKSPACE_ROOTS = [
  path.join(BASE_WORKSPACE, 'memory'),
  path.join(BASE_WORKSPACE, 'tmp'),
  path.join(BASE_WORKSPACE, 'docs'),
  path.join(BASE_WORKSPACE, 'projects/Web/alex-mission-control/docs/plans'),
  path.join(BASE_WORKSPACE, 'projects/Documents'),
];

export const EXCLUDED_FOLDERS = [
  'node_modules',
  '.next',
  '.git',
  'dist',
  'build',
  '.gemini',
  'bl-mission-control',
];

export const ALLOWED_EXTENSIONS = ['.md', '.txt'];

