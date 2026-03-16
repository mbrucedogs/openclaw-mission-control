import { getAgents } from '@/lib/domain/agents';
import { OfficeClient } from './OfficeClient';

export default function OfficePage() {
    const agents = getAgents();
    return <OfficeClient agents={agents} />;
}
