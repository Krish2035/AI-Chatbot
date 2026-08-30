'use client';

import React from 'react';
import { Brain, Cpu, Database, Sparkles, Settings, FileSearch, MessageSquare } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  isDbConnected: boolean;
  activeViewMode: 'chat' | 'doc-analysis';
  onToggleViewMode: (mode: 'chat' | 'doc-analysis') => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isDbConnected,
  activeViewMode,
  onToggleViewMode,
}) => {
  return (
    <header className="h-16 border-b border-white/10 glass-panel px-6 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-glow-cyan">
          <div className="w-full h-full bg-slate-950/80 rounded-[11px] flex items-center justify-center">
            <Brain className="w-5 h-5 text-cyan-400 animate-pulse-slow" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-bold text-lg text-white tracking-wide">
              NeuroChat <span className="text-gradient">AI</span>
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {activeViewMode === 'doc-analysis' ? 'Doc RAG Engine' : 'Vector Memory'}
            </span>
          </div>
          <p className="text-xs text-gray-400 flex items-center space-x-2">
            <span>Groq Llama 3</span>
            <span>•</span>
            <span>HF Embeddings</span>
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Document Analysis Toggle Button (Positioned in red box area) */}
        <button
          onClick={() => onToggleViewMode(activeViewMode === 'chat' ? 'doc-analysis' : 'chat')}
          className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 shadow-md cursor-pointer ${
            activeViewMode === 'doc-analysis'
              ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-glow-cyan border border-cyan-400/50'
              : 'bg-slate-900/90 text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/20 glass-pill'
          }`}
          title="Switch between Chat & Document Analysis Mode"
        >
          {activeViewMode === 'doc-analysis' ? (
            <>
              <MessageSquare className="w-4 h-4 text-white" />
              <span>Back to Chat</span>
            </>
          ) : (
            <>
              <FileSearch className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>Document Analyze</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </>
          )}
        </button>

        {/* Memory status indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-pill text-xs">
          <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span className="text-gray-300">
            {isDbConnected ? 'pgvector Active' : 'Memory Fallback'}
          </span>
          <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
        </div>

        {/* Engine status indicator */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-pill text-xs">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-gray-300">Groq Engine</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl glass-pill text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
          title="Engine & Memory Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
