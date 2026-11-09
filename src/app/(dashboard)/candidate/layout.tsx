import type { Metadata } from 'next';
import Link from 'next/link';
import { Wordmark } from '@/components/brand';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'AI Skills Practice — Candidate Portal',
  description: 'Practice and readiness assessment for AI skills — candidate portal.',
};

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Wordmark href="/candidate" size="sm" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Candidate portal
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-5 text-center text-xs text-muted-foreground">
        AI Skills Practice, a practice tool from AI Native Organisations. No qualification or
        certificate is issued.{' '}
        <Link href="/disclaimer" className="underline underline-offset-2 hover:text-primary">
          Disclaimer
        </Link>
      </footer>
      <Toaster position="top-right" />
    </div>
  );
}
