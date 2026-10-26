export interface Account {
  id: string;
  name: string;
  email: string;
}

export interface PracticeResult {
  lessonId: string;
  sentence?: string;
  mode: 'lesson' | 'time' | 'words' | 'quote' | 'race';
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimitSeconds: 0 | 10 | 15 | 30 | 60 | 120;
  wordCount: number;
  quoteLength: 'short' | 'medium' | 'long';
  includePunctuation: boolean;
  includeNumbers: boolean;
  wpm: number;
  accuracy: number;
  mistakes: number;
  durationSeconds: number;
  keyStats?: KeyStat[];
}

export interface KeyStat {
  key: string;
  attempts: number;
  mistakes: number;
}

export interface SavedSession extends PracticeResult {
  _id: string;
  createdAt: string;
  xpEarned?: number;
}

export interface UserStats {
  gamesPlayed: number;
  totalDurationSeconds: number;
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
  totalMistakes: number;
  totalXp: number;
  todayRuns: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
  lessonProgress: Array<{ lessonId: string; bestWpm: number }>;
  modeRecords: ModeStats[];
  activityDays: Array<{ date: string; runs: number }>;
  keyStats: KeyStat[];
}

export interface ModeStats {
  mode: 'time' | 'words';
  target: number;
  runs: number;
  averageWpm: number;
  bestWpm: number;
  averageAccuracy: number;
}

export interface RaceRacer {
  id: string;
  name: string;
  isBot: boolean;
  progress: number;
  mistakes: number;
  wpm: number;
  finishedAt: number | null;
}

export interface RaceState {
  id: string;
  sentence: string;
  status: 'waiting' | 'racing' | 'finished';
  startedAt: number | null;
  elapsedSeconds: number;
  racers: RaceRacer[];
}

export async function joinRace(name: string) {
  const response = await fetch(`${API_BASE}/races/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Could not find a race.');
  return data as { playerId: string; race: RaceState };
}

export async function getRace(raceId: string) {
  const response = await fetch(`${API_BASE}/races/${raceId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Race connection lost.');
  return data as { race: RaceState };
}

export async function updateRaceProgress(raceId: string, playerId: string, typedText: string) {
  const response = await fetch(`${API_BASE}/races/${raceId}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, typedText }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message ?? 'Could not update race progress.');
  return data as { race: RaceState };
}

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD
  ? 'https://key-rush-d6t3.vercel.app/api'
  : 'http://localhost:4000/api');

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message ?? 'Something went wrong. Please try again.');
  return data as T;
}

export function signIn(email: string, password: string) {
  return request<{ token: string; user: Account }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signUp(name: string, email: string, password: string) {
  return request<{ token: string; user: Account }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function signInWithGoogle(credential: string) {
  return request<{ token: string; user: Account }>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });
}

export function getCurrentAccount(token: string) {
  return request<{ user: Account }>('/auth/me', {}, token);
}

export function getSessions(token: string) {
  return request<{ sessions: SavedSession[] }>('/sessions', {}, token);
}

export function getStats(token: string) {
  return request<{ stats: UserStats }>('/sessions/stats', {}, token);
}

export function saveSession(token: string, result: PracticeResult) {
  return request<{ session: SavedSession }>('/sessions', {
    method: 'POST',
    body: JSON.stringify(result),
  }, token);
}
