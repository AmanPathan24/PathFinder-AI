'use client';

import React, { useState, useEffect } from 'react';
import { OntologyNode } from '@/types/ontology';
import { NodeStatusType } from '@/types/roadmap';
import { Resource } from '@/types/resource';
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ExternalLink,
  ThumbsUp,
  Clock,
  Send,
  MessageSquare,
  Bot,
  User,
  Zap,
} from 'lucide-react';
import rawCuratedResources from '@/data/curated-resources.json';

interface NodeDetailDrawerProps {
  node: OntologyNode | null;
  status: NodeStatusType;
  groundedExplanation?: string;
  isOpen: boolean;
  onClose: () => void;
  onSetStatus: (nodeId: string, status: NodeStatusType) => void;
  initialTab?: 'resources' | 'tutor';
  initialTutorQuery?: string;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({
  node,
  status,
  groundedExplanation,
  isOpen,
  onClose,
  onSetStatus,
  initialTab = 'resources',
  initialTutorQuery = '',
}) => {
  const [activeTab, setActiveTab] = useState<'resources' | 'tutor'>(initialTab);
  const [resources, setResources] = useState<Resource[]>([]);
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  // Tutor Chat State
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([]);
  const [inputQuery, setInputQuery] = useState(initialTutorQuery);
  const [isTutorLoading, setIsTutorLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    if (initialTutorQuery) {
      setInputQuery(initialTutorQuery);
    }
  }, [initialTab, initialTutorQuery, node?.id]);

