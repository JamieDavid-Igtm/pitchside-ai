/**
 * TxLINE Devnet Free-Tier Activation (fully automated, no Phantom / no manual copy-paste)
 *
 * Subscribes on-chain (service level 1, devnet) and activates an API token using a
 * local Solana CLI / ANCHOR_WALLET keypair. Uses the OFFICIAL devnet IDL and the exact
 * on-chain `subscribe` instruction, PDA derivations, account layout and activation
 * message format published by TxLINE.
 *
 *   Activation message (empty leagues):  `${txSig}::${jwt}`
 *   Signature: base64-encoded detached Ed25519 signature (tweetnacl)
 *
 * Run:
 *   ANCHOR_WALLET=~/.config/solana/id.json npx tsx scripts/txline-cli-activate.ts
 *
 * Env overrides:
 *   TXLINE_DEVNET_RPC   (default https://api.devnet.solana.com)
 *   TXLINE_API_ORIGIN   (default https://txline-dev.txodds.com)
 *   TXLINE_SERVICE_LEVEL (default 1)
 *   TXLINE_WEEKS        (default 4, must be a multiple of 4)
 */

import * as anchor from '@coral-xyz/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as os from 'os';
import axios from 'axios';
import * as tweetnacl from 'tweetnacl';
const nacl: any = (tweetnacl as any).default ?? tweetnacl;

const idl = JSON.parse(
  fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), 'txoracle.devnet.json'),
    'utf8'
  )
);

const NETWORK = 'devnet';
const RPC_URL = process.env.TXLINE_DEVNET_RPC || 'https://api.devnet.solana.com';
const API_ORIGIN = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com';
const API_BASE = `${API_ORIGIN}/api`;
const JWT_URL = `${API_ORIGIN}/auth/guest/start`;
const PROGRAM_ID = new PublicKey('6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J');
const TXL_TOKEN_MINT = new PublicKey('4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG');
const SERVICE_LEVEL_ID = parseInt(process.env.TXLINE_SERVICE_LEVEL || '1', 10);
const WEEKS = parseInt(process.env.TXLINE_WEEKS || '4', 10);
const SELECTED_LEAGUES: number[] = [];

const MIN_SOL_FOR_FEES = 0.01; // minimum devnet SOL to pay tx fees + ATA rent

type Outcome = 'success' | 'auth_failure' | 'expired_tier' | 'invalid_subscription' | 'network_error';

function logStep(n: number, msg: string) {
  console.log(`\n[${n}] ${msg}`);
}
function mask(s: string, keep = 12): string {
  if (s.length <= keep + 4) return s;
  return `${s.slice(0, keep)}…${s.slice(-4)}`;
}

function resolveKeypairPath(): string {
  const fromEnv = process.env.ANCHOR_WALLET || process.env.SOLANA_KEYPAIR || process.env.SOLANA_WALLET;
  if (fromEnv) return path.resolve(fromEnv);
  const home = os.homedir();
  const candidate = path.join(home, '.config', 'solana', 'id.json');
  if (fs.existsSync(candidate)) return candidate;
  throw new Error(
    'No Solana keypair found. Set ANCHOR_WALLET (or SOLANA_KEYPAIR) to a JSON keypair file, or place one at ~/.config/solana/id.json.'
  );
}

function loadKeypair(file: string): Keypair {
  const raw = fs.readFileSync(file, 'utf8');
  const secret = Uint8Array.from(JSON.parse(raw));
  return Keypair.fromSecretKey(secret);
}

async function getGuestJwt(): Promise<string> {
  const res = await axios.post(JWT_URL, {}, { timeout: 20000 });
  const token = res.data?.token;
  if (!token) throw new Error('Guest JWT endpoint returned no token.');
  return token;
}

