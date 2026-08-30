# PathFinder — In-Depth Feature Specification & Implementation Architecture

**PathFinder** is an AI-powered personalized learning path recommender designed to eliminate LLM hallucinations in education by enforcing a strict separation between **deterministic graph algorithms** (for recommendation logic and dependency resolution) and **large language models** (for natural language parsing and grounded explanations).

---

## 📖 Executive Summary & Core Problem

### The Problem with Traditional AI Roadmaps
Most AI roadmap tools query a Large Language Model with a prompt like *"Generate a 6-month roadmap for Data Science as JSON"*. This approach suffers from critical flaws:
- **Hallucinations & Inconsistent Prerequisite Graphs**: LLMs frequently invent non-existent course titles or misorder fundamental dependencies (e.g. recommending PyTorch before basic Python syntax).
- **Brittle Feedback Loops**: Adjusting a single node (e.g., "I already know SQL") requires sending the entire context back to the LLM, leading to completely restructured, unpredictable paths.
- **Ignore Time Budgets**: LLMs struggle with accurate mathematical estimation of total study hours and weekly budget constraints.

### The PathFinder Solution
PathFinder solves this by using a verified **Directed Acyclic Graph (DAG)** of skill nodes and prerequisite edges as the single source of truth.
1. The **LLM** acts solely as an interface translator (parsing free-text input and generating single-sentence explanations).
2. The **Graph Engine** computes topological dependency ordering, parallel study milestones, and time budget trimming purely through code algorithmically.

---

## 🏗️ System Architecture & 6-Stage Pipeline

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                   USER INTERFACE                                  │
│   / (Intake) ──► /onboarding (Calibrate) ──► /path (Roadmap & Skill Tree)        │
│                                                └──► /dashboard (Analytics & Log)  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────▼─────────────────────────────────────────┐
│                               Next.js API Routes                                  │
│   POST /api/recommend (App Router, Force-Dynamic Execution)                       │
└──────────────┬──────────────────────────┬─────────────────────────┬───────────────┘
               │                          │                         │
┌──────────────▼─────────────┐ ┌──────────▼──────────────┐ ┌────────▼──────────────┐
│ Stage 1: Intake Parser     │ │ Stage 2: Skill Profiler│ │ Stage 3: Path Engine │
│ Extracts Structured Intent │ │ Embedding Cosine Match │ │ Pure DAG Algorithm   │
│ (Gemini 3.7 / GPT-4o-mini) │ │ & Fuzzy Term Resolution│ │ (Topological Waves)  │
└────────────────────────────┘ └────────────────────────┘ └────────┬───────────────┘
                                                                    │
┌───────────────────────────────────────────────────────────────────▼───────────────┐
│ Stage 4: Grounded Explanations Layer (Concurrent Promise.all + 3s Timeouts)      │
└───────────────────────────────────────────────────────────────────┬───────────────┘
                                                                    │
┌───────────────────────────────────────────────────────────────────▼───────────────┐
│ Stage 5 & 6: Interactive Feedback Engine & Visual Skill Tree DAG Renderer         │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 In-Depth Stage-by-Stage Implementation

### Stage 1: Conversational Intake Parser (`src/lib/llm/parser.ts`)
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
  - Primary: Calls Google Gemini (`gemini-3.7-flash` / `gemini-1.5-flash`) or OpenAI `gpt-4o-mini` with strict JSON mode.
  - Fallback: Includes a deterministic keyword heuristic parser with regex pattern matching so the system operates seamlessly even when offline or without API keys.
  - Timeout Protection: Wrapped with an `AbortController` (3-second limit) to prevent API stalls.

### Stage 2: Vector Skill Profiler (`src/lib/engine/skill-profiler.ts`)
- **Objective**: Resolve fuzzy user skill terms (e.g., "pandas library", "py", "sql queries") to canonical node IDs in the skill ontology.
- **Matching Algorithm**:
  1. **Cosine Similarity**: Vector dot product normalized by vector norms across 1536-dimensional embeddings.
  2. **Weighted Keyword Scoring**: Substring & exact token overlap matching against `node.title`, `node.keywords`, and `node.description`.
- **Output**: Array of canonical node IDs already mastered by the user (e.g. `["ds-python-basics", "ds-sql-basics"]`).

### Stage 3: Pure DAG Path Engine Algorithm (`src/lib/engine/path-engine.ts`)
The core recommendation logic is written in pure TypeScript with zero external LLM dependencies:

1. **Track Subgraph Filtering**: Isolates the requested career track (`data-science`, `frontend`, or `devops`).
2. **Prerequisite Reachability Analysis**: Identifies all nodes upstream of target terminal/capstone nodes.
3. **Satisfied Prerequisite Pruning**: Removes nodes the user already knows (plus upstream nodes that only serve as prerequisites for completed skills).
4. **Modified Topological Wave Sorting**:
   - Calculates in-degrees (number of unmet prerequisites in the remaining set).
   - Iteratively groups all nodes with `in-degree == 0` into discrete **Milestones**.
   - Nodes within the same wave have no dependency on each other and are flagged with `is_parallel = true` (**"⚡ Study in Parallel"**).
