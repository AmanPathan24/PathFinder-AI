'use client';

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  useReactFlow,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, Minus, Plus } from 'lucide-react';

import { PathMilestone, TrackId, OntologyNode } from '@/types/ontology';
import { NodeStatusType } from '@/types/roadmap';
import { CustomTopicNode, CustomNodeData } from './CustomTopicNode';
import { CheckpointCard, CheckpointNodeData } from './CheckpointCard';
import { NodeDetailDrawer, DrawerSubject } from './NodeDetailDrawer';
import { FloatingTutorBar } from './FloatingTutorBar';
import rawOntology from '@/data/ontology.json';
import rawSubtopics from '@/data/subtopics.json';
import { Subtopic } from '@/types/resource';
import {
  filterKnownMilestonesForGraph,
  layoutRoadmapGraph,
  LayoutCheckpointData,
} from '@/lib/canvas/layoutGraph';

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

const FIT_VIEW_OPTIONS = { padding: 0.1, duration: 200 } as const;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.7;

const CanvasZoomControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="top-right" className="m-3">
      <div className="flex flex-col overflow-hidden rounded-xl border border-[#E6DCCF] bg-[#FFF9F0] shadow-md">
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() => zoomIn({ duration: 160 })}
          className="flex h-9 w-9 items-center justify-center text-[#4A3728] hover:bg-[#F0E8DC]"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => zoomOut({ duration: 160 })}
          className="flex h-9 w-9 items-center justify-center border-t border-[#E6DCCF] text-[#4A3728] hover:bg-[#F0E8DC]"
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Fit to screen"
          onClick={() => fitView(FIT_VIEW_OPTIONS)}
          className="flex h-9 w-9 items-center justify-center border-t border-[#E6DCCF] text-[#4A3728] hover:bg-[#F0E8DC]"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </Panel>
  );
};

