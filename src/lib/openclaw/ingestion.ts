import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { db } from '@/lib/db';
import { Task, TaskStatus, Agent } from '@/lib/types';
import { WORKSPACE_ROOTS } from '@/lib/config';
import { listWorkspaceFiles } from '@/lib/domain/documents';

const WORKSPACE_ROOT = '/Volumes/Data/openclaw/workspace';

// ─── Main entrypoint ─────────────────────────────────────────────────────────

export async function ingestWorkspace() {
    // better-sqlite3 is synchronous — no async in transactions
    ingestTeam();
    ingestMemories();
    ingestDocuments();
    ingestScheduleJobs();
}

// ─── Team ─────────────────────────────────────────────────────────────────────

function ingestTeam() {
    const agents: Agent[] = [
        { id: 'max', name: 'Max', role: 'Orchestrator', status: 'idle', responsibilities: ['Decomposition', 'Delegation', 'Coordination'], mission: 'Conductor, not musician. Breaks work into steps and delegates.' },
        { id: 'alice', name: 'Alice', role: 'Research', status: 'idle', responsibilities: ['Information Gathering', 'Analysis', 'Context'], mission: 'Intelligence gatherer. All research flows through Alice.' },
        { id: 'bob', name: 'Bob', role: 'Implementation', status: 'idle', responsibilities: ['Coding', 'Development', 'Refactoring'], mission: 'Builder. All implementation flows through Bob.' },
        { id: 'charlie', name: 'Charlie', role: 'QA', status: 'idle', responsibilities: ['Testing', 'Validation', 'Reports'], mission: 'Quality gatekeeper. All testing flows through Charlie.' },
        { id: 'aegis', name: 'Aegis', role: 'Review', status: 'idle', responsibilities: ['Validation', 'Standards', 'Approval'], mission: 'Validator. All final approval flows through Aegis.' },
        { id: 'tron', name: 'Tron', role: 'Automation', status: 'idle', responsibilities: ['Cron Jobs', 'Scheduled Work', 'Triggers'], mission: 'Scheduler. All automated/recurring work flows through Tron.' },
    ];

    const insertAgent = db.prepare('INSERT OR IGNORE INTO agents (id, name, role, status, mission) VALUES (?, ?, ?, ?, ?)');
    const insertResp = db.prepare('INSERT INTO responsibilities (agentId, description) VALUES (?, ?)');
    const hasResps = db.prepare('SELECT COUNT(*) as c FROM responsibilities WHERE agentId = ?');

    for (const agent of agents) {
        insertAgent.run(agent.id, agent.name, agent.role, agent.status, agent.mission);
        const count = (hasResps.get(agent.id) as any).c;
        if (count === 0) {
            for (const resp of agent.responsibilities) {
                insertResp.run(agent.id, resp);
            }
        }
    }
}




// ─── Memories ─────────────────────────────────────────────────────────────────

function ingestMemories() {
    const memoryDir = path.join(WORKSPACE_ROOT, 'memory');
    if (!fs.existsSync(memoryDir)) return;

    const insertMemory = db.prepare('INSERT OR REPLACE INTO memories (id, content, timestamp, category) VALUES (?, ?, ?, ?)');

    const files = fs.readdirSync(memoryDir)
        .filter(f => f.endsWith('.md') && !f.startsWith('.'))
        .sort()
        .reverse(); // newest first

    for (const file of files) {
        const filePath = path.join(memoryDir, file);
        try {
            const content = fs.readFileSync(filePath, 'utf-8').trim();
            if (!content || content.length < 20) continue;
            const stats = fs.statSync(filePath);

            // Determine category
            const isLongTerm = file.match(/^(MEMORY|LEARNINGS|SKILLS)/i) !== null;
            const category = isLongTerm ? 'long-term' : 'daily';

            // Use filename as ID (strip .md), derive timestamp from filename if date-stamped
            const id = file.replace('.md', '');
            let timestamp = stats.mtime.toISOString();

            // Try to parse date from filename like 2026-02-26.md or 2026-02-26-0419.md
            const dateMatch = file.match(/^(\d{4}-\d{2}-\d{2})/);
            if (dateMatch) {
                timestamp = new Date(dateMatch[1]).toISOString();
            }

            insertMemory.run(id, content, timestamp, category);
        } catch {
            // skip unreadable files silently
        }
    }
}

