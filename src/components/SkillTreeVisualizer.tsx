'use client';

import React from 'react';
import { OntologyNode, PathMilestone, TrackId } from '@/types/ontology';
import { CheckCircle2, Lock, Sparkles, Clock, AlertTriangle, ArrowDown } from 'lucide-react';
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

  // Collect all nodes in the target track from raw ontology for comprehensive graph layout
  const allTrackNodes = rawOntology.nodes.filter((n) => n.track === targetTrack);
  const trackNodeMap = new Map(allTrackNodes.map((n) => [n.id, n]));

  // Build prerequisite lookup from raw ontology edges
  const trackEdges = rawOntology.edges.filter(
    (e) => trackNodeMap.has(e.from_id) && trackNodeMap.has(e.to_id)
  );

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-8 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-400" />
            Visual Skill DAG Graph
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Topologically sorted prerequisite flow. Green = Completed, Glowing Teal = Recommended Milestone, Dimmed = Locked.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
          </span>
          <span className="flex items-center gap-1.5 text-teal-300">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" /> Active Path
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" /> Skipped/Locked
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
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 shadow">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              )}

              <div
                className={`border rounded-xl p-5 space-y-4 transition-all ${
                  isCurrentActiveWave
                    ? 'bg-slate-900/90 border-teal-500/40 ring-1 ring-teal-500/20 shadow-lg shadow-teal-500/5'
                    : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                        isCurrentActiveWave
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {milestone.title}
                    </span>
                    {milestone.is_parallel && (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ⚡ Study in Parallel
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
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
                        className={`rounded-xl border p-4 transition-all relative flex flex-col justify-between ${
                          isCompleted
                            ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                            : isExcluded
                            ? 'bg-slate-950/40 border-slate-800 text-slate-600 opacity-60'
                            : isCurrentActiveWave
                            ? 'bg-slate-900 border-teal-500/60 shadow-md shadow-teal-500/10 ring-1 ring-teal-500/20'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-bold tracking-tight text-white leading-snug">
                              {node.title}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                                node.type === 'project'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : node.type === 'course'
                                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {node.type}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 mb-3">
                            {node.description}
                          </p>

                          {groundedExp && !isCompleted && !isExcluded && (
                            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 mb-3 text-[11px] text-teal-300/90 leading-relaxed italic">
                              "{groundedExp}"
                            </div>
                          )}
                        </div>

                        {/* Interactive Buttons for Feedback Loop */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs">
                          <span className="text-[11px] text-slate-500">
                            {node.est_hours}h &bull; Level {node.difficulty}/5
                          </span>

                          <div className="flex items-center gap-1.5">
                            {onToggleNodeCompleted && (
                              <button
                                type="button"
                                onClick={() => onToggleNodeCompleted(node.id)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-slate-950 font-bold'
                                    : 'bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {isCompleted ? 'Done' : 'Mark Done'}
                              </button>
                            )}

                            {onToggleNodeExcluded && (
                              <button
                                type="button"
                                onClick={() => onToggleNodeExcluded(node.id)}
                                title={isExcluded ? 'Include node back' : 'Skip node (too easy / not needed)'}
                                className={`p-1 rounded-md text-[11px] transition-all ${
                                  isExcluded
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
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
