/**
 * Diagnostic Confidence Agent
 *
 * For each claimed skill node, generates 2–3 targeted "gotcha" micro-questions
 * (questions only someone who actually knows the topic would get right), evaluates
 * the learner's answers, and outputs a confidence score 0–1 per node.
 *
 * Confidence thresholds (consumed by path-engine.ts):
 *   >= 0.75  → node is pruned as mastered (fully skip in roadmap)
 *   0.4–0.75 → node kept as lightweight refresher (est_hours × 0.2)
 *   < 0.4    → node included in full
 *
 * Graceful degradation: if no API key or call times out, defaults to 0.6
 * ("probably knows it, keep a light refresher") — exactly like Stage 1/4 fallbacks.
 */

import { OntologyNode } from '@/types/ontology';

export interface DiagnosticQuestion {
  id: string;         // unique within the question set, e.g. "q0"
  question: string;
  hint?: string;      // optional very short hint shown after submission
}

export interface DiagnosticQuestionSet {
  nodeId: string;
  nodeTitle: string;
  questions: DiagnosticQuestion[];
}

export interface DiagnosticAnswer {
  questionId: string;
  answer: string;
}

export interface DiagnosticResult {
  nodeId: string;
  confidence: number; // 0–1
  rationale: string;  // brief explanation for the UI
}

// Default fallback confidence when API is unavailable
export const FALLBACK_CONFIDENCE = 0.6;

// ----- Deterministic question bank (fallback when no LLM) -----
// Keyed on node id prefix patterns, providing short "gotcha" questions
const FALLBACK_QUESTIONS: Record<string, DiagnosticQuestion[]> = {
  // ── DATA SCIENCE ───────────────────────────────────────────────────────────
  'ds-python-basics': [
    { id: 'q0', question: 'What does `list(range(3))` return in Python?', hint: '[0, 1, 2]' },
    { id: 'q1', question: 'What is the output of `bool([])` in Python?', hint: 'False — empty containers are falsy' },
    { id: 'q2', question: 'How do you define a default argument value in a Python function?', hint: 'def f(x=10):' },
  ],
  'ds-sql-basics': [
    { id: 'q0', question: 'What SQL keyword removes duplicate rows from a SELECT result?', hint: 'DISTINCT' },
    { id: 'q1', question: 'Which JOIN type returns all rows from the left table even if there is no match on the right?', hint: 'LEFT JOIN / LEFT OUTER JOIN' },
    { id: 'q2', question: 'What is the difference between WHERE and HAVING in SQL?', hint: 'WHERE filters rows, HAVING filters groups after GROUP BY' },
  ],
  'ds-numpy-pandas': [
    { id: 'q0', question: 'How do you select rows in a pandas DataFrame where column "age" is greater than 30?', hint: 'df[df["age"] > 30]' },
    { id: 'q1', question: 'What does `np.zeros((3,3))` produce?', hint: 'A 3×3 array filled with 0.0' },
  ],
  'ds-math-stats': [
    { id: 'q0', question: 'What does a standard deviation of 0 tell you about a dataset?', hint: 'All values are identical' },
    { id: 'q1', question: 'If P(A) = 0.4 and P(B|A) = 0.5, what is P(A ∩ B)?', hint: '0.2' },
  ],
  // ── FRONTEND ───────────────────────────────────────────────────────────────
  'fe-html-css': [
    { id: 'q0', question: 'What CSS property makes a flex container wrap its children onto new lines?', hint: 'flex-wrap: wrap' },
    { id: 'q1', question: 'What is the difference between `display: none` and `visibility: hidden`?', hint: 'none removes layout space; hidden hides but retains space' },
    { id: 'q2', question: 'What HTML attribute is required for all <img> tags for accessibility?', hint: 'alt' },
  ],
  'fe-js-basics': [
    { id: 'q0', question: 'What does `typeof null` return in JavaScript?', hint: '"object" — a well-known JS quirk' },
    { id: 'q1', question: 'What is the difference between `==` and `===` in JavaScript?', hint: '== coerces types; === is strict equality' },
    { id: 'q2', question: 'What does `Array.prototype.map` return?', hint: 'A new array of the same length' },
  ],
  'fe-typescript': [
    { id: 'q0', question: 'What is the difference between `interface` and `type` in TypeScript?', hint: 'interfaces are extendable via declaration merging; types cannot be reopened' },
    { id: 'q1', question: 'What does the `?` operator do when placed after a property name in a TypeScript interface?', hint: 'Makes the property optional' },
  ],
  'fe-react-basics': [
    { id: 'q0', question: 'What hook lets you run a side effect after every render?', hint: 'useEffect with no dependency array' },
    { id: 'q1', question: 'What is the key rule of React hooks regarding conditional calls?', hint: 'Never call hooks inside loops, conditions, or nested functions' },
    { id: 'q2', question: 'What does the second argument to useState() do?', hint: 'Nothing — useState only accepts the initial state value' },
  ],
  // ── DEVOPS ─────────────────────────────────────────────────────────────────
  'do-linux-basics': [
    { id: 'q0', question: 'What Linux command shows disk usage of the current directory?', hint: 'du -sh .' },
    { id: 'q1', question: 'What does `chmod 755 file.sh` set for the file permissions?', hint: 'owner: rwx, group: r-x, others: r-x' },
  ],
  'do-git-basics': [
    { id: 'q0', question: 'What git command stages all changed files for a commit?', hint: 'git add .' },
    { id: 'q1', question: 'What is the difference between `git merge` and `git rebase`?', hint: 'merge creates a merge commit; rebase replays commits on top of another branch' },
  ],
  'do-docker-basics': [
    { id: 'q0', question: 'What is the difference between a Docker image and a Docker container?', hint: 'image is the blueprint; container is a running instance' },
    { id: 'q1', question: 'Which Dockerfile instruction sets the working directory for subsequent instructions?', hint: 'WORKDIR' },
    { id: 'q2', question: 'What does `docker run -p 8080:80 nginx` do?', hint: 'Maps host port 8080 to container port 80' },
  ],
};

