import type { QuoteLength } from './practiceText';

export const sentenceBank: Record<QuoteLength, string[]> = {
  short: [
    'Small steps build steady habits.',
    'Clear focus makes practice easier.',
    'Take a breath and keep going.',
    'A calm hand finds every key.',
    'Good rhythm grows with practice.',
    'Bright ideas begin with focus.',
    'Each new try makes progress.',
    'The quiet morning feels fresh.',
  ],
  medium: [
    'A relaxed rhythm helps every sentence feel easier to type.',
    'Practice a little each day and your hands will remember the keys.',
    'The curious student found a comfortable pace and kept moving forward.',
    'Careful typing turns small improvements into lasting confidence.',
    'A clear sentence gives your fingers a path to follow.',
    'Stay patient when a tricky word asks for another try.',
    'Good posture and steady breathing make long sessions feel lighter.',
    'New ideas often appear when the room is quiet and bright.',
  ],
  long: [
    'A thoughtful typist takes time to find a steady rhythm, watches each word appear, and lets accuracy lead the way.',
    'The best practice session is one that feels focused but relaxed, with enough variety to keep your attention moving.',
    'When the keys begin to feel familiar, you can spend less time searching and more time shaping the thought you want to share.',
    'Every sentence is a small journey across the keyboard, and each careful repetition makes the next one feel more natural.',
    'A quiet moment, a clear idea, and patient hands can turn a long paragraph into a smooth stream of words.',
    'Try to notice the spaces between words as well as the letters, because a comfortable pace depends on both.',
    'Progress does not need to arrive all at once; it grows through many short sessions and a willingness to begin again.',
    'The more often you practice with intention, the more your hands learn to move without interrupting your thoughts.',
  ],
};

const allSentences = Object.values(sentenceBank).flat();

export function getRandomSentence(length?: QuoteLength, exclude?: string) {
  const choices = (length ? sentenceBank[length] : allSentences).filter((sentence) => sentence !== exclude);
  const available = choices.length ? choices : length ? sentenceBank[length] : allSentences;
  return available[Math.floor(Math.random() * available.length)];
}
