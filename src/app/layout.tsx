import type { Metadata } from 'next';
import './globals.css';
import { PathProvider } from '@/context/PathContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'PathFinder — AI-Powered Personalized Learning Path Recommender',
  description: 'Structured, explainable learning roadmap generated using pure DAG graph algorithms and grounded LLM explanations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-teal-500 selection:text-slate-950">
        <PathProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
            PathFinder AI Engine • Graph Algorithm DAG Logic + Grounded LLM Explanations
          </footer>
        </PathProvider>
      </body>
    </html>
  );
}
