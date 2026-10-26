import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Command,
  CheckCircle2,
  Flame,
  Gamepad2,
  Keyboard,
  LogOut,
  Moon,
  Palette,
  Quote,
  RotateCcw,
  Sun,
  Target,
  Type,
  Sparkles,
  Shuffle,
  Trophy,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import {
  getCurrentAccount,
  getSessions,
  getStats,
  saveSession,
  signIn,
  signInWithGoogle,
  signUp,
  type Account,
  type SavedSession,
  type UserStats,
} from './api';
import { buildLessonPracticeText, lessons } from './lessons';
import { buildActivityGrid, buildModeRecords, calculateKeyStats, recommendLessonForKey } from './keyStats';
import { calculateMetrics } from './metrics';
import { buildPracticeText, type QuoteLength, type TypingMode } from './practiceText';
import { getRandomSentence } from './sentences';
import GameZone from './GameZone';

type Theme = 'light' | 'dark';
const colorPalettes = [
  { id: 'coral', label: 'Coral', color: '#e75f48' },
  { id: 'ocean', label: 'Ocean', color: '#3868c9' },
  { id: 'forest', label: 'Forest', color: '#27805d' },
  { id: 'violet', label: 'Violet', color: '#7655c5' },
  { id: 'amber', label: 'Amber', color: '#aa6810' },
] as const;
type ColorPalette = (typeof colorPalettes)[number]['id'];
type AuthResult = { token: string; user: Account };

function getTypingLineOffset(windowElement: HTMLDivElement | null, copyElement: HTMLDivElement | null) {
  const currentCharacter = copyElement?.querySelector('.character-current') ?? copyElement?.lastElementChild;
  if (!windowElement || !copyElement || !currentCharacter) return 0;

  const lineHeight = Number.parseFloat(getComputedStyle(copyElement).lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return 0;

  const currentLine = Math.round(
    (currentCharacter.getBoundingClientRect().top - copyElement.getBoundingClientRect().top) / lineHeight,
  );
  return Math.max(0, currentLine - 2) * lineHeight;
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('keyrush-theme') === 'dark' ? 'dark' : 'light',
  );
  const [palette, setPalette] = useState<ColorPalette>(() => {
    const savedPalette = localStorage.getItem('keyrush-palette');
    return colorPalettes.find(({ id }) => id === savedPalette)?.id ?? 'coral';
  });
  const [token, setToken] = useState(() => localStorage.getItem('keyrush-token') ?? '');
  const [user, setUser] = useState<Account | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(Boolean(token));
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('keyrush-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem('keyrush-palette', palette);
  }, [palette]);

  useEffect(() => {
    if (!token) {
      setCheckingAccount(false);
      return;
    }
    getCurrentAccount(token)
      .then(({ user: account }) => setUser(account))
      .catch(() => {
        localStorage.removeItem('keyrush-token');
        setToken('');
        setUser(null);
      })
      .finally(() => setCheckingAccount(false));
  }, [token]);

  function completeSignIn(result: AuthResult) {
    localStorage.setItem('keyrush-token', result.token);
    setToken(result.token);
    setUser(result.user);
    navigate('/');
  }

  function signOut() {
    localStorage.removeItem('keyrush-token');
    setToken('');
    setUser(null);
  }

  function toggleTheme() {
    setTheme((current) => current === 'light' ? 'dark' : 'light');
  }

  const routes = (
    <Routes>
      <Route
        path="/login"
        element={<AuthPage mode="login" theme={theme} palette={palette} onPaletteChange={setPalette} onToggleTheme={toggleTheme} onAuth={completeSignIn} />}
      />
      <Route
        path="/signup"
        element={<AuthPage mode="signup" theme={theme} palette={palette} onPaletteChange={setPalette} onToggleTheme={toggleTheme} onAuth={completeSignIn} />}
      />
      <Route
        path="*"
        element={checkingAccount ? <LoadingScreen /> : (
          <PracticeApp user={user} token={token} onSignOut={signOut} theme={theme} palette={palette} onPaletteChange={setPalette} onToggleTheme={toggleTheme} />
        )}
      />
    </Routes>
  );
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  return googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{routes}</GoogleOAuthProvider>
    : routes;
}

interface AuthPageProps {
  mode: 'login' | 'signup';
  theme: Theme;
  palette: ColorPalette;
  onPaletteChange: (palette: ColorPalette) => void;
  onToggleTheme: () => void;
  onAuth: (result: AuthResult) => void;
}

function AuthPage({ mode, theme, palette, onPaletteChange, onToggleTheme, onAuth }: AuthPageProps) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const location = useLocation();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = isSignup
        ? await signUp(name, email, password)
        : await signIn(email, password);
      onAuth(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function submitGoogleCredential(credential?: string) {
    if (!credential) {
      setError('Google did not return a sign-in credential. Please try again.');
      return;
    }
    setGoogleLoading(true);
    setError('');
    try {
      onAuth(await signInWithGoogle(credential));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-layout">
      <aside className="auth-art">
        <div className="auth-art-top">
          <Link className="brand brand-light" to="/" aria-label="KeyRush home">
            <span className="brand-mark"><Keyboard size={20} strokeWidth={2.2} /></span>
            <span>keyrush<span className="brand-period">.</span></span>
          </Link>
          <span className="auth-edition">THE DAILY PRACTICE</span>
        </div>
        <div className="auth-art-copy">
          <div className="art-spark"><Zap size={16} fill="currentColor" /></div>
          <p className="eyebrow">A little faster. Every day.</p>
          <h1>Find your<br />typing <span>flow.</span></h1>
          <p className="art-description">Small, focused sessions. A rhythm that sticks. Your hands know the way.</p>
          <div className="key-art" aria-hidden="true">
            <div className="key-row key-row-one"><span>Q</span><span>W</span><span>E</span><span>R</span><span>T</span><span>Y</span><span>U</span><span>I</span><span>O</span><span>P</span></div>
            <div className="key-row key-row-two"><span>A</span><span>S</span><span className="key-lit">D</span><span className="key-lit">F</span><span>G</span><span>H</span><span className="key-lit">J</span><span className="key-lit">K</span><span>L</span><span>;</span></div>
            <div className="key-row key-row-three"><span>⇧</span><span>Z</span><span>X</span><span>C</span><span>V</span><span>B</span><span>N</span><span>M</span><span>⌫</span></div>
            <div className="key-row key-row-four"><span className="space-key">SPACE</span><span>↵</span></div>
          </div>
        </div>
        <div className="auth-art-foot"><span>LESS PRESSURE. MORE PROGRESS.</span><span>01 / 04</span></div>
      </aside>

      <main className="auth-main">
        <div className="auth-main-top">
          <Link className="auth-back" to="/"><ArrowLeft size={16} /> Back to practice</Link>
          <div className="appearance-controls">
            <ColorThemePicker palette={palette} onPaletteChange={onPaletteChange} />
            <button className="icon-button theme-switch" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title="Change appearance">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
        </div>
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand"><span className="brand-mark"><Keyboard size={18} /></span> keyrush<span className="brand-period">.</span></div>
          <p className="auth-kicker">{isSignup ? 'YOUR NEXT CHAPTER' : 'GOOD TO HAVE YOU BACK'}</p>
          <h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subtitle">{isSignup ? 'Save your progress and keep your streak going.' : 'Pick up right where your fingers left off.'}</p>
          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label className="field-label">
                Your name
                <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" required minLength={2} maxLength={60} />
              </label>
            )}
            <label className="field-label">
              Email address
              <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
            </label>
            <label className="field-label">
              Password
              <input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Your password'} required minLength={isSignup ? 8 : undefined} />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={loading}>
              {loading ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
          <div className="auth-divider"><span>OR CONTINUE WITH</span></div>
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <div className={`google-signin ${googleLoading ? 'google-signin-loading' : ''}`}>
              <GoogleLogin
                onSuccess={({ credential }) => void submitGoogleCredential(credential)}
                onError={() => setError('Google sign-in could not be completed. Please try again.')}
                text="continue_with"
                theme={theme === 'dark' ? 'filled_black' : 'outline'}
                shape="rectangular"
                size="large"
                width={Math.min(390, window.innerWidth - 44)}
              />
            </div>
          ) : (
            <p className="google-signin-config">Google sign-in is available after an administrator configures the Google OAuth client.</p>
          )}
          <p className="auth-toggle">
            {isSignup ? 'Already have an account?' : 'New to KeyRush?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'} state={location.state}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
          </p>
          <div className="auth-trust"><span><Check size={13} /> Your progress, saved</span><span><Check size={13} /> Just you and the keys</span></div>
        </div>
        <div className="auth-main-foot"><span>KEYRUSH / EST. 2025</span><span>MADE FOR THE LONG GAME</span></div>
      </main>
    </div>
  );
}

