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

  it('should skip known skills and recommend downstream prerequisites', () => {
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics', 'ds-sql-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
    });

    const recommendedIds = result.recommended_nodes.map((n) => n.id);
    expect(recommendedIds).not.toContain('ds-python-basics');
    expect(recommendedIds).not.toContain('ds-sql-basics');
    expect(recommendedIds).toContain('ds-numpy-pandas');
  });

  it('should group independent parallel-eligible topics into parallel milestones', () => {
    const result = generateLearningPath({
      knownNodeIds: ['ds-python-basics', 'ds-sql-basics'],
      targetTrack: 'data-science',
      timeBudgetWeeks: 50,
      weeklyHours: 10,
    });

    // Milestone 1 after Python & SQL should include ds-numpy-pandas and ds-math-stats in parallel
    const milestone1 = result.milestones[0];
    const ids = milestone1.nodes.map((n) => n.id);
    expect(ids).toContain('ds-numpy-pandas');
    expect(ids).toContain('ds-math-stats');
    expect(milestone1.is_parallel).toBe(true);
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
