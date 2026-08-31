import bcrypt from 'bcryptjs';
import { supabase } from './supabase';
import { UserAccount, Roadmap, NodeStatus, SkillMastery, OutcomeEvent } from '@/types/roadmap';
import { Resource, Subtopic, ResourceUpvote } from '@/types/resource';

// ─── User Operations ─────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserAccount | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    console.error('findUserByEmail error:', error);
    return null;
  }
  return data as UserAccount | null;
}

export async function findUserById(id: string): Promise<UserAccount | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('findUserById error:', error);
    return null;
  }
  return data as UserAccount | null;
}

export async function createUser(name: string, email: string, passwordPlain: string): Promise<UserAccount> {
  // Check if a user with this email already exists
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new Error('A user with this email already exists.');
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(passwordPlain, salt);

  const newUser: UserAccount = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name,
    email: email.toLowerCase(),
    password_hash,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .insert(newUser)
    .select()
    .single();

  if (error) {
    console.error('createUser error:', error);
    throw new Error('Failed to create user: ' + error.message);
  }

  return data as UserAccount;
}

// ─── Roadmap Operations ──────────────────────────────────────

export async function getRoadmapsForUser(userId: string): Promise<Roadmap[]> {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getRoadmapsForUser error:', error);
    return [];
  }
  return (data || []) as Roadmap[];
}

export async function getRoadmapById(id: string): Promise<Roadmap | null> {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('getRoadmapById error:', error);
    return null;
  }
  return data as Roadmap | null;
}

