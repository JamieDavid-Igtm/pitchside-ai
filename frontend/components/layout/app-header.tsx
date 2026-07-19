'use client';

import { WalletButton } from '@/components/wallet/wallet-button';

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-midnight/95 backdrop-blur-sm">
      <div className="mx-auto flex h-[64px] max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-pitch" />
          <h1 className="font-heading text-lg font-bold text-primary">PitchSide AI</h1>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
