'use client';

import React from 'react';
import { OntologyNode, PathMilestone, TrackId } from '@/types/ontology';
import { CheckCircle2, Sparkles, Clock, AlertTriangle, ArrowDown } from 'lucide-react';
import rawOntology from '@/data/ontology.json';

interface SkillTreeVisualizerProps {
  milestones: PathMilestone[];
  completedNodeIds: string[];
  excludedNodeIds: string[];
  targetTrack: TrackId;
  explanations?: Record<string, string>;
  onToggleNodeCompleted?: (nodeId: string) => void;
  onToggleNodeExcluded?: (nodeId: string) => void;
}

export const SkillTreeVisualizer: React.FC<SkillTreeVisualizerProps> = ({
  milestones,
  completedNodeIds,
  excludedNodeIds,
  targetTrack,
  explanations = {},
  onToggleNodeCompleted,
  onToggleNodeExcluded,
}) => {
  const completedSet = new Set(completedNodeIds);
  const excludedSet = new Set(excludedNodeIds);

  return (
    <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 space-y-8 paper-shadow-lg relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E6DCCF] pb-5 gap-3">
        <div>
          <h2 className="text-xl font-serif text-[#4A3728] font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C96F4A]" />
            Visual Skill Ontology Flow
          </h2>
          <p className="text-xs text-[#7A6553] mt-0.5 font-medium">
            Topologically ordered DAG graph flow. Sage = Mastered, Terracotta = Active Milestone, Warm Ivory = Upstream.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[#8C9A76]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8C9A76]" /> Mastered
          </span>
          <span className="flex items-center gap-1.5 text-[#C96F4A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C96F4A] animate-pulse" /> Active Path
          </span>
          <span className="flex items-center gap-1.5 text-[#7A6553]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B58B65]/40" /> Locked / Skipped
          </span>
        </div>
      </div>

      {/* Render Milestones as Layered Graph Levels */}
      <div className="space-y-8">
        {milestones.map((milestone, idx) => {
          const isCurrentActiveWave = idx === 0;

          return (
            <div key={milestone.milestone_index} className="relative">
              {idx > 0 && (
                <div className="flex justify-center -mt-5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-[#F7F1E7] border border-[#E6DCCF] flex items-center justify-center text-[#B58B65] shadow-sm">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              )}

              <div
                className={`border rounded-2xl p-6 space-y-4 transition-all ${
                  isCurrentActiveWave
                    ? 'bg-[#FFFFFF] border-2 border-[#C96F4A] paper-shadow-lg'
                    : 'bg-[#F7F1E7]/70 border-[#E6DCCF]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        isCurrentActiveWave
                          ? 'bg-[#C96F4A] text-white shadow-sm'
                          : 'bg-[#E6DCCF] text-[#4A3728]'
                      }`}
                    >
                      {milestone.title}
                    </span>
                    {milestone.is_parallel && (
                      <span className="text-[11px] font-bold text-[#8C9A76] bg-[#E4EAD9] px-2.5 py-0.5 rounded-full border border-[#8C9A76]/30">
                        ⚡ Parallel Study Milestone
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#7A6553] font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#B58B65]" />
                    {milestone.est_hours}h est.
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {milestone.nodes.map((node) => {
                    const isCompleted = completedSet.has(node.id);
                    const isExcluded = excludedSet.has(node.id);
                    const groundedExp = explanations[node.id];

                    return (
                      <div
                        key={node.id}
                        className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                          isCompleted
                            ? 'bg-[#E4EAD9] border-[#8C9A76] text-[#4A3728]'
                            : isExcluded
                            ? 'bg-[#F7F1E7] border-[#E6DCCF] text-[#7A6553] opacity-60'
                            : isCurrentActiveWave
                            ? 'bg-[#FFFFFF] border-2 border-[#C96F4A] shadow-md'
                            : 'bg-[#FFFFFF] border-[#E6DCCF] text-[#4A3728]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-bold font-serif text-[#4A3728] leading-tight">
                              {node.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                node.type === 'project'
                                  ? 'bg-[#C96F4A]/15 text-[#A85331] border border-[#C96F4A]/30'
                                  : 'bg-[#B58B65]/15 text-[#4A3728] border border-[#B58B65]/30'
                              }`}
                            >
                              {node.type}
                            </span>
                          </div>

                          <p className="text-xs text-[#7A6553] leading-relaxed line-clamp-2 mb-3">
                            {node.description}
                          </p>

                          {groundedExp && !isCompleted && !isExcluded && (
                            <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-xl p-3 mb-3 text-[11px] text-[#4A3728] font-medium leading-relaxed italic">
                              "{groundedExp}"
                            </div>
                          )}
                        </div>

                        {/* Interactive Buttons */}
                        <div className="flex items-center justify-between pt-3 border-t border-[#E6DCCF]/60 text-xs">
                          <span className="text-[11px] text-[#7A6553] font-medium">
                            {node.est_hours}h &bull; Level {node.difficulty}/5
                          </span>

                          <div className="flex items-center gap-1.5">
                            {onToggleNodeCompleted && (
                              <button
                                type="button"
                                onClick={() => onToggleNodeCompleted(node.id)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                  isCompleted
                                    ? 'bg-[#8C9A76] text-white shadow-sm'
                                    : 'bg-[#F0E8DC] text-[#4A3728] hover:bg-[#8C9A76] hover:text-white'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isCompleted ? 'Mastered' : 'Mark Done'}
                              </button>
                            )}

                            {onToggleNodeExcluded && (
                              <button
                                type="button"
                                onClick={() => onToggleNodeExcluded(node.id)}
                                title={isExcluded ? 'Include node back' : 'Skip node'}
                                className={`p-1 rounded-lg text-[11px] transition-all ${
                                  isExcluded
                                    ? 'bg-[#C96F4A]/20 text-[#A85331] border border-[#C96F4A]/40'
                                    : 'text-[#7A6553] hover:text-[#4A3728] hover:bg-[#F0E8DC]'
                                }`}
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
