'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
    preview?: boolean;
}

function stripHtml(content: string): string {
    return content.replace(/<[^>]*>/g, '');
}

function getPreviewContent(content: string): string {
    const cleaned = stripHtml(content);
    const firstParagraph = cleaned.trim().split(/\n\s*\n/)[0] || '';
    if (firstParagraph.length <= 240) return firstParagraph;
    return `${firstParagraph.slice(0, 240)}...`;
}

export function MarkdownRenderer({ content, preview = false }: MarkdownRendererProps) {
    if (!content?.trim()) return null;

    const cleaned = stripHtml(content);
    const markdownContent = preview ? getPreviewContent(content) : cleaned;

    return (
        <div className={`prose prose-invert max-w-none ${preview ? 'text-xs' : 'text-sm'}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => <h1 className={`${preview ? 'text-sm' : 'text-xl'} font-black text-slate-100 mb-4`}>{children}</h1>,
                    h2: ({ children }) => <h2 className={`${preview ? 'text-xs' : 'text-lg'} font-black text-slate-200 mb-3`}>{children}</h2>,
                    h3: ({ children }) => <h3 className={`${preview ? 'text-xs' : 'text-base'} font-black text-slate-300 mb-2`}>{children}</h3>,
                    p: ({ children }) => <p className={`text-slate-400 font-medium leading-relaxed ${preview ? 'text-xs mb-2' : 'text-base mb-4'}`}>{children}</p>,
                    ul: ({ children }) => <ul className={`list-disc list-inside space-y-1 text-slate-400 ${preview ? 'text-xs mb-2' : 'mb-4'}`}>{children}</ul>,
                    ol: ({ children }) => <ol className={`list-decimal list-inside space-y-1 text-slate-400 ${preview ? 'text-xs mb-2' : 'mb-4'}`}>{children}</ol>,
                    li: ({ children }) => <li className="text-slate-400 font-medium">{children}</li>,
                    code: ({ children, className }) => {
                        const isInline = !className;
                        return (
                            <code className={isInline 
                                ? "bg-[#1a1a1a] text-blue-400 px-1.5 py-0.5 rounded text-[0.9em] font-mono"
                                : "block bg-[#09090b] border border-[#1a1a1a] rounded-xl p-4 overflow-x-auto text-[0.9em] font-mono text-slate-300 my-4"
                            }>
                                {children}
                            </code>
                        );
                    },
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-indigo-500/50 bg-indigo-500/5 pl-4 py-2 italic text-slate-400 my-4 rounded-r-lg">
                            {children}
                        </blockquote>
                    ),
                    a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 underline decoration-blue-500/30 underline-offset-4 font-bold transition-colors">
                            {children}
                        </a>
                    ),
                    strong: ({ children }) => <strong className="font-black text-slate-100">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                    hr: () => <hr className="border-[#1a1a1a] my-8" />,
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-6 border border-[#1a1a1a] rounded-xl">
                            <table className="w-full text-left text-sm border-collapse">{children}</table>
                        </div>
                    ),
                    thead: ({ children }) => <thead className="bg-[#101010] text-slate-400 font-black uppercase tracking-widest text-[10px]">{children}</thead>,
                    th: ({ children }) => <th className="px-4 py-3 border-b border-[#1a1a1a]">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-3 border-b border-[#1a1a1a] text-slate-400">{children}</td>,
                }}
            >
                {markdownContent}
            </ReactMarkdown>
        </div>
    );
}
