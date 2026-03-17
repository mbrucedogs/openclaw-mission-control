import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const API_URL = 'http://127.0.0.1:4000/api/tasks';
const ACTIVITY_URL = 'http://127.0.0.1:4000/api/activity';
const POLL_INTERVAL_MS = 15000;
const API_KEY = process.env.API_KEY || 'ab7b2a5c2d931b9092784ce71e879138d92108c90fd8e6899a4c5e3fc0d89429';

// Internal mission control owners mapped to actual OpenClaw CLI agent IDs
const AGENT_MAP: Record<string, string> = {
    max: 'main',
    alice: 'alice-researcher',
    bob: 'bob-implementer',
    charlie: 'charlie-tester',
    aegis: 'aegis',
    tron: 'tron',
};

// Keep track of the last time we processed a task to avoid spamming the agent
// Map of TaskId -> LastUpdatedAt string
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

async function triggerAgent(task: any, openclawAgentId: string) {
    const rawMessage = `Mission Control task updated: "${task.title}". Check the board and execute your phase per TEAM_GOVERNANCE.md`;
    // Properly escape double quotes and backticks for the shell
    const safeMessage = rawMessage.replace(/"/g, '\\"').replace(/`/g, '\\`');
    
    console.log(`[Orchestrator] 🚀 Spawning ${openclawAgentId} for task: ${task.title}`);
    await logActivity(`Woke up agent ${openclawAgentId} to process task "${task.title}"`, 'system');
    
    try {
        // Run openclaw in the background so it doesn't block the polling loop
        // The agent will pick up the task via its heartbeat/direct instructions.
        const cmd = `openclaw agent --agent ${openclawAgentId} --message "${safeMessage}"`;
        execAsync(cmd).catch(err => {
            console.error(`[Orchestrator] Agent ${openclawAgentId} failed to run:`, err);
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
        // Only trigger agents for tasks that are waiting for action
        if (task.status !== 'Backlog' && task.status !== 'In Progress' && task.status !== 'Review') {
            continue;
        }

        // Must be assigned to an agent we manage
        const agentId = AGENT_MAP[task.owner];
        if (!agentId) continue;

        const lastProcessedAt = processedTasks.get(task.id);
        
        // If we haven't processed this task yet, OR it has been updated since we last processed it
        if (!lastProcessedAt || new Date(task.updatedAt) > new Date(lastProcessedAt)) {
            processedTasks.set(task.id, task.updatedAt);
            await triggerAgent(task, agentId);
        }
    }
}

console.log('===================================================');
console.log('🤖 OpenClaw Orchestrator Worker Pool Started');
console.log(`🔗 Polling: ${API_URL}`);
console.log(`⏱️  Interval: ${POLL_INTERVAL_MS / 1000} seconds`);
console.log('===================================================');

// Run immediately, then interval
poll();
setInterval(poll, POLL_INTERVAL_MS);
