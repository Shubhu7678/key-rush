import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth.js';
import raceRoutes from './routes/races.js';
import sessionRoutes from './routes/sessions.js';

export const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/races', raceRoutes);
app.use('/api/sessions', sessionRoutes);
app.use((request, response) => response.status(404).json({ message: `Route not found: ${request.path}` }));

export default app;