'use client';

import { Suspense } from 'react';

export function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[300px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
      {children}
    </Suspense>
  );
}
