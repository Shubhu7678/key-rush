import { Router } from 'express';
import bcrypt from 'bcryptjs';
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
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
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

router.get('/me', authenticate, async (request: AuthRequest, response) => {
  const user = await User.findById(request.userId).select('name email');
  if (!user) return response.status(404).json({ message: 'Account not found.' });
  return response.json({ user: { id: user.id, name: user.name, email: user.email } });
});

export default router;
