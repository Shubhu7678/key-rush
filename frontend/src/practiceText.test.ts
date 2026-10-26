import { describe, expect, it } from 'vitest';
import { buildPracticeText, type PracticeTextOptions } from './practiceText';
import { sentenceBank } from './sentences';

const defaults: PracticeTextOptions = {
  lessonText: 'asdf jkl;',
  difficulty: 'easy',
  mode: 'time',
  timeLimitSeconds: 15,
  wordCount: 10,
  quoteLength: 'short',
  includePunctuation: false,
  includeNumbers: false,
};

describe('buildPracticeText', () => {
  it('makes a word-count task contain the selected number of words', () => {
    for (const wordCount of [10, 25, 50, 100]) {
      const text = buildPracticeText({ ...defaults, mode: 'words', wordCount });
      expect(text.split(/\s+/)).toHaveLength(wordCount);
    }
  });

  it('builds a long timed passage from varied sentences instead of repeating one prompt', () => {
    const text = buildPracticeText({
      ...defaults,
      lessonText: sentenceBank.short[0],
      mode: 'time',
      includePunctuation: true,
    });
    const sentences = text.match(/[^.]+\./g) ?? [];

    expect(text.split(/\s+/).length).toBeGreaterThanOrEqual(1000);
    expect(new Set(sentences.slice(0, 24)).size).toBe(24);
  });

  it('supports custom-sized word tasks within its supported range', () => {
    const text = buildPracticeText({ ...defaults, mode: 'words', wordCount: 37 });
    expect(text.split(/\s+/)).toHaveLength(37);
  });

  it('offers quote lengths and includes optional punctuation and numbers', () => {
    const shortQuote = buildPracticeText({ ...defaults, lessonText: sentenceBank.short[0], mode: 'quote', quoteLength: 'short' });
    const longQuote = buildPracticeText({ ...defaults, lessonText: sentenceBank.long[0], mode: 'quote', quoteLength: 'long' });
    const enhancedQuote = buildPracticeText({ ...defaults, lessonText: sentenceBank.medium[0], mode: 'quote', quoteLength: 'medium', includePunctuation: true, includeNumbers: true });
    expect(longQuote.length).toBeGreaterThan(shortQuote.length);
    expect(shortQuote).toBe('Small steps build steady habits');
    expect(enhancedQuote).toMatch(/\d/);
    expect(enhancedQuote).toMatch(/[.,]/);
  });

  it('adds optional punctuation and number words without changing the selected word count', () => {
    const text = buildPracticeText({ ...defaults, mode: 'words', wordCount: 10, includePunctuation: true, includeNumbers: true });
    expect(text.split(/\s+/)).toHaveLength(10);
    expect(text).toMatch(/\d/);
    expect(text).toMatch(/[,.]/);
  });

  it('removes punctuation and keeps numbers out when those options are off', () => {
    const text = buildPracticeText({
      ...defaults,
      lessonText: 'type, this! 123',
      mode: 'words',
      wordCount: 10,
      includePunctuation: false,
      includeNumbers: false,
    });
    expect(text).not.toMatch(/[.,!?]/);
    expect(text).not.toMatch(/\d/);
  });
});
