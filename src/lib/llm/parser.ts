import { UserParsedProfile, TrackId } from '@/types/ontology';

const SYSTEM_PROMPT = `
You are a strict JSON parsing assistant for PathFinder.
Extract structured learning intent from free text input into valid JSON.
The supported target_tracks are EXACTLY: "data-science", "frontend", "devops".

JSON schema to return:
{
  "target_track": "data-science" | "frontend" | "devops",
  "known_skills": string[],
  "time_budget_weeks": number,
  "raw_goal": string
}

Rules:
- Default time_budget_weeks to 24 if unspecified or unclear.
- Infer the closest target_track from the user's goal ("machine learning/ml/data/ai" -> "data-science", "react/web/nextjs/frontend/js/css" -> "frontend", "docker/k8s/cloud/aws/devops/linux" -> "devops").
- Extract explicit known skills into known_skills array.
- Return ONLY valid raw JSON. No markdown code blocks.
`;

/**
 * Robust fallback parser when no LLM API key is configured or API call fails.
 */
function fallbackParseGoal(userPrompt: string): UserParsedProfile {
  const text = userPrompt.toLowerCase();

  // Track detection
  let target_track: TrackId = 'data-science';
  if (
    text.includes('front') ||
    text.includes('react') ||
    text.includes('web') ||
    text.includes('next') ||
    text.includes('html') ||
    text.includes('ui')
  ) {
    target_track = 'frontend';
  } else if (
    text.includes('devops') ||
    text.includes('cloud') ||
    text.includes('docker') ||
    text.includes('kubernetes') ||
    text.includes('k8s') ||
    text.includes('aws') ||
    text.includes('linux')
  ) {
    target_track = 'devops';
  } else if (
    text.includes('data') ||
    text.includes('python') ||
    text.includes('machine learning') ||
    text.includes('ml') ||
    text.includes('ai')
  ) {
    target_track = 'data-science';
  }

  // Known skill extraction
  const known_skills: string[] = [];
  const skillKeywords = [
    'python',
    'sql',
    'html',
    'css',
    'javascript',
    'js',
    'react',
    'git',
    'linux',
    'bash',
    'docker',
    'pandas',
    'numpy',
    'typescript',
  ];

  skillKeywords.forEach((sk) => {
    if (text.includes(sk)) {
      known_skills.push(sk);
    }
  });

  // Time budget extraction
  let time_budget_weeks = 24;
  const monthMatch = text.match(/(\d+)\s*month/);
  if (monthMatch) {
    time_budget_weeks = parseInt(monthMatch[1], 10) * 4;
  } else {
    const weekMatch = text.match(/(\d+)\s*week/);
    if (weekMatch) {
      time_budget_weeks = parseInt(weekMatch[1], 10);
    }
  }

  return {
    target_track,
    known_skills,
    known_node_ids: [],
    time_budget_weeks: Math.max(2, Math.min(time_budget_weeks, 52)),
    raw_goal: userPrompt,
  };
}

/**
 * Main parser function supporting Gemini 3.7 Flash, OpenAI, or Fallback Engine.
 */
export async function parseUserGoal(userPrompt: string): Promise<UserParsedProfile> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

  if (!openAiKey && !geminiKey) {
    return fallbackParseGoal(userPrompt);
  }

  // Try Gemini REST endpoint first if GEMINI_API_KEY is present
  if (geminiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `${SYSTEM_PROMPT}\n\nUser Input: ${userPrompt}\nOutput JSON:`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsed = JSON.parse(rawJsonText);
          return {
            target_track: parsed.target_track || 'data-science',
            known_skills: parsed.known_skills || [],
            known_node_ids: [],
            time_budget_weeks: parsed.time_budget_weeks || 24,
            raw_goal: userPrompt,
          };
        }
      } else {
        const errText = await response.text();
        console.warn(`Gemini API returned ${response.status}: ${errText}. Falling back to standard endpoints.`);
        // Fallback to gemini-1.5-flash or 2.0-flash if model name is experimental in region
        const fallbackResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\nUser Input: ${userPrompt}\nOutput JSON:` }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
            }),
          }
        );
        if (fallbackResp.ok) {
          const data = await fallbackResp.json();
          const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawJsonText) {
            const parsed = JSON.parse(rawJsonText);
            return {
              target_track: parsed.target_track || 'data-science',
              known_skills: parsed.known_skills || [],
              known_node_ids: [],
              time_budget_weeks: parsed.time_budget_weeks || 24,
              raw_goal: userPrompt,
            };
          }
        }
      }
    } catch (err) {
      console.warn('Gemini intake parse error, trying OpenAI / fallback:', err);
    }
  }

  // Try OpenAI endpoint if OPENAI_API_KEY is present
  if (openAiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            target_track: parsed.target_track || 'data-science',
            known_skills: parsed.known_skills || [],
            known_node_ids: [],
            time_budget_weeks: parsed.time_budget_weeks || 24,
            raw_goal: userPrompt,
          };
        }
      }
    } catch (err) {
      console.warn('OpenAI intake parse failed, falling back to heuristic:', err);
    }
  }

  return fallbackParseGoal(userPrompt);
}
