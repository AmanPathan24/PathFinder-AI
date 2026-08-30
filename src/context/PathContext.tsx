'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserParsedProfile,
  PathEngineOutput,
  TrackId,
} from '@/types/ontology';

interface PathContextType {
  rawGoal: string;
  setRawGoal: (goal: string) => void;
  parsedProfile: UserParsedProfile | null;
  setParsedProfile: React.Dispatch<React.SetStateAction<UserParsedProfile | null>>;
  pathOutput: PathEngineOutput | null;
  setPathOutput: React.Dispatch<React.SetStateAction<PathEngineOutput | null>>;
  explanations: Record<string, string>;
  setExplanations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  completedNodeIds: string[];
  excludedNodeIds: string[];
  loggedHoursMap: Record<string, number>;
  toggleNodeCompleted: (nodeId: string) => void;
  toggleNodeExcluded: (nodeId: string) => void;
  logHours: (nodeId: string, hours: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  recalculatePath: (updatedKnownIds?: string[], updatedExcludedIds?: string[]) => Promise<void>;
}

const PathContext = createContext<PathContextType | undefined>(undefined);

const STORAGE_KEY = 'pathfinder_state_v1';

export const PathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawGoal, setRawGoal] = useState<string>('');
  const [parsedProfile, setParsedProfile] = useState<UserParsedProfile | null>(null);
  const [pathOutput, setPathOutput] = useState<PathEngineOutput | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [completedNodeIds, setCompletedNodeIds] = useState<string[]>([]);
  const [excludedNodeIds, setExcludedNodeIds] = useState<string[]>([]);
  const [loggedHoursMap, setLoggedHoursMap] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load initial state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.rawGoal) setRawGoal(data.rawGoal);
        if (data.parsedProfile) setParsedProfile(data.parsedProfile);
        if (data.pathOutput) setPathOutput(data.pathOutput);
        if (data.explanations) setExplanations(data.explanations);
        if (data.completedNodeIds) setCompletedNodeIds(data.completedNodeIds);
        if (data.excludedNodeIds) setExcludedNodeIds(data.excludedNodeIds);
        if (data.loggedHoursMap) setLoggedHoursMap(data.loggedHoursMap);
      }
    } catch (e) {
      console.warn('Failed to restore localStorage state:', e);
    }
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      const stateToSave = {
        rawGoal,
        parsedProfile,
        pathOutput,
        explanations,
        completedNodeIds,
        excludedNodeIds,
        loggedHoursMap,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }, [
    rawGoal,
    parsedProfile,
    pathOutput,
    explanations,
    completedNodeIds,
    excludedNodeIds,
    loggedHoursMap,
  ]);

  const recalculatePath = async (
    updatedKnownIds?: string[],
    updatedExcludedIds?: string[]
  ) => {
    if (!parsedProfile) return;

    const knownIds = updatedKnownIds !== undefined ? updatedKnownIds : completedNodeIds;
    const excludedIds = updatedExcludedIds !== undefined ? updatedExcludedIds : excludedNodeIds;

    setIsLoading(true);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideProfile: parsedProfile,
          knownNodeIds: knownIds,
          excludedNodeIds: excludedIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPathOutput(data.path);
        setExplanations(data.explanations || {});
      }
    } catch (err) {
      console.error('Failed to recalculate path:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNodeCompleted = (nodeId: string) => {
    const nextCompleted = completedNodeIds.includes(nodeId)
      ? completedNodeIds.filter((id) => id !== nodeId)
      : [...completedNodeIds, nodeId];

    setCompletedNodeIds(nextCompleted);
    recalculatePath(nextCompleted, excludedNodeIds);
  };

  const toggleNodeExcluded = (nodeId: string) => {
    const nextExcluded = excludedNodeIds.includes(nodeId)
      ? excludedNodeIds.filter((id) => id !== nodeId)
      : [...excludedNodeIds, nodeId];

    setExcludedNodeIds(nextExcluded);
    recalculatePath(completedNodeIds, nextExcluded);
  };

  const logHours = (nodeId: string, hours: number) => {
    setLoggedHoursMap((prev) => ({
      ...prev,
      [nodeId]: Math.max(0, (prev[nodeId] || 0) + hours),
    }));
  };

  return (
    <PathContext.Provider
      value={{
        rawGoal,
        setRawGoal,
        parsedProfile,
        setParsedProfile,
        pathOutput,
        setPathOutput,
        explanations,
        setExplanations,
        completedNodeIds,
        excludedNodeIds,
        loggedHoursMap,
        toggleNodeCompleted,
        toggleNodeExcluded,
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
