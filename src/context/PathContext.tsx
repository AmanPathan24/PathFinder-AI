'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  UserParsedProfile,
  PathEngineOutput,
  TrackId,
} from '@/types/ontology';
import { Roadmap, NodeStatusType, SkillMasterySource } from '@/types/roadmap';

interface PathContextType {
  // Roadmaps State
  roadmaps: Roadmap[];
  activeRoadmap: Roadmap | null;
  setActiveRoadmapId: (id: string) => void;
  createAndSelectRoadmap: (params: {
    title: string;
    target_track: TrackId;
    time_budget_weeks: number;
    weekly_hours?: number;
    raw_goal: string;
    known_node_ids?: string[];
  }) => Promise<Roadmap | null>;
  archiveActiveRoadmap: () => Promise<void>;
  refreshRoadmaps: () => Promise<void>;

  // Current Path & Recommendation State
  rawGoal: string;
  setRawGoal: (goal: string) => void;
  parsedProfile: UserParsedProfile | null;
  setParsedProfile: React.Dispatch<React.SetStateAction<UserParsedProfile | null>>;
  pathOutput: PathEngineOutput | null;
  setPathOutput: React.Dispatch<React.SetStateAction<PathEngineOutput | null>>;
  explanations: Record<string, string>;
  setExplanations: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Diagnostic Confidence Agent
  diagnosticConfidences: Record<string, number>;
  setDiagnosticConfidences: React.Dispatch<React.SetStateAction<Record<string, number>>>;

  // Node Statuses & Mastery
  nodeStatuses: Record<string, NodeStatusType>;
  skillMasteries: Record<string, SkillMasterySource>;
  completedNodeIds: string[];
  knownPriorNodeIds: string[];
  learningNodeIds: string[];
  skippedNodeIds: string[];
  setNodeStatusAction: (nodeId: string, status: NodeStatusType) => Promise<void>;
  bulkSetKnownPrior: (nodeIds: string[]) => Promise<void>;

  // Hours Logging
  loggedHoursMap: Record<string, number>;
  logHours: (nodeId: string, hours: number) => void;

  // Loading and Re-planning
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  recalculatePath: (options?: {
    knownIds?: string[];
    excludedIds?: string[];
    activeTrack?: TrackId;
    timeBudgetWeeks?: number;
    confidences?: Record<string, number>;
  }) => Promise<void>;
}

const PathContext = createContext<PathContextType | undefined>(undefined);

const STORAGE_KEY_ROADMAP = 'pathfinder_active_roadmap_id_v2';
const STORAGE_KEY_FALLBACK = 'pathfinder_state_fallback_v2';

export const PathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session } = useSession();

  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [activeRoadmap, setActiveRoadmap] = useState<Roadmap | null>(null);

  const [rawGoal, setRawGoal] = useState<string>('');
  const [parsedProfile, setParsedProfile] = useState<UserParsedProfile | null>(null);
  const [pathOutput, setPathOutput] = useState<PathEngineOutput | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatusType>>({});
  const [skillMasteries, setSkillMasteries] = useState<Record<string, SkillMasterySource>>({});
  const [loggedHoursMap, setLoggedHoursMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [diagnosticConfidences, setDiagnosticConfidences] = useState<Record<string, number>>({});

  // Derived sets from nodeStatuses & skillMasteries
  const completedNodeIds = Object.keys(nodeStatuses).filter(
    (id) => nodeStatuses[id] === 'done'
  );
  const knownPriorNodeIds = Object.keys(nodeStatuses).filter(
    (id) => nodeStatuses[id] === 'known-prior'
  );
  const learningNodeIds = Object.keys(nodeStatuses).filter(
    (id) => nodeStatuses[id] === 'learning'
  );
  const skippedNodeIds = Object.keys(nodeStatuses).filter(
    (id) => nodeStatuses[id] === 'skipped'
  );

  // 1. Fetch Global Skill Mastery
  const fetchGlobalMastery = useCallback(async () => {
    try {
      const res = await fetch('/api/mastery');
      if (res.ok) {
        const data = await res.json();
        const masteryMap: Record<string, SkillMasterySource> = {};
        data.masteries?.forEach((m: any) => {
          masteryMap[m.node_id] = m.source;
        });
        setSkillMasteries(masteryMap);
      }
    } catch (e) {
      console.warn('Failed to fetch mastery:', e);
    }
  }, []);

  // 2. Fetch User Roadmaps
  const refreshRoadmaps = useCallback(async () => {
    try {
      const res = await fetch('/api/roadmaps');
      if (res.ok) {
        const data = await res.json();
        const list: Roadmap[] = data.roadmaps || [];
        setRoadmaps(list);

        // Auto select saved or first active roadmap
        if (list.length > 0) {
          const savedId = localStorage.getItem(STORAGE_KEY_ROADMAP);
          const found = list.find((r) => r.id === savedId) || list[0];
          setActiveRoadmap(found);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch roadmaps:', e);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchGlobalMastery();
    refreshRoadmaps();
  }, [fetchGlobalMastery, refreshRoadmaps, session]);

  // 3. When activeRoadmap changes, load its NodeStatuses and generate path
  useEffect(() => {
    if (!activeRoadmap) return;
    localStorage.setItem(STORAGE_KEY_ROADMAP, activeRoadmap.id);

    const loadRoadmapDetails = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/roadmaps/${activeRoadmap.id}/status`);
        const statusMap: Record<string, NodeStatusType> = {};
        if (res.ok) {
          const data = await res.json();
          data.nodeStatuses?.forEach((ns: any) => {
            statusMap[ns.node_id] = ns.status;
          });
        }
        setNodeStatuses(statusMap);

        const profile: UserParsedProfile = {
          target_track: activeRoadmap.target_track,
          known_skills: [],
          known_node_ids: Object.keys(statusMap).filter(
            (id) => statusMap[id] === 'known-prior' || statusMap[id] === 'done'
          ),
          time_budget_weeks: activeRoadmap.time_budget_weeks,
          weekly_hours: activeRoadmap.weekly_hours,
          raw_goal: activeRoadmap.raw_goal,
        };
        setParsedProfile(profile);
        setRawGoal(activeRoadmap.raw_goal);

        // Generate learning path
        const recRes = await fetch('/api/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            overrideProfile: profile,
            knownNodeIds: profile.known_node_ids,
            excludedNodeIds: Object.keys(statusMap).filter(
              (id) => statusMap[id] === 'skipped'
            ),
            diagnosticConfidences,
          }),
        });

        if (recRes.ok) {
          const recData = await recRes.json();
          setPathOutput(recData.path);
          setExplanations(recData.explanations || {});
        }
      } catch (err) {
        console.error('Error loading roadmap details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRoadmapDetails();
  }, [activeRoadmap?.id]);

  // Recalculate Path with given overrides
  const recalculatePath = async (options?: {
    knownIds?: string[];
    excludedIds?: string[];
    activeTrack?: TrackId;
    timeBudgetWeeks?: number;
    confidences?: Record<string, number>;
  }) => {
    const profile = parsedProfile || {
      target_track: activeRoadmap?.target_track || 'data-science',
      known_skills: [],
      known_node_ids: [],
      time_budget_weeks: activeRoadmap?.time_budget_weeks || 24,
      raw_goal: rawGoal || 'Personalized Goal',
    };

    const targetKnownIds =
      options?.knownIds !== undefined
        ? options.knownIds
        : [...completedNodeIds, ...knownPriorNodeIds];

    const targetExcludedIds =
      options?.excludedIds !== undefined ? options.excludedIds : skippedNodeIds;

    const targetConfidences =
      options?.confidences !== undefined ? options.confidences : diagnosticConfidences;

    const updatedProfile: UserParsedProfile = {
      ...profile,
      target_track: options?.activeTrack || profile.target_track,
      time_budget_weeks: options?.timeBudgetWeeks || profile.time_budget_weeks,
      known_node_ids: targetKnownIds,
    };

    setIsLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideProfile: updatedProfile,
          knownNodeIds: targetKnownIds,
          excludedNodeIds: targetExcludedIds,
          diagnosticConfidences: targetConfidences,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPathOutput(data.path);
        setExplanations(data.explanations || {});
        setParsedProfile(updatedProfile);
      }
    } catch (err) {
      console.error('Failed to recalculate path:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Active Roadmap
  const setActiveRoadmapId = (id: string) => {
    const found = roadmaps.find((r) => r.id === id);
    if (found) {
      setActiveRoadmap(found);
    }
  };

  // Create and Select New Roadmap
  const createAndSelectRoadmap = async (params: {
    title: string;
    target_track: TrackId;
    time_budget_weeks: number;
    weekly_hours?: number;
    raw_goal: string;
    known_node_ids?: string[];
  }): Promise<Roadmap | null> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data = await res.json();
        const newRoadmap: Roadmap = data.roadmap;
        setRoadmaps((prev) => [newRoadmap, ...prev]);
        setActiveRoadmap(newRoadmap);

        // Bulk apply known-prior if provided
        if (params.known_node_ids && params.known_node_ids.length > 0) {
          for (const nodeId of params.known_node_ids) {
            await fetch(`/api/roadmaps/${newRoadmap.id}/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ nodeId, status: 'known-prior' }),
            });
          }
        }

        await fetchGlobalMastery();
        return newRoadmap;
      }
    } catch (err) {
      console.error('Error creating roadmap:', err);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Archive Active Roadmap
  const archiveActiveRoadmap = async () => {
    if (!activeRoadmap) return;
    try {
      const res = await fetch(`/api/roadmaps/${activeRoadmap.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: true }),
      });

      if (res.ok) {
        const updatedList = roadmaps.filter((r) => r.id !== activeRoadmap.id);
        setRoadmaps(updatedList);
        setActiveRoadmap(updatedList[0] || null);
      }
    } catch (err) {
      console.error('Error archiving roadmap:', err);
    }
  };

  // Set Single Node Status Action
  const setNodeStatusAction = async (nodeId: string, status: NodeStatusType) => {
    setNodeStatuses((prev) => ({ ...prev, [nodeId]: status }));

    if (status === 'done' || status === 'known-prior') {
      const source = status === 'known-prior' ? 'prior-knowledge' : 'roadmap-completed';
      setSkillMasteries((prev) => ({ ...prev, [nodeId]: source }));
    }

    if (activeRoadmap) {
      try {
        await fetch(`/api/roadmaps/${activeRoadmap.id}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, status }),
        });
      } catch (err) {
        console.error('Failed to sync node status to server:', err);
      }
    }
  };

  // Bulk Set Known-Prior (Used during Onboarding)
  const bulkSetKnownPrior = async (nodeIds: string[]) => {
    const updatedStatuses = { ...nodeStatuses };
    nodeIds.forEach((id) => {
      updatedStatuses[id] = 'known-prior';
    });
    setNodeStatuses(updatedStatuses);

    if (activeRoadmap) {
      for (const id of nodeIds) {
        try {
          await fetch(`/api/roadmaps/${activeRoadmap.id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeId: id, status: 'known-prior' }),
          });
        } catch (e) {
          console.warn('Failed to bulk set node status:', e);
        }
      }
    }

    await fetchGlobalMastery();
  };

  // Log Study Hours
  const logHours = (nodeId: string, hours: number) => {
    setLoggedHoursMap((prev) => ({
      ...prev,
      [nodeId]: Math.max(0, (prev[nodeId] || 0) + hours),
    }));
  };

  return (
    <PathContext.Provider
      value={{
        roadmaps,
        activeRoadmap,
        setActiveRoadmapId,
        createAndSelectRoadmap,
        archiveActiveRoadmap,
        refreshRoadmaps,
        rawGoal,
        setRawGoal,
        parsedProfile,
        setParsedProfile,
        pathOutput,
        setPathOutput,
        explanations,
        setExplanations,
        diagnosticConfidences,
        setDiagnosticConfidences,
        nodeStatuses,
        skillMasteries,
        completedNodeIds,
        knownPriorNodeIds,
        learningNodeIds,
        skippedNodeIds,
        setNodeStatusAction,
        bulkSetKnownPrior,
        loggedHoursMap,
        logHours,
        isLoading,
        setIsLoading,
        recalculatePath,
      }}
    >
      {children}
    </PathContext.Provider>
  );
};

export const usePath = () => {
  const ctx = useContext(PathContext);
  if (!ctx) throw new Error('usePath must be used within a PathProvider');
  return ctx;
};
