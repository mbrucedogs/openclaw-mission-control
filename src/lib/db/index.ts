import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Force rebuild timestamp (manual restart might be needed): 2026-03-18T02:20:00Z
const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'mission-control.db');

export const db = new Database(DB_PATH);

export function ensureInit() {
  const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('Database initialized (ensureInit)');
}

/**
 * Database Initialization and Schema Management
 * This runs on server start to ensure all necessary tables exist.
 */
if (typeof window === 'undefined') {
  try {
    // 1. Check if the core tasks table exists
    const checkTasksTable = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
    ).get();
    
    if (!checkTasksTable) {
      console.log('Initializing fresh database...');
      ensureInit();
    } else {
      // 2. Migration: Users
      const usersTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
      if (!usersTable) {
        console.log('Creating missing users table...');
        ensureInit();
      }

      // 3. Migration: Task Workflow Steps
      const stepsExist = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='task_workflow_steps'").get();
      if (!stepsExist) {
        console.log('Creating steps table...');
        ensureInit();
      } else {
        // Migration: task_workflow_steps columns
        const columns = db.prepare("PRAGMA table_info(task_workflow_steps)").all() as any[];
        
        const hasDescription = columns.some(c => c.name === 'description');
        if (!hasDescription) {
          console.log('Adding description column to task_workflow_steps...');
          db.exec("ALTER TABLE task_workflow_steps ADD COLUMN description TEXT");
        }

        const hasReqDeliv = columns.some(c => c.name === 'required_deliverables');
        if (!hasReqDeliv) {
          console.log('Adding required_deliverables column to task_workflow_steps...');
          db.exec("ALTER TABLE task_workflow_steps ADD COLUMN required_deliverables TEXT DEFAULT '[]'");
        }
      }

      // 4. Migration: Task Pipelines
      const pipelinesExist = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='task_pipelines'").get();
      if (pipelinesExist) {
        const columns = db.prepare("PRAGMA table_info(task_pipelines)").all() as any[];
        const hasPipelineName = columns.some(c => c.name === 'pipeline_name');
        if (!hasPipelineName) {
          console.log('Adding pipeline_name column to task_pipelines...');
          db.exec("ALTER TABLE task_pipelines ADD COLUMN pipeline_name TEXT");
        }
      }

      // 5. Migration: Agent Alerts
      const alertsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_alerts'").get();
      if (!alertsTable) {
        console.log('Creating missing agent_alerts table...');
        ensureInit();
      }
    }

    // 5. Seed default admin if none exist
    const userCountRows = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    if (userCountRows && userCountRows.count === 0) {
      const adminUser = process.env.AUTH_USER || 'admin';
      const adminPass = process.env.AUTH_PASS || 'admin';
      console.log(`Seeding initial admin user: ${adminUser}`);
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(adminUser, adminPass, 'admin');
    }

  } catch (err) {
    console.warn('Database initialization warning:', err);
    // Safety fallback
    try {
      ensureInit();
    } catch (innerError) {
      console.error('Critical database failure:', innerError);
    }
  }
}
// END OF FILE
