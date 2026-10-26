import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../middleware/authenticate.js';
import { User } from '../models/User.js';

const router = Router();
const signupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});
const googleSchema = z.object({
  credential: z.string().min(1).max(8192),
});
const googleClient = new OAuth2Client();

function issueToken(userId: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return jwt.sign({}, secret, { subject: userId, expiresIn: '7d' });
}

router.post('/signup', async (request, response) => {
  const parsed = signupSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Enter a name, valid email, and password with at least 8 characters.' });

  try {
    const email = parsed.data.email.toLowerCase();
    if (await User.exists({ email })) return response.status(409).json({ message: 'An account already exists for this email.' });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({ name: parsed.data.name, email, passwordHash });
    return response.status(201).json({
      token: issueToken(user.id),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return response.status(409).json({ message: 'An account already exists for this email.' });
    console.error('Signup failed:', error);
    return response.status(500).json({ message: 'Could not create your account. Please try again.' });
  }
});

router.post('/login', async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Enter a valid email and password.' });

  try {
    const user = await User.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash');
    if (!user?.passwordHash || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }
    return response.json({
      token: issueToken(user.id),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return response.status(500).json({ message: 'Could not sign you in. Please try again.' });
  }
});

router.post('/google', async (request, response) => {
  const parsed = googleSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'A valid Google sign-in credential is required.' });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.error('Google sign-in is unavailable: GOOGLE_CLIENT_ID is not configured.');
    return response.status(503).json({ message: 'Google sign-in is not configured yet.' });
  }

  let claims;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: parsed.data.credential, audience: clientId });
    claims = ticket.getPayload();
  } catch {
    return response.status(401).json({ message: 'Google sign-in could not be verified. Please try again.' });
  }

  if (!claims?.sub || !claims.email || claims.email_verified !== true) {
    return response.status(401).json({ message: 'Use a Google account with a verified email address.' });
  }

  try {
    let user = await User.findOne({ googleId: claims.sub });
    if (!user) {
      const email = claims.email.toLowerCase();
      user = await User.findOne({ email });
      if (user) {
        if (user.googleId && user.googleId !== claims.sub) {
          return response.status(409).json({ message: 'This email is already linked to a different Google account.' });
        }
        user.googleId = claims.sub;
        await user.save();
      } else {
        user = await User.create({
          name: claims.name?.trim() || email.split('@')[0] || 'Google user',
          email,
          googleId: claims.sub,
        });
      }
    }

    return response.json({
      token: issueToken(user.id),
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return response.status(409).json({ message: 'This Google account is already linked. Please sign in again.' });
    }
    console.error('Google sign-in failed:', error);
    return response.status(500).json({ message: 'Could not sign you in with Google. Please try again.' });
  }
});

router.get('/me', authenticate, async (request: AuthRequest, response) => {
  const user = await User.findById(request.userId).select('name email');
  if (!user) return response.status(404).json({ message: 'Account not found.' });
  return response.json({ user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
