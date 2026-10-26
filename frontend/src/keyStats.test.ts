import { describe, expect, it } from 'vitest';
import type { ModeStats } from './api';
import { lessons } from './lessons';
import { buildActivityGrid, buildModeRecords, calculateKeyStats, recommendLessonForKey } from './keyStats';

function makeModeStat(overrides: Partial<ModeStats>): ModeStats {
  return {
    mode: 'time',
    target: 30,
    runs: 1,
    averageWpm: 40,
    bestWpm: 50,
    averageAccuracy: 95,
    ...overrides,
  };
}

describe('keyStats', () => {
  it('tracks attempts and mistakes by expected key while ignoring spaces', () => {
    expect(calculateKeyStats('A a!', 'a x?')).toEqual([
      { key: 'a', attempts: 2, mistakes: 2 },
      { key: '!', attempts: 1, mistakes: 1 },
    ]);
  });

  it('builds a daily activity grid with the correct run intensity', () => {
    const grid = buildActivityGrid([
      { date: '2026-10-22', runs: 1 },
      { date: '2026-10-23', runs: 5 },
    ], new Date('2026-10-23T12:00:00.000Z'));
    const cells = grid.flat();

    expect(cells).toHaveLength(grid.length * 7);
    expect(cells.find(({ date }) => date === '2026-10-22')).toMatchObject({ runs: 1, level: 1 });
    expect(cells.find(({ date }) => date === '2026-10-23')).toMatchObject({ runs: 5, level: 4 });
    expect(cells[cells.length - 1]?.date).toBe('2026-10-24');
  });

  it('recommends a focused lesson for a weak key', () => {
    expect(recommendLessonForKey('q', lessons)?.title).toBe('Left Top Row');
    expect(recommendLessonForKey(',', lessons)?.title).toBe('Punctuation');
  });

  it('aggregates preset records by runs and leaves unplayed targets empty', () => {
    const modeStats = [
      makeModeStat({ target: 30, runs: 3, averageWpm: 50, averageAccuracy: 93, bestWpm: 70 }),
      makeModeStat({ mode: 'words', target: 50, runs: 2, averageWpm: 50, averageAccuracy: 98, bestWpm: 60 }),
    ];

    expect(buildModeRecords(modeStats, 'time', [10, 30])).toEqual([
      { target: 10, label: '10 seconds', runs: 0, averageWpm: 0, averageAccuracy: 0, bestWpm: 0 },
      { target: 30, label: '30 seconds', runs: 3, averageWpm: 50, averageAccuracy: 93, bestWpm: 70 },
    ]);
    expect(buildModeRecords(modeStats, 'words', [10, 50])[1]).toMatchObject({
      label: '50 words',
      runs: 2,
      averageWpm: 50,
      averageAccuracy: 98,
      bestWpm: 60,
    });
  });
});
