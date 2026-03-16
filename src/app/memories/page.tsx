import { getMemories } from '@/lib/domain/memories';
import { MemoriesClient } from './MemoriesClient';

export default function MemoriesPage() {
    const memories = getMemories();
    return <MemoriesClient memories={memories} />;
}