function getAllMarkdownFiles(dirPath: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dirPath)) return fileList;
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        if (item.startsWith('.') || item === 'node_modules' || item.includes('bl-mission-control')) continue;
        const fullPath = path.join(dirPath, item);
        try {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                getAllMarkdownFiles(fullPath, fileList);
            } else if (item.endsWith('.md')) { // ONLY .md files
                fileList.push(fullPath);
            }
        } catch {
            // skip
        }
    }
    return fileList;
}

// ─── Documents ────────────────────────────────────────────────────────────────

function ingestDocuments() {
    const insertDoc = db.prepare('INSERT OR REPLACE INTO local_documents (id, title, path, category, updatedAt) VALUES (?, ?, ?, ?, ?)');

    for (const dir of WORKSPACE_ROOTS) {
        if (!fs.existsSync(dir)) continue;
        const category = dir.split('/').pop() || 'Unknown';
        const files = listWorkspaceFiles(dir);

        for (const doc of files) {
            insertDoc.run(doc.id, doc.title, doc.path, doc.category, doc.updatedAt);
        }
    }
}

// ─── Schedule Jobs ────────────────────────────────────────────────────────────

function ingestScheduleJobs() {
    const launchdDir = path.join(WORKSPACE_ROOT, 'launchd');
    const insertJob = db.prepare('INSERT OR IGNORE INTO schedule_jobs (id, name, cron, nextRunAt, agentId) VALUES (?, ?, ?, ?, ?)');

    // 1. Ingest launchd services (system-level OpenClaw services)
    if (fs.existsSync(launchdDir)) {
        const plists = fs.readdirSync(launchdDir).filter(f => f.endsWith('.plist') || f.endsWith('.json'));
        for (const file of plists) {
            const id = file.replace(/\.(plist|json)$/, '');
            const name = id.replace(/^com\.[^.]+\./, '').replace(/\./g, ' ');
            insertJob.run(id, name, null, null, 'tron');
        }
    }

    // 2. Parse OpenClaw native cron jobs (The "Real" Jobs)
    const openclawCronPath = path.join(os.homedir(), '.openclaw', 'cron', 'jobs.json');
    if (fs.existsSync(openclawCronPath)) {
        try {
            const raw = fs.readFileSync(openclawCronPath, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.jobs)) {
                for (const job of parsed.jobs) {
                    if (!job.enabled) continue;
                    let cronExpr = null;
                    if (job.schedule?.kind === 'cron' && job.schedule?.expr) {
                        cronExpr = job.schedule.expr;
                    } else if (job.schedule?.kind === 'every' && job.schedule?.everyMs) {
                        // Convert "every X ms" to a simple cron for display if possible
                        let mins = Math.max(1, Math.round(job.schedule.everyMs / 60000));
                        if (mins < 60) {
                            cronExpr = `*/${mins} * * * *`;
                        } else {
                            // hourly etc
                            cronExpr = `0 */${Math.floor(mins/60)} * * *`;
                        }
                    }
                    const nextRun = job.state?.nextRunAtMs ? new Date(job.state.nextRunAtMs).toISOString() : null;
                    const agentId = job.agentId || 'tron';
                    insertJob.run(job.id, job.name, cronExpr, nextRun, agentId);
                }
            }
        } catch(e) {
            console.error('Failed to parse OpenClaw cron jobs.json:', e);
        }
    }

    // Seed defaults only if absolutely nothing was found
    const count = (db.prepare('SELECT COUNT(*) as c FROM schedule_jobs').get() as any).c;
    if (count === 0) {
        const defaults = [
            { id: 'morning-kickoff', name: 'Morning Kickoff', cron: '0 7 * * *' },
            { id: 'daily-digest', name: 'Daily Digest', cron: '0 9 * * *' },
            { id: 'trend-radar', name: 'Trend Radar', cron: '0 12 * * *' },
            { id: 'evening-wrap', name: 'Evening Wrap Up', cron: '0 21 * * *' },
            { id: 'heartbeat-check', name: 'Heartbeat Check', cron: '*/30 * * * *' },
        ];
        for (const job of defaults) {
            insertJob.run(job.id, job.name, job.cron, null, 'tron');
        }
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Run ingestion only if DB is effectively empty (first boot or reset) */
export function ensureSeeded() {
    const agentCount = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as any).c;
    if (agentCount === 0) {
        ingestWorkspace().catch(console.error);
    }
}
