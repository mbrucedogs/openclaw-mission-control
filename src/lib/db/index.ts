import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'mission-control.db');

// Check if we need to initialize
const needsInit = !fs.existsSync(DB_PATH);

export const db = new Database(DB_PATH);

// Initialize schema from SQL file
export function ensureInit() {
  const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('Database initialized with new schema');
}

// Auto-init on load in node environment
if (typeof window === 'undefined') {
  try {
    // Check if tasks table exists
    const checkTasksTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
    ).get();
    
    if (!checkTasksTable) {
      // No tasks table - fresh init (either new file or wiped)
      console.log('Initializing fresh database...');
      ensureInit();
      console.log('Database initialized');
    } else {
      // Check if new tables exist, if not, migration needed
      const checkTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='task_comments'"
      ).get();
      if (!checkTable) {
        console.log('Migrating database to new schema...');
        // Backup old data
        const tasks = db.prepare('SELECT * FROM tasks').all() as any[];
        const projects = db.prepare('SELECT * FROM projects').all() as any[];
        const agents = db.prepare('SELECT * FROM agents').all() as any[];
        
        // Re-init with new schema
        ensureInit();
        
        // Restore data (migrate fields)
        const insertTask = db.prepare(`
          INSERT INTO tasks (id, title, description, status, priority, owner, requestedBy, reviewer, project, executionMode, scheduleRef, createdAt, updatedAt, isStuck, retryCount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        for (const t of tasks) {
          insertTask.run(
            t.id, t.title, t.description, t.status, t.priority || 'normal', t.owner, t.requestedBy, t.reviewer, t.project, t.executionMode, t.scheduleRef, t.createdAt, t.updatedAt, t.isStuck || 0, t.retryCount || 0
          );
        }
        
        const insertProject = db.prepare('INSERT INTO projects (id, name, description, status, progress) VALUES (?, ?, ?, ?, ?)');
        for (const p of projects) {
          insertProject.run(p.id, p.name, p.description, p.status, p.progress || 0);
        }
        
        const insertAgent = db.prepare('INSERT INTO agents (id, name, role, mission, status) VALUES (?, ?, ?, ?, ?)');
        for (const a of agents) {
          insertAgent.run(a.id, a.name, a.role, a.mission, a.status);
        }
        
        console.log('Migration complete');
      }

      // Check if users table exists, if not, create it
      const checkUsersTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
      ).get();
      if (!checkUsersTable) {
        console.log('Creating users table...');
        db.exec(`
          CREATE TABLE users (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            createdAt TEXT NOT NULL DEFAULT (datetime('now'))
          )
        `);
      }

      // Seed admin user if none exist
      const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
      if (userCount === 0) {
        const adminUser = process.env.AUTH_USER || 'admin';
        const adminPass = process.env.AUTH_PASS || 'admin';
        console.log(`Seeding initial admin user: ${adminUser}`);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUser, adminPass, 'admin');
      }

      // Check if task_workflow_steps table exists
      const checkStepsTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='task_workflow_steps'"
      ).get();
      if (!checkStepsTable) {
        console.log('Creating task_workflow_steps table...');
        ensureInit(); // This will create all missing tables from schema.sql
      }
    }
  } catch (err) {
    console.error('Database init error:', err);
    // Force re-init on error
    console.log('Forcing database re-initialization...');
    ensureInit();
  }
}
