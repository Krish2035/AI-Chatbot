import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Transforms plain text headings or tabbed text into valid ChatGPT GFM Markdown
 */
function formatChatGPTMarkdown(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    .replace(/\r\n/g, '\n');

  // Known headers that should be formatted as ChatGPT ### Headings
  const knownHeaders = [
    'Executive Summary',
    'Key Findings',
    'Detailed Breakdown',
    'Technical Skills Table',
    'Technical Skills',
    'Project Highlights',
    'Project Highlights (Skill Application)',
    'Core Strengths',
    'Summary',
    'Conclusion',
    'Reasoning & Evidence',
    'Overview'
  ];

  knownHeaders.forEach((h) => {
    // Escape header for regex
    const escaped = h.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
    const regex = new RegExp(`^(?!#+)(?:\\s*)${escaped}\\s*$`, 'gim');
    cleaned = cleaned.replace(regex, `\n### 📌 ${h}\n`);
  });

  // Convert tab/space separated rows into GFM Markdown Pipe Tables
  const lines = cleaned.split('\n');
  const processedLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line looks like a table row with tabs or multi-space gaps
    if (
      (line.includes('\t') || (line.includes('   ') && !trimmed.startsWith('-') && !trimmed.startsWith('*') && !trimmed.startsWith('#'))) &&
      !trimmed.startsWith('|')
    ) {
      const parts = line.split(/\t+|\s{3,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (!inTable) {
          inTable = true;
          processedLines.push(`\n| ${parts.join(' | ')} |`);
          processedLines.push(`| ${new Array(parts.length).fill('---').join(' | ')} |`);
        } else {
          processedLines.push(`| ${parts.join(' | ')} |`);
        }
        continue;
      }
    } else if (trimmed.startsWith('|')) {
      inTable = true;
      processedLines.push(line);
      continue;
    }

    inTable = false;
    processedLines.push(line);
  }

  return processedLines.join('\n');
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const formattedContent = formatChatGPTMarkdown(content);

  return (
    <div className="prose prose-invert max-w-none text-xs sm:text-sm leading-relaxed overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Styled ChatGPT-grade GFM Tables
          table: ({ node, ...props }) => (
            <div className="my-4 w-full overflow-x-auto rounded-xl border border-cyan-500/30 bg-slate-950/90 shadow-2xl backdrop-blur-md">
              <table className="w-full text-left text-xs border-collapse min-w-[550px]" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead
              className="bg-gradient-to-r from-slate-900 via-cyan-950/80 to-slate-900 text-cyan-300 font-bold uppercase tracking-wider text-[11px] border-b border-cyan-500/40"
              {...props}
            />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 border-r border-cyan-500/20 last:border-r-0 font-bold text-cyan-300 bg-cyan-500/10"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-4 py-2.5 border-t border-white/10 border-r border-white/5 last:border-r-0 text-gray-200 leading-relaxed text-xs align-top font-normal"
              {...props}
            />
          ),
          tr: ({ node, ...props }) => (
            <tr
              className="hover:bg-cyan-500/10 transition-colors odd:bg-slate-900/50 even:bg-slate-950/70"
              {...props}
            />
          ),
          // Headings
          h1: ({ node, ...props }) => (
            <h1 className="text-lg font-extrabold text-white mt-5 mb-3 border-b border-cyan-500/30 pb-1.5 flex items-center space-x-2 text-cyan-300" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-base font-bold text-white mt-4 mb-2 border-b border-cyan-500/20 pb-1 text-cyan-300" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-sm font-bold text-cyan-300 mt-4 mb-2 border-b border-cyan-500/20 pb-1 flex items-center space-x-2" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-semibold text-purple-300 mt-3 mb-1" {...props} />
          ),
          // Lists
          ul: ({ node, ...props }) => (
            <ul className="list-disc space-y-2 my-3 pl-5 marker:text-cyan-400 text-xs text-gray-200" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal space-y-2 my-3 pl-5 marker:text-purple-400 text-xs text-gray-200" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed pl-1 text-gray-200" {...props} />
          ),
          // Blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-cyan-500 bg-cyan-950/40 p-3.5 my-3 rounded-r-xl text-gray-300 italic text-xs border border-cyan-500/20 shadow-inner" {...props} />
          ),
          // Code badges & blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const isInline = inline || !className;
            return isInline ? (
              <code className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-1.5 py-0.5 rounded text-[11px] font-mono font-medium" {...props}>
                {children}
              </code>
            ) : (
              <div className="my-3 rounded-xl border border-white/10 bg-slate-950 p-3.5 overflow-x-auto shadow-inner">
                <code className="text-xs font-mono text-cyan-300 leading-relaxed" {...props}>
                  {children}
                </code>
              </div>
            );
          },
          // Strong / Bold
          strong: ({ node, ...props }) => (
            <strong className="font-semibold text-white bg-cyan-500/10 px-1 rounded text-cyan-200" {...props} />
          ),
          // Links
          a: ({ node, ...props }) => (
            <a className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          )
        }}
      >
        {formattedContent}
      </ReactMarkdown>
    </div>
  );
};