async function ensureDevnetSol(connection: Connection, payer: PublicKey): Promise<number> {
  const balance = await connection.getBalance(payer);
  if (balance >= MIN_SOL_FOR_FEES * LAMPORTS_PER_SOL) {
    console.log(`   Devnet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL (sufficient)`);
    return balance;
  }
  console.log(`   Devnet balance low (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL). Requesting airdrop…`);
  try {
    const sig = await connection.requestAirdrop(payer, LAMPORTS_PER_SOL); // 1 SOL
    const bh = await connection.getLatestBlockhash('confirmed');
    await connection.confirmTransaction({ signature: sig, ...bh }, 'confirmed');
    const after = await connection.getBalance(payer);
    console.log(`   Airdrop confirmed. New balance: ${(after / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    if (after < MIN_SOL_FOR_FEES * LAMPORTS_PER_SOL) {
      throw new Error('Airdrop succeeded but balance is still below the minimum required for fees.');
    }
    return after;
  } catch (err: any) {
    throw new Error(
      `Unable to fund devnet wallet: ${err?.message || err}. Fund it manually: ` +
        `solana airdrop 1 ${(payer.toBase58())} --url devnet`
    );
  }
}

async function subscribeOnChain(
  connection: Connection,
  program: anchor.Program,
  payer: Keypair
): Promise<{ txSig: string }> {
  const userTokenAccount = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    payer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const [pricingMatrixPda] = PublicKey.findProgramAddressSync([Buffer.from('pricing_matrix')], program.programId);
  const [tokenTreasuryPda] = PublicKey.findProgramAddressSync([Buffer.from('token_treasury_v2')], program.programId);
  const tokenTreasuryVault = getAssociatedTokenAddressSync(
    TXL_TOKEN_MINT,
    tokenTreasuryPda,
    true,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Create the user's Token-2022 ATA if it does not exist (free tier needs it for the subscribe ix).
  const ataInfo = await connection.getAccountInfo(userTokenAccount);
  if (!ataInfo) {
    console.log('   Creating user Token-2022 associated account…');
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        userTokenAccount,
        payer.publicKey,
        TXL_TOKEN_MINT,
        TOKEN_2022_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    const sig = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: 'confirmed' });
    console.log(`   ATA created (${sig.slice(0, 12)}…)`);
  }

  if (WEEKS < 4 || WEEKS % 4 !== 0) {
    throw new Error(`Subscription weeks must be a multiple of 4 (got ${WEEKS}).`);
  }

  console.log(`   Subscribing: service level ${SERVICE_LEVEL_ID}, duration ${WEEKS} weeks…`);
  const tx = await program.methods
    .subscribe(SERVICE_LEVEL_ID, WEEKS)
    .accounts({
      user: payer.publicKey,
      pricingMatrix: pricingMatrixPda,
      tokenMint: TXL_TOKEN_MINT,
      userTokenAccount,
      tokenTreasuryVault: tokenTreasuryVault,
      tokenTreasuryPda,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .transaction();

  const bh = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = bh.blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);

  const txSig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction({ signature: txSig, ...bh }, 'confirmed');
  console.log(`   ✅ Subscription confirmed: ${txSig}`);
  return { txSig };
}

async function activateToken(txSig: string, jwt: string): Promise<string> {
  const message = new TextEncoder().encode(`${txSig}::${jwt}`);
  const signatureBytes = nacl.sign.detached(message, loadSignerSecret());
  const walletSignature = Buffer.from(signatureBytes).toString('base64');

  const res = await axios.post(
    `${API_BASE}/token/activate`,
    { txSig, walletSignature, leagues: SELECTED_LEAGUES },
    { headers: { Authorization: `Bearer ${jwt}` }, timeout: 20000 }
  );
  const token = res.data?.token || res.data;
  if (!token) {
    const status = res.status;
    throw Object.assign(new Error(`Activation returned no token (HTTP ${status}).`), { kind: 'activation' });
  }
  return token;
}

// The signer secret is loaded once and cached so both subscribe and activation use the same keypair.
let _secret: Uint8Array | null = null;
function loadSignerSecret(): Uint8Array {
  if (_secret) return _secret;
  throw new Error('Signer secret not initialized.');
}

async function verifyLiveData(jwt: string, apiToken: string): Promise<{ ok: boolean; detail: string }> {
  const headers = { Authorization: `Bearer ${jwt}`, 'X-Api-Token': apiToken };
  try {
    const fixtures = await axios.get(`${API_BASE}/fixtures/snapshot`, { headers, timeout: 20000 });
    if (Array.isArray(fixtures.data) && fixtures.data.length > 0) {
      return { ok: true, detail: `fixtures/snapshot returned ${fixtures.data.length} fixture(s)` };
    }
    // Try odds snapshot for the first fixture id if available.
    const firstId = fixtures.data?.[0]?.FixtureId;
    if (firstId) {
      const odds = await axios.get(`${API_BASE}/odds/snapshot/${firstId}`, { headers, timeout: 20000 });
      if (odds.data) return { ok: true, detail: `odds/snapshot returned data for fixture ${firstId}` };
    }
    return { ok: true, detail: 'authenticated request succeeded (empty fixture set on devnet right now)' };
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 403) {
      return { ok: false, detail: `live-data request rejected (HTTP ${status}): ${JSON.stringify(err?.response?.data || err.message)}` };
    }
    return { ok: false, detail: `live-data request error: ${err?.message || err}` };
  }
}

function updateEnvFile(envPath: string, patch: Record<string, string>) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const lines = content.split('\n');
  const keys = new Set(patch ? Object.keys(patch) : []);
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && keys.has(m[1])) continue; // drop existing
    out.push(line);
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop();
  for (const [k, v] of Object.entries(patch)) out.push(`${k}=${v}`);
  out.push('');
  fs.writeFileSync(envPath, out.join('\n'));
  console.log(`   Updated ${envPath}`);
}

async function main() {
  console.log('=== TxLINE Devnet Free-Tier Activation ===');
  console.log(`Network: ${NETWORK}  |  RPC: ${RPC_URL}`);
  console.log(`API host: ${API_ORIGIN}  |  Program: ${PROGRAM_ID.toBase58()}`);

  const kpPath = resolveKeypairPath();
  const kp = loadKeypair(kpPath);
  _secret = kp.secretKey;
  console.log(`Wallet: ${kp.publicKey.toBase58()}`);
  console.log(`Keypair: ${kpPath}`);

  logStep(1, 'Connecting to Solana devnet & checking balance');
  const connection = new Connection(RPC_URL, 'confirmed');
  const endpoint = await connection.getVersion().catch(() => null);
  if (!endpoint) throw new Error('Cannot reach the Solana devnet RPC. Check TXLINE_DEVNET_RPC.');
  await ensureDevnetSol(connection, kp.publicKey);

  logStep(2, 'Building Anchor program from official devnet IDL');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(kp), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  if (!('programId' in (idl as any))) {
    (idl as any).programId = PROGRAM_ID.toBase58();
  }
  const program = new anchor.Program(idl as any, provider);
  if (!program.programId.equals(PROGRAM_ID)) {
    throw new Error(`Loaded IDL program ${program.programId.toBase58()} does not match devnet program ${PROGRAM_ID.toBase58()}`);
  }
  console.log(`   Program ID verified: ${program.programId.toBase58()}`);

  logStep(3, 'Requesting guest JWT');
  const jwt = await getGuestJwt();
  console.log(`   ✅ Guest JWT obtained (${mask(jwt)})`);

  logStep(4, 'Subscribing on-chain (free tier, no TxL payment)');
  let txSig: string;
  try {
    ({ txSig } = await subscribeOnChain(connection, program, kp));
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('ActiveSubscription') || msg.includes('6016')) {
      console.log('   Wallet already has an active subscription. Reusing the last subscription txSig…');
      const sigs = await connection.getSignaturesForAddress(kp.publicKey, { limit: 20 });
      const sub = sigs.find((s) => s.memo === null) ?? sigs[0];
      if (!sub) {
        throw Object.assign(new Error('Wallet has an active subscription but no prior txSig could be located.'), {
          outcome: 'invalid_subscription' as Outcome,
        });
      }
      txSig = sub.signature;
    } else if (msg.includes('InvalidServiceLevelId') || msg.includes('6059')) {
      throw Object.assign(new Error('On-chain subscription rejected: invalid service level id.'), {
        outcome: 'invalid_subscription' as Outcome,
      });
    } else if (msg.includes('expired') || msg.includes('403') || msg.includes('disabled')) {
      throw Object.assign(new Error('On-chain subscription rejected: free-tier access may be expired/disabled.'), {
        outcome: 'expired_tier' as Outcome,
      });
    } else {
      throw err;
    }
  }

  logStep(5, 'Signing activation message and activating API token');
  console.log('   Message signed (empty leagues): `${txSig}::${jwt}`');
  let apiToken: string;
  try {
    apiToken = await activateToken(txSig, jwt);
  } catch (err: any) {
    if (String(err?.message || '').includes('403')) {
      throw Object.assign(new Error('Token activation returned 403: check signed message, wallet, signature encoding, network, and activation host.'), {
        outcome: 'auth_failure' as Outcome,
      });
    }
    throw err;
  }
  console.log(`   ✅ API token activated (${mask(apiToken)})`);

  logStep(6, 'Writing credentials to backend/.env');
  const envPath = path.resolve(process.cwd(), '..', 'backend', '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error(`Cannot find backend/.env at ${envPath}`);
  }
  updateEnvFile(envPath, {
    TXLINE_API_ORIGIN: API_ORIGIN,
    TXLINE_GUEST_JWT: jwt,
    TXLINE_API_TOKEN: apiToken,
    TXLINE_LEAGUES: '',
  });

  logStep(7, 'Verifying real authenticated live-data access');
  const verify = await verifyLiveData(jwt, apiToken);
  if (verify.ok) {
    console.log(`   ✅ ${verify.detail}`);
  } else {
    console.warn(`   ⚠️  ${verify.detail}`);
  }

  console.log('\n=== Activation complete ===');
  console.log(`Wallet : ${kp.publicKey.toBase58()}`);
  console.log(`txSig  : ${txSig}`);
  console.log(`Status : ${verify.ok ? 'LIVE DATA AVAILABLE' : 'token issued but live-data check inconclusive'}`);
  console.log('Restart the backend (npm run dev) to use the new credentials.');
  process.exit(0);
}

main().catch((err: any) => {
  const outcome: Outcome = err?.outcome || 'network_error';
  console.error(`\n❌ Activation failed [${outcome}]: ${err?.message || err}`);
  if (outcome === 'expired_tier') {
    console.error('The TxLINE World Cup free devnet tier may have expired or stopped accepting new subscriptions.');
    console.error('No mock/demo data was created. Existing app behaviour is unchanged.');
  }
  process.exit(1);
});
