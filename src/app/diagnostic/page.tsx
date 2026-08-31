'use client';

/**
 * Diagnostic Confidence Agent — Stage 2.5 (between Onboarding and Path)
 *
 * Sourced from: knownPriorNodeIds in PathContext (set during Onboarding).
 * For each claimed-known skill, shows 2–3 targeted micro-questions.
 * Evaluates answers → 0–1 confidence score → stores in PathContext →
 * recalculates path with confidence-aware pruning → routes to /path.
 *
 * Key guard: waits for parsedProfile to be non-null before deciding
 * whether to redirect (avoids false redirect on async context load).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePath } from '@/context/PathContext';
import {
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  SkipForward,
  Zap,
  Award,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import rawOntology from '@/data/ontology.json';
import { OntologyNode, SkillOntology } from '@/types/ontology';
import {
  DiagnosticQuestion,
  confidenceTier,
  FALLBACK_CONFIDENCE,
} from '@/lib/llm/diagnostic-agent';

const ontology = rawOntology as SkillOntology;
const nodeMap = new Map<string, OntologyNode>(ontology.nodes.map((n) => [n.id, n]));

// ── Tier display config ────────────────────────────────────────────────────

const TIER_CONFIG = {
  mastered: {
    label: 'Mastered ✓',
    sub: 'Excluded from roadmap (fully pruned — 0h)',
    color: 'text-[#8C9A76]',
    bg: 'bg-[#E4EAD9]',
    border: 'border-[#8C9A76]',
    icon: <CheckCircle2 className="w-4 h-4 text-[#8C9A76]" />,
  },
  refresher: {
    label: 'Light Refresher ⚡',
    sub: 'Kept in roadmap at ~20% of original study hours',
    color: 'text-[#B58B65]',
    bg: 'bg-[#F9F5EF]',
    border: 'border-[#B58B65]',
    icon: <Zap className="w-4 h-4 text-[#B58B65]" />,
  },
  'full-study': {
    label: 'Full Study Needed',
    sub: 'Included at full estimated hours',
    color: 'text-[#C96F4A]',
    bg: 'bg-[#FFF9F0]',
    border: 'border-[#C96F4A]',
    icon: <BookOpen className="w-4 h-4 text-[#C96F4A]" />,
  },
};

// ── Types ──────────────────────────────────────────────────────────────────

interface NodeDiagnosticState {
  node: OntologyNode;
  questions: DiagnosticQuestion[];
  answers: Record<string, string>;
  confidence: number | null;
  rationale: string;
  loadingQuestions: boolean;
  loadingEval: boolean;
  evaluated: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function DiagnosticPage() {
  const router = useRouter();
  const {
    parsedProfile,
    knownPriorNodeIds,
    setDiagnosticConfidences,
    recalculatePath,
    setIsLoading,
    isLoading,
  } = usePath();

  const [nodeStates, setNodeStates] = useState<NodeDiagnosticState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profileReady, setProfileReady] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Track whether questions have been fetched to avoid double-fetch
  const fetchedRef = useRef(false);

  // ── Resolve claimed nodes ──────────────────────────────────────────────
  // Use knownPriorNodeIds from nodeStatuses — set during onboarding.
  // Filter to the current target track so we don't quiz cross-track skills.
  const claimedNodes: OntologyNode[] = knownPriorNodeIds
    .map((id) => nodeMap.get(id))
    .filter((n): n is OntologyNode => !!n)
    .filter((n) => !parsedProfile || n.track === parsedProfile.target_track);

  // ── Wait for profile to load before deciding to redirect ──────────────
  useEffect(() => {
    if (parsedProfile !== null) {
      setProfileReady(true);
    }
  }, [parsedProfile]);

  // ── Once profile is ready, initialise or redirect ─────────────────────
  useEffect(() => {
    if (!profileReady) return;
    if (fetchedRef.current) return;

    if (claimedNodes.length === 0) {
      // No claimed skills → skip diagnostic entirely
      router.replace('/path');
      return;
    }

    fetchedRef.current = true;
    setQuestionsLoading(true);

    const init: NodeDiagnosticState[] = claimedNodes.map((node) => ({
      node,
      questions: [],
      answers: {},
      confidence: null,
      rationale: '',
      loadingQuestions: true,
      loadingEval: false,
      evaluated: false,
    }));
    setNodeStates(init);

    // Fetch questions for every claimed node in parallel
    Promise.all(
      claimedNodes.map(async (node, idx) => {
        try {
          const res = await fetch('/api/diagnostic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'questions', nodeId: node.id }),
          });
          if (res.ok) {
            const data = await res.json();
            return { idx, questions: (data.questionSet?.questions ?? []) as DiagnosticQuestion[] };
          }
        } catch {
          // fall through
        }
        return { idx, questions: [] as DiagnosticQuestion[] };
      })
    ).then((results) => {
      setNodeStates((prev) => {
        const next = [...prev];
        results.forEach(({ idx, questions }) => {
          next[idx] = { ...next[idx], questions, loadingQuestions: false };
        });
        return next;
      });
      setQuestionsLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const currentState = nodeStates[currentIndex];
  const isLastNode = currentIndex === nodeStates.length - 1;

  const setAnswer = useCallback((questionId: string, value: string) => {
    setNodeStates((prev) => {
      const next = [...prev];
      next[currentIndex] = {
        ...next[currentIndex],
        answers: { ...next[currentIndex].answers, [questionId]: value },
      };
      return next;
    });
  }, [currentIndex]);

  const evaluateCurrent = useCallback(async () => {
    if (!currentState || currentState.loadingEval || currentState.evaluated) return;

    setNodeStates((prev) => {
      const next = [...prev];
      next[currentIndex] = { ...next[currentIndex], loadingEval: true };
      return next;
    });

    const answers = currentState.questions.map((q) => ({
      questionId: q.id,
      answer: currentState.answers[q.id] ?? '',
    }));

    let confidence = FALLBACK_CONFIDENCE;
    let rationale = 'Could not evaluate — using default confidence.';

    try {
      const res = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          nodeId: currentState.node.id,
          questions: currentState.questions,
          answers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        confidence = data.result?.confidence ?? FALLBACK_CONFIDENCE;
        rationale = data.result?.rationale ?? rationale;
      }
    } catch {
      // fallback values already set
    }

    setNodeStates((prev) => {
      const next = [...prev];
      next[currentIndex] = {
        ...next[currentIndex],
        confidence,
        rationale,
        loadingEval: false,
        evaluated: true,
      };
      return next;
    });
  }, [currentState, currentIndex]);

  const buildConfidences = useCallback(() => {
    const confidences: Record<string, number> = {};
    // Start with fallback for all claimed nodes
    claimedNodes.forEach((n) => { confidences[n.id] = FALLBACK_CONFIDENCE; });
    // Override with evaluated results
    nodeStates.forEach((ns) => {
      if (ns.confidence !== null) confidences[ns.node.id] = ns.confidence;
    });
    return confidences;
  }, [claimedNodes, nodeStates]);

  const handleSkipAll = useCallback(async () => {
    setSkipped(true);
    const confidences = buildConfidences();
    setDiagnosticConfidences(confidences);
    setIsLoading(true);
    await recalculatePath({
      knownIds: claimedNodes.map((n) => n.id),
      confidences,
    });
    router.push('/path');
  }, [buildConfidences, claimedNodes, recalculatePath, router, setDiagnosticConfidences, setIsLoading]);

  const handleFinish = useCallback(async () => {
    const confidences = buildConfidences();
    setDiagnosticConfidences(confidences);
    setIsLoading(true);
    setSubmitted(true);
    await recalculatePath({
      knownIds: claimedNodes.map((n) => n.id),
      confidences,
    });
    router.push('/path');
  }, [buildConfidences, claimedNodes, recalculatePath, router, setDiagnosticConfidences, setIsLoading]);

  // ── Loading: waiting for context ──────────────────────────────────────
  if (!profileReady) {
    return (
      <div className="max-w-2xl mx-auto py-24 flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#C96F4A]" />
        <p className="text-[#7A6553] font-semibold text-sm">Loading your profile…</p>
      </div>
    );
  }

  // ── Guard: no claimed skills (shouldn't be reached normally — redirect fires) ──
  if (profileReady && claimedNodes.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 space-y-5">
        <ShieldCheck className="w-12 h-12 text-[#8C9A76] mx-auto" />
        <h1 className="text-2xl font-serif font-bold text-[#4A3728]">No Skills to Diagnose</h1>
        <p className="text-[#7A6553] text-sm">
          You haven't claimed any known skills. Go back to calibration to select skills,
          or proceed directly to your roadmap.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push('/onboarding')}
            className="px-5 py-2.5 border border-[#E6DCCF] bg-white text-[#4A3728] text-sm font-bold rounded-xl hover:bg-[#F0E8DC] transition-all"
          >
            Back to Calibration
          </button>
          <button
            onClick={() => router.push('/path')}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C96F4A] text-white text-sm font-bold rounded-xl shadow-md hover:bg-[#A85331] transition-all"
          >
            View Roadmap <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ── Loading questions ──────────────────────────────────────────────────
  if (questionsLoading || (nodeStates.length > 0 && nodeStates.every((ns) => ns.loadingQuestions))) {
    return (
      <div className="max-w-2xl mx-auto py-20 flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#C96F4A]" />
        <p className="text-[#7A6553] font-semibold text-sm">
          Generating diagnostic questions for {claimedNodes.length} claimed skill{claimedNodes.length !== 1 ? 's' : ''}…
        </p>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">

      {/* Header */}
      <div className="border-b border-[#E6DCCF] pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-3.5 py-1 rounded-full border border-[#8C9A76]/30 mb-3 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5" /> Stage 2.5 · Diagnostic Confidence Check
        </div>
        <h1 className="text-3xl font-serif text-[#4A3728] tracking-tight">
          Verify Your Claimed Skills
        </h1>
        <p className="text-[#7A6553] text-sm mt-1 max-w-xl leading-relaxed">
          2–3 targeted questions per skill. Your answers calibrate how the roadmap treats each topic —
          mastered skills are pruned, partial knowledge becomes a quick refresher.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {nodeStates.map((ns, idx) => {
          const tier = ns.confidence !== null ? confidenceTier(ns.confidence) : null;
          return (
            <button
              key={ns.node.id}
              onClick={() => setCurrentIndex(idx)}
              title={ns.node.title}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-[#C96F4A] scale-y-[1.5]'
                  : tier === 'mastered'
                  ? 'bg-[#8C9A76]'
                  : tier === 'refresher'
                  ? 'bg-[#B58B65]'
                  : tier === 'full-study'
                  ? 'bg-[#C96F4A]/50'
                  : 'bg-[#E6DCCF]'
              }`}
            />
          );
        })}
        <span className="text-xs font-bold text-[#7A6553] shrink-0 whitespace-nowrap">
          {currentIndex + 1} / {nodeStates.length}
        </span>
      </div>

      {/* Node card */}
      {currentState && (
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 paper-shadow-lg space-y-6">

          {/* Node header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Award className="w-4 h-4 text-[#B58B65] shrink-0" />
                <span className="text-xs font-bold text-[#B58B65] uppercase tracking-wider">
                  Claimed Known Skill
                </span>
                <span className="text-[10px] font-bold text-[#7A6553] bg-[#F0E8DC] px-2.5 py-0.5 rounded-full uppercase">
                  {currentState.node.type}
                </span>
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#4A3728]">
                {currentState.node.title}
              </h2>
              <p className="text-xs text-[#7A6553] mt-1 leading-relaxed">
                {currentState.node.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-[#7A6553] font-medium uppercase tracking-wide">Original est.</div>
              <div className="text-xl font-serif font-bold text-[#4A3728]">
                {currentState.node.est_hours}h
              </div>
            </div>
          </div>

          {/* Questions */}
          {currentState.loadingQuestions ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#C96F4A]" />
              <span className="text-sm text-[#7A6553]">Loading questions…</span>
            </div>
          ) : currentState.questions.length === 0 ? (
            <div className="flex items-center gap-3 bg-[#F9F5EF] border border-[#E6DCCF] rounded-2xl p-4 text-[#7A6553] text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B58B65]" />
              <span>
                No questions available for this skill — default confidence (0.6, light refresher) will be applied.
              </span>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#4A3728]">
                Answer honestly — only someone who really knows this gets these right:
              </p>
              {currentState.questions.map((q, qi) => (
                <div key={q.id} className="space-y-2">
                  <label className="block text-sm font-semibold text-[#4A3728]">
                    <span className="text-[#C96F4A] mr-1.5">Q{qi + 1}.</span>
                    {q.question}
                  </label>
                  <input
                    type="text"
                    value={currentState.answers[q.id] ?? ''}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    disabled={currentState.evaluated}
                    placeholder={currentState.evaluated ? '' : 'Your answer…'}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !currentState.evaluated && qi === currentState.questions.length - 1) {
                        evaluateCurrent();
                      }
                    }}
                    className="w-full bg-white border-2 border-[#E6DCCF] focus:border-[#C96F4A] focus:ring-4 focus:ring-[#C96F4A]/10 rounded-xl px-4 py-3 text-[#4A3728] placeholder-[#B58B65]/50 text-sm outline-none transition-all disabled:opacity-60 disabled:bg-[#F9F5EF]"
                  />
                  {currentState.evaluated && q.hint && (
                    <p className="text-xs text-[#8C9A76] italic pl-1">
                      💡 Expected: {q.hint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Result badge */}
          {currentState.evaluated && currentState.confidence !== null && (() => {
            const tier = confidenceTier(currentState.confidence);
            const cfg = TIER_CONFIG[tier];
            return (
              <div className={`flex items-start gap-3 rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                {cfg.icon}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${cfg.color}`}>
                    {cfg.label}
                    <span className="ml-2 text-xs font-normal text-[#7A6553]">
                      ({Math.round(currentState.confidence * 100)}% confidence)
                    </span>
                  </div>
                  <div className="text-xs text-[#7A6553] mt-0.5">{cfg.sub}</div>
                  {currentState.rationale && (
                    <p className="text-xs text-[#4A3728] italic mt-1.5 leading-relaxed">
                      "{currentState.rationale}"
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  {tier === 'mastered' ? (
                    <span className="text-xs font-bold text-[#8C9A76] bg-[#E4EAD9] px-2 py-1 rounded-lg border border-[#8C9A76]/30">
                      0h in roadmap
                    </span>
                  ) : tier === 'refresher' ? (
                    <span className="text-xs font-bold text-[#B58B65] bg-[#F7EEE3] px-2 py-1 rounded-lg border border-[#B58B65]/30">
                      ~{Math.max(1, Math.round(currentState.node.est_hours * 0.2))}h refresher
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[#C96F4A] bg-[#FFF9F0] px-2 py-1 rounded-lg border border-[#C96F4A]/30">
                      {currentState.node.est_hours}h full
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Action row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#7A6553] hover:text-[#4A3728] border border-[#E6DCCF] bg-white disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="flex items-center gap-2">
              {/* Submit answers button (only when not yet evaluated and has questions) */}
              {!currentState.evaluated && currentState.questions.length > 0 && !currentState.loadingQuestions && (
                <button
                  type="button"
                  onClick={evaluateCurrent}
                  disabled={currentState.loadingEval}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#4A3728] hover:bg-[#3A2718] text-white text-xs font-bold rounded-xl shadow transition-all disabled:opacity-50"
                >
                  {currentState.loadingEval ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating…</>
                  ) : (
                    <><ShieldCheck className="w-3.5 h-3.5" /> Submit Answers</>
                  )}
                </button>
              )}

              {/* Next skill button */}
              {(currentState.evaluated || currentState.questions.length === 0) && !isLastNode && (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#C96F4A] hover:bg-[#A85331] text-white text-xs font-bold rounded-xl shadow transition-all"
                >
                  Next Skill <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Finish button (last node) */}
              {(currentState.evaluated || currentState.questions.length === 0) && isLastNode && (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isLoading || submitted}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#C96F4A] hover:bg-[#A85331] text-white text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isLoading || submitted ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Building roadmap…</>
                  ) : (
                    <>Apply & View Roadmap <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary: results so far */}
      {nodeStates.some((ns) => ns.evaluated) && (
        <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl p-5 space-y-3 paper-shadow">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4A3728]">
            Diagnostic Summary
          </p>
          <div className="space-y-2">
            {nodeStates.map((ns) => {
              if (!ns.evaluated || ns.confidence === null) return null;
              const tier = confidenceTier(ns.confidence);
              const cfg = TIER_CONFIG[tier];
              return (
                <div
                  key={ns.node.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${cfg.bg} ${cfg.border}`}
                >
                  {cfg.icon}
                  <span className="text-xs font-semibold text-[#4A3728] flex-1 truncate">
                    {ns.node.title}
                  </span>
                  <span className={`text-xs font-bold shrink-0 ${cfg.color}`}>
                    {Math.round(ns.confidence * 100)}%
                  </span>
                  <span className={`text-[10px] font-bold shrink-0 ${cfg.color}`}>
                    {cfg.label.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E6DCCF]">
        <button
          type="button"
          onClick={() => router.push('/onboarding')}
          className="text-xs text-[#7A6553] hover:text-[#4A3728] font-semibold flex items-center gap-1.5 transition-all"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back to Calibration
        </button>

        <button
          type="button"
          onClick={handleSkipAll}
          disabled={isLoading || skipped || submitted}
          className="flex items-center gap-1.5 text-xs text-[#7A6553] hover:text-[#4A3728] font-semibold disabled:opacity-40 transition-all"
          title="Skip diagnostic — all claimed skills default to 60% confidence (light refresher)"
        >
          {skipped ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Applying…</>
          ) : (
            <><SkipForward className="w-3.5 h-3.5" /> Skip — trust my self-report</>
          )}
        </button>
      </div>
    </div>
  );
}
