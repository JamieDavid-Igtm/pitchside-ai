import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const dir = path.join(os.homedir(), '.config', 'solana');
fs.mkdirSync(dir, { recursive: true });
const kp = Keypair.generate();
fs.writeFileSync(path.join(dir, 'id.json'), JSON.stringify(Array.from(kp.secretKey)));
console.log('Created keypair:', kp.publicKey.toBase58());
console.log('Path:', path.join(dir, 'id.json'));
