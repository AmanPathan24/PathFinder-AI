/**
 * /api/diagnostic
 *
 * POST { action: 'questions', nodeId: string }
 *   → Returns DiagnosticQuestionSet for the given node
 *
 * POST { action: 'evaluate', nodeId: string, questions: DiagnosticQuestion[], answers: DiagnosticAnswer[] }
 *   → Returns DiagnosticResult with confidence score
 */

import { NextRequest, NextResponse } from 'next/server';
import rawOntology from '@/data/ontology.json';
import { OntologyNode, SkillOntology } from '@/types/ontology';
import {
  generateDiagnosticQuestions,
  evaluateDiagnosticAnswers,
  FALLBACK_CONFIDENCE,
  DiagnosticQuestion,
  DiagnosticAnswer,
} from '@/lib/llm/diagnostic-agent';

export const dynamic = 'force-dynamic';

const ontology = rawOntology as SkillOntology;
const nodeMap = new Map<string, OntologyNode>(ontology.nodes.map((n) => [n.id, n]));

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, nodeId, questions, answers } = body;

    if (!nodeId || !action) {
      return NextResponse.json(
        { error: 'action and nodeId are required.' },
        { status: 400 }
      );
    }

    const node = nodeMap.get(nodeId);
    if (!node) {
      return NextResponse.json({ error: `Node "${nodeId}" not found.` }, { status: 404 });
    }

    // ── Generate questions ─────────────────────────────────────────────────
    if (action === 'questions') {
      const questionSet = await generateDiagnosticQuestions(node);
      return NextResponse.json({ success: true, questionSet });
    }

    // ── Evaluate answers ───────────────────────────────────────────────────
    if (action === 'evaluate') {
      if (!Array.isArray(questions) || !Array.isArray(answers)) {
        return NextResponse.json(
          { error: 'questions and answers arrays are required for evaluate action.' },
          { status: 400 }
        );
      }

      const result = await evaluateDiagnosticAnswers(
        node,
        questions as DiagnosticQuestion[],
        answers as DiagnosticAnswer[]
      );
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: `Unknown action: "${action}".` }, { status: 400 });
  } catch (error: any) {
    console.error('Error in /api/diagnostic:', error);
    return NextResponse.json(
      { error: error?.message || 'Diagnostic agent error.' },
      { status: 500 }
    );
  }
}
