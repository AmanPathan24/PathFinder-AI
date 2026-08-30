export type NodeType = 'skill' | 'course' | 'project' | 'assessment';

export type TrackId = 'data-science' | 'frontend' | 'devops';

export interface OntologyNode {
  id: string;
  title: string;
  type: NodeType;
  track: TrackId;
  difficulty: number; // 1 to 5
  est_hours: number;
  description: string;
  keywords: string[];
  embedding?: number[];
}

export interface OntologyEdge {
  from_id: string; // Prerequisite
  to_id: string;   // Dependent
  weight?: number; // Default 1
}

export interface SkillOntology {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

export interface UserParsedProfile {
  target_track: TrackId;
  known_skills: string[]; // Stated names, e.g. ["python", "sql"]
  known_node_ids: string[]; // Resolved canonical node IDs
  time_budget_weeks: number;
  weekly_hours?: number; // Default 10h/week
  raw_goal: string;
}

export interface GroundedNodeExplanation {
  node_id: string;
  explanation: string;
}

export interface PathMilestone {
  milestone_index: number;
  title: string;
  nodes: OntologyNode[];
  is_parallel: boolean;
  est_hours: number;
}

export interface PathEngineOutput {
  target_track: TrackId;
  milestones: PathMilestone[];
  recommended_nodes: OntologyNode[];
  trimmed_nodes: OntologyNode[];
  total_est_hours: number;
  time_budget_hours: number;
  is_trimmed: boolean;
  completed_node_ids: string[];
}
