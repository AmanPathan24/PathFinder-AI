'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { usePath } from '@/context/PathContext';
import {
  Compass,
  Target,
  GitFork,
  LayoutDashboard,
  ChevronDown,
  Plus,
  Archive,
  User,
  LogOut,
  Sparkles,
  Layers,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    roadmaps,
    activeRoadmap,
    setActiveRoadmapId,
    archiveActiveRoadmap,
  } = usePath();

  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [isUserOpen, setIsUserOpen] = useState(false);

  const navItems = [
    { label: 'Intake', href: '/', icon: Compass },
    { label: 'Onboarding', href: '/onboarding', icon: Target },
    { label: 'Learning Path', href: '/path', icon: GitFork },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFF9F0]/95 backdrop-blur-md border-b border-[#E6DCCF] text-[#4A3728]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Roadmap Switcher */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#4A3728] flex items-center justify-center shadow-md text-[#FFF9F0] group-hover:scale-105 transition-all">
              <Compass className="w-5 h-5 text-[#C96F4A]" />
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight font-serif text-[#4A3728] block leading-none">
                PathFinder
              </span>
              <span className="text-[10px] uppercase font-bold text-[#C96F4A] tracking-widest block mt-0.5">
                Warm Editorial AI
              </span>
            </div>
          </Link>

          {/* Roadmap Switcher Dropdown */}
          <div className="relative hidden lg:block">
            <button
              type="button"
              onClick={() => setIsRoadmapOpen(!isRoadmapOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F0E8DC] border border-[#E6DCCF] rounded-xl text-xs font-semibold transition-all shadow-sm max-w-[220px]"
            >
              <Layers className="w-3.5 h-3.5 text-[#C96F4A] shrink-0" />
              <span className="truncate text-[#4A3728]">
                {activeRoadmap ? activeRoadmap.title : 'Select Roadmap'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#7A6553] shrink-0 ml-auto" />
            </button>

            {isRoadmapOpen && (
              <div
                className="absolute left-0 mt-2 w-72 bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-2"
                onMouseLeave={() => setIsRoadmapOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#7A6553] uppercase tracking-wider">
                  Your Roadmaps ({roadmaps.length})
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {roadmaps.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setActiveRoadmapId(r.id);
                        setIsRoadmapOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all ${
                        activeRoadmap?.id === r.id
                          ? 'bg-[#C96F4A] text-white font-bold shadow-sm'
                          : 'hover:bg-[#FFFFFF] text-[#4A3728]'
                      }`}
                    >
                      <span className="truncate">{r.title}</span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-md uppercase font-bold shrink-0 ml-2 ${
                          activeRoadmap?.id === r.id
                            ? 'bg-white/20 text-white'
                            : 'bg-[#E4EAD9] text-[#4A3728]'
                        }`}
                      >
                        {r.target_track}
                      </span>
                    </button>
                  ))}

                  {roadmaps.length === 0 && (
                    <div className="text-xs text-[#7A6553] px-3 py-2 italic">
                      No roadmaps yet. Create one via Intake!
                    </div>
                  )}
                </div>

                <div className="border-t border-[#E6DCCF] pt-1.5 mt-1.5 flex items-center justify-between px-1">
                  <Link
                    href="/"
                    onClick={() => setIsRoadmapOpen(false)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-[#C96F4A] hover:text-[#A85331] px-2 py-1 rounded-lg hover:bg-white transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Track
                  </Link>

                  {activeRoadmap && (
                    <button
                      type="button"
                      onClick={() => {
                        archiveActiveRoadmap();
                        setIsRoadmapOpen(false);
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#7A6553] hover:text-[#A85331] px-2 py-1 rounded-lg hover:bg-white transition-all"
                    >
                      <Archive className="w-3 h-3" /> Archive
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center/Right: Navigation Links & User Menu */}
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-[#C96F4A] text-white shadow-md'
                      : 'text-[#7A6553] hover:text-[#4A3728] hover:bg-[#F0E8DC]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#8C9A76]'}`} />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Auth Menu */}
          <div className="relative">
            {session?.user ? (
              <div>
                <button
                  type="button"
                  onClick={() => setIsUserOpen(!isUserOpen)}
                  className="flex items-center gap-2 p-1.5 bg-[#FFFFFF] hover:bg-[#F0E8DC] border border-[#E6DCCF] rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#8C9A76] text-white flex items-center justify-center font-bold text-xs">
                    {session.user.name ? session.user.name[0].toUpperCase() : 'U'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#7A6553] hidden sm:inline" />
                </button>

                {isUserOpen && (
                  <div
                    className="absolute right-0 mt-2 w-52 bg-[#FFF9F0] border border-[#E6DCCF] rounded-2xl shadow-xl p-3 z-50 space-y-2 animate-in fade-in slide-in-from-top-2"
                    onMouseLeave={() => setIsUserOpen(false)}
                  >
                    <div className="border-b border-[#E6DCCF] pb-2">
                      <div className="font-bold text-xs text-[#4A3728] truncate">
                        {session.user.name || 'User'}
                      </div>
                      <div className="text-[10px] text-[#7A6553] truncate">
                        {session.user.email}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => signOut({ callbackUrl: '/' })}
                      className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs text-[#A85331] font-semibold hover:bg-white rounded-lg transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/signin"
                  className="px-3.5 py-2 bg-[#FFFFFF] hover:bg-[#F0E8DC] text-[#4A3728] border border-[#E6DCCF] text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="hidden md:inline-flex px-3.5 py-2 bg-[#C96F4A] hover:bg-[#A85331] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
