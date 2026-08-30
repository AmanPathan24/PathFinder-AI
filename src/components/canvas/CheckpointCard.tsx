'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Sparkles, Trophy, ArrowRight } from 'lucide-react';

export interface CheckpointNodeData {
  milestoneIndex: number;
  title: string;
  description: string;
  buttonLabel?: string;
  onAction?: () => void;
  [key: string]: unknown;
}

export const CheckpointCard = memo(({ data }: NodeProps<any>) => {
  const {
    milestoneIndex,
    title,
    description,
    buttonLabel = 'Explore Checkpoint Projects',
    onAction,
  } = data as CheckpointNodeData;

  return (
    <div className="box-border bg-[#FFF9F0] border-2 border-[#C96F4A]/40 rounded-3xl p-5 w-96 h-[176px] overflow-hidden shadow-lg space-y-3 text-[#4A3728]">
      <Handle type="target" position={Position.Top} id="top" className="!w-2.5 !h-2.5 !bg-[#4A3728]" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-2.5 !h-2.5 !bg-[#C96F4A]" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-[#C96F4A] text-white flex items-center justify-center text-[10px] font-bold">
            M{milestoneIndex}
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A85331] flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#C96F4A]" /> Checkpoint Reached
          </span>
        </div>
        <Trophy className="w-4 h-4 text-[#8C9A76]" />
      </div>

      <div>
        <h4 className="font-serif font-bold text-sm sm:text-base text-[#4A3728]">{title}</h4>
        <p className="text-xs text-[#7A6553] mt-1 leading-relaxed">{description}</p>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="w-full py-2.5 bg-[#FFFFFF] hover:bg-[#F0E8DC] border border-[#E6DCCF] text-[#4A3728] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          {buttonLabel}
          <ArrowRight className="w-3.5 h-3.5 text-[#C96F4A]" />
        </button>
      )}
    </div>
  );
});

CheckpointCard.displayName = 'CheckpointCard';
