import { TrackId, OntologyNode, PathMilestone } from './ontology';

export type NodeStatusType = 'not-started' | 'learning' | 'done' | 'skipped' | 'known-prior';

export interface NodeStatus {
  user_id: string;
  roadmap_id: string;
  node_id: string; // OntologyNode or Subtopic id
  status: NodeStatusType;
  marked_at: string; // ISO timestamp
}

export type SkillMasterySource = 'prior-knowledge' | 'roadmap-completed';

export interface SkillMastery {
  user_id: string;
  node_id: string;
  mastered_at: string;
  source: SkillMasterySource;
}

export interface Roadmap {
  id: string;
  user_id: string;
  title: string;
  target_track: TrackId;
  time_budget_weeks: number;
  weekly_hours: number;
  raw_goal: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  image?: string;
  created_at: string;
}

export interface OutcomeEvent {
  id: string;
  user_id: string;
  roadmap_id: string;
  node_id: string;
  action: 'skipped' | 'completed';
  downstream_node_id?: string;
  downstream_success?: boolean;
  created_at: string;
}

export interface PaceAnalysis {
  actual_hours_logged: number; // strictly excludes known-prior
  total_est_hours: number;
  time_budget_weeks: number;
  weekly_hours_target: number;
  weeks_elapsed: number;
  current_weekly_pace: number;
  required_weekly_pace: number;
  pace_status: 'ahead' | 'on-track' | 'behind';
  hours_variance: number; // positive = ahead, negative = behind
  projected_completion_date: string;
  progress_percentage: number;
}
