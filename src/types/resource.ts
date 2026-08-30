export interface Subtopic {
  id: string;
  parent_skill_id: string; // FK to OntologyNode.id
  title: string;
  est_hours: number;
}

export type ResourceProvider = 'youtube' | 'curated' | 'other';
export type ResourceType = 'official' | 'article' | 'video' | 'course';

export interface Resource {
  id: string;
  subtopic_id: string;
  parent_skill_id: string;
  title: string;
  provider: ResourceProvider;
  type: ResourceType; // matches Phase 2's panel badges
  url: string;
  duration_minutes?: number;
  quality_score: number; // computed from in-app signals (upvotes, completion rate)
  upvotes: number;
  description?: string;
  author_or_channel?: string;
}

export interface ResourceUpvote {
  id: string;
  resource_id: string;
  user_id: string;
  created_at: string;
}
