'use client';

import React, { useState } from 'react';
import {
  Brain,
  X,
  Sparkles,
  Zap,
  Database,
  Cpu,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Globe,
  Layers,
  ArrowRight
} from 'lucide-react';

interface AboutSeoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutSeoModal: React.FC<AboutSeoModalProps> = ({ isOpen, onClose }) => {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'What is AI Chatbot Vercel (NeuroChat AI)?',
      a: 'AI Chatbot Vercel is an advanced, production-grade conversational AI platform built with Next.js 14 and optimized for deployment on Vercel. It combines Groq LLaMA 3 inference, Hugging Face vector embeddings, and PostgreSQL pgvector long-term memory.',
    },
    {
      q: 'How does persistent vector memory work in this AI Chatbot?',
      a: 'Unlike standard stateless chat interfaces, NeuroChat AI computes 384-dimensional dense embeddings for your prompts and replies using sentence-transformers. Vectors are stored in PostgreSQL pgvector. When you query the chatbot, cosine similarity search retrieves past relevant context seamlessly across sessions.',
    },
    {
      q: 'Can I deploy this AI Chatbot on Vercel for free?',
      a: 'Yes! The frontend is fully optimized for Vercel Hobby (free tier) with zero server configuration. You can pair it with free API keys from Groq Cloud and managed Postgres services like Supabase or Neon.',
    },
    {
      q: 'Does this AI Chatbot work offline?',
      a: 'Yes. NeuroChat AI is an installable Progressive Web App (PWA) with client-side Service Workers. When disconnected from the internet, an embedded client-side neural pattern engine takes over so you never lose conversational access.',
    },
    {
      q: 'What AI models power this Vercel Chatbot?',
      a: 'NeuroChat AI supports Groq LLaMA 3 compound models with ultra-fast token streaming, Hugging Face transformer embeddings, and client-side offline neural pattern fallback.',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-slate-900/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative p-6 border-b border-white/10 bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-purple-950/40">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-glow-cyan shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span id="about-modal-title" className="text-xl font-extrabold text-white tracking-wide">
                  AI Chatbot <span className="text-gradient">Vercel</span>
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  NeuroChat AI v2.0
                </span>
              </div>
              <p className="text-xs text-gray-400">Next.js 14 • Groq LLaMA 3 • pgvector • Offline PWA</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hero Overview */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Project Overview</span>
            </h2>
            <p className="text-sm text-gray-300 leading-relaxed">
              <strong>NeuroChat AI</strong> is a next-generation <strong>AI Chatbot optimized for Vercel</strong>. Designed for blazing speed and intelligence, it features sub-second Groq LLM inference, persistent cross-session memory powered by PostgreSQL pgvector, and offline Progressive Web App resilience.
            </p>
          </section>

          {/* Architecture Pillars Grid */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Production Architecture</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Groq LLaMA 3 Engine</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Ultra-low latency inference streaming at 500+ tokens per second.</p>
                </div>
              </div>

              <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">PostgreSQL pgvector</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Persistent 384-D cosine distance vector memory recall across sessions.</p>
                </div>
              </div>

              <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Vercel & Next.js 14</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">App Router SSR, Edge Caching, dynamic metadata, and Core Web Vitals optimization.</p>
                </div>
              </div>

              <div className="glass-panel p-3.5 rounded-2xl border border-white/10 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">Offline PWA Resilience</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Installable on desktop & mobile with an offline fallback neural pattern engine.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Interactive FAQ Accordion */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Frequently Asked Questions</span>
            </h2>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="border border-white/10 rounded-2xl overflow-hidden glass-panel transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full p-3.5 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-white hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2 ${
                          isOpen ? 'rotate-180 text-cyan-400' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-xs text-gray-300 border-t border-white/5 pt-2 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href="https://github.com/Krish2035/AI-Chatbot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <span>View Source on GitHub</span>
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
          </a>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-semibold shadow-glow-cyan transition-all cursor-pointer"
            >
              Start Chatting
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