export async function createRoadmap(roadmap: Omit<Roadmap, 'id' | 'created_at' | 'updated_at'>): Promise<Roadmap> {
  const newRoadmap: Roadmap = {
    ...roadmap,
    id: `rdm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('roadmaps')
    .insert(newRoadmap)
    .select()
    .single();

  if (error) {
    console.error('createRoadmap error:', error);
    throw new Error('Failed to create roadmap: ' + error.message);
  }

  return data as Roadmap;
}

export async function updateRoadmap(id: string, updates: Partial<Roadmap>): Promise<Roadmap | null> {
  const { data, error } = await supabase
    .from('roadmaps')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateRoadmap error:', error);
    return null;
  }
  return data as Roadmap;
}

export async function archiveRoadmap(id: string, isArchived = true): Promise<Roadmap | null> {
  return updateRoadmap(id, { is_archived: isArchived });
}

// ─── NodeStatus Operations ───────────────────────────────────

export async function getNodeStatuses(userId: string, roadmapId: string): Promise<NodeStatus[]> {
  const { data, error } = await supabase
    .from('node_statuses')
    .select('*')
    .eq('user_id', userId)
    .eq('roadmap_id', roadmapId);

  if (error) {
    console.error('getNodeStatuses error:', error);
    return [];
  }
  return (data || []) as NodeStatus[];
}

export async function setNodeStatus(
  userId: string,
  roadmapId: string,
  nodeId: string,
  status: NodeStatus['status']
): Promise<NodeStatus> {
  const updated: NodeStatus = {
    user_id: userId,
    roadmap_id: roadmapId,
    node_id: nodeId,
    status,
    marked_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('node_statuses')
    .upsert(updated, { onConflict: 'user_id,roadmap_id,node_id' })
    .select()
    .single();

  if (error) {
    console.error('setNodeStatus error:', error);
    throw new Error('Failed to set node status: ' + error.message);
  }

  // Synchronize to global SkillMastery if marked 'done' or 'known-prior'
  if (status === 'done' || status === 'known-prior') {
    const source = status === 'known-prior' ? 'prior-knowledge' : 'roadmap-completed';
    await setSkillMastery(userId, nodeId, source);
  }

  return data as NodeStatus;
}

// ─── SkillMastery Operations (Global across roadmaps) ────────

export async function getSkillMastery(userId: string): Promise<SkillMastery[]> {
  const { data, error } = await supabase
    .from('skill_masteries')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('getSkillMastery error:', error);
    return [];
  }
  return (data || []) as SkillMastery[];
}

export async function setSkillMastery(
  userId: string,
  nodeId: string,
  source: SkillMastery['source']
): Promise<SkillMastery> {
  const updated: SkillMastery = {
    user_id: userId,
    node_id: nodeId,
    mastered_at: new Date().toISOString(),
    source,
  };

  const { data, error } = await supabase
    .from('skill_masteries')
    .upsert(updated, { onConflict: 'user_id,node_id' })
    .select()
    .single();

  if (error) {
    console.error('setSkillMastery error:', error);
    throw new Error('Failed to set skill mastery: ' + error.message);
  }

  return data as SkillMastery;
}

// ─── Outcome Events (for Phase 5 edge reweighting) ──────────

export async function logOutcomeEvent(
  event: Omit<OutcomeEvent, 'id' | 'created_at'>
): Promise<OutcomeEvent> {
  const newEvent: OutcomeEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('outcome_events')
    .insert(newEvent)
    .select()
    .single();

  if (error) {
    console.error('logOutcomeEvent error:', error);
    throw new Error('Failed to log outcome event: ' + error.message);
  }

  return data as OutcomeEvent;
}

export async function getOutcomeEvents(): Promise<OutcomeEvent[]> {
  const { data, error } = await supabase
    .from('outcome_events')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('getOutcomeEvents error:', error);
    return [];
  }
  return (data || []) as OutcomeEvent[];
}

// ─── Resources & Subtopics ──────────────────────────────────

export async function getAllSubtopics(): Promise<Subtopic[]> {
  const { data, error } = await supabase
    .from('subtopics')
    .select('*');

  if (error) {
    console.error('getAllSubtopics error:', error);
    return [];
  }
  return (data || []) as Subtopic[];
}

export async function setSubtopics(subtopics: Subtopic[]): Promise<void> {
  // Replace all subtopics: delete existing, then insert new
  const { error: deleteError } = await supabase
    .from('subtopics')
    .delete()
    .neq('id', ''); // delete all rows

  if (deleteError) {
    console.error('setSubtopics delete error:', deleteError);
  }

  if (subtopics.length > 0) {
    const { error: insertError } = await supabase
      .from('subtopics')
      .insert(subtopics);

    if (insertError) {
      console.error('setSubtopics insert error:', insertError);
    }
  }
}

export async function getResources(parentSkillId?: string): Promise<Resource[]> {
  let query = supabase.from('resources').select('*');

  if (parentSkillId) {
    query = query.eq('parent_skill_id', parentSkillId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('getResources error:', error);
    return [];
  }
  return (data || []) as Resource[];
}

export async function setResources(resources: Resource[]): Promise<void> {
  // Replace all resources: delete existing, then insert new
  const { error: deleteError } = await supabase
    .from('resources')
    .delete()
    .neq('id', ''); // delete all rows

  if (deleteError) {
    console.error('setResources delete error:', deleteError);
  }

  if (resources.length > 0) {
    const { error: insertError } = await supabase
      .from('resources')
      .insert(resources);

    if (insertError) {
      console.error('setResources insert error:', insertError);
    }
  }
}

export async function upvoteResource(resourceId: string, userId: string): Promise<Resource | null> {
  // Check if user already upvoted
  const { data: existingVote } = await supabase
    .from('resource_upvotes')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingVote) {
    // Already voted — return current resource state
    const { data: resource } = await supabase
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .maybeSingle();
    return (resource as Resource) || null;
  }

  // Insert the upvote
  const { error: voteError } = await supabase
    .from('resource_upvotes')
    .insert({
      id: `upv_${Date.now()}`,
      resource_id: resourceId,
      user_id: userId,
      created_at: new Date().toISOString(),
    });

  if (voteError) {
    console.error('upvoteResource vote error:', voteError);
    return null;
  }

  // Fetch current resource to compute new values
  const { data: currentResource, error: fetchError } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resourceId)
    .maybeSingle();

  if (fetchError || !currentResource) {
    console.error('upvoteResource fetch error:', fetchError);
    return null;
  }

  const newUpvotes = ((currentResource as Resource).upvotes || 0) + 1;
  const newQualityScore = Math.min(5.0, parseFloat((4.0 + newUpvotes * 0.1).toFixed(2)));

  const { data: updatedResource, error: updateError } = await supabase
    .from('resources')
    .update({ upvotes: newUpvotes, quality_score: newQualityScore })
    .eq('id', resourceId)
    .select()
    .single();

  if (updateError) {
    console.error('upvoteResource update error:', updateError);
    return null;
  }

  return updatedResource as Resource;
}
