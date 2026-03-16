import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'mission-control.db');

export const db = new Database(DB_PATH);

// Initialize schema
export function ensureInit() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'normal',
      owner TEXT NOT NULL,
      requestedBy TEXT NOT NULL,
      reviewer TEXT,
      project TEXT,
      executionMode TEXT NOT NULL,
      scheduleRef TEXT,
      evidence TEXT,
      retryCount INTEGER DEFAULT 0,
      handoverFrom TEXT,
      supervisorNotes TEXT,
      isStuck INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL,
      progress REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      mission TEXT,
      status TEXT
    );

    CREATE TABLE IF NOT EXISTS responsibilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agentId TEXT NOT NULL,
      description TEXT NOT NULL,
      FOREIGN KEY (agentId) REFERENCES agents(id)
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      actor TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS document_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      content TEXT,
      source_url TEXT,
      document_type TEXT NOT NULL DEFAULT 'note',
      folder_id INTEGER,
      tags TEXT DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES document_folders(id)
    );

    CREATE TABLE IF NOT EXISTS document_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      task_id TEXT NOT NULL,
      link_type TEXT NOT NULL DEFAULT 'related',
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    -- Legacy table kept for viewer mode (filesystem-backed docs from ingestion)
    CREATE TABLE IF NOT EXISTS local_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      path TEXT NOT NULL,
      category TEXT NOT NULL,
      projectId TEXT,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_jobs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cron TEXT,
      nextRunAt TEXT,
      taskId TEXT,
      agentId TEXT NOT NULL
    );
  `);
}

// Auto-init on load in node environment
if (typeof window === 'undefined') {
  ensureInit();
  // Migration: add priority and evidence columns if they don't exist yet
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'`);
  } catch {}
  try {
    db.exec(`ALTER TABLE tasks ADD COLUMN evidence TEXT`);
  } catch {}
}
