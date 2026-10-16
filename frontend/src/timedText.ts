export type Difficulty = 'easy' | 'medium' | 'hard';

export function buildTimedText(text: string, difficulty: Difficulty) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return text;

  const chunks: string[] = [];
  let cycle = 0;
  let generated = '';
  while (generated.length < 4000) {
    let orderedWords = words;
    if (difficulty === 'medium') {
      const shift = cycle % words.length;
      orderedWords = [...words.slice(shift), ...words.slice(0, shift)];
    }
    if (difficulty === 'hard') {
      const shift = (cycle * 3) % words.length;
      const rotated = [...words.slice(shift), ...words.slice(0, shift)];
      orderedWords = cycle % 2 === 0 ? rotated : [...rotated].reverse();
    }
    chunks.push(orderedWords.join(' '));
    generated = chunks.join(' ');
    cycle += 1;
  }

  return generated;
}
