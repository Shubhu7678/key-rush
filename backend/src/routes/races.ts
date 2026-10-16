import { Router } from 'express';
import { randomUUID } from 'node:crypto';

interface Racer {
  id: string;
  name: string;
  isBot: boolean;
  progress: number;
  mistakes: number;
  wpm: number;
  typedText: string;
  finishedAt: number | null;
  botWpm?: number;
  joinedAt: number;
}

interface Race {
  id: string;
  sentence: string;
  status: 'waiting' | 'racing' | 'finished';
  createdAt: number;
  startedAt: number | null;
  racers: Racer[];
}

const router = Router();
const races = new Map<string, Race>();
const waitingRaceIds: string[] = [];
const queueFallbackMs = 7000;
const maxRaceDurationMs = 120000;
const raceSentences = [
  'A curious mind turns every small challenge into a chance to learn.',
  'Steady practice helps your hands move naturally across the keyboard.',
  'A bright idea can travel far when you give it room to grow.',
  'Take a breath, find your rhythm, and enjoy the race ahead.',
  'The best progress comes from showing up and trying one more time.',
  'Clear thoughts and relaxed fingers make a wonderful typing team.',
];
const botNames = ['Milo', 'Nova', 'Pip'];
const raceTtlMs = 30 * 60 * 1000;

function pruneRaces(now: number) {
  for (const [id, race] of races) {
    if (now - race.createdAt > raceTtlMs) races.delete(id);
  }
  for (let index = waitingRaceIds.length - 1; index >= 0; index -= 1) {
    if (!races.has(waitingRaceIds[index])) waitingRaceIds.splice(index, 1);
  }
}

function createBot(index: number, now: number): Racer {
  const botWpm = 27 + Math.floor(Math.random() * 28);
  return {
    id: `bot-${randomUUID()}`,
    name: botNames[index % botNames.length],
    isBot: true,
    progress: 0,
    mistakes: Math.floor(Math.random() * 4),
    wpm: botWpm,
    typedText: '',
    finishedAt: null,
    botWpm,
    joinedAt: now,
  };
}

function startRace(race: Race, now: number) {
  race.status = 'racing';
  race.startedAt = now;
  while (race.racers.length < 4) race.racers.push(createBot(race.racers.length - 1, now));
}

function updateBots(race: Race, now: number) {
  if (race.status !== 'racing' || !race.startedAt) return;
  if (now - race.startedAt >= maxRaceDurationMs) {
    for (const racer of race.racers) {
      if (!racer.finishedAt) racer.finishedAt = now;
    }
    race.status = 'finished';
    return;
  }
  const elapsedMinutes = (now - race.startedAt) / 60000;
  for (const racer of race.racers) {
    if (!racer.isBot || racer.finishedAt) continue;
    const targetChars = Math.floor((racer.botWpm ?? racer.wpm) * 5 * elapsedMinutes);
    racer.progress = Math.min(race.sentence.length, targetChars);
    if (racer.progress >= race.sentence.length) {
      racer.progress = race.sentence.length;
      racer.finishedAt = now;
    }
  }
  if (race.racers.every((racer) => racer.finishedAt !== null)) race.status = 'finished';
}

function serializeRace(race: Race, now: number) {
  updateBots(race, now);
  if (race.status === 'waiting' && now - race.createdAt >= queueFallbackMs) startRace(race, now);
  updateBots(race, now);
  return {
    id: race.id,
    sentence: race.sentence,
    status: race.status,
    startedAt: race.startedAt,
    elapsedSeconds: race.startedAt ? Math.max(0, Math.floor((now - race.startedAt) / 1000)) : 0,
    racers: race.racers.map(({ id, name, isBot, progress, mistakes, wpm, finishedAt }) => ({
      id,
      name,
      isBot,
      progress,
      mistakes,
      wpm,
      finishedAt,
    })),
  };
}

router.post('/join', (request, response) => {
  const playerName = typeof request.body?.name === 'string' ? request.body.name.trim().slice(0, 24) : '';
  const name = playerName || 'Guest';
  const now = Date.now();
  pruneRaces(now);

  while (waitingRaceIds.length) {
    const id = waitingRaceIds.shift();
    const waitingRace = id ? races.get(id) : undefined;
    if (!waitingRace || waitingRace.status !== 'waiting' || now - waitingRace.createdAt >= queueFallbackMs) continue;

    const player: Racer = {
      id: randomUUID(),
      name,
      isBot: false,
      progress: 0,
      mistakes: 0,
      wpm: 0,
      typedText: '',
      finishedAt: null,
      joinedAt: now,
    };
    waitingRace.racers.push(player);
    startRace(waitingRace, now);
    return response.status(200).json({ playerId: player.id, race: serializeRace(waitingRace, now) });
  }

  const player: Racer = {
    id: randomUUID(),
    name,
    isBot: false,
    progress: 0,
    mistakes: 0,
    wpm: 0,
    typedText: '',
    finishedAt: null,
    joinedAt: now,
  };
  const race: Race = {
    id: randomUUID(),
    sentence: raceSentences[Math.floor(Math.random() * raceSentences.length)],
    status: 'waiting',
    createdAt: now,
    startedAt: null,
    racers: [player],
  };
  races.set(race.id, race);
  waitingRaceIds.push(race.id);
  return response.status(201).json({ playerId: player.id, race: serializeRace(race, now) });
});

router.get('/:raceId', (request, response) => {
  const race = races.get(request.params.raceId);
  if (!race) return response.status(404).json({ message: 'Race not found.' });
  return response.json({ race: serializeRace(race, Date.now()) });
});

router.post('/:raceId/progress', (request, response) => {
  const race = races.get(request.params.raceId);
  if (!race) return response.status(404).json({ message: 'Race not found.' });
  const playerId = typeof request.body?.playerId === 'string' ? request.body.playerId : '';
  const typedText = typeof request.body?.typedText === 'string' ? request.body.typedText.slice(0, race.sentence.length) : '';
  const racer = race.racers.find((item) => item.id === playerId && !item.isBot);
  if (!racer) return response.status(404).json({ message: 'Racer not found.' });
  if (race.status !== 'racing' || racer.finishedAt) return response.status(409).json({ message: 'This race has already ended.' });

  const now = Date.now();
  racer.typedText = typedText;
  racer.progress = typedText.length;
  let mistakes = 0;
  for (let index = 0; index < typedText.length; index += 1) {
    if (typedText[index] !== race.sentence[index]) mistakes += 1;
  }
  racer.mistakes = mistakes;
  const elapsedMinutes = Math.max((now - (race.startedAt ?? now)) / 60000, 1 / 60);
  let correctCharacters = 0;
  for (let index = 0; index < typedText.length; index += 1) {
    if (typedText[index] === race.sentence[index]) correctCharacters += 1;
  }
  racer.wpm = Math.round(correctCharacters / 5 / elapsedMinutes);
  if (typedText.length >= race.sentence.length) racer.finishedAt = now;
  updateBots(race, now);
  if (race.racers.every((item) => item.finishedAt !== null)) race.status = 'finished';
  return response.json({ race: serializeRace(race, now) });
});

export default router;
