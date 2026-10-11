'use client';

import React, { useState, useEffect } from 'react';
import { api, Session, Message, RecalledMemory, AuthUser } from '../lib/api';
import { offlineStorage } from '../lib/offlineStorage';
import { offlineAiEngine } from '../lib/offlineAiEngine';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { MessageInput } from '../components/MessageInput';
import { DocumentAnalyzer } from '../components/DocumentAnalyzer';
import { MemoryInspectorModal } from '../components/MemoryInspectorModal';
import { SettingsModal } from '../components/SettingsModal';
import { AuthPage } from '../components/AuthPage';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isGuestMode, setIsGuestMode] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);

  const [activeViewMode, setActiveViewMode] = useState<'chat' | 'doc-analysis'>('chat');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Modals state
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [inspectedMemories, setInspectedMemories] = useState<RecalledMemory[]>([]);
  const [inspectedQuery, setInspectedQuery] = useState<string | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Check stored authentication session on mount
  useEffect(() => {
    const storedUser = api.getStoredUser();
    const token = api.getStoredToken();

    if (storedUser && token) {
      setCurrentUser(storedUser);
      // Verify/refresh user profile with backend
      api.getMe()
        .then((res) => {
          if (res.user) {
            setCurrentUser(res.user);
            if (typeof window !== 'undefined') {
              localStorage.setItem('neurochat_user', JSON.stringify(res.user));
            }
          }
        })
        .catch(() => {});
    }
    setIsCheckingAuth(false);
  }, []);

  // 2. Connection listener
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  // 3. Initial health check & fetch sessions whenever user or guest state changes
  useEffect(() => {
    if (!currentUser && !isGuestMode) return;

    async function init() {
      // First load from offline storage for instant startup
      const cachedSessions = offlineStorage.getSessions();
      if (cachedSessions.length > 0) {
        setSessions(cachedSessions);
        setActiveSessionId(cachedSessions[0].id);
      }

      try {
        const health = await api.checkHealth();
        setIsDbConnected(health.databaseConnected || false);
        setIsOnline(true);

        const fetchedSessions = await api.getSessions();
        if (fetchedSessions.length > 0) {
          setSessions(fetchedSessions);
          offlineStorage.saveSessions(fetchedSessions);
          setActiveSessionId((prev) => prev || fetchedSessions[0].id);
        }
      } catch (err) {
        console.warn('Backend offline or unreachable, using offline storage:', err);
        setIsOnline(false);
      }
    }
    init();
  }, [currentUser, isGuestMode]);

  // 4. Fetch messages whenever activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    // Immediately load cached messages
    const cachedMsgs = offlineStorage.getMessages(activeSessionId);
    if (cachedMsgs.length > 0) {
      setMessages(cachedMsgs);
    }

    async function loadMessages() {
      try {
        const msgs = await api.getMessages(activeSessionId!);
        setMessages(msgs);
        offlineStorage.saveMessages(activeSessionId!, msgs);
      } catch (err) {
        console.warn('Could not fetch remote messages, showing offline cache:', err);
      }
    }

    if (navigator.onLine) {
      loadMessages();
    }
  }, [activeSessionId]);

  // Handle New Session
  const handleNewSession = async () => {
    const newTitle = 'New Conversation';
    const tempId = `sess-${Date.now()}`;
    const newSess: Session = {
      id: tempId,
      title: newTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setActiveViewMode('chat');
    setIsSidebarOpen(false);

    try {
      if (isOnline) {
        const createdSess = await api.createSession(newTitle);
        setSessions((prev) => [createdSess, ...prev]);
        setActiveSessionId(createdSess.id);
        offlineStorage.addSession(createdSess);
      } else {
        setSessions((prev) => [newSess, ...prev]);
        setActiveSessionId(newSess.id);
        offlineStorage.addSession(newSess);
      }
      setMessages([]);
    } catch (err) {
      console.warn('Offline session fallback:', err);
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      offlineStorage.addSession(newSess);
      setMessages([]);
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (id: string) => {
    try {
      if (isOnline) {
        await api.deleteSession(id);
      }
    } catch (err) {
      console.warn('Offline delete session:', err);
    }

    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    offlineStorage.deleteSession(id);
    if (activeSessionId === id) {
      setActiveSessionId(updated.length > 0 ? updated[0].id : null);
    }
  };

  // Handle Send Message (with Offline AI Engine fallback)
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const currentSessId = activeSessionId || `offline-sess-${Date.now()}`;
    if (!activeSessionId) {
      setActiveSessionId(currentSessId);
      const newSess: Session = {
        id: currentSessId,
        title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setSessions((prev) => [newSess, ...prev]);
      offlineStorage.addSession(newSess);
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sessionId: currentSessId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    const updatedWithUser = [...messages, userMsg];
    setMessages(updatedWithUser);
    offlineStorage.saveMessages(currentSessId, updatedWithUser);
    setIsLoading(true);

    // If Offline or if backend fails, engage Offline AI Engine
    if (!isOnline) {
      setTimeout(() => {
        const { reply, recalledMemories } = offlineAiEngine.generateChatResponse(
          content,
          currentSessId,
          updatedWithUser
        );

        const aiMsg: Message = {
          id: `offline-ai-${Date.now()}`,
          sessionId: currentSessId,
          role: 'assistant',
          content: reply,
          createdAt: new Date().toISOString(),
          modelUsed: 'Offline Neural Engine',
          recalledMemories,
        };

        const finalMsgs = [...updatedWithUser, aiMsg];
        setMessages(finalMsgs);
        offlineStorage.saveMessages(currentSessId, finalMsgs);
        setIsLoading(false);
      }, 400);
      return;
    }

    try {
      const response = await api.sendMessage(content, currentSessId);

      if (!activeSessionId && response.sessionId) {
        setActiveSessionId(response.sessionId);
        const fetchedSessions = await api.getSessions();
        setSessions(fetchedSessions);
        offlineStorage.saveSessions(fetchedSessions);
      }

      const finalMsgs = [...messages, response.userMessage, response.assistantMessage];
      setMessages(finalMsgs);
      offlineStorage.saveMessages(currentSessId, finalMsgs);

      // Refresh sessions
      api.getSessions().then((s) => {
        setSessions(s);
        offlineStorage.saveSessions(s);
      }).catch(() => {});
    } catch (err: any) {
      console.warn('Online request failed, transitioning to Offline Engine:', err);
      setIsOnline(false);

      const { reply, recalledMemories } = offlineAiEngine.generateChatResponse(
        content,
        currentSessId,
        updatedWithUser
      );

      const aiMsg: Message = {
        id: `offline-ai-${Date.now()}`,
        sessionId: currentSessId,
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
        modelUsed: 'Offline Neural Engine',
        recalledMemories,
      };

      const finalMsgs = [...updatedWithUser, aiMsg];
      setMessages(finalMsgs);
      offlineStorage.saveMessages(currentSessId, finalMsgs);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectMemories = (memories: RecalledMemory[], query?: string) => {
    setInspectedMemories(memories);
    setInspectedQuery(query);
    setIsMemoryModalOpen(true);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setIsGuestMode(false);
    setSessions([]);
    setMessages([]);
    setActiveSessionId(null);
  };

  // While initializing authentication session
  if (isCheckingAuth) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-cyan-400">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-400">Loading NeuroChat AI...</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated and has not chosen guest mode: Show Sign In / Sign Up as the Home Page!
  if (!currentUser && !isGuestMode) {
    return (
      <AuthPage
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          setIsGuestMode(false);
        }}
        onContinueAsGuest={() => {
          setIsGuestMode(true);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Top Header with Offline Indicator, PWA Install & User Info */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDbConnected={isDbConnected}
        activeViewMode={activeViewMode}
        onToggleViewMode={(mode) => {
          setActiveViewMode(mode);
          setIsSidebarOpen(false);
        }}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isOnline={isOnline}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => {
          setIsGuestMode(false);
          setCurrentUser(null);
        }}
      />

      {/* Main App Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar (Responsive Drawer on Mobile, Fixed on Desktop) */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(id) => {
            setActiveSessionId(id);
            setActiveViewMode('chat');
            setIsSidebarOpen(false);
          }}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* View Switcher: Document Analyzer vs Chat Timeline */}
        {activeViewMode === 'doc-analysis' ? (
          <DocumentAnalyzer isOnline={isOnline} />
        ) : (
          <main className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-950 via-slate-900/60 to-slate-950 overflow-hidden relative min-w-0">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              onInspectMemories={handleInspectMemories}
            />
            <MessageInput
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </main>
        )}
      </div>

      {/* Modals */}
      <MemoryInspectorModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        memories={inspectedMemories}
        queryContent={inspectedQuery}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDbConnected={isDbConnected}
      />
    </div>
  );
}
