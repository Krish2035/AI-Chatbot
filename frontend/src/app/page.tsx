'use client';

import React, { useState, useEffect } from 'react';
import { api, Session, Message, RecalledMemory } from '../lib/api';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';
import { MessageInput } from '../components/MessageInput';
import { DocumentAnalyzer } from '../components/DocumentAnalyzer';
import { MemoryInspectorModal } from '../components/MemoryInspectorModal';
import { SettingsModal } from '../components/SettingsModal';

export default function Home() {
  const [activeViewMode, setActiveViewMode] = useState<'chat' | 'doc-analysis'>('chat');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Modals state
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [inspectedMemories, setInspectedMemories] = useState<RecalledMemory[]>([]);
  const [inspectedQuery, setInspectedQuery] = useState<string | undefined>();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 1. Initial health check & fetch sessions
  useEffect(() => {
    async function init() {
      const health = await api.checkHealth();
      setIsDbConnected(health.databaseConnected || false);

      try {
        const fetchedSessions = await api.getSessions();
        setSessions(fetchedSessions);
        if (fetchedSessions.length > 0) {
          setActiveSessionId(fetchedSessions[0].id);
        }
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    }
    init();
  }, []);

  // 2. Fetch messages whenever activeSessionId changes
  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const msgs = await api.getMessages(activeSessionId!);
        setMessages(msgs);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    }
    loadMessages();
  }, [activeSessionId]);

  // Handle New Session
  const handleNewSession = async () => {
    try {
      setActiveViewMode('chat');
      const newSess = await api.createSession('New Conversation');
      setSessions((prev) => [newSess, ...prev]);
      setActiveSessionId(newSess.id);
      setMessages([]);
      setIsSidebarOpen(false);
    } catch (err) {
      console.error('Error creating new session:', err);
    }
  };

  // Handle Delete Session
  const handleDeleteSession = async (id: string) => {
    try {
      await api.deleteSession(id);
      const updated = sessions.filter((s) => s.id !== id);
      setSessions(updated);
      if (activeSessionId === id) {
        setActiveSessionId(updated.length > 0 ? updated[0].id : null);
      }
    } catch (err) {
      console.error('Error deleting session:', err);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Optimistic user message insertion
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      sessionId: activeSessionId || '',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await api.sendMessage(content, activeSessionId || undefined);

      // If a new session was auto-created by backend
      if (!activeSessionId && response.sessionId) {
        setActiveSessionId(response.sessionId);
        const fetchedSessions = await api.getSessions();
        setSessions(fetchedSessions);
      }

      // Replace optimistic message and add AI response
      setMessages((prev) => {
        const filtered = prev.filter((m) => !m.id.startsWith('temp-'));
        return [...filtered, response.userMessage, response.assistantMessage];
      });

      // Update session title in list if necessary
      const updatedSessions = await api.getSessions();
      setSessions(updatedSessions);
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sessionId: activeSessionId || '',
        role: 'assistant',
        content: `*(Backend Communication Notice: Unable to reach backend API server. Make sure the Node.js Express backend is running on port 5000)*`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectMemories = (memories: RecalledMemory[], query?: string) => {
    setInspectedMemories(memories);
    setInspectedQuery(query);
    setIsMemoryModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Top Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDbConnected={isDbConnected}
        activeViewMode={activeViewMode}
        onToggleViewMode={(mode) => {
          setActiveViewMode(mode);
          setIsSidebarOpen(false);
        }}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
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
          <DocumentAnalyzer />
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
