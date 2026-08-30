# PathFinder AI

PathFinder AI is a personalized learning roadmap app that turns a learner’s goal into a structured path across skill nodes, milestones, and subtopics. It combines a deterministic roadmap engine with a visual canvas, progress tracking, study logging, and a node-scoped AI tutor.

This version of the app includes the full product flow: onboarding, roadmap generation, dashboard analytics, status tracking, and interactive visual exploration.

---

## What is included right now

### 1. Goal intake and profile setup
- Free-text goal capture on the landing flow
- Track selection for:
  - Data Science
  - Frontend Development
  - DevOps
- Time budget configuration in weeks
- Known-skill selection to mark existing competencies as known prior
- Roadmap creation and persistence per user

### 2. Personalized roadmap generation
- Deterministic DAG-based recommendation logic based on the ontology graph
- Skill dependency resolution and prerequisite-aware ordering
- Milestone grouping for parallel study waves
- Budget-aware trimming when the selected path exceeds the user’s time limit
- Roadmap generation stored and reloaded from the app state and backend status endpoints

### 3. Visual roadmap canvas
- Interactive React Flow roadmap graph
- Node-level status styling for:
  - not started
  - learning
  - done
  - skipped
  - known prior
- Zoom controls and viewport fit-to-screen behavior
- Mouse wheel zoom and two-finger scroll pan behavior
- Click-to-open details and tutor drawer for each node
- Right-click quick status menu for fast updates
- Canvas transitions and subtle loading/reveal animation

### 4. Milestone cards and subtopic tracking
- Milestone-by-milestone breakdown in card view
- Subtopic checklists under each parent topic
- Checkbox toggling for subtopics
- Parent-child sync logic so completing all subtopics marks the parent as done
- Parent completion also propagates to child entries when appropriate
- Status updates remain visible without removing nodes from the graph

### 5. Dashboard and progress analytics
- Topic completion progress
- Subtopic completion progress
- Study hour logging by node
- Pace calculations and learning velocity indicators
- Progress summaries for active roadmap performance
- Roadmap navigation between dashboard, path view, and onboarding

### 6. AI tutor and explanations
- Node-scoped tutor panel for conceptual questions
- Context-aware tutor prompt built around the selected node
- Grounded explanations generated from roadmap facts and ontology metadata
- Fallback behavior when live AI access is unavailable

### 7. Authentication and user workflow
- Email/password sign-in
- Optional Google sign-in when configured
- User-specific roadmaps and progress states
- saved/active roadmap selection
- status persistence through roadmap status API endpoints

---

## Product flow

1. User enters a learning goal and creates an onboarding profile.
2. The app identifies the target track, time budget, and known skills.
3. The path engine builds a dependency-aware roadmap.
4. User can switch between:
   - canvas view
   - milestone card view
5. User marks topics/subtopics as learning, done, known prior, or skipped.
6. The dashboard recalculates progress and pace in real time.
7. The AI tutor answers questions about the active topic or milestone.

---

## Tech stack

- Next.js 14 App Router
- TypeScript
- React 18
- Tailwind CSS
- @xyflow/react for the roadmap canvas
- Dagre for graph layout
- NextAuth for authentication
- Vitest for regression tests
- Local roadmap and status persistence through project API routes and storage layer

---

## Folder overview

- src/app/
  - onboarding flow
  - dashboard
  - roadmap/path canvas view
  - auth pages and API routes
- src/components/
  - roadmap canvas
  - custom node UI
  - tutor drawer and floating tutor bar
  - dashboard cards
- src/context/
  - roadmap and node status state management
- src/lib/
  - recommendation engine
  - progress and pacing logic
  - graph layout logic
  - storage and backend support
- src/data/
  - ontology and subtopic catalog

---

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a .env.local file in the project root with the required values for authentication and AI access.

Example:

```bash
NEXTAUTH_SECRET=your-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

If Google auth is not configured, the app still runs with credentials-based login.

### 3. Run the app

```bash
npm run dev
```

Open http://localhost:3000

### 4. Run tests

```bash
npm test
```

---

## Current key user capabilities

- Personalized roadmap generation for multiple learning tracks
- Real-time topic and subtopic status tracking
- Canvas graph exploration with zoom, pan, and node interactions
- Right-click status updates on nodes
- Milestone and subtopic completion sync
- Dashboard analytics and study hours tracking
- AI tutor access per node
- Persistent roadmap + status workflow across sessions

---

## Notes

This project intentionally keeps the roadmap logic deterministic while using AI for language parsing and tutoring support. The graph rules, dependency ordering, milestone grouping, and budget-fit calculations are built from the ontology and path engine rather than being left entirely to model generation.
