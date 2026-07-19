export interface AuthUser {
  _id: string;
  walletAddress: string;
  username?: string;
  displayName?: string;
  telegramConnected: boolean;
  favoriteTeams: string[];
  notificationsEnabled: boolean;
}

export interface AuthChallenge {
  challenge: string;
  message: string;
}

export interface AuthVerifyResponse {
  token: string;
  user: AuthUser;
}
