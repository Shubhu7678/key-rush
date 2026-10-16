import { describe, expect, it } from 'vitest';
import { buildTimedText } from './timedText';

describe('buildTimedText', () => {
  it('creates enough repeating lesson text for a timed session', () => {
    const text = buildTimedText('asdf fdsa', 'easy');
    expect(text.length).toBeGreaterThanOrEqual(4000);
    expect(text.startsWith('asdf fdsa asdf fdsa')).toBe(true);
  });

  it('changes word sequence by difficulty while staying within lesson vocabulary', () => {
    const easy = buildTimedText('asdf jkl;', 'easy');
    const medium = buildTimedText('asdf jkl;', 'medium');
    const hard = buildTimedText('asdf jkl;', 'hard');
    expect(easy).not.toBe(medium);
    expect(medium).not.toBe(hard);
    expect(new Set(hard.split(/\s+/))).toEqual(new Set(['asdf', 'jkl;']));
  });

  it('preserves empty lesson text', () => {
    expect(buildTimedText('', 'easy')).toBe('');
  });
});
