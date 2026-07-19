import { User } from '../models/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        walletAddress: string;
        username?: string;
        displayName?: string;
        telegramConnected: boolean;
        favoriteTeams: string[];
        notificationsEnabled: boolean;
      };
    }
  }
}

export {};
