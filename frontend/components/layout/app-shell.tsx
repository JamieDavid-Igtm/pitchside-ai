'use client';

import { ReactNode } from 'react';
import { BottomNav } from './bottom-nav';
import { AppHeader } from './app-header';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-midnight">
      <AppHeader />
      <main className="pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
