import { getAgentsWithGateway } from '@/lib/domain/agents';
import { OfficeClient } from './OfficeClient';

export default async function OfficePage() {
    const agents = await getAgentsWithGateway();
    return <OfficeClient agents={agents} />;
}