/**
 * Returns 2–3 deterministic micro-questions for a given node.
 * Falls back to a generic set if the node id has no specific entry.
 */
function getFallbackQuestions(node: OntologyNode): DiagnosticQuestion[] {
  if (FALLBACK_QUESTIONS[node.id]) {
    return FALLBACK_QUESTIONS[node.id].slice(0, 3);
  }

  // Generic fallback using node metadata
  return [
    {
      id: 'q0',
      question: `What is the primary purpose of "${node.title}" in the context of ${node.track}?`,
      hint: node.description.slice(0, 80),
    },
    {
      id: 'q1',
      question: `Name one real-world situation where you would apply "${node.title}".`,
      hint: `Related concepts: ${node.keywords.slice(0, 3).join(', ')}`,
    },
  ];
}

/**
 * Uses LLM to generate 2–3 targeted micro-questions for a skill node.
 * Falls back to FALLBACK_QUESTIONS if the LLM is unavailable.
 */
export async function generateDiagnosticQuestions(
  node: OntologyNode
): Promise<DiagnosticQuestionSet> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const prompt = `You are creating a skill diagnostic for an educational platform.
Generate exactly 2 targeted "gotcha" micro-questions for the skill: "${node.title}".
These are short questions that ONLY someone who genuinely knows this topic can answer correctly.
NOT multiple choice — just short answer or fill-in-the-blank.
The skill context: ${node.description}. Keywords: ${node.keywords.join(', ')}.

Return ONLY a valid JSON array (no markdown):
[
  { "id": "q0", "question": "...", "hint": "brief answer hint" },
  { "id": "q1", "question": "...", "hint": "brief answer hint" }
]`;

  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.4,
              maxOutputTokens: 300,
            },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return { nodeId: node.id, nodeTitle: node.title, questions: parsed.slice(0, 3) };
          }
        }
      }
    } catch {
      // timeout or parse error — fall through
    }
  }

  if (openAiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 300,
          response_format: { type: 'json_object' },
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          // GPT json_object wraps in an object; handle both shapes
          const parsed = JSON.parse(content);
          const questions = Array.isArray(parsed) ? parsed : parsed.questions || parsed.items;
          if (Array.isArray(questions) && questions.length > 0) {
            return { nodeId: node.id, nodeTitle: node.title, questions: questions.slice(0, 3) };
          }
        }
      }
    } catch {
      // timeout or parse error — fall through
    }
  }

  return { nodeId: node.id, nodeTitle: node.title, questions: getFallbackQuestions(node) };
}

