'use client';

import React from 'react';
import { X, Cpu, Database, Key, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDbConnected: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDbConnected,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl glass-panel"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/50 shrink-0">
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-lg text-white">System & Engine Configuration</h3>
                <p className="text-[10px] sm:text-xs text-gray-400">Groq LLM + HF Vector Memory Engine</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs sm:text-sm overflow-y-auto flex-1">
            {/* Groq LLM */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/50 border border-white/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center space-x-2 font-semibold text-white">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Groq LLM Inference Engine</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs bg-cyan-500/20 text-cyan-300 font-medium">
                  llama-3.3-70b-versatile
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                Powers fast chat responses and synthesizes historical context from vector memories.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
                <span className="text-gray-500">Configured in <code className="text-cyan-400 font-mono">.env</code> as <code className="text-gray-300 font-mono">GROQ_API_KEY</code></span>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  <span>Get Groq Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Hugging Face Vector Embeddings */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/50 border border-white/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center space-x-2 font-semibold text-white">
                  <Key className="w-4 h-4 text-purple-400" />
                  <span>Hugging Face Vector Embeddings</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs bg-purple-500/20 text-purple-300 font-medium">
                  all-MiniLM-L6-v2 (384d)
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                Converts chat text into mathematical vector arrays to calculate cosine similarity with past chats.
              </p>
              <div className="pt-1 flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
                <span className="text-gray-500">Configured in <code className="text-cyan-400 font-mono">.env</code> as <code className="text-gray-300 font-mono">HF_TOKEN</code></span>
                <a
                  href="https://huggingface.co/settings/tokens"
                  target="_blank"
                  rel="noreferrer"
                  className="text-purple-400 hover:underline flex items-center space-x-1"
                >
                  <span>Get HF Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Database / Memory Status */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/50 border border-white/10 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center space-x-2 font-semibold text-white">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>PostgreSQL Database & pgvector</span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] sm:text-xs">
                  {isDbConnected ? (
                    <span className="flex items-center space-x-1 text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">
                      <CheckCircle className="w-3 h-3" />
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="flex items-center space-x-1 text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                      <AlertCircle className="w-3 h-3" />
                      <span>Memory Fallback</span>
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-400 leading-relaxed">
                {isDbConnected
                  ? 'Connected to PostgreSQL database with native pgvector HNSW similarity index.'
                  : 'Currently running in JS memory fallback mode. Connect PostgreSQL with DATABASE_URL in backend/.env for persistent vector storage.'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-slate-950/60 text-right shrink-0">
            <button
              onClick={onClose}
              className="px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-medium text-xs sm:text-sm transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
