import { describe, it, expect } from 'vitest';
import { generateEdgeReweightingProposals } from '../outcome-feedback';
import rawOntology from '@/data/ontology.json';
import { SkillOntology } from '@/types/ontology';
import { OutcomeEvent } from '@/types/roadmap';

describe('Outcome Feedback Edge Reweighting Engine', () => {
  it('should propose making an edge optional when users skip a prerequisite and succeed downstream', () => {
    const events: OutcomeEvent[] = [
      {
        id: '1',
        user_id: 'user_1',
        roadmap_id: 'rdm_1',
        node_id: 'fe-html-css',
        action: 'skipped',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        user_id: 'user_1',
        roadmap_id: 'rdm_1',
        node_id: 'fe-js-basics',
        action: 'completed',
        created_at: new Date().toISOString(),
      },
    ];

    const proposals = generateEdgeReweightingProposals(rawOntology as SkillOntology, events);

    expect(proposals.length).toBeGreaterThan(0);
    const htmlToJs = proposals.find(
      (p) => p.from_id === 'fe-html-css' && p.to_id === 'fe-js-basics'
    );
    expect(htmlToJs).toBeDefined();
    expect(htmlToJs?.skip_success_rate).toBe(1.0);
    expect(htmlToJs?.recommendation).toBe('make_optional');
  });
});