5. **Time-Budget Constraint Trimming**:
   - Sums total estimated hours across all milestones.
   - If `total_est_hours > (time_budget_weeks * weekly_hours)`, lower-priority optional nodes are trimmed while preserving core critical path dependencies.
   - Sets `is_trimmed = true` and surfaces trimmed nodes transparently to the user.

### Stage 4: Grounded Explanation Layer (`src/lib/llm/explainer.ts`)
- **Objective**: Generate human-readable single-sentence explanations for why each recommended topic is included.
- **Fact-Constrained Grounding**: Prompts are strictly populated with graph facts (node title, description, upstream prerequisites, and downstream dependents). The LLM is explicitly instructed: *"Do NOT invent facts outside these graph facts."*
- **Concurrent Performance Optimization**:
  - Executes API calls concurrently using `Promise.all` across all recommended nodes.
  - Each call is guarded by an `AbortSignal` with a **3-second hard timeout**.
  - On timeout or network failure, it instantly falls back to a deterministic, graph-fact template generator—ensuring API response times under 1.5 seconds.

### Stage 5: Interactive Feedback Loop (`src/context/PathContext.tsx`)
- **Objective**: Enable instant path recalculation when the user interacts with the roadmap.
- **Node State Controls**:
  - **"Mark Done"**: Adds node to `completedNodeIds`, re-runs Stage 3, and updates downstream prerequisites instantly.
  - **"Skip"**: Adds node to `excludedNodeIds`, recalculating alternative paths without a full page refresh.
- **Persistence**: All state transitions synchronize automatically to `localStorage`.

### Stage 6 & 7: Visual Skill Tree & Analytics Dashboard (`src/components/SkillTreeVisualizer.tsx`)
- **Visual Skill Tree DAG**:
  - Renders the ontology graph as layered milestone levels with prerequisite connectors.
  - State Indicators: Mastered (Sage Green `#8C9A76`), Active Milestone (Terracotta `#C96F4A` with pulse animation), Locked/Skipped (Soft Ivory `#F7F1E7`).
- **Dashboard Analytics (`/dashboard`)**:
  - Path Completion percentage bar.
  - Total hours logged vs. estimated duration.
  - Study hour logging form per topic.
  - Next recommended action indicator.

---

## 🎨 Design System — "Warm Editorial Tech"

PathFinder breaks away from generic dark-mode AI templates by adopting a **"Warm Editorial Tech"** visual design language inspired by modern print publishing and warm natural aesthetics.

| Design Token | Color Code | Purpose / Application |
| :--- | :--- | :--- |
| **Background Ivory** | `#F7F1E7` | Primary canvas & page background |
| **Soft Cream** | `#FFF9F0` | Card containers & paper surfaces |
| **Deep Warm Brown** | `#4A3728` | Headings, serif titles & primary text |
| **Natural Wood** | `#B58B65` | Borders, subtle dividers & icon accents |
| **Terracotta** | `#C96F4A` | Primary CTA buttons, active highlights & focus rings |
| **Muted Sage** | `#8C9A76` | Mastered skill badges, checkmarks & progress bars |

### Typography
- **Headings & Serif Display**: *Instrument Serif* (Google Fonts) for editorial title hierarchy.
- **Body & Controls**: *Plus Jakarta Sans* for UI elements, labels, and form fields.

---

## 🧪 Unit Testing & Verification

PathFinder includes a dedicated unit test suite in `src/lib/engine/__tests__/path-engine.test.ts` powered by **Vitest**:

1. **Topological Order Verification**: Validates that fundamental prerequisite nodes (e.g. `ds-python-basics`) precede dependent courses (`ds-numpy-pandas`).
2. **Known Skill Pruning**: Confirms that stating known skills skips those nodes and outputs downstream prerequisites.
3. **Parallel Wave Grouping**: Verifies that independent topics (e.g. Pandas & Math/Stats) are correctly grouped into parallel study milestones.
4. **Time Budget Trimming**: Tests that constraining time budget (e.g. 4 weeks @ 10h/week = 40h) correctly sets `is_trimmed = true` and trims total hours below budget.
5. **Feedback Loop Exclusions**: Confirms that adding excluded nodes removes them from the generated path.

- **Test Suite Results**: `5 passed (100% pass rate)`
- **Next.js Production Build**: `✓ Generating static pages (7/7)` with zero TypeScript errors.

---

## 🛠️ Repository & Local Setup

### Installation
```bash
git clone https://github.com/AmanPathan24/PathFinder-AI.git
cd PathFinder-AI
npm install
```

### Environment Configuration (`.env.local`)
```env
# Gemini API Key for live AI intake & explanations
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.7-flash

# Optional: OpenAI API Key alternative
# OPENAI_API_KEY=your_openai_api_key_here
```

### Run Tests & Start Server
```bash
# Run DAG path engine unit tests
npm test

# Start Next.js development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
