'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Compass, ArrowRight, Lock, Mail, User, AlertCircle, CheckCircle } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const registerRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      // Automatically sign in after signup
      const signInRes = await signIn('credentials', {
        redirect: false,
        email,
        password,
        callbackUrl: '/onboarding',
      });

      if (signInRes?.error) {
        setError(signInRes.error);
      } else {
        router.push('/onboarding');
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[#4A3728] text-white flex items-center justify-center mx-auto shadow-md">
          <Compass className="w-6 h-6 text-[#C96F4A]" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-[#4A3728]">Create an Account</h1>
        <p className="text-xs text-[#7A6553] font-medium">
          Start building deterministic, AI-explained roadmaps customized to your pace.
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
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#B58B65] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                className="w-full bg-[#FFFFFF] border border-[#E6DCCF] focus:border-[#C96F4A] rounded-xl pl-10 pr-4 py-3 text-xs text-[#4A3728] font-medium outline-none transition-all shadow-inner"
              />
            </div>
          </div>

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
              Password (min. 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#B58B65] absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                minLength={6}
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
            {isLoading ? 'Creating Account...' : 'Get Started'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-[#7A6553]">
        Already have an account?{' '}
        <Link href="/auth/signin" className="text-[#C96F4A] font-bold hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}
