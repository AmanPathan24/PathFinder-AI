# PathFinder — AI-Powered Personalized Learning Path Recommender

PathFinder is a web application that takes a learner's goal and background in plain English, figures out their current skill level, and generates a **structured, explainable learning roadmap** using a deterministic **Directed Acyclic Graph (DAG) algorithm** for the recommendation logic.

> 💡 **Core Design Distinction**: The LLM is used **ONLY** for language processing (parsing free-text input and generating grounded single-sentence explanations). All skill dependencies, prerequisite ordering, milestone grouping, and time-budget optimizations are computed deterministically via graph algorithms.

---

## 🚀 Key Features

1. **Conversational Intake (Stage 1)**: Parses free-text learning goals into structured intent (target track, known skills, time budget).
2. **Vector Skill Profiler (Stage 2)**: Matches user input terms to canonical skill nodes in the ontology using embedding cosine-similarity and fuzzy keyword mapping.
3. **Pure DAG Path Engine (Stage 3)**:
   - Filters target track subgraphs.
   - Computes reachable prerequisite trees.
   - Performs topological sorting weighted by difficulty and estimated hours.
   - Groups independent prerequisite topics into **Parallel Milestones** ("⚡ Study in Parallel").
   - Trims path cleanly to fit within the user's weekly time budget.
4. **Grounded Explanation Layer (Stage 4)**: Generates 1-sentence explanations strictly constrained to supplied graph facts—preventing LLM hallucinations.
5. **Interactive Feedback Loop (Stage 5)**: Real-time path adaptation when marking nodes as "Done" or "Skip".
6. **Visual Skill Tree & Analytics Dashboard (Stage 6 & 7)**: Interactive DAG visualization, progress bars, and study hour logging.

---

## 🛠️ Architecture & Core Pipeline

```
  ┌──────────────────┐
  │ Free-Text Input  │ "I know Python & SQL, want Data Science in 6 months"
  └────────┬─────────┘
           │ Stage 1 (LLM Intake Parser)
  ┌────────▼─────────┐
  │ Structured Intent│ { track: "data-science", known: ["python", "sql"], budget: 24w }
  └────────┬─────────┘
           │ Stage 2 (Vector Skill Profiler)
  ┌────────▼─────────┐
  │ Known Node IDs   │ ["ds-python-basics", "ds-sql-basics"]
  └────────┬─────────┘
           │ Stage 3 (Pure DAG Path Engine Algorithm)
  ┌────────▼─────────┐
  │ Ordered Roadmap  │ Topologically sorted, parallel milestones, budget-trimmed
  └────────┬─────────┘
           │ Stage 4 (Grounded Explanations)
  ┌────────▼─────────┐
  │ Grounded Output  │ Single-sentence rationale per node based strictly on graph facts
  └──────────────────┘
```

---

## 🗂️ Data Model (Skill Ontology)

Stored in `src/data/ontology.json` spanning 3 complete tracks (**Data Science**, **Frontend Development**, **DevOps**):

```ts
interface OntologyNode {
  id: string;
  title: string;
  type: 'skill' | 'course' | 'project' | 'assessment';
  track: 'data-science' | 'frontend' | 'devops';
  difficulty: number; // 1 to 5
  est_hours: number;
  description: string;
  keywords: string[];
}

interface OntologyEdge {
  from_id: string; // Prerequisite
  to_id: string;   // Dependent
  weight?: number;
}
```

---

## 🏃 Getting Started (Local Setup)

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/AmanPathan24/PathFinder-AI.git
cd PathFinder-AI
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
*(Optional: Add `OPENAI_API_KEY` for live GPT-4o-mini intake parsing & explanations. If omitted, PathFinder automatically runs with its built-in deterministic heuristic engine).*

### 3. Run Unit Tests for Path Engine
```bash
npm test
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 Deliverables & Submission Checklist

- [x] **Source Code**: Next.js 14 App Router + TypeScript + Tailwind CSS
- [x] **GitHub Repo**: [https://github.com/AmanPathan24/PathFinder-AI.git](https://github.com/AmanPathan24/PathFinder-AI.git)
- [x] **Unit Tests**: Pure functional unit test suite for DAG topological sorting, parallel grouping, and budget trimming
- [x] **Grounded Explanations**: Fact-constrained LLM explanations layer
- [x] **Interactive Skill Tree**: Dynamic visual DAG rendering with completed/active/locked status indicators
