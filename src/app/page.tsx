'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePath } from '@/context/PathContext';
import { Sparkles, ArrowRight, GitBranch, Cpu, ShieldCheck, BookOpen } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    title: 'Data Science & Machine Learning',
    prompt: 'I know Python programming and basic SQL, and I want to become a Data Scientist in 6 months.',
    track: 'Data Science',
  },
  {
    title: 'Frontend React Engineering',
    prompt: 'I know basic HTML, CSS, and Vanilla JavaScript. I want to master React, TypeScript, and Next.js in 12 weeks.',
    track: 'Frontend Dev',
  },
  {
    title: 'DevOps & Cloud Automation',
    prompt: 'I have basic Linux terminal and Git experience. I want to learn Docker, CI/CD, Terraform, and Kubernetes in 16 weeks.',
    track: 'DevOps',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { rawGoal, setRawGoal, setParsedProfile, setPathOutput, setExplanations, setIsLoading, isLoading } = usePath();
  const [error, setError] = useState<string | null>(null);

  const handleSubmitGoal = async (goalText: string) => {
    if (!goalText.trim()) {
      setError('Please enter your learning goal and current background.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setRawGoal(goalText);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: goalText }),
      });

      if (!res.ok) {
        throw new Error('Failed to parse goal and generate roadmap.');
      }

      const data = await res.json();
      setParsedProfile(data.profile);
      setPathOutput(data.path);
      setExplanations(data.explanations || {});

      router.push('/onboarding');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-6">
      {/* Hero Header */}
      <div className="text-center space-y-5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E4EAD9] border border-[#8C9A76]/40 text-[#4A3728] text-xs font-bold tracking-wide">
          <BookOpen className="w-3.5 h-3.5 text-[#8C9A76]" />
          Warm Editorial Tech &bull; Graph Algorithm Core
        </div>

        <h1 className="text-4xl sm:text-6xl font-serif text-[#4A3728] leading-[1.1] tracking-tight">
          Personalized Learning Paths,<br />
          <span className="italic font-normal text-[#C96F4A]">Engineered with Precision.</span>
        </h1>

        <p className="text-[#7A6553] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
          Describe your background and goals in plain language. PathFinder maps your ambition against a curated skill ontology graph to generate an optimal, parallelized roadmap.
        </p>
      </div>

      {/* Main Intake Form Card */}
      <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-10 paper-shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#B58B65]/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitGoal(rawGoal);
          }}
          className="space-y-5 relative z-10"
        >
          <label className="block text-sm font-bold uppercase tracking-wider text-[#4A3728]">
            Your Background & Ambition
          </label>

          <div className="relative">
            <textarea
              rows={4}
              value={rawGoal}
              onChange={(e) => setRawGoal(e.target.value)}
              placeholder="e.g. I know Python and basic SQL, and I want to become a Data Scientist in 6 months..."
              className="w-full bg-[#FFFFFF] border-2 border-[#E6DCCF] focus:border-[#C96F4A] focus:ring-4 focus:ring-[#C96F4A]/10 rounded-2xl p-5 text-[#4A3728] placeholder-[#B58B65]/60 text-base resize-none transition-all outline-none font-medium shadow-inner"
            />
          </div>

          {error && (
            <p className="text-[#A85331] text-xs sm:text-sm font-semibold bg-[#C96F4A]/10 border border-[#C96F4A]/20 rounded-xl p-3.5">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-[#7A6553] font-medium text-center sm:text-left">
              Stage 1: Intent &bull; Stage 2: Profiling &bull; Stage 2.5: Diagnostic &bull; Stage 3: DAG Engine
            </div>

            <button
              type="submit"
              disabled={isLoading || !rawGoal.trim()}
              className="w-full sm:w-auto px-8 py-4 bg-[#C96F4A] hover:bg-[#A85331] text-white font-bold text-sm rounded-2xl shadow-md flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Building Roadmap...
                </>
              ) : (
                <>
                  Generate Learning Roadmap
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Suggested Prompt Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#7A6553] text-center sm:text-left">
          Or Select an Exemplar Path Prompt:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {SUGGESTED_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setRawGoal(item.prompt);
                handleSubmitGoal(item.prompt);
              }}
              disabled={isLoading}
              className="text-left bg-[#FFF9F0] hover:bg-[#FFFFFF] border border-[#E6DCCF] hover:border-[#B58B65] rounded-2xl p-6 transition-all group paper-shadow hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#8C9A76] bg-[#E4EAD9] px-2.5 py-1 rounded-full border border-[#8C9A76]/30 uppercase tracking-wider">
                  {item.track}
                </span>
                <ArrowRight className="w-4 h-4 text-[#B58B65] group-hover:text-[#C96F4A] group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-base font-bold text-[#4A3728] font-serif mb-1.5">
                {item.title}
              </h3>
              <p className="text-xs text-[#7A6553] leading-relaxed line-clamp-2">
                "{item.prompt}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-[#E6DCCF]">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF9F0] border border-[#E6DCCF] flex items-center justify-center shrink-0 text-[#C96F4A] paper-shadow">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#4A3728]">Deterministic DAG</h4>
            <p className="text-xs text-[#7A6553] mt-1 leading-relaxed">
              Real graph traversal algorithm ensures topological order and parallel milestones.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF9F0] border border-[#E6DCCF] flex items-center justify-center shrink-0 text-[#8C9A76] paper-shadow">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#4A3728]">Vector Profiling</h4>
            <p className="text-xs text-[#7A6553] mt-1 leading-relaxed">
              Embedding cosine similarity maps your free-text skills to canonical nodes.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF9F0] border border-[#E6DCCF] flex items-center justify-center shrink-0 text-[#B58B65] paper-shadow">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#4A3728]">Diagnostic Confidence</h4>
            <p className="text-xs text-[#7A6553] mt-1 leading-relaxed">
              Micro-quiz verifies each claimed skill. Partial knowledge becomes a smart refresher instead of binary skip.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
