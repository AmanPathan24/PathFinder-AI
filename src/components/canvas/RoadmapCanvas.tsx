'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
  PanOnScrollMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { PathMilestone, TrackId, OntologyNode } from '@/types/ontology';
import { NodeStatusType } from '@/types/roadmap';
import { CustomTopicNode, CustomNodeData } from './CustomTopicNode';
import { CheckpointCard, CheckpointNodeData } from './CheckpointCard';
import { NodeDetailDrawer } from './NodeDetailDrawer';
import { FloatingTutorBar } from './FloatingTutorBar';
import rawOntology from '@/data/ontology.json';
import rawSubtopics from '@/data/subtopics.json';
import { Subtopic } from '@/types/resource';

interface RoadmapCanvasProps {
  milestones: PathMilestone[];
  targetTrack: TrackId;
  nodeStatuses: Record<string, NodeStatusType>;
  explanations?: Record<string, string>;
  bottleneckNodeIds?: string[];
  onSetNodeStatus: (nodeId: string, status: NodeStatusType) => void;
}

const nodeTypes = {
  customTopic: CustomTopicNode as any,
  checkpointCard: CheckpointCard as any,
};

// Layout constants — clean vertical flow with subtopics stacked on right
const MAIN_X = 300;
const NODE_WIDTH = 320;
const SUBTOPIC_X = MAIN_X + NODE_WIDTH + 70;
const SUBTOPIC_NODE_HEIGHT = 82;
const SUBTOPIC_GAP = 14;
const MAIN_NODE_HEIGHT = 145;
const MAIN_GAP = 70;
const SIBLING_WIDTH = 260;
const SIBLING_GAP = 30;

