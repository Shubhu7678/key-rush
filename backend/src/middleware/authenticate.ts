import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticate(request: AuthRequest, response: Response, next: NextFunction) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return response.status(401).json({ message: 'Sign in to continue.' });

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT secret is not configured');
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') throw new Error('Invalid token subject');
    request.userId = payload.sub;
    return next();
  } catch {
    return response.status(401).json({ message: 'Your session has expired. Please sign in again.' });
  }
}
