import { describe, expect, it } from 'vitest';
import { lessons, stages } from './lessons';

describe('beginner curriculum', () => {
  it('contains the requested 25 ordered tests across six stages', () => {
    expect(lessons).toHaveLength(25);
    expect(stages).toEqual([
      'Stage 1: Home Row',
      'Stage 2: Top Row',
      'Stage 3: Bottom Row',
      'Stage 4: Word Practice',
      'Stage 5: Numbers & Symbols',
      'Stage 6: Real Typing',
    ]);
    expect(lessons.map((lesson) => lesson.number)).toEqual(Array.from({ length: 25 }, (_, index) => index + 1));
  });

  it('preserves the supplied names and practice text', () => {
    expect(lessons.map(({ title, text }) => [title, text])).toEqual([
      ['Left Home Row', 'asdf asdf fdsa asdf'],
      ['Right Home Row', 'jkl; jkl; ;lkj jkl;'],
      ['Both Hands', 'asdf jkl; asdf jkl;'],
      ['Home Row Combinations', 'aj sk dl f; as jk'],
      ['Home Row Words', 'sad dad lad flask salad'],
      ['Left Top Row', 'qwer qwer rewq'],
      ['Right Top Row', 'uiop uiop poiu'],
      ['Complete Top Row', 'qwertyuiop'],
      ['Top + Home Row', 'read word type power'],
      ['Top Row Words', 'quiet write query tower'],
      ['Left Bottom Row', 'zxcv zxcv vcxz'],
      ['Right Bottom Row', 'bnm bnm mnb'],
      ['Complete Bottom Row', 'zxcvbnm'],
      ['Bottom + Home Row', 'van can man ban'],
      ['All Letter Rows', 'quick brown fox jumps'],
      ['Easy Words', 'cat dog sun run book'],
      ['Common Words', 'the and you are with'],
      ['Medium Words', 'school friend typing'],
      ['Long Words', 'computer keyboard developer'],
      ['Mixed Words', 'practice makes typing better'],
      ['Number Keys', '12345 67890 24680'],
      ['Number Combinations', '123 456 789 2026'],
      ['Punctuation', `.,?! ;:' "`],
      ['Short Sentences', 'I am learning to type faster.'],
      ['Final Beginner Test', 'The quick brown fox jumps over the lazy dog.'],
    ]);
  });
});