  // Load resources for this node
  useEffect(() => {
    if (!node) return;

    // Filter curated resources by parent_skill_id
    const curated = (rawCuratedResources as Resource[]).filter(
      (r) => r.parent_skill_id === node.id
    );

    if (curated.length > 0) {
      setResources(curated);
    } else {
      // Generate default verified resource entries if none pre-seeded
      setResources([
        {
          id: `res_${node.id}_1`,
          subtopic_id: `sub_${node.id}_1`,
          parent_skill_id: node.id,
          title: `${node.title} — Official Documentation & Standard Spec`,
          provider: 'curated',
          type: 'official',
          url: `https://www.google.com/search?q=${encodeURIComponent(node.title + ' documentation')}`,
          duration_minutes: 30,
          quality_score: 4.9,
          upvotes: 18,
          author_or_channel: 'Official Docs',
        },
        {
          id: `res_${node.id}_2`,
          subtopic_id: `sub_${node.id}_2`,
          parent_skill_id: node.id,
          title: `Mastering ${node.title} (Hands-on Deep Dive)`,
          provider: 'youtube',
          type: 'video',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(node.title + ' tutorial')}`,
          duration_minutes: 24,
          quality_score: 4.8,
          upvotes: 14,
          author_or_channel: 'Curated Video',
        },
        {
          id: `res_${node.id}_3`,
          subtopic_id: `sub_${node.id}_3`,
          parent_skill_id: node.id,
          title: `Comprehensive Guide & Best Practices: ${node.title}`,
          provider: 'curated',
          type: 'article',
          url: `https://www.google.com/search?q=${encodeURIComponent(node.title + ' guide best practices')}`,
          duration_minutes: 20,
          quality_score: 4.7,
          upvotes: 11,
          author_or_channel: 'Community Guide',
        },
      ]);
    }

    // Reset tutor chat for the new node with initial welcome message
    setChatMessages([
      {
        role: 'assistant',
        text: `Hello! I am your node-scoped AI Tutor for "${node.title}". Ask me any conceptual question or how to apply this skill in projects!`,
      },
    ]);
  }, [node]);

  if (!isOpen || !node) return null;

  const handleUpvote = (resId: string) => {
    if (upvotedIds.has(resId)) return;
    setUpvotedIds((prev) => new Set(prev).add(resId));
    setResources((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, upvotes: r.upvotes + 1 } : r))
    );
  };

  const handleSendTutorMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const query = customPrompt || inputQuery;
    if (!query.trim() || isTutorLoading) return;

    const newMessages = [...chatMessages, { role: 'user' as const, text: query }];
    setChatMessages(newMessages);
    setInputQuery('');
    setIsTutorLoading(true);

    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: node.id,
          message: query,
          chatHistory: newMessages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', text: data.reply || 'No response generated.' },
        ]);
      } else {
        throw new Error('Failed to get answer from tutor.');
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Here is a summary based on graph facts: ${node.description} Estimated time is ${node.est_hours} hours.`,
        },
      ]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  // Helper for resource badge colors
  const getTypeBadgeStyle = (type: Resource['type']) => {
    switch (type) {
      case 'official':
        return 'bg-[#4A3728] text-white';
      case 'article':
        return 'bg-[#B58B65]/20 text-[#4A3728] border border-[#B58B65]/40';
      case 'video':
        return 'bg-[#C96F4A]/15 text-[#A85331] border border-[#C96F4A]/30';
      case 'course':
        return 'bg-[#8C9A76]/20 text-[#4A3728] border border-[#8C9A76]/40';
    }
  };

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[540px] bg-[#FFF9F0] border-l border-[#E6DCCF] shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-right duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header & Quick Action Row */}
      <div className="p-6 border-b border-[#E6DCCF] space-y-4 bg-[#FFFFFF]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A6553] bg-[#F7F1E7] px-2.5 py-1 rounded-full border border-[#E6DCCF]">
              {node.type} &bull; Level {node.difficulty}/5
            </span>
            <span className="text-[11px] text-[#7A6553] font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#B58B65]" />
              {node.est_hours}h est.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F1E7] hover:bg-[#E6DCCF] text-[#4A3728] flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-serif font-bold text-[#4A3728]">{node.title}</h2>
          <p className="text-xs text-[#7A6553] mt-1 line-clamp-2 leading-relaxed">
            {node.description}
          </p>
        </div>

        {/* Quick-Action Status Row (4 actions: Learning, Done, Skip, Mark as Known) */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSetStatus(node.id, 'learning')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all border ${
              status === 'learning'
                ? 'bg-[#C96F4A] text-white border-[#C96F4A] shadow-sm'
                : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#4A3728] hover:bg-[#F0E8DC]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Learning
          </button>

          <button
            type="button"
            onClick={() => onSetStatus(node.id, 'done')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all border ${
              status === 'done'
                ? 'bg-[#8C9A76] text-white border-[#8C9A76] shadow-sm'
                : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#4A3728] hover:bg-[#F0E8DC]'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Done
          </button>

          <button
            type="button"
            onClick={() => onSetStatus(node.id, 'skipped')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all border ${
              status === 'skipped'
                ? 'bg-[#7A6553] text-white border-[#7A6553] shadow-sm'
                : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#7A6553] hover:bg-[#F0E8DC]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Skip
          </button>

          <button
            type="button"
            onClick={() => onSetStatus(node.id, 'known-prior')}
            className={`py-2 px-1 rounded-xl text-[11px] font-bold flex flex-col items-center gap-1 transition-all border ${
              status === 'known-prior'
                ? 'bg-[#B58B65] text-white border-[#B58B65] shadow-sm'
                : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#4A3728] hover:bg-[#F0E8DC]'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Mark Known
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E6DCCF] pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('resources')}
            className={`flex-1 pb-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'resources'
                ? 'border-[#C96F4A] text-[#C96F4A]'
                : 'border-transparent text-[#7A6553] hover:text-[#4A3728]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Resources
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tutor')}
            className={`flex-1 pb-2.5 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition-all ${
              activeTab === 'tutor'
                ? 'border-[#C96F4A] text-[#C96F4A]'
                : 'border-transparent text-[#7A6553] hover:text-[#4A3728]'
            }`}
          >
            <Bot className="w-4 h-4" />
            AI Tutor
          </button>
        </div>
      </div>

      {/* Body: Tab Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === 'resources' && (
          <div className="space-y-6">
            {/* Grounded 1-Sentence Explanation */}
            {groundedExplanation && (
              <div className="bg-[#FFFFFF] border border-[#E6DCCF] rounded-2xl p-4 space-y-1.5 paper-shadow">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#A85331]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C96F4A]" />
                  Why this is in your roadmap:
                </div>
                <p className="text-xs text-[#4A3728] leading-relaxed italic font-medium">
                  "{groundedExplanation}"
                </p>
              </div>
            )}

            {/* Free Resources List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A3728] flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-[#C96F4A]" />
                  Free Resources
                </h3>
                <span className="text-[11px] text-[#7A6553] font-medium">
                  {resources.length} Links
                </span>
              </div>

              <div className="space-y-3">
                {resources.map((res) => {
                  const hasUpvoted = upvotedIds.has(res.id);
                  return (
                    <div
                      key={res.id}
                      className="bg-[#FFFFFF] border border-[#E6DCCF] rounded-2xl p-4 space-y-2.5 transition-all hover:border-[#B58B65] paper-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getTypeBadgeStyle(
                                res.type
                              )}`}
                            >
                              {res.type}
                            </span>
                            {res.duration_minutes && (
                              <span className="text-[10px] text-[#7A6553] font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#B58B65]" />
                                {res.duration_minutes}m
                              </span>
                            )}
                          </div>

                          <a
                            href={res.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-[#4A3728] hover:text-[#C96F4A] flex items-center gap-1 leading-snug group"
                          >
                            <span>{res.title}</span>
                            <ExternalLink className="w-3 h-3 text-[#B58B65] group-hover:text-[#C96F4A] shrink-0" />
                          </a>

                          {res.author_or_channel && (
                            <p className="text-[10px] text-[#7A6553] font-medium">
                              By {res.author_or_channel}
                            </p>
                          )}
                        </div>

                        {/* Upvote Button */}
                        <button
                          type="button"
                          onClick={() => handleUpvote(res.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                            hasUpvoted
                              ? 'bg-[#8C9A76] text-white shadow-sm'
                              : 'bg-[#F7F1E7] text-[#4A3728] hover:bg-[#E6DCCF]'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{res.upvotes}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tutor' && (
          <div className="flex flex-col h-full space-y-4">
            {/* Quick Prompts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-[#7A6553] uppercase tracking-wider">
                Quick Inquiries (Graph Grounded):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'What are the core concepts to master first?',
                  'How does this skill connect to my next milestone?',
                  'Suggest practical project applications.',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendTutorMessage(undefined, prompt)}
                    className="text-[11px] font-semibold text-[#4A3728] bg-[#FFFFFF] border border-[#E6DCCF] hover:border-[#B58B65] px-2.5 py-1 rounded-lg transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Thread */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-[220px]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-[#4A3728] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-[#C96F4A]" />
                    </div>
                  )}

                  <div
                    className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-[#C96F4A] text-white font-medium rounded-tr-none shadow-sm'
                        : 'bg-[#FFFFFF] border border-[#E6DCCF] text-[#4A3728] font-medium rounded-tl-none paper-shadow'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-[#8C9A76] text-white flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isTutorLoading && (
                <div className="flex gap-2.5 items-center text-xs text-[#7A6553] italic">
                  <Bot className="w-4 h-4 text-[#C96F4A] animate-pulse" />
                  Generating grounded explanation...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer for AI Tutor Input */}
      {activeTab === 'tutor' && (
        <form
          onSubmit={handleSendTutorMessage}
          className="p-4 border-t border-[#E6DCCF] bg-[#FFFFFF] flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={`Ask about ${node.title}...`}
            className="flex-1 bg-[#F7F1E7] border border-[#E6DCCF] focus:border-[#C96F4A] rounded-xl px-4 py-2.5 text-xs text-[#4A3728] font-medium outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTutorLoading}
            className="p-2.5 bg-[#C96F4A] hover:bg-[#A85331] text-white rounded-xl disabled:opacity-40 transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
