import { describe, expect, it } from 'vitest';
import { getRandomSentence, sentenceBank } from './sentences';

describe('Typing Modes sentence bank', () => {
  it('provides short, medium, and long sentence collections', () => {
    expect(sentenceBank.short.length).toBeGreaterThan(1);
    expect(sentenceBank.medium.length).toBeGreaterThan(1);
    expect(sentenceBank.long.length).toBeGreaterThan(1);
    expect(sentenceBank.long[0].length).toBeGreaterThan(sentenceBank.short[0].length);
  });

  it('selects only from the requested length and can avoid the current sentence', () => {
    for (const length of ['short', 'medium', 'long'] as const) {
      const current = sentenceBank[length][0];
      const next = getRandomSentence(length, current);
      expect(sentenceBank[length]).toContain(next);
      expect(next).not.toBe(current);
    }
  });

  it('selects a sentence independently of Beginner Learning lesson text', () => {
    expect(sentenceBank.short).not.toContain('asdf asdf fdsa asdf');
    expect(sentenceBank.medium).not.toContain('jkl; jkl; ;lkj jkl;');
  });
});
