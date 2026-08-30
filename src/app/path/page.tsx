'use client';

import React from 'react';
import Link from 'next/link';
import { usePath } from '@/context/PathContext';
import { SkillTreeVisualizer } from '@/components/SkillTreeVisualizer';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  GitFork,
  ArrowRight,
  RefreshCw,
  Layers,
  Sliders,
} from 'lucide-react';

export default function PathPage() {
  const {
    pathOutput,
    parsedProfile,
    explanations,
    completedNodeIds,
    excludedNodeIds,
    toggleNodeCompleted,
    toggleNodeExcluded,
    isLoading,
  } = usePath();

  if (!pathOutput || !parsedProfile) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-teal-400">
          <GitFork className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">No Active Learning Roadmap</h1>
        <p className="text-slate-400 text-sm">
          Please enter your learning goal on the intake page to generate your personalized path.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-teal-500/20 hover:bg-teal-400 transition-all"
        >
          Go to Intake
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const { milestones, total_est_hours, time_budget_hours, is_trimmed, trimmed_nodes } = pathOutput;

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-4">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                Track: {parsedProfile.target_track.toUpperCase()}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {total_est_hours} Total Hours ({parsedProfile.time_budget_weeks} Weeks)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Personalized Learning Roadmap
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl italic">
              "{parsedProfile.raw_goal}"
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/onboarding"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 transition-all"
            >
              <Sliders className="w-4 h-4 text-teal-400" />
              Adjust Profile
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all"
            >
              View Analytics
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Budget Trimming Banner */}
        {is_trimmed && (
          <div className="mt-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-200 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-amber-300">Time Budget Constrained Optimization</div>
              <div className="mt-0.5 opacity-90 leading-relaxed">
                Total track content ({total_est_hours + trimmed_nodes.reduce((s, n) => s + n.est_hours, 0)}h) exceeded your {time_budget_hours}h limit.
                The Path Engine automatically trimmed {trimmed_nodes.length} optional topic(s) to keep your path achievable within budget!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Visual Skill Tree Section */}
      <div className="space-y-4">
        <SkillTreeVisualizer
          milestones={milestones}
          completedNodeIds={completedNodeIds}
          excludedNodeIds={excludedNodeIds}
          targetTrack={parsedProfile.target_track}
          explanations={explanations}
          onToggleNodeCompleted={toggleNodeCompleted}
          onToggleNodeExcluded={toggleNodeExcluded}
        />
      </div>

      {/* Detailed Milestone Roadmap List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            Milestone Breakdown & Grounded Explanations
          </h2>
          {isLoading && (
            <span className="text-xs text-teal-400 flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recalculating path...
            </span>
          )}
        </div>

        <div className="space-y-6">
          {milestones.map((milestone) => (
            <div
              key={milestone.milestone_index}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-300 font-bold text-sm flex items-center justify-center">
                    M{milestone.milestone_index}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{milestone.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Estimated Time: {milestone.est_hours} Hours &bull; {milestone.nodes.length} Topic(s)
                    </p>
                  </div>
                </div>

                {milestone.is_parallel && (
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    ⚡ Parallel Milestone
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {milestone.nodes.map((node) => {
                  const isDone = completedNodeIds.includes(node.id);
                  const isExcluded = excludedNodeIds.includes(node.id);
                  const exp = explanations[node.id];

                  return (
                    <div
                      key={node.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                          : isExcluded
                          ? 'bg-slate-950/40 border-slate-800 opacity-60'
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{node.title}</span>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                              {node.type.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{node.description}</p>
                          {exp && (
                            <p className="text-xs text-teal-300/90 font-medium italic bg-teal-500/5 p-2.5 rounded-lg border border-teal-500/15 mt-2">
                              💡 {exp}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleNodeCompleted(node.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                              isDone
                                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                                : 'bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isDone ? 'Completed' : 'Mark Done'}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleNodeExcluded(node.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                              isExcluded
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                            }`}
                          >
                            {isExcluded ? 'Skipped' : 'Skip'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
