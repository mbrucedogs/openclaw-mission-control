import { getAgents } from '@/lib/domain/agents';
import TeamClient from './TeamClient';

export default async function TeamPage() {
    const agents = await getAgents();

    return <TeamClient agents={agents} />;
}
