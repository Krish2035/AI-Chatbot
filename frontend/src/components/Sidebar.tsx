'use client';

import React, { useState } from 'react';
import { Session } from '../lib/api';
import { MessageSquare, Plus, Trash2, Search, Brain, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen = false,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter((s) =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sidebarContent = (
    <div className="flex flex-col h-full w-full bg-slate-950/95 md:bg-slate-950/80 glass-panel border-r border-white/10">
      {/* Top Header / Close on Mobile */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            onNewSession();
            onClose?.();
          }}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white text-sm font-medium flex items-center justify-center space-x-2 shadow-glow-cyan transition-all transform active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 glass-pill transition-colors shrink-0"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/60 text-sm text-gray-200 pl-9 pr-3 py-2 rounded-lg border border-white/10 focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-500"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between">
          <span>Chat History</span>
          <span className="bg-white/10 text-gray-300 px-1.5 py-0.5 rounded text-[10px]">
            {filteredSessions.length}
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-xs px-4">
            {searchTerm ? 'No matching conversations' : 'No chat history yet. Start a new chat!'}
          </div>
        ) : (
          <AnimatePresence>
            {filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/10 border border-cyan-500/40 text-white shadow-sm'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                  onClick={() => {
                    onSelectSession(session.id);
                    onClose?.();
                  }}
                >
                  <div className="flex items-center space-x-3 overflow-hidden pr-6">
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                    <span className="text-sm truncate font-medium">{session.title}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="opacity-80 md:opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-gray-400 md:text-gray-500 transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Memory Feature Promo Footer */}
      <div className="p-4 border-t border-white/10 bg-slate-900/40">
        <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-300 mb-1">
          <Brain className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate">Cross-Session Memory</span>
        </div>
        <p className="text-[11px] text-gray-400 leading-relaxed">
          Previous chat conversations are stored & searched using PostgreSQL vector similarity.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden md:flex w-72 h-full shrink-0 relative z-10">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer & Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 md:hidden"
              aria-hidden="true"
            />

            {/* Slide-out Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sm:w-80 h-full shadow-2xl md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
