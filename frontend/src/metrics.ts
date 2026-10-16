export interface TypingMetrics {
  wpm: number;
  accuracy: number;
  mistakes: number;
  correctCharacters: number;
  typedCharacters: number;
}

export function calculateMetrics(target: string, input: string, elapsedSeconds: number): TypingMetrics {
  let correctCharacters = 0;
  const comparedLength = Math.min(target.length, input.length);

  for (let index = 0; index < comparedLength; index += 1) {
    if (target[index] === input[index]) correctCharacters += 1;
  }

  const mistakes = input.length - correctCharacters;
  const elapsedMinutes = Math.max(elapsedSeconds, 1) / 60;
  const wpm = Math.round((correctCharacters / 5 / elapsedMinutes) * 10) / 10;
  const accuracy = input.length === 0 ? 100 : Math.round((correctCharacters / input.length) * 100);

  return { wpm, accuracy, mistakes, correctCharacters, typedCharacters: input.length };
}
