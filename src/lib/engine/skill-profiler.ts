import { OntologyNode, SkillOntology } from '@/types/ontology';
import rawOntology from '../../data/ontology.json';

const ontologyData = rawOntology as SkillOntology;

/**
 * Calculates cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalizes input strings for token matching
 */
function normalizeTerm(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
}

/**
 * Fuzzy local matcher based on title, description, and keywords
 */
export function matchSkillByKeyword(
  inputSkill: string,
  nodes: OntologyNode[]
): { node: OntologyNode; score: number } | null {
  const normInput = normalizeTerm(inputSkill);
  if (!normInput) return null;

  const inputTokens = normInput.split(/\s+/);
  let bestNode: OntologyNode | null = null;
  let bestScore = 0;

  for (const node of nodes) {
    let score = 0;
    const normTitle = normalizeTerm(node.title);
    const normDesc = normalizeTerm(node.description);

    // Exact title match
    if (normTitle === normInput) {
      score += 1.0;
    } else if (normTitle.includes(normInput) || normInput.includes(normTitle)) {
      score += 0.8;
    }

    // Keyword matches
    node.keywords.forEach((kw) => {
      const normKw = normalizeTerm(kw);
      if (normKw === normInput) {
        score += 0.9;
      } else if (normInput.includes(normKw) || normKw.includes(normInput)) {
        score += 0.6;
      }
    });

    // Token overlap matches
    inputTokens.forEach((token) => {
      if (token.length > 2) {
        if (normTitle.includes(token)) score += 0.3;
        if (normDesc.includes(token)) score += 0.15;
      }
    });

    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  if (bestNode && bestScore >= 0.4) {
    return { node: bestNode, score: bestScore };
  }

  return null;
}

/**
 * Resolves a list of free-text skill strings to canonical ontology Node IDs.
 */
export function resolveKnownSkillNodeIds(
  knownSkillTexts: string[],
  customNodes?: OntologyNode[]
): string[] {
  const nodes = customNodes || ontologyData.nodes;
  const matchedIds = new Set<string>();

  for (const skillText of knownSkillTexts) {
    const match = matchSkillByKeyword(skillText, nodes);
    if (match) {
      matchedIds.add(match.node.id);
    }
  }

  return Array.from(matchedIds);
}
