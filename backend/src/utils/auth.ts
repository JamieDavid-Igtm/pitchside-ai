import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import tweetnacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';
import { config } from '../config/env.js';
import { User } from '../models/index.js';

interface ChallengeRecord {
  challenge: string;
  message: string;
  expiresAt: Date;
}

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

// In-memory challenge store. Single instance is fine for MVP deployment.
const challenges = new Map<string, ChallengeRecord>();

export function generateChallenge(walletAddress: string): { challenge: string; message: string } {
  const challenge = crypto.randomBytes(32).toString('hex');
  const message = [
    'PitchSide AI wants you to sign in.',
    '',
    'Sign this message to prove you own this wallet.',
    `Challenge: ${challenge}`,
    '',
    'This request will not trigger a blockchain transaction or cost any gas fees.',
  ].join('\n');

  challenges.set(walletAddress, {
    challenge,
    message,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  return { challenge, message };
}

export function isValidSolanaAddress(walletAddress: string): boolean {
  try {
    new PublicKey(walletAddress);
    return true;
  } catch {
    return false;
  }
}

export async function verifySignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  const record = challenges.get(walletAddress);
  if (!record) return false;
  if (record.message !== message) return false;
  if (new Date() > record.expiresAt) {
    challenges.delete(walletAddress);
    return false;
  }
  challenges.delete(walletAddress);

  try {
    const publicKey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');
    if (signatureBytes.length !== tweetnacl.sign.signatureLength) return false;
    return tweetnacl.sign.detached.verify(messageBytes, signatureBytes, publicKey.toBytes());
  } catch {
    return false;
  }
}

export async function getOrCreateUser(walletAddress: string) {
  let user = await User.findOne({ walletAddress });
  if (!user) {
    user = await User.create({ walletAddress });
  }
  user.lastLogin = new Date();
  await user.save();
  return user;
}

export interface AuthUserPayload {
  _id: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  telegramConnected: boolean;
  favoriteTeams: string[];
  notificationsEnabled: boolean;
}

export function toAuthUser(user: {
  _id: { toString(): string };
  walletAddress: string;
  username?: string;
  displayName?: string;
  telegramConnected: boolean;
  favoriteTeams: string[];
  notificationsEnabled: boolean;
}): AuthUserPayload {
  return {
    _id: user._id.toString(),
    walletAddress: user.walletAddress,
    username: user.username,
    displayName: user.displayName,
    telegramConnected: user.telegramConnected,
    favoriteTeams: user.favoriteTeams,
    notificationsEnabled: user.notificationsEnabled,
  };
}

export function generateJWT(user: { _id: { toString(): string }; walletAddress: string }): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      walletAddress: user.walletAddress,
      issuedAt: new Date().toISOString(),
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  );
}

export function verifyJWT(token: string): { userId: string; walletAddress: string } | null {
  try {
    const payload = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      walletAddress: string;
    };
    return { userId: payload.userId, walletAddress: payload.walletAddress };
  } catch {
    return null;
  }
}