export const RoadmapCanvas: React.FC<RoadmapCanvasProps> = ({
  milestones,
  targetTrack,
  nodeStatuses,
  explanations = {},
  bottleneckNodeIds = [],
  onSetNodeStatus,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerTab, setDrawerTab] = useState<'resources' | 'tutor'>('resources');
  const [drawerQuery, setDrawerQuery] = useState<string>('');

  const nodeMap = useMemo(() => {
    return new Map<string, OntologyNode>(rawOntology.nodes.map((n) => [n.id, n as OntologyNode]));
  }, []);

  const subtopicsByParent = useMemo(() => {
    const map = new Map<string, Subtopic[]>();
    (rawSubtopics as Subtopic[]).forEach((sub) => {
      if (!map.has(sub.parent_skill_id)) map.set(sub.parent_skill_id, []);
      map.get(sub.parent_skill_id)!.push(sub);
    });
    return map;
  }, []);

  // Build layout — proper heights so subtopics don't overlap main nodes
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    let currentY = 60;
    let previousMainNodeId: string | null = null;

    milestones.forEach((milestone, mIdx) => {
      const isParallel = milestone.nodes.length > 1;

      if (!isParallel) {
        const topic = milestone.nodes[0];
        const status = nodeStatuses[topic.id] || 'not-started';
        const isBottleneck = bottleneckNodeIds.includes(topic.id);
        const subtopics = subtopicsByParent.get(topic.id) || [];
        // Expand the complete subtopic list when this topic is selected.
        const visibleSubs = selectedNodeId === topic.id ? subtopics : [];

        const mainNodeId = `node_${topic.id}`;

        nodes.push({
          id: mainNodeId,
          type: 'customTopic',
          position: { x: MAIN_X, y: currentY },
          data: {
            id: topic.id,
            title: topic.title,
            type: topic.type,
            difficulty: topic.difficulty,
            est_hours: topic.est_hours,
            description: topic.description,
            status,
            isMainPath: true,
            isBottleneck,
            onSelectNode: (id: string) => {
              setSelectedNodeId(id);
              setDrawerTab('resources');
              setIsDrawerOpen(true);
            },
            onSetStatus: onSetNodeStatus,
          } as CustomNodeData,
        });

        if (previousMainNodeId) {
          edges.push({
            id: `edge_${previousMainNodeId}_${mainNodeId}`,
            source: previousMainNodeId,
            target: mainNodeId,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            style: { stroke: '#4A3728', strokeWidth: 2.5 },
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#4A3728', width: 13, height: 13 },
          });
        }
        previousMainNodeId = mainNodeId;

        // Subtopic nodes stacked vertically on the right
        if (visibleSubs.length > 0) {
          const subBlockHeight = visibleSubs.length * (SUBTOPIC_NODE_HEIGHT + SUBTOPIC_GAP) - SUBTOPIC_GAP;
          const subStartY = currentY + (MAIN_NODE_HEIGHT / 2) - (subBlockHeight / 2);

          visibleSubs.forEach((sub, subIdx) => {
            const subNodeId = `sub_${sub.id}`;
            const subY = subStartY + subIdx * (SUBTOPIC_NODE_HEIGHT + SUBTOPIC_GAP);

            nodes.push({
              id: subNodeId,
              type: 'customTopic',
              position: { x: SUBTOPIC_X, y: subY },
              data: {
                id: topic.id,
                title: sub.title,
                type: 'subtopic',
                est_hours: sub.est_hours,
                status: nodeStatuses[topic.id] || 'not-started',
                isSubtopic: true,
                onSelectNode: (id: string) => {
                  setSelectedNodeId(id);
                  setDrawerTab('resources');
                  setIsDrawerOpen(true);
                },
                onSetStatus: onSetNodeStatus,
              } as CustomNodeData,
            });

            edges.push({
              id: `edge_sub_${mainNodeId}_${subNodeId}`,
              source: mainNodeId,
              target: subNodeId,
              sourceHandle: 'right',
              targetHandle: 'left',
              style: { stroke: '#B58B65', strokeWidth: 1.5, strokeDasharray: '5,4' },
              type: 'smoothstep',
            });
          });

          // Ensure enough vertical space for both main node and all its subtopics
          const requiredHeight = Math.max(
            MAIN_NODE_HEIGHT + MAIN_GAP,
            subBlockHeight + MAIN_GAP
          );
          currentY += requiredHeight + 20;
        } else {
          currentY += MAIN_NODE_HEIGHT + MAIN_GAP;
        }
      } else {
        // Parallel sibling wave — horizontally centered
        const waveNodes = milestone.nodes;
        const totalWidth = waveNodes.length * SIBLING_WIDTH + (waveNodes.length - 1) * SIBLING_GAP;
        const startX = MAIN_X + NODE_WIDTH / 2 - totalWidth / 2;

        const waveNodeIds: string[] = [];
        let expandedSubtopicHeight = 0;

        waveNodes.forEach((topic, sIdx) => {
          const status = nodeStatuses[topic.id] || 'not-started';
          const isBottleneck = bottleneckNodeIds.includes(topic.id);
          const siblingNodeId = `node_${topic.id}`;
          const subtopics = subtopicsByParent.get(topic.id) || [];
          const visibleSubs = selectedNodeId === topic.id ? subtopics : [];
          waveNodeIds.push(siblingNodeId);

          nodes.push({
            id: siblingNodeId,
            type: 'customTopic',
            position: { x: startX + sIdx * (SIBLING_WIDTH + SIBLING_GAP), y: currentY },
            data: {
              id: topic.id,
              title: topic.title,
              type: topic.type,
              difficulty: topic.difficulty,
              est_hours: topic.est_hours,
              description: topic.description,
              status,
              isSibling: true,
              isBottleneck,
              onSelectNode: (id: string) => {
                setSelectedNodeId(id);
                setDrawerTab('resources');
                setIsDrawerOpen(true);
              },
              onSetStatus: onSetNodeStatus,
            } as CustomNodeData,
          });

          if (previousMainNodeId) {
            edges.push({
              id: `edge_${previousMainNodeId}_${siblingNodeId}`,
              source: previousMainNodeId,
              target: siblingNodeId,
              sourceHandle: 'bottom',
              targetHandle: 'top',
              style: { stroke: '#4A3728', strokeWidth: 2 },
              type: 'smoothstep',
              markerEnd: { type: MarkerType.ArrowClosed, color: '#4A3728', width: 11, height: 11 },
            });
          }

          if (visibleSubs.length > 0) {
            const subBlockHeight =
              visibleSubs.length * (SUBTOPIC_NODE_HEIGHT + SUBTOPIC_GAP) - SUBTOPIC_GAP;
            expandedSubtopicHeight = Math.max(expandedSubtopicHeight, subBlockHeight);
            const subStartY = currentY + MAIN_NODE_HEIGHT / 2 - subBlockHeight / 2;

            visibleSubs.forEach((sub, subIdx) => {
              const subNodeId = `sub_${sub.id}`;
              const subY = subStartY + subIdx * (SUBTOPIC_NODE_HEIGHT + SUBTOPIC_GAP);

              nodes.push({
                id: subNodeId,
                type: 'customTopic',
                position: {
                  x: startX + sIdx * (SIBLING_WIDTH + SIBLING_GAP) + SIBLING_WIDTH + 40,
                  y: subY,
                },
                data: {
                  id: topic.id,
                  title: sub.title,
                  type: 'subtopic',
                  est_hours: sub.est_hours,
                  status,
                  isSubtopic: true,
                  onSelectNode: (id: string) => {
                    setSelectedNodeId(id);
                    setDrawerTab('resources');
                    setIsDrawerOpen(true);
                  },
                  onSetStatus: onSetNodeStatus,
                } as CustomNodeData,
              });

              edges.push({
                id: `edge_sub_${siblingNodeId}_${subNodeId}`,
                source: siblingNodeId,
                target: subNodeId,
                sourceHandle: 'right',
                targetHandle: 'left',
                style: { stroke: '#B58B65', strokeWidth: 1.5, strokeDasharray: '5,4' },
                type: 'smoothstep',
              });
            });
          }
        });

        // The first sibling becomes the next "previous" for the vertical chain
        previousMainNodeId = waveNodeIds[Math.floor(waveNodeIds.length / 2)];
        currentY += Math.max(MAIN_NODE_HEIGHT, expandedSubtopicHeight) + MAIN_GAP + 20;
      }

      // Checkpoint after every 3rd milestone and at the last
      if ((mIdx > 0 && mIdx % 3 === 2) || mIdx === milestones.length - 1) {
        const cpNodeId = `checkpoint_${mIdx}`;
        nodes.push({
          id: cpNodeId,
          type: 'checkpointCard',
          position: { x: MAIN_X - 20, y: currentY },
          data: {
            milestoneIndex: mIdx + 1,
            title: `Checkpoint: Milestone ${mIdx + 1} Reached`,
            description: `You've mastered the "${milestone.title}" stage! Ready to build portfolio projects showcasing these skills.`,
            buttonLabel: 'Explore Projects',
            onAction: () => {
              if (milestone.nodes[0]) {
                setSelectedNodeId(milestone.nodes[0].id);
                setDrawerTab('tutor');
                setDrawerQuery('What portfolio projects can I build after completing this milestone?');
                setIsDrawerOpen(true);
              }
            },
          } as CheckpointNodeData,
        });

        if (previousMainNodeId) {
          edges.push({
            id: `edge_${previousMainNodeId}_${cpNodeId}`,
            source: previousMainNodeId,
            target: cpNodeId,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            style: { stroke: '#C96F4A', strokeWidth: 2, strokeDasharray: '5,5' },
            type: 'smoothstep',
          });
        }

        previousMainNodeId = cpNodeId;
        currentY += 160;
      }
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [milestones, nodeStatuses, bottleneckNodeIds, subtopicsByParent, onSetNodeStatus, selectedNodeId]);

  // Sync live status changes back into nodes without remounting
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const graphSignature = useMemo(
    () => initialNodes.map((node) => `${node.id}:${node.type}`).join('|'),
    [initialNodes]
  );
  const previousGraphSignature = useRef(graphSignature);

  // Replace the graph when milestones are regenerated, while preserving manual node moves
  // during status-only updates.
  useEffect(() => {
    if (previousGraphSignature.current === graphSignature) return;
    previousGraphSignature.current = graphSignature;
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [graphSignature, initialNodes, initialEdges, setNodes, setEdges]);

  // Re-sync nodes when statuses change (keeps canvas alive, just updates data)
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        const nodeData = n.data as CustomNodeData;
        const topicId = nodeData?.id;
        if (!topicId || n.type !== 'customTopic') return n;
        const newStatus = nodeStatuses[topicId] || 'not-started';
        if (nodeData.status === newStatus) return n;
        return { ...n, data: { ...nodeData, status: newStatus } };
      })
    );
  }, [nodeStatuses, setNodes]);

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) || null : null;
  const selectedStatus = selectedNodeId ? nodeStatuses[selectedNodeId] || 'not-started' : 'not-started';
  const selectedExplanation = selectedNodeId ? explanations[selectedNodeId] : undefined;

  const handleAskFloatingTutor = useCallback(
    (query: string) => {
      const targetId = selectedNodeId || milestones[0]?.nodes[0]?.id;
      if (targetId) {
        setSelectedNodeId(targetId);
        setDrawerTab('tutor');
        setDrawerQuery(query);
        setIsDrawerOpen(true);
      }
    },
    [selectedNodeId, milestones]
  );

  return (
    <div className="relative w-full h-[700px] sm:h-[800px] bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl overflow-hidden paper-shadow-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.2}
        maxZoom={1.8}
        // Scroll to pan (vertical scroll = pan Y, horizontal = pan X)
        panOnScroll={true}
        panOnScrollMode={PanOnScrollMode.Free}
        // Disable drag-to-pan on background so scroll feels natural
        panOnDrag={false}
        nodesDraggable={true}
        zoomOnScroll={false}
        zoomOnPinch={true}
        defaultEdgeOptions={{
          type: 'smoothstep',
          style: { stroke: '#4A3728', strokeWidth: 2 },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1.2}
          color="#B58B65"
          style={{ opacity: 0.2 }}
        />
        <Controls
          showInteractive={false}
          className="!bg-[#FFF9F0] !border !border-[#E6DCCF] !rounded-xl !shadow-md !text-[#4A3728]"
        />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as CustomNodeData;
            if (n.type === 'checkpointCard') return '#C96F4A';
            if (d?.status === 'done') return '#8C9A76';
            if (d?.status === 'known-prior') return '#B58B65';
            if (d?.status === 'learning') return '#C96F4A';
            if (d?.status === 'skipped') return '#D1C5B4';
            return '#E6DCCF';
          }}
          className="!bg-[#FFF9F0] !border !border-[#E6DCCF] !rounded-xl !shadow-md"
          maskColor="rgba(247, 241, 231, 0.65)"
        />
      </ReactFlow>

      {/* Scroll hint */}
      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-[10px] text-[#7A6553] font-medium bg-[#FFF9F0]/90 border border-[#E6DCCF] px-3 py-1 rounded-full pointer-events-none select-none z-10">
        Scroll to navigate · Pinch to zoom · Click node to explore
      </div>

      <FloatingTutorBar
        onAskQuestion={handleAskFloatingTutor}
        selectedNodeTitle={selectedNode?.title}
      />

      <NodeDetailDrawer
        node={selectedNode}
        status={selectedStatus}
        groundedExplanation={selectedExplanation}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSetStatus={(id, st) => onSetNodeStatus(id, st)}
        initialTab={drawerTab}
        initialTutorQuery={drawerQuery}
      />
    </div>
  );
};
