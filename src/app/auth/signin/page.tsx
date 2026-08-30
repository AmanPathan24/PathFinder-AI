'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Compass, Sparkles, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/path';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl,
      });

      if (res?.error) {
        setError(res.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail('demo@pathfinder.ai');
    setPassword('password123');
    setIsLoading(true);
    setError(null);

    const res = await signIn('credentials', {
      redirect: false,
      email: 'demo@pathfinder.ai',
      password: 'password123',
      callbackUrl,
    });

    if (res?.error) {
      setError(res.error);
      setIsLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#4A3728] text-white flex items-center justify-center mx-auto shadow-md">
          <Compass className="w-6 h-6 text-[#C96F4A]" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A3728]">Welcome Back</h1>
        <p className="text-xs text-[#7A6553] font-medium">
          Sign in to access your multi-track roadmaps and learning analytics.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-[#FFF9F0] border border-[#E6DCCF] rounded-3xl p-7 space-y-6 paper-shadow-lg">
        {error && (
          <div className="bg-[#C96F4A]/10 border border-[#C96F4A]/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-[#A85331] font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3728] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#B58B65] absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-[#FFFFFF] border border-[#E6DCCF] focus:border-[#C96F4A] rounded-xl pl-10 pr-4 py-3 text-xs text-[#4A3728] font-medium outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4A3728] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#B58B65] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FFFFFF] border border-[#E6DCCF] focus:border-[#C96F4A] rounded-xl pl-10 pr-4 py-3 text-xs text-[#4A3728] font-medium outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#C96F4A] hover:bg-[#A85331] text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#E6DCCF] w-full" />
          <span className="bg-[#FFF9F0] px-3 text-[11px] font-bold text-[#7A6553] uppercase tracking-wider shrink-0">
            Or quick demo
          </span>
          <div className="border-t border-[#E6DCCF] w-full" />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading}
          className="w-full py-3 bg-[#E4EAD9] hover:bg-[#D5DFCA] text-[#4A3728] border border-[#8C9A76]/40 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-[#8C9A76]" />
          Instant Demo Sign In (Alex Mercer)
        </button>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#7A6553]">
        Don't have an account?{' '}
        <Link href="/auth/signup" className="text-[#C96F4A] font-bold hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-20 text-center text-xs text-[#7A6553]">
          Loading sign in form...
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
