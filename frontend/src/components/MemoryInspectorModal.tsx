'use client';

import React from 'react';
import { RecalledMemory } from '../lib/api';
import { X, Brain, Sparkles, Clock, Percent, Database, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: RecalledMemory[];
  queryContent?: string;
}

export const MemoryInspectorModal: React.FC<MemoryInspectorModalProps> = ({
  isOpen,
  onClose,
  memories,
  queryContent,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl glass-panel"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50 shrink-0">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse-slow" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-lg text-white flex items-center space-x-2">
                  <span>Semantic Vector Memory Inspector</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-gray-400">
                  Historical messages recalled via Hugging Face Embeddings & pgvector
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
            {queryContent && (
              <div className="p-2.5 sm:p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30 text-xs">
                <span className="text-cyan-400 font-semibold block mb-1">Triggered by Query:</span>
                <p className="text-gray-300 italic">"{queryContent}"</p>
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400">
              <span>Recalled Memory Matches ({memories.length})</span>
              <span className="text-cyan-400">Cosine Similarity</span>
            </div>

            {memories.length === 0 ? (
              <div className="py-8 sm:py-12 text-center text-gray-400 space-y-2">
                <Database className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs sm:text-sm font-medium">No previous relevant memories recalled for this query.</p>
                <p className="text-[11px] sm:text-xs text-gray-500 max-w-sm mx-auto">
                  As you chat, past questions & answers will be embedded into vector space and remembered!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 sm:space-y-3">
                {memories.map((mem, idx) => {
                  const similarityPct = (mem.similarity * 100).toFixed(1);
                  return (
                    <div
                      key={mem.id || idx}
                      className="p-3 sm:p-4 rounded-xl bg-slate-950/50 border border-white/10 hover:border-purple-500/40 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px] sm:text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                            Memory #{idx + 1}
                          </span>
                          <span className="text-gray-500 flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(mem.createdAt).toLocaleDateString()}</span>
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-[10px] sm:text-xs">
                          <Sparkles className="w-3 h-3" />
                          <span>{similarityPct}% Match</span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-200 bg-slate-900/80 p-2.5 sm:p-3 rounded-lg border border-white/5">
                        "{mem.content}"
                      </p>

                      <div className="text-[10px] sm:text-[11px] text-gray-400 flex items-center justify-between pt-0.5">
                        <span>Role: <strong className="text-gray-300">{mem.role}</strong></span>
                        <span className="text-gray-500 truncate max-w-[150px] sm:max-w-none">Session: {mem.sessionId.substring(0, 8)}...</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/60 text-right shrink-0">
            <button
              onClick={onClose}
              className="px-4 sm:px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              Close Inspector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
