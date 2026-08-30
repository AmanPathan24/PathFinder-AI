import { describe, expect, it } from 'vitest';
import { PathMilestone } from '@/types/ontology';
import { Subtopic } from '@/types/resource';
import {
  filterKnownMilestonesForGraph,
  filterLayoutByStatus,
  getSubtopicProgress,
  layoutRoadmapGraph,
  syncParentAndSubtopicStatuses,
} from '@/lib/canvas/layoutGraph';

const topic = (id: string, title: string): PathMilestone['nodes'][number] =>
  ({
    id,
    title,
    type: 'skill',
    track: 'data-science',
    difficulty: 2,
    est_hours: 8,
    description: title,
    keywords: [],
  }) as PathMilestone['nodes'][number];

describe('layoutRoadmapGraph', () => {
  const milestones: PathMilestone[] = [
    {
      milestone_index: 0,
      title: 'Foundations',
      is_parallel: false,
      est_hours: 8,
      nodes: [topic('a', 'Python')],
    },
    {
      milestone_index: 1,
      title: 'Siblings',
      is_parallel: true,
      est_hours: 16,
      nodes: [topic('b', 'SQL'), topic('c', 'Stats')],
    },
  ];

  const subtopicsByParent = new Map<string, Subtopic[]>([
    [
      'a',
      [
        { id: 'sub-a-1', parent_skill_id: 'a', title: 'Syntax', est_hours: 2 },
        { id: 'sub-a-2', parent_skill_id: 'a', title: 'OOP', est_hours: 2 },
        { id: 'sub-a-3', parent_skill_id: 'a', title: 'Files', est_hours: 2 },
      ],
    ],
    ['b', [{ id: 'sub-b-1', parent_skill_id: 'b', title: 'Joins', est_hours: 2 }]],
  ]);

  it('always includes subtopics as laid-out nodes', () => {
    const { nodes } = layoutRoadmapGraph(milestones, subtopicsByParent);
    const subIds = nodes.filter((n) => n.id.startsWith('sub_')).map((n) => n.id);
    expect(subIds).toEqual(['sub_sub-a-1', 'sub_sub-a-2', 'sub_sub-a-3', 'sub_sub-b-1']);
  });

  it('does not overlap node bounding boxes', () => {
    const { nodes } = layoutRoadmapGraph(milestones, subtopicsByParent);
    const boxes = nodes.map((n) => ({
      id: n.id,
      x: n.position.x,
      y: n.position.y,
      w: n.width ?? 0,
      h: n.height ?? 0,
    }));

    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlap =
          a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
        expect(overlap, `${a.id} overlaps ${b.id}`).toBe(false);
      }
    }
  });

  it('keeps later main-path nodes below a parent’s subtopic stack', () => {
    const { nodes } = layoutRoadmapGraph(milestones, subtopicsByParent);
    const lastSubA = nodes.find((n) => n.id === 'sub_sub-a-3')!;
    const sibling = nodes.find((n) => n.id === 'node_b')!;
    expect(sibling.position.y).toBeGreaterThan(
      lastSubA.position.y + (lastSubA.height ?? 0)
    );
  });

  it('filters only known-prior nodes out of the graph milestone set', () => {
    const milestoneSet: PathMilestone[] = [
      {
        milestone_index: 0,
        title: 'Completed / Known Prior Topics',
        is_parallel: true,
        est_hours: 8,
        nodes: [topic('a', 'Python'), topic('z', 'Zebra')],
      },
      {
        milestone_index: 1,
        title: 'Next Wave',
        is_parallel: false,
        est_hours: 8,
        nodes: [topic('b', 'SQL')],
      },
    ];

    const visible = filterKnownMilestonesForGraph(milestoneSet, {
      a: 'known-prior',
      z: 'done',
      b: 'learning',
    });

    expect(visible).toHaveLength(2);
    expect(visible[0].nodes.map((n) => n.id)).toEqual(['z']);
    expect(visible[1].nodes.map((n) => n.id)).toEqual(['b']);
  });

  it('keeps a parent topic and all subtopics in sync when completion changes', () => {
    const subtopicsByParent = new Map<string, Subtopic[]>([
      ['a', [{ id: 'sub-a-1', parent_skill_id: 'a', title: 'Sub A 1', est_hours: 2 } as Subtopic, { id: 'sub-a-2', parent_skill_id: 'a', title: 'Sub A 2', est_hours: 2 } as Subtopic]],
    ]);
    const next = syncParentAndSubtopicStatuses(
      {
        a: 'not-started',
        'sub-a-1': 'not-started',
        'sub-a-2': 'not-started',
      },
      subtopicsByParent,
      'sub-a-1',
      'done'
    );

    expect(next['sub-a-1']).toBe('done');
    expect(next['a']).toBe('not-started');

    const completed = syncParentAndSubtopicStatuses(
      {
        a: 'not-started',
        'sub-a-1': 'done',
        'sub-a-2': 'done',
      },
      subtopicsByParent,
      'sub-a-2',
      'done'
    );

    expect(completed['a']).toBe('done');
    expect(completed['sub-a-1']).toBe('done');
    expect(completed['sub-a-2']).toBe('done');
  });

  it('does not auto-complete a parent when only one child is marked done', () => {
    const subtopicsByParent = new Map<string, Subtopic[]>([
      ['a', [{ id: 'sub-a-1', parent_skill_id: 'a', title: 'Sub A 1', est_hours: 2 } as Subtopic, { id: 'sub-a-2', parent_skill_id: 'a', title: 'Sub A 2', est_hours: 2 } as Subtopic]],
    ]);
    const next = syncParentAndSubtopicStatuses(
      {
        a: 'not-started',
        'sub-a-1': 'not-started',
        'sub-a-2': 'not-started',
      },
      subtopicsByParent,
      'sub-a-1',
      'done'
    );

    expect(next['a']).toBe('not-started');
  });

  it('counts only truly completed subtopics for dashboard progress', () => {
    const subtopicsByParent = new Map<string, Subtopic[]>([
      ['a', [{ id: 'sub-a-1', parent_skill_id: 'a', title: 'Sub A 1', est_hours: 2 } as Subtopic, { id: 'sub-a-2', parent_skill_id: 'a', title: 'Sub A 2', est_hours: 2 } as Subtopic]],
    ]);

    const progress = getSubtopicProgress(['a'], {
      a: 'done',
      'sub-a-1': 'done',
      'sub-a-2': 'not-started',
    }, subtopicsByParent);

    expect(progress).toEqual({ completed: 1, total: 2 });
  });

  it('preserves the positions of visible nodes when known-prior nodes are filtered out', () => {
    const fullGraph = layoutRoadmapGraph(milestones, subtopicsByParent);
    const filtered = filterLayoutByStatus(fullGraph, {
      a: 'done',
      b: 'done',
      c: 'not-started',
      'sub-a-1': 'done',
      'sub-a-2': 'done',
      'sub-a-3': 'done',
      'sub-b-1': 'known-prior',
    }, subtopicsByParent);

    const filteredIds = filtered.nodes.map((node) => node.id);
    expect(filteredIds).not.toContain('sub_sub-b-1');
    expect(filteredIds).toContain('node_a');
    expect(filteredIds).toContain('node_b');
    expect(filteredIds).toContain('node_c');

    const sample = filtered.nodes.find((node) => node.id === 'node_b');
    const original = fullGraph.nodes.find((node) => node.id === 'node_b');
    expect(sample?.position.x).toBe(original?.position.x);
    expect(sample?.position.y).toBe(original?.position.y);
  });
});
