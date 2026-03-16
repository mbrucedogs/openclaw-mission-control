import { db } from '../db';
import { Agent } from '../types';

export function getAgents(): Agent[] {
    const agents = db.prepare('SELECT * FROM agents').all() as any[];

    return agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        mission: agent.mission,
        status: agent.status,
        responsibilities: db.prepare('SELECT description FROM responsibilities WHERE agentId = ?')
            .all(agent.id)
            .map((r: any) => r.description)
    }));
}