interface PracticeAppProps {
  user: Account | null;
  token: string;
  onSignOut: () => void;
  theme: Theme;
  palette: ColorPalette;
  onPaletteChange: (palette: ColorPalette) => void;
  onToggleTheme: () => void;
}

function PracticeApp({ user, token, onSignOut, theme, palette, onPaletteChange, onToggleTheme }: PracticeAppProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(lessons[0].id);
  const [typingMode, setTypingMode] = useState<TypingMode>('time');
  const [beginnerPracticeMode, setBeginnerPracticeMode] = useState<'lesson' | 'time' | 'words'>('lesson');
  const [beginnerWordCount, setBeginnerWordCount] = useState<10 | 50 | 100>(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<10 | 15 | 30 | 60 | 120>(30);
  const [wordPreset, setWordPreset] = useState('25');
  const [customWordCount, setCustomWordCount] = useState('25');
  const [quoteLength, setQuoteLength] = useState<QuoteLength>('short');
  const [currentSentence, setCurrentSentence] = useState(() => getRandomSentence());
  const [lessonPrompt, setLessonPrompt] = useState(() => buildLessonPracticeText(lessons[0]));
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [input, setInput] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const typingWindow = useRef<HTMLDivElement>(null);
  const typingCopy = useRef<HTMLDivElement>(null);
  const [typingLineOffset, setTypingLineOffset] = useState(0);
  const didSave = useRef(false);
  const lesson = lessons.find((item) => item.id === selectedId) ?? lessons[0];
  const isStatsPage = location.pathname === '/stats';
  const isModesPage = location.pathname === '/modes';
  const isGameZone = location.pathname === '/game-zone';
  const isLearningPage = !isStatsPage && !isModesPage && !isGameZone;
  const selectedWordCount = wordPreset === 'custom'
    ? Math.max(1, Math.min(500, Number.parseInt(customWordCount, 10) || 1))
    : Number(wordPreset);
  const runText = useMemo(() => isModesPage ? buildPracticeText({
    lessonText: currentSentence,
    difficulty,
    mode: typingMode,
    timeLimitSeconds,
    wordCount: selectedWordCount,
    quoteLength,
    includePunctuation,
    includeNumbers,
  }) : beginnerPracticeMode === 'words'
    ? buildLessonPracticeText(lesson, lessonPrompt, beginnerWordCount)
    : lessonPrompt, [isModesPage, currentSentence, lessonPrompt, lesson, beginnerPracticeMode, beginnerWordCount, difficulty, typingMode, timeLimitSeconds, selectedWordCount, quoteLength, includePunctuation, includeNumbers]);
  const isComplete = finishedAt !== null;
  const isTimedMode = isModesPage ? typingMode === 'time' : isLearningPage && beginnerPracticeMode === 'time';
  const elapsedSeconds = startedAt === null
    ? 0
    : Math.max(0, Math.floor(((finishedAt ?? now) - startedAt) / 1000));
  const metrics = calculateMetrics(runText, input, elapsedSeconds);
  const groups = Array.from(new Set(lessons.map((item) => item.group)));
  const stageNumber = groups.indexOf(lesson.group) + 1;
  const remainingSeconds = isTimedMode ? Math.max(0, timeLimitSeconds - elapsedSeconds) : elapsedSeconds;
  const countdownSeconds = countdownEndsAt === null ? null : Math.max(0, Math.ceil((countdownEndsAt - now) / 1000));
  const [openStage, setOpenStage] = useState(lesson.group);
  const completedLessonIds = new Set((stats?.lessonProgress ?? []).map(({ lessonId }) => lessonId));
  const lessonBests = new Map((stats?.lessonProgress ?? []).map(({ lessonId, bestWpm }) => [lessonId, bestWpm]));
  const nextChallenge = lessons.find((item) => !completedLessonIds.has(item.id)) ?? lessons[lessons.length - 1];

  useLayoutEffect(() => {
    setTypingLineOffset(getTypingLineOffset(typingWindow.current, typingCopy.current));
  }, [input, runText]);

  useEffect(() => {
    const windowElement = typingWindow.current;
    if (!windowElement) return;
    const observer = new ResizeObserver(() => {
      setTypingLineOffset(getTypingLineOffset(windowElement, typingCopy.current));
    });
    observer.observe(windowElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if ((!startedAt && countdownEndsAt === null) || finishedAt) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (countdownEndsAt !== null && currentTime >= countdownEndsAt) {
        setStartedAt(countdownEndsAt);
        setCountdownEndsAt(null);
      } else if (startedAt !== null && isTimedMode && currentTime - startedAt >= timeLimitSeconds * 1000) {
        setFinishedAt(startedAt + timeLimitSeconds * 1000);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [startedAt, countdownEndsAt, finishedAt, timeLimitSeconds, isTimedMode]);

  useEffect(() => {
    if (isModesPage && startedAt !== null) {
      textInput.current?.focus({ preventScroll: true });
    }
  }, [isModesPage, startedAt]);

  useEffect(() => {
    if (!token) {
      setSessions([]);
      return;
    }
    if (isStatsPage) {
      setSessions([]);
    } else {
      getSessions(token).then(({ sessions: saved }) => setSessions(saved)).catch(() => setSessions([]));
    }
  }, [token, isStatsPage]);

  useEffect(() => {
    if (!token) {
      setStats(null);
      return;
    }
    getStats(token).then(({ stats: accountStats }) => setStats(accountStats)).catch(() => setStats(null));
  }, [token]);

  useEffect(() => {
    if (!isComplete || !token || didSave.current) return;
    didSave.current = true;
    setSaveMessage('Saving result…');
    saveSession(token, {
      lessonId: isModesPage ? 'sentence-mode' : lesson.id,
      sentence: isModesPage ? currentSentence : '',
      mode: isModesPage ? typingMode : beginnerPracticeMode,
      difficulty: isModesPage ? difficulty : 'easy',
      timeLimitSeconds: isTimedMode ? timeLimitSeconds : 0,
      wordCount: isModesPage && typingMode === 'words' ? selectedWordCount : !isModesPage && beginnerPracticeMode === 'words' ? beginnerWordCount : 0,
      quoteLength: isModesPage && typingMode === 'quote' ? quoteLength : 'short',
      includePunctuation: isModesPage && includePunctuation,
      includeNumbers: isModesPage && includeNumbers,
      wpm: metrics.wpm,
      accuracy: metrics.accuracy,
      mistakes: metrics.mistakes,
      durationSeconds: elapsedSeconds,
      keyStats: calculateKeyStats(runText, input),
    }).then(({ session }) => {
      setSessions((current) => [session, ...current].slice(0, 20));
      setEarnedXp(session.xpEarned ?? 0);
      getStats(token).then(({ stats: accountStats }) => setStats(accountStats)).catch(() => undefined);
      setSaveMessage('Result saved to your practice history.');
    }).catch(() => setSaveMessage('Result complete. It could not be saved right now.'));
  }, [isComplete, token, lesson.id, currentSentence, isModesPage, typingMode, beginnerPracticeMode, beginnerWordCount, difficulty, timeLimitSeconds, selectedWordCount, quoteLength, includePunctuation, includeNumbers, metrics.wpm, metrics.accuracy, metrics.mistakes, elapsedSeconds, isTimedMode]);

  function resetPractice(nextLessonId = selectedId, shouldFocus = true, closePanel = true) {
    setSelectedId(nextLessonId);
    setInput('');
    setStartedAt(null);
    setCountdownEndsAt(null);
    setFinishedAt(null);
    setNow(Date.now());
    setSaveMessage('');
    setEarnedXp(null);
    didSave.current = false;
    if (closePanel) setMobileMenuOpen(false);
    if (shouldFocus) window.setTimeout(() => textInput.current?.focus({ preventScroll: true }), 0);
  }

  function startModePractice() {
    const startTime = Date.now();
    resetPractice(selectedId, false, false);
    setNow(startTime);
    setCountdownEndsAt(startTime + 5000);
  }

  function handleTyping(event: FormEvent<HTMLTextAreaElement>) {
    if (isModesPage && startedAt === null) return;
    const nextInput = event.currentTarget.value.slice(0, runText.length);
    setInput(nextInput);
    if (nextInput.length > 0 && startedAt === null) setStartedAt(Date.now());
    if (!isTimedMode && nextInput.length >= runText.length) setFinishedAt(Date.now());
  }

  function selectLesson(nextLessonId: string) {
    if (isStatsPage || isModesPage) navigate('/');
    const nextLesson = lessons.find((item) => item.id === nextLessonId);
    if (nextLesson) {
      setOpenStage(nextLesson.group);
      setLessonPrompt(buildLessonPracticeText(nextLesson, runText));
    }
    resetPractice(nextLessonId);
  }

  function beginNextChallenge() {
    selectLesson(nextChallenge.id);
  }

  function startNewSentence(length = typingMode === 'quote' ? quoteLength : undefined) {
    setCurrentSentence(getRandomSentence(length, currentSentence));
    resetPractice(selectedId, false, false);
  }

  function startNewLessonSentence() {
    setLessonPrompt(buildLessonPracticeText(lesson, runText));
    resetPractice(selectedId, false, false);
  }

  function advanceLesson() {
    const currentIndex = lessons.findIndex((item) => item.id === selectedId);
    const next = lessons[(currentIndex + 1) % lessons.length];
    selectLesson(next.id);
  }

  function handleTypingKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Escape') textInput.current?.blur();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <Link className="brand" to="/" aria-label="KeyRush home">
            <span className="brand-mark"><Keyboard size={19} strokeWidth={2.2} /></span>
            <span>keyrush<span className="brand-period">.</span></span>
          </Link>
          <span className="sidebar-label">TYPING STUDIO</span>
        </div>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link className={`primary-nav-link ${isLearningPage ? 'primary-nav-link-active' : ''}`} to="/" aria-label="Beginner Learning">
            <BookOpen size={17} /><span>Beginner Learning</span>
          </Link>
          <Link className={`primary-nav-link ${isModesPage ? 'primary-nav-link-active' : ''}`} to="/modes" aria-label="Typing Modes">
            <Keyboard size={17} /><span>Typing Modes</span>
          </Link>
          <Link className={`primary-nav-link ${isGameZone ? 'primary-nav-link-active' : ''}`} to="/game-zone" aria-label="Game Zone">
            <Gamepad2 size={17} /><span>Game Zone</span>
          </Link>
          <Link className={`primary-nav-link ${isStatsPage ? 'primary-nav-link-active' : ''}`} to="/stats" aria-label="Total Stats">
            <BarChart3 size={17} /><span>Total Stats</span>
          </Link>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <div className="user-block">
            <span className="avatar">{user ? user.name.trim().charAt(0).toUpperCase() : <UserRound size={16} />}</span>
            <div className="user-detail"><strong>{user?.name ?? 'Guest practice'}</strong><span>{user ? 'Account active' : 'Progress stays here'}</span></div>
            {user ? (
              <button className="icon-button sidebar-action" onClick={onSignOut} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
            ) : <Link className="user-sign-in" to="/login" title="Sign in"><ArrowUpRight size={17} /></Link>}
          </div>
        </div>
      </aside>
      {!isStatsPage && !isGameZone && (
        <aside className={`lesson-panel ${isModesPage ? 'lesson-panel-modes' : ''} ${mobileMenuOpen ? 'lesson-panel-open' : ''}`}>
          <nav className="mobile-primary-links" aria-label="Main navigation">
            <Link className={`primary-nav-link ${isLearningPage ? 'primary-nav-link-active' : ''}`} to="/" aria-label="Beginner Learning" onClick={() => setMobileMenuOpen(true)}><BookOpen size={17} /><span>Beginner Learning</span></Link>
            <Link className={`primary-nav-link ${isModesPage ? 'primary-nav-link-active' : ''}`} to="/modes" aria-label="Typing Modes" onClick={() => setMobileMenuOpen(true)}><Keyboard size={17} /><span>Typing Modes</span></Link>
            <Link className="primary-nav-link" to="/stats" aria-label="Total Stats" onClick={() => setMobileMenuOpen(false)}><BarChart3 size={17} /><span>Total Stats</span></Link>
          </nav>
          <div className="lesson-panel-heading">
            <div><span className="lesson-panel-kicker">{isModesPage ? 'TYPING MODES' : 'BEGINNER LEARNING'}</span><strong>{isModesPage ? 'Practice setup' : 'Your path'}</strong></div>
            <span className="lesson-panel-total">{isModesPage ? '03 MODES' : `${completedLessonIds.size} / 25`}</span>
          </div>
          {isLearningPage && <>
          <button className="next-challenge" onClick={beginNextChallenge}>
            <span className="next-challenge-label">{completedLessonIds.has(nextChallenge.id) ? 'REPLAY FINAL CHALLENGE' : 'UP NEXT'}</span>
            <span className="next-challenge-title">{String(nextChallenge.number).padStart(2, '0')} · {nextChallenge.title}</span>
            <span className="next-challenge-action">Continue learning <ArrowRight size={14} /></span>
          </button>
          <div className="lesson-nav">
            {groups.map((group, groupIndex) => {
              const stageLessons = lessons.filter((item) => item.group === group);
              const stageCompleted = stageLessons.filter((item) => completedLessonIds.has(item.id)).length;
              const isOpen = openStage === group;
              return (
                <section className={`lesson-group ${isOpen ? 'lesson-group-open' : ''}`} key={group}>
                  <button className="stage-toggle" aria-expanded={isOpen} onClick={() => setOpenStage(isOpen ? '' : group)}>
                    <span className={`group-dot group-dot-${groupIndex}`} />
                    <span className="stage-toggle-name"><strong>Stage {groupIndex + 1}</strong><span>{group.replace(/^Stage \d+: /, '')}</span></span>
                    <span className="stage-progress-label">{stageCompleted}/{stageLessons.length}</span>
                    <ChevronRight size={14} className="stage-chevron" />
                  </button>
                  {isOpen && <div className="stage-lessons">
                    {stageLessons.map((item) => {
                      const bestWpm = lessonBests.get(item.id);
                      const isCompleted = completedLessonIds.has(item.id);
                      return (
                        <button
                          className={`lesson-link ${selectedId === item.id ? 'lesson-link-active' : ''}`}
                          key={item.id}
                          onClick={() => selectLesson(item.id)}
                          aria-current={selectedId === item.id ? 'page' : undefined}
                        >
                          <span className="lesson-number">{isCompleted ? <CheckCircle2 size={14} /> : String(item.number).padStart(2, '0')}</span>
                          <span className="lesson-link-title">{item.title}</span>
                          {bestWpm !== undefined && <span className="lesson-best">{bestWpm}<small>WPM</small></span>}
                          {selectedId === item.id && <ChevronRight size={14} className="lesson-chevron" />}
                        </button>
                      );
                    })}
                  </div>}
                </section>
              );
            })}
          </div>
          <div className="lesson-panel-foot"><Trophy size={14} /><span>{stats?.gamesPlayed ?? 0} runs saved</span></div>
          </>}
        </aside>
      )}
      {(isStatsPage || isGameZone) && mobileMenuOpen && (
        <aside className="mobile-nav-panel">
          <nav className="mobile-primary-links" aria-label="Main navigation">
            <Link className="primary-nav-link" to="/" aria-label="Beginner Learning" onClick={() => setMobileMenuOpen(true)}><BookOpen size={17} /><span>Beginner Learning</span></Link>
            <Link className="primary-nav-link" to="/modes" aria-label="Typing Modes" onClick={() => setMobileMenuOpen(true)}><Keyboard size={17} /><span>Typing Modes</span></Link>
            <Link className={`primary-nav-link ${isGameZone ? 'primary-nav-link-active' : ''}`} to="/game-zone" aria-label="Game Zone" onClick={() => setMobileMenuOpen(true)}><Gamepad2 size={17} /><span>Game Zone</span></Link>
            <Link className={`primary-nav-link ${isStatsPage ? 'primary-nav-link-active' : ''}`} to="/stats" aria-label="Total Stats" onClick={() => setMobileMenuOpen(false)}><BarChart3 size={17} /><span>Total Stats</span></Link>
          </nav>
        </aside>
      )}
      {mobileMenuOpen && <button className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" />}

      <main className={`studio-main ${isStatsPage || isGameZone ? 'studio-main-stats' : ''} ${isModesPage ? 'studio-main-modes' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button icon-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open lesson menu'}>
              {mobileMenuOpen ? <X size={19} /> : <Keyboard size={19} />}
            </button>
            <span className="breadcrumb">Studio <ChevronRight size={14} /> <strong>{isStatsPage ? 'Total Stats' : isGameZone ? 'Game Zone' : isModesPage ? 'Typing Modes' : 'Beginner Learning'}</strong></span>
          </div>
          <div className="topbar-right">
            <span className="daily-mark"><span /> DAILY PRACTICE</span>
            <ColorThemePicker palette={palette} onPaletteChange={onPaletteChange} />
            <button className="icon-button theme-switch" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title="Change appearance">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {!user && <Link className="topbar-signin" to="/login">Sign in <ArrowUpRight size={14} /></Link>}
          </div>
        </header>

        <div className={`studio-content ${isStatsPage ? 'studio-content-stats' : ''} ${isModesPage ? 'studio-content-modes' : ''}`}>
          {!isGameZone && !isStatsPage && <section className={`practice-heading ${isModesPage ? 'practice-heading-modes' : ''}`}>
            <div>
              <p className="eyebrow"><span className="eyebrow-bar" /> {isModesPage ? 'MODE SETTINGS' : lesson.group.toUpperCase()}</p>
              <h1>{isModesPage ? 'Pick your pace. Lock in.' : user ? `Ready, ${user.name.split(' ')[0]}?` : 'Find your home row.'}</h1>
              <p className="heading-subtitle">{isModesPage ? 'Pick a mode, tune your setup, and get into your flow.' : 'Choose a lesson, click the practice text, and type what you see. Accuracy comes before speed.'}</p>
            </div>
            {isLearningPage && <div className="lesson-badge"><span>LESSON</span><strong>{String(lesson.number).padStart(2, '0')}<i> / {String(lessons.length).padStart(2, '0')}</i></strong></div>}
          </section>}

          {!isStatsPage && !isGameZone && <section className="momentum-panel" aria-label="Practice momentum">
            <div className="momentum-xp">
              <span className="momentum-icon momentum-icon-xp"><Sparkles size={16} /></span>
              <span className="momentum-copy"><small>YOUR XP</small><strong>{stats?.totalXp ?? 0}<i> XP</i></strong></span>
              <span className="level-chip">LEVEL {Math.floor((stats?.totalXp ?? 0) / 250) + 1}</span>
              <span className="xp-progress-track"><span style={{ width: `${((stats?.totalXp ?? 0) % 250) / 2.5}%` }} /></span>
              <small className="xp-next-level">{250 - ((stats?.totalXp ?? 0) % 250)} XP to next level</small>
            </div>
            <div className="momentum-streak">
              <span className="momentum-icon momentum-icon-streak"><Flame size={16} /></span>
              <span className="momentum-copy"><small>DAY STREAK</small><strong>{stats?.currentStreak ?? 0}<i> days</i></strong></span>
              <span className="streak-best">BEST {stats?.longestStreak ?? 0}</span>
            </div>
            <div className="momentum-goal">
              <span className="goal-count">{Math.min(stats?.todayRuns ?? 0, stats?.dailyGoal ?? 3)}<i> / {stats?.dailyGoal ?? 3}</i></span>
              <div className="goal-copy"><strong>Daily practice</strong><span>{(stats?.todayRuns ?? 0) >= (stats?.dailyGoal ?? 3) ? 'Goal complete. Nice work.' : `${(stats?.dailyGoal ?? 3) - (stats?.todayRuns ?? 0)} more ${((stats?.dailyGoal ?? 3) - (stats?.todayRuns ?? 0)) === 1 ? 'run' : 'runs'} to reach today’s goal`}</span></div>
              <div className="goal-progress-track"><span style={{ width: `${Math.min(100, ((stats?.todayRuns ?? 0) / (stats?.dailyGoal ?? 3)) * 100)}%` }} /></div>
            </div>
          </section>}

          {isGameZone ? (
            <GameZone
              playerName={user?.name ?? 'Guest'}
              token={token}
              onExit={() => navigate('/')}
              onRaceSaved={() => {
                if (!token) return;
                getSessions(token).then(({ sessions: saved }) => setSessions(saved)).catch(() => undefined);
                getStats(token).then(({ stats: accountStats }) => setStats(accountStats)).catch(() => undefined);
              }}
            />
          ) : isStatsPage ? (
            <TotalStats user={user} stats={stats} onSelectLesson={selectLesson} />
          ) : (
          <>
          {isModesPage && <section className="mode-main-settings" aria-label="Typing mode options">
            <div className="mode-settings-heading">
              <div>
                <span className="setting-label">PICK YOUR MODE</span>
                <strong>{typingMode === 'time' ? 'Beat the clock.' : typingMode === 'words' ? 'Set your own pace.' : 'Find your flow.'}</strong>
              </div>
              <div className="mode-tabs mode-tabs-main" role="group" aria-label="Typing mode">
                {(['time', 'words', 'quote'] as const).map((mode) => (
                  <button key={mode} className={typingMode === mode ? 'mode-tab mode-tab-active' : 'mode-tab'} aria-pressed={typingMode === mode} onClick={() => {
                    setTypingMode(mode);
                    if (mode === 'quote') setCurrentSentence(getRandomSentence(quoteLength, currentSentence));
                    resetPractice(selectedId, false, false);
                  }}>
                    {mode === 'time' ? <Clock3 size={15} /> : mode === 'words' ? <Type size={15} /> : <Quote size={15} />}{mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="mode-main-settings-top">
              <div className="mode-main-selector">
                <span className="setting-label">{typingMode === 'time' ? 'DURATION' : typingMode === 'words' ? 'WORD COUNT' : 'QUOTE LENGTH'}</span>
                {typingMode === 'time' && <div className="segmented-control" role="group" aria-label="Time duration">
                  {([15, 30, 60, 120] as const).map((seconds) => <button key={seconds} className={timeLimitSeconds === seconds ? 'segment-active' : ''} aria-pressed={timeLimitSeconds === seconds} onClick={() => { setTimeLimitSeconds(seconds); resetPractice(selectedId, false, false); }}>{seconds < 60 ? `${seconds}s` : `${seconds / 60} min`}</button>)}
                </div>}
                {typingMode === 'words' && <div className="word-count-options" role="group" aria-label="Word count">
                  {['10', '25', '50', '100', 'custom'].map((count) => <button key={count} className={wordPreset === count ? 'mode-chip mode-chip-active' : 'mode-chip'} aria-pressed={wordPreset === count} onClick={() => { setWordPreset(count); if (count !== 'custom') setCustomWordCount(count); resetPractice(selectedId, false, false); }}>{count === 'custom' ? 'Custom' : count}</button>)}
                  {wordPreset === 'custom' && <label className="custom-word-input"><span className="visually-hidden">Custom word count</span><input type="number" min="1" max="500" value={customWordCount} onChange={(event) => { setCustomWordCount(event.target.value); resetPractice(selectedId, false, false); }} /></label>}
                </div>}
                {typingMode === 'quote' && <div className="segmented-control" role="group" aria-label="Quote length">
                  {(['short', 'medium', 'long'] as const).map((length) => <button key={length} className={quoteLength === length ? 'segment-active' : ''} aria-pressed={quoteLength === length} onClick={() => { setQuoteLength(length); setCurrentSentence(getRandomSentence(length, currentSentence)); resetPractice(selectedId, false, false); }}>{length}</button>)}
                </div>}
              </div>
              <button className="secondary-button new-sentence-button" onClick={() => startNewSentence()}><RotateCcw size={14} /> New sentence</button>
            </div>
            <div className="mode-main-settings-bottom">
              <div className="mode-toggles">
                <label className="mode-toggle"><input type="checkbox" checked={includePunctuation} onChange={(event) => { setIncludePunctuation(event.target.checked); resetPractice(selectedId, false, false); }} /><span className="toggle-track" /><span>Punctuation</span></label>
                <label className="mode-toggle"><input type="checkbox" checked={includeNumbers} onChange={(event) => { setIncludeNumbers(event.target.checked); resetPractice(selectedId, false, false); }} /><span className="toggle-track" /><span>Numbers</span></label>
              </div>
              <div className="mode-difficulty" role="group" aria-label="Difficulty"><span>LEVEL</span>
                {(['easy', 'medium', 'hard'] as const).map((level) => <button key={level} className={difficulty === level ? 'difficulty-choice difficulty-choice-active' : 'difficulty-choice'} aria-pressed={difficulty === level} onClick={() => { setDifficulty(level); resetPractice(selectedId, false, false); }}>{level}</button>)}
              </div>
            </div>
          </section>}
          {isModesPage && <section className="run-settings" aria-label="Current typing mode">
            <span className="mode-summary-icon">{typingMode === 'time' ? <Clock3 size={15} /> : typingMode === 'words' ? <Type size={15} /> : <Quote size={15} />}</span>
            <strong>{typingMode === 'time' ? 'Timed practice' : typingMode === 'words' ? 'Word count' : 'Quote practice'}</strong>
            <span>{typingMode === 'time' ? `${timeLimitSeconds} seconds` : typingMode === 'words' ? `${selectedWordCount} words` : `${quoteLength} quote`}</span>
            <span className="mode-setting-tags">{difficulty}{includePunctuation ? ' · punctuation' : ''}{includeNumbers ? ' · numbers' : ''}</span>
          </section>}
          {isLearningPage && <section className="beginner-guide" aria-label="How to practice">
            <strong>FIRST RUN?</strong>
            <span><i>1</i> Pick a lesson in Your path</span>
            <span><i>2</i> Click the text and type it</span>
            <span><i>3</i> Go for accuracy, not speed</span>
          </section>}
          {isLearningPage && <section className="beginner-run-controls" aria-label="Beginner practice mode">
            <div className="beginner-run-modes" role="group" aria-label="Practice mode">
              {(['lesson', 'time', 'words'] as const).map((mode) => (
                <button key={mode} className={beginnerPracticeMode === mode ? 'beginner-run-mode beginner-run-mode-active' : 'beginner-run-mode'} aria-pressed={beginnerPracticeMode === mode} onClick={() => {
                  setBeginnerPracticeMode(mode);
                  resetPractice(selectedId, false, false);
                }}>
                  {mode === 'lesson' ? <BookOpen size={14} /> : mode === 'time' ? <Clock3 size={14} /> : <Type size={14} />}{mode === 'lesson' ? 'Lesson' : mode === 'time' ? 'Time' : 'Words'}
                </button>
              ))}
            </div>
            {beginnerPracticeMode === 'time' && <div className="beginner-run-options" role="group" aria-label="Time limit">
              <span className="setting-label">TIME</span>
              {([10, 30, 60, 120] as const).map((seconds) => <button key={seconds} className={timeLimitSeconds === seconds ? 'segment-active' : ''} aria-pressed={timeLimitSeconds === seconds} onClick={() => { setTimeLimitSeconds(seconds); resetPractice(selectedId, false, false); }}>{seconds < 60 ? `${seconds}s` : `${seconds / 60} min`}</button>)}
            </div>}
            {beginnerPracticeMode === 'words' && <div className="beginner-run-options" role="group" aria-label="Word target">
              <span className="setting-label">WORDS</span>
              {([10, 50, 100] as const).map((count) => <button key={count} className={beginnerWordCount === count ? 'segment-active' : ''} aria-pressed={beginnerWordCount === count} onClick={() => { setBeginnerWordCount(count); resetPractice(selectedId, false, false); }}>{count}</button>)}
            </div>}
            <span className="beginner-run-description">{beginnerPracticeMode === 'lesson' ? 'Full lesson practice' : beginnerPracticeMode === 'time' ? 'Type as much as you can before time runs out' : `Finish ${beginnerWordCount} words to complete the run`}</span>
          </section>}
          <section className="practice-board" aria-label="Typing practice">
            <div className="board-topline">
              <div className="board-lesson-name"><span className="live-dot" />{isModesPage ? 'Random sentence' : lesson.title}<span className="board-divider">/</span><span className="board-keys">{isModesPage ? typingMode.toUpperCase() : lesson.keys}</span></div>
              <div className="board-actions">
                <span className={`focus-hint ${isFocused ? 'focus-hint-active' : ''}`}><Command size={13} /> {isFocused ? 'YOU’RE IN' : 'CLICK TO TYPE'}</span>
                {isLearningPage && <button className="secondary-button beginner-new-sentence" onClick={startNewLessonSentence}><Shuffle size={14} /> New sentence</button>}
                <button className="icon-button reset-button" onClick={() => resetPractice()} aria-label={isModesPage ? 'Restart sentence' : 'Restart lesson'} title={isModesPage ? 'Restart sentence' : 'Restart lesson'}><RotateCcw size={16} /></button>
              </div>
            </div>
            <div className={`typing-stage ${isFocused ? 'typing-stage-focused' : ''} ${isComplete ? 'typing-stage-complete' : ''}`} onClick={() => textInput.current?.focus({ preventScroll: true })}>
              <div className="typing-window" ref={typingWindow} aria-hidden="true">
                <div className="typing-copy" ref={typingCopy} style={{ transform: `translateY(-${typingLineOffset}px)` }}>
                  {Array.from(runText).map((character, index) => {
                    const typedCharacter = input[index];
                    const className = typedCharacter === undefined
                      ? index === input.length ? 'character character-current' : 'character'
                      : typedCharacter === character ? 'character character-correct' : 'character character-wrong';
                    return <span className={className} key={`${isModesPage ? 'sentence' : lesson.id}-${index}`}>{character}</span>;
                  })}
                </div>
              </div>
              {isModesPage && startedAt === null && (
                <div className="mode-start-controls" role={countdownSeconds === null ? 'group' : 'timer'} aria-live="polite">
                  {countdownSeconds === null ? (
                    <>
                      <span className="mode-start-kicker">YOUR NEXT SPRINT</span>
                      <strong>Ready when you are?</strong>
                      <button className="primary-button mode-start-button" onClick={(event) => { event.stopPropagation(); startModePractice(); }}>
                        <Zap size={16} /> Start practice
                      </button>
                    </>
                  ) : (
                    <>
                      <strong className="mode-countdown-number">{countdownSeconds}</strong>
                      <span className="mode-countdown-copy">Get ready to type</span>
                      <button className="secondary-button mode-countdown-cancel" onClick={(event) => { event.stopPropagation(); resetPractice(selectedId, false, false); }}>
                        Cancel countdown
                      </button>
                    </>
                  )}
                </div>
              )}
              <textarea
                ref={textInput}
                className="typing-input"
                value={input}
                onChange={handleTyping}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleTypingKey}
                aria-label="Type the displayed practice text here"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={isComplete || (isModesPage && startedAt === null)}
                rows={1}
              />
              <div className={`stage-prompt ${input || isFocused || (isModesPage && startedAt === null) ? 'stage-prompt-hidden' : ''}`} aria-hidden={Boolean(input || isFocused || (isModesPage && startedAt === null))}>
                <span className="prompt-key">A</span><span>Start typing to begin</span><ArrowDownRight size={15} />
              </div>
              {isComplete && <div className="stage-complete-tag"><Check size={14} /> COMPLETE</div>}
            </div>
            <div className="board-footer">
              <div className="key-guide"><span className="key-dot key-dot-left" /> LEFT HAND <span className="key-dot key-dot-right" /> RIGHT HAND</div>
              <span className="character-count">{String(input.length).padStart(2, '0')} <i>typed</i></span>
            </div>
            <div className="board-progress"><span style={{ width: `${isTimedMode ? ((timeLimitSeconds - remainingSeconds) / timeLimitSeconds) * 100 : (input.length / runText.length) * 100}%` }} /></div>
          </section>

          <section className="metrics-row" aria-label="Live typing results">
            <Metric icon={<Zap size={15} />} label="SPEED" value={metrics.wpm.toFixed(1)} suffix="WPM" tone="coral" />
            <Metric icon={<Target size={15} />} label="ACCURACY" value={`${metrics.accuracy}`} suffix="%" tone="teal" />
            <Metric icon={<X size={15} />} label="MISTAKES" value={String(metrics.mistakes).padStart(2, '0')} suffix="" tone="red" />
            <Metric icon={<Clock3 size={15} />} label={isTimedMode ? 'TIME LEFT' : 'TIME'} value={formatTime(isTimedMode ? remainingSeconds : elapsedSeconds)} suffix="" tone="blue" />
          </section>

          {isComplete ? (
            <section className="result-strip" aria-live="polite">
              <div className="result-check"><Check size={19} /></div>
              <div className="result-copy"><strong>Nice run. That’s {metrics.wpm.toFixed(1)} WPM.</strong><span>{saveMessage || 'You made it through the lesson.'}</span></div>
              {earnedXp !== null && <div className="xp-earned"><Sparkles size={15} /><strong>+{earnedXp}</strong><span>XP</span></div>}
              <div className="result-actions">
                <button className="secondary-button" onClick={() => resetPractice()}><RotateCcw size={15} /> Try again</button>
                <button className="primary-button compact-button" onClick={isModesPage ? () => startNewSentence() : advanceLesson}>{isModesPage ? 'New sentence' : 'Next lesson'} <ArrowRight size={16} /></button>
              </div>
            </section>
          ) : (
            <section className="practice-note">
              <div className="note-icon"><CircleHelp size={17} /></div>
              <p><strong>{isModesPage ? 'A fresh prompt.' : 'One key at a time.'}</strong> {isModesPage ? 'This sentence is independent from Beginner Learning. Use New sentence for another prompt.' : 'Click the practice area and type the text above. Take your time; your results update as you go.'}</p>
              {!isModesPage && <span className="note-step">STAGE {String(stageNumber).padStart(2, '0')} / 06</span>}
            </section>
          )}

          <section className="history-section">
            <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-bar eyebrow-bar-teal" /> YOUR RECENT RUNS</p><h2>A little better, each time.</h2></div>{user ? <span className="history-count">{sessions.length} RECENT</span> : <Link to="/signup" className="history-signup">Save your progress <ArrowRight size={14} /></Link>}</div>
            {sessions.length > 0 ? (
              <div className="history-table">
                <div className="history-head"><span>PROMPT</span><span>WPM</span><span>ACCURACY</span><span>MISTAKES</span><span>WHEN</span></div>
                {sessions.slice(0, 3).map((session) => (
                  <div className="history-row" key={session._id}>
                    <strong>{session.sentence || lessons.find((item) => item.id === session.lessonId)?.title || session.lessonId}</strong>
                    <span>{session.wpm.toFixed(1)}</span>
                    <span>{session.accuracy}%</span>
                    <span>{session.mistakes}</span>
                    <span>{new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="history-empty"><span className="history-empty-icon"><Keyboard size={17} /></span><span>{user ? 'Finish your first lesson and your results will land here.' : 'Your first run is waiting. Sign in to keep your progress.'}</span><ArrowRight size={15} /></div>
            )}
          </section>
          <footer className="studio-footer"><span>KEYRUSH <i>©</i> 2025</span><span>LESS PRESSURE. MORE PROGRESS.</span><button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>BACK TO TOP <ArrowUpRight size={13} /></button></footer>
          </>
          )}
        </div>
      </main>
    </div>
  );
}

function ColorThemePicker({ palette, onPaletteChange }: { palette: ColorPalette; onPaletteChange: (palette: ColorPalette) => void }) {
  return (
    <details className="palette-picker">
      <summary className="icon-button theme-switch palette-trigger" aria-label="Choose color theme" title="Choose color theme">
        <Palette size={18} />
      </summary>
      <div className="palette-menu" role="group" aria-label="Color themes">
        <span className="palette-menu-label">COLOR THEME</span>
        {colorPalettes.map((option) => (
          <button
            className="palette-option"
            data-selected={palette === option.id}
            key={option.id}
            type="button"
            aria-pressed={palette === option.id}
            onClick={() => onPaletteChange(option.id)}
          >
            <span className="palette-swatch" style={{ backgroundColor: option.color }} aria-hidden="true" />
            <span>{option.label}</span>
            {palette === option.id && <Check size={15} aria-hidden="true" />}
          </button>
        ))}
      </div>
    </details>
  );
}

function Stat({ label, value, unit = '' }: { label: string; value: string; unit?: string }) {
  return (
    <div className="account-stat">
      <span>{label}</span>
      <strong>{value}<i>{unit}</i></strong>
    </div>
  );
}

function ModeRecordGroup({ title, type, records, emptyMessage }: {
  title: string;
  type: 'time' | 'words';
  records: ReturnType<typeof buildModeRecords>;
  emptyMessage: string;
}) {
  return (
    <section className={`mode-record-group mode-record-group-${type}`} aria-label={title}>
      <div className="mode-record-group-heading">
        <div><span>{type === 'time' ? <Clock3 size={13} /> : <Type size={13} />}</span><strong>{title}</strong></div>
        <small>{records.length} {type === 'time' ? 'TIME' : 'WORD'} CHALLENGES</small>
      </div>
      <div className={`mode-record-grid mode-record-grid-${type}`}>
        {records.map((record) => (
          <article className={`mode-record ${record.runs ? 'mode-record-played' : 'mode-record-unplayed'}`} key={record.target}>
            {record.runs ? (
              <>
                <span className="mode-record-label">{record.label}</span>
                <span className="mode-record-metric-label">BEST SPEED</span>
                <strong className="mode-record-wpm">{record.bestWpm}<small>WPM</small></strong>
                <span className="mode-record-average"><span>AVERAGE</span><strong>{record.averageWpm} <i>WPM</i></strong></span>
                <span className="mode-record-accuracy"><Check size={12} aria-hidden="true" /> {record.averageAccuracy}% <i>accuracy</i></span>
                <span className="mode-record-runs">{record.runs} {record.runs === 1 ? 'run' : 'runs'}</span>
              </>
            ) : (
              <>
                <span className="mode-record-label">{record.label}</span>
                <span className="mode-record-empty"><span aria-hidden="true">＋</span>{emptyMessage}</span>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function TotalStats({ user, stats, onSelectLesson }: {
  user: Account | null;
  stats: UserStats | null;
  onSelectLesson: (lessonId: string) => void;
}) {
  if (!user) {
    return (
      <section className="stats-signin">
        <BarChart3 size={25} />
        <div><h2>Your full practice history belongs to you.</h2><p>Sign in to see completed games, personal bests, and task-by-task results.</p></div>
        <Link to="/login" className="primary-button">Sign in <ArrowRight size={16} /></Link>
      </section>
    );
  }

  const activityWeeks = buildActivityGrid(stats?.activityDays ?? []);
  const activeDays = (stats?.activityDays ?? []).filter(({ runs }) => runs > 0).length;
  const weakestKey = (stats?.keyStats ?? [])
    .filter(({ attempts, mistakes }) => attempts >= 5 && mistakes > 0)
    .sort((left, right) => right.mistakes / right.attempts - left.mistakes / left.attempts)[0];
  const recommendedLesson = weakestKey ? recommendLessonForKey(weakestKey.key, lessons) : undefined;
  const timeRecords = buildModeRecords(stats?.modeRecords ?? [], 'time', [15, 30, 60, 120]);
  const wordRecords = buildModeRecords(stats?.modeRecords ?? [], 'words', [10, 25, 50, 100]);
  const activityMonths = activityWeeks.map((week, index) => {
    const month = new Date(`${week[0].date}T00:00:00.000Z`).getUTCMonth();
    return index === 0 || month !== new Date(`${activityWeeks[index - 1][0].date}T00:00:00.000Z`).getUTCMonth()
      ? new Date(`${week[0].date}T00:00:00.000Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })
      : '';
  });

  return (
    <div className="stats-page">
      <section className="task-stats-section mode-records-section" aria-label="Time and word mode records">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-bar eyebrow-bar-teal" /> YOUR MODE RECORDS</p><h2>Challenge records.</h2></div><span className="mode-records-caption">Your average speed and accuracy, at a glance.</span></div>
        <div className="mode-record-groups">
          <ModeRecordGroup title="Time mode" type="time" records={timeRecords} emptyMessage="Not played yet" />
          <ModeRecordGroup title="Word mode" type="words" records={wordRecords} emptyMessage="Not played yet" />
        </div>
      </section>

      <section className="account-stats stats-overview" aria-label="All-time typing statistics">
        <div className="account-stats-heading">
          <div><p className="eyebrow"><span className="eyebrow-bar" /> ALL-TIME TOTALS</p><h2>Every run adds up.</h2></div>
          <span className="history-count">{stats?.gamesPlayed ?? 0} GAMES</span>
        </div>
        <div className="account-stats-grid">
          <Stat label="GAMES PLAYED" value={String(stats?.gamesPlayed ?? 0)} />
          <Stat label="TOTAL XP" value={String(stats?.totalXp ?? 0)} unit="XP" />
          <Stat label="DAY STREAK" value={String(stats?.currentStreak ?? 0)} unit="days" />
          <Stat label="BEST STREAK" value={String(stats?.longestStreak ?? 0)} unit="days" />
          <Stat label="LESSONS COMPLETED" value={`${stats?.lessonsCompleted ?? 0} / ${lessons.length}`} />
          <Stat label="AVERAGE SPEED" value={`${stats?.averageWpm ?? 0}`} unit="WPM" />
          <Stat label="PERSONAL BEST" value={`${stats?.bestWpm ?? 0}`} unit="WPM" />
          <Stat label="AVERAGE ACCURACY" value={`${stats?.averageAccuracy ?? 0}`} unit="%" />
          <Stat label="MISTAKES MADE" value={String(stats?.totalMistakes ?? 0)} />
          <Stat label="TIME PRACTICED" value={formatDuration(stats?.totalDurationSeconds ?? 0)} />
        </div>
      </section>

      <section className="task-stats-section consistency-section">
        <div className="section-heading">
          <div><p className="eyebrow"><span className="eyebrow-bar eyebrow-bar-teal" /> YOUR CONSISTENCY</p><h2>Practice, day by day.</h2></div>
          <span className="history-count">{activeDays} ACTIVE DAYS · LAST YEAR</span>
        </div>
        <div className="consistency-card">
          <div className="contribution-total"><strong>{(stats?.activityDays ?? []).reduce((total, day) => total + day.runs, 0)} practice runs</strong><span>in the last 365 days</span></div>
          <div className="activity-scroll">
            <div className="activity-months" aria-hidden="true">
              <span className="activity-day-label-spacer" />
              <div className="activity-week-labels" style={{ gridTemplateColumns: `repeat(${activityWeeks.length}, minmax(0, 1fr))` }}>
                {activityMonths.map((month, index) => month && <span key={`month-${index}`} style={{ gridColumnStart: index + 1 }}>{month}</span>)}
              </div>
            </div>
            <div className="activity-body">
              <div className="activity-day-labels" aria-hidden="true"><span>Sun</span><span /><span>Tue</span><span /><span>Thu</span><span /><span>Sat</span></div>
              <div className="activity-weeks" role="img" aria-label={`Practice activity for the last year: ${activeDays} active days`} style={{ gridTemplateColumns: `repeat(${activityWeeks.length}, minmax(0, 1fr))` }}>
                {activityWeeks.map((week, weekIndex) => (
                  <div className="activity-week" key={`week-${weekIndex}`}>
                    {week.map((day) => <span className={`activity-cell activity-level-${day.level}`} key={day.date} title={`${day.date}: ${day.runs} ${day.runs === 1 ? 'run' : 'runs'}`} />)}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="activity-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((level) => <i key={level} className={`activity-cell activity-level-${level}`} />)}<span>More</span></div>
        </div>
      </section>

      <section className="task-stats-section key-insights-section">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-bar" /> PERSONALIZED PRACTICE</p><h2>Find your next focus.</h2></div></div>
        <div className="key-insight-card">
          {weakestKey && recommendedLesson ? (
            <>
              <div className="weak-key-tile"><span>NEEDS PRACTICE</span><kbd>{weakestKey.key === ' ' ? 'Space' : weakestKey.key}</kbd></div>
              <div className="key-insight-copy"><strong>Let’s give “{weakestKey.key}” a little more practice.</strong><span>{weakestKey.mistakes} misses across {weakestKey.attempts} attempts ({Math.round(weakestKey.mistakes / weakestKey.attempts * 100)}% error rate).</span></div>
              <div className="key-recommendation"><span>RECOMMENDED LESSON</span><strong>{recommendedLesson.title}</strong><button className="primary-button compact-button" onClick={() => onSelectLesson(recommendedLesson.id)}>Practice this key <ArrowRight size={15} /></button></div>
            </>
          ) : (
            <div className="key-insight-empty"><Keyboard size={21} /><div><strong>Personal key tips are on the way.</strong><span>Key tracking starts with new runs. After a few sessions, we’ll spot the keys that need extra practice and recommend a lesson.</span></div></div>
          )}
        </div>
      </section>

    </div>
  );
}

function Metric({ icon, label, value, suffix, tone }: { icon: React.ReactNode; label: string; value: string; suffix: string; tone: string }) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-top"><span className="metric-icon">{icon}</span><span className="metric-label">{label}</span></div>
      <div className="metric-value">{value}<span>{suffix}</span></div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function LoadingScreen() {
  return <main className="loading-screen"><span className="brand-mark"><Keyboard size={20} /></span><span>Finding your place…</span></main>;
}
