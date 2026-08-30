'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePath } from '@/context/PathContext';
import { PaceCard } from '@/components/dashboard/PaceCard';
import { calculatePaceMetrics } from '@/lib/engine/pace-calculator';
import rawSubtopics from '@/data/subtopics.json';
import { Subtopic } from '@/types/resource';
import {
  Trophy,
  Clock,
  GitFork,
  Plus,
  Flame,
  Target,
  ArrowRight,
  CheckCircle2,
  Award,
  Layers,
  Sparkles,
  BookOpen,
} from 'lucide-react';

// Sandglass/Hourglass animation component
function SandTimer({ percentage }: { percentage: number }) {
  const filled = Math.min(100, Math.max(0, percentage));
  return (
    <div className="flex flex-col items-center justify-center gap-1 select-none">
      <div className="relative w-14 h-20">
        {/* SVG hourglass */}
        <svg viewBox="0 0 56 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Outer frame */}
          <path d="M4 2 L52 2 L52 6 L36 36 L36 44 L52 74 L52 78 L4 78 L4 74 L20 44 L20 36 L4 6 Z"
            stroke="#B58B65" strokeWidth="2.5" fill="none" />
          {/* Top half fill (empties as time passes) */}
          <clipPath id="topClip">
            <path d="M6 6 L50 6 L34 36 L22 36 Z" />
          </clipPath>
          <rect
            x="0" y={6 + (30 * filled) / 100} width="56" height={30 - (30 * filled) / 100}
            fill="#E4EAD9" clipPath="url(#topClip)"
            style={{ transition: 'all 1s ease' }}
          />
          <path d="M6 6 L50 6 L34 36 L22 36 Z" stroke="#B58B65" strokeWidth="1.5" fill="none" />

          {/* Neck/middle */}
          <line x1="22" y1="36" x2="22" y2="44" stroke="#B58B65" strokeWidth="1.5" />
          <line x1="34" y1="36" x2="34" y2="44" stroke="#B58B65" strokeWidth="1.5" />

          {/* Bottom half fill (fills as time passes) */}
          <clipPath id="bottomClip">
            <path d="M22 44 L34 44 L50 74 L6 74 Z" />
          </clipPath>
          <rect
            x="0" y={74 - (30 * filled) / 100} width="56" height={(30 * filled) / 100}
            fill="#8C9A76" clipPath="url(#bottomClip)"
            style={{ transition: 'all 1s ease' }}
          />
          <path d="M22 44 L34 44 L50 74 L6 74 Z" stroke="#B58B65" strokeWidth="1.5" fill="none" />

          {/* Sand particle falling (animated dot) */}
          {filled < 99 && (
            <circle cx="28" cy="40" r="2" fill="#C96F4A" className="animate-bounce" style={{ animationDuration: '1.5s' }} />
          )}
        </svg>
        {/* Percentage label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-black text-[#4A3728] drop-shadow-sm">{filled}%</span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-[#7A6553] text-center">Progress</span>
    </div>
  );
}

export default function DashboardPage() {
  const {
    activeRoadmap,
    roadmaps,
    pathOutput,
    parsedProfile,
    nodeStatuses,
    completedNodeIds,
    knownPriorNodeIds,
    learningNodeIds,
    loggedHoursMap,
    logHours,
    setNodeStatusAction,
  } = usePath();

  const [selectedLogNodeId, setSelectedLogNodeId] = useState<string>('');
  const [inputHours, setInputHours] = useState<number>(2);

  const { recommended_nodes = [], total_est_hours = 0, milestones = [], known_nodes = [] } = pathOutput || {};

  // --- Topic-based progress ---
  const allTrackNodes = useMemo(() => {
    return [...(known_nodes || []), ...recommended_nodes];
  }, [known_nodes, recommended_nodes]);

  const doneTopicCount = useMemo(() => {
    return allTrackNodes.filter(
      (n) => nodeStatuses[n.id] === 'done' || nodeStatuses[n.id] === 'known-prior'
    ).length;
  }, [allTrackNodes, nodeStatuses]);

  const totalTopicCount = allTrackNodes.length;
  const topicPercentage = totalTopicCount > 0 ? Math.round((doneTopicCount / totalTopicCount) * 100) : 0;

  // --- Subtopic-based progress ---
  const subtopicsByParent = useMemo(() => {
    const map = new Map<string, Subtopic[]>();
    (rawSubtopics as Subtopic[]).forEach((sub) => {
      if (!map.has(sub.parent_skill_id)) map.set(sub.parent_skill_id, []);
      map.get(sub.parent_skill_id)!.push(sub);
    });
    return map;
  }, []);

  const completedSubtopicsCount = useMemo(() => {
    let count = 0;
    allTrackNodes.forEach((n) => {
      if (nodeStatuses[n.id] === 'done' || nodeStatuses[n.id] === 'known-prior') {
        count += (subtopicsByParent.get(n.id) || []).length;
      }
    });
    return count;
  }, [allTrackNodes, nodeStatuses, subtopicsByParent]);

  const totalSubtopicsCount = useMemo(() => {
    return allTrackNodes.reduce((acc, n) => acc + (subtopicsByParent.get(n.id) || []).length, 0);
  }, [allTrackNodes, subtopicsByParent]);

  // --- Hours logged (for the sand timer card) ---
  const totalHoursLogged = useMemo(() => {
    return Object.values(loggedHoursMap).reduce((a, b) => a + b, 0);
  }, [loggedHoursMap]);

  const hoursPercentage = total_est_hours > 0
    ? Math.min(100, Math.round((totalHoursLogged / total_est_hours) * 100))
    : 0;

  // Pace Metrics
  const paceMetrics = useMemo(() => {
    return calculatePaceMetrics({
      loggedHoursMap,
      nodeStatuses,
      totalEstHours: total_est_hours || 80,
      timeBudgetWeeks: parsedProfile?.time_budget_weeks || activeRoadmap?.time_budget_weeks || 24,
      weeklyHoursTarget: activeRoadmap?.weekly_hours || 10,
    });
  }, [loggedHoursMap, nodeStatuses, total_est_hours, parsedProfile, activeRoadmap]);

  const nextNode = recommended_nodes.find(
    (n) => !completedNodeIds.includes(n.id) && !knownPriorNodeIds.includes(n.id)
  );

  const handleLogHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLogNodeId && inputHours > 0) {
      logHours(selectedLogNodeId, inputHours);
      if (nodeStatuses[selectedLogNodeId] !== 'done') {
        setNodeStatusAction(selectedLogNodeId, 'learning');
      }
      setInputHours(2);
    }
  };

  if (!pathOutput || !parsedProfile) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#FFF9F0] border border-[#E6DCCF] flex items-center justify-center mx-auto text-[#C96F4A] paper-shadow">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A3728]">No Active Progress Found</h1>
        <p className="text-[#7A6553] text-sm">
          Please enter your learning ambition on the intake page to start tracking your progress.
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DCCF] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3.5 py-1 rounded-full border border-[#8C9A76]/30 mb-2 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Learning Velocity & Progress
          </div>
          <h1 className="text-4xl font-serif text-[#4A3728] font-bold tracking-tight">
            {activeRoadmap ? activeRoadmap.title : 'Progress Dashboard'}
          </h1>
          <p className="text-[#7A6553] text-sm mt-1">
            Topic & subtopic completion, pace velocity, and study hour tracking.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/path"
            className="px-5 py-2.5 bg-[#C96F4A] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 hover:bg-[#A85331] transition-all"
          >
            <GitFork className="w-4 h-4" />
            View Visual Canvas
          </Link>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {/* Topic-based Progress with Sand Timer */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-5 paper-shadow flex gap-4 items-center col-span-1 sm:col-span-2 md:col-span-1">
          <SandTimer percentage={topicPercentage} />
          <div className="flex-1 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6553]">
              Topics Completed
            </span>
            <div className="text-4xl font-serif font-bold text-[#4A3728]">
              {topicPercentage}%
            </div>
            <div className="w-full bg-[#E6DCCF] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#8C9A76] h-full rounded-full transition-all duration-700"
                style={{ width: `${topicPercentage}%` }}
              />
            </div>
            <p className="text-[11px] text-[#7A6553] font-medium">
              {doneTopicCount} / {totalTopicCount} topics mastered
            </p>
          </div>
        </div>

        {/* Subtopic Progress */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6553]">
              Subtopics Done
            </span>
            <Layers className="w-4 h-4 text-[#B58B65]" />
          </div>
          <div className="text-4xl font-serif font-bold text-[#4A3728]">
            {completedSubtopicsCount}
            <span className="text-xl text-[#7A6553]">/{totalSubtopicsCount}</span>
          </div>
          <div className="w-full bg-[#E6DCCF] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#B58B65] h-full rounded-full transition-all duration-700"
              style={{ width: `${totalSubtopicsCount > 0 ? (completedSubtopicsCount / totalSubtopicsCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            Granular subtopic mastery across all topics
          </p>
        </div>

        {/* Time Dedicated — with hourglass */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6553]">
              Time Dedicated
            </span>
            <span className="text-xl" title="Hours logged vs total estimated">⏳</span>
          </div>
          <div className="text-4xl font-serif font-bold text-[#4A3728]">
            {totalHoursLogged}h
          </div>
          <div className="w-full bg-[#E6DCCF] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#C96F4A] h-full rounded-full transition-all duration-700"
              style={{ width: `${hoursPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            of {total_est_hours}h total estimated ({hoursPercentage}% time covered)
          </p>
        </div>

        {/* Next Up */}
        <div className="bg-[#FFF9F0] border-2 border-[#C96F4A]/40 rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">
              Next Up in Path
            </span>
            <Flame className="w-4 h-4 text-[#C96F4A]" />
          </div>
          <div className="text-[#4A3728] font-serif font-bold text-base truncate">
            {nextNode ? nextNode.title : 'All Milestones Complete! 🎉'}
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            {nextNode ? `${nextNode.est_hours}h est · Level ${nextNode.difficulty}/5` : 'Great job completing everything!'}
          </p>
          {nextNode && (
            <Link href="/path" className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C96F4A] hover:underline">
              Open on canvas <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Status Breakdown Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#E4EAD9] border border-[#8C9A76]/40 rounded-2xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#8C9A76] shrink-0" />
          <div>
            <div className="text-2xl font-serif font-bold text-[#4A3728]">{completedNodeIds.length}</div>
            <div className="text-[11px] font-bold text-[#8C9A76]">Done (Mastered)</div>
          </div>
        </div>
        <div className="bg-[#F9F5EF] border border-[#B58B65]/40 rounded-2xl px-5 py-4 flex items-center gap-3">
          <Award className="w-5 h-5 text-[#B58B65] shrink-0" />
          <div>
            <div className="text-2xl font-serif font-bold text-[#4A3728]">{knownPriorNodeIds.length}</div>
            <div className="text-[11px] font-bold text-[#B58B65]">Known Prior</div>
          </div>
        </div>
        <div className="bg-white border border-[#C96F4A]/30 rounded-2xl px-5 py-4 flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-[#C96F4A] shrink-0" />
          <div>
            <div className="text-2xl font-serif font-bold text-[#4A3728]">{learningNodeIds.length}</div>
            <div className="text-[11px] font-bold text-[#C96F4A]">In Progress</div>
          </div>
        </div>
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl px-5 py-4 flex items-center gap-3">
          <Target className="w-5 h-5 text-[#7A6553] shrink-0" />
          <div>
            <div className="text-2xl font-serif font-bold text-[#4A3728]">
              {recommended_nodes.filter(n => nodeStatuses[n.id] === 'not-started' || !nodeStatuses[n.id]).length}
            </div>
            <div className="text-[11px] font-bold text-[#7A6553]">Remaining</div>
          </div>
        </div>
      </div>

      {/* Phase 6: Pace Card */}
      <PaceCard pace={paceMetrics} />

      {/* Log Study Hours */}
      <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 space-y-4 paper-shadow">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#4A3728] flex items-center gap-2">
          ⏳ Log Active Study Hours
          <span className="text-[10px] font-medium text-[#7A6553] normal-case ml-1">(auto-sets status to Learning)</span>
        </h3>

        <form onSubmit={handleLogHoursSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedLogNodeId}
            onChange={(e) => setSelectedLogNodeId(e.target.value)}
            className="w-full sm:flex-1 bg-white border-2 border-[#E6DCCF] rounded-xl px-4 py-3 text-xs text-[#4A3728] font-semibold focus:outline-none focus:border-[#C96F4A]"
          >
            <option value="">-- Select Topic to Log Study Hours --</option>
            {recommended_nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.title} ({loggedHoursMap[node.id] || 0}h logged / {node.est_hours}h est)
              </option>
            ))}
          </select>

          <input
            type="number"
            min={0.5}
            max={20}
            step={0.5}
            value={inputHours}
            onChange={(e) => setInputHours(Number(e.target.value))}
            className="w-full sm:w-28 bg-white border-2 border-[#E6DCCF] rounded-xl px-4 py-3 text-xs text-[#4A3728] font-bold focus:outline-none focus:border-[#C96F4A]"
          />

          <button
            type="submit"
            disabled={!selectedLogNodeId}
            className="w-full sm:w-auto px-6 py-3 bg-[#C96F4A] hover:bg-[#A85331] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" /> Log Hours
          </button>
        </form>
      </div>
    </div>
  );
}
