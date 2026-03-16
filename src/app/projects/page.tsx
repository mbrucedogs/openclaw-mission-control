import { getProjects } from '@/lib/domain/projects';
import ProjectsClient from './ProjectsClient';

export default function ProjectsPage() {
    const projects = getProjects();
    return <ProjectsClient projects={projects} />;
}
