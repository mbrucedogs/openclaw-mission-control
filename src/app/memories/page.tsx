import { getMemories } from '@/lib/domain/memories';
import { MemoriesClient } from './MemoriesClient';

export default async function MemoriesPage() {
    const memories = await getMemories();
    return <MemoriesClient memories={memories} />;
}
