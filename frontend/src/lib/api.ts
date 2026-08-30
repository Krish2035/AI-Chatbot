import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RecalledMemory {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  similarity: number;
  createdAt: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  modelUsed?: string;
  recalledMemories?: RecalledMemory[];
}

export interface DocumentRecord {
  id: string;
  userId: string;
  title: string;
  fileType: string;
  content: string;
  wordCount: number;
  chunkCount: number;
  createdAt: string;
}

export interface DocumentChunkRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  chunkContent: string;
  similarity?: number;
  createdAt: string;
}

export interface DocumentQueryResponse {
  success: boolean;
  answer: string;
  modelUsed: string;
  chunksUsed: DocumentChunkRecord[];
}

export const api = {
  // Check backend health
  async checkHealth() {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      return response.data;
    } catch (err) {
      return { status: 'offline', databaseConnected: false };
    }
  },

  // Fetch all sessions
  async getSessions(): Promise<Session[]> {
    const res = await axios.get(`${API_BASE_URL}/sessions`);
    return res.data.sessions || [];
  },

  // Create session
  async createSession(title?: string): Promise<Session> {
    const res = await axios.post(`${API_BASE_URL}/sessions`, { title });
    return res.data.session;
  },

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/sessions/${sessionId}`);
  },

  // Get session messages
  async getMessages(sessionId: string): Promise<Message[]> {
    const res = await axios.get(`${API_BASE_URL}/sessions/${sessionId}/messages`);
    return res.data.messages || [];
  },

  // Send message
  async sendMessage(content: string, sessionId?: string): Promise<{
    sessionId: string;
    userMessage: Message;
    assistantMessage: Message;
  }> {
    const res = await axios.post(`${API_BASE_URL}/chat/message`, { content, sessionId });
    return res.data;
  },

  // Ingest Document (supports text, PDF, DOCX, etc.)
  async processDocument(
    title: string,
    content?: string,
    fileType = 'txt',
    fileData?: string
  ): Promise<DocumentRecord> {
    const res = await axios.post(`${API_BASE_URL}/documents/process`, {
      title,
      content,
      fileType,
      fileData,
    });
    return res.data.document;
  },

  // List Documents
  async getDocuments(): Promise<DocumentRecord[]> {
    const res = await axios.get(`${API_BASE_URL}/documents`);
    return res.data.documents || [];
  },

  // Delete Document
  async deleteDocument(documentId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/documents/${documentId}`);
  },

  // Query Document RAG
  async queryDocument(documentId: string, question: string): Promise<DocumentQueryResponse> {
    const res = await axios.post(`${API_BASE_URL}/documents/${documentId}/query`, { question });
    return res.data;
  }
};
