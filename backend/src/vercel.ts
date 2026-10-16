import mongoose from 'mongoose';
import type { Request, Response } from 'express';
import { app } from './app.js';

let connectionPromise: Promise<typeof mongoose> | undefined;

function connectToDatabase() {
  if (!connectionPromise) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not configured');

    connectionPromise = mongoose.connect(mongoUri).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

export default async function handler(request: Request, response: Response) {
  try {
    await connectToDatabase();
    return app(request, response);
  } catch (error) {
    console.error('Database connection failed:', error);
    return response.status(503).json({ message: 'The API is temporarily unavailable. Please try again.' });
  }
}
