'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePath } from '@/context/PathContext';
import { RoadmapCanvas } from '@/components/canvas/RoadmapCanvas';
import { analyzeBottlenecks } from '@/lib/engine/bottleneck-analyzer';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  GitFork,
  ArrowRight,
  RefreshCw,
  Layers,
  Sliders,
  Sparkles,
  Zap,
  Award,
  BookOpen,
} from 'lucide-react';
import rawOntology from '@/data/ontology.json';
import rawSubtopics from '@/data/subtopics.json';
import { SkillOntology } from '@/types/ontology';
import { Subtopic } from '@/types/resource';

export default function PathPage() {
  const {
    activeRoadmap,
    pathOutput,
    parsedProfile,
    explanations,
    nodeStatuses,
    completedNodeIds,
    knownPriorNodeIds,
    learningNodeIds,
    skippedNodeIds,
    setNodeStatusAction,
    isLoading,
  } = usePath();

  const [viewMode, setViewMode] = useState<'canvas' | 'cards'>('canvas');

  const bottlenecks = useMemo(() => {
    if (!parsedProfile?.target_track) return [];
    const { bottleneckNodeIds } = analyzeBottlenecks(
      rawOntology as SkillOntology,
      parsedProfile.target_track
    );
    return bottleneckNodeIds;
  }, [parsedProfile?.target_track]);

  const subtopicsByParent = useMemo(() => {
    const map = new Map<string, Subtopic[]>();
    (rawSubtopics as Subtopic[]).forEach((subtopic) => {
      const parentSubtopics = map.get(subtopic.parent_skill_id) || [];
      parentSubtopics.push(subtopic);
      map.set(subtopic.parent_skill_id, parentSubtopics);
    });
    return map;
  }, []);

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
    <div className="max-w-7xl mx-auto space-y-8 py-2">
      {/* Top Banner */}
      <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 paper-shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3 py-1 rounded-full border border-[#8C9A76]/30 uppercase tracking-wider">
                Track: {parsedProfile.target_track}
              </span>
              <span className="text-xs text-[#7A6553] font-semibold flex items-center gap-1 bg-[#FFFFFF] px-3 py-1 rounded-full border border-[#E6DCCF]">
                <Clock className="w-3.5 h-3.5 text-[#B58B65]" />
                {total_est_hours} Total Hours ({parsedProfile.time_budget_weeks} Weeks @ 10h/wk)
              </span>
              {bottlenecks.length > 0 && (
                <span className="text-xs text-[#A85331] font-bold bg-[#C96F4A]/15 px-3 py-1 rounded-full border border-[#C96F4A]/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current text-[#C96F4A]" />
                  {bottlenecks.length} Critical Bottleneck Skills
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif text-[#4A3728] font-bold tracking-tight">
              {activeRoadmap ? activeRoadmap.title : 'Personalized Learning Roadmap'}
            </h1>
            <p className="text-xs sm:text-sm text-[#7A6553] italic max-w-2xl font-medium">
              "{parsedProfile.raw_goal}"
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="bg-[#FFFFFF] border border-[#E6DCCF] rounded-xl p-1 flex items-center shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('canvas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'canvas'
                    ? 'bg-[#C96F4A] text-white shadow-sm'
                    : 'text-[#7A6553] hover:text-[#4A3728]'
                }`}
              >
                Canvas Graph
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-[#C96F4A] text-white shadow-sm'
                    : 'text-[#7A6553] hover:text-[#4A3728]'
                }`}
              >
                Milestone Cards
              </button>
            </div>

            <Link
              href="/onboarding"
              className="px-4 py-2 bg-[#FFFFFF] hover:bg-[#F0E8DC] text-[#4A3728] text-xs font-bold rounded-xl border border-[#E6DCCF] flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-[#C96F4A]" />
              Adjust Profile
            </Link>

            <Link
              href="/dashboard"
              className="px-5 py-2 bg-[#C96F4A] hover:bg-[#A85331] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Budget Trimming Banner */}
        {is_trimmed && (
          <div className="mt-6 bg-[#FFF9F0] border-2 border-[#C96F4A]/40 rounded-2xl p-4 flex items-start gap-3 text-[#4A3728] text-xs">
            <AlertCircle className="w-5 h-5 text-[#C96F4A] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#A85331]">
                Knapsack Precedence-Constrained Budget Optimization
              </div>
              <div className="mt-0.5 text-[#7A6553] leading-relaxed font-medium">
                Total track content exceeded your {time_budget_hours}h limit. The Knapsack Optimizer prioritized foundational prerequisite chains and trimmed {trimmed_nodes.length} optional topic(s) to maximize your skill value within budget!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Interactive Graph Canvas View */}
      {viewMode === 'canvas' ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-serif text-[#4A3728] font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C96F4A]" />
                Interactive Visual Skill Graph (Roadmap Flow)
              </h2>
              <p className="text-xs text-[#7A6553] mt-0.5 font-medium">
                Click any topic to open Free Resources and the Node-Scoped AI Tutor. Right-click nodes for quick status toggle.
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-[#8C9A76]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </span>
              <span className="flex items-center gap-1 text-[#B58B65]">
                <Award className="w-3.5 h-3.5" /> Known Prior
              </span>
              <span className="flex items-center gap-1 text-[#C96F4A]">
                <BookOpen className="w-3.5 h-3.5" /> Learning
              </span>
              <span className="flex items-center gap-1 text-[#7A6553]">
                <Zap className="w-3 h-3 text-[#C96F4A] fill-current" /> Bottleneck
              </span>
            </div>
          </div>

          <RoadmapCanvas
            milestones={milestones}
            targetTrack={parsedProfile.target_track}
            nodeStatuses={nodeStatuses}
            explanations={explanations}
            bottleneckNodeIds={bottlenecks}
            onSetNodeStatus={setNodeStatusAction}
          />
        </div>
      ) : (
        /* Detailed Milestone Cards List View */
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
            {milestones.map((milestone) => {
              const isCompletedGroup = milestone.milestone_index === 0;
              return (
                <div
                  key={milestone.milestone_index}
                  className={`border rounded-3xl p-6 sm:p-8 space-y-5 paper-shadow ${
                    isCompletedGroup
                      ? 'bg-[#F2F6ED] border-[#8C9A76]'
                      : 'bg-[#FFF9F0] border-[#E6DCCF]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-serif font-bold text-sm flex items-center justify-center shadow-sm ${
                          isCompletedGroup
                            ? 'bg-[#8C9A76] text-white'
                            : 'bg-[#4A3728] text-white'
                        }`}
                      >
                        {isCompletedGroup ? '✓' : `M${milestone.milestone_index}`}
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-bold text-[#4A3728]">{milestone.title}</h3>
                        <p className="text-xs text-[#7A6553] font-medium mt-0.5">
                          {milestone.nodes.length} Topic(s) &bull; {milestone.est_hours}h estimated
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCompletedGroup && (
                        <span className="text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3.5 py-1 rounded-full border border-[#8C9A76]/30">
                          ✓ Mastered / Known Prior
                        </span>
                      )}
                      {!isCompletedGroup && milestone.is_parallel && (
                        <span className="text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3.5 py-1 rounded-full border border-[#8C9A76]/30">
                          ⚡ Parallel Study Milestone
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {milestone.nodes.map((node) => {
                      const st = nodeStatuses[node.id] || (isCompletedGroup ? 'done' : 'not-started');
                      const isDone = st === 'done';
                      const isKnownPrior = st === 'known-prior';
                      const isLearning = st === 'learning';
                      const isSkipped = st === 'skipped';
                      const exp = explanations[node.id];
                      const isBottleneck = bottlenecks.includes(node.id);

                      return (
                        <div
                          key={node.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            isDone
                              ? 'bg-[#E4EAD9] border-[#8C9A76]'
                              : isKnownPrior
                              ? 'bg-[#F9F5EF] border-[#B58B65]'
                              : isLearning
                              ? 'bg-white border-2 border-[#C96F4A] shadow-md ring-2 ring-[#C96F4A]/10'
                              : isSkipped
                              ? 'bg-[#F7F1E7] border-[#E6DCCF] opacity-60'
                              : 'bg-white border-[#E6DCCF] paper-shadow'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Status colored left bar */}
                                <div
                                  className={`w-1 h-8 rounded-full shrink-0 ${
                                    isDone
                                      ? 'bg-[#8C9A76]'
                                      : isKnownPrior
                                      ? 'bg-[#B58B65]'
                                      : isLearning
                                      ? 'bg-[#C96F4A]'
                                      : isSkipped
                                      ? 'bg-[#7A6553]/40'
                                      : 'bg-[#E6DCCF]'
                                  }`}
                                />
                                <div className="flex flex-wrap items-center gap-2 flex-1">
                                  <span className="text-sm sm:text-base font-serif font-bold text-[#4A3728]">
                                    {node.title}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#7A6553] bg-[#F0E8DC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {node.type}
                                  </span>
                                  {isBottleneck && (
                                    <span className="text-[9px] font-bold text-[#A85331] bg-[#C96F4A]/15 px-2 py-0.5 rounded-full border border-[#C96F4A]/30 uppercase tracking-wider flex items-center gap-1">
                                      <Zap className="w-2.5 h-2.5 fill-current" />
                                      Bottleneck
                                    </span>
                                  )}
                                  {/* Current status pill */}
                                  {(isDone || isKnownPrior || isLearning || isSkipped) && (
                                    <span
                                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                        isDone
                                          ? 'bg-[#8C9A76] text-white'
                                          : isKnownPrior
                                          ? 'bg-[#B58B65] text-white'
                                          : isLearning
                                          ? 'bg-[#C96F4A] text-white animate-pulse'
                                          : 'bg-[#7A6553]/50 text-white'
                                      }`}
                                    >
                                      {isDone ? '✓ Mastered' : isKnownPrior ? '★ Known Prior' : isLearning ? '● In Progress' : '⊘ Skipped'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs text-[#7A6553] leading-relaxed font-medium pl-3">
                                {node.description}
                              </p>
                              {(subtopicsByParent.get(node.id) || []).length > 0 && (
                                <div className="mt-3 ml-3 border-l-2 border-[#E6DCCF] pl-3 space-y-1.5">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#B58B65]">
                                    Subtopics
                                  </div>
                                  {(subtopicsByParent.get(node.id) || []).map((subtopic) => (
                                    <div
                                      key={subtopic.id}
                                      className="flex items-center justify-between gap-3 text-xs text-[#4A3728]"
                                    >
                                      <span>{subtopic.title}</span>
                                      <span className="shrink-0 text-[10px] text-[#7A6553]">
                                        {subtopic.est_hours}h
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {exp && (
                                <p className="text-xs text-[#4A3728] font-medium italic bg-[#FFF9F0] p-3 rounded-xl border border-[#E6DCCF] mt-1 leading-relaxed">
                                  💡 "{exp}"
                                </p>
                              )}
                            </div>

                            {/* 4-action quick status row */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setNodeStatusAction(node.id, isLearning ? 'not-started' : 'learning')
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                  isLearning
                                    ? 'bg-[#C96F4A] text-white shadow-sm'
                                    : 'bg-[#F0E8DC] text-[#4A3728] hover:bg-[#C96F4A] hover:text-white'
                                }`}
                              >
                                Learning
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setNodeStatusAction(node.id, isDone ? 'not-started' : 'done')
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                  isDone
                                    ? 'bg-[#8C9A76] text-white shadow-sm'
                                    : 'bg-[#F0E8DC] text-[#4A3728] hover:bg-[#8C9A76] hover:text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isDone ? 'Mastered' : 'Done'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setNodeStatusAction(node.id, isKnownPrior ? 'not-started' : 'known-prior')
                                }
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                  isKnownPrior
                                    ? 'bg-[#B58B65] text-white shadow-sm'
                                    : 'bg-[#F0E8DC] text-[#4A3728] hover:bg-[#B58B65] hover:text-white'
                                }`}
                              >
                                <Award className="w-3.5 h-3.5" />
                                Known
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setNodeStatusAction(node.id, isSkipped ? 'not-started' : 'skipped')
                                }
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                  isSkipped
                                    ? 'bg-[#7A6553] text-white border-[#7A6553]'
                                    : 'bg-white border-[#E6DCCF] text-[#7A6553] hover:text-[#4A3728]'
                                }`}
                              >
                                {isSkipped ? 'Skipped' : 'Skip'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
