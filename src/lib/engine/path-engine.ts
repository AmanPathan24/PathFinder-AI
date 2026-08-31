import {
  OntologyNode,
  OntologyEdge,
  SkillOntology,
  TrackId,
  PathMilestone,
  PathEngineOutput,
} from '@/types/ontology';
import rawOntology from '../../data/ontology.json';
import { optimizePathBudget } from './knapsack-optimizer';
import { analyzeBottlenecks } from './bottleneck-analyzer';

const ontologyData = rawOntology as SkillOntology;

export interface PathEngineOptions {
  knownNodeIds: string[];
  targetTrack: TrackId;
  timeBudgetWeeks: number;
  weeklyHours?: number; // default 10h
  excludedNodeIds?: string[]; // for feedback loop ("skip" / "too hard")
  /**
   * Diagnostic confidence scores per node id (0–1), produced by the
   * Diagnostic Confidence Agent.
   *
   * Thresholds:
   *   >= 0.75  → node is pruned as mastered (fully excluded from roadmap)
   *   0.4–0.75 → node kept but est_hours reduced to 20% (lightweight refresher)
   *   < 0.4    → node included at full est_hours
   *
   * Nodes in knownNodeIds that have NO entry here default to 0.6
   * (graceful degradation — keep as refresher, same as fallback).
   */
  diagnosticConfidences?: Record<string, number>;
}

/**
 * Helper to retrieve all nodes and edges from the ontology or supplied custom graph
 */
export function getOntology(): SkillOntology {
  return ontologyData;
}

/**
 * Helper to get critical bottlenecks for a track
 */
export function getBottlenecks(targetTrack: TrackId, customOntology?: SkillOntology): string[] {
  const ontology = customOntology || getOntology();
  const { bottleneckNodeIds } = analyzeBottlenecks(ontology, targetTrack);
  return bottleneckNodeIds;
}

/**
 * Pure DAG Path Engine Implementation
 * Computes an ordered, milestone-grouped, knapsack-optimized learning path.
 */
