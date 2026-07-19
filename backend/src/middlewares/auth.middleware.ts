import { Request, Response, NextFunction } from 'express';
import { User } from '../models/index.js';
import { verifyJWT } from '../utils/auth.js';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const token = authHeader.slice('Bearer '.length);
  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }

  try {
    const user = await User.findById(payload.userId).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    req.user = {
      _id: user._id.toString(),
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName,
      telegramConnected: user.telegramConnected,
      favoriteTeams: user.favoriteTeams,
      notificationsEnabled: user.notificationsEnabled,
    };
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
  }
}
