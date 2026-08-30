import { OntologyNode } from '@/types/ontology';

export interface GroundedExplanationParams {
  node: OntologyNode;
  dependentNodeTitles: string[];
  prerequisiteNodeTitles: string[];
  rawGoal: string;
}

/**
 * Fallback template-based explanation generator grounded strictly in graph facts.
 */
function generateTemplateExplanation(params: GroundedExplanationParams): string {
  const { node, dependentNodeTitles, prerequisiteNodeTitles } = params;

  if (dependentNodeTitles.length > 0) {
    return `Mastering ${node.title} is essential because it builds directly into ${dependentNodeTitles.join(', ')} on your learning journey.`;
  }
  if (prerequisiteNodeTitles.length > 0) {
    return `${node.title} integrates your foundation in ${prerequisiteNodeTitles.join(', ')} to advance your overall track proficiency.`;
  }
  return `${node.title} provides critical hands-on experience and skills aligned with your learning goal.`;
}

/**
 * Generates grounded explanations for a single node with a 3-second timeout safety.
 */
async function fetchNodeExplanation(
  node: OntologyNode,
  rawGoal: string,
  edgeMap: { prereqs: Map<string, string[]>; dependents: Map<string, string[]> }
): Promise<{ nodeId: string; explanation: string }> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const depTitles = edgeMap.dependents.get(node.id) || [];
  const prereqTitles = edgeMap.prereqs.get(node.id) || [];

  const fallbackExp = generateTemplateExplanation({
    node,
    dependentNodeTitles: depTitles,
    prerequisiteNodeTitles: prereqTitles,
    rawGoal,
  });

  if (!geminiKey && !openAiKey) {
    return { nodeId: node.id, explanation: fallbackExp };
  }

  const prompt = `Explain in one clear, concise sentence why "${node.title}" is recommended for a learner whose goal is "${rawGoal}".
Graph Facts:
- Topic: ${node.title} (${node.description})
- Prerequisite for: ${depTitles.length > 0 ? depTitles.join(', ') : 'Track culmination / capstone'}
- Depends on: ${prereqTitles.length > 0 ? prereqTitles.join(', ') : 'Core foundation'}
Rule: Strict 1 sentence. Do NOT invent facts outside these graph facts.`;

  // Try Gemini API first with 3-second timeout
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 60 },
          }),
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) {
          return { nodeId: node.id, explanation: text };
        }
      }
    } catch {
      // Ignore network/timeout errors and fallback
    }
  }

  // Try OpenAI API with 3-second timeout
  if (openAiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

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
          temperature: 0.2,
          max_tokens: 60,
        }),
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.choices[0]?.message?.content?.trim();
        if (text) {
          return { nodeId: node.id, explanation: text };
        }
      }
    } catch {
      // Ignore network/timeout errors and fallback
    }
  }

  return { nodeId: node.id, explanation: fallbackExp };
}

/**
 * Generates grounded explanations for all recommended nodes CONCURRENTLY in parallel.
 */
export async function generateGroundedExplanations(
  nodes: OntologyNode[],
  rawGoal: string,
  edgeMap: { prereqs: Map<string, string[]>; dependents: Map<string, string[]> }
): Promise<Record<string, string>> {
  const explanationPromises = nodes.map((node) =>
    fetchNodeExplanation(node, rawGoal, edgeMap)
  );

  const results = await Promise.all(explanationPromises);
  const map: Record<string, string> = {};
  results.forEach((item) => {
    map[item.nodeId] = item.explanation;
  });

  return map;
}
