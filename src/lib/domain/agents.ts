import { Agent } from '../types';
import { discoverAgents } from '../openclaw/discovery';
import { db } from '../db';

export function getAgentById(id: string): Agent | null {
    const agents = getAgents();
    return agents.find(a => a.id === id) || null;
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

    // Mapping live statuses from DB
    const dbAgents = db.prepare('SELECT id, status FROM agents').all() as any[];
    const statusMap = new Map(dbAgents.map(a => [a.id, a.status]));

    return discovered.map(agent => {
        // Fallback for ID mapping if legacy statuses exist
        let status = statusMap.get(agent.id);
        if (!status && agent.id === 'main') status = statusMap.get('max');
        if (!status && agent.id === 'alice-researcher') status = statusMap.get('alice');
        if (!status && agent.id === 'bob-implementer') status = statusMap.get('bob');
        if (!status && agent.id === 'charlie-tester') status = statusMap.get('charlie');

        return {
            ...agent,
            status: (status as any) || 'idle'
        };
    });
}
