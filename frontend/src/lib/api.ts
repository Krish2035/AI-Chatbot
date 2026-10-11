import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  provider?: string;
}

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

// Setup Axios token interceptor
axios.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('neurochat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const api = {
  // Authentication methods
  async signup(email: string, password: string, username?: string): Promise<{ user: AuthUser; token: string }> {
    const res = await axios.post(`${API_BASE_URL}/auth/signup`, { email, password, username });
    if (res.data.token && typeof window !== 'undefined') {
      localStorage.setItem('neurochat_token', res.data.token);
      localStorage.setItem('neurochat_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async signin(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const res = await axios.post(`${API_BASE_URL}/auth/signin`, { email, password });
    if (res.data.token && typeof window !== 'undefined') {
      localStorage.setItem('neurochat_token', res.data.token);
      localStorage.setItem('neurochat_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async continueWithGoogle(googleData: {
    email: string;
    displayName?: string;
    photoURL?: string;
    uid?: string;
    idToken?: string;
  }): Promise<{ user: AuthUser; token: string }> {
    const res = await axios.post(`${API_BASE_URL}/auth/google`, googleData);
    if (res.data.token && typeof window !== 'undefined') {
      localStorage.setItem('neurochat_token', res.data.token);
      localStorage.setItem('neurochat_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe(): Promise<{ user: AuthUser | null; isGuest: boolean }> {
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/me`);
      return res.data;
    } catch {
      return { user: null, isGuest: true };
    }
  },

  logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('neurochat_token');
      localStorage.removeItem('neurochat_user');
    }
  },

  getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('neurochat_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('neurochat_token');
  },

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

  // Full-text search
  async search(query: string, sessionId?: string) {
    const res = await axios.get(`${API_BASE_URL}/search`, {
      params: { q: query, sessionId }
    });
    return res.data.results;
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
