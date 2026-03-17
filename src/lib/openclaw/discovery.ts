import fs from 'fs';
import path from 'path';
import { Agent } from '../types';

const WORKSPACE_ROOT = '/Volumes/Data/openclaw/workspace';

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
    const globalConfigPath = '/Users/mattbruce/.openclaw/openclaw.json';
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
                    // Fallback for Max
                    if (agent.id === 'max' && ta.id === 'main') return true;
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

    // 4. Fallbacks for standard agents if not fully discovered
    ensureDefaultMetadata(agents);

    // 5. Hierarchy & Governance
    if (governanceContent) {
        applyGovernance(agents, governanceContent);
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

    // Ensure core infrastructure agents exist
    const coreIds = ['max', 'tron', 'aegis'];
    coreIds.forEach(id => {
        if (!agents.find(a => a.id === id)) {
            agents.push({
                id,
                name: id.charAt(0).toUpperCase() + id.slice(1),
                role: id === 'max' ? 'Orchestrator' : (id === 'tron' ? 'Automation' : 'Reviewer'),
                status: 'idle',
                mission: '',
                responsibilities: [],
                folder: `agents/${id}-agent` // Heuristic
            });
        }
    });

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
                .map(l => l.replace(/^-\s*/, '').trim())
                .filter(l => l !== '' && !l.startsWith('#'));
        }
    }
}

function applyGovernance(agents: DiscoveredAgent[], content: string) {
    // Determine layers
    // 1. Governance (Max / Orchestrator)
    const max = agents.find(a => 
        a.id === 'max' || a.id === 'main' || 
        a.role.toLowerCase().includes('orchestrat') || 
        a.name.toLowerCase() === 'max'
    );
    if (max) {
        max.layer = 'governance';
        max.order = 0;
    }

    // 2. Automation (Tron / Monitors)
    agents.forEach(a => {
        const id = a.id.toLowerCase();
        const role = a.role.toLowerCase();
        const name = a.name.toLowerCase();
        
        if (id === 'tron' || name === 'tron' || id.includes('monitor') || id.includes('heartbeat') || role.includes('automation') || role.includes('cron')) {
            a.layer = 'automation';
            a.order = 100;
        }
    });

    // 3. Pipeline (The rest)
    // Extract pipeline order: Alice -> Bob -> Charlie
    const pipelineMatch = content.match(/Matt \(creates\) → (.*) → Done/);
    if (pipelineMatch) {
        const flow = pipelineMatch[1].split('→').map(s => s.trim().split(' ')[0].toLowerCase());
        
        agents.forEach(agent => {
            // If already assigned layer (Max/Tron), don't move to pipeline unless explicitly ordered
            if (agent.layer && agent.layer !== 'pipeline') return;

            // Match against ID or friendly name
            const index = flow.findIndex(f => 
                agent.id.toLowerCase().startsWith(f) || 
                agent.name.toLowerCase().startsWith(f)
            );
            
            if (index !== -1) {
                agent.layer = 'pipeline';
                agent.order = index + 1;
            } else if (!agent.layer) {
                agent.layer = 'pipeline';
                agent.order = 50; // Default middle
            }
        });
    } else {
        // Fallback categorization based on role keywords
        agents.forEach(agent => {
            if (agent.layer) return;
            const role = agent.role.toLowerCase();
            if (role.includes('orchestrat') || role.includes('governance')) {
                agent.layer = 'governance';
            } else if (role.includes('automation') || role.includes('cron') || role.includes('monitor')) {
                agent.layer = 'automation';
            } else {
                agent.layer = 'pipeline';
            }
        });
    }
}

function ensureDefaultMetadata(agents: DiscoveredAgent[]) {
    const defaults: Record<string, Partial<DiscoveredAgent>> = {
        main: { mission: 'Conductor, not musician. Breaks work into steps and delegates.', responsibilities: ['Decomposition', 'Delegation', 'Coordination'] },
        max: { mission: 'Conductor, not musician. Breaks work into steps and delegates.', responsibilities: ['Decomposition', 'Delegation', 'Coordination'] },
        alice: { mission: 'Intelligence gatherer. All research flows through Alice.', responsibilities: ['Information Gathering', 'Analysis', 'Context'] },
        'alice-researcher': { mission: 'Intelligence gatherer. All research flows through Alice.', responsibilities: ['Information Gathering', 'Analysis', 'Context'] },
        bob: { mission: 'Builder. All implementation flows through Bob.', responsibilities: ['Coding', 'Development', 'Refactoring'] },
        'bob-implementer': { mission: 'Builder. All implementation flows through Bob.', responsibilities: ['Coding', 'Development', 'Refactoring'] },
        charlie: { mission: 'Quality gatekeeper. All testing flows through Charlie.', responsibilities: ['Testing', 'Validation', 'Reports'] },
        'charlie-tester': { mission: 'Quality gatekeeper. All testing flows through Charlie.', responsibilities: ['Testing', 'Validation', 'Reports'] },
        aegis: { mission: 'Validator. All final approval flows through Aegis.', responsibilities: ['Validation', 'Standards', 'Approval'] },
        tron: { mission: 'Scheduler. All automated/recurring work flows through Tron.', responsibilities: ['Cron Jobs', 'Scheduled Work', 'Triggers'] },
    };

    for (const agent of agents) {
        const id = agent.id.toLowerCase();
        if ((!agent.mission || agent.mission === '') && defaults[id]) {
            agent.mission = defaults[id].mission!;
        }
        if (agent.responsibilities?.length === 0 && defaults[id]) {
            agent.responsibilities = defaults[id].responsibilities!;
        }
    }
}
