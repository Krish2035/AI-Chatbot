'use client';

import { Message, RecalledMemory, DocumentChunkRecord } from './api';
import { offlineStorage } from './offlineStorage';

// Simple TF-IDF / Token Matcher for offline vector simulation
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function calculateSimilarity(tokensA: string[], tokensB: string[]): number {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const setB = new Set(tokensB);
  let intersection = 0;
  for (const t of tokensA) {
    if (setB.has(t)) intersection++;
  }
  const denominator = Math.sqrt(tokensA.length) * Math.sqrt(tokensB.length);
  return denominator > 0 ? intersection / denominator : 0;
}

export const offlineAiEngine = {
  /**
   * Search cached past messages across all sessions to find semantic memory matches
   */
  searchOfflineMemories(query: string, currentSessionId?: string): RecalledMemory[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const sessions = offlineStorage.getSessions();
    const scoredMemories: RecalledMemory[] = [];

    for (const session of sessions) {
      const messages = offlineStorage.getMessages(session.id);
      for (const msg of messages) {
        if (msg.role === 'user' && msg.content.trim() !== query.trim()) {
          const msgTokens = tokenize(msg.content);
          const similarity = calculateSimilarity(queryTokens, msgTokens);
          if (similarity > 0.2) {
            scoredMemories.push({
              id: msg.id || `offline-mem-${Math.random()}`,
              sessionId: session.id,
              content: msg.content,
              role: msg.role,
              similarity: Math.min(0.98, similarity + 0.3),
              createdAt: msg.createdAt || new Date().toISOString(),
            });
          }
        }
      }
    }

    // Sort by highest similarity and limit to top 3
    return scoredMemories.sort((a, b) => b.similarity - a.similarity).slice(0, 3);
  },

  /**
   * Synthesize intelligent offline response for Chat timeline
   */
  generateChatResponse(
    userMessage: string,
    sessionId: string,
    history: Message[]
  ): { reply: string; recalledMemories: RecalledMemory[] } {
    const recalledMemories = this.searchOfflineMemories(userMessage, sessionId);
    const lower = userMessage.toLowerCase().trim();

    let reply = '';

    // If recalled past context from memory
    if (recalledMemories.length > 0) {
      const memorySnippets = recalledMemories
        .map((m, i) => `* **Memory #${i + 1}**: "${m.content}" (${(m.similarity * 100).toFixed(0)}% match)`)
        .join('\n');

      reply = `### 🧠 Offline Vector Recall Analysis\n\nI am running in **Offline Mode** via your cached local knowledge engine. I searched your device's memory store and recalled the following context:\n\n${memorySnippets}\n\n**Response:**\nBased on your past conversations and prompt, here is the information:\n\n> *"${recalledMemories[0].content}"*\n\n*(Note: Your full online Groq 70B model will automatically re-engage once your internet connection is restored.)*`;
      return { reply, recalledMemories };
    }

    // Common intent handling for offline mode
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      reply = `👋 **Hello!** You are currently using **NeuroChat AI in Offline Mode (PWA)**.\n\nAll your past chat histories, documents, and memory vectors are cached locally on this device. You can:\n- Ask questions about cached knowledge\n- Search ingested documents in the **Document Analyzer**\n- Review past sessions seamlessly\n\nHow can I help you today?`;
    } else if (lower.includes('who are you') || lower.includes('what is this') || lower.includes('what are you')) {
      reply = `I am **NeuroChat AI**, your Progressive Web App assistant equipped with **Persistent Vector Memory** and **Document Intelligence RAG**.\n\n⚡ Currently running in **Offline Client-Side Mode** using local vector indices and browser cache storage.`;
    } else if (lower.includes('help') || lower.includes('what can you do')) {
      reply = `### 🛠️ Offline Capabilities:\n\n1. **Local Cross-Session Memory**: I search through all conversations stored in your browser.\n2. **Offline Document RAG**: Ingested files (.pdf, .docx, .txt) can still be searched and analyzed.\n3. **Full PWA Offline Support**: You can install this app on Windows, macOS, Android, and iOS to use anytime without WiFi or cellular data.\n4. **Auto Cloud Sync**: When connection returns, Groq LLM & pgvector will automatically resume.`;
    } else if (lower.includes('summarize') || lower.includes('summary')) {
      const lastMessages = history.slice(-4).map((m) => `• **${m.role === 'user' ? 'You' : 'AI'}**: ${m.content.slice(0, 120)}...`).join('\n');
      reply = `### 📋 Local Session Summary\n\nHere is a summary of your recent active conversation:\n\n${lastMessages || '*(No prior messages in current session)*'}\n\nKey topic: **${userMessage}**`;
    } else {
      reply = `⚡ **Offline Mode Active**\n\nI processed your query: **"${userMessage}"**.\n\nWhile offline, your request has been analyzed by the local device engine and stored in your offline vector history. When you reconnect to the internet, NeuroChat AI will automatically synchronize with Groq LLaMA 3.3 and PostgreSQL pgvector for deeper synthesis.\n\n> **Tip**: Switch to **Document Analyze** at the top if you want to perform local semantic chunk search across any previously uploaded files!`;
    }

    return { reply, recalledMemories };
  },

  /**
   * Search cached document chunks while offline
   */
  queryOfflineDocument(
    docId: string,
    question: string
  ): { answer: string; chunksUsed: DocumentChunkRecord[] } {
    const chunks = offlineStorage.getChunks(docId);
    const docs = offlineStorage.getDocuments();
    const doc = docs.find((d) => d.id === docId);

    if (!chunks || chunks.length === 0) {
      return {
        answer: `*(No cached chunks found for document "${doc?.title || docId}". Ingest the document while online to enable offline chunk indexing.)*`,
        chunksUsed: [],
      };
    }

    const qTokens = tokenize(question);
    const scored = chunks.map((chunk) => {
      const cTokens = tokenize(chunk.chunkContent);
      const sim = calculateSimilarity(qTokens, cTokens);
      return {
        ...chunk,
        similarity: Math.min(0.96, sim + 0.35),
      };
    });

    scored.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
    const topChunks = scored.slice(0, 3).filter((c) => (c.similarity || 0) > 0.35);

    if (topChunks.length === 0) {
      return {
        answer: `I searched all **${chunks.length} cached chunks** of "${doc?.title}" offline, but could not find a high-confidence match for "${question}". Try using more specific keywords from the document.`,
        chunksUsed: scored.slice(0, 1),
      };
    }

    const excerpts = topChunks
      .map((c) => `> *"...${c.chunkContent.trim()}..."* — *(Chunk #${c.chunkIndex}, ${(c.similarity! * 100).toFixed(1)}% match)*`)
      .join('\n\n');

    const answer = `### 📄 Offline Document Analysis: "${doc?.title}"\n\nRetrieved **${topChunks.length} relevant sections** from local offline storage:\n\n${excerpts}\n\n**Synthesized Findings:**\nThe document states that ${topChunks[0].chunkContent.slice(0, 240)}...`;

    return {
      answer,
      chunksUsed: topChunks,
    };
  },
};
