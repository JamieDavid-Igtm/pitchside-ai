/**
 * TxLINE Devnet Setup Script
 * 
 * This script helps you obtain TxLINE credentials for development.
 * 
 * For the free World Cup tier, you need:
 * 1. A Solana wallet with devnet SOL
 * 2. The on-chain subscription transaction signature
 * 3. The wallet signature
 * 
 * Run: npx tsx scripts/txline-setup.ts
 */

import axios from 'axios';

const TXLINE_ORIGIN = process.env.TXLINE_API_ORIGIN || 'https://txline-dev.txodds.com';

async function main() {
  console.log('=== TxLINE Devnet Setup ===\n');

  // Step 1: Get guest JWT
  console.log('Step 1: Getting guest JWT...');
  try {
    const authResponse = await axios.post(`${TXLINE_ORIGIN}/auth/guest/start`);
    const guestJwt = authResponse.data.token;
    console.log('✅ Guest JWT obtained:', guestJwt.substring(0, 20) + '...\n');

    // Step 2: Prompt for transaction signature
    console.log('Step 2: On-chain subscription');
    console.log('To complete the free tier subscription:');
    console.log('1. Go to: https://txline.txodds.com/documentation/worldcup');
    console.log('2. Follow the "Subscribe to Free Tier" instructions');
    console.log('3. Use service level 1 (devnet) or 12 (mainnet real-time)');
    console.log('4. Copy the transaction signature (txSig)\n');

    const txSig = await prompt('Enter your transaction signature: ');
    
    if (!txSig) {
      console.log('❌ Transaction signature is required');
      process.exit(1);
    }

    // Step 3: Activate API token
    console.log('\nStep 3: Activating API token...');
    
    // For the free tier with empty leagues, the message is: `${txSig}::${guestJwt}`
    const message = `${txSig}::${guestJwt}`;
    console.log('Message to sign:', message);
    console.log('\nYou need to sign this message with your Solana wallet.');
    console.log('In Phantom:');
    console.log('1. Go to Settings → Developer Settings');
    console.log('2. Click "Sign Message"');
    console.log('3. Paste the message above');
    console.log('4. Copy the signature\n');

    const walletSignature = await prompt('Enter the wallet signature (base64): ');
    
    if (!walletSignature) {
      console.log('❌ Wallet signature is required');
      process.exit(1);
    }

    const activationResponse = await axios.post(
      `${TXLINE_ORIGIN}/api/token/activate`,
      {
        txSig,
        walletSignature,
        leagues: [],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${guestJwt}`,
        },
      }
    );

    const apiToken = activationResponse.data.token || activationResponse.data;
    console.log('\n✅ API token activated:', apiToken.substring(0, 20) + '...\n');

    // Step 4: Save to .env
    console.log('Step 4: Saving credentials to backend/.env');
    console.log('\nAdd these lines to your backend/.env file:');
    console.log('---');
    console.log(`TXLINE_API_ORIGIN=${TXLINE_ORIGIN}`);
    console.log(`TXLINE_GUEST_JWT=${guestJwt}`);
    console.log(`TXLINE_API_TOKEN=${apiToken}`);
    console.log('---\n');

    console.log('✅ Setup complete!');
    console.log('Restart your backend server to use the new credentials.');

  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

function prompt(question: string): Promise<string> {
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    readline.question(question, (answer: string) => {
      readline.close();
      resolve(answer.trim());
    });
  });
}

main();
