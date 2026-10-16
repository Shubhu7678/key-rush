import { describe, expect, it } from 'vitest';
import { calculateMetrics } from './metrics';

describe('calculateMetrics', () => {
  it('counts correct characters, mistakes, accuracy, and words per minute', () => {
    expect(calculateMetrics('asdf', 'asxf', 60)).toEqual({
      wpm: 0.6,
      accuracy: 75,
      mistakes: 1,
      correctCharacters: 3,
      typedCharacters: 4,
    });
  });

  it('counts extra characters as mistakes and keeps empty accuracy at 100%', () => {
    expect(calculateMetrics('as', 'asdf', 30)).toMatchObject({
      mistakes: 2,
      correctCharacters: 2,
      accuracy: 50,
    });
    expect(calculateMetrics('as', '', 0)).toMatchObject({ accuracy: 100, wpm: 0, mistakes: 0 });
  });
});
