'use client';

import { useState, useEffect } from 'react';

export default function TestTaskPage() {
    const [task, setTask] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [tRes, cRes] = await Promise.all([
                    fetch('/api/tasks/task-d98ed377'),
                    fetch('/api/tasks/task-d98ed377/comments'),
                ]);
                
                if (!tRes.ok) throw new Error('Task fetch failed');
                if (!cRes.ok) throw new Error('Comments fetch failed');
                
                const tData = await tRes.json();
                const cData = await cRes.json();
                
                console.log('Task:', tData);
                console.log('Comments:', cData);
                
                setTask(tData);
                setComments(cData);
            } catch (err: any) {
                setError(err.message);
            }
            setLoading(false);
        };
        
        load();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading...</div>;
    if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
    
    return (
        <div className="p-8 bg-black text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Test Task Page</h1>
            
            <div className="mb-8 p-4 border border-gray-700 rounded">
                <h2 className="text-xl font-bold mb-2">Task</h2>
                <p><strong>ID:</strong> {task?.id}</p>
                <p><strong>Title:</strong> {task?.title}</p>
                <p><strong>Status:</strong> {task?.status}</p>
                <p><strong>Owner:</strong> {task?.owner}</p>
            </div>
            
            <div className="p-4 border border-gray-700 rounded">
                <h2 className="text-xl font-bold mb-2">Comments ({comments.length})</h2>
                {comments.length === 0 ? (
                    <p className="text-gray-500">No comments</p>
                ) : (
                    <div className="space-y-4">
                        {comments.map((c: any) => (
                            <div key={c.id} className="p-3 bg-gray-900 rounded">
                                <p><strong>Author:</strong> {c.author}</p>
                                <p><strong>Type:</strong> {c.commentType}</p>
                                <p className="mt-2 whitespace-pre-wrap">{c.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
