import { OutcomeEvent } from '@/types/roadmap';
import { SkillOntology } from '@/types/ontology';

export interface EdgeAdjustmentProposal {
  from_id: string;
  to_id: string;
  from_title: string;
  to_title: string;
  current_weight: number;
  proposed_weight: number;
  skip_success_count: number;
  total_skip_count: number;
  skip_success_rate: number;
  recommendation: 'make_optional' | 'reduce_weight' | 'keep_strict';
  reasoning: string;
}

/**
 * Computes edge reweighting proposals based on batch outcome data.
 * When learners skip a prerequisite and still successfully complete downstream topics,
 * this engine generates human-reviewable proposals to soften the edge constraint.
 */
export function generateEdgeReweightingProposals(
  ontology: SkillOntology,
  events: OutcomeEvent[]
): EdgeAdjustmentProposal[] {
  const nodeMap = new Map(ontology.nodes.map((n) => [n.id, n]));

  // Index skip events by (user_id + node_id)
  const userSkips = new Map<string, Set<string>>(); // userId -> Set of skipped nodeIds
  const userCompletions = new Map<string, Set<string>>(); // userId -> Set of completed nodeIds

  events.forEach((evt) => {
    if (evt.action === 'skipped') {
      if (!userSkips.has(evt.user_id)) userSkips.set(evt.user_id, new Set());
      userSkips.get(evt.user_id)!.add(evt.node_id);
    } else if (evt.action === 'completed') {
      if (!userCompletions.has(evt.user_id)) userCompletions.set(evt.user_id, new Set());
      userCompletions.get(evt.user_id)!.add(evt.node_id);
    }
  });

  const proposals: EdgeAdjustmentProposal[] = [];

  ontology.edges.forEach((edge) => {
    const fromNode = nodeMap.get(edge.from_id);
    const toNode = nodeMap.get(edge.to_id);
    if (!fromNode || !toNode) return;

    let skipCount = 0;
    let skipSuccessCount = 0;

    userSkips.forEach((skippedSet, userId) => {
      if (skippedSet.has(edge.from_id)) {
        skipCount++;
        const completedSet = userCompletions.get(userId);
        if (completedSet && completedSet.has(edge.to_id)) {
          skipSuccessCount++;
        }
      }
    });

    if (skipCount >= 1) {
      const rate = parseFloat((skipSuccessCount / skipCount).toFixed(2));
      let recommendation: EdgeAdjustmentProposal['recommendation'] = 'keep_strict';
      let proposedWeight = edge.weight || 1.0;
      let reasoning = 'Data indicates learners still need this prerequisite.';

      if (rate >= 0.75) {
        recommendation = 'make_optional';
        proposedWeight = 0.2;
        reasoning = `High success rate (${(rate * 100).toFixed(0)}%) when skipping ${fromNode.title} prior to ${toNode.title}. Propose making this prerequisite optional.`;
      } else if (rate >= 0.4) {
        recommendation = 'reduce_weight';
        proposedWeight = 0.5;
        reasoning = `Moderate success rate (${(rate * 100).toFixed(0)}%) without ${fromNode.title}. Propose softening dependency weight.`;
      }

      proposals.push({
        from_id: edge.from_id,
        to_id: edge.to_id,
        from_title: fromNode.title,
        to_title: toNode.title,
        current_weight: edge.weight || 1.0,
        proposed_weight: proposedWeight,
        skip_success_count: skipSuccessCount,
        total_skip_count: skipCount,
        skip_success_rate: rate,
        recommendation,
        reasoning,
      });
    }
  });

  return proposals;
}
