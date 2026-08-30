import { NextRequest, NextResponse } from 'next/server';
import { parseUserGoal } from '@/lib/llm/parser';
import { resolveKnownSkillNodeIds } from '@/lib/engine/skill-profiler';
import { generateLearningPath, getOntology } from '@/lib/engine/path-engine';
import { generateGroundedExplanations } from '@/lib/llm/explainer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      overrideProfile,
      knownNodeIds: explicitKnownIds,
      excludedNodeIds = [],
    } = body;

    let profile = overrideProfile;

    if (!profile && prompt) {
      profile = await parseUserGoal(prompt);
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Goal prompt or profile configuration is required.' },
        { status: 400 }
      );
    }

    let knownNodeIds = explicitKnownIds || profile.known_node_ids || [];
    if (knownNodeIds.length === 0 && profile.known_skills?.length > 0) {
      knownNodeIds = resolveKnownSkillNodeIds(profile.known_skills);
      profile.known_node_ids = knownNodeIds;
    }

    const pathOutput = generateLearningPath({
      knownNodeIds,
      targetTrack: profile.target_track,
      timeBudgetWeeks: profile.time_budget_weeks || 24,
      excludedNodeIds,
    });

    const ontology = getOntology();
    const nodeMap = new Map(ontology.nodes.map((n) => [n.id, n]));
    const prereqs = new Map<string, string[]>();
    const dependents = new Map<string, string[]>();

    ontology.nodes.forEach((n) => {
      prereqs.set(n.id, []);
      dependents.set(n.id, []);
    });

    ontology.edges.forEach((edge) => {
      const fromNode = nodeMap.get(edge.from_id);
      const toNode = nodeMap.get(edge.to_id);
      if (fromNode && toNode) {
        dependents.get(edge.from_id)?.push(toNode.title);
        prereqs.get(edge.to_id)?.push(fromNode.title);
      }
    });

    const explanations = await generateGroundedExplanations(
      pathOutput.recommended_nodes,
      profile.raw_goal || prompt || 'Personalized learning goal',
      { prereqs, dependents }
    );

    return NextResponse.json({
      success: true,
      profile,
      path: pathOutput,
      explanations,
    });
  } catch (error: any) {
    console.error('Error in /api/recommend:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate learning path.' },
      { status: 500 }
    );
  }
}
