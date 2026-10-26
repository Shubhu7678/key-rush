import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowLeft, ArrowRight, CircleHelp, Clock3, Crown, Flag, Flame, Keyboard, LoaderCircle, Medal, RotateCcw, Users, Zap } from 'lucide-react';
import { getRace, joinRace, saveSession, updateRaceProgress, type RaceState } from './api';
import { calculateMetrics } from './metrics';
import { calculateKeyStats } from './keyStats';

interface GameZoneProps {
  playerName: string;
  token: string;
  onExit: () => void;
  onRaceSaved: () => void;
}

type LobbyState = 'idle' | 'searching' | 'error';

export default function GameZone({ playerName, token, onExit, onRaceSaved }: GameZoneProps) {
  const [lobbyState, setLobbyState] = useState<LobbyState>('idle');
  const [race, setRace] = useState<RaceState | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [typedText, setTypedText] = useState('');
  const [error, setError] = useState('');
  const [raceXp, setRaceXp] = useState<number | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const savedRaceId = useRef('');
  const ownRacer = race?.racers.find((racer) => racer.id === playerId);
  const isRunning = race?.status === 'racing';
  const isFinished = race?.status === 'finished';
  const elapsedSeconds = race?.elapsedSeconds ?? 0;
  const metrics = useMemo(
    () => calculateMetrics(race?.sentence ?? '', typedText, elapsedSeconds),
    [race?.sentence, typedText, elapsedSeconds],
  );
  const standings = [...(race?.racers ?? [])].sort((left, right) => {
    if (left.finishedAt && !right.finishedAt) return -1;
    if (right.finishedAt && !left.finishedAt) return 1;
    return right.progress - left.progress || right.wpm - left.wpm;
  });
  const place = standings.findIndex((racer) => racer.id === playerId) + 1;

  useEffect(() => {
    if (!race || race.status === 'finished') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const result = await getRace(race.id);
        if (!cancelled) setRace(result.race);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Race connection lost.');
      }
    };
    const interval = window.setInterval(poll, 500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [race?.id, race?.status]);

  useEffect(() => {
    if (!race || !playerId || race.status !== 'racing') return;
    const timeout = window.setTimeout(() => {
      updateRaceProgress(race.id, playerId, typedText)
        .then(({ race: updated }) => setRace(updated))
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Progress update failed.'));
    }, 90);
    return () => window.clearTimeout(timeout);
  }, [typedText, race?.id, race?.status, playerId]);

  useEffect(() => {
    if (!race || race.status !== 'finished' || !ownRacer?.finishedAt || !token || savedRaceId.current === race.id) return;
    savedRaceId.current = race.id;
    saveSession(token, {
      lessonId: 'game-zone',
      sentence: race.sentence,
      mode: 'race',
      difficulty: 'medium',
      timeLimitSeconds: 0,
      wordCount: 0,
      quoteLength: 'short',
      includePunctuation: true,
      includeNumbers: false,
      wpm: ownRacer.wpm,
      accuracy: metrics.accuracy,
      mistakes: ownRacer.mistakes,
      durationSeconds: race.startedAt ? Math.max(1, Math.floor((ownRacer.finishedAt - race.startedAt) / 1000)) : 0,
      keyStats: calculateKeyStats(race.sentence, typedText),
    }).then(({ session }) => {
      setRaceXp(session.xpEarned ?? 0);
      setSaveNotice('Race saved to your stats.');
      onRaceSaved();
    }).catch(() => setSaveNotice('Race complete. Sign in to save your stats.'));
  }, [race, ownRacer, token, metrics.accuracy]);

  async function findRace() {
    setLobbyState('searching');
    setError('');
    setTypedText('');
    setRace(null);
    setPlayerId('');
    setRaceXp(null);
    setSaveNotice('');
    try {
      const result = await joinRace(playerName || 'Guest');
      setPlayerId(result.playerId);
      setRace(result.race);
      setLobbyState('idle');
    } catch (reason) {
      setLobbyState('error');
      setError(reason instanceof Error ? reason.message : 'Could not find a race.');
    }
  }

  function leaveRace() {
    setRace(null);
    setPlayerId('');
    setTypedText('');
    setError('');
    setRaceXp(null);
    setSaveNotice('');
    setLobbyState('idle');
  }

  function handleTyping(event: FormEvent<HTMLTextAreaElement>) {
    if (!race || race.status !== 'racing') return;
    setTypedText(event.currentTarget.value.slice(0, race.sentence.length));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') inputRef.current?.blur();
  }

  if (!race) {
    return (
      <div className="game-zone">
        <div className="game-zone-topline">
          <button className="race-back" onClick={onExit}><ArrowLeft size={15} /> Back to practice</button>
          <span className="arena-live"><span /> MATCHMAKING OPEN</span>
        </div>
        <section className="arena-hero">
          <div className="arena-hero-copy">
            <p className="arena-kicker"><Zap size={14} fill="currentColor" /> QUICK MATCH / TYPING SPRINT</p>
            <h2>Make your<br /><span>move.</span></h2>
            <p>Race real typists when they’re around. If the lobby is quiet, friendly bot racers jump in so the countdown never stalls.</p>
            <button className="primary-button arena-join" onClick={findRace} disabled={lobbyState === 'searching'}>
              {lobbyState === 'searching' ? <><LoaderCircle className="spin-icon" size={17} /> Finding racers…</> : <>Find a race <ArrowRight size={17} /></>}
            </button>
            {lobbyState === 'error' && <p className="arena-error" role="alert">{error}</p>}
            <div className="arena-facts"><span><Users size={14} /> Up to 4 racers</span><span><Clock3 size={14} /> One quick sprint</span><span><Flame size={14} /> {token ? 'Race XP saved' : 'Guest play welcome'}</span></div>
          </div>
          <div className="arena-track" aria-hidden="true">
            <div className="track-caption"><span>READY</span><span>SET</span><span>TYPE</span></div>
            {[0, 1, 2, 3].map((lane) => <div className={`track-lane track-lane-${lane}`} key={lane}><span className="track-lane-number">0{lane + 1}</span><span className="track-dashes" /><span className={`track-car track-car-${lane}`}>{lane === 0 ? <Keyboard size={16} /> : <Zap size={15} />}</span></div>)}
            <div className="track-finish"><Flag size={20} /><span>FINISH</span></div>
          </div>
        </section>
        <section className="arena-lobby-footer"><span><span className="lobby-pulse" /> LIVE QUEUE</span><span>First to finish wins the sprint</span><span>GUESTS WELCOME</span></section>
      </div>
    );
  }

  return (
    <div className="game-zone race-view">
      <div className="race-topline">
        <button className="race-back" onClick={leaveRace}><ArrowLeft size={15} /> Leave race</button>
        <span className={`race-status ${race.status}`}><span />{race.status === 'waiting' ? 'Finding opponents' : isFinished ? 'Race complete' : 'Race live'}</span>
        <span className="race-elapsed"><Clock3 size={13} /> {formatRaceTime(elapsedSeconds)}</span>
      </div>
      {race.status === 'waiting' ? (
        <section className="matchmaking-wait">
          <span className="matchmaking-spinner"><LoaderCircle size={23} /></span>
          <span className="eyebrow">MATCHMAKING</span>
          <h2>Finding your grid.</h2>
          <p>We’re looking for other typists. Guest racers join automatically if the lobby is quiet.</p>
          <div className="waiting-roster">{race.racers.map((racer) => <span className="waiting-avatar" key={racer.id}>{racer.name.slice(0, 1).toUpperCase()}</span>)}<span className="waiting-open">+ open seats</span></div>
          {error && <p className="arena-error" role="alert">{error}</p>}
          <button className="secondary-button" onClick={leaveRace}>Cancel search</button>
        </section>
      ) : (
        <>
          <div className="race-heading">
            <div><p className="eyebrow"><span className="eyebrow-bar" /> HEAD-TO-HEAD / SENTENCE SPRINT</p><h2>{isFinished ? place === 1 ? 'You took the lead.' : 'Race complete.' : 'Type your way to the line.'}</h2></div>
            <div className="race-place"><span>YOUR PLACE</span><strong>{isFinished ? `${place} / ${race.racers.length}` : `#${Math.max(1, place)}`}</strong></div>
          </div>
          {error && <p className="arena-error" role="alert">{error}</p>}
          <section className="race-board" aria-label="Multiplayer typing race">
            <div className="race-board-header"><span>SHARED RACE PROMPT</span><span>{race.racers.filter((racer) => racer.finishedAt).length} / {race.racers.length} FINISHED</span></div>
            <div className="race-track-list">
              {standings.map((racer, index) => (
                <div className={`race-track-row ${racer.id === playerId ? 'race-track-you' : ''}`} key={racer.id}>
                  <span className="race-rank">{racer.finishedAt ? <Medal size={15} /> : `0${index + 1}`}</span>
                  <span className={`race-avatar ${racer.isBot ? 'bot-avatar' : ''}`}>{racer.isBot ? <Zap size={13} /> : racer.name.slice(0, 1).toUpperCase()}</span>
                  <span className="race-racer-name">{racer.name}{racer.id === playerId && <small>YOU</small>}{racer.isBot && <small>BOT</small>}</span>
                  <span className="race-lane"><span style={{ width: `${Math.max(4, racer.progress / race.sentence.length * 100)}%` }} /><i style={{ left: `${Math.min(95, racer.progress / race.sentence.length * 100)}%` }}>{racer.finishedAt ? <Flag size={13} /> : <Keyboard size={12} />}</i></span>
                  <span className="race-wpm">{racer.wpm}<small>WPM</small></span>
                </div>
              ))}
            </div>
            <div className={`race-prompt ${isFinished ? 'race-prompt-finished' : ''}`} onClick={() => inputRef.current?.focus()}>
              {Array.from(race.sentence).map((character, index) => {
                const typed = typedText[index];
                const className = typed === undefined ? index === typedText.length ? 'race-char race-char-current' : 'race-char' : typed === character ? 'race-char race-char-correct' : 'race-char race-char-wrong';
                return <span className={className} key={`race-char-${index}`}>{character === ' ' ? '\u00a0' : character}</span>;
              })}
              <textarea ref={inputRef} className="typing-input" value={typedText} onChange={handleTyping} onKeyDown={handleKeyDown} aria-label="Type to race" autoCapitalize="off" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={!isRunning || Boolean(ownRacer?.finishedAt)} rows={1} />
              {isRunning && <span className="race-type-hint">Click here and type as fast as you can</span>}
            </div>
          </section>
          {isFinished ? (
            <section className="race-finish-banner">
              <span className="result-check"><Crown size={18} /></span>
              <div><strong>{place === 1 ? 'First across the finish.' : `${standings[0]?.name ?? 'Your opponent'} won this sprint.`}</strong><span>{ownRacer?.wpm ?? 0} WPM · {metrics.accuracy}% accuracy · {ownRacer?.mistakes ?? 0} mistakes. {saveNotice || (!token ? 'Sign in to save this result and earn XP.' : '')}</span></div>
              {raceXp !== null && <span className="xp-earned"><Zap size={14} /> +{raceXp} XP</span>}
              <button className="primary-button" onClick={findRace}>Race again <RotateCcw size={15} /></button>
            </section>
          ) : <div className="race-footer"><span><CircleHelp size={14} /> Your progress syncs live for every racer.</span><span>{race.racers.filter((racer) => !racer.isBot).length} human racer{race.racers.filter((racer) => !racer.isBot).length === 1 ? '' : 's'} in this heat</span></div>}
        </>
      )}
    </div>
  );
}

function formatRaceTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
