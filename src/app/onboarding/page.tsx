'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePath } from '@/context/PathContext';
import { TrackId, UserParsedProfile } from '@/types/ontology';
import { Check, ArrowRight, RefreshCw, Clock, Layers, Sparkles, Award } from 'lucide-react';
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
    createAndSelectRoadmap,
    bulkSetKnownPrior,
    skillMasteries,
    setIsLoading,
    isLoading,
    rawGoal,
  } = usePath();

  const [selectedTrack, setSelectedTrack] = useState<TrackId>('data-science');
  const [budgetWeeks, setBudgetWeeks] = useState<number>(24);
  const [selectedKnownNodeIds, setSelectedKnownNodeIds] = useState<string[]>([]);

  const trackNodes = rawOntology.nodes.filter((n) => n.track === selectedTrack);

  useEffect(() => {
    if (parsedProfile) {
      setSelectedTrack(parsedProfile.target_track || 'data-science');
      setBudgetWeeks(parsedProfile.time_budget_weeks || 24);

      // Pre-select skills from parsed intent OR already in global skillMasteries
      const initialKnown = new Set<string>(parsedProfile.known_node_ids || []);
      Object.keys(skillMasteries).forEach((id) => initialKnown.add(id));
      setSelectedKnownNodeIds(Array.from(initialKnown));
    }
  }, [parsedProfile, skillMasteries]);

  const toggleKnownNode = (nodeId: string) => {
    setSelectedKnownNodeIds((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const handleConfirmProfile = async () => {
    setIsLoading(true);

    try {
      // 1. Create and select the roadmap in the database / context
      const newRoadmap = await createAndSelectRoadmap({
        title: TRACK_NAMES[selectedTrack],
        target_track: selectedTrack,
        time_budget_weeks: budgetWeeks,
        weekly_hours: 10,
        raw_goal: rawGoal || `Master ${TRACK_NAMES[selectedTrack]}`,
        known_node_ids: selectedKnownNodeIds,
      });

      if (newRoadmap) {
        // 2. Set the selected existing competencies to 'known-prior'
        await bulkSetKnownPrior(selectedKnownNodeIds);
        router.push('/path');
      }
    } catch (err) {
      console.error('Error generating roadmap:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="border-b border-[#E6DCCF] pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3.5 py-1 rounded-full border border-[#8C9A76]/30 mb-3 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Stage 2: Profile Calibration & Competencies
        </div>
        <h1 className="text-4xl font-serif text-[#4A3728] tracking-tight">
          Refine & Calibrate Your Intent
        </h1>
        <p className="text-[#7A6553] text-sm mt-1">
          Review the extracted track, time budget, and existing competencies before initiating the graph recommendation engine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Track Selection */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl p-6 space-y-4 paper-shadow">
          <label className="text-xs font-bold uppercase tracking-wider text-[#4A3728] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#C96F4A]" /> Target Track
          </label>
          <div className="space-y-3">
            {(Object.keys(TRACK_NAMES) as TrackId[]).map((trackId) => (
              <button
                key={trackId}
                type="button"
                onClick={() => setSelectedTrack(trackId)}
                className={`w-full text-left p-4 rounded-xl border text-sm font-semibold transition-all ${
                  selectedTrack === trackId
                    ? 'bg-[#C96F4A] text-white border-[#C96F4A] shadow-md'
                    : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#4A3728] hover:border-[#B58B65]'
                }`}
              >
                {TRACK_NAMES[trackId]}
              </button>
            ))}
          </div>
        </div>

        {/* Time Budget */}
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl p-6 space-y-4 paper-shadow">
          <label className="text-xs font-bold uppercase tracking-wider text-[#4A3728] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C96F4A]" /> Time Budget (Weeks)
          </label>
          <div className="space-y-4">
            <div className="text-center py-4 bg-[#FFFFFF] rounded-xl border border-[#E6DCCF]">
              <span className="text-4xl font-serif text-[#C96F4A] font-bold">{budgetWeeks}</span>
              <span className="text-[#7A6553] text-xs font-semibold block mt-1">Weeks (~{budgetWeeks * 10} Hours)</span>
            </div>
            <input
              type="range"
              min={4}
              max={52}
              step={2}
              value={budgetWeeks}
              onChange={(e) => setBudgetWeeks(Number(e.target.value))}
              className="w-full accent-[#C96F4A] bg-[#E6DCCF] h-2 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-[#7A6553] font-medium">
              <span>4 Wks (Accelerated)</span>
              <span>24 Wks (Standard)</span>
              <span>52 Wks (Comprehensive)</span>
            </div>
          </div>
        </div>

        {/* Known Skills Mapping (Phase 1: writes directly to known-prior) */}
        <div className="md:col-span-3 bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl p-6 space-y-4 paper-shadow">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#4A3728] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#B58B65]" />
                Existing Competencies (Marked as Known Prior — excluded from path & 0h study)
              </label>
              <p className="text-[11px] text-[#7A6553] mt-0.5">
                Skills you already know will be excluded from the active roadmap and marked with a special badge.
              </p>
            </div>
            <span className="text-xs text-[#B58B65] font-bold bg-[#F7F1E7] px-3 py-1 rounded-full border border-[#E6DCCF]">
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
                  className={`flex items-start gap-3 p-3.5 rounded-xl border text-left text-xs transition-all ${
                    isChecked
                      ? 'bg-[#E8D6C3]/50 border-[#B58B65] text-[#4A3728] shadow-sm'
                      : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#7A6553] hover:border-[#B58B65]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                      isChecked
                        ? 'bg-[#B58B65] border-[#B58B65] text-white'
                        : 'border-[#B58B65] bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <div>
                    <div className="font-bold text-[#4A3728]">{node.title}</div>
                    <div className="text-[11px] text-[#7A6553] mt-0.5">
                      {node.est_hours}h &bull; Difficulty {node.difficulty}/5
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E6DCCF]">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-xs text-[#7A6553] hover:text-[#4A3728] font-semibold flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Re-enter Goal Text
        </button>

        <button
          type="button"
          onClick={handleConfirmProfile}
          disabled={isLoading}
          className="px-8 py-3.5 bg-[#C96F4A] hover:bg-[#A85331] text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {isLoading ? 'Building Multi-Roadmap Engine...' : 'Confirm & Launch Visual Roadmap'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
