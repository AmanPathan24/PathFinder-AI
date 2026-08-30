import Dagre from '@dagrejs/dagre';
import { Edge, MarkerType, Node } from '@xyflow/react';
import { PathMilestone } from '@/types/ontology';
import { Subtopic } from '@/types/resource';

export const MAIN_NODE_WIDTH = 320;
export const MAIN_NODE_HEIGHT = 152;
export const SIBLING_NODE_WIDTH = 256;
export const SIBLING_NODE_HEIGHT = 152;
export const SUBTOPIC_NODE_WIDTH = 224;
export const SUBTOPIC_NODE_HEIGHT = 90;
export const CHECKPOINT_NODE_WIDTH = 384;
export const CHECKPOINT_NODE_HEIGHT = 176;
export const SUBTOPIC_GAP = 12;
export const SUBTOPIC_TOP_GAP = 18;

export type LayoutTopicData = {
  id: string;
  title: string;
  type: string;
  difficulty?: number;
  est_hours: number;
  description?: string;
  isMainPath?: boolean;
  isSibling?: boolean;
  isSubtopic?: boolean;
  [key: string]: unknown;
};

export type LayoutCheckpointData = {
  milestoneIndex: number;
  title: string;
  description: string;
  buttonLabel: string;
  sourceTopicId?: string;
  [key: string]: unknown;
};

export interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
  translateExtent: [[number, number], [number, number]];
}

export function filterKnownMilestonesForGraph(
  milestones: PathMilestone[],
  nodeStatuses: Record<string, 'done' | 'known-prior' | 'learning' | 'not-started' | 'skipped'>
): PathMilestone[] {
  return milestones
    .map((milestone) => ({
      ...milestone,
      nodes: milestone.nodes.filter((node) => {
        const status = nodeStatuses[node.id];
        return status !== 'known-prior';
      }),
    }))
    .filter((milestone) => milestone.nodes.length > 0);
}

