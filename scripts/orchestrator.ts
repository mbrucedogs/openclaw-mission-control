import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const API_URL = 'http://127.0.0.1:4000/api/tasks';
const ACTIVITY_URL = 'http://127.0.0.1:4000/api/activity';
const POLL_INTERVAL_MS = 15000;
const API_KEY = process.env.API_KEY || 'ab7b2a5c2d931b9092784ce71e879138d92108c90fd8e6899a4c5e3fc0d89429';

// Keep track of the last time we processed a task to avoid spamming
const processedTasks = new Map<string, string>();

async function fetchTasks() {
    try {
        const res = await fetch(API_URL, {
            headers: { 'X-API-Key': API_KEY }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json() as any[];
    } catch (err) {
        console.error(`[Orchestrator] Failed to fetch tasks: ${err}`);
        return [];
    }
}

async function logActivity(message: string, actor: string) {
    try {
        await fetch(ACTIVITY_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify({ message, actor, type: 'trigger' })
        });
    } catch (err) {
        console.error(`[Orchestrator] Failed to log activity: ${err}`);
    }
}

async function wakeMax(task: any) {
    const rawMessage = `ORCHESTRATOR TASK: Task "${task.title}" (ID: ${task.id}) needs pipeline analysis and execution. Status: ${task.status}, Owner: ${task.owner || 'unassigned'}. Analyze task, determine pipeline (predefined or create dynamic), and manage full execution per ORCHESTRATION.md. Answer agent questions, validate evidence at each handoff, and only assign back to matt if you cannot resolve (with detailed comments).`;
    const safeMessage = rawMessage.replace(/"/g, '\\"').replace(/`/g, '\\`');
    
    console.log(`[Orchestrator] 🚀 Waking Max for task: ${task.title} (${task.id})`);
    await logActivity(`Waking Max to orchestrate task "${task.title}"`, 'system');
    
    try {
        // Wake Max (main agent) to handle orchestration
        const cmd = `openclaw agent --agent main --message "${safeMessage}"`;
        execAsync(cmd).catch(err => {
            console.error(`[Orchestrator] Failed to wake Max:`, err);
        });
    } catch (err) {
        console.error(`[Orchestrator] Failed to exec:`, err);
    }
}

async function poll() {
    console.log(`[Orchestrator] Polling Mission Control (${new Date().toLocaleTimeString()})...`);
    
    const tasks = await fetchTasks();
    if (!Array.isArray(tasks)) return;

    for (const task of tasks) {
        // Only wake Max for:
        // 1. Tasks in Backlog (need pipeline analysis)
        // 2. Tasks assigned to Max (need orchestration)
        // 3. Tasks in Review where Max needs to validate and route next
        const needsMax = 
            task.status === 'Backlog' ||
            task.owner === 'max' ||
            (task.status === 'Review' && task.handoverFrom);

        if (!needsMax) continue;

        const lastProcessedAt = processedTasks.get(task.id);
        const taskUpdatedAt = task.updatedAt || task.createdAt;
        
        // Only wake Max if task is new or has been updated since last check
        if (!lastProcessedAt || new Date(taskUpdatedAt) > new Date(lastProcessedAt)) {
            processedTasks.set(task.id, taskUpdatedAt);
            await wakeMax(task);
        }
    }
}

console.log('===================================================');
console.log('🤖 OpenClaw Orchestrator Worker Pool Started');
console.log(`🔗 Polling: ${API_URL}`);
console.log(`⏱️  Interval: ${POLL_INTERVAL_MS / 1000} seconds`);
console.log('🎯 Max (Orchestrator) manages all pipeline execution');
console.log('===================================================');

// Run immediately, then interval
poll();
setInterval(poll, POLL_INTERVAL_MS);
