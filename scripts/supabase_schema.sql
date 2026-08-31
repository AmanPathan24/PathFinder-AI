-- ============================================================
-- PathFinder AI — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  image         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Roadmaps
CREATE TABLE IF NOT EXISTS roadmaps (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  target_track      TEXT NOT NULL,
  time_budget_weeks INTEGER NOT NULL DEFAULT 24,
  weekly_hours      INTEGER NOT NULL DEFAULT 10,
  raw_goal          TEXT NOT NULL DEFAULT '',
  is_archived       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Node Statuses (per-user, per-roadmap progress)
CREATE TABLE IF NOT EXISTS node_statuses (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_id TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  node_id    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'not-started',
  marked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, roadmap_id, node_id)
);

-- 4. Skill Masteries (global across roadmaps)
CREATE TABLE IF NOT EXISTS skill_masteries (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_id     TEXT NOT NULL,
  mastered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source      TEXT NOT NULL DEFAULT 'roadmap-completed',
  PRIMARY KEY (user_id, node_id)
);

-- 5. Outcome Events (for edge reweighting)
CREATE TABLE IF NOT EXISTS outcome_events (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  roadmap_id           TEXT NOT NULL REFERENCES roadmaps(id) ON DELETE CASCADE,
  node_id              TEXT NOT NULL,
  action               TEXT NOT NULL,
  downstream_node_id   TEXT,
  downstream_success   BOOLEAN,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Subtopics
CREATE TABLE IF NOT EXISTS subtopics (
  id              TEXT PRIMARY KEY,
  parent_skill_id TEXT NOT NULL,
  title           TEXT NOT NULL,
  est_hours       REAL NOT NULL DEFAULT 0
);

-- 7. Resources
CREATE TABLE IF NOT EXISTS resources (
  id                TEXT PRIMARY KEY,
  subtopic_id       TEXT NOT NULL,
  parent_skill_id   TEXT NOT NULL,
  title             TEXT NOT NULL,
  provider          TEXT NOT NULL DEFAULT 'other',
  type              TEXT NOT NULL DEFAULT 'article',
  url               TEXT NOT NULL,
  duration_minutes  INTEGER,
  quality_score     REAL NOT NULL DEFAULT 4.0,
  upvotes           INTEGER NOT NULL DEFAULT 0,
  description       TEXT,
  author_or_channel TEXT
);

-- 8. Resource Upvotes
CREATE TABLE IF NOT EXISTS resource_upvotes (
  id          TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, user_id)
);

-- ============================================================
-- Disable RLS on all tables (server-side access only)
-- ============================================================
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;
ALTER TABLE roadmaps         DISABLE ROW LEVEL SECURITY;
ALTER TABLE node_statuses    DISABLE ROW LEVEL SECURITY;
ALTER TABLE skill_masteries  DISABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_events   DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics        DISABLE ROW LEVEL SECURITY;
ALTER TABLE resources        DISABLE ROW LEVEL SECURITY;
ALTER TABLE resource_upvotes DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- Seed demo user (password: password123)
-- bcrypt hash generated with 10 salt rounds
-- ============================================================
INSERT INTO users (id, name, email, password_hash, image, created_at)
VALUES (
  'usr_demo_1',
  'Alex Mercer',
  'demo@pathfinder.ai',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  now()
)
ON CONFLICT (id) DO NOTHING;
