import { getLocalDocuments } from '@/lib/domain/documents';
import { DocsClient } from './DocsClient';

export default function DocsPage() {
    const docs = getLocalDocuments();
    return <DocsClient docs={docs} />;
}
