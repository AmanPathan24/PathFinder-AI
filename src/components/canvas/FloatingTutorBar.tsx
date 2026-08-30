'use client';

import React, { useState } from 'react';
import { Sparkles, Send, Bot } from 'lucide-react';

interface FloatingTutorBarProps {
  onAskQuestion: (query: string) => void;
  selectedNodeTitle?: string;
}

export const FloatingTutorBar: React.FC<FloatingTutorBarProps> = ({
  onAskQuestion,
  selectedNodeTitle,
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onAskQuestion(query);
    setQuery('');
  };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-xl">
      <form
        onSubmit={handleSubmit}
        className="bg-[#2D2218]/95 backdrop-blur-md border border-[#B58B65]/40 rounded-2xl p-2 sm:p-2.5 flex items-center gap-3 shadow-2xl transition-all hover:border-[#C96F4A]"
      >
        <div className="w-9 h-9 rounded-xl bg-[#C96F4A] text-white flex items-center justify-center shrink-0 shadow-md">
          <Sparkles className="w-5 h-5" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#E8D6C3] flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-[#C96F4A]" />
            AI Tutor {selectedNodeTitle ? `— ${selectedNodeTitle}` : '— Have a question?'}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type your question here (graph fact grounded)..."
            className="w-full bg-transparent text-white text-xs font-medium placeholder-white/40 outline-none mt-0.5"
          />
        </div>

        <button
          type="submit"
          disabled={!query.trim()}
          className="px-4 py-2 bg-[#C96F4A] hover:bg-[#A85331] disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shrink-0"
        >
          <span>Ask</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
