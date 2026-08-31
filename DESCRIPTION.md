# PathFinder AI — Complete Technical Specification

> **Full architecture reference, algorithm deep-dives, and implementation details.**
> For quick-start setup, see [README.md](./README.md).

---

## Table of Contents

1. [Executive Summary & Core Problem](#1-executive-summary--core-problem)
2. [Architecture Overview — 10-Stage Pipeline](#2-architecture-overview--10-stage-pipeline)
3. [Stage-by-Stage Implementation](#3-stage-by-stage-implementation)
4. [Algorithms — Deep Dive](#4-algorithms--deep-dive)
5. [Skill Ontology — The Data Model](#5-skill-ontology--the-data-model)
6. [Database Architecture](#6-database-architecture)
7. [Design System — "Warm Editorial Tech"](#7-design-system--warm-editorial-tech)
8. [Test Coverage & Verification](#8-test-coverage--verification)
9. [Impact & Differentiators](#9-impact--differentiators)
10. [Full Project Structure](#10-full-project-structure)
11. [Environment Variables Reference](#11-environment-variables-reference)

---

## 1. Executive Summary & Core Problem

### What every existing learning-path tool gets wrong

| Problem | Detail |
|---|---|
| **Unverified self-reported skills** | You say "I know Python." The tool blindly skips Python. Whether you wrote 5 lines or 5,000 lines makes no difference. The entire roadmap is built on an unverified claim. |
| **LLM hallucinations in course ordering** | Tools that use GPT to generate a JSON roadmap frequently invent non-existent topics, misordering fundamentals (e.g., recommending PyTorch before Python basics). |
| **No time-budget awareness** | A 6-month plan and a 3-month plan look nearly identical. Hours are not tracked or constrained. |
| **No parallel study optimization** | Linear lists waste time. Many skills can be studied simultaneously. No existing tool surfaces this. |
| **No feedback adaptation** | Once generated, the path is static. Skipping or completing a node doesn't reshape the roadmap. |
| **No bottleneck visibility** | Users don't know which skills will unblock the most downstream topics. They spend time on the wrong things. |

### The PathFinder Solution

PathFinder replaces the "ask an LLM to write a roadmap" pattern with a **strict separation of concerns**:

```
LLM role:  Language parsing only  →  Extract intent from free text
           Diagnostic evaluation  →  Score free-text skill answers
           Grounded explanations  →  1-sentence rationale per node (fact-constrained)

Algorithm: Everything else        →  Dependency ordering, parallelism, budget,
                                     bottlenecks, confidence-based pruning, pace
```

**The graph is the source of truth. The LLM is a translator, not a planner.**

---

## 2. Architecture Overview — 10-Stage Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Next.js 14 App Router)                  │
│                                                                              │
│  / ──► /onboarding ──► /diagnostic ──► /path ──► /dashboard                 │
│                                                                              │
│  PathContext (React Context)                                                 │
│  ├── parsedProfile: UserParsedProfile                                        │
│  ├── pathOutput: PathEngineOutput                                            │
│  ├── diagnosticConfidences: Record<string, number>                           │
│  ├── nodeStatuses: Record<string, NodeStatusType>                            │
│  ├── knownPriorNodeIds: string[]                                             │
│  └── recalculatePath(options) → POST /api/recommend                         │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │ fetch()
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                            API ROUTES (Next.js Route Handlers)               │
│                                                                              │
│  POST /api/recommend                                                         │
│  ├── parseUserGoal()          → src/lib/llm/parser.ts                        │
│  ├── resolveKnownSkillNodeIds() → src/lib/engine/skill-profiler.ts           │
│  ├── generateLearningPath()   → src/lib/engine/path-engine.ts                │
│  └── generateGroundedExplanations() → src/lib/llm/explainer.ts              │
│                                                                              │
│  POST /api/diagnostic                                                        │
│  ├── action:'questions' → generateDiagnosticQuestions()                      │
│  └── action:'evaluate'  → evaluateDiagnosticAnswers()                        │
│                                                                              │
│  POST /api/tutor              → Node-scoped AI tutor                         │
│  GET  /api/roadmaps           → Supabase persistence                         │
│  POST /api/roadmaps/[id]/status → Node status updates                        │
│  GET  /api/mastery            → Global skill mastery                         │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                            CORE ENGINE (Pure TypeScript — Zero LLM)          │
│                                                                              │
│  path-engine.ts                                                              │
│  ├── Confidence threshold pruning (diagnostic integration)                   │
│  ├── Track subgraph filter                                                   │
│  ├── Kahn's Algorithm (modified topological wave sort)                       │
│  ├── Parallel milestone detection                                            │
│  └── optimizePathBudget() ──► knapsack-optimizer.ts                         │
│                                                                              │
│  bottleneck-analyzer.ts                                                      │
│  ├── Transitive downstream reachability (DFS)                                │
│  └── Longest critical path (DP memoization)                                  │
│                                                                              │
│  pace-calculator.ts                                                          │
│  └── Velocity, variance, projected completion date                           │
│                                                                              │
│  outcome-feedback.ts                                                         │
│  └── Edge reweighting proposals from skip/complete event patterns            │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                            LLM LAYER (Graceful Cascade)                      │
│                                                                              │
│  For every LLM call:                                                         │
│  1. Try Gemini (gemini-3.7-flash) — 3–4s timeout                            │
│  2. Try OpenAI (gpt-4o-mini) — 3–4s timeout                                 │
│  3. Deterministic fallback — always available, zero latency                  │
│                                                                              │
│  parser.ts       → JSON extraction from free text                            │
│  explainer.ts    → Fact-constrained 1-sentence explanations                  │
│  diagnostic-agent.ts → Micro-quiz generation + answer evaluation             │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                            DATA LAYER (Supabase PostgreSQL)                   │
│                                                                              │
│  supabase.ts → Singleton client                                              │
│  storage.ts  → 15 async functions (users, roadmaps, statuses, mastery,       │
│                outcome events, resources, subtopics, upvotes)                │
│  8 tables with full relational integrity + cascading deletes                 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stage-by-Stage Implementation

### Stage 1 — Conversational Intake Parser (`src/lib/llm/parser.ts`)

- **Objective**: Convert unstructured user input (e.g., *"I know Python and basic SQL, want to become a data scientist in 6 months"*) into strict JSON.
- **Extracted Schema**:
  ```json
  {
    "target_track": "data-science",
    "known_skills": ["python", "sql"],
    "time_budget_weeks": 24,
    "raw_goal": "..."
  }
  ```
- **Execution & Fallback**:
  - Primary: Google Gemini (`gemini-3.7-flash`) with strict JSON mode.
  - Secondary: OpenAI `gpt-4o-mini`.
  - Fallback: Deterministic keyword heuristic parser with regex pattern matching — system operates seamlessly even without API keys.
  - Timeout: Wrapped with `AbortController` (3-second limit).

### Stage 2 — Profile Calibration (Onboarding)

- Track selection: Data Science | Frontend Development | DevOps
- Time budget slider: 4–52 weeks
- Pre-select claimed known skills (mapped from free-text via fuzzy keyword matching)
- Dynamic button: *"Confirm & Verify 3 Skills →"*

### Stage 2.5 — Diagnostic Confidence Agent *(Key Differentiator)*

**The only learning-path tool that verifies what you claim to know.**

Every other tool treats skill knowledge as a **boolean**: known = 1, unknown = 0. PathFinder replaces this with a **continuous confidence score (0.0 → 1.0)** per skill, produced by a micro-quiz of 2–3 targeted "gotcha" questions.

| Confidence Score | Tier | Effect on Roadmap |
|---|---|---|
| **≥ 0.75** | Mastered | Node fully pruned from roadmap. Zero study hours. |
| **0.40 – 0.75** | Refresher | Node kept but `est_hours × 0.20`. Quick review, not full study. |
| **< 0.40** | Full Study | Node included at full estimated hours. |
| **No API key / timeout** | Graceful fallback | Defaults to 0.60 (Refresher tier). System never breaks. |

**Why short-answer beats MCQ:** MCQ has 25% random-chance success per question. Short-answer + keyword-match evaluation requires actual recall, not recognition — producing a reliable confidence signal for roadmap calibration.

### Stage 3 — Pure DAG Path Engine (`src/lib/engine/path-engine.ts`)

Core recommendation logic — pure TypeScript, zero LLM dependencies:

1. **Track Subgraph Filtering**: Isolates the requested career track.
2. **Prerequisite Reachability Analysis**: Identifies all nodes upstream of target/capstone nodes.
3. **Confidence-Threshold Pruning**: Applies three-tier diagnostic results.
4. **Modified Topological Wave Sorting (Kahn's Algorithm)**: Groups nodes into parallel study milestones.
5. **Precedence-Constrained Knapsack Trimming**: Enforces time budget while preserving dependency chains.

### Stage 4 — Grounded Explanations (`src/lib/llm/explainer.ts`)

- 1-sentence explanation per recommended node.
- Strictly constrained to graph facts (node title, prerequisites, dependents).
- Concurrent `Promise.all` execution across all nodes with 3-second timeout per call.
- Instant template fallback on timeout or network failure.

### Stage 5 — Interactive Roadmap Canvas

- React Flow (`@xyflow/react`) visual DAG graph.
- Custom node UI with status colors, bottleneck badges, refresher badges.
- Right-click context menu for quick status updates.
- Click any node → Node Detail Drawer with resources + AI Tutor.
- Zoom, pan, fit-to-screen controls.

### Stage 6 — Milestone Cards View

- Toggleable card view alongside canvas view.
- Per-milestone: index, title, parallel flag, total hours.
- Per-node: status buttons (Learning / Done / Known / Skip).
- Subtopic checklists with parent-child sync logic.
- "Diagnostic Refresher" and "Bottleneck" badges.

### Stage 7 — Analytics Dashboard

- Roadmap progress percentage.
- Study hours logged vs. estimated.
- Pace status: Ahead / On-Track / Behind.
- Current weekly pace vs. required pace.
- Projected completion date.
- Multiple roadmap switcher.

### Stage 8 — AI Tutor (Node-Scoped)

- Per-node tutor chat scoped to a single skill.
- System prompt locked to graph facts (title, difficulty, prerequisites, unlocks).
- Explicit constraint: no quiz generation (tutor explains, diagnostic verifies).
- Gemini → OpenAI → deterministic fallback chain with 6-second timeout.

### Stage 9 — Authentication & Persistence

- Email/password auth (bcrypt hashed) + optional Google OAuth.
- NextAuth JWT sessions (30-day expiry).
- Roadmap CRUD API: create, read, update, archive.
- Per-node status persistence via `/api/roadmaps/[id]/status`.
- **Supabase PostgreSQL** for all persistent storage (see [Database Architecture](#6-database-architecture)).

### Stage 10 — Outcome Feedback Engine

- Tracks skip + downstream completion events.
- Generates edge reweighting proposals when skipped prerequisites don't hurt downstream success.
- Human-reviewable proposals: `make_optional` | `reduce_weight` | `keep_strict`.

---

## 4. Algorithms — Deep Dive

### 4.1 Modified Kahn's Algorithm (Topological Wave Grouping)

Standard topological sort produces a linear order. PathFinder extends it to produce **waves** (milestones):

```
1. Build prereqsOfMap: nodeId → Set<prerequisiteIds>
2. Calculate unmetPrereqCount for each active node
3. Wave 0: all nodes with unmetPrereqCount == 0  → Milestone 1
4. Decrement unmetPrereqCount for dependents of Wave 0 nodes
5. Wave 1: all remaining nodes with unmetPrereqCount == 0  → Milestone 2
6. Repeat until all nodes processed
7. Within each wave: sort by difficulty ASC, then title ASC
8. Wave size > 1 → is_parallel = true → "⚡ Study in Parallel"
```

**Why this matters:** A learner studying Data Science can simultaneously study Python, SQL, and Statistics since none depends on the others. A linear list would sequence them needlessly.

### 4.2 Precedence-Constrained Knapsack (Budget Optimizer)

Standard 0/1 Knapsack doesn't account for dependencies — you can't include a node without its prerequisites.

```
For each candidate node, sorted by value/hour density DESC:
  1. value(node) = 20 + downstream_count × 15 + difficulty × 5
  2. Compute full transitive prerequisite set
  3. bundle_hours = node.est_hours + sum(all unincluded prereqs hours)
  4. If currentHours + bundle_hours ≤ budget → include bundle
  5. Otherwise → trim this node
```

**Result:** Always prefer foundational high-value nodes. Never include a dependent without its prerequisites. Budget is guaranteed.

### 4.3 Confidence-Threshold Pruning (Diagnostic Agent Integration)

```typescript
for (const nodeId of knownNodeIds) {
  const confidence = diagnosticConfidences[nodeId] ?? 0.6; // fallback

  if (confidence >= 0.75)  → masteredNodeIds   (pruned entirely)
  if (confidence >= 0.40)  → refresherHoursOverride (est_hours × 0.2)
  if (confidence <  0.40)  → full inclusion
  if (no confidence entry) → default 0.6 (refresher fallback)
}

// Applied during candidateNodes construction:
candidateNodes = trackNodes
  .filter(n => !masteredNodeIds.has(n.id) && !excludedNodeIds.has(n.id))
  .map(n => refresherHoursOverride.has(n.id)
    ? { ...n, est_hours: Math.max(1, Math.round(n.est_hours * 0.2)) }
    : n
  );
```

### 4.4 Bottleneck Analysis (DFS + DP)

```
Step 1 — Transitive downstream count (DFS from each node):
  downstreamCount['ds-python-basics'] = 12  ← touches 12 downstream nodes

Step 2 — Longest critical path (DP with memoization):
  longestPath['ds-python-basics'] = 8  ← 8 hops to terminal capstone

Step 3 — Score = downstreamCount × 2 + longestPath
  Top 25% by score → flagged as BOTTLENECK ⚡
```

### 4.5 Pace Calculator

```
actualHoursLogged = Σ loggedHours[id] where status[id] ≠ 'known-prior'
weeksElapsed = (now - startDate) / 7
currentWeeklyPace = actualHoursLogged / weeksElapsed
requiredWeeklyPace = remainingHours / remainingWeeks
hoursVariance = actualHoursLogged - (weeklyTarget × weeksElapsed)

paceStatus:
  'ahead'    if currentPace ≥ required × 1.1 OR variance ≥ +5h
  'behind'   if currentPace < required × 0.85 OR variance ≤ -5h
  'on-track' otherwise
```

---

## 5. Skill Ontology — The Data Model

```typescript
interface OntologyNode {
  id: string;          // e.g. 'ds-python-basics'
  title: string;       // e.g. 'Python Programming Fundamentals'
  type: 'skill' | 'course' | 'project' | 'assessment';
  track: 'data-science' | 'frontend' | 'devops';
  difficulty: number;  // 1–5
  est_hours: number;   // e.g. 15
  description: string;
  keywords: string[];
  embedding?: number[]; // for cosine similarity matching
}

interface OntologyEdge {
  from_id: string;  // prerequisite node
  to_id: string;    // dependent node
  weight?: number;  // default 1.0; reduced by outcome feedback
}
```

### Tracks Covered

| Track | Nodes | Key Skills |
|---|---|---|
| **Data Science** | ~18 nodes | Python, SQL, NumPy/Pandas, Statistics, ML, Deep Learning, MLOps |
| **Frontend Dev** | ~15 nodes | HTML/CSS, JavaScript, TypeScript, React, Next.js, Testing, Performance |
| **DevOps** | ~15 nodes | Linux, Git, Docker, CI/CD, Kubernetes, Terraform, Cloud |

### Node Status Types
`not-started` → `learning` → `done` → `known-prior` → `skipped`

---

## 6. Database Architecture

PathFinder uses **Supabase (PostgreSQL)** for all persistent data storage, accessed server-side through Next.js API routes.

### Schema — 8 Tables

| Table | Description | Primary Key |
|---|---|---|
| `users` | User accounts with bcrypt password hashes | `id (text)` |
| `roadmaps` | Per-user learning roadmaps with track, budget, goal | `id (text)` |
| `node_statuses` | Per-node progress within a specific roadmap | `(user_id, roadmap_id, node_id)` |
| `skill_masteries` | Global skill mastery across all roadmaps | `(user_id, node_id)` |
| `outcome_events` | Skip/complete events for edge reweighting | `id (text)` |
| `subtopics` | Sub-skill checklists under each ontology node | `id (text)` |
| `resources` | Learning resources (videos, articles, courses) | `id (text)` |
| `resource_upvotes` | Per-user upvote tracking with unique constraint | `id (text)` |

### Data Access Layer

All database operations are centralized in `src/lib/db/storage.ts`, which exports 15 async functions. These are consumed exclusively by server-side API routes — the Supabase client never runs in the browser.

Key design decisions:
- **Upsert semantics** for `node_statuses` and `skill_masteries` (composite primary keys).
- **Cascading deletes** on user and roadmap foreign keys.
- **RLS disabled** — all access is server-side through API routes.
- **Automatic `setSkillMastery` sync** when a node is marked `done` or `known-prior`.

### SQL Schema

The full schema is available at [`scripts/supabase_schema.sql`](./scripts/supabase_schema.sql).

---

## 7. Design System — "Warm Editorial Tech"

PathFinder breaks away from generic dark-mode AI templates by adopting a **"Warm Editorial Tech"** visual design language inspired by modern print publishing and warm natural aesthetics.

| Design Token | Color Code | Application |
|---|---|---|
| **Background Ivory** | `#F7F1E7` | Primary canvas & page background |
| **Soft Cream** | `#FFF9F0` | Card containers & paper surfaces |
| **Deep Warm Brown** | `#4A3728` | Headings, serif titles & primary text |
| **Natural Wood** | `#B58B65` | Borders, subtle dividers & icon accents |
| **Terracotta** | `#C96F4A` | Primary CTA buttons, active highlights & focus rings |
| **Muted Sage** | `#8C9A76` | Mastered skill badges, checkmarks & progress bars |

### Typography
- **Headings & Serif Display**: *Instrument Serif* (Google Fonts) — editorial title hierarchy.
- **Body & Controls**: *Plus Jakarta Sans* — UI elements, labels, and form fields.

---

## 8. Test Coverage & Verification

**37 tests passing across 7 test files.**

```
src/lib/engine/__tests__/
├── path-engine.test.ts          11 tests — DAG algorithm + 4 diagnostic confidence cases
├── knapsack-optimizer.test.ts    2 tests — Budget constraint with precedence
├── bottleneck-analyzer.test.ts   2 tests — Critical path identification
├── pace-calculator.test.ts       3 tests — Velocity, known-prior exclusion, behind detection
└── outcome-feedback.test.ts      1 test  — Edge reweighting proposal generation

src/lib/llm/__tests__/
└── diagnostic-agent.test.ts     10 tests — Tier logic, fallback, question gen, eval, clamping

src/lib/canvas/__tests__/
└── layoutGraph.test.ts           8 tests — Graph layout, node overlap, sync logic
```

### Diagnostic Confidence Test Cases

```typescript
// High confidence → fully pruned
diagnosticConfidences: { 'ds-python-basics': 0.95 }
→ not in milestones, appears in known_nodes ✓

// Mid confidence → refresher with reduced hours
diagnosticConfidences: { 'ds-python-basics': 0.55 }
→ in milestones, in refresher_node_ids, est_hours < original ✓

// Low confidence → full inclusion
diagnosticConfidences: { 'ds-python-basics': 0.20 }
→ in milestones, not in refresher_node_ids, est_hours == original ✓

// No diagnosticConfidences → defaults to 0.6 (refresher)
→ in milestones, in refresher_node_ids ✓
```

---

## 9. Impact & Differentiators

### What PathFinder solves that nothing else does

| Capability | Generic AI Tools | PathFinder |
|---|---|---|
| Skill verification before roadmap | ❌ Self-reported binary | ✅ Diagnostic confidence 0–1 |
| Prerequisite ordering correctness | ❌ LLM guesses, hallucinates | ✅ Deterministic topological sort |
| Parallel study detection | ❌ Linear lists only | ✅ Wave-grouped parallel milestones |
| Time-budget enforcement | ❌ Ignores hours | ✅ Knapsack optimizer with precedence |
| Partial knowledge handling | ❌ Skip or include | ✅ Three-tier: mastered/refresher/full |
| Bottleneck visibility | ❌ No priority signal | ✅ DFS + DP critical path analysis |
| Feedback loop adaptation | ❌ Static path | ✅ Real-time recalculation on status change |
| LLM failure resilience | ❌ Breaks without API key | ✅ Full deterministic fallback at every stage |
| Explainability | ❌ Black box output | ✅ Graph-fact-constrained explanations |
| Pace tracking | ❌ Not present | ✅ Weekly velocity + projected completion |

### Why This Architecture is Defensible

1. **Correctness guarantee** — The DAG is code. It cannot hallucinate an edge or invent a prerequisite. The LLM only touches natural language, where correctness is less critical.
2. **Reliability** — The system works identically with or without an API key. Every LLM call has a deterministic fallback. No user ever sees a broken state.
3. **Accuracy on skill assessment** — Short-answer diagnostic is the only format that produces a meaningful confidence signal. MCQ has 25% random success; short-answer requires genuine recall.
4. **Composability** — Each stage (parse → profile → diagnose → plan → explain) is independently testable, replaceable, and improvable.

---

## 10. Full Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Stage 1 — Intake form
│   ├── onboarding/page.tsx         # Stage 2 — Profile calibration
│   ├── diagnostic/page.tsx         # Stage 2.5 — Diagnostic Agent UI
│   ├── path/page.tsx               # Stage 5/6 — Canvas + milestone cards
│   ├── dashboard/page.tsx          # Stage 7 — Analytics
│   └── api/
│       ├── recommend/route.ts      # Full path generation pipeline
│       ├── diagnostic/route.ts     # Question gen + answer evaluation
│       ├── tutor/route.ts          # Node-scoped AI tutor
│       ├── roadmaps/[id]/status    # Node status persistence
│       └── auth/                   # NextAuth handlers
├── lib/
│   ├── db/
│   │   ├── supabase.ts             # Supabase client singleton
│   │   └── storage.ts              # 15 async DB functions (Supabase queries)
│   ├── engine/
│   │   ├── path-engine.ts          # Core DAG algorithm + confidence pruning
│   │   ├── skill-profiler.ts       # Fuzzy skill → node ID resolution
│   │   ├── knapsack-optimizer.ts   # Budget-constrained node selection
│   │   ├── bottleneck-analyzer.ts  # Critical path identification
│   │   ├── pace-calculator.ts      # Learning velocity metrics
│   │   └── outcome-feedback.ts     # Edge reweighting proposals
│   └── llm/
│       ├── parser.ts               # Free-text → structured JSON
│       ├── explainer.ts            # Grounded node explanations
│       └── diagnostic-agent.ts     # Micro-quiz generation + evaluation
├── components/
│   ├── canvas/
│   │   ├── RoadmapCanvas.tsx       # React Flow DAG renderer
│   │   ├── CustomTopicNode.tsx     # Node UI with status + badges
│   │   ├── NodeDetailDrawer.tsx    # Slide-out resources + tutor
│   │   └── FloatingTutorBar.tsx    # Persistent tutor access
│   ├── dashboard/PaceCard.tsx      # Pace analytics card
│   └── Navbar.tsx                  # Navigation with diagnostic step
├── context/PathContext.tsx          # Global state (profile, path, confidences)
├── data/
│   ├── ontology.json               # Skill nodes + edges (3 tracks)
│   └── subtopics.json              # Sub-skill checklists
└── types/
    ├── ontology.ts                 # Node, Edge, PathEngineOutput types
    ├── roadmap.ts                  # Roadmap, NodeStatus, PaceAnalysis types
    └── resource.ts                 # Resource, Subtopic, ResourceUpvote types

scripts/
├── supabase_schema.sql             # Supabase table definitions + seed data
├── verify-supabase.mjs             # Database connectivity test
└── verify-integration.mjs          # Full integration verification
```

---

## 11. Environment Variables Reference

```env
# ── LLM Configuration ──────────────────────────────────
# Google Gemini (primary LLM — recommended)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash

# OpenAI (secondary fallback — optional)
OPENAI_API_KEY=your_openai_api_key_here

# ── Database ────────────────────────────────────────────
# Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-key

# ── Authentication ──────────────────────────────────────
# NextAuth (has a built-in default for local dev)
NEXTAUTH_SECRET=any-random-string-for-local-dev

# Google OAuth (optional — credentials login works without it)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

> **Note:** The app works completely without any API keys. Every LLM feature degrades gracefully to a deterministic fallback. Add keys for richer AI parsing and evaluation.

---

## Acknowledgements

Built with Next.js, React Flow, Tailwind CSS, Vitest, NextAuth.js, Supabase, and the Google Gemini API.

Skill ontology data curated from [roadmap.sh](https://roadmap.sh) reference materials.

---

*PathFinder AI — The learning roadmap that knows what you actually know.*
