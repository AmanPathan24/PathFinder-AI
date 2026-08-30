import type { Metadata } from 'next';
import './globals.css';
import { PathProvider } from '@/context/PathContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'PathFinder — AI-Powered Personalized Learning Path Recommender',
  description: 'Structured, explainable learning roadmaps built on graph DAG algorithms and grounded AI explanations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#F7F1E7] text-[#4A3728] min-h-screen flex flex-col antialiased selection:bg-[#C96F4A] selection:text-white">
        <PathProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
          <footer className="border-t border-[#E6DCCF] bg-[#FFF9F0] py-6 text-center text-xs text-[#7A6553] font-medium">
            PathFinder &bull; Warm Editorial Tech Design Engine &bull; Pure DAG Graph Algorithm
          </footer>
        </PathProvider>
      </body>
    </html>
  );
}
