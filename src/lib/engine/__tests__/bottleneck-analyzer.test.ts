import { describe, it, expect } from 'vitest';
import { analyzeBottlenecks } from '../bottleneck-analyzer';
import rawOntology from '@/data/ontology.json';
import { SkillOntology } from '@/types/ontology';

describe('Bottleneck Analyzer Engine', () => {
  it('should identify critical bottleneck nodes in data-science track', () => {
    const result = analyzeBottlenecks(rawOntology as SkillOntology, 'data-science');

    expect(result.bottleneckNodeIds.length).toBeGreaterThan(0);
    // ds-python-basics and ds-math-stats have many downstream dependents
    expect(result.downstreamCountMap['ds-python-basics']).toBeGreaterThan(2);
    expect(result.bottleneckNodeIds).toContain('ds-python-basics');
  });

  it('should identify critical bottleneck nodes in frontend track', () => {
    const result = analyzeBottlenecks(rawOntology as SkillOntology, 'frontend');

    expect(result.bottleneckNodeIds.length).toBeGreaterThan(0);
    expect(result.downstreamCountMap['fe-html-css']).toBeGreaterThan(2);
  });
});
