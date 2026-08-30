import { OntologyNode, SkillOntology } from '@/types/ontology';

export interface KnapsackOptimizationOptions {
  candidateNodes: OntologyNode[];
  prereqMap: Map<string, Set<string>>; // nodeId -> set of prereq node IDs that must be completed first
  dependentsMap: Map<string, Set<string>>;
  maxHours: number;
}

export interface KnapsackOptimizationResult {
  selectedNodes: OntologyNode[];
  trimmedNodes: OntologyNode[];
  totalHours: number;
  isTrimmed: boolean;
}

/**
 * Solves the Precedence-Constrained Knapsack Problem (PCKP) deterministically.
 * Ensures that if a dependent node is selected, all its prerequisite nodes are strictly selected as well.
 * Maximizes educational coverage and foundational skill centrality within the hour budget.
 */
export function optimizePathBudget(
  options: KnapsackOptimizationOptions
): KnapsackOptimizationResult {
  const { candidateNodes, prereqMap, dependentsMap, maxHours } = options;

  const totalCandidateHours = candidateNodes.reduce((sum, n) => sum + n.est_hours, 0);

  // If candidate nodes already fit within budget, return all without trimming
  if (totalCandidateHours <= maxHours) {
    return {
      selectedNodes: candidateNodes,
      trimmedNodes: [],
      totalHours: totalCandidateHours,
      isTrimmed: false,
    };
  }

  const candidateIds = new Set(candidateNodes.map((n) => n.id));
  const nodeMap = new Map(candidateNodes.map((n) => [n.id, n]));

  // Calculate value score for each node:
  // Foundational importance (downstream count * 15) + difficulty tier (difficulty * 5) + baseline 20
  const valueMap = new Map<string, number>();
  candidateNodes.forEach((node) => {
    const depCount = dependentsMap.get(node.id)?.size || 0;
    const value = 20 + depCount * 15 + node.difficulty * 5;
    valueMap.set(node.id, value);
  });

  // Helper to compute transitive closure of prerequisites for any node
  const getFullPrereqSet = (nodeId: string): Set<string> => {
    const fullPrereqs = new Set<string>();
    const stack = [nodeId];

    while (stack.length > 0) {
      const curr = stack.pop()!;
      const prereqs = prereqMap.get(curr) || new Set();
      prereqs.forEach((pId) => {
        if (candidateIds.has(pId) && !fullPrereqs.has(pId)) {
          fullPrereqs.add(pId);
          stack.push(pId);
        }
      });
    }

    return fullPrereqs;
  };

  // Build candidate bundles: for each node, the bundle = [node, ...all its unmet prereqs]
  // Greedily rank bundles by Value-to-Hours density
  const selectedNodeIdSet = new Set<string>();
  let currentHours = 0;

  // Topological sorting order as base evaluation sequence
  // Easier and foundational nodes are evaluated first
  const sortedCandidates = [...candidateNodes].sort((a, b) => {
    const densityA = (valueMap.get(a.id) || 1) / a.est_hours;
    const densityB = (valueMap.get(b.id) || 1) / b.est_hours;
    return densityB - densityA;
  });

  for (const node of sortedCandidates) {
    if (selectedNodeIdSet.has(node.id)) continue;

    const prereqs = getFullPrereqSet(node.id);
    const nodesToAdd = [node.id, ...Array.from(prereqs)].filter(
      (id) => !selectedNodeIdSet.has(id)
    );

    const additionalHours = nodesToAdd.reduce(
      (sum, id) => sum + (nodeMap.get(id)?.est_hours || 0),
      0
    );

    if (currentHours + additionalHours <= maxHours) {
      nodesToAdd.forEach((id) => selectedNodeIdSet.add(id));
      currentHours += additionalHours;
    }
  }

  // Preserve original topological candidate ordering in output
  const selectedNodes = candidateNodes.filter((n) => selectedNodeIdSet.has(n.id));
  const trimmedNodes = candidateNodes.filter((n) => !selectedNodeIdSet.has(n.id));

  return {
    selectedNodes,
    trimmedNodes,
    totalHours: currentHours,
    isTrimmed: true,
  };
}
