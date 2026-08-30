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
 * Generates grounded explanations for recommended nodes using Gemini 3.7 Flash, OpenAI, or Fallback.
 */
export async function generateGroundedExplanations(
  nodes: OntologyNode[],
  rawGoal: string,
  edgeMap: { prereqs: Map<string, string[]>; dependents: Map<string, string[]> }
): Promise<Record<string, string>> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
  const result: Record<string, string> = {};

  for (const node of nodes) {
    const depTitles = edgeMap.dependents.get(node.id) || [];
    const prereqTitles = edgeMap.prereqs.get(node.id) || [];

    const fallbackExp = generateTemplateExplanation({
      node,
      dependentNodeTitles: depTitles,
      prerequisiteNodeTitles: prereqTitles,
      rawGoal,
    });

    if (!geminiKey && !openAiKey) {
      result[node.id] = fallbackExp;
      continue;
    }

    const prompt = `Explain in one clear, concise sentence why "${node.title}" is recommended for a learner whose goal is "${rawGoal}".
Graph Facts:
- Topic: ${node.title} (${node.description})
- Prerequisite for: ${depTitles.length > 0 ? depTitles.join(', ') : 'Track culmination / capstone'}
- Depends on: ${prereqTitles.length > 0 ? prereqTitles.join(', ') : 'Core foundation'}
Rule: Strict 1 sentence. Do NOT invent facts outside these graph facts.`;

    let generated = false;

    // Try Gemini API (gemini-3.7-flash with 1.5 fallback)
    if (geminiKey) {
      try {
        let response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 60 },
            }),
          }
        );

        if (!response.ok) {
          // Fallback model
          response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2, maxOutputTokens: 60 },
              }),
            }
          );
        }

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text) {
            result[node.id] = text;
            generated = true;
          }
        }
      } catch (err) {
        console.warn('Gemini explanation failed for node:', node.id, err);
      }
    }

    // Try OpenAI API if Gemini wasn't used or failed
    if (!generated && openAiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            max_tokens: 60,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices[0]?.message?.content?.trim();
          if (text) {
            result[node.id] = text;
            generated = true;
          }
        }
      } catch (err) {
        console.warn('OpenAI explanation failed for node:', node.id, err);
      }
    }

    if (!generated) {
      result[node.id] = fallbackExp;
    }
  }

  return result;
}
