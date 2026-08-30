'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePath } from '@/context/PathContext';
import { SkillTreeVisualizer } from '@/components/SkillTreeVisualizer';
import {
  Trophy,
  Clock,
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
        <div className="w-16 h-16 rounded-2xl bg-[#FFF9F0] border border-[#E6DCCF] flex items-center justify-center mx-auto text-[#C96F4A] paper-shadow">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A3728]">No Learning Progress Found</h1>
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

  const { recommended_nodes, total_est_hours, milestones } = pathOutput;
  const completedCount = completedNodeIds.filter((id) =>
    recommended_nodes.some((n) => n.id === id)
  ).length;

  const totalNodesCount = recommended_nodes.length;
  const completionPercentage =
    totalNodesCount > 0 ? Math.round((completedCount / totalNodesCount) * 100) : 0;

  const totalLoggedHours = Object.values(loggedHoursMap).reduce((a, b) => a + b, 0);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6DCCF] pb-6">
        <div>
          <h1 className="text-4xl font-serif text-[#4A3728] font-bold tracking-tight">
            Learning Progress Dashboard
          </h1>
          <p className="text-[#7A6553] text-sm mt-1">
            Track your milestones, log study hours, and monitor your skill acquisition curve.
          </p>
        </div>
        <Link
          href="/path"
          className="px-5 py-2.5 bg-[#C96F4A] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 hover:bg-[#A85331] transition-all shrink-0"
        >
          <GitFork className="w-4 h-4" />
          View Full Path
        </Link>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {/* % Completion */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6553]">Path Completion</span>
            <Trophy className="w-4 h-4 text-[#8C9A76]" />
          </div>
          <div className="text-4xl font-serif font-bold text-[#4A3728]">{completionPercentage}%</div>
          <div className="w-full bg-[#E6DCCF] h-2.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[#8C9A76] h-full transition-all duration-500 rounded-full"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            {completedCount} of {totalNodesCount} Topics Mastered
          </p>
        </div>

        {/* Total Hours Logged */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6553]">Hours Logged</span>
            <Clock className="w-4 h-4 text-[#C96F4A]" />
          </div>
          <div className="text-4xl font-serif font-bold text-[#4A3728]">{totalLoggedHours}h</div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            Out of {total_est_hours}h total estimated roadmap duration
          </p>
        </div>

        {/* Active Track */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#7A6553]">Target Track</span>
            <Target className="w-4 h-4 text-[#B58B65]" />
          </div>
          <div className="text-xl font-bold font-serif text-[#4A3728] truncate capitalize">
            {parsedProfile.target_track}
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            {parsedProfile.time_budget_weeks} Weeks Time Budget
          </p>
        </div>

        {/* Next Recommendation */}
        <div className="bg-[#FFF9F0] border-2 border-[#C96F4A]/40 rounded-3xl p-6 space-y-3 paper-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C96F4A]">Next Up</span>
            <Flame className="w-4 h-4 text-[#C96F4A]" />
          </div>
          <div className="text-[#4A3728] font-serif font-bold text-base truncate">
            {nextNode ? nextNode.title : 'All Milestones Complete! 🎉'}
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium">
            {nextNode ? `${nextNode.est_hours}h • Level ${nextNode.difficulty}/5` : 'Great job!'}
          </p>
        </div>
      </div>

      {/* Log Study Hours Card */}
      <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 space-y-4 paper-shadow">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[#4A3728] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#C96F4A]" />
          Log Study Hours
        </h3>

        <form onSubmit={handleLogHoursSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={selectedLogNodeId}
            onChange={(e) => setSelectedLogNodeId(e.target.value)}
            className="w-full sm:flex-1 bg-[#FFFFFF] border-2 border-[#E6DCCF] rounded-xl px-4 py-3 text-xs text-[#4A3728] font-semibold focus:outline-none focus:border-[#C96F4A]"
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
            className="w-full sm:w-28 bg-[#FFFFFF] border-2 border-[#E6DCCF] rounded-xl px-4 py-3 text-xs text-[#4A3728] font-bold focus:outline-none focus:border-[#C96F4A]"
          />

          <button
            type="submit"
            disabled={!selectedLogNodeId}
            className="w-full sm:w-auto px-6 py-3 bg-[#C96F4A] hover:bg-[#A85331] disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shrink-0"
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
