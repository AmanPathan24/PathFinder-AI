import { describe, it, expect } from 'vitest';
import { generateLearningPath } from '../path-engine';

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
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
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
});