const RoadmapCanvasInner: React.FC<RoadmapCanvasProps> = ({
  milestones,
  nodeStatuses,
  explanations = {},
  bottleneckNodeIds = [],
  onSetNodeStatus,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'resources' | 'tutor'>('resources');
  const [drawerQuery, setDrawerQuery] = useState('');
  const { fitView } = useReactFlow();

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

  const subtopicMap = useMemo(() => {
    return new Map<string, Subtopic>((rawSubtopics as Subtopic[]).map((sub) => [sub.id, sub]));
  }, []);

  const visibleMilestones = useMemo(
    () => filterKnownMilestonesForGraph(milestones, nodeStatuses),
    [milestones, nodeStatuses]
  );

  const { nodes: layoutNodes, edges: layoutEdges, translateExtent } = useMemo(
    () => layoutRoadmapGraph(visibleMilestones, subtopicsByParent),
    [visibleMilestones, subtopicsByParent]
  );

  const graphSignature = useMemo(() => layoutNodes.map((node) => node.id).join('|'), [layoutNodes]);

  const handlersRef = useRef({
    onSelectNode: (_id: string) => {},
    onSetStatus: onSetNodeStatus,
    onCheckpoint: (_topicId?: string) => {},
  });

  const openNodeDrawer = useCallback((id: string, tab: 'resources' | 'tutor' = 'resources', query = '') => {
    setSelectedNodeId(id);
    setDrawerTab(tab);
    setDrawerQuery(query);
    setIsDrawerOpen(true);
  }, []);

  handlersRef.current = {
    onSelectNode: (id: string) => openNodeDrawer(id, 'resources'),
    onSetStatus: onSetNodeStatus,
    onCheckpoint: (topicId?: string) => {
      if (!topicId) return;
      openNodeDrawer(
        topicId,
        'tutor',
        'What portfolio projects can I build after completing this milestone?'
      );
    },
  };

  const overlayRef = useRef({ nodeStatuses, bottleneckNodeIds });
  overlayRef.current = { nodeStatuses, bottleneckNodeIds };

  const decorateNodes = useCallback((graphNodes: typeof layoutNodes) => {
    const statuses = overlayRef.current.nodeStatuses;
    const bottlenecks = overlayRef.current.bottleneckNodeIds;
    return graphNodes.map((node) => {
      if (node.type === 'checkpointCard') {
        const data = node.data as LayoutCheckpointData;
        return {
          ...node,
          data: {
            ...data,
            onAction: () => handlersRef.current.onCheckpoint(data.sourceTopicId),
          } as CheckpointNodeData,
        };
      }

      const data = node.data as CustomNodeData;
      const topicId = data.id;
      return {
        ...node,
        data: {
          ...data,
          status: statuses[topicId] || 'not-started',
          isBottleneck: bottlenecks.includes(topicId),
          onSelectNode: (id: string) => handlersRef.current.onSelectNode(id),
          onSetStatus: (id: string, status: NodeStatusType) =>
            handlersRef.current.onSetStatus(id, status),
        } as CustomNodeData,
      };
    });
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(decorateNodes(layoutNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  useEffect(() => {
    setNodes(decorateNodes(layoutNodes));
    setEdges(layoutEdges);
  }, [decorateNodes, graphSignature, layoutEdges, layoutNodes, setEdges, setNodes]);

  useEffect(() => {
    requestAnimationFrame(() => fitView(FIT_VIEW_OPTIONS));
  }, [fitView, graphSignature]);

  // Status / bottleneck badges only — never replace positions or re-run layout.
  useEffect(() => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type !== 'customTopic') return n;
        const nodeData = n.data as CustomNodeData;
        const topicId = nodeData?.id;
        if (!topicId) return n;
        const newStatus = nodeStatuses[topicId] || 'not-started';
        const newBottleneck = bottleneckNodeIds.includes(topicId);
        if (nodeData.status === newStatus && nodeData.isBottleneck === newBottleneck) return n;
        return { ...n, data: { ...nodeData, status: newStatus, isBottleneck: newBottleneck } };
      })
    );
  }, [bottleneckNodeIds, nodeStatuses, setNodes]);

  const selectedSubject: DrawerSubject | null = useMemo(() => {
    if (!selectedNodeId) return null;
    const ontology = nodeMap.get(selectedNodeId);
    if (ontology) return ontology;
    const sub = subtopicMap.get(selectedNodeId);
    if (!sub) return null;
    const parent = nodeMap.get(sub.parent_skill_id);
    return {
      id: sub.id,
      title: sub.title,
      type: 'subtopic',
      est_hours: sub.est_hours,
      description: parent ? `Part of ${parent.title}` : undefined,
      parent_skill_id: sub.parent_skill_id,
    };
  }, [nodeMap, selectedNodeId, subtopicMap]);

  const selectedStatus = selectedNodeId ? nodeStatuses[selectedNodeId] || 'not-started' : 'not-started';
  const selectedExplanation = selectedNodeId ? explanations[selectedNodeId] : undefined;

  const handleAskFloatingTutor = useCallback(
    (query: string) => {
      const targetId = selectedNodeId || milestones[0]?.nodes[0]?.id;
      if (targetId) {
        openNodeDrawer(targetId, 'tutor', query);
      }
    },
    [milestones, openNodeDrawer, selectedNodeId]
  );

  return (
    <div className="relative w-full max-w-[calc(100vw-3rem)] mx-auto h-[calc(100vh-220px)] min-h-[620px] max-h-[960px] bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl overflow-hidden paper-shadow-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        translateExtent={translateExtent}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnScroll={true}
        panOnScrollMode="vertical"
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        autoPanOnNodeDrag={false}
        elevateNodesOnSelect={false}
        onInit={(instance) => {
          instance.fitView(FIT_VIEW_OPTIONS);
        }}
        proOptions={{ hideAttribution: true }}
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
        <CanvasZoomControls />
      </ReactFlow>

      <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-[10px] text-[#7A6553] font-medium bg-[#FFF9F0]/90 border border-[#E6DCCF] px-3 py-1 rounded-full pointer-events-none select-none z-10">
        Use mouse wheel to zoom · Two-finger scroll pans vertically · Click a node to explore
      </div>

      <FloatingTutorBar
        onAskQuestion={handleAskFloatingTutor}
        selectedNodeTitle={selectedSubject?.title}
      />

      <NodeDetailDrawer
        node={selectedSubject}
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

export const RoadmapCanvas: React.FC<RoadmapCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <RoadmapCanvasInner {...props} />
    </ReactFlowProvider>
  );
};
