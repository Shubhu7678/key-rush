import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { authenticate, type AuthRequest } from '../middleware/authenticate.js';
import { PracticeSession } from '../models/PracticeSession.js';

const router = Router();
const sessionSchema = z.object({
  lessonId: z.string().min(1).max(60),
  sentence: z.string().max(5000).optional().default(''),
  mode: z.enum(['lesson', 'time', 'words', 'quote', 'race']).default('lesson'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  timeLimitSeconds: z.union([z.literal(0), z.literal(10), z.literal(15), z.literal(30), z.literal(60), z.literal(120)]).default(30),
  wordCount: z.number().int().min(0).max(500).default(0),
  quoteLength: z.enum(['short', 'medium', 'long']).default('short'),
  includePunctuation: z.boolean().default(false),
  includeNumbers: z.boolean().default(false),
  wpm: z.number().min(0).max(500),
  accuracy: z.number().min(0).max(100),
  mistakes: z.number().int().min(0),
  durationSeconds: z.number().int().min(0).max(3600),
  keyStats: z.array(z.object({
    key: z.string().length(1),
    attempts: z.number().int().min(1).max(5000),
    mistakes: z.number().int().min(0).max(5000),
  }).refine((stat) => stat.mistakes <= stat.attempts, { message: 'Key mistakes cannot exceed attempts.' })).max(80).optional().default([]),
});

router.use(authenticate);

router.post('/', async (request: AuthRequest, response) => {
  const parsed = sessionSchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: 'Practice result is invalid.' });
  const { wpm, accuracy, durationSeconds } = parsed.data;
  const xpEarned = 10
    + Math.min(30, Math.floor(wpm / 4))
    + Math.floor(accuracy / 10)
    + Math.min(10, Math.floor(durationSeconds / 30));
  const session = await PracticeSession.create({ ...parsed.data, xpEarned, userId: request.userId });
  return response.status(201).json({ session });
});

router.get('/', async (request: AuthRequest, response) => {
  const sessions = await PracticeSession.find({ userId: request.userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .select('lessonId sentence mode difficulty timeLimitSeconds wordCount quoteLength includePunctuation includeNumbers wpm accuracy mistakes durationSeconds keyStats xpEarned createdAt');
  return response.json({ sessions });
});

router.get('/stats', async (request: AuthRequest, response) => {
  const userId = new mongoose.Types.ObjectId(request.userId);
  const [summary] = await PracticeSession.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        gamesPlayed: { $sum: 1 },
        totalDurationSeconds: { $sum: '$durationSeconds' },
        averageWpm: { $avg: '$wpm' },
        bestWpm: { $max: '$wpm' },
        averageAccuracy: { $avg: '$accuracy' },
        totalMistakes: { $sum: '$mistakes' },
        totalXp: { $sum: { $ifNull: ['$xpEarned', 0] } },
      },
    },
  ]);
  const modeRecords = await PracticeSession.aggregate([
    { $match: { userId, $or: [{ mode: { $in: ['time', 'words'] } }, { mode: { $exists: false } }] } },
    {
      $group: {
        _id: {
          mode: { $ifNull: ['$mode', 'time'] },
          target: {
            $cond: [
              { $eq: [{ $ifNull: ['$mode', 'time'] }, 'time'] },
              { $ifNull: ['$timeLimitSeconds', 30] },
              { $ifNull: ['$wordCount', 0] },
            ],
          },
        },
        runs: { $sum: 1 },
        averageWpm: { $avg: '$wpm' },
        bestWpm: { $max: '$wpm' },
        averageAccuracy: { $avg: '$accuracy' },
      },
    },
    { $sort: { '_id.mode': 1, '_id.target': 1 } },
  ]);
  const lessonProgress = await PracticeSession.aggregate([
    { $match: { userId, lessonId: { $ne: 'sentence-mode' } } },
    { $group: { _id: '$lessonId', bestWpm: { $max: '$wpm' } } },
    { $sort: { _id: 1 } },
  ]);
  const keyStats = await PracticeSession.aggregate([
    { $match: { userId, 'keyStats.0': { $exists: true } } },
    { $unwind: '$keyStats' },
    {
      $group: {
        _id: '$keyStats.key',
        attempts: { $sum: '$keyStats.attempts' },
        mistakes: { $sum: '$keyStats.mistakes' },
      },
    },
    { $sort: { mistakes: -1, _id: 1 } },
  ]);
  const activityDays = await PracticeSession.aggregate([
    { $match: { userId } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } }, runs: { $sum: 1 } } },
    { $sort: { _id: -1 } },
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const daySet = new Set<string>(activityDays.map((day: { _id: string }) => day._id));
  const todayRuns = activityDays.find((day: { _id: string }) => day._id === today)?.runs ?? 0;
  let currentStreak = 0;
  let streakDate = daySet.has(today) ? today : yesterday;
  while (daySet.has(streakDate)) {
    currentStreak += 1;
    const prior = new Date(`${streakDate}T00:00:00.000Z`);
    prior.setUTCDate(prior.getUTCDate() - 1);
    streakDate = prior.toISOString().slice(0, 10);
  }
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDay: string | null = null;
  for (const { _id } of [...activityDays].reverse() as Array<{ _id: string }>) {
    const current = new Date(`${_id}T00:00:00.000Z`);
    if (previousDay) {
      const prior = new Date(`${previousDay}T00:00:00.000Z`);
      prior.setUTCDate(prior.getUTCDate() + 1);
      runningStreak = current.getTime() === prior.getTime() ? runningStreak + 1 : 1;
    } else {
      runningStreak = 1;
    }
    longestStreak = Math.max(longestStreak, runningStreak);
    previousDay = _id;
  }
  return response.json({
    stats: {
      gamesPlayed: summary?.gamesPlayed ?? 0,
      totalDurationSeconds: summary?.totalDurationSeconds ?? 0,
      averageWpm: Math.round((summary?.averageWpm ?? 0) * 10) / 10,
      bestWpm: summary?.bestWpm ?? 0,
      averageAccuracy: Math.round((summary?.averageAccuracy ?? 0) * 10) / 10,
      totalMistakes: summary?.totalMistakes ?? 0,
      totalXp: summary?.totalXp ?? 0,
      todayRuns,
      dailyGoal: 3,
      currentStreak,
      longestStreak,
      lessonsCompleted: lessonProgress.length,
      lessonProgress: lessonProgress.map((lesson: { _id: string; bestWpm: number }) => ({
        lessonId: lesson._id,
        bestWpm: lesson.bestWpm,
      })),
      modeRecords: modeRecords.map((record: { _id: { mode: 'time' | 'words'; target: number }; runs: number; averageWpm: number; bestWpm: number; averageAccuracy: number }) => ({
        mode: record._id.mode,
        target: record._id.target,
        runs: record.runs,
        averageWpm: Math.round(record.averageWpm * 10) / 10,
        bestWpm: record.bestWpm,
        averageAccuracy: Math.round(record.averageAccuracy * 10) / 10,
      })),
      activityDays: activityDays
        .filter((day: { _id: string }) => day._id >= new Date(Date.now() - 364 * 86400000).toISOString().slice(0, 10))
        .map((day: { _id: string; runs: number }) => ({ date: day._id, runs: day.runs })),
      keyStats: keyStats.map((stat: { _id: string; attempts: number; mistakes: number }) => ({
        key: stat._id,
        attempts: stat.attempts,
        mistakes: stat.mistakes,
      })),
    },
  });
});

export default router;
