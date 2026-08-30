'use client';

import React from 'react';
import { PaceAnalysis } from '@/types/roadmap';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Zap,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

interface PaceCardProps {
  pace: PaceAnalysis;
}

export const PaceCard: React.FC<PaceCardProps> = ({ pace }) => {
  const {
    actual_hours_logged,
    total_est_hours,
    current_weekly_pace,
    required_weekly_pace,
    pace_status,
    hours_variance,
    projected_completion_date,
    time_budget_weeks,
  } = pace;

  const getStatusBadge = () => {
    switch (pace_status) {
      case 'ahead':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#E4EAD9] text-[#4A3728] border border-[#8C9A76]/40">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8C9A76]" />
            Ahead of Schedule (+{hours_variance}h)
          </span>
        );
      case 'behind':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#C96F4A]/15 text-[#A85331] border border-[#C96F4A]/30">
            <AlertCircle className="w-3.5 h-3.5 text-[#C96F4A]" />
            Behind Schedule ({hours_variance}h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#F0E8DC] text-[#4A3728] border border-[#E6DCCF]">
            <TrendingUp className="w-3.5 h-3.5 text-[#B58B65]" />
            On Track ({current_weekly_pace}h / wk)
          </span>
        );
    }
  };

  return (
    <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-6 sm:p-8 space-y-6 paper-shadow-lg relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6DCCF] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-serif text-[#4A3728] font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#C96F4A]" />
              Study Pace & Velocity Forecast
            </h3>
          </div>
          <p className="text-xs text-[#7A6553] mt-0.5 font-medium">
            Calculated from active roadmap study hours (known-prior skills are excluded from logged time).
          </p>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Current Weekly Velocity */}
        <div className="bg-[#FFFFFF] border border-[#E6DCCF] rounded-2xl p-5 space-y-1 paper-shadow">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#7A6553]">
            <span>Current Velocity</span>
            <Clock className="w-4 h-4 text-[#C96F4A]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#4A3728]">
            {current_weekly_pace} <span className="text-sm font-sans font-semibold text-[#7A6553]">hrs/wk</span>
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium pt-1">
            Target required: <strong className="text-[#4A3728]">{required_weekly_pace} hrs/wk</strong>
          </p>
        </div>

        {/* Total Active Hours Logged */}
        <div className="bg-[#FFFFFF] border border-[#E6DCCF] rounded-2xl p-5 space-y-1 paper-shadow">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#7A6553]">
            <span>Active Study Hours</span>
            <TrendingUp className="w-4 h-4 text-[#8C9A76]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#4A3728]">
            {actual_hours_logged} <span className="text-sm font-sans font-semibold text-[#7A6553]">/ {total_est_hours}h</span>
          </div>
          <div className="w-full bg-[#E6DCCF] h-2 rounded-full overflow-hidden mt-2">
            <div
              className="bg-[#8C9A76] h-full transition-all rounded-full"
              style={{
                width: `${total_est_hours > 0 ? Math.min(100, Math.round((actual_hours_logged / total_est_hours) * 100)) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Projected Finish Date */}
        <div className="bg-[#FFFFFF] border border-[#E6DCCF] rounded-2xl p-5 space-y-1 paper-shadow">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#7A6553]">
            <span>Projected Completion</span>
            <Calendar className="w-4 h-4 text-[#B58B65]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#4A3728]">
            {projected_completion_date}
          </div>
          <p className="text-[11px] text-[#7A6553] font-medium pt-1">
            Based on current velocity over {time_budget_weeks} weeks budget
          </p>
        </div>
      </div>
    </div>
  );
};
