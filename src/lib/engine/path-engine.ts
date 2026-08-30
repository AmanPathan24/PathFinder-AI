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
  } = options;

  const totalTimeBudgetHours = timeBudgetWeeks * weeklyHours;

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

  // Exclude only explicitly skipped nodes from the learning set. Completed and
  // known-prior nodes should remain in the roadmap while being styled green.
  const ignoredNodeIds = new Set<string>([
    ...excludedNodeIds,
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
  const candidateNodes = trackNodes.filter((n) => !ignoredNodeIds.has(n.id));

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

  // Build known/completed nodes list (not excluded, only known/done)
  // Keep this metadata for status badges and tracking, but do not prepend a
  // synthetic milestone group because that reorders the active roadmap and makes
  // completed nodes appear to jump to the top of the flow.
  const knownNodes = trackNodes.filter((n) => knownNodeIds.includes(n.id));

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
  };
}
