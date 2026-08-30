import { describe, it, expect } from 'vitest';
import { optimizePathBudget } from '../knapsack-optimizer';
import { OntologyNode } from '@/types/ontology';

describe('Knapsack Precedence Budget Optimizer', () => {
  const dummyNodes: OntologyNode[] = [
    {
      id: 'node-A',
      title: 'Topic A (Prerequisite)',
      type: 'skill',
      track: 'frontend',
      difficulty: 1,
      est_hours: 10,
      description: '',
      keywords: [],
    },
    {
      id: 'node-B',
      title: 'Topic B (Builds on A)',
      type: 'skill',
      track: 'frontend',
      difficulty: 2,
      est_hours: 15,
      description: '',
      keywords: [],
    },
    {
      id: 'node-C',
      title: 'Topic C (Builds on B)',
      type: 'course',
      track: 'frontend',
      difficulty: 3,
      est_hours: 20,
      description: '',
      keywords: [],
    },
    {
      id: 'node-D',
      title: 'Topic D (Independent Elective)',
      type: 'skill',
      track: 'frontend',
      difficulty: 1,
      est_hours: 15,
      description: '',
      keywords: [],
    },
  ];

  const prereqMap = new Map<string, Set<string>>();
  prereqMap.set('node-A', new Set());
  prereqMap.set('node-B', new Set(['node-A']));
  prereqMap.set('node-C', new Set(['node-B']));
  prereqMap.set('node-D', new Set());

  const dependentsMap = new Map<string, Set<string>>();
  dependentsMap.set('node-A', new Set(['node-B']));
  dependentsMap.set('node-B', new Set(['node-C']));
  dependentsMap.set('node-C', new Set());
  dependentsMap.set('node-D', new Set());

  it('should include all nodes if budget is sufficient', () => {
    const result = optimizePathBudget({
      candidateNodes: dummyNodes,
      prereqMap,
      dependentsMap,
      maxHours: 60,
    });

    expect(result.isTrimmed).toBe(false);
    expect(result.selectedNodes.length).toBe(4);
    expect(result.totalHours).toBe(60);
  });

  it('should respect precedence constraints and trim within budget', () => {
    // Budget 25 hours -> can fit node-A (10h) + node-B (15h) = 25h
    // Cannot pick node-C without A and B!
    const result = optimizePathBudget({
      candidateNodes: dummyNodes,
      prereqMap,
      dependentsMap,
      maxHours: 25,
    });

    expect(result.isTrimmed).toBe(true);
    expect(result.totalHours).toBeLessThanOrEqual(25);
    const selectedIds = result.selectedNodes.map((n) => n.id);
    expect(selectedIds).toContain('node-A');
    expect(selectedIds).toContain('node-B');
    expect(selectedIds).not.toContain('node-C');
  });
});
