import { describe, it, expect } from 'vitest';
import { generateLearningPath } from '../path-engine';
import rawOntology from '@/data/ontology.json';

describe('Path Engine DAG Algorithm', () => {
  it('should generate a valid topological path for Data Science track', () => {
    const result = generateLearningPath({
      knownNodeIds: [],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
    });

    expect(result.target_track).toBe('data-science');
    expect(result.recommended_nodes.length).toBeGreaterThan(0);
    expect(result.milestones.length).toBeGreaterThan(0);
    expect(result.is_trimmed).toBe(false);

    // Verify Python basics is in the first milestone
    const firstMilestone = result.milestones[0];
    const nodeIds = firstMilestone.nodes.map((n) => n.id);
    expect(nodeIds).toContain('ds-python-basics');
  });

  it('should keep known skills in the roadmap while still recommending downstream work', () => {
    // Without diagnosticConfidences, known nodes default to 0.6 → refresher (kept in path)
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics', 'ds-sql-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
    });

    const recommendedIds = result.recommended_nodes.map((n) => n.id);
    const allMilestoneIds = result.milestones.flatMap((milestone) => milestone.nodes.map((node) => node.id));
    expect(recommendedIds).toContain('ds-python-basics');
    expect(recommendedIds).toContain('ds-sql-basics');
    expect(allMilestoneIds).toContain('ds-python-basics');
    expect(allMilestoneIds).toContain('ds-sql-basics');
    expect(recommendedIds).toContain('ds-numpy-pandas');
  });

  it('should keep done nodes in the roadmap instead of deleting them', () => {
    // default confidence 0.6 → refresher mode, stays in milestones
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
    });

    const allMilestoneIds = result.milestones.flatMap((milestone) => milestone.nodes.map((node) => node.id));
    expect(allMilestoneIds).toContain('ds-python-basics');
  });

  it('should not prepend a synthetic completed milestone that reorders the graph', () => {
    // With high confidence (>= 0.75), ds-python-basics is mastered → goes to known_nodes
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
      diagnosticConfidences: { 'ds-python-basics': 0.9 },
    });

    expect(result.milestones.some((milestone) => milestone.title.includes('Completed / Known Prior Topics'))).toBe(false);
    expect(result.known_nodes?.some((node) => node.id === 'ds-python-basics')).toBe(true);
  });

  it('should group independent parallel-eligible topics into parallel milestones', () => {
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics', 'ds-sql-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
    });

    const milestone1 = result.milestones[0];
    const ids = milestone1.nodes.map((n) => n.id);
    expect(milestone1.is_parallel).toBe(true);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(ids).toContain('ds-python-basics');
    expect(ids).toContain('ds-sql-basics');
  });

  it('should apply budget trimming when total hours exceed the time budget', () => {
    const result = generateLearningPath({
      knownNodeIds: [],
      targetTrack: 'frontend',
      timeBudgetWeeks: 4, // 40 hours total budget
      weeklyHours: 10,
    });

    expect(result.is_trimmed).toBe(true);
    expect(result.total_est_hours).toBeLessThanOrEqual(40);
    expect(result.trimmed_nodes.length).toBeGreaterThan(0);
  });

  it('should respect excluded nodes for feedback loop adaptations', () => {
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
      excludedNodeIds: ['ds-sql-basics'],
    });

    const recommendedIds = result.recommended_nodes.map((n) => n.id);
    expect(recommendedIds).not.toContain('ds-sql-basics');
  });

  // ── Diagnostic Confidence Agent integration tests ──────────────────────

  it('[diagnostic] high confidence (>=0.75) fully prunes node from roadmap into known_nodes', () => {
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics', 'ds-sql-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
      diagnosticConfidences: {
        'ds-python-basics': 0.95, // mastered → pruned
        'ds-sql-basics': 0.85,    // mastered → pruned
      },
    });

    const allMilestoneIds = result.milestones.flatMap((m) => m.nodes.map((n) => n.id));
    // Both should be absent from active milestones
    expect(allMilestoneIds).not.toContain('ds-python-basics');
    expect(allMilestoneIds).not.toContain('ds-sql-basics');
    // Both should appear in known_nodes
    const knownIds = result.known_nodes?.map((n) => n.id) ?? [];
    expect(knownIds).toContain('ds-python-basics');
    expect(knownIds).toContain('ds-sql-basics');
    // Downstream work should still be recommended
    expect(result.recommended_nodes.map((n) => n.id)).toContain('ds-numpy-pandas');
  });

  it('[diagnostic] mid confidence (0.4–0.75) keeps node as refresher with reduced hours', () => {
    const originalNode = (rawOntology as any).nodes.find(
      (n: any) => n.id === 'ds-python-basics'
    );

    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
      diagnosticConfidences: { 'ds-python-basics': 0.55 }, // refresher
    });

    const allMilestoneIds = result.milestones.flatMap((m) => m.nodes.map((n) => n.id));
    // Node stays in active path
    expect(allMilestoneIds).toContain('ds-python-basics');
    // Not in known_nodes (not mastered)
    const knownIds = result.known_nodes?.map((n) => n.id) ?? [];
    expect(knownIds).not.toContain('ds-python-basics');
    // refresher_node_ids should include it
    expect(result.refresher_node_ids).toContain('ds-python-basics');
    // Hours should be reduced to ~20% of original
    const refresherNode = result.recommended_nodes.find((n) => n.id === 'ds-python-basics');
    expect(refresherNode).toBeDefined();
    expect(refresherNode!.est_hours).toBeLessThan(originalNode.est_hours);
  });

  it('[diagnostic] low confidence (<0.4) includes node at full est_hours', () => {
    const originalNode = (rawOntology as any).nodes.find(
      (n: any) => n.id === 'ds-python-basics'
    );

    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
      diagnosticConfidences: { 'ds-python-basics': 0.2 }, // full study
    });

    const activeNode = result.recommended_nodes.find((n) => n.id === 'ds-python-basics');
    expect(activeNode).toBeDefined();
    // Hours should equal original (full inclusion)
    expect(activeNode!.est_hours).toBe(originalNode.est_hours);
    // Not in refresher_node_ids
    expect(result.refresher_node_ids).not.toContain('ds-python-basics');
    // Not in known_nodes
    expect(result.known_nodes?.map((n) => n.id) ?? []).not.toContain('ds-python-basics');
  });

  it('[diagnostic] no diagnosticConfidences defaults to 0.6 (refresher mode)', () => {
    // This is the graceful degradation path — matches old self-reported behavior
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
      // no diagnosticConfidences passed
    });

    const allMilestoneIds = result.milestones.flatMap((m) => m.nodes.map((n) => n.id));
    // Node stays in milestones (refresher, not pruned)
    expect(allMilestoneIds).toContain('ds-python-basics');
    // refresher_node_ids should include it
    expect(result.refresher_node_ids).toContain('ds-python-basics');
  });
});