export function filterLayoutByStatus(
  layout: LayoutResult,
  nodeStatuses: Record<string, 'done' | 'known-prior' | 'learning' | 'not-started' | 'skipped'>,
  _subtopicsByParent?: Map<string, Subtopic[]>
): LayoutResult {
  const visibleNodeIds = new Set<string>();

  layout.nodes.forEach((node) => {
    if (node.type === 'checkpointCard') {
      visibleNodeIds.add(node.id);
      return;
    }

    const layoutData = node.data as LayoutTopicData | undefined;
    const topicId = layoutData?.id ?? node.id.replace(/^sub_/, '');
    const status = nodeStatuses[topicId] ?? 'not-started';

    if (status === 'known-prior') {
      return;
    }

    visibleNodeIds.add(node.id);
  });

  const filteredNodes = layout.nodes.filter((node) => visibleNodeIds.has(node.id));
  const filteredNodeIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = layout.edges.filter(
    (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    translateExtent: computeTranslateExtent(filteredNodes),
  };
}

export function getSubtopicProgress(
  topicIds: string[],
  nodeStatuses: Record<string, 'done' | 'known-prior' | 'learning' | 'not-started' | 'skipped'>,
  subtopicsByParent: Map<string, Subtopic[]>
): { completed: number; total: number } {
  const relevantSubtopicIds = new Set<string>();

  topicIds.forEach((topicId) => {
    (subtopicsByParent.get(topicId) || []).forEach((subtopic) => {
      relevantSubtopicIds.add(subtopic.id);
    });
  });

  const completed = Array.from(relevantSubtopicIds).filter((subtopicId) => {
    const status = nodeStatuses[subtopicId] ?? 'not-started';
    return status === 'done' || status === 'known-prior';
  }).length;

  return {
    completed,
    total: relevantSubtopicIds.size,
  };
}

export function syncParentAndSubtopicStatuses(
  currentStatuses: Record<string, 'done' | 'known-prior' | 'learning' | 'not-started' | 'skipped'>,
  subtopicsByParent: Map<string, Subtopic[]>,
  nodeId: string,
  nextStatus: 'done' | 'known-prior' | 'learning' | 'not-started' | 'skipped'
): Record<string, 'done' | 'known-prior' | 'learning' | 'not-started' | 'skipped'> {
  const updated = { ...currentStatuses };
  const subtopics = subtopicsByParent.get(nodeId) || [];

  if (subtopics.length > 0) {
    const parentStatus = nextStatus;
    updated[nodeId] = parentStatus;
    subtopics.forEach((subtopic) => {
      updated[subtopic.id] = parentStatus;
    });
    return updated;
  }

  const parentId = Array.from(subtopicsByParent.entries()).find(([, subs]) =>
    subs.some((sub) => sub.id === nodeId)
  )?.[0];

  if (parentId) {
    updated[nodeId] = nextStatus;
    const siblings = subtopicsByParent.get(parentId) || [];
    const hasMultiChildMilestone = siblings.length > 1;
    const allDone =
      hasMultiChildMilestone &&
      siblings.every((sub) => (updated[sub.id] ?? currentStatuses[sub.id] ?? 'not-started') === 'done');
    const parentWasAlreadyDone = (updated[parentId] ?? currentStatuses[parentId] ?? 'not-started') === 'done';

    updated[parentId] =
      allDone || (hasMultiChildMilestone && nextStatus === 'done' && siblings.every((sub) => sub.id === nodeId || (updated[sub.id] ?? currentStatuses[sub.id] ?? 'not-started') === 'done'))
        ? 'done'
        : parentWasAlreadyDone && nextStatus === 'not-started' && hasMultiChildMilestone
          ? 'not-started'
          : updated[parentId] || 'not-started';
    return updated;
  }

  updated[nodeId] = nextStatus;
  return updated;
}

function nodeSize(kind: 'main' | 'sibling' | 'subtopic' | 'checkpoint') {
  if (kind === 'sibling') return { width: SIBLING_NODE_WIDTH, height: SIBLING_NODE_HEIGHT };
  if (kind === 'subtopic') return { width: SUBTOPIC_NODE_WIDTH, height: SUBTOPIC_NODE_HEIGHT };
  if (kind === 'checkpoint') return { width: CHECKPOINT_NODE_WIDTH, height: CHECKPOINT_NODE_HEIGHT };
  return { width: MAIN_NODE_WIDTH, height: MAIN_NODE_HEIGHT };
}

function subtopicStackHeight(count: number) {
  if (count <= 0) return 0;
  return SUBTOPIC_TOP_GAP + count * (SUBTOPIC_NODE_HEIGHT + SUBTOPIC_GAP) - SUBTOPIC_GAP;
}

function topicRfId(topicId: string) {
  return `node_${topicId}`;
}

function subRfId(subtopicId: string) {
  return `sub_${subtopicId}`;
}

/**
 * Dagre positions the main-path DAG (topics + checkpoints) once.
 * Subtopics are then permanently stacked under their parent, and later ranks
 * are pushed down so those children never overlap neighboring cards.
 */
export function layoutRoadmapGraph(
  milestones: PathMilestone[],
  subtopicsByParent: Map<string, Subtopic[]>
): LayoutResult {
  const graph = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: 'TB',
    nodesep: 56,
    ranksep: 88,
    marginx: 48,
    marginy: 48,
  });

  const mainNodes: Node[] = [];
  const displayEdges: Edge[] = [];
  let previousMainIds: string[] = [];

  const connectFromPrevious = (targetId: string) => {
    previousMainIds.forEach((sourceId) => {
      graph.setEdge(sourceId, targetId);
      displayEdges.push(mainEdge(sourceId, targetId));
    });
  };

  milestones.forEach((milestone, mIdx) => {
    const isParallel = milestone.nodes.length > 1;
    const waveIds: string[] = [];

    milestone.nodes.forEach((topic) => {
      const rfId = topicRfId(topic.id);
      const kind = isParallel ? 'sibling' : 'main';
      const { width, height } = nodeSize(kind);
      waveIds.push(rfId);

      const node: Node = {
        id: rfId,
        type: 'customTopic',
        position: { x: 0, y: 0 },
        draggable: false,
        width,
        height,
        data: {
          id: topic.id,
          title: topic.title,
          type: topic.type,
          difficulty: topic.difficulty,
          est_hours: topic.est_hours,
          description: topic.description,
          isMainPath: !isParallel,
          isSibling: isParallel,
          isSubtopic: false,
        } satisfies LayoutTopicData,
      };
      mainNodes.push(node);
      graph.setNode(rfId, { width, height });
    });

    waveIds.forEach((id) => connectFromPrevious(id));
    previousMainIds = waveIds;

    const shouldPlaceCheckpoint = (mIdx > 0 && mIdx % 3 === 2) || mIdx === milestones.length - 1;
    if (shouldPlaceCheckpoint) {
      const cpId = `checkpoint_${mIdx}`;
      const { width, height } = nodeSize('checkpoint');
      const firstTopic = milestone.nodes[0];
      mainNodes.push({
        id: cpId,
        type: 'checkpointCard',
        position: { x: 0, y: 0 },
        draggable: false,
        width,
        height,
        data: {
          milestoneIndex: mIdx + 1,
          title: `Checkpoint: Milestone ${mIdx + 1} Reached`,
          description: `You've mastered the "${milestone.title}" stage! Ready to build portfolio projects showcasing these skills.`,
          buttonLabel: 'Explore Projects',
          sourceTopicId: firstTopic?.id,
        } satisfies LayoutCheckpointData,
      });
      graph.setNode(cpId, { width, height });
      connectFromPrevious(cpId);
      previousMainIds = [cpId];
    }
  });

  Dagre.layout(graph);

  const positionedMain = mainNodes.map((node) => {
    const laidOut = graph.node(node.id);
    const width = node.width ?? MAIN_NODE_WIDTH;
    const height = node.height ?? MAIN_NODE_HEIGHT;
    return {
      ...node,
      position: {
        x: laidOut.x - width / 2,
        y: laidOut.y - height / 2,
      },
    };
  });

  const subtopicNodes: Node[] = [];
  const sortedMain = [...positionedMain].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);

  const rankKey = (y: number) => Math.round(y / 8);
  const ranks: number[] = [];
  const seenRanks = new Set<number>();
  sortedMain.forEach((node) => {
    const key = rankKey(node.position.y);
    if (!seenRanks.has(key)) {
      seenRanks.add(key);
      ranks.push(key);
    }
  });

  let extraY = 0;
  const shiftedMain: Node[] = [];

  ranks.forEach((rank) => {
    const atRank = sortedMain.filter((n) => rankKey(n.position.y) === rank);
    const shiftedRank = atRank.map((node) => ({
      ...node,
      position: { x: node.position.x, y: node.position.y + extraY },
    }));
    shiftedMain.push(...shiftedRank);

    let maxStack = 0;
    shiftedRank.forEach((parent) => {
      if (parent.type !== 'customTopic') return;
      const topicId = (parent.data as LayoutTopicData).id;
      const subs = subtopicsByParent.get(topicId) || [];
      if (subs.length === 0) return;

      const parentWidth = parent.width ?? MAIN_NODE_WIDTH;
      const parentHeight = parent.height ?? MAIN_NODE_HEIGHT;
      const stackH = subtopicStackHeight(subs.length);
      maxStack = Math.max(maxStack, stackH);

      const startX = parent.position.x + (parentWidth - SUBTOPIC_NODE_WIDTH) / 2;
      subs.forEach((sub, subIdx) => {
        const subId = subRfId(sub.id);
        const subY =
          parent.position.y + parentHeight + SUBTOPIC_TOP_GAP + subIdx * (SUBTOPIC_NODE_HEIGHT + SUBTOPIC_GAP);

        subtopicNodes.push({
          id: subId,
          type: 'customTopic',
          position: { x: startX, y: subY },
          draggable: false,
          width: SUBTOPIC_NODE_WIDTH,
          height: SUBTOPIC_NODE_HEIGHT,
          data: {
            id: sub.id,
            title: sub.title,
            type: 'subtopic',
            est_hours: sub.est_hours,
            description: `Subtopic of ${(parent.data as LayoutTopicData).title}`,
            parentSkillId: topicId,
            isSubtopic: true,
          } satisfies LayoutTopicData,
        });

        displayEdges.push({
          id: `edge_sub_${parent.id}_${subId}`,
          source: parent.id,
          target: subId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          style: { stroke: '#B58B65', strokeWidth: 1.5, strokeDasharray: '5,4' },
          type: 'smoothstep',
        });
      });
    });

    extraY += maxStack;
  });

  const nodes = [...shiftedMain, ...subtopicNodes];
  const translateExtent = computeTranslateExtent(nodes);
  return { nodes, edges: displayEdges, translateExtent };
}

function mainEdge(source: string, target: string): Edge {
  const isCheckpoint = target.startsWith('checkpoint_');
  return {
    id: `edge_${source}_${target}`,
    source,
    target,
    sourceHandle: 'bottom',
    targetHandle: 'top',
    style: isCheckpoint
      ? { stroke: '#C96F4A', strokeWidth: 2, strokeDasharray: '5,5' }
      : { stroke: '#4A3728', strokeWidth: 2.5 },
    type: 'smoothstep',
    markerEnd: isCheckpoint
      ? undefined
      : { type: MarkerType.ArrowClosed, color: '#4A3728', width: 13, height: 13 },
  };
}

function computeTranslateExtent(nodes: Node[]): [[number, number], [number, number]] {
  if (nodes.length === 0) {
    return [
      [0, 0],
      [800, 600],
    ];
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const width = node.width ?? MAIN_NODE_WIDTH;
    const height = node.height ?? MAIN_NODE_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  });

  const pad = 280;
  return [
    [minX - pad, minY - pad],
    [maxX + pad, maxY + pad],
  ];
}
