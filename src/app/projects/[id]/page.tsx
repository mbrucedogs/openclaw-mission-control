import { getProject, getProjectTasks } from '@/lib/domain/projects';
import { use } from 'react';
import Link from 'next/link';
import { Circle } from 'lucide-react';
import ProjectDetailClient from './ProjectDetailClient';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const project = getProject(id);
    const tasks = getProjectTasks(id);

    if (!project) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
            <Circle className="w-12 h-12 mb-4 text-slate-600" />
            <p className="text-lg font-bold">Project not found</p>
            <Link href="/projects" className="mt-4 text-sm text-emerald-500 hover:underline">Back to Projects</Link>
        </div>
    );

    return <ProjectDetailClient project={project} tasks={tasks} />;
}
