export interface Lesson {
  id: string;
  number: number;
  title: string;
  keys: string;
  group: string;
  text: string;
}

const curriculum: Array<[string, string, string]> = [
  ['Left Home Row', 'A S D F', 'asdf asdf fdsa asdf'],
  ['Right Home Row', 'J K L ;', 'jkl; jkl; ;lkj jkl;'],
  ['Both Hands', 'A S D F   J K L ;', 'asdf jkl; asdf jkl;'],
  ['Home Row Combinations', 'A S D F   J K L ;', 'aj sk dl f; as jk'],
  ['Home Row Words', 'A S D F   J K L ;', 'sad dad lad flask salad'],
  ['Left Top Row', 'Q W E R', 'qwer qwer rewq'],
  ['Right Top Row', 'U I O P', 'uiop uiop poiu'],
  ['Complete Top Row', 'Q W E R T Y U I O P', 'qwertyuiop'],
  ['Top + Home Row', 'TOP + HOME', 'read word type power'],
  ['Top Row Words', 'Q W E R T Y U I O P', 'quiet write query tower'],
  ['Left Bottom Row', 'Z X C V', 'zxcv zxcv vcxz'],
  ['Right Bottom Row', 'B N M', 'bnm bnm mnb'],
  ['Complete Bottom Row', 'Z X C V B N M', 'zxcvbnm'],
  ['Bottom + Home Row', 'BOTTOM + HOME', 'van can man ban'],
  ['All Letter Rows', 'ALL LETTER ROWS', 'quick brown fox jumps'],
  ['Easy Words', 'WORD PRACTICE', 'cat dog sun run book'],
  ['Common Words', 'WORD PRACTICE', 'the and you are with'],
  ['Medium Words', 'WORD PRACTICE', 'school friend typing'],
  ['Long Words', 'WORD PRACTICE', 'computer keyboard developer'],
  ['Mixed Words', 'WORD PRACTICE', 'practice makes typing better'],
  ['Number Keys', '0 1 2 3 4 5 6 7 8 9', '12345 67890 24680'],
  ['Number Combinations', 'NUMBER PRACTICE', '123 456 789 2026'],
  ['Punctuation', 'PUNCTUATION', `.,?! ;:' "`],
  ['Short Sentences', 'REAL TYPING', 'I am learning to type faster.'],
  ['Final Beginner Test', 'REAL TYPING', 'The quick brown fox jumps over the lazy dog.'],
];

const stageNames = [
  'Stage 1: Home Row',
  'Stage 2: Top Row',
  'Stage 3: Bottom Row',
  'Stage 4: Word Practice',
  'Stage 5: Numbers & Symbols',
  'Stage 6: Real Typing',
];

export const lessons: Lesson[] = curriculum.map(([title, keys, text], index) => ({
  id: `lesson-${String(index + 1).padStart(2, '0')}`,
  number: index + 1,
  title,
  keys,
  group: stageNames[index < 5 ? 0 : index < 10 ? 1 : index < 15 ? 2 : index < 20 ? 3 : index < 23 ? 4 : 5],
  text,
}));

export const stages = Array.from(new Set(lessons.map((lesson) => lesson.group)));