export function generateLearningPath(
  options: PathEngineOptions,
  customOntology?: SkillOntology
): PathEngineOutput {
  const ontology = customOntology || getOntology();
  const {
    knownNodeIds = [],
    targetTrack,
    timeBudgetWeeks,
    weeklyHours = 10,
    excludedNodeIds = [],
    diagnosticConfidences = {},
  } = options;

  const totalTimeBudgetHours = timeBudgetWeeks * weeklyHours;

  // ── Confidence-threshold pruning ──────────────────────────────────────────
  // For each claimed-known node apply the diagnostic result:
  //   confidence >= 0.75 → mastered: fully exclude from roadmap (same as before)
  //   confidence 0.4–0.75 → refresher: keep but shrink est_hours to 20%
  //   confidence < 0.4   → full inclusion (do not treat as known)
  // Nodes in knownNodeIds with no diagnostic entry default to 0.6 (refresher).
  const MASTERY_THRESHOLD = 0.75;
  const REFRESHER_THRESHOLD = 0.4;
  const REFRESHER_HOURS_FACTOR = 0.2;

  // Collect the node ids that are fully mastered (pruned from active path)
  const masteredNodeIds = new Set<string>();
  // Map node id → override est_hours for refresher nodes
  const refresherHoursOverride = new Map<string, number>();

  for (const nodeId of knownNodeIds) {
    const confidence =
      nodeId in diagnosticConfidences ? diagnosticConfidences[nodeId] : 0.6;

    if (confidence >= MASTERY_THRESHOLD) {
      masteredNodeIds.add(nodeId);
    } else if (confidence >= REFRESHER_THRESHOLD) {
      // Mark for reduced hours — resolved after we load the node
      refresherHoursOverride.set(nodeId, -1); // placeholder, filled below
    }
    // confidence < REFRESHER_THRESHOLD → node included at full hours (no action needed)
  }

  // 1. Filter nodes for the target track
  const trackNodes = ontology.nodes.filter((node) => node.track === targetTrack);
  const trackNodeMap = new Map<string, OntologyNode>(
    trackNodes.map((node) => [node.id, node])
  );
  const trackNodeIds = new Set(trackNodes.map((n) => n.id));

  // Filter track edges (both from and to must be in the track)
  const trackEdges = ontology.edges.filter(
    (edge) => trackNodeIds.has(edge.from_id) && trackNodeIds.has(edge.to_id)
  );

  // Exclude fully-mastered nodes (confidence >= 0.75) and explicitly skipped nodes.
  // Refresher nodes (confidence 0.4–0.75) stay in the path but with reduced hours.
  const ignoredNodeIds = new Set<string>([
    ...excludedNodeIds,
    ...Array.from(masteredNodeIds),
  ]);

  // Build adjacency lists
  const prereqsOfMap = new Map<string, Set<string>>(); // node -> Set of prereq node IDs (from_id)
  const dependentsOfMap = new Map<string, Set<string>>(); // node -> Set of dependent node IDs (to_id)

  trackNodes.forEach((n) => {
    prereqsOfMap.set(n.id, new Set());
    dependentsOfMap.set(n.id, new Set());
  });

  trackEdges.forEach((edge) => {
    prereqsOfMap.get(edge.to_id)?.add(edge.from_id);
    dependentsOfMap.get(edge.from_id)?.add(edge.to_id);
  });

  // 2. Identify remaining candidate nodes to learn
  // Apply refresher hours override for mid-confidence nodes before budget optimisation.
  const candidateNodes = trackNodes
    .filter((n) => !ignoredNodeIds.has(n.id))
    .map((n) => {
      if (refresherHoursOverride.has(n.id)) {
        return {
          ...n,
          est_hours: Math.max(1, Math.round(n.est_hours * REFRESHER_HOURS_FACTOR)),
          // tag so UI can render a "Refresher" badge
          _isRefresher: true,
        } as OntologyNode & { _isRefresher?: boolean };
      }
      return n;
    });

  // 3. Apply Precedence-Constrained Knapsack Optimizer for Time-Budget Constraint
  const knapsackResult = optimizePathBudget({
    candidateNodes,
    prereqMap: prereqsOfMap,
    dependentsMap: dependentsOfMap,
    maxHours: totalTimeBudgetHours,
  });

  const activeNodes = knapsackResult.selectedNodes;
  const activeNodeIds = new Set(activeNodes.map((n) => n.id));

  // 4. Topological sorting with parallel wave grouping (Kahn's Algorithm modified for waves)
  // For each node in activeNodes, count how many UNMET prerequisites it has in activeNodeIds
  const unmetPrereqCount = new Map<string, number>();

  activeNodeIds.forEach((nodeId) => {
    const prereqs = prereqsOfMap.get(nodeId) || new Set();
    let unmetCount = 0;
    prereqs.forEach((pId) => {
      if (activeNodeIds.has(pId)) {
        unmetCount++;
      }
    });
    unmetPrereqCount.set(nodeId, unmetCount);
  });

  const milestones: PathMilestone[] = [];
  const processedInPath = new Set<string>();
  let milestoneCounter = 1;

  while (processedInPath.size < activeNodeIds.size) {
    const currentWaveIds: string[] = [];

    activeNodeIds.forEach((nodeId) => {
      if (
        !processedInPath.has(nodeId) &&
        (unmetPrereqCount.get(nodeId) || 0) === 0
      ) {
        currentWaveIds.push(nodeId);
      }
    });

    // Handle potential cycles safely
    if (currentWaveIds.length === 0) {
      const unprocessed = Array.from(activeNodeIds).filter(
        (id) => !processedInPath.has(id)
      );
      if (unprocessed.length > 0) {
        unprocessed.sort(
          (a, b) =>
            (unmetPrereqCount.get(a) || 0) - (unmetPrereqCount.get(b) || 0)
        );
        currentWaveIds.push(unprocessed[0]);
      } else {
        break;
      }
    }

    // Sort current wave nodes by difficulty (easier first) and title
    currentWaveIds.sort((a, b) => {
      const nodeA = trackNodeMap.get(a)!;
      const nodeB = trackNodeMap.get(b)!;
      if (nodeA.difficulty !== nodeB.difficulty) {
        return nodeA.difficulty - nodeB.difficulty;
      }
      return nodeA.title.localeCompare(nodeB.title);
    });

    const waveNodes = currentWaveIds
      .map((id) => trackNodeMap.get(id))
      .filter((n): n is OntologyNode => n !== undefined);

    const waveEstHours = waveNodes.reduce((sum, n) => sum + n.est_hours, 0);

    let milestoneTitle = `Milestone ${milestoneCounter}`;
    if (waveNodes.length === 1) {
      milestoneTitle = `Milestone ${milestoneCounter}: ${waveNodes[0].title}`;
    } else {
      milestoneTitle = `Milestone ${milestoneCounter}: ${waveNodes[0].title} & ${waveNodes.length - 1} Parallel Topics`;
    }

    milestones.push({
      milestone_index: milestoneCounter,
      title: milestoneTitle,
      nodes: waveNodes,
      is_parallel: waveNodes.length > 1,
      est_hours: waveEstHours,
    });

    currentWaveIds.forEach((id) => {
      processedInPath.add(id);
      const dependents = dependentsOfMap.get(id) || new Set();
      dependents.forEach((depId) => {
        if (unmetPrereqCount.has(depId)) {
          const current = unmetPrereqCount.get(depId) || 0;
          unmetPrereqCount.set(depId, Math.max(0, current - 1));
        }
      });
    });

    milestoneCounter++;
  }

  const finalTotalHours = activeNodes.reduce((sum, n) => sum + n.est_hours, 0);

  // Build known/completed nodes list:
  //   - Fully mastered (confidence >= 0.75): excluded from path, listed in known_nodes
  //   - Other known nodes: already in active path (as refreshers or full)
  const knownNodes = trackNodes.filter((n) => masteredNodeIds.has(n.id));

  // Also capture which active nodes are refreshers for output metadata
  const refresherNodeIds = Array.from(refresherHoursOverride.keys()).filter((id) =>
    activeNodes.some((n) => n.id === id)
  );

  return {
    target_track: targetTrack,
    milestones,
    recommended_nodes: activeNodes,
    known_nodes: knownNodes,
    trimmed_nodes: knapsackResult.trimmedNodes,
    total_est_hours: finalTotalHours,
    time_budget_hours: totalTimeBudgetHours,
    is_trimmed: knapsackResult.isTrimmed,
    completed_node_ids: Array.from(knownNodeIds),
    refresher_node_ids: refresherNodeIds,
  };
}
