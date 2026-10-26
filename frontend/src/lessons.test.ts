import { describe, expect, it } from 'vitest';
import { buildLessonPracticeText, lessons, stages } from './lessons';

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

  it('gives each lesson a 200-word passage that only uses its practice pattern', () => {
    for (const lesson of lessons) {
      const passage = buildLessonPracticeText(lesson);
      const sourceWords = lesson.text.trim().split(/\s+/);
      const passageWords = passage.split(/\s+/);

      expect(passageWords).toHaveLength(200);
      if (sourceWords.length === 1 && sourceWords[0].length > 1) {
        const allowedCharacters = new Set(sourceWords[0]);
        expect([...passage.replace(/\s/g, '')].every((character) => allowedCharacters.has(character))).toBe(true);
      } else {
        const allowedWords = new Set(sourceWords);
        expect(passageWords.every((word) => allowedWords.has(word))).toBe(true);
      }
    }
  });

  it('builds beginner word-count runs at each requested size', () => {
    for (const wordCount of [10, 50, 100]) {
      expect(buildLessonPracticeText(lessons[0], undefined, wordCount).split(/\s+/)).toHaveLength(wordCount);
      expect(buildLessonPracticeText(lessons[24], undefined, wordCount).split(/\s+/)).toHaveLength(wordCount);
    }
  });

  it('creates a different passage for the same lesson when requested', () => {
    const lesson = lessons[0];
    const current = buildLessonPracticeText(lesson);
    expect(buildLessonPracticeText(lesson, current)).not.toBe(current);
  });

  it('keeps real-typing lessons readable and offers a different sentence', () => {
    const lesson = lessons[24];
    const firstPassage = buildLessonPracticeText(lesson);
    const nextPassage = buildLessonPracticeText(lesson, firstPassage);

    expect(firstPassage.split(/\s+/)).toHaveLength(200);
    expect(firstPassage.startsWith(lesson.text)).toBe(true);
    expect(nextPassage.split(/\s+/)).toHaveLength(200);
    expect(nextPassage).not.toBe(firstPassage);
    expect(nextPassage.match(/^[\s\S]*?[.!?]/)?.[0]).not.toBe(lesson.text);
  });
});
