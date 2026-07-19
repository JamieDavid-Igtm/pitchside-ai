import axios from 'axios';
import { config } from '../config/env.js';
import { TxLINEFixture, TxLINEScoreUpdate, TxLINEOddsUpdate, MatchStatus } from '../types/index.js';

const httpClient = axios.create({
  timeout: 30000,
  baseURL: config.txlineApiOrigin,
});

let guestJwt = config.txlineGuestJwt;
let apiToken = config.txlineApiToken;
let isConnected = false;

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (guestJwt) {
    headers['Authorization'] = `Bearer ${guestJwt}`;
  }
  if (apiToken) {
    headers['X-Api-Token'] = apiToken;
  }
  return headers;
}

function mapGameStateToStatus(gameState: number): MatchStatus {
  const map: Record<number, MatchStatus> = {
    1: 'scheduled', 2: 'live', 3: 'halftime', 4: 'live', 5: 'fulltime',
    6: 'cancelled', 7: 'live', 8: 'halftime', 9: 'live', 10: 'fulltime',
    11: 'live', 12: 'live', 13: 'fulltime', 14: 'live', 15: 'cancelled',
    16: 'cancelled', 17: 'cancelled', 18: 'scheduled', 19: 'postponed',
  };
  return map[gameState] || 'scheduled';
}

function normalizeFixture(fixture: TxLINEFixture) {
  const homeTeam = fixture.Participant1IsHome ? fixture.Participant1 : fixture.Participant2;
  const awayTeam = fixture.Participant1IsHome ? fixture.Participant2 : fixture.Participant1;
  return {
    txlineMatchId: String(fixture.FixtureId),
    competition: fixture.Competition || 'Unknown Competition',
    status: mapGameStateToStatus(fixture.GameState),
    kickoffTime: new Date(fixture.StartTime),
    homeTeam,
    awayTeam,
    homeScore: 0,
    awayScore: 0,
  };
}

export async function ensureAuthenticated(): Promise<boolean> {
  if (guestJwt && apiToken) {
    return true;
  }

  try {
    console.log('Starting TxLINE guest authentication...');
    const authResponse = await httpClient.post('/auth/guest/start');
    guestJwt = authResponse.data.token;

    if (!guestJwt) {
      console.error('Failed to get guest JWT from TxLINE');
      return false;
    }

    console.log('TxLINE guest JWT obtained');
    isConnected = true;
    return true;
  } catch (error) {
    console.error('TxLINE authentication failed:', error);
    isConnected = false;
    return false;
  }
}

export async function activateApiToken(txSig: string, walletSignature: string, leagues: number[] = []): Promise<boolean> {
  try {
    if (!guestJwt) {
      console.error('No guest JWT available for activation');
      return false;
    }

    const response = await httpClient.post('/token/activate', {
      txSig,
      walletSignature,
      leagues,
    }, {
      headers: getAuthHeaders(),
    });

    apiToken = response.data.token || response.data;
    console.log('TxLINE API token activated successfully');
    return true;
  } catch (error) {
    console.error('TxLINE API token activation failed:', error);
    return false;
  }
}

export class TxLINEClient {
  async getFixtures(): Promise<TxLINEFixture[]> {
    if (!guestJwt) {
      console.warn('TxLINE not authenticated, skipping fixtures fetch');
      return [];
    }

    try {
      const response = await httpClient.get('/api/fixtures/snapshot', {
        headers: getAuthHeaders(),
      });
      isConnected = true;
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      console.warn('Unexpected fixtures response format:', typeof data);
      return [];
    } catch (error) {
      console.error('Failed to fetch fixtures:', error);
      isConnected = false;
      return [];
    }
  }

  async getScoresSnapshot(fixtureId: number) {
    try {
      const response = await httpClient.get(`/api/scores/snapshot/${fixtureId}`, {
        headers: getAuthHeaders(),
      });
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch scores for fixture ${fixtureId}:`, error);
      return [];
    }
  }

  async getOddsSnapshot(fixtureId: number) {
    try {
      const response = await httpClient.get(`/api/odds/snapshot/${fixtureId}`, {
        headers: getAuthHeaders(),
      });
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch odds for fixture ${fixtureId}:`, error);
      return [];
    }
  }

  async *streamScores() {
    if (!guestJwt) {
      console.warn('TxLINE not authenticated, skipping scores stream');
      return;
    }

    try {
      const response = await fetch(`${config.txlineApiOrigin}/api/scores/stream`, {
        headers: {
          ...getAuthHeaders(),
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok || !response.body) {
        console.error('Scores stream failed:', response.status);
        return;
      }

      isConnected = true;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch {
                // skip non-JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Scores stream error:', error);
      isConnected = false;
    }
  }

  async *streamOdds() {
    if (!guestJwt) {
      console.warn('TxLINE not authenticated, skipping odds stream');
      return;
    }

    try {
      const response = await fetch(`${config.txlineApiOrigin}/api/odds/stream`, {
        headers: {
          ...getAuthHeaders(),
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok || !response.body) {
        console.error('Odds stream failed:', response.status);
        return;
      }

      isConnected = true;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);
                yield parsed;
              } catch {
                // skip non-JSON
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Odds stream error:', error);
      isConnected = false;
    }
  }

  isConnected(): boolean {
    return isConnected;
  }
}

export const txlineClient = new TxLINEClient();
