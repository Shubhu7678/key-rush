import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 4000);
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure MongoDB.');
}
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured');
}

try {
  await mongoose.connect(mongoUri);
  app.listen(port, () => console.log(`KeyRush API listening on http://localhost:${port}`));
} catch (error) {
  console.error('Could not connect to MongoDB:', error);
  process.exit(1);
}
