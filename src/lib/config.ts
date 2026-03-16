export const WORKSPACE_ROOTS = [
    '/Volumes/Data/openclaw/workspace/memory',
    '/Volumes/Data/openclaw/workspace/tmp',
    '/Volumes/Data/openclaw/workspace/docs',
    '/Volumes/Data/openclaw/workspace/projects/Web/alex-mission-control/docs/plans',
    '/Volumes/Data/openclaw/workspace/projects/Documents',
];

export const EXCLUDED_FOLDERS = [
    'node_modules',
    '.next',
    '.git',
    'dist',
    'build',
    '.gemini',
    'bl-mission-control', // Exclude the other project's folder if it exists in roots
];

export const ALLOWED_EXTENSIONS = ['.md', '.txt'];
