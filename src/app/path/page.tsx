'use client';

import React from 'react';
import Link from 'next/link';
import { usePath } from '@/context/PathContext';
import { SkillTreeVisualizer } from '@/components/SkillTreeVisualizer';
import {
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
        <div className="w-16 h-16 rounded-2xl bg-[#FFF9F0] border border-[#E6DCCF] flex items-center justify-center mx-auto text-[#C96F4A] paper-shadow">
          <GitFork className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A3728]">No Active Learning Roadmap</h1>
        <p className="text-[#7A6553] text-sm">
          Please enter your learning ambition on the intake page to generate your personalized path.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#C96F4A] text-white font-bold rounded-xl text-sm shadow-md hover:bg-[#A85331] transition-all"
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
      <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-10 paper-shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3 py-1 rounded-full border border-[#8C9A76]/30 uppercase tracking-wider">
                Track: {parsedProfile.target_track}
              </span>
              <span className="text-xs text-[#7A6553] font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#B58B65]" />
                {total_est_hours} Total Hours ({parsedProfile.time_budget_weeks} Weeks)
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#4A3728] font-bold tracking-tight">
              Personalized Learning Roadmap
            </h1>
            <p className="text-xs sm:text-sm text-[#7A6553] italic max-w-xl font-medium">
              "{parsedProfile.raw_goal}"
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/onboarding"
              className="px-4 py-2.5 bg-[#FFFFFF] hover:bg-[#F0E8DC] text-[#4A3728] text-xs font-bold rounded-xl border border-[#E6DCCF] flex items-center gap-2 transition-all shadow-sm"
            >
              <Sliders className="w-4 h-4 text-[#C96F4A]" />
              Adjust Profile
            </Link>
            <Link
              href="/dashboard"
              className="px-5 py-2.5 bg-[#C96F4A] hover:bg-[#A85331] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
            >
              View Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Budget Trimming Banner */}
        {is_trimmed && (
          <div className="mt-6 bg-[#FFF9F0] border-2 border-[#C96F4A]/40 rounded-2xl p-4 flex items-start gap-3 text-[#4A3728] text-xs">
            <AlertCircle className="w-5 h-5 text-[#C96F4A] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#A85331]">Time Budget Constrained Optimization</div>
              <div className="mt-0.5 text-[#7A6553] leading-relaxed font-medium">
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
        <div className="flex items-center justify-between border-b border-[#E6DCCF] pb-4">
          <h2 className="text-2xl font-serif text-[#4A3728] font-bold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#C96F4A]" />
            Milestone Breakdown & Grounded Explanations
          </h2>
          {isLoading && (
            <span className="text-xs text-[#C96F4A] font-bold flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Recalculating path...
            </span>
          )}
        </div>

        <div className="space-y-6">
          {milestones.map((milestone) => (
            <div
              key={milestone.milestone_index}
              className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 space-y-5 paper-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#4A3728] text-white font-serif font-bold text-base flex items-center justify-center shadow-sm">
                    M{milestone.milestone_index}
                  </div>
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#4A3728]">{milestone.title}</h3>
                    <p className="text-xs text-[#7A6553] font-medium mt-0.5">
                      Estimated Duration: {milestone.est_hours} Hours &bull; {milestone.nodes.length} Topic(s)
                    </p>
                  </div>
                </div>

                {milestone.is_parallel && (
                  <span className="text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3.5 py-1 rounded-full border border-[#8C9A76]/30">
                    ⚡ Parallel Study Milestone
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {milestone.nodes.map((node) => {
                  const isDone = completedNodeIds.includes(node.id);
                  const isExcluded = excludedNodeIds.includes(node.id);
                  const exp = explanations[node.id];

                  return (
                    <div
                      key={node.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-[#E4EAD9] border-[#8C9A76] text-[#4A3728]'
                          : isExcluded
                          ? 'bg-[#F7F1E7] border-[#E6DCCF] opacity-60'
                          : 'bg-[#FFFFFF] border-[#E6DCCF] paper-shadow'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-serif font-bold text-[#4A3728]">{node.title}</span>
                            <span className="text-[10px] font-bold text-[#7A6553] bg-[#F0E8DC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {node.type}
                            </span>
                          </div>
                          <p className="text-xs text-[#7A6553] leading-relaxed font-medium">{node.description}</p>
                          {exp && (
                            <p className="text-xs text-[#4A3728] font-medium italic bg-[#FFF9F0] p-3 rounded-xl border border-[#E6DCCF] mt-2 leading-relaxed">
                              💡 "{exp}"
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleNodeCompleted(node.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                              isDone
                                ? 'bg-[#8C9A76] text-white shadow-sm'
                                : 'bg-[#F0E8DC] text-[#4A3728] hover:bg-[#8C9A76] hover:text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {isDone ? 'Mastered' : 'Mark Done'}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleNodeExcluded(node.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                              isExcluded
                                ? 'bg-[#C96F4A]/20 text-[#A85331] border-[#C96F4A]/40'
                                : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#7A6553] hover:text-[#4A3728]'
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
