'use client';

import React, { useEffect, useRef } from 'react';
import { Message, RecalledMemory } from '../lib/api';
import { Brain, Bot, User, Sparkles, Database, Copy, Check, Info } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { motion } from 'framer-motion';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onInspectMemories: (memories: RecalledMemory[], query?: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  onInspectMemories,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 sm:py-12 px-3 sm:px-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-glow-cyan mb-4 sm:mb-6 animate-float">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Welcome to <span className="text-gradient">NeuroChat AI</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg">
            Your chatbot equipped with persistent cross-session memory! Every message you share is saved and vector-embedded in PostgreSQL so the chatbot can recall your past context anytime.
          </p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            const hasRecalledMemories =
              !isUser && msg.recalledMemories && msg.recalledMemories.length > 0;

            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex space-x-2.5 sm:space-x-4 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 p-[1px] shrink-0 mt-1 shadow-glow-violet">
                    <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
                    </div>
                  </div>
                )}

                {/* Message Content Container */}
                <div className="space-y-1.5 sm:space-y-2 max-w-[88%] sm:max-w-[78%] min-w-0">
                  {/* Sender Header */}
                  <div className={`flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="font-medium text-gray-300">
                      {isUser ? 'You' : 'NeuroChat AI'}
                    </span>
                    {!isUser && msg.modelUsed && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-white/10 text-cyan-300 font-mono truncate max-w-[120px] sm:max-w-none">
                        {msg.modelUsed}
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-[10px] sm:text-xs">
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now'}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed relative group ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-xs shadow-md'
                        : 'bg-slate-900/90 text-gray-100 border border-white/10 rounded-tl-xs glass-panel'
                    }`}
                  >
                    <MarkdownRenderer content={msg.content} />

                    {/* Copy Button */}
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id || `${index}`)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy text"
                    >
                      {copiedId === (msg.id || `${index}`) ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Recalled Memory Badge Button on AI Message */}
                  {!isUser && (
                    <div className="flex items-center space-x-2 pt-0.5">
                      {hasRecalledMemories ? (
                        <button
                          onClick={() => {
                            const prevUserMsg = messages[index - 1]?.content;
                            onInspectMemories(msg.recalledMemories!, prevUserMsg);
                          }}
                          className="flex items-center space-x-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 shadow-sm transition-all transform hover:scale-105 cursor-pointer"
                        >
                          <Brain className="w-3.5 h-3.5 text-purple-400 animate-pulse shrink-0" />
                          <span className="font-semibold truncate">
                            Recalled {msg.recalledMemories!.length} Past Memories
                          </span>
                          <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                        </button>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] text-gray-500 flex items-center space-x-1">
                          <Info className="w-3 h-3 shrink-0" />
                          <span>Saved to vector memory database</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-[1px] shrink-0 mt-1">
                    <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex space-x-2.5 sm:space-x-4 items-start"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 p-[1px] shrink-0 shadow-glow-violet">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300 animate-spin" />
                </div>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-white/10 glass-panel rounded-tl-xs flex items-center space-x-2.5 sm:space-x-3">
                <div className="flex space-x-1.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400 font-medium">
                  Searching vector memories & generating response...
                </span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
};
