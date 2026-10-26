import type { ModeStats } from './api';

export interface KeyStat {
  key: string;
  attempts: number;
  mistakes: number;
}

export interface ModeRecord {
  target: number;
  label: string;
  runs: number;
  averageWpm: number;
  averageAccuracy: number;
  bestWpm: number;
}

export function buildModeRecords(modeStats: ModeStats[], mode: 'time' | 'words', targets: number[]): ModeRecord[] {
  return targets.map((target) => {
    const matchingStats = modeStats.find((stat) => stat.mode === mode && stat.target === target);
    return {
      target,
      label: mode === 'time'
        ? target < 60 ? `${target} seconds` : `${target / 60} ${target === 60 ? 'minute' : 'minutes'}`
        : `${target} words`,
      runs: matchingStats?.runs ?? 0,
      averageWpm: matchingStats?.averageWpm ?? 0,
      averageAccuracy: matchingStats?.averageAccuracy ?? 0,
      bestWpm: matchingStats?.bestWpm ?? 0,
    };
  });
}

export function calculateKeyStats(targetText: string, typedText: string): KeyStat[] {
  const stats = new Map<string, KeyStat>();
  const length = Math.min(targetText.length, typedText.length);

  for (let index = 0; index < length; index += 1) {
    const expected = targetText[index];
    if (/\s/.test(expected)) continue;

    const key = /^[a-z]$/i.test(expected) ? expected.toLowerCase() : expected;
    const stat = stats.get(key) ?? { key, attempts: 0, mistakes: 0 };
    stat.attempts += 1;
    if (typedText[index] !== expected) stat.mistakes += 1;
    stats.set(key, stat);
  }

  return [...stats.values()];
}

export interface ActivityDay {
  date: string;
  runs: number;
}

export interface ActivityCell extends ActivityDay {
  level: 0 | 1 | 2 | 3 | 4;
}

export function buildActivityGrid(activityDays: ActivityDay[], today = new Date()): ActivityCell[][] {
  const runCounts = new Map(activityDays.map(({ date, runs }) => [date, runs]));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 364);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weekCount = Math.floor((end.getTime() - start.getTime()) / (7 * 86400000)) + 1;
  return Array.from({ length: weekCount }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + week * 7 + day);
      const dateKey = date.toISOString().slice(0, 10);
      const runs = date <= end ? runCounts.get(dateKey) ?? 0 : 0;
      const level = runs === 0 ? 0 : runs === 1 ? 1 : runs === 2 ? 2 : runs <= 4 ? 3 : 4;
      return { date: dateKey, runs, level };
    }),
  );
}

export function recommendLessonForKey(key: string, lessons: Array<{ id: string; title: string; text: string; group: string }>) {
  const target = /^[a-z]$/i.test(key) ? key.toLowerCase() : key;
  const directMatch = lessons.find((lesson) => lesson.group !== 'Stage 6: Real Typing'
    && [...lesson.text.toLowerCase()].includes(target));
  if (directMatch) return directMatch;
  if (/^\d$/.test(target)) return lessons.find((lesson) => lesson.title === 'Number Keys');
  if (/^[a-z]$/.test(target)) return lessons.find((lesson) => lesson.title === 'All Letter Rows');
  return lessons.find((lesson) => lesson.title === 'Punctuation');
}
