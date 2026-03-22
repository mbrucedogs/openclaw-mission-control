import { getAgentsWithGateway } from '@/lib/domain/agents';
import TeamClient from './TeamClient';

export default async function TeamPage() {
    const agents = await getAgentsWithGateway();

    return <TeamClient agents={agents} />;
}
