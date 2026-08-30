'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePath } from '@/context/PathContext';
import { Sparkles, ArrowRight, CheckCircle2, Cpu, GitBranch, ShieldCheck } from 'lucide-react';

const SUGGESTED_PROMPTS = [
  {
    title: 'Data Science & Machine Learning',
    prompt: 'I know Python programming and basic SQL, and I want to become a Data Scientist in 6 months.',
    track: 'Data Science',
  },
  {
    title: 'Frontend React Engineering',
    prompt: 'I know basic HTML, CSS, and Vanilla JavaScript. I want to master React, TypeScript, and Next.js in 12 weeks.',
    track: 'Frontend Development',
  },
  {
    title: 'DevOps & Cloud Automation',
    prompt: 'I have basic Linux terminal and Git experience. I want to learn Docker, CI/CD, Terraform, and Kubernetes in 16 weeks.',
    track: 'DevOps & Cloud',
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

      // Navigate to onboarding page for user confirmation
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
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold tracking-wide">
          <Sparkles className="w-4 h-4 text-teal-400" />
          Deterministic DAG Graph Engine + Grounded AI
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Personalized Learning Paths Built on{' '}
          <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
            Real Graph Algorithms
          </span>
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Tell us your goal and existing skills. PathFinder maps your intent against a 
          verified skill ontology graph—generating optimal, parallelized, and budget-tailored roadmaps.
        </p>
      </div>

      {/* Goal Intake Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmitGoal(rawGoal);
          }}
          className="space-y-4 relative z-10"
        >
          <label className="block text-sm font-semibold text-slate-200">
            Describe your background and target goal in plain English:
          </label>
          <div className="relative">
            <textarea
              rows={4}
              value={rawGoal}
              onChange={(e) => setRawGoal(e.target.value)}
              placeholder="e.g. I know Python and basic SQL, and I want to become a data scientist in 6 months..."
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm sm:text-base resize-none transition-all outline-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs sm:text-sm font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 hidden sm:block">
              Stage 1: Intent Extraction &bull; Stage 2: Profiling &bull; Stage 3: DAG Engine
            </div>
            <button
              type="submit"
              disabled={isLoading || !rawGoal.trim()}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  Generating Roadmap...
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Or try a quick demo prompt:
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SUGGESTED_PROMPTS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setRawGoal(item.prompt);
                handleSubmitGoal(item.prompt);
              }}
              disabled={isLoading}
              className="text-left bg-slate-900/50 hover:bg-slate-900 border border-slate-800 hover:border-teal-500/50 rounded-xl p-5 transition-all group hover:shadow-lg hover:shadow-teal-500/5"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
                  {item.track}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-white">
                {item.title}
              </h3>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                "{item.prompt}"
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Key Architectural Differentiator Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-900">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-teal-400">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Deterministic Path Engine</h4>
            <p className="text-xs text-slate-400 mt-1">
              Topological DAG sort ensures true prerequisite ordering, parallel milestones, and strict budget trimming.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-emerald-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Vector Skill Profiler</h4>
            <p className="text-xs text-slate-400 mt-1">
              Embedding cosine-similarity maps fuzzy user input to canonical skill nodes automatically.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Grounded LLM Explanations</h4>
            <p className="text-xs text-slate-400 mt-1">
              Explanations are constrained strictly to graph facts—preventing hallucinations while keeping human tone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
