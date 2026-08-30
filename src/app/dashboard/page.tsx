'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePath } from '@/context/PathContext';
import { SkillTreeVisualizer } from '@/components/SkillTreeVisualizer';
import {
  Trophy,
  Clock,
  CheckCircle2,
  GitFork,
  Plus,
  Flame,
  Target,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    pathOutput,
    parsedProfile,
    completedNodeIds,
    excludedNodeIds,
    loggedHoursMap,
    logHours,
    toggleNodeCompleted,
    toggleNodeExcluded,
  } = usePath();

  const [selectedLogNodeId, setSelectedLogNodeId] = useState<string>('');
  const [inputHours, setInputHours] = useState<number>(2);

  if (!pathOutput || !parsedProfile) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-teal-400">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white">No Learning Progress Found</h1>
        <p className="text-slate-400 text-sm">
          Please enter your learning goal on the intake page to start tracking your progress.
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

  const { recommended_nodes, total_est_hours, milestones } = pathOutput;
  const completedCount = completedNodeIds.filter((id) =>
    recommended_nodes.some((n) => n.id === id)
  ).length;

  const totalNodesCount = recommended_nodes.length;
  const completionPercentage =
    totalNodesCount > 0 ? Math.round((completedCount / totalNodesCount) * 100) : 0;

  const totalLoggedHours = Object.values(loggedHoursMap).reduce((a, b) => a + b, 0);

  // Next up recommended node (first incomplete node in milestone order)
  const nextNode = recommended_nodes.find((n) => !completedNodeIds.includes(n.id));

  const handleLogHoursSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLogNodeId && inputHours > 0) {
      logHours(selectedLogNodeId, inputHours);
      setInputHours(2);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Learning Progress Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Track your milestones, log study hours, and monitor your skill acquisition curve.
          </p>
        </div>
        <Link
          href="/path"
          className="px-5 py-2.5 bg-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-2 hover:bg-teal-400 transition-all shrink-0"
        >
          <GitFork className="w-4 h-4" />
          View Full Path
        </Link>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {/* % Completion */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Path Completion</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{completionPercentage}%</div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            {completedCount} of {totalNodesCount} Topics Mastered
          </p>
        </div>

        {/* Total Hours Logged */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Hours Logged</span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalLoggedHours}h</div>
          <p className="text-[11px] text-slate-500">
            Out of {total_est_hours}h total estimated roadmap duration
          </p>
        </div>

        {/* Active Track */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Target Track</span>
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white truncate capitalize">
            {parsedProfile.target_track}
          </div>
          <p className="text-[11px] text-slate-500">
            {parsedProfile.time_budget_weeks} Weeks Time Budget
          </p>
        </div>

        {/* Next Recommendation */}
        <div className="bg-slate-900/80 border border-teal-500/30 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-400">Next Action</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {nextNode ? nextNode.title : 'All Milestones Complete! 🎉'}
          </div>
          <p className="text-[11px] text-slate-400">
            {nextNode ? `${nextNode.est_hours}h • Diff ${nextNode.difficulty}/5` : 'Great job!'}
          </p>
        </div>
      </div>

      {/* Log Study Hours Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-400" />
          Log Study Hours
        </h3>

        <form onSubmit={handleLogHoursSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedLogNodeId}
            onChange={(e) => setSelectedLogNodeId(e.target.value)}
            className="w-full sm:flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">-- Select Topic to Log Hours --</option>
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
            className="w-full sm:w-28 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />

          <button
            type="submit"
            disabled={!selectedLogNodeId}
            className="w-full sm:w-auto px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Log Hours
          </button>
        </form>
      </div>

      {/* Skill Tree Visualizer */}
      <SkillTreeVisualizer
        milestones={milestones}
        completedNodeIds={completedNodeIds}
        excludedNodeIds={excludedNodeIds}
        targetTrack={parsedProfile.target_track}
        onToggleNodeCompleted={toggleNodeCompleted}
        onToggleNodeExcluded={toggleNodeExcluded}
      />
    </div>
  );
}
