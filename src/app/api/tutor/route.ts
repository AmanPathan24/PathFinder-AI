import { NextRequest, NextResponse } from 'next/server';
import rawOntology from '@/data/ontology.json';
import { OntologyNode, SkillOntology } from '@/types/ontology';

export const dynamic = 'force-dynamic';

const ontology = rawOntology as SkillOntology;
const nodeMap = new Map<string, OntologyNode>(ontology.nodes.map((n) => [n.id, n]));

export async function POST(req: NextRequest) {
  try {
    const { nodeId, message, chatHistory = [] } = await req.json();

    if (!nodeId || !message) {
      return NextResponse.json(
        { error: 'nodeId and message are required.' },
        { status: 400 }
      );
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Node not found in ontology.' }, { status: 404 });
    }

    // Identify graph facts
    const prereqNodes = ontology.edges
      .filter((e) => e.to_id === nodeId)
      .map((e) => nodeMap.get(e.from_id)?.title)
      .filter(Boolean);

    const dependentNodes = ontology.edges
      .filter((e) => e.from_id === nodeId)
      .map((e) => nodeMap.get(e.to_id)?.title)
      .filter(Boolean);

    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

    const systemPrompt = `You are a node-scoped AI Tutor for PathFinder, an educational platform with strict factual grounding.
You are helping a student learn specifically about the topic: "${node.title}".

GRAPH FACTS ABOUT THIS TOPIC:
- Title: ${node.title}
- Track: ${node.track}
- Difficulty: Level ${node.difficulty} of 5
- Estimated study time: ${node.est_hours} hours
- Description: ${node.description}
- Keywords/Key Concepts: ${node.keywords.join(', ')}
- Prerequisites: ${prereqNodes.length > 0 ? prereqNodes.join(', ') : 'Foundational (no prerequisites)'}
- Unlocks/Leads to: ${dependentNodes.length > 0 ? dependentNodes.join(', ') : 'Track Capstone / Mastery'}

STRICT TUTORING CONSTRAINTS:
1. Stay strictly focused on teaching, clarifying, and breaking down concepts related to "${node.title}".
2. EXPLICIT CONSTRAINT: Do NOT generate diagnostic quizzes, tests, assessments, or question-and-answer exams under any circumstances.
3. Be clear, warm, educational, concise, and editorial in tone.
4. If the user asks how this topic relates to other skills, refer only to the verified prerequisites and unlocks listed above.`;

    // Try Gemini
    if (geminiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const formattedContents = [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nStudent Question: ${message}` }],
          },
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: formattedContents,
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 350,
              },
            }),
          }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return NextResponse.json({ success: true, reply });
          }
        }
      } catch (e) {
        console.warn('Gemini Tutor call failed, using fallback:', e);
      }
    }

    // Try OpenAI
    if (openAiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: 0.3,
            max_tokens: 350,
          }),
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            return NextResponse.json({ success: true, reply });
          }
        }
      } catch (e) {
        console.warn('OpenAI Tutor call failed, using fallback:', e);
      }
    }

    // Deterministic Fallback
    const fallbackAnswer = `${node.title} is a key topic in the ${node.track} track (${node.est_hours}h estimated, Level ${node.difficulty}/5). ${node.description} It builds upon ${prereqNodes.length > 0 ? prereqNodes.join(', ') : 'fundamental basics'} and directly prepares you for ${dependentNodes.length > 0 ? dependentNodes.join(', ') : 'capstone projects'}. Focus on mastering: ${node.keywords.slice(0, 4).join(', ')}.`;

    return NextResponse.json({ success: true, reply: fallbackAnswer });
  } catch (error: any) {
    console.error('Error in /api/tutor:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process AI Tutor query.' },
      { status: 500 }
    );
  }
}
