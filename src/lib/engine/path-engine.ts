import {
  OntologyNode,
  OntologyEdge,
  SkillOntology,
  TrackId,
  PathMilestone,
  PathEngineOutput,
} from '@/types/ontology';
import rawOntology from '../../data/ontology.json';

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
 * Pure DAG Path Engine Implementation
 * Computes an ordered, milestone-grouped, budget-trimmed learning path.
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

  // Combine known and explicitly excluded nodes into satisfied/ignored set
  const completedOrSkipped = new Set<string>([
    ...knownNodeIds,
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

  // 2. Identify remaining nodes to learn
  const remainingNodeIds = new Set<string>(
    trackNodes
      .map((n) => n.id)
      .filter((id) => !completedOrSkipped.has(id))
  );

  // 3. Topological sorting with parallel wave grouping (Kahn's Algorithm modified for waves)
  // For each node, count how many UNMET prerequisites it has in remainingNodeIds
  const unmetPrereqCount = new Map<string, number>();

  remainingNodeIds.forEach((nodeId) => {
    const prereqs = prereqsOfMap.get(nodeId) || new Set();
    let unmetCount = 0;
    prereqs.forEach((pId) => {
      if (remainingNodeIds.has(pId)) {
        unmetCount++;
      }
    });
    unmetPrereqCount.set(nodeId, unmetCount);
  });

  const milestones: PathMilestone[] = [];
  const processedInPath = new Set<string>();
  let milestoneCounter = 1;

  while (processedInPath.size < remainingNodeIds.size) {
    // Find all nodes in remainingNodeIds that have unmetPrereqCount === 0 and haven't been processed
    const currentWaveIds: string[] = [];

    remainingNodeIds.forEach((nodeId) => {
      if (
        !processedInPath.has(nodeId) &&
        (unmetPrereqCount.get(nodeId) || 0) === 0
      ) {
        currentWaveIds.push(nodeId);
      }
    });

    // Handle potential cycles safely
    if (currentWaveIds.length === 0) {
      const unprocessed = Array.from(remainingNodeIds).filter(
        (id) => !processedInPath.has(id)
      );
      if (unprocessed.length > 0) {
        // Pick the one with smallest unmet count
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

    // Mark current wave as processed and reduce unmet count for dependents
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

  // 4. Budget Trimming Logic
  let recommendedNodes: OntologyNode[] = [];
  milestones.forEach((m) => recommendedNodes.push(...m.nodes));

  const initialTotalHours = recommendedNodes.reduce(
    (sum, n) => sum + n.est_hours,
    0
  );

  let trimmedNodes: OntologyNode[] = [];
  let isTrimmed = false;
  let finalMilestones = milestones;

  if (initialTotalHours > totalTimeBudgetHours) {
    isTrimmed = true;
    let currentHours = 0;
    const keptNodes: OntologyNode[] = [];
    const newMilestones: PathMilestone[] = [];

    for (const milestone of milestones) {
      const milestoneKeptNodes: OntologyNode[] = [];

      for (const node of milestone.nodes) {
        // Keep essential nodes (prerequisites or capstone) if under budget
        if (currentHours + node.est_hours <= totalTimeBudgetHours) {
          currentHours += node.est_hours;
          milestoneKeptNodes.push(node);
          keptNodes.push(node);
        } else {
          trimmedNodes.push(node);
        }
      }

      if (milestoneKeptNodes.length > 0) {
        newMilestones.push({
          ...milestone,
          nodes: milestoneKeptNodes,
          est_hours: milestoneKeptNodes.reduce(
            (sum, n) => sum + n.est_hours,
            0
          ),
          is_parallel: milestoneKeptNodes.length > 1,
        });
      }
    }

    finalMilestones = newMilestones;
    recommendedNodes = keptNodes;
  }

  const finalTotalHours = recommendedNodes.reduce(
    (sum, n) => sum + n.est_hours,
    0
  );

  return {
    target_track: targetTrack,
    milestones: finalMilestones,
    recommended_nodes: recommendedNodes,
    trimmed_nodes: trimmedNodes,
    total_est_hours: finalTotalHours,
    time_budget_hours: totalTimeBudgetHours,
    is_trimmed: isTrimmed,
    completed_node_ids: Array.from(completedOrSkipped),
  };
}
