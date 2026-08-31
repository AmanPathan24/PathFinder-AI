# PathFinder AI

**Personalized learning paths that verify what you know before planning what you need to learn.**

[![Live Repo](https://img.shields.io/badge/repo-GitHub-181717?logo=github)](https://github.com/AmanPathan24/PathFinder-AI)

Most learning-path tools take your self-reported skills at face value and let an LLM freehand the roadmap — which means unverified claims and hallucinated prerequisites. PathFinder does neither: a **Diagnostic Confidence Agent** scores what you actually know (0–1, via short-answer micro-quizzes), and a deterministic **DAG path engine** — not the LLM — handles ordering, parallelism, and time-budget optimization. The LLM only parses language and explains results; it never plans the path.

📖 **Full architecture, algorithms, data model, and test coverage:** [`description.md`](./description.md)

**Deployed Link To The Website:** [`pathfinder.com`](https://pathfinder-ai-thyc.onrender.com)

---

## Why it's different

| | Generic AI planners | PathFinder |
|---|---|---|
| Skill verification | Self-reported, binary | Diagnostic confidence score (0–1) |
| Path ordering | LLM-generated, can hallucinate | Deterministic topological sort |
| Partial knowledge | Skip or include | Mastered / Refresher / Full Study |
| Time budget | Ignored | Precedence-constrained knapsack |
| No API key | Breaks | Full deterministic fallback |

## How it works

```
Free-text goal → Onboarding → Diagnostic Confidence Agent → DAG Path Engine
                                                                    ↓
                        Dashboard  ←  Milestone Cards + Canvas  ←  Grounded Explanations
```

1. **Intake** — describe your goal in plain English; the LLM extracts track, known skills, and timeframe
2. **Diagnostic Confidence Agent** — 2–3 short-answer questions per claimed skill produce a real confidence score, not a checkbox
3. **Path Engine** — a pure-algorithm core (topological wave sort + knapsack budget optimizer + bottleneck analysis) builds the roadmap; the graph is the source of truth
4. **Roadmap UI** — interactive DAG canvas and milestone cards, with pace tracking and progress analytics

Details on every stage, the confidence-tier math, and the algorithms (Kahn's, knapsack, bottleneck DFS/DP, pace calculator) are in [`description.md`](./description.md).

## Tech stack

Next.js 14 · TypeScript · React 18 + Tailwind · React Flow · NextAuth · Google Gemini / OpenAI with deterministic fallback · Vitest

Full stack rationale and version details: [`description.md`](./description.md#9-tech-stack).

## Quick start

```bash
git clone https://github.com/AmanPathan24/PathFinder-AI.git
cd PathFinder-AI
npm install
cp .env.example .env.local   # optional — app works fully without API keys
npm run dev
```

Open `http://localhost:3000`. Every AI feature degrades gracefully to a deterministic fallback, so the app runs identically with or without an API key.

## Test coverage

37 tests across 7 files covering the path engine, diagnostic confidence tiers, knapsack optimizer, bottleneck analysis, pace calculator, and canvas layout. See [`DESCRIPTION.md`](./DESCRIPTION.md#12-test-coverage) for the breakdown.

---

*PathFinder AI — the learning roadmap that knows what you actually know.*