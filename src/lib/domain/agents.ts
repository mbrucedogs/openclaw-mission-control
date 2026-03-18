import { Agent } from '../types';
import { discoverAgents } from '../openclaw/discovery';
import { db } from '../db';

export function getAgentById(id: string): Agent | null {
    const agents = getAgents();
    return agents.find(a => a.id === id) || null;
}

export function updateAgentType(id: string, type: string) {
    db.prepare('UPDATE agents SET type = ? WHERE id = ?').run(type, id);
}

export function getAgents(): Agent[] {
    // Discovery from OpenClaw Workspace files (New Source of Truth)
    const discovered = discoverAgents();

    // Sync with DB (Ensure all discovered agents exist in SQLite for status tracking/tasks)
    const upsertAgent = db.prepare(`
        INSERT INTO agents (id, name, role, mission, status) 
        VALUES (?, ?, ?, ?, 'idle')
        ON CONFLICT(id) DO UPDATE SET 
            name=excluded.name, 
            role=excluded.role, 
            mission=excluded.mission
    `);

    discovered.forEach(agent => {
        upsertAgent.run(agent.id, agent.name, agent.role, agent.mission);
    });

    // Mapping live statuses and explicit types from DB
    const dbAgents = db.prepare('SELECT id, status, type FROM agents').all() as any[];
    const dbDataMap = new Map(dbAgents.map(a => [a.id, { status: a.status, type: a.type }]));

    return discovered.map(agent => {
        const dbData = dbDataMap.get(agent.id);

        return {
            ...agent,
            status: dbData?.status || 'idle',
            type: dbData?.type || undefined
        };
    });
}
