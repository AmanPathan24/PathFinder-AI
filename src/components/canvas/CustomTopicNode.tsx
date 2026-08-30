'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  CheckCircle2,
  Award,
  BookOpen,
  AlertTriangle,
  Circle,
  Clock,
  Zap,
} from 'lucide-react';
import { NodeStatusType } from '@/types/roadmap';

export interface CustomNodeData {
  id: string;
  title: string;
  type: string;
  difficulty?: number;
  est_hours: number;
  description?: string;
  status: NodeStatusType;
  isMainPath?: boolean;
  isSibling?: boolean;
  isSubtopic?: boolean;
  isBottleneck?: boolean;
  onSelectNode?: (nodeId: string) => void;
  onSetStatus?: (nodeId: string, status: NodeStatusType) => void;
  [key: string]: unknown;
}

export const CustomTopicNode = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = data as CustomNodeData;
  const {
    id,
    title,
    type,
    difficulty,
    est_hours,
    status = 'not-started',
    isMainPath,
    isSubtopic,
    isBottleneck,
    onSelectNode,
    onSetStatus,
  } = nodeData;

  const [showMenu, setShowMenu] = useState(false);

  // Status Badge Rendering
  const renderStatusBadge = () => {
    switch (status) {
      case 'done':
        return (
          <span
            title="Mastered in roadmap"
            className="w-6 h-6 rounded-full bg-[#8C9A76] text-white flex items-center justify-center shadow-md ring-2 ring-white"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </span>
        );
      case 'known-prior':
        return (
          <span
            title="Known Prior (Mastered beforehand)"
            className="w-6 h-6 rounded-full bg-[#B58B65] text-white flex items-center justify-center shadow-md ring-2 ring-white"
          >
            <Award className="w-3.5 h-3.5" />
          </span>
        );
      case 'learning':
        return (
          <span
            title="Currently Learning"
            className="w-6 h-6 rounded-full bg-[#C96F4A] text-white flex items-center justify-center shadow-md ring-2 ring-white"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </span>
        );
      case 'skipped':
        return (
          <span
            title="Skipped"
            className="w-6 h-6 rounded-full bg-[#7A6553]/70 text-white flex items-center justify-center shadow-md ring-2 ring-white"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return (
          <span
            title="Not Started"
            className="w-5 h-5 rounded-full bg-white border-2 border-[#E6DCCF] text-[#7A6553] flex items-center justify-center"
          >
            <Circle className="w-2.5 h-2.5 text-transparent" />
          </span>
        );
    }
  };

  // Status only changes color — never ring/opacity/size that would reflow the graph.
  const getBorderColor = () => {
    if (selected) return 'border-[#C96F4A] bg-white';
    if (status === 'done') return 'border-[#8C9A76] bg-[#F2F6ED]';
    if (status === 'known-prior') return 'border-[#B58B65] bg-[#F9F5EF]';
    if (status === 'learning') return 'border-[#C96F4A] bg-white';
    if (status === 'skipped') return 'border-[#D1C5B4] bg-[#F7F1E7]';
    if (isMainPath) return 'border-[#4A3728] bg-white';
    if (isSubtopic) return 'border-dashed border-[#B58B65]/70 bg-[#FFFDF9]';
    return 'border-[#E6DCCF] bg-white';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(!showMenu);
  };

  const handleAction = (newStatus: NodeStatusType) => {
    if (onSetStatus) {
      onSetStatus(id, newStatus);
    }
    setShowMenu(false);
  };

  return (
    <div
      onClick={() => onSelectNode?.(id)}
      onContextMenu={handleContextMenu}
      className={`relative box-border rounded-2xl border-2 cursor-pointer select-none ${getBorderColor()} ${
        isSubtopic
          ? 'p-3 w-56 h-[90px] shadow-sm'
          : isMainPath
          ? 'p-4 w-80 h-[152px] shadow-md'
          : 'p-3.5 w-64 h-[152px] shadow-sm'
      }`}
    >
      {/* Handles for Flow connections */}
      <Handle type="target" position={Position.Top} id="top" className="!w-2.5 !h-2.5 !bg-[#4A3728]" />
      <Handle type="target" position={Position.Left} id="left" className="!w-2.5 !h-2.5 !bg-[#4A3728]" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !bg-[#C96F4A]" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2.5 !h-2.5 !bg-[#C96F4A]" />

      {/* Top Overlay: Status Badge (corner) + Bottleneck indicator */}
      <div className="absolute -top-3 -right-3 z-10 flex items-center gap-1">
        {isBottleneck && (
          <span
            title="⚡ Critical Bottleneck Skill: Unlocks multiple downstream paths"
            className="px-2 py-0.5 rounded-full bg-[#C96F4A] text-white text-[9px] font-bold shadow-md flex items-center gap-1 uppercase tracking-wider"
          >
            <Zap className="w-2.5 h-2.5 fill-current" />
            Bottleneck
          </span>
        )}
        {renderStatusBadge()}
      </div>

      {/* Node Content */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              type === 'project'
                ? 'bg-[#C96F4A]/15 text-[#A85331] border border-[#C96F4A]/30'
                : isSubtopic
                ? 'bg-[#B58B65]/10 text-[#7A6553]'
                : 'bg-[#E6DCCF] text-[#4A3728]'
            }`}
          >
            {type}
          </span>

          <div className="flex items-center gap-1 text-[10px] text-[#7A6553] font-semibold">
            <Clock className="w-3 h-3 text-[#B58B65]" />
            {est_hours}h
            {difficulty && <span>&bull; L{difficulty}</span>}
          </div>
        </div>

        <h3
          className={`font-serif font-bold text-[#4A3728] leading-snug line-clamp-2 ${
            isSubtopic ? 'text-xs' : 'text-sm sm:text-base'
          }`}
        >
          {title}
        </h3>

        {/* Status Indicator Label */}
        <div className="pt-1 flex items-center justify-between text-[10px] font-medium text-[#7A6553]">
          <span className="capitalize font-semibold">
            {status === 'known-prior'
              ? '★ Known Prior'
              : status === 'done'
              ? '✓ Mastered'
              : status === 'learning'
              ? '● In Progress'
              : status === 'skipped'
              ? '⊘ Skipped'
              : '○ Click to view'}
          </span>
          <button
            type="button"
            aria-label="Set status"
            className="nodrag nopan text-[9px] text-[#C96F4A] font-bold hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu((open) => !open);
            }}
          >
            Status
          </button>
        </div>
      </div>

      {/* Quick Context Menu on Right Click */}
      {showMenu && (
        <div
          className="absolute left-0 top-full mt-2 w-48 bg-[#FFF9F0] border border-[#E6DCCF] rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseLeave={() => setShowMenu(false)}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7A6553] border-b border-[#E6DCCF]">
            Set Node Status
          </div>
          <button
            onClick={() => handleAction('learning')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A3728] hover:bg-[#F0E8DC] flex items-center gap-2"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C96F4A]" /> Learning
          </button>
          <button
            onClick={() => handleAction('done')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A3728] hover:bg-[#F0E8DC] flex items-center gap-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8C9A76]" /> Done (Mastered)
          </button>
          <button
            onClick={() => handleAction('known-prior')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#4A3728] hover:bg-[#F0E8DC] flex items-center gap-2"
          >
            <Award className="w-3.5 h-3.5 text-[#B58B65]" /> Mark as Known Prior
          </button>
          <button
            onClick={() => handleAction('skipped')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#7A6553] hover:bg-[#F0E8DC] flex items-center gap-2"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#7A6553]" /> Skip Node
          </button>
        </div>
      )}
    </div>
  );
});

CustomTopicNode.displayName = 'CustomTopicNode';
