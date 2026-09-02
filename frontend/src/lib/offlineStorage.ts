'use client';

import { Session, Message, DocumentRecord, DocumentChunkRecord } from './api';

const SESSIONS_KEY = 'neurochat_offline_sessions';
const MESSAGES_PREFIX = 'neurochat_offline_messages_';
const DOCUMENTS_KEY = 'neurochat_offline_documents';
const CHUNKS_PREFIX = 'neurochat_offline_chunks_';

export const offlineStorage = {
  // --- SESSIONS ---
  saveSessions(sessions: Session[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save sessions to localStorage:', e);
    }
  },

  getSessions(): Session[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load sessions from localStorage:', e);
    }
    return [
      {
        id: 'offline-default-session',
        title: 'Offline Conversation',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  },

  addSession(session: Session) {
    const existing = this.getSessions();
    const filtered = existing.filter((s) => s.id !== session.id);
    this.saveSessions([session, ...filtered]);
  },

  deleteSession(sessionId: string) {
    const existing = this.getSessions();
    this.saveSessions(existing.filter((s) => s.id !== sessionId));
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MESSAGES_PREFIX + sessionId);
    }
  },

  // --- MESSAGES ---
  saveMessages(sessionId: string, messages: Message[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MESSAGES_PREFIX + sessionId, JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save messages to localStorage:', e);
    }
  },

  getMessages(sessionId: string): Message[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(MESSAGES_PREFIX + sessionId);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load messages from localStorage:', e);
    }
    return [];
  },

  appendMessage(sessionId: string, message: Message) {
    const existing = this.getMessages(sessionId);
    const updated = [...existing, message];
    this.saveMessages(sessionId, updated);
    return updated;
  },

  // --- DOCUMENTS ---
  saveDocuments(docs: DocumentRecord[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
    } catch (e) {
      console.warn('Failed to save documents to localStorage:', e);
    }
  },

  getDocuments(): DocumentRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(DOCUMENTS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load documents from localStorage:', e);
    }
    return [];
  },

  addDocument(doc: DocumentRecord, chunks?: DocumentChunkRecord[]) {
    const docs = this.getDocuments();
    const updated = [doc, ...docs.filter((d) => d.id !== doc.id)];
    this.saveDocuments(updated);
    if (chunks) {
      this.saveChunks(doc.id, chunks);
    }
  },

  deleteDocument(docId: string) {
    const docs = this.getDocuments();
    this.saveDocuments(docs.filter((d) => d.id !== docId));
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHUNKS_PREFIX + docId);
    }
  },

  // --- DOCUMENT CHUNKS ---
  saveChunks(docId: string, chunks: DocumentChunkRecord[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CHUNKS_PREFIX + docId, JSON.stringify(chunks));
    } catch (e) {
      console.warn('Failed to save chunks to localStorage:', e);
    }
  },

  getChunks(docId: string): DocumentChunkRecord[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(CHUNKS_PREFIX + docId);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to load chunks from localStorage:', e);
    }
    return [];
  },
};
