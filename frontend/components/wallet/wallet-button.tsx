'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletConnectButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, LogOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fetchAuthChallenge, verifyAuthSignature } from '@/services/api';
import { shortenAddress } from '@/utils/shorten-address';

const TOKEN_KEY = 'pitchside_token';
const ADDRESS_KEY = 'pitchside_wallet';

export function WalletButton() {
  const { publicKey, connected, connecting, disconnect, signMessage } = useWallet();
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const authenticatingRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const storedAddress = localStorage.getItem(ADDRESS_KEY);
    if (token && storedAddress) {
      setAuthed(true);
      setAddress(storedAddress);
    }
  }, []);

  useEffect(() => {
    async function authenticate() {
      if (!connected || !publicKey || !signMessage) return;
      if (authenticatingRef.current || authed) return;

      authenticatingRef.current = true;
      setLoading(true);

      try {
        const walletAddress = publicKey.toBase58();
        const { message } = await fetchAuthChallenge(walletAddress);
        const messageBytes = new TextEncoder().encode(message);
        const signature = await signMessage(messageBytes);
        const signatureBase64 = Buffer.from(signature).toString('base64');
        const { token } = await verifyAuthSignature(walletAddress, signatureBase64, message);

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(ADDRESS_KEY, walletAddress);
        setAuthed(true);
        setAddress(walletAddress);
      } catch (err) {
        console.error('Wallet authentication failed:', err);
        try {
          await disconnect();
        } catch {
          /* ignore */
        }
      } finally {
        setLoading(false);
        authenticatingRef.current = false;
      }
    }

    authenticate();
  }, [connected, publicKey, signMessage, authed, disconnect]);

  function handleDisconnect() {
    try {
      disconnect();
    } catch {
      /* ignore */
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADDRESS_KEY);
    setAuthed(false);
    setAddress(null);
  }

  if (authed && address) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-pitch/30 bg-pitch/5 px-3 py-1.5">
          <span className="h-2 w-2 rounded-full bg-pitch" />
          <span className="font-mono text-sm text-secondary">{shortenAddress(address)}</span>
        </div>
        <button
          onClick={handleDisconnect}
          aria-label="Disconnect wallet"
          className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-muted transition-colors hover:text-danger"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden text-sm sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <WalletConnectButton className="!bg-pitch !text-midnight !rounded-xl !px-4 !py-2 !text-sm !font-semibold !border-0 hover:!opacity-90" />
      {loading && (
        <span className="flex items-center gap-1 text-xs text-muted">
          <Wallet className="h-3.5 w-3.5" />
          Signing in…
        </span>
      )}
    </div>
  );
}
