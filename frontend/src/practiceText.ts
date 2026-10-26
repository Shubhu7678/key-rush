import type { Difficulty } from './timedText';
import { sentenceBank } from './sentences';

export type TypingMode = 'time' | 'words' | 'quote';
export type QuoteLength = 'short' | 'medium' | 'long';

export interface PracticeTextOptions {
  lessonText: string;
  difficulty: Difficulty;
  mode: TypingMode;
  timeLimitSeconds: 10 | 15 | 30 | 60 | 120;
  wordCount: number;
  quoteLength: QuoteLength;
  includePunctuation: boolean;
  includeNumbers: boolean;
}

function reorderWords(words: string[], difficulty: Difficulty, cycle: number) {
  if (difficulty === 'easy' || words.length < 2) return words;
  const shift = difficulty === 'medium' ? cycle % words.length : (cycle * 3) % words.length;
  const rotated = [...words.slice(shift), ...words.slice(0, shift)];
  return difficulty === 'hard' && cycle % 2 === 1 ? rotated.reverse() : rotated;
}

function decorateWords(words: string[], includePunctuation: boolean, includeNumbers: boolean) {
  return words.map((original, index) => {
    let word = includePunctuation ? original.replace(/[.,!?;:]+$/g, '') : original.replace(/[.,!?;:'"()[\]{}]/g, '');
    if (includeNumbers && (index + 1) % 5 === 0) word = String(((index + 1) * 7) % 100);
    else if (!includeNumbers) word = word.replace(/\d/g, '');
    if (includePunctuation && (index + 1) % 3 === 0 && !/[.!?]$/.test(word)) word += ',';
    return word;
  });
}

function formatText(text: string, includePunctuation: boolean, includeNumbers: boolean) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const decorated = decorateWords(words, includePunctuation, includeNumbers);
  if (includePunctuation && decorated.length) {
    decorated[decorated.length - 1] = decorated[decorated.length - 1].replace(/[,;:]$/, '') + '.';
  }
  return decorated.join(' ');
}

export function buildPracticeText(options: PracticeTextOptions) {
  const sourceText = options.includeNumbers ? options.lessonText : options.lessonText.replace(/\d/g, '');
  const sourceWords = sourceText.trim().split(/\s+/).filter(Boolean);
  if (options.mode !== 'quote' && sourceWords.length === 0) sourceWords.push('practice', 'the', 'keys');
  if (!sourceWords.length) return '';

  if (options.mode === 'quote') {
    return formatText(options.lessonText, options.includePunctuation, options.includeNumbers);
  }

  if (options.mode === 'words') {
    const targetWords = Math.max(1, Math.min(500, Math.floor(options.wordCount)));
    const words: string[] = [];
    let cycle = 0;
    while (words.length < targetWords) {
      const ordered = reorderWords(sourceWords, options.difficulty, cycle);
      const available = targetWords - words.length;
      words.push(...ordered.slice(0, available));
      cycle += 1;
    }
    return decorateWords(words, options.includePunctuation, options.includeNumbers).join(' ');
  }

  const sentencePool = Object.values(sentenceBank).flat().filter((sentence) => sentence !== options.lessonText);
  const sentenceChunks = [options.lessonText];
  let generatedWordCount = sourceWords.length;
  let cycle = 0;
  while (generatedWordCount < 1000) {
    const sentence = sentencePool[cycle % sentencePool.length];
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    sentenceChunks.push(reorderWords(words, options.difficulty, cycle).join(' '));
    generatedWordCount += words.length;
    cycle += 1;
  }
  return sentenceChunks
    .map((sentence) => formatText(sentence, options.includePunctuation, options.includeNumbers))
    .join(' ');
}
