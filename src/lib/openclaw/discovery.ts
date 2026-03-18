import fs from 'fs';
import path from 'path';
import os from 'os';
import { Agent } from '../types';
import { BASE_WORKSPACE } from '../config';

const WORKSPACE_ROOT = BASE_WORKSPACE;

export interface DiscoveredAgent extends Agent {
    folder?: string;
    layer?: 'governance' | 'pipeline' | 'automation';
    order?: number;
}

export function discoverAgents(): DiscoveredAgent[] {
    const registryPath = path.join(WORKSPACE_ROOT, 'agents', 'TEAM-REGISTRY.md');
    const governancePath = path.join(WORKSPACE_ROOT, 'TEAM_GOVERNANCE.md');

    if (!fs.existsSync(registryPath)) {
        console.warn('TEAM-REGISTRY.md not found at', registryPath);
        return [];
    }

    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    const governanceContent = fs.existsSync(governancePath) ? fs.readFileSync(governancePath, 'utf-8') : '';

    // 1. Parse Registry Table
    const agents = parseRegistryTable(registryContent);

    // 2. Load Global OpenClaw Config for Technical IDs
    const globalConfigPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(globalConfigPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
            const technicalAgents = config.agents?.list || [];
            
            agents.forEach(agent => {
                // Try to find a match in the technical config
                const match = technicalAgents.find((ta: any) => {
                    // Match by folder name comparison
                    if (agent.folder && ta.agentDir?.toLowerCase().includes(agent.folder.toLowerCase().replace(/\/$/, ''))) return true;
                    // Match by name
                    if (ta.name?.toLowerCase() === agent.id.toLowerCase()) return true;
                    // Rely on dynamic discovery via name and role
                    return false;
                    return false;
                });

                if (match) {
                    // Store technical ID but keep clean friendly name
                    agent.id = match.id;
                    if (match.identity?.name) agent.name = match.identity.name.replace(/-Agent|-Monitor|-Researcher|-Implementer|-Tester|-Orchestrator|-Scheduler|-Reviewer/g, '');
                }
            });
        } catch (err) {
            console.error('Failed to parse global openclaw.json', err);
        }
    }

    // 3. Deep Discovery (SOUL.md / AGENTS.md)
    for (const agent of agents) {
        if (agent.folder) {
            const agentDir = path.join(WORKSPACE_ROOT, agent.folder);
            enrichAgentMetadata(agent, agentDir);
        }
    }

    return agents;
}

function parseRegistryTable(content: string): DiscoveredAgent[] {
    const agents: DiscoveredAgent[] = [];
    const lines = content.split('\n');
    let inTable = false;

    for (const line of lines) {
        if (line.includes('| Name | Role | Folder |')) {
            inTable = true;
            continue;
        }
        if (inTable && line.includes('|') && !line.includes('---|')) {
            const parts = line.split('|').map(p => p.trim()).filter(p => p !== '');
            if (parts.length >= 3) {
                const nameMatch = parts[0].match(/\*\*?(.*?)\*\*?/);
                let name = nameMatch ? nameMatch[1] : parts[0];
                
                // Clean up technical suffixes for a friendly display name
                name = name.replace(/-Agent|-Monitor|-Researcher|-Implementer|-Tester|-Orchestrator|-Scheduler|-Reviewer/g, '');

                // Strip common titles for a cleaner ID
                const id = name.toLowerCase()
                    .replace(/-agent|-monitor|-researcher|-implementer|-tester|-orchestrator|-scheduler|-reviewer/g, '');
                
                agents.push({
                    id,
                    name,
                    role: parts[1],
                    folder: parts[2].replace(/`/g, ''),
                    status: 'idle',
                    mission: '',
                    responsibilities: []
                });
            }
        } else if (inTable && line.trim() === '') {
            // End of table (simple heuristic)
            // inTable = false; 
        }
    }

    return agents;
}

function enrichAgentMetadata(agent: DiscoveredAgent, dir: string) {
    const soulPath = path.join(dir, 'SOUL.md');
    const agentsMdPath = path.join(dir, 'AGENTS.md');

    if (!fs.existsSync(dir)) {
        // Try fallback directory naming without "-agent" etc
        const baseDir = dir.split('/').pop()?.split('-')[0];
        const altDir = path.join(WORKSPACE_ROOT, 'agents', baseDir || '');
        if (fs.existsSync(altDir)) dir = altDir;
    }

    // Store relative folder path for reference
    agent.folder = path.relative(WORKSPACE_ROOT, dir);

    if (fs.existsSync(soulPath)) {
        const content = fs.readFileSync(soulPath, 'utf-8');
        agent.soulContent = content; // Store full content for Role Card

        // Extract Mission: Look for "Core Identity" section or first paragraph
        const missionMatch = content.match(/## Core Identity[\s\S]*?- \*\*Mission:\*\* (.*)/i) || 
                           content.match(/You are \*\*.*?\*\*, (.*)/i);
        if (missionMatch) {
            agent.mission = missionMatch[1].trim();
        }
    } else if (fs.existsSync(agentsMdPath)) {
        const content = fs.readFileSync(agentsMdPath, 'utf-8');
        agent.soulContent = content; // Fallback to AGENTS.md content
    }

    if (fs.existsSync(agentsMdPath)) {
        const content = fs.readFileSync(agentsMdPath, 'utf-8');
        // Extract Responsibilities from "Skills" or "Typical Tasks"
        const skillsSection = content.match(/## Skills\n([\s\S]*?)(?:\n##|$)/i) ||
                             content.match(/## Role\n([\s\S]*?)(?:\n##|$)/i);
        if (skillsSection) {
            agent.responsibilities = skillsSection[1]
                .split('\n')
                .map((l: string) => l.replace(/^-\s*/, '').trim())
                .filter((l: string) => l !== '' && !l.startsWith('#'));
        }
    }
}

function applyGovernance(agents: DiscoveredAgent[], content: string) {
    // Determine layers
    // 1. Governance (Orchestrator role)
    const orchestrator = agents.find(a => 
        a.role.toLowerCase().includes('orchestrat') || 
        a.role.toLowerCase().includes('governance')
    );
    if (orchestrator) {
        orchestrator.layer = 'governance';
        orchestrator.order = 0;
    }

    // 2. Automation (Automation/Cron roles)
    agents.forEach(a => {
        const role = a.role.toLowerCase();
        const id = a.id.toLowerCase();
        
        if (id.includes('monitor') || id.includes('heartbeat') || role.includes('automation') || role.includes('cron') || role.includes('monitor')) {
            a.layer = 'automation';
            a.order = 100;
        }
    });

    // 3. Pipeline (The rest)
    // Extract pipeline order: Researcher -> Builder -> Tester
    const pipelineMatch = content.match(/Matt \(creates\) → (.*) → Done/);
    if (pipelineMatch) {
        const flow = pipelineMatch[1].split('→').map(s => s.trim().split(' ')[0].toLowerCase());
        
        agents.forEach(agent => {
            // If already assigned layer, don't move to pipeline unless explicitly ordered
            if (agent.layer && agent.layer !== 'pipeline') return;

            // Match against ID or friendly name
            const index = flow.findIndex(f => 
                agent.id.toLowerCase().startsWith(f) || 
                agent.name.toLowerCase().startsWith(f)
            );
            
            if (index !== -1) {
                agent.layer = 'pipeline'; // Ensure it's marked as pipeline if in flow
                agent.order = index + 1; // 1-based order
            }
        });
    }
}
