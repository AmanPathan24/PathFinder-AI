import { describe, it, expect } from 'vitest';
import { calculatePaceMetrics } from '../pace-calculator';

describe('Pace Calculator Engine', () => {
  it('should correctly calculate pace metrics for an on-track learner', () => {
    const result = calculatePaceMetrics({
      loggedHoursMap: {
        'fe-html-css': 10,
        'fe-javascript-deep': 10,
      },
      nodeStatuses: {
        'fe-html-css': 'done',
        'fe-javascript-deep': 'learning',
      },
      totalEstHours: 100,
      timeBudgetWeeks: 10,
      weeklyHoursTarget: 10,
      startDateIso: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    });

    expect(result.actual_hours_logged).toBe(20);
    expect(result.current_weekly_pace).toBe(10);
    expect(result.pace_status).toBe('on-track');
    expect(result.progress_percentage).toBe(20);
  });

  it('should strictly exclude known-prior nodes from hours logged and pace calculation', () => {
    const result = calculatePaceMetrics({
      loggedHoursMap: {
        'fe-html-css': 15, // known-prior, must be ignored!
        'fe-javascript-deep': 10, // active learning
      },
      nodeStatuses: {
        'fe-html-css': 'known-prior',
        'fe-javascript-deep': 'learning',
      },
      totalEstHours: 100,
      timeBudgetWeeks: 10,
      weeklyHoursTarget: 10,
      startDateIso: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week ago
    });

    // Only 10 hours should be logged, not 25!
    expect(result.actual_hours_logged).toBe(10);
    expect(result.current_weekly_pace).toBe(10);
  });

  it('should detect when a user is behind schedule', () => {
    const result = calculatePaceMetrics({
      loggedHoursMap: {
        'fe-html-css': 2,
      },
      nodeStatuses: {
        'fe-html-css': 'learning',
      },
      totalEstHours: 100,
      timeBudgetWeeks: 10,
      weeklyHoursTarget: 10,
      startDateIso: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago
    });

    expect(result.actual_hours_logged).toBe(2);
    expect(result.current_weekly_pace).toBe(1);
    expect(result.pace_status).toBe('behind');
  });
});
