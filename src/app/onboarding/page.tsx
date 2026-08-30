'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePath } from '@/context/PathContext';
import { TrackId, UserParsedProfile } from '@/types/ontology';
import { Check, ArrowRight, RefreshCw, Clock, Layers, Sparkles } from 'lucide-react';
import rawOntology from '@/data/ontology.json';

const TRACK_NAMES: Record<TrackId, string> = {
  'data-science': 'Data Science & Machine Learning',
  frontend: 'Frontend Web Development',
  devops: 'DevOps & Cloud Engineering',
};

export default function OnboardingPage() {
  const router = useRouter();
  const {
    parsedProfile,
    setParsedProfile,
    setPathOutput,
    setExplanations,
    setIsLoading,
    isLoading,
    rawGoal,
  } = usePath();

  const [selectedTrack, setSelectedTrack] = useState<TrackId>('data-science');
  const [budgetWeeks, setBudgetWeeks] = useState<number>(24);
  const [selectedKnownNodeIds, setSelectedKnownNodeIds] = useState<string[]>([]);

  // Track nodes for the selected track
  const trackNodes = rawOntology.nodes.filter((n) => n.track === selectedTrack);

  useEffect(() => {
    if (parsedProfile) {
      setSelectedTrack(parsedProfile.target_track || 'data-science');
      setBudgetWeeks(parsedProfile.time_budget_weeks || 24);
      setSelectedKnownNodeIds(parsedProfile.known_node_ids || []);
    }
  }, [parsedProfile]);

  const toggleKnownNode = (nodeId: string) => {
    setSelectedKnownNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleConfirmProfile = async () => {
    setIsLoading(true);

    const updatedProfile: UserParsedProfile = {
      target_track: selectedTrack,
      known_skills: trackNodes
        .filter((n) => selectedKnownNodeIds.includes(n.id))
        .map((n) => n.title),
      known_node_ids: selectedKnownNodeIds,
      time_budget_weeks: budgetWeeks,
      raw_goal: rawGoal || `Master ${TRACK_NAMES[selectedTrack]}`,
    };

    setParsedProfile(updatedProfile);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideProfile: updatedProfile,
          knownNodeIds: selectedKnownNodeIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPathOutput(data.path);
        setExplanations(data.explanations || {});
        router.push('/path');
      }
    } catch (err) {
      console.error('Error generating path:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-400 bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Stage 2: Profile Confirmation
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Review & Refine Your Profile
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          PathFinder parsed your goal into structured intent. Adjust your current skills, target track, or time budget below before building your graph.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Track Selection */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" /> Target Career Track
          </label>
          <div className="space-y-3">
            {(Object.keys(TRACK_NAMES) as TrackId[]).map((trackId) => (
              <button
                key={trackId}
                type="button"
                onClick={() => setSelectedTrack(trackId)}
                className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition-all ${
                  selectedTrack === trackId
                    ? 'bg-teal-500/15 border-teal-500/50 text-teal-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {TRACK_NAMES[trackId]}
              </button>
            ))}
          </div>
        </div>

        {/* Time Budget */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-400" /> Time Budget (Weeks)
          </label>
          <div className="space-y-4">
            <div className="text-center py-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-4xl font-extrabold text-teal-400">{budgetWeeks}</span>
              <span className="text-slate-400 text-xs block mt-1">Weeks (~{budgetWeeks * 10} Hours)</span>
            </div>
            <input
              type="range"
              min={4}
              max={52}
              step={2}
              value={budgetWeeks}
              onChange={(e) => setBudgetWeeks(Number(e.target.value))}
              className="w-full accent-teal-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-mono">
              <span>4 Wks (Fast)</span>
              <span>24 Wks (Standard)</span>
              <span>52 Wks (Deep)</span>
            </div>
          </div>
        </div>

        {/* Mapped Known Skills */}
        <div className="md:col-span-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Skills You Already Know (Path Engine will skip these)
            </label>
            <span className="text-xs text-teal-400 font-semibold">
              {selectedKnownNodeIds.length} Selected
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-2">
            {trackNodes.map((node) => {
              const isChecked = selectedKnownNodeIds.includes(node.id);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => toggleKnownNode(node.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left text-xs transition-all ${
                    isChecked
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-semibold">{node.title}</div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      {node.est_hours}h &bull; Diff {node.difficulty}/5
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-enter Goal Text
        </button>

        <button
          type="button"
          onClick={handleConfirmProfile}
          disabled={isLoading}
          className="px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isLoading ? 'Running Path Engine...' : 'Confirm & Build Roadmap'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
