import fs from 'fs';
import path from 'path';
import os from 'os';
import { Agent } from '../types';
import { BASE_WORKSPACE } from '../config';

const WORKSPACE_ROOT = BASE_WORKSPACE;

export interface DiscoveredAgent extends Agent {
    model?: string;
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

    // 1.5. Check for Primary Agent (Max) in Workspace Root
    const rootSoulPath = path.join(WORKSPACE_ROOT, 'soul.md');
    const rootIdentityPath = path.join(WORKSPACE_ROOT, 'identity.md');
    
    if (fs.existsSync(rootSoulPath) || fs.existsSync(rootIdentityPath)) {
        const soulContent = fs.existsSync(rootSoulPath) ? fs.readFileSync(rootSoulPath, 'utf-8') : '';
        const identityContent = fs.existsSync(rootIdentityPath) ? fs.readFileSync(rootIdentityPath, 'utf-8') : '';
        
        // Extract name/vibe from identity if possible
        const nameMatch = identityContent.match(/Name:\*\*? (.*)/i) || identityContent.match(/- \*\*Name:\*\* (.*)/i);
        const name = nameMatch ? nameMatch[1].trim() : 'Max';
        
        agents.unshift({
            id: 'main',
            name: name,
            role: 'Primary Orchestrator & Companion',
            mission: 'An autonomous organization of AI agents that does work for me and produces value 24/7',
            status: 'idle',
            responsibilities: ['Governance', 'Task Routing', 'System Monitoring', 'User Interaction'],
            folder: '.',
            soulContent: soulContent || identityContent,
            layer: 'governance',
            order: 0
        });
    }

    // 2. Load Global OpenClaw Config for Technical IDs
    const globalConfigPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
    if (fs.existsSync(globalConfigPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
            const technicalAgents = config.agents?.list || [];
            
            agents.forEach(agent => {
                // Skip the main agent, it already has its ID and metadata
                if (agent.id === 'main') return;

                // Try to find a match in the technical config
                const match = technicalAgents.find((ta: any) => {
                    // Match by folder name comparison (more robust)
                    if (agent.folder && ta.agentDir && ta.agentDir.toLowerCase().endsWith(agent.folder.toLowerCase())) return true;
                    // Match by name as a fallback
                    if (ta.name?.toLowerCase() === agent.id.replace(/^agent-/, '').toLowerCase()) return true;
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

    // 4. Determine Layers (Governance/Pipeline/Automation)
    applyGovernance(agents, governanceContent);

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

                // Skip Max - handled separately via workspace root IDENTITY.md
                if (name.toLowerCase() === 'max') continue;

                // Strip common titles for a cleaner ID, but keep it unique
                const baseId = name.toLowerCase()
                    .replace(/-agent|-monitor|-researcher|-implementer|-tester|-orchestrator|-scheduler|-reviewer/g, '');
                
                const id = `agent-${baseId}`;
                
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
        
        // Extract Agent Type from SOUL.md (e.g., "Model: openai-codex/gpt-5.4")
        const typeMatch = content.match(/- \*\*Model:\*\* (.*)/i);
        if (typeMatch) {
            agent.model = typeMatch[1].trim();
        }
    } else if (fs.existsSync(agentsMdPath)) {
        const content = fs.readFileSync(agentsMdPath, 'utf-8');
        agent.soulContent = content; // Fallback to AGENTS.md content
    }

    if (fs.existsSync(agentsMdPath)) {
        const content = fs.readFileSync(agentsMdPath, 'utf-8');
        
        // Extract Agent Type from AGENTS.md (e.g., "## Type: researcher" or in Role section)
        const typeMatch = content.match(/## Type:\s*(\w+)/i) ||
                        content.match(/type[=\s]+['"]?(\w+)['"]?/i);
        if (typeMatch) {
            agent.type = typeMatch[1].toLowerCase();
        }
        
        // Extract Responsibilities from "Skills" or "Typical Tasks"
        const skillsSection = content.match(/## Skills\n([\s\S]*?)(?:\n##|$)/i) ||
                             content.match(/## Typical Tasks\n([\s\S]*?)(?:\n##|$)/i) ||
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
    // Layer assignment priority: governance > automation > pipeline
    // Agents already assigned a layer in earlier passes won't be reassigned

    // 1. Governance (Orchestrator role)
    const orchestrator = agents.find(a => 
        a.role.toLowerCase().includes('orchestrat') || 
        a.role.toLowerCase().includes('governance')
    );
    if (orchestrator) {
        orchestrator.layer = 'governance';
        orchestrator.order = 0;
    }

    // 2. Automation (Automation/Cron/SRE/Security roles)
    agents.forEach(a => {
        if (a.layer) return; // Already assigned
        
        const role = a.role.toLowerCase();
        const id = a.id.toLowerCase();
        const type = (a.type || '').toLowerCase();
        
        if (id.includes('monitor') || id.includes('heartbeat') || 
            role.includes('automation') || role.includes('cron') || 
            role.includes('monitor') || role.includes('reliability') ||
            type === 'sre' || type === 'security' || type === 'automation') {
            a.layer = 'automation';
            a.order = 100;
        }
    });

    // 3. Pipeline (The rest)
    // Extract pipeline order: Researcher -> Builder -> Tester
    const pipelineMatch = content.match(/Matt \(creates\) → (.*) → Done/);
    
    // Base pipeline order from flow
    const flowOrder: Record<string, number> = {};
    if (pipelineMatch) {
        const flow = pipelineMatch[1].split('→').map(s => s.trim().split(' ')[0].toLowerCase());
        flow.forEach((f, i) => { flowOrder[f] = i + 1; });
    }
    
    // Type-based pipeline order fallback
    const typeOrder: Record<string, number> = {
        'researcher': 1,
        'ux': 2,
        'product': 2,
        'builder': 3,
        'prototyper': 3,
        'tester': 4,
        'reviewer': 5
    };
    
    agents.forEach(agent => {
        // If already assigned governance or automation, skip
        if (agent.layer === 'governance' || agent.layer === 'automation') return;
        
        // Check if explicitly in the flow
        const flowIndex = Object.keys(flowOrder).findIndex(f => 
            agent.id.toLowerCase().startsWith(f) || 
            agent.name.toLowerCase().startsWith(f)
        );
        
        if (flowIndex !== -1) {
            agent.layer = 'pipeline';
            agent.order = Object.values(flowOrder)[flowIndex];
        } else if (agent.type) {
            // Infer from type
            const type = agent.type.toLowerCase();
            if (type in typeOrder) {
                agent.layer = 'pipeline';
                agent.order = typeOrder[type] + (agent.order || 0);
            }
        }
        
        // Fallback: any agent with a type but no layer gets pipeline
        if (!agent.layer && agent.type) {
            agent.layer = 'pipeline';
            agent.order = agent.order || 50;
        }
    });
}
