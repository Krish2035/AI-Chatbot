'use client';

import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Database, Sparkles, Settings, FileSearch, MessageSquare, Menu, Download, WifiOff, LogOut, UserCheck, LogIn } from 'lucide-react';
import { AuthUser } from '../lib/api';

interface HeaderProps {
  onOpenSettings: () => void;
  isDbConnected: boolean;
  activeViewMode: 'chat' | 'doc-analysis';
  onToggleViewMode: (mode: 'chat' | 'doc-analysis') => void;
  onToggleSidebar?: () => void;
  isOnline?: boolean;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  isDbConnected,
  activeViewMode,
  onToggleViewMode,
  onToggleSidebar,
  isOnline = true,
  currentUser,
  onLogout,
  onOpenAuth,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Also check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('To install NeuroChat AI on your device:\n• On Chrome/Edge: Click the Install icon in the address bar.\n• On iOS Safari: Tap Share -> Add to Home Screen.\n• On Android: Tap menu (3 dots) -> Install App.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <header className="h-16 border-b border-white/10 glass-panel px-3 sm:px-6 flex items-center justify-between z-20 sticky top-0 shrink-0">
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 glass-pill transition-colors shrink-0"
          title="Open Conversation History"
          aria-label="Open Sidebar"
        >
          <Menu className="w-5 h-5 text-cyan-400" />
        </button>

        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-glow-cyan shrink-0">
          <div className="w-full h-full bg-slate-950/80 rounded-[11px] flex items-center justify-center">
            <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse-slow" />
          </div>
        </div>
        <div>
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <h1 className="font-bold text-base sm:text-lg text-white tracking-wide truncate">
              NeuroChat <span className="text-gradient">AI</span>
            </h1>
            <span className="hidden xs:inline-block text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {activeViewMode === 'doc-analysis' ? 'Doc RAG' : 'Vector Memory'}
            </span>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 flex items-center space-x-1 sm:space-x-2 truncate">
            {isOnline ? (
              <>
                <span>Groq Llama 3</span>
                <span>•</span>
                <span>HF Embeddings</span>
              </>
            ) : (
              <span className="text-amber-400 font-medium flex items-center space-x-1">
                <WifiOff className="w-3 h-3 inline" />
                <span>Offline PWA Engine</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 sm:space-x-3">
        {/* Install PWA Button */}
        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-400 transition-all shadow-sm cursor-pointer shrink-0"
            title="Install NeuroChat AI as a standalone PWA application on your phone or computer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
            <span className="hidden xs:inline">Install App</span>
            <span className="xs:hidden">Install</span>
          </button>
        )}

        {/* Document Analysis Toggle Button */}
        <button
          onClick={() => onToggleViewMode(activeViewMode === 'chat' ? 'doc-analysis' : 'chat')}
          className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 shadow-md cursor-pointer shrink-0 ${
            activeViewMode === 'doc-analysis'
              ? 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-glow-cyan border border-cyan-400/50'
              : 'bg-slate-900/90 text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-500/20 glass-pill'
          }`}
          title="Switch between Chat & Document Analysis Mode"
        >
          {activeViewMode === 'doc-analysis' ? (
            <>
              <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              <span className="hidden xs:inline">Back to Chat</span>
              <span className="xs:hidden">Chat</span>
            </>
          ) : (
            <>
              <FileSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse" />
              <span className="hidden xs:inline">Document Analyze</span>
              <span className="xs:hidden">Doc RAG</span>
              <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-300 hidden sm:inline" />
            </>
          )}
        </button>

        {/* Network & Memory status indicator */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-pill text-xs shrink-0">
          {isOnline ? (
            <>
              <Database className={`w-3.5 h-3.5 ${isDbConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
              <span className="text-gray-300 hidden lg:inline">
                {isDbConnected ? 'pgvector Active' : 'Memory Fallback'}
              </span>
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-300 font-medium hidden lg:inline">Offline Mode</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </>
          )}
        </div>

        {/* Engine status indicator (Desktop) */}
        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full glass-pill text-xs shrink-0">
          <Cpu className={`w-3.5 h-3.5 ${isOnline ? 'text-cyan-400' : 'text-amber-400'}`} />
          <span className="text-gray-300">{isOnline ? 'Groq Engine' : 'Local Offline Engine'}</span>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl glass-pill text-gray-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Engine & Memory Settings"
        >
          <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* User Account & Logout */}
        {currentUser ? (
          <div className="flex items-center space-x-2 pl-1 border-l border-white/10 shrink-0">
            <div
              className="flex items-center space-x-2 px-2.5 py-1 rounded-xl glass-pill max-w-[150px] truncate"
              title={`Logged in as ${currentUser.username} (${currentUser.email})`}
            >
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.username}
                  className="w-5 h-5 rounded-full object-cover border border-cyan-400"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
                  {currentUser.username ? currentUser.username.charAt(0) : 'U'}
                </div>
              )}
              <span className="text-xs text-gray-200 font-medium truncate hidden md:inline">
                {currentUser.username}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-xl glass-pill text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold hover:shadow-glow-cyan transition-all cursor-pointer shrink-0"
            title="Sign In / Create Account"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};

