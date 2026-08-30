'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Target, GitFork, LayoutDashboard } from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Intake', href: '/', icon: Compass },
    { label: 'Onboarding', href: '/onboarding', icon: Target },
    { label: 'Learning Path', href: '/path', icon: GitFork },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FFF9F0]/90 backdrop-blur-md border-b border-[#E6DCCF] text-[#4A3728]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
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
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
