import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'AI-SAMS Candidate Portal',
  description: 'AI Skill Assessment Management System - Candidate Portal',
};

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AI</span>
            </div>
            <span className="font-semibold text-sm hidden sm:inline">AI-SAMS</span>
            <span className="text-slate-400 mx-2">|</span>
            <span className="text-sm text-slate-600 dark:text-slate-400">Candidate Portal</span>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-slate-500">
        AI-SAMS v1.0 - AI Skill Assessment Management System
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}
