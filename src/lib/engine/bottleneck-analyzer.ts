import { SkillOntology, TrackId } from '@/types/ontology';

export interface BottleneckAnalysisResult {
  bottleneckNodeIds: string[];
  downstreamCountMap: Record<string, number>;
  longestPathMap: Record<string, number>;
}

/**
 * Computes critical-path bottleneck nodes in the DAG.
 * A bottleneck is defined as a skill that has the highest number of transitive downstream dependents
 * and longest critical chain to a capstone/terminal node.
 */
export function analyzeBottlenecks(
  ontology: SkillOntology,
  targetTrack: TrackId
): BottleneckAnalysisResult {
  const trackNodes = ontology.nodes.filter((n) => n.track === targetTrack);
  const trackNodeIds = new Set(trackNodes.map((n) => n.id));

  // Build adjacency list: from_id -> to_id
  const adj = new Map<string, string[]>();
  trackNodes.forEach((n) => adj.set(n.id, []));

  ontology.edges
    .filter((e) => trackNodeIds.has(e.from_id) && trackNodeIds.has(e.to_id))
    .forEach((e) => {
      adj.get(e.from_id)?.push(e.to_id);
    });

  // 1. Transitive downstream reachability via DFS
  const downstreamCountMap: Record<string, number> = {};

  trackNodes.forEach((node) => {
    const visited = new Set<string>();
    const stack = [...(adj.get(node.id) || [])];

    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (!visited.has(curr)) {
        visited.add(curr);
        const children = adj.get(curr) || [];
        children.forEach((c) => {
          if (!visited.has(c)) stack.push(c);
        });
      }
    }

    downstreamCountMap[node.id] = visited.size;
  });

  // 2. Longest path to terminal node (Dynamic Programming on DAG)
  const longestPathMap: Record<string, number> = {};
  const memo = new Map<string, number>();

  function getLongestPath(nodeId: string): number {
    if (memo.has(nodeId)) return memo.get(nodeId)!;

    const children = adj.get(nodeId) || [];
    if (children.length === 0) {
      memo.set(nodeId, 1);
      return 1;
    }

    let maxChild = 0;
    for (const child of children) {
      maxChild = Math.max(maxChild, getLongestPath(child));
    }

    const res = 1 + maxChild;
    memo.set(nodeId, res);
    return res;
  }

  trackNodes.forEach((node) => {
    longestPathMap[node.id] = getLongestPath(node.id);
  });

  // Sort nodes by downstream count & longest path to find top bottlenecks
  const sorted = [...trackNodes].sort((a, b) => {
    const scoreA = downstreamCountMap[a.id] * 2 + longestPathMap[a.id];
    const scoreB = downstreamCountMap[b.id] * 2 + longestPathMap[b.id];
    return scoreB - scoreA;
  });

  // Top 20% or minimum top 2 nodes are flagged as critical bottlenecks
  const topCount = Math.max(2, Math.ceil(trackNodes.length * 0.25));
  const bottleneckNodeIds = sorted
    .filter((n) => downstreamCountMap[n.id] >= 2)
    .slice(0, topCount)
    .map((n) => n.id);

  return {
    bottleneckNodeIds,
    downstreamCountMap,
    longestPathMap,
  };
}
