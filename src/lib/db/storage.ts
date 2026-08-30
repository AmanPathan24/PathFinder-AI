import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { UserAccount, Roadmap, NodeStatus, SkillMastery, OutcomeEvent } from '@/types/roadmap';
import { Resource, Subtopic, ResourceUpvote } from '@/types/resource';

interface DBState {
  users: UserAccount[];
  roadmaps: Roadmap[];
  nodeStatuses: NodeStatus[];
  skillMasteries: SkillMastery[];
  outcomeEvents: OutcomeEvent[];
  resources: Resource[];
  subtopics: Subtopic[];
  resourceUpvotes: ResourceUpvote[];
}

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'pathfinder_db.json');

// Initialize default seed state
function getInitialState(): DBState {
  const defaultSalt = bcrypt.genSaltSync(10);
  const demoHashedPassword = bcrypt.hashSync('password123', defaultSalt);

  return {
    users: [
      {
        id: 'usr_demo_1',
        name: 'Alex Mercer',
        email: 'demo@pathfinder.ai',
        password_hash: demoHashedPassword,
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
      },
    ],
    roadmaps: [],
    nodeStatuses: [],
    skillMasteries: [],
    outcomeEvents: [],
    resources: [],
    subtopics: [],
    resourceUpvotes: [],
  };
}

let inMemoryDb: DBState | null = null;

function loadDb(): DBState {
  if (inMemoryDb) return inMemoryDb;

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(data);
      return inMemoryDb!;
    }
  } catch (err) {
    console.warn('Could not read persistent DB file, falling back to memory state:', err);
  }

  inMemoryDb = getInitialState();
  saveDb(inMemoryDb);
  return inMemoryDb;
}

function saveDb(state: DBState): void {
  inMemoryDb = state;
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not persist DB to disk:', err);
  }
}

// User Operations
export async function findUserByEmail(email: string): Promise<UserAccount | null> {
  const db = loadDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function findUserById(id: string): Promise<UserAccount | null> {
  const db = loadDb();
  return db.users.find((u) => u.id === id) || null;
}

export async function createUser(name: string, email: string, passwordPlain: string): Promise<UserAccount> {
  const db = loadDb();
  const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
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

  db.users.push(newUser);
  saveDb(db);
  return newUser;
}

// Roadmap Operations
export async function getRoadmapsForUser(userId: string): Promise<Roadmap[]> {
  const db = loadDb();
  return db.roadmaps.filter((r) => r.user_id === userId);
}

export async function getRoadmapById(id: string): Promise<Roadmap | null> {
  const db = loadDb();
  return db.roadmaps.find((r) => r.id === id) || null;
}

export async function createRoadmap(roadmap: Omit<Roadmap, 'id' | 'created_at' | 'updated_at'>): Promise<Roadmap> {
  const db = loadDb();
  const newRoadmap: Roadmap = {
    ...roadmap,
    id: `rdm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.roadmaps.push(newRoadmap);
  saveDb(db);
  return newRoadmap;
}

export async function updateRoadmap(id: string, updates: Partial<Roadmap>): Promise<Roadmap | null> {
  const db = loadDb();
  const idx = db.roadmaps.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  db.roadmaps[idx] = {
    ...db.roadmaps[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  saveDb(db);
  return db.roadmaps[idx];
}

export async function archiveRoadmap(id: string, isArchived = true): Promise<Roadmap | null> {
  return updateRoadmap(id, { is_archived: isArchived });
}

// NodeStatus Operations
export async function getNodeStatuses(userId: string, roadmapId: string): Promise<NodeStatus[]> {
  const db = loadDb();
  return db.nodeStatuses.filter((ns) => ns.user_id === userId && ns.roadmap_id === roadmapId);
}

export async function setNodeStatus(
  userId: string,
  roadmapId: string,
  nodeId: string,
  status: NodeStatus['status']
): Promise<NodeStatus> {
  const db = loadDb();
  const existingIdx = db.nodeStatuses.findIndex(
    (ns) => ns.user_id === userId && ns.roadmap_id === roadmapId && ns.node_id === nodeId
  );

  const updated: NodeStatus = {
    user_id: userId,
    roadmap_id: roadmapId,
    node_id: nodeId,
    status,
    marked_at: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    db.nodeStatuses[existingIdx] = updated;
  } else {
    db.nodeStatuses.push(updated);
  }

  // Also synchronize to global SkillMastery if marked 'done' or 'known-prior'
  if (status === 'done' || status === 'known-prior') {
    const source = status === 'known-prior' ? 'prior-knowledge' : 'roadmap-completed';
    await setSkillMastery(userId, nodeId, source);
  }

  saveDb(db);
  return updated;
}

// SkillMastery Operations (Global across roadmaps)
export async function getSkillMastery(userId: string): Promise<SkillMastery[]> {
  const db = loadDb();
  return db.skillMasteries.filter((sm) => sm.user_id === userId);
}

export async function setSkillMastery(
  userId: string,
  nodeId: string,
  source: SkillMastery['source']
): Promise<SkillMastery> {
  const db = loadDb();
  const existingIdx = db.skillMasteries.findIndex((sm) => sm.user_id === userId && sm.node_id === nodeId);

  const updated: SkillMastery = {
    user_id: userId,
    node_id: nodeId,
    mastered_at: new Date().toISOString(),
    source,
  };

  if (existingIdx >= 0) {
    db.skillMasteries[existingIdx] = updated;
  } else {
    db.skillMasteries.push(updated);
  }

  saveDb(db);
  return updated;
}

// Outcome Events (for Phase 5 edge reweighting)
export async function logOutcomeEvent(
  event: Omit<OutcomeEvent, 'id' | 'created_at'>
): Promise<OutcomeEvent> {
  const db = loadDb();
  const newEvent: OutcomeEvent = {
    ...event,
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  db.outcomeEvents.push(newEvent);
  saveDb(db);
  return newEvent;
}

export async function getOutcomeEvents(): Promise<OutcomeEvent[]> {
  const db = loadDb();
  return db.outcomeEvents;
}

// Resources & Subtopics
export async function getAllSubtopics(): Promise<Subtopic[]> {
  const db = loadDb();
  return db.subtopics;
}

export async function setSubtopics(subtopics: Subtopic[]): Promise<void> {
  const db = loadDb();
  db.subtopics = subtopics;
  saveDb(db);
}

export async function getResources(parentSkillId?: string): Promise<Resource[]> {
  const db = loadDb();
  if (parentSkillId) {
    return db.resources.filter((r) => r.parent_skill_id === parentSkillId);
  }
  return db.resources;
}

export async function setResources(resources: Resource[]): Promise<void> {
  const db = loadDb();
  db.resources = resources;
  saveDb(db);
}

export async function upvoteResource(resourceId: string, userId: string): Promise<Resource | null> {
  const db = loadDb();
  const resIdx = db.resources.findIndex((r) => r.id === resourceId);
  if (resIdx === -1) return null;

  const existingVote = db.resourceUpvotes.find(
    (v) => v.resource_id === resourceId && v.user_id === userId
  );

  if (!existingVote) {
    db.resourceUpvotes.push({
      id: `upv_${Date.now()}`,
      resource_id: resourceId,
      user_id: userId,
      created_at: new Date().toISOString(),
    });
    db.resources[resIdx].upvotes = (db.resources[resIdx].upvotes || 0) + 1;
    // Recalculate quality score
    db.resources[resIdx].quality_score = Math.min(
      5.0,
      parseFloat((4.0 + (db.resources[resIdx].upvotes * 0.1)).toFixed(2))
    );
    saveDb(db);
  }

  return db.resources[resIdx];
}
