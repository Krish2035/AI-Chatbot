'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, isLoading }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSendMessage(text);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-6 pt-2">
      {/* Input Box */}
      <form onSubmit={handleSubmit} className="relative flex items-end bg-slate-900/90 border border-white/15 focus-within:border-cyan-500/60 rounded-2xl p-2 shadow-2xl glass-panel transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or share info to store in vector memory... (Press Enter to send)"
          rows={1}
          disabled={isLoading}
          className="w-full bg-transparent text-gray-100 placeholder-gray-500 px-3 py-2 text-sm focus:outline-none resize-none max-h-40 min-h-[44px]"
        />

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className={`p-3 rounded-xl transition-all duration-200 shrink-0 ${
            text.trim() && !isLoading
              ? 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-glow-cyan transform active:scale-95'
              : 'bg-white/5 text-gray-600 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-2 px-2">
        <span>Groq LLM + Hugging Face Vector Recall</span>
        <span>Press <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-400">Shift</kbd> + <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-400">Enter</kbd> for new line</span>
      </div>
    </div>
  );
};
