'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api, DocumentRecord, DocumentChunkRecord } from '../lib/api';
import { offlineStorage } from '../lib/offlineStorage';
import { offlineAiEngine } from '../lib/offlineAiEngine';
import {
  FileText,
  Upload,
  Brain,
  Database,
  Sparkles,
  Send,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Search,
  Check,
  Copy,
  Plus,
  Bot,
  User,
  Info,
  Layers,
  FileCode,
  WifiOff,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { motion, AnimatePresence } from 'framer-motion';

interface DocMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  modelUsed?: string;
  chunksUsed?: DocumentChunkRecord[];
}

interface DocumentAnalyzerProps {
  isOnline?: boolean;
}

export const DocumentAnalyzer: React.FC<DocumentAnalyzerProps> = ({ isOnline = true }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DocMessage[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  
  // Upload modal / form state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [inputTab, setInputTab] = useState<'paste' | 'file'>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Expanded sources state for AI messages
  const [expandedSourceId, setExpandedSourceId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing documents on mount (cached first)
  useEffect(() => {
    const cachedDocs = offlineStorage.getDocuments();
    if (cachedDocs.length > 0) {
      setDocuments(cachedDocs);
      if (!selectedDocId) {
        setSelectedDocId(cachedDocs[0].id);
      }
    }
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      offlineStorage.saveDocuments(docs);
      if (docs.length > 0 && !selectedDocId) {
        setSelectedDocId(docs[0].id);
      }
    } catch (err) {
      console.warn('Backend unavailable, using cached documents:', err);
    }
  };

  // Auto-scroll timeline
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isQuerying]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [questionText]);

  // Active document object
  const activeDoc = documents.find((d) => d.id === selectedDocId);

  // Handle File Selection (Supports PDF, DOCX, TXT, MD, CSV, etc.)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setFileBase64(dataUrl);

        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext && !['pdf', 'docx', 'doc'].includes(ext)) {
          const textReader = new FileReader();
          textReader.onload = (tEvent) => {
            setUploadContent((tEvent.target?.result as string) || '');
          };
          textReader.readAsText(file);
        } else {
          setUploadContent(`[Binary File: ${file.name}]`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Ingest & Process Document
  const handleIngestDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim() || isIngesting) return;
    if (inputTab === 'paste' && !uploadContent.trim()) return;
    if (inputTab === 'file' && !selectedFile) return;

    setIsIngesting(true);
    const ext = selectedFile?.name.split('.').pop()?.toLowerCase() || 'txt';
    const cleanContent = inputTab === 'paste' ? uploadContent.trim() : (uploadContent || `[File: ${selectedFile?.name}]`);

    try {
      let doc: DocumentRecord;

      if (isOnline) {
        if (inputTab === 'file' && fileBase64) {
          doc = await api.processDocument(uploadTitle.trim(), undefined, ext, fileBase64);
        } else {
          doc = await api.processDocument(uploadTitle.trim(), uploadContent.trim(), 'txt');
        }
      } else {
        // Offline Ingestion Simulation
        const words = cleanContent.split(/\s+/).filter(Boolean);
        const chunkLength = 80;
        const chunkCount = Math.max(1, Math.ceil(words.length / chunkLength));
        const mockChunks: DocumentChunkRecord[] = [];

        for (let i = 0; i < chunkCount; i++) {
          const chunkWords = words.slice(i * chunkLength, (i + 1) * chunkLength);
          mockChunks.push({
            id: `offline-chunk-${Date.now()}-${i}`,
            documentId: `offline-doc-${Date.now()}`,
            chunkContent: chunkWords.join(' '),
            chunkIndex: i + 1,
            similarity: 0.9,
            createdAt: new Date().toISOString(),
          });
        }

        doc = {
          id: `offline-doc-${Date.now()}`,
          userId: 'offline-user',
          title: uploadTitle.trim(),
          fileType: ext,
          content: cleanContent,
          wordCount: words.length,
          chunkCount,
          createdAt: new Date().toISOString(),
        };

        offlineStorage.addDocument(doc, mockChunks);
      }

      setDocuments((prev) => [doc, ...prev]);
      offlineStorage.addDocument(doc);
      setSelectedDocId(doc.id);
      setIsUploadModalOpen(false);
      setUploadTitle('');
      setUploadContent('');
      setSelectedFile(null);
      setFileBase64(null);
      
      // Reset chat timeline for new doc
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `Successfully ingested document **"${doc.title}"** (\`.${doc.fileType.toUpperCase()}\`)! Parsed & vectorized into **${doc.chunkCount} semantic chunks** (${doc.wordCount} words).\n\nAsk any targeted question about this document below.`,
          createdAt: new Date().toISOString(),
          modelUsed: isOnline ? 'Vector Chunk Engine' : 'Offline Local Indexer',
        },
      ]);
    } catch (err: any) {
      console.error('Error processing document:', err);
      alert(`Notice: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Delete Document
  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document and its vector embeddings?')) return;
    try {
      if (isOnline) {
        await api.deleteDocument(id);
      }
    } catch (err) {
      console.warn('Offline delete doc:', err);
    }

    const updated = documents.filter((d) => d.id !== id);
    setDocuments(updated);
    offlineStorage.deleteDocument(id);
    if (selectedDocId === id) {
      setSelectedDocId(updated.length > 0 ? updated[0].id : null);
      setMessages([]);
    }
  };

  // Send RAG Query (with Offline fallback)
  const handleSendQuery = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionText.trim() || !selectedDocId || isQuerying) return;

    const userQ = questionText.trim();
    setQuestionText('');

    const userMsg: DocMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userQ,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsQuerying(true);

    if (!isOnline) {
      setTimeout(() => {
        const { answer, chunksUsed } = offlineAiEngine.queryOfflineDocument(selectedDocId, userQ);
        const aiMsg: DocMessage = {
          id: `offline-doc-ai-${Date.now()}`,
          role: 'assistant',
          content: answer,
          createdAt: new Date().toISOString(),
          modelUsed: 'Offline Vector Chunk Engine',
          chunksUsed,
        };
        setMessages((prev) => [...prev, aiMsg]);
        setIsQuerying(false);
      }, 400);
      return;
    }

    try {
      const response = await api.queryDocument(selectedDocId, userQ);

      const aiMsg: DocMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        createdAt: new Date().toISOString(),
        modelUsed: response.modelUsed,
        chunksUsed: response.chunksUsed,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.warn('Online query failed, using offline chunk retrieval:', err);
      const { answer, chunksUsed } = offlineAiEngine.queryOfflineDocument(selectedDocId, userQ);
      const aiMsg: DocMessage = {
        id: `offline-doc-ai-${Date.now()}`,
        role: 'assistant',
        content: answer,
        createdAt: new Date().toISOString(),
        modelUsed: 'Offline Vector Chunk Engine',
        chunksUsed,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative min-w-0">
      {/* Top Banner / Active Document Bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 border-b border-white/10 glass-panel flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-bold text-gray-300 uppercase tracking-wider shrink-0">
                Active Doc:
              </span>
              {documents.length > 0 ? (
                <div className="relative group max-w-full">
                  <select
                    value={selectedDocId || ''}
                    onChange={(e) => {
                      setSelectedDocId(e.target.value);
                      setMessages([]);
                    }}
                    className="bg-slate-900 text-cyan-300 text-xs sm:text-sm font-semibold rounded-lg px-2.5 sm:px-3 py-1 border border-cyan-500/40 focus:outline-none cursor-pointer hover:border-cyan-400 max-w-[200px] xs:max-w-[260px] sm:max-w-none truncate"
                  >
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.title} ({doc.chunkCount} chunks, {doc.wordCount} words)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs text-gray-500 italic">No document ingested yet</span>
              )}
            </div>
            {activeDoc && (
              <p className="text-[10px] sm:text-[11px] text-gray-400 flex items-center space-x-1.5 sm:space-x-2 mt-0.5 truncate">
                <span>Type: <code className="text-purple-300 font-mono">{activeDoc.fileType.toUpperCase()}</code></span>
                <span>•</span>
                <span>{activeDoc.chunkCount} Chunks</span>
                <span>•</span>
                <span>{activeDoc.wordCount} Words</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 sm:space-x-3 shrink-0">
          {activeDoc && (
            <button
              onClick={(e) => handleDeleteDoc(activeDoc.id, e)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
              title="Delete Document"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-medium text-xs shadow-glow-cyan flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer transform active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
        {documents.length === 0 ? (
          /* Empty / Welcome State matching Screenshot 2 UI */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto py-8 sm:py-12 px-3 sm:px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-glow-cyan mb-4 sm:mb-6 animate-float">
              <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
                <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Welcome to <span className="text-gradient">Document Intelligence RAG</span>
            </h2>

            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-6 max-w-xl">
              Upload your documents, reports, or raw text to extract top-notch analytical insights using vector embeddings and Groq LLM reasoning.
            </p>

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-glow-cyan flex items-center space-x-2 transition-all transform hover:scale-105 cursor-pointer"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Select or Paste Document to Analyze</span>
            </button>
          </div>
        ) : (
          /* Q&A Conversation Timeline for Active Document */
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-400 glass-panel p-5 sm:p-8 rounded-2xl border border-white/10 space-y-3">
                <FileCheck className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 mx-auto animate-pulse" />
                <h3 className="text-base sm:text-lg font-semibold text-white">
                  Ready to analyze "{activeDoc?.title}"
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  This document contains {activeDoc?.chunkCount} vector chunks ({activeDoc?.wordCount} words). Ask any question in the prompt below to run RAG vector search and Groq LLM synthesis.
                </p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                const hasChunks = !isUser && msg.chunksUsed && msg.chunksUsed.length > 0;
                const isExpanded = expandedSourceId === msg.id;

                return (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex space-x-2.5 sm:space-x-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-cyan-500 p-[1px] shrink-0 mt-1 shadow-glow-violet">
                        <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                          <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-300" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 sm:space-y-2 max-w-[88%] sm:max-w-[78%] min-w-0">
                      {/* Sender Header */}
                      <div className={`flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs text-gray-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span className="font-medium text-gray-300">
                          {isUser ? 'You' : 'Doc AI Analyzer'}
                        </span>
                        {!isUser && msg.modelUsed && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-white/10 text-cyan-300 font-mono truncate max-w-[120px] sm:max-w-none">
                            {msg.modelUsed}
                          </span>
                        )}
                        <span>•</span>
                        <span className="text-[10px] sm:text-xs">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                          onClick={() => copyToClipboard(msg.content, msg.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy text"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Source Chunks Citation Drawer Toggle */}
                      {hasChunks && (
                        <div className="pt-0.5">
                          <button
                            onClick={() => setExpandedSourceId(isExpanded ? null : msg.id)}
                            className="flex items-center space-x-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="font-medium truncate">
                              Retrieved {msg.chunksUsed!.length} Source Chunks
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-cyan-400 shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-cyan-400 shrink-0" />
                            )}
                          </button>

                          {/* Expandable Source Cards */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2.5 space-y-2 overflow-hidden"
                              >
                                {msg.chunksUsed!.map((chunk) => (
                                  <div
                                    key={chunk.id}
                                    className="p-2.5 sm:p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-cyan-400 font-medium">
                                      <span>Doc Chunk #{chunk.chunkIndex}</span>
                                      {chunk.similarity && (
                                        <span className="bg-cyan-500/20 px-2 py-0.5 rounded text-cyan-300 border border-cyan-500/30">
                                          Similarity: {(chunk.similarity * 100).toFixed(1)}%
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-gray-300 italic leading-relaxed bg-black/30 p-2 rounded-lg border border-white/5 text-[11px] sm:text-xs">
                                      "{chunk.chunkContent}"
                                    </p>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 p-[1px] shrink-0 mt-1">
                        <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}

            {/* Querying Indicator */}
            {isQuerying && (
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
                    Performing pgvector chunk search & Groq RAG synthesis...
                  </span>
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input Box matching Chat timeline */}
      {selectedDocId && (
        <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 pb-3 sm:pb-6 pt-1 sm:pt-2 shrink-0">
          <form
            onSubmit={handleSendQuery}
            className="relative flex items-end bg-slate-900/90 border border-white/15 focus-within:border-cyan-500/60 rounded-2xl p-1.5 sm:p-2 shadow-2xl glass-panel transition-all"
          >
            <textarea
              ref={textareaRef}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery();
                }
              }}
              placeholder={`Ask any question about "${activeDoc?.title || 'document'}"...`}
              rows={1}
              disabled={isQuerying}
              className="w-full bg-transparent text-gray-100 placeholder-gray-500 px-2.5 sm:px-3 py-2 text-xs sm:text-sm focus:outline-none resize-none max-h-40 min-h-[40px] sm:min-h-[44px]"
            />

            <button
              type="submit"
              disabled={!questionText.trim() || isQuerying}
              className={`p-2.5 sm:p-3 rounded-xl transition-all duration-200 shrink-0 ${
                questionText.trim() && !isQuerying
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-glow-cyan transform active:scale-95 cursor-pointer'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed'
              }`}
              aria-label="Send Query"
            >
              {isQuerying ? (
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-cyan-400" />
              ) : (
                <Send className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 mt-1.5 px-2">
            <span className="truncate">Groq RAG • Hugging Face Vector Similarity</span>
            <span className="hidden sm:inline">Press <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-400">Shift</kbd> + <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-400">Enter</kbd> for new line</span>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[92vh] flex flex-col bg-slate-950 border border-white/15 rounded-2xl shadow-2xl glass-panel overflow-hidden"
            >
              <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5 sm:space-x-3">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">Ingest Document for RAG</h3>
                    <p className="text-[11px] sm:text-xs text-gray-400">
                      Upload PDF, DOCX, text files, or paste raw text.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleIngestDocument} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
                {/* Mode Tabs */}
                <div className="flex bg-slate-900 rounded-xl p-1 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setInputTab('file')}
                    className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all ${
                      inputTab === 'file'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Upload File (.pdf, .docx, .txt...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('paste')}
                    className={`flex-1 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg transition-all ${
                      inputTab === 'paste'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Paste Raw Text
                  </button>
                </div>

                {/* Document Title Input */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Financial Report Q3, API Specs..."
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                {inputTab === 'file' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Choose File
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 hover:border-cyan-500/60 rounded-xl p-4 sm:p-6 text-center cursor-pointer bg-slate-900/50 hover:bg-cyan-500/5 transition-all space-y-2"
                    >
                      <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400 mx-auto animate-bounce" />
                      <p className="text-xs font-medium text-white truncate max-w-xs mx-auto">
                        {selectedFile ? selectedFile.name : 'Click to browse or drag & drop file'}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-gray-500">
                        Supports PDF, Word (.docx), TXT, MD, CSV, JSON & code
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.docx,.doc,.txt,.md,.json,.csv,.js,.ts,.py,.html,.css"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Paste Document Content
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Paste your document content here..."
                      value={uploadContent}
                      onChange={(e) => setUploadContent(e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 sm:p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500/60 resize-none font-mono"
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-end space-x-2 sm:space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-3.5 sm:px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      !uploadTitle.trim() ||
                      (inputTab === 'paste' ? !uploadContent.trim() : !selectedFile) ||
                      isIngesting
                    }
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-medium text-xs shadow-glow-cyan flex items-center space-x-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isIngesting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-cyan-300" />
                        <span>Vectorizing...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-300" />
                        <span>Process & Build Index</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
