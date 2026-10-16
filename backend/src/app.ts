import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import raceRoutes from './routes/races.js';
import sessionRoutes from './routes/sessions.js';

export const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '16kb' }));

// MongoDB connection
let connectionPromise: Promise<typeof mongoose> | null = null;

app.use('/api', async (_request, response, next) => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MONGODB_URI is missing');
    }

    if (mongoose.connection.readyState !== 1) {
      connectionPromise ??= mongoose.connect(mongoUri);
      await connectionPromise;
    }

    next();
  } catch (error) {
    connectionPromise = null;
    console.error('MongoDB connection failed:', error);

    response.status(503).json({
      message: 'Database connection failed'
    });
  }
});

app.get('/api/health', (_request, response) =>
  response.json({ status: 'ok' })
);

app.use('/api/auth', authRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/sessions', sessionRoutes);

app.use((request, response) =>
  response.status(404).json({
    message: `Route not found: ${request.path}`
  })
);

export default app;