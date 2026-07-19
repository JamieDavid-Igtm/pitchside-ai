import { Router, Request, Response } from 'express';
import { generateChallenge, isValidSolanaAddress, verifySignature, getOrCreateUser, generateJWT, toAuthUser } from '../utils/auth.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export const authRouter = Router();

authRouter.post('/challenge', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.body?.walletAddress;
    if (typeof walletAddress !== 'string' || !walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address is required.' });
    }
    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address.' });
    }

    const { challenge, message } = generateChallenge(walletAddress);
    return res.json({ success: true, data: { challenge, message } });
  } catch (error) {
    console.error('Auth challenge error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate authentication challenge.' });
  }
});

authRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body ?? {};
    if (typeof walletAddress !== 'string' || !walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address is required.' });
    }
    if (typeof signature !== 'string' || !signature) {
      return res.status(400).json({ success: false, message: 'Signature is required.' });
    }
    if (typeof message !== 'string' || !message) {
      return res.status(400).json({ success: false, message: 'Signed message is required.' });
    }
    if (!isValidSolanaAddress(walletAddress)) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address.' });
    }

    const valid = await verifySignature(walletAddress, signature, message);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Signature verification failed.' });
    }

    const user = await getOrCreateUser(walletAddress);
    const token = generateJWT(user);

    return res.json({
      success: true,
      message: 'Authenticated successfully.',
      data: { token, user: toAuthUser(user) },
    });
  } catch (error) {
    console.error('Auth verify error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify wallet signature.' });
  }
});

authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  return res.json({ success: true, data: { user: req.user } });
});
