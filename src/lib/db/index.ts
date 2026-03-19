import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'mission-control.db');
const TASK_SCHEMA_VERSION = 'task-runs-v5';

export const db = new Database(DB_PATH);

function loadSchema() {
  const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
  return fs.readFileSync(schemaPath, 'utf-8');
}

export function ensureInit() {
  db.exec(loadSchema());
}

function getTaskSchemaVersion() {
  try {
    const row = db
      .prepare("SELECT value FROM app_meta WHERE key = 'task_orchestration_schema_version'")
      .get() as { value?: string } | undefined;
    return row?.value || null;
  } catch {
    return null;
  }
}

function setTaskSchemaVersion(version: string) {
  db.prepare(`
    INSERT INTO app_meta (key, value) VALUES ('task_orchestration_schema_version', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(version);
}

function resetTaskOrchestrationTables() {
  const tables = [
    'run_step_events',
    'run_steps',
    'task_runs',
    'task_stage_plans',
    'task_templates',
    'task_issues',
    'task_comments',
    'task_activity',
    'task_evidence',
    'document_tasks',
    'tasks',
    'workflow_templates',
    'pipelines',
    'pipeline_runs',
    'task_pipelines',
    'task_workflow_steps',
    'agent_alerts',
  ];

  db.exec('PRAGMA foreign_keys = OFF;');
  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
  db.exec('PRAGMA foreign_keys = ON;');
}

if (typeof window === 'undefined') {
  try {
    ensureInit();

    if (getTaskSchemaVersion() !== TASK_SCHEMA_VERSION) {
      resetTaskOrchestrationTables();
      ensureInit();
      setTaskSchemaVersion(TASK_SCHEMA_VERSION);
    }

    const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCountRow.count === 0) {
      const adminUser = process.env.AUTH_USER || 'admin';
      const adminPass = process.env.AUTH_PASS || 'admin';
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUser, adminPass, 'admin');
    }
  } catch (err) {
    console.warn('Database initialization warning:', err);
    try {
      resetTaskOrchestrationTables();
      ensureInit();
      setTaskSchemaVersion(TASK_SCHEMA_VERSION);
    } catch (innerError) {
      console.error('Critical database failure:', innerError);
    }
  }
}
