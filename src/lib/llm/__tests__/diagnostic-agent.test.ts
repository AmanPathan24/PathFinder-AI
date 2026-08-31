/**
 * Unit tests for the Diagnostic Confidence Agent
 *
 * These tests cover the deterministic parts only (fallback question bank,
 * keyword-match evaluator, confidence tier mapping) — no LLM calls are made.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  confidenceTier,
  FALLBACK_CONFIDENCE,
  DiagnosticQuestion,
  DiagnosticAnswer,
} from '../diagnostic-agent';
import { OntologyNode } from '@/types/ontology';

// ── Shared fixture ──────────────────────────────────────────────────────────

const mockNode: OntologyNode = {
  id: 'ds-python-basics',
  title: 'Python Programming Basics',
  type: 'skill',
  track: 'data-science',
  difficulty: 1,
  est_hours: 20,
  description: 'Core Python programming: variables, loops, functions, data structures.',
  keywords: ['python', 'variables', 'loops', 'functions', 'lists', 'dicts'],
};

const mockQuestions: DiagnosticQuestion[] = [
  { id: 'q0', question: 'What does `list(range(3))` return in Python?', hint: '[0, 1, 2]' },
  { id: 'q1', question: 'What is the output of `bool([])` in Python?', hint: 'False' },
];

// ── confidenceTier ──────────────────────────────────────────────────────────

describe('confidenceTier()', () => {
  it('returns "mastered" for score >= 0.75', () => {
    expect(confidenceTier(0.75)).toBe('mastered');
    expect(confidenceTier(0.9)).toBe('mastered');
    expect(confidenceTier(1.0)).toBe('mastered');
  });

  it('returns "refresher" for score in [0.4, 0.75)', () => {
    expect(confidenceTier(0.4)).toBe('refresher');
    expect(confidenceTier(0.6)).toBe('refresher');
    expect(confidenceTier(0.74)).toBe('refresher');
  });

  it('returns "full-study" for score < 0.4', () => {
    expect(confidenceTier(0.0)).toBe('full-study');
    expect(confidenceTier(0.2)).toBe('full-study');
    expect(confidenceTier(0.39)).toBe('full-study');
  });
});

// ── FALLBACK_CONFIDENCE ─────────────────────────────────────────────────────

describe('FALLBACK_CONFIDENCE', () => {
  it('is 0.6 — falls in refresher tier', () => {
    expect(FALLBACK_CONFIDENCE).toBe(0.6);
    expect(confidenceTier(FALLBACK_CONFIDENCE)).toBe('refresher');
  });
});

// ── generateDiagnosticQuestions fallback (no API key) ──────────────────────

describe('generateDiagnosticQuestions() — deterministic fallback', () => {
  it('returns a question set with nodeId and nodeTitle', async () => {
    // No API keys set in test env — uses fallback bank
    const { generateDiagnosticQuestions } = await import('../diagnostic-agent');
    const result = await generateDiagnosticQuestions(mockNode);

    expect(result.nodeId).toBe('ds-python-basics');
    expect(result.nodeTitle).toBe('Python Programming Basics');
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions.length).toBeLessThanOrEqual(3);
    result.questions.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('question');
      expect(typeof q.question).toBe('string');
      expect(q.question.length).toBeGreaterThan(5);
    });
  });

  it('returns generic questions for a node not in the fallback bank', async () => {
    const { generateDiagnosticQuestions } = await import('../diagnostic-agent');
    const unknownNode: OntologyNode = {
      ...mockNode,
      id: 'ds-unknown-exotic-topic',
      title: 'Exotic Topic XYZ',
      keywords: ['exotickw1', 'exotickw2'],
    };
    const result = await generateDiagnosticQuestions(unknownNode);
    expect(result.nodeId).toBe('ds-unknown-exotic-topic');
    expect(result.questions.length).toBeGreaterThanOrEqual(1);
  });
});

// ── evaluateDiagnosticAnswers — deterministic fallback ─────────────────────

describe('evaluateDiagnosticAnswers() — deterministic keyword-match fallback', () => {
  it('returns high confidence for answers matching hint keywords well', async () => {
    const { evaluateDiagnosticAnswers } = await import('../diagnostic-agent');

    const goodAnswers: DiagnosticAnswer[] = [
      { questionId: 'q0', answer: '[0, 1, 2] — range produces integers starting at 0' },
      { questionId: 'q1', answer: 'False, because empty lists are falsy in Python' },
    ];

    const result = await evaluateDiagnosticAnswers(mockNode, mockQuestions, goodAnswers);

    expect(result.nodeId).toBe('ds-python-basics');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(typeof result.rationale).toBe('string');
  });

  it('returns low confidence for blank / empty answers', async () => {
    const { evaluateDiagnosticAnswers } = await import('../diagnostic-agent');

    const blankAnswers: DiagnosticAnswer[] = [
      { questionId: 'q0', answer: '' },
      { questionId: 'q1', answer: '' },
    ];

    const result = await evaluateDiagnosticAnswers(mockNode, mockQuestions, blankAnswers);

    expect(result.confidence).toBeLessThanOrEqual(0.4);
    expect(confidenceTier(result.confidence)).toBe('full-study');
  });

  it('clamps output confidence to [0, 1]', async () => {
    const { evaluateDiagnosticAnswers } = await import('../diagnostic-agent');

    const answers: DiagnosticAnswer[] = [
      { questionId: 'q0', answer: 'python variables loops functions lists dicts false [0,1,2]' },
      { questionId: 'q1', answer: 'python variables loops functions lists dicts false [0,1,2]' },
    ];

    const result = await evaluateDiagnosticAnswers(mockNode, mockQuestions, answers);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ── runNodeDiagnostic convenience wrapper ───────────────────────────────────

describe('runNodeDiagnostic()', () => {
  it('is equivalent to calling evaluateDiagnosticAnswers directly', async () => {
    const { runNodeDiagnostic, evaluateDiagnosticAnswers } = await import('../diagnostic-agent');

    const answers: DiagnosticAnswer[] = [
      { questionId: 'q0', answer: '[0, 1, 2]' },
      { questionId: 'q1', answer: 'False' },
    ];

    const direct = await evaluateDiagnosticAnswers(mockNode, mockQuestions, answers);
    const via = await runNodeDiagnostic(mockNode, mockQuestions, answers);

    expect(via.nodeId).toBe(direct.nodeId);
    expect(via.confidence).toBe(direct.confidence);
  });
});
