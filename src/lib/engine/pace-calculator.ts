import { PaceAnalysis } from '@/types/roadmap';
import { NodeStatusType } from '@/types/roadmap';

export interface PaceCalculationInput {
  loggedHoursMap: Record<string, number>;
  nodeStatuses: Record<string, NodeStatusType>;
  totalEstHours: number;
  timeBudgetWeeks: number;
  weeklyHoursTarget?: number;
  startDateIso?: string;
}

/**
 * Calculates pace metrics strictly excluding 'known-prior' nodes from study hours.
 */
export function calculatePaceMetrics(input: PaceCalculationInput): PaceAnalysis {
  const {
    loggedHoursMap,
    nodeStatuses,
    totalEstHours,
    timeBudgetWeeks,
    weeklyHoursTarget = 10,
    startDateIso,
  } = input;

  // 1. Calculate actual hours logged, strictly filtering out known-prior nodes
  let actualHoursLogged = 0;
  for (const [nodeId, hours] of Object.entries(loggedHoursMap)) {
    const status = nodeStatuses[nodeId];
    // Exclude known-prior from hours logged math
    if (status !== 'known-prior' && hours > 0) {
      actualHoursLogged += hours;
    }
  }

  // 2. Determine elapsed time (defaulting to minimum 1 week or real delta)
  const now = new Date();
  const start = startDateIso ? new Date(startDateIso) : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const diffDays = Math.max(1, Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const weeksElapsed = Math.max(0.5, parseFloat((diffDays / 7).toFixed(1)));

  // 3. Pacing velocities
  const currentWeeklyPace = parseFloat((actualHoursLogged / weeksElapsed).toFixed(1));
  const remainingHours = Math.max(0, totalEstHours - actualHoursLogged);
  const remainingWeeks = Math.max(0.5, timeBudgetWeeks - weeksElapsed);
  const requiredWeeklyPace = parseFloat((remainingHours / remainingWeeks).toFixed(1));

  // 4. Pace Status & Variance
  const hoursVariance = parseFloat((actualHoursLogged - (weeklyHoursTarget * weeksElapsed)).toFixed(1));

  let paceStatus: 'ahead' | 'on-track' | 'behind' = 'on-track';
  if (currentWeeklyPace >= requiredWeeklyPace * 1.1 || hoursVariance >= 5) {
    paceStatus = 'ahead';
  } else if (currentWeeklyPace < requiredWeeklyPace * 0.85 || hoursVariance <= -5) {
    paceStatus = 'behind';
  }

  // 5. Projected Completion Date
  const projectedRemainingWeeks = currentWeeklyPace > 0 ? remainingHours / currentWeeklyPace : remainingHours / weeklyHoursTarget;
  const projectedFinish = new Date(now.getTime() + projectedRemainingWeeks * 7 * 24 * 60 * 60 * 1000);

  const progressPercentage = totalEstHours > 0 ? Math.min(100, Math.round((actualHoursLogged / totalEstHours) * 100)) : 0;

  return {
    actual_hours_logged: actualHoursLogged,
    total_est_hours: totalEstHours,
    time_budget_weeks: timeBudgetWeeks,
    weekly_hours_target: weeklyHoursTarget,
    weeks_elapsed: weeksElapsed,
    current_weekly_pace: currentWeeklyPace,
    required_weekly_pace: requiredWeeklyPace,
    pace_status: paceStatus,
    hours_variance: hoursVariance,
    projected_completion_date: projectedFinish.toISOString().split('T')[0],
    progress_percentage: progressPercentage,
  };
}
