# PathFinder AI — Personalized Learning Path Recommender

> **"The right skill, in the right order, at the right depth — verified, not assumed."**

PathFinder AI is a full-stack web application that converts a learner's plain-English goal into a precision-engineered, dependency-aware learning roadmap. It is the only tool that **verifies** what you claim to know before building your path — using a Diagnostic Confidence Agent that sits between self-report and roadmap generation.

**Live Repo:** https://github.com/AmanPathan24/PathFinder-AI

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [Key Innovation — What Makes This Different](#3-key-innovation)
4. [Feature Set](#4-feature-set)
5. [Working Flow — User Journey](#5-working-flow--user-journey)
6. [Technical Architecture & Pipeline](#6-technical-architecture--pipeline)
7. [Algorithms — Deep Dive](#7-algorithms--deep-dive)
8. [Skill Ontology — The Data Model](#8-skill-ontology--the-data-model)
9. [Tech Stack](#9-tech-stack)
10. [Project Structure](#10-project-structure)
11. [Impact & Differentiators](#11-impact--differentiators)
12. [Test Coverage](#12-test-coverage)
13. [Local Setup](#13-local-setup)
14. [Environment Variables](#14-environment-variables)

---

## 1. The Problem

### What every existing learning-path tool gets wrong

| Problem | Detail |
|---|---|
| **Self-reported skills are binary and unverified** | You say "I know Python." The tool blindly skips Python. Whether you wrote 5 lines or 5,000 lines makes no difference. The entire roadmap is built on an unverified claim. |
| **LLM hallucinations in course ordering** | Tools that use GPT to generate a JSON roadmap frequently invent non-existent topics, misordering fundamentals (e.g. recommending PyTorch before Python basics). |
| **No time-budget awareness** | A 6-month plan and a 3-month plan look nearly identical. Hours are not tracked or constrained. |
| **No parallel study optimization** | Linear lists waste time. Many skills can be studied simultaneously. No existing tool surfaces this. |
| **No feedback adaptation** | Once generated, the path is static. Skipping or completing a node doesn't reshape the roadmap. |
| **No bottleneck visibility** | Users don't know which skills will unblock the most downstream topics. They spend time on the wrong things. |

---

## 2. The Solution

PathFinder replaces the "ask an LLM to write a roadmap" pattern with a **strict separation of concerns**:

```
LLM role:  Language parsing only  →  Extract intent from free text
           Diagnostic evaluation  →  Score free-text skill answers
           Grounded explanations  →  1-sentence rationale per node (fact-constrained)

Algorithm: Everything else        →  Dependency ordering, parallelism, budget,
                                     bottlenecks, confidence-based pruning, pace
```

The graph is the source of truth. The LLM is a translator, not a planner.

---

## 3. Key Innovation

### Diagnostic Confidence Agent (Stage 2.5) — The Real Differentiator

Every other learning-path tool treats skill knowledge as a **boolean**: known = 1, unknown = 0.

PathFinder replaces this with a **continuous confidence score (0.0 → 1.0)** per skill, produced by a micro-quiz of 2–3 targeted "gotcha" questions — questions only someone who genuinely knows the topic can answer.

#### The three-tier confidence model:

| Confidence Score | Tier | Effect on Roadmap |
|---|---|---|
| **≥ 0.75** | Mastered | Node fully pruned from roadmap. Zero study hours. |
| **0.40 – 0.75** | Refresher | Node kept but `est_hours × 0.20`. Quick review, not full study. |
| **< 0.40** | Full Study | Node included at full estimated hours. |
| **No API key / timeout** | Graceful fallback | Defaults to 0.60 (Refresher tier). System never breaks. |

#### Why short-answer beats MCQ here:
- MCQ has 25% random-chance success per question. Three questions → real knowledge signal is diluted.
- Short-answer + keyword-match evaluation (or LLM scoring) requires actual recall, not recognition.
- This is the only approach that produces a reliable confidence signal for roadmap calibration.

#### The algorithm change this enables (path-engine.ts):
```typescript
// Before (binary):
const ignoredNodeIds = new Set([...knownNodeIds, ...excludedNodeIds]);

// After (confidence-threshold):
if (confidence >= 0.75)  → masteredNodeIds   (pruned entirely)
if (confidence >= 0.40)  → refresherHoursOverride (est_hours × 0.2)
if (confidence <  0.40)  → full inclusion
if (no confidence entry) → default 0.6 (refresher fallback)
```

---

## 4. Feature Set

### Stage 1 — Conversational Intake
- Free-text goal input: *"I know Python and SQL, want to become a Data Scientist in 6 months"*
- LLM extracts: `target_track`, `known_skills[]`, `time_budget_weeks`
- Supports Gemini 1.5-flash / GPT-4o-mini / deterministic keyword fallback
- 3-second AbortController timeout on all LLM calls

### Stage 2 — Profile Calibration (Onboarding)
- Select learning track: Data Science | Frontend Development | DevOps
- Set time budget: 4–52 weeks slider
- Pre-select claimed known skills (mapped from free-text via fuzzy keyword matching)
- Button dynamically shows skill count: "Confirm & Verify 3 Skills →"

### Stage 2.5 — Diagnostic Confidence Agent *(unique)*
- One skill at a time, progress bar across all claimed skills
- 2–3 micro-questions per skill loaded in parallel from `/api/diagnostic`
- Free-text answers evaluated → confidence score 0–1
- Live result badge: Mastered / Light Refresher / Full Study Needed
- Hours impact shown: "~3h refresher" vs "15h full" vs "0h in roadmap"
- Running summary sidebar updated after each evaluation
- Skip option: defaults all to 0.60 (graceful degradation)
- Fallback question bank of 40 curated questions across all 3 tracks

### Stage 3 — DAG Path Engine
- Track subgraph isolation
- Modified Kahn's Algorithm for topological wave grouping
- Parallel milestone detection (nodes with same wave level → "⚡ Study in Parallel")
- Precedence-Constrained Knapsack optimization for time-budget trimming
- Confidence-threshold pruning applied before knapsack
- `refresher_node_ids[]` tracked in output for UI badge rendering

### Stage 4 — Grounded Explanations
- 1-sentence explanation per recommended node
- Strictly constrained to graph facts: node title, prerequisites, dependents
- Concurrent `Promise.all` execution across all nodes
- 3-second timeout per node — instant template fallback

### Stage 5 — Interactive Roadmap Canvas
- React Flow (`@xyflow/react`) visual DAG graph
- Custom node UI with status colors, bottleneck badges, refresher badges
- Right-click context menu for quick status updates
- Click any node → Node Detail Drawer with resources + AI Tutor
- Zoom, pan, fit-to-screen controls

### Stage 6 — Milestone Cards View
- Toggleable card view alongside canvas view
- Each milestone shows: index, title, parallel flag, total hours
- Per-node: status buttons (Learning / Done / Known / Skip)
- Subtopic checklists with parent-child sync logic
- Grounded explanation shown inline per node
- "Diagnostic Refresher" badge on calibrated nodes
- "Bottleneck" badge on critical-path nodes

### Stage 7 — Analytics Dashboard
- Roadmap progress percentage
- Study hours logged vs. estimated
- Pace status: Ahead / On-Track / Behind
- Current weekly pace vs. required pace
- Projected completion date
- Hours variance indicator
- Multiple roadmap switcher

### Stage 8 — AI Tutor (Node-Scoped)
- Per-node tutor chat scoped to a single skill
- System prompt locked to graph facts (title, difficulty, prerequisites, unlocks)
- Explicit constraint: no quiz generation (tutor explains, diagnostic verifies)
- Gemini → OpenAI → deterministic fallback chain
- 6-second timeout

### Stage 9 — Authentication & Persistence
- Email/password auth (bcrypt hashed)
- Optional Google OAuth
- NextAuth JWT sessions
- Roadmap CRUD API: create, read, update, archive
- Per-node status persistence via `/api/roadmaps/[id]/status`
- File-based JSON storage (`.data/pathfinder_db.json`)

### Stage 10 — Outcome Feedback Engine
- Tracks skip + downstream completion events
- Generates edge reweighting proposals when skipped prerequisites don't hurt downstream success
- Human-reviewable proposals: `make_optional` | `reduce_weight` | `keep_strict`

---

## 5. Working Flow — User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│  STAGE 1 — HOME PAGE (/)                                            │
│  User types: "I know Python & SQL, want Data Science in 6 months"  │
│  → LLM parses → { track: data-science, known: [python,sql], 24w }  │
└────────────────────────────┬────────────────────────────────────────┘
                             │ router.push('/onboarding')
┌────────────────────────────▼────────────────────────────────────────┐
│  STAGE 2 — ONBOARDING (/onboarding)                                 │
│  User reviews: track, weeks slider, checks claimed skill nodes      │
│  User clicks: "Confirm & Verify 5 Skills →"                         │
│  → createAndSelectRoadmap() → bulkSetKnownPrior()                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │ router.push('/diagnostic')
┌────────────────────────────▼────────────────────────────────────────┐
│  STAGE 2.5 — DIAGNOSTIC (/diagnostic)  ← NEW DIFFERENTIATOR        │
│                                                                     │
│  For each claimed skill (e.g. Python):                              │
│  Q1: "What does list(range(3)) return?"  → User: "[0,1,2]"         │
│  Q2: "What is output of bool([])?"       → User: "False"           │
│  → POST /api/diagnostic { action:'evaluate', answers }             │
│  → confidence: 0.85 → tier: MASTERED → 0h in roadmap              │
│                                                                     │
│  For SQL:                                                           │
│  Q1: "Difference between WHERE and HAVING?"  → User: "unsure"      │
│  → confidence: 0.35 → tier: FULL STUDY → 12h in roadmap           │
│                                                                     │
│  User clicks: "Apply & View Roadmap →"                              │
│  → setDiagnosticConfidences({ python:0.85, sql:0.35 })             │
│  → recalculatePath({ knownIds, confidences })                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │ router.push('/path')
┌────────────────────────────▼────────────────────────────────────────┐
│  STAGE 3 — PATH ENGINE (server-side, /api/recommend)               │
│                                                                     │
│  generateLearningPath({                                             │
│    knownNodeIds: ['ds-python-basics', 'ds-sql-basics'],            │
│    diagnosticConfidences: { 'ds-python-basics': 0.85,              │
│                              'ds-sql-basics': 0.35 },              │
│    targetTrack: 'data-science',                                     │
│    timeBudgetWeeks: 24                                              │
│  })                                                                 │
│                                                                     │
│  Result:                                                            │
│  • ds-python-basics → MASTERED (0.85≥0.75) → pruned → known_nodes │
│  • ds-sql-basics    → FULL STUDY (0.35<0.4) → 12h full inclusion  │
│  • Remaining nodes → topological wave sort → parallel milestones   │
│  • Knapsack optimizer trims to 24×10=240h budget if needed         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  STAGE 4 — GROUNDED EXPLANATIONS                                   │
│  generateGroundedExplanations(nodes, rawGoal, edgeMap)             │
│  → Promise.all → Gemini/OpenAI/template → Record<nodeId, string>   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  STAGE 5/6 — PATH VIEW (/path)                                     │
│  • Canvas Graph: React Flow DAG with custom nodes                  │
│  • Milestone Cards: parallel flags, refresher badges, subtopics    │
│  • Bottleneck nodes flagged with ⚡ badge                           │
│  • User marks nodes: Learning → Done → triggers recalculation      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│  STAGE 7 — DASHBOARD (/dashboard)                                  │
│  • Progress %, pace status, hours logged, projected finish date    │
│  • PaceCard: ahead/on-track/behind with variance                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Technical Architecture & Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Next.js 14 App Router)                  │
│                                                                              │
│  / ──► /onboarding ──► /diagnostic ──► /path ──► /dashboard                 │
│                                                                              │
│  PathContext (React Context)                                                 │
│  ├── parsedProfile: UserParsedProfile                                        │
│  ├── pathOutput: PathEngineOutput                                            │
│  ├── diagnosticConfidences: Record<string, number>  ← NEW                   │
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
│  POST /api/diagnostic         ← NEW                                          │
│  ├── action:'questions' → generateDiagnosticQuestions()                      │
│  └── action:'evaluate'  → evaluateDiagnosticAnswers()                        │
│         Both in → src/lib/llm/diagnostic-agent.ts                           │
│                                                                              │
│  POST /api/tutor              → src/app/api/tutor/route.ts                   │
│  GET  /api/roadmaps           → src/lib/db/storage.ts                        │
│  POST /api/roadmaps/[id]/status                                              │
│  GET  /api/mastery                                                           │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────────────────┐
│                            CORE ENGINE (Pure TypeScript — Zero LLM)          │
│                                                                              │
│  path-engine.ts                                                              │
│  ├── Confidence threshold pruning (NEW — diagnostic integration)             │
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
│  1. Try Gemini (gemini-1.5-flash / gemini-3.7-flash) — 3–4s timeout         │
│  2. Try OpenAI (gpt-4o-mini) — 3–4s timeout                                 │
│  3. Deterministic fallback — always available, zero latency                  │
│                                                                              │
│  parser.ts       → JSON extraction from free text                            │
│  explainer.ts    → Fact-constrained 1-sentence explanations                  │
│  diagnostic-agent.ts → Question generation + answer evaluation  ← NEW       │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Algorithms — Deep Dive

### 7.1 Modified Kahn's Algorithm (Topological Wave Grouping)

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

### 7.2 Precedence-Constrained Knapsack (Budget Optimizer)

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

### 7.3 Confidence-Threshold Pruning (Diagnostic Agent Integration)

```typescript
for (const nodeId of knownNodeIds) {
  const confidence = diagnosticConfidences[nodeId] ?? 0.6; // fallback

  if (confidence >= 0.75) {
    masteredNodeIds.add(nodeId);               // fully excluded
  } else if (confidence >= 0.40) {
    refresherHoursOverride.set(nodeId, -1);    // est_hours × 0.2
  }
  // confidence < 0.40 → full inclusion, no action
}

// Applied during candidateNodes construction:
candidateNodes = trackNodes
  .filter(n => !masteredNodeIds.has(n.id) && !excludedNodeIds.has(n.id))
  .map(n => refresherHoursOverride.has(n.id)
    ? { ...n, est_hours: Math.max(1, Math.round(n.est_hours * 0.2)) }
    : n
  );
```

### 7.4 Bottleneck Analysis (DFS + DP)

```
Step 1 — Transitive downstream count (DFS from each node):
  downstreamCount['ds-python-basics'] = 12  ← touches 12 downstream nodes

Step 2 — Longest critical path (DP with memoization):
  longestPath['ds-python-basics'] = 8  ← 8 hops to terminal capstone

Step 3 — Score = downstreamCount × 2 + longestPath
  Top 25% by score → flagged as BOTTLENECK ⚡
```

### 7.5 Pace Calculator

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

## 8. Skill Ontology — The Data Model

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

### Tracks covered:

| Track | Nodes | Key Skills |
|---|---|---|
| **Data Science** | ~18 nodes | Python, SQL, NumPy/Pandas, Stats, ML, Deep Learning, MLOps |
| **Frontend Dev** | ~15 nodes | HTML/CSS, JS, TypeScript, React, Next.js, Testing, Perf |
| **DevOps** | ~15 nodes | Linux, Git, Docker, CI/CD, Kubernetes, Terraform, Cloud |

### Node status types:
`not-started` → `learning` → `done` → `known-prior` → `skipped`

---

## 9. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Framework** | Next.js 14 App Router | SSR, API routes, file-based routing |
| **Language** | TypeScript (strict) | Type safety across engine + UI |
| **UI** | React 18 + Tailwind CSS | Component model + utility CSS |
| **Graph Viz** | @xyflow/react (React Flow) | Production-grade DAG canvas |
| **Graph Layout** | Dagre | Automatic hierarchical positioning |
| **Auth** | NextAuth.js v4 | JWT sessions, credentials + Google |
| **Password** | bcryptjs | Secure password hashing |
| **AI — Primary** | Google Gemini (gemini-1.5-flash) | Fast, low-cost JSON generation |
| **AI — Secondary** | OpenAI GPT-4o-mini | Fallback for parsing + evaluation |
| **AI — Fallback** | Deterministic heuristics | Always-available, zero-latency |
| **Testing** | Vitest | Fast unit tests for pure functions |
| **Storage** | File-based JSON (`.data/`) | Zero-dependency persistence |
| **Icons** | Lucide React | Consistent icon system |
| **Design** | Warm Editorial palette | `#F7F1E7` ivory + `#C96F4A` terracotta |

---

## 10. Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Stage 1 — Intake form
│   ├── onboarding/page.tsx         # Stage 2 — Profile calibration
│   ├── diagnostic/page.tsx         # Stage 2.5 — Diagnostic Agent UI ← NEW
│   ├── path/page.tsx               # Stage 5/6 — Canvas + milestone cards
│   ├── dashboard/page.tsx          # Stage 7 — Analytics
│   └── api/
│       ├── recommend/route.ts      # Full path generation pipeline
│       ├── diagnostic/route.ts     # Question gen + answer evaluation ← NEW
│       ├── tutor/route.ts          # Node-scoped AI tutor
│       ├── roadmaps/[id]/status    # Node status persistence
│       └── auth/                   # NextAuth handlers
├── lib/
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
│       └── diagnostic-agent.ts     # Micro-quiz generation + evaluation ← NEW
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
    └── roadmap.ts                  # Roadmap, NodeStatus, PaceAnalysis types
```

---

## 11. Impact & Differentiators

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

### Why this architecture is defensible

1. **Correctness guarantee** — The DAG is code. It cannot hallucinate an edge or invent a prerequisite. The LLM only touches natural language, where correctness is less critical.

2. **Reliability** — The system works identically with or without an API key. Every LLM call has a deterministic fallback. No user ever sees a broken state.

3. **Accuracy on skill assessment** — Short-answer diagnostic is the only format that produces a meaningful confidence signal. MCQ has 25% random success; short-answer requires genuine recall.

4. **Composability** — Each stage (parse → profile → diagnose → plan → explain) is independently testable, replaceable, and improvable.

---

## 12. Test Coverage

37 tests passing across 7 test files.

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

### Diagnostic confidence test cases (path-engine.test.ts):

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

## 13. Local Setup

```bash
# 1. Clone
git clone https://github.com/AmanPathan24/PathFinder-AI.git
cd PathFinder-AI

# 2. Install
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — see section 14

# 4. Run tests (optional)
npm test

# 5. Start dev server
npm run dev
```

Open http://localhost:3000

**The app works completely without any API keys.** Every LLM feature degrades gracefully to a deterministic fallback. Add keys for richer AI parsing and evaluation.

---

## 14. Environment Variables

```env
# Google Gemini (primary LLM — recommended)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash

# OpenAI (secondary fallback — optional)
OPENAI_API_KEY=your_openai_api_key_here

# NextAuth (required for auth — has a built-in default for local dev)
NEXTAUTH_SECRET=any-random-string-for-local-dev

# Google OAuth (optional — credentials login works without it)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase (optional — not required, file-based storage is default)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Acknowledgements

Built with Next.js, React Flow, Tailwind CSS, Vitest, NextAuth, and the Google Gemini API.

Skill ontology data curated from roadmap.sh reference materials.

---

*PathFinder AI — The learning roadmap that knows what you actually know.*
