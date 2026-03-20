import { getAgents } from '@/lib/domain/agents';
import { OfficeClient } from './OfficeClient';

export default async function OfficePage() {
    const agents = await getAgents();
    return <OfficeClient agents={agents} />;
}