/**
 * Evaluates answers against the questions and returns a 0–1 confidence score.
 * Uses LLM for nuanced scoring; falls back to keyword-match heuristic.
 */
export async function evaluateDiagnosticAnswers(
  node: OntologyNode,
  questions: DiagnosticQuestion[],
  answers: DiagnosticAnswer[]
): Promise<DiagnosticResult> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  // Build a Q&A pair list for the prompt
  const qaPairs = questions.map((q) => {
    const answer = answers.find((a) => a.questionId === q.id)?.answer || '(no answer)';
    return `Q: ${q.question}\nExpected hint: ${q.hint || 'N/A'}\nLearner answer: ${answer}`;
  });

  const evalPrompt = `You are evaluating a learner's knowledge of "${node.title}".
Score the following answers with a confidence score from 0.0 to 1.0 based on correctness.
0.0 = completely wrong or blank, 1.0 = perfectly correct.

${qaPairs.join('\n\n')}

Return ONLY a valid JSON object (no markdown):
{ "confidence": <number 0.0–1.0>, "rationale": "<one short sentence>" }`;

  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: evalPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
              maxOutputTokens: 120,
            },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          if (typeof parsed.confidence === 'number') {
            return {
              nodeId: node.id,
              confidence: Math.min(1, Math.max(0, parsed.confidence)),
              rationale: parsed.rationale || '',
            };
          }
        }
      }
    } catch {
      // fall through
    }
  }

  if (openAiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: evalPrompt }],
          temperature: 0.1,
          max_tokens: 120,
          response_format: { type: 'json_object' },
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (typeof parsed.confidence === 'number') {
            return {
              nodeId: node.id,
              confidence: Math.min(1, Math.max(0, parsed.confidence)),
              rationale: parsed.rationale || '',
            };
          }
        }
      }
    } catch {
      // fall through
    }
  }

  // ── Deterministic keyword-match fallback ──────────────────────────────────
  // Score each answer against the hint and node keywords
  let totalScore = 0;
  let scoredCount = 0;

  for (const q of questions) {
    const ans = answers.find((a) => a.questionId === q.id)?.answer?.toLowerCase().trim() || '';
    if (!ans || ans === '(no answer)') {
      scoredCount++;
      continue; // 0 for this question
    }

    const hintTokens = (q.hint || '')
      .toLowerCase()
      .split(/[\s,;:.]+/)
      .filter((t) => t.length > 2);
    const nodeKeyTokens = node.keywords
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const allTokens = [...new Set([...hintTokens, ...nodeKeyTokens])];
    const matchCount = allTokens.filter((token) => ans.includes(token)).length;
    const qScore = allTokens.length > 0 ? Math.min(1, matchCount / Math.max(1, allTokens.length * 0.4)) : 0;
    totalScore += qScore;
    scoredCount++;
  }

  const confidence = scoredCount > 0 ? totalScore / scoredCount : FALLBACK_CONFIDENCE;

  return {
    nodeId: node.id,
    confidence: Math.min(1, Math.max(0, confidence)),
    rationale: confidence >= 0.75
      ? 'Answers demonstrate solid mastery.'
      : confidence >= 0.4
      ? 'Answers show partial understanding — a refresher is recommended.'
      : 'Answers suggest this topic needs full study.',
  };
}

/**
 * Convenience function: runs the full diagnostic for a single node
 * given pre-generated questions and user answers.
 */
export async function runNodeDiagnostic(
  node: OntologyNode,
  questions: DiagnosticQuestion[],
  answers: DiagnosticAnswer[]
): Promise<DiagnosticResult> {
  return evaluateDiagnosticAnswers(node, questions, answers);
}

/**
 * Maps confidence score to human-readable tier label.
 */
export function confidenceTier(score: number): 'mastered' | 'refresher' | 'full-study' {
  if (score >= 0.75) return 'mastered';
  if (score >= 0.4) return 'refresher';
  return 'full-study';
}
