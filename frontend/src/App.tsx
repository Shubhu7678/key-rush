import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
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
  Quote,
  RotateCcw,
  Sun,
  Target,
  Type,
  Sparkles,
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
  signUp,
  type Account,
  type SavedSession,
  type UserStats,
} from './api';
import { lessons } from './lessons';
import { calculateMetrics } from './metrics';
import { buildPracticeText, type QuoteLength, type TypingMode } from './practiceText';
import { getRandomSentence } from './sentences';
import GameZone from './GameZone';

type Theme = 'light' | 'dark';
type AuthResult = { token: string; user: Account };

export default function App() {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem('keyrush-theme') === 'dark' ? 'dark' : 'light',
  );
  const [token, setToken] = useState(() => localStorage.getItem('keyrush-token') ?? '');
  const [user, setUser] = useState<Account | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(Boolean(token));
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('keyrush-theme', theme);
  }, [theme]);

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

  return (
    <Routes>
      <Route
        path="/login"
        element={<AuthPage mode="login" theme={theme} onToggleTheme={toggleTheme} onAuth={completeSignIn} />}
      />
      <Route
        path="/signup"
        element={<AuthPage mode="signup" theme={theme} onToggleTheme={toggleTheme} onAuth={completeSignIn} />}
      />
      <Route
        path="*"
        element={checkingAccount ? <LoadingScreen /> : (
          <PracticeApp user={user} token={token} onSignOut={signOut} theme={theme} onToggleTheme={toggleTheme} />
        )}
      />
    </Routes>
  );
}

interface AuthPageProps {
  mode: 'login' | 'signup';
  theme: Theme;
  onToggleTheme: () => void;
  onAuth: (result: AuthResult) => void;
}

function AuthPage({ mode, theme, onToggleTheme, onAuth }: AuthPageProps) {
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
          <button className="icon-button theme-switch" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title="Change appearance">
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
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
  onToggleTheme: () => void;
}

function PracticeApp({ user, token, onSignOut, theme, onToggleTheme }: PracticeAppProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(lessons[0].id);
  const [typingMode, setTypingMode] = useState<TypingMode>('time');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<15 | 30 | 60 | 120>(30);
  const [wordPreset, setWordPreset] = useState('25');
  const [customWordCount, setCustomWordCount] = useState('25');
  const [quoteLength, setQuoteLength] = useState<QuoteLength>('short');
  const [currentSentence, setCurrentSentence] = useState(() => getRandomSentence());
  const [includePunctuation, setIncludePunctuation] = useState(false);
  const [includeNumbers, setIncludeNumbers] = useState(false);
  const [input, setInput] = useState('');
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [saveMessage, setSaveMessage] = useState('');
  const [earnedXp, setEarnedXp] = useState<number | null>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
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
  }) : lesson.text, [isModesPage, currentSentence, lesson.text, difficulty, typingMode, timeLimitSeconds, selectedWordCount, quoteLength, includePunctuation, includeNumbers]);
  const isComplete = finishedAt !== null;
  const isTimedMode = isModesPage && typingMode === 'time';
  const elapsedSeconds = startedAt === null
    ? 0
    : Math.max(0, Math.floor(((finishedAt ?? now) - startedAt) / 1000));
  const metrics = calculateMetrics(runText, input, elapsedSeconds);
  const groups = Array.from(new Set(lessons.map((item) => item.group)));
  const stageNumber = groups.indexOf(lesson.group) + 1;
  const remainingSeconds = isTimedMode ? Math.max(0, timeLimitSeconds - elapsedSeconds) : elapsedSeconds;
  const [openStage, setOpenStage] = useState(lesson.group);
  const completedLessonIds = new Set((stats?.taskBreakdown ?? []).map((task) => task.lessonId).filter((lessonId) => lessonId !== 'sentence-mode'));
  const lessonBests = new Map<string, number>();
  for (const task of stats?.taskBreakdown ?? []) {
    lessonBests.set(task.lessonId, Math.max(lessonBests.get(task.lessonId) ?? 0, task.bestWpm));
  }
  const nextChallenge = lessons.find((item) => !completedLessonIds.has(item.id)) ?? lessons[lessons.length - 1];

  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const timer = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);
      if (isTimedMode && currentTime - startedAt >= timeLimitSeconds * 1000) {
        setFinishedAt(startedAt + timeLimitSeconds * 1000);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [startedAt, finishedAt, timeLimitSeconds, isTimedMode]);

  useEffect(() => {
    if (!token) {
      setSessions([]);
      setStats(null);
      return;
    }
    getSessions(token).then(({ sessions: saved }) => setSessions(saved)).catch(() => setSessions([]));
    getStats(token).then(({ stats: accountStats }) => setStats(accountStats)).catch(() => setStats(null));
  }, [token]);

  useEffect(() => {
    if (!isComplete || !token || didSave.current) return;
    didSave.current = true;
    setSaveMessage('Saving result…');
    saveSession(token, {
      lessonId: isModesPage ? 'sentence-mode' : lesson.id,
      sentence: isModesPage ? currentSentence : '',
      mode: isModesPage ? typingMode : 'lesson',
      difficulty: isModesPage ? difficulty : 'easy',
      timeLimitSeconds: isTimedMode ? timeLimitSeconds : 0,
      wordCount: isModesPage && typingMode === 'words' ? selectedWordCount : 0,
      quoteLength: isModesPage && typingMode === 'quote' ? quoteLength : 'short',
      includePunctuation: isModesPage && includePunctuation,
      includeNumbers: isModesPage && includeNumbers,
      wpm: metrics.wpm,
      accuracy: metrics.accuracy,
      mistakes: metrics.mistakes,
      durationSeconds: elapsedSeconds,
    }).then(({ session }) => {
      setSessions((current) => [session, ...current].slice(0, 20));
      setEarnedXp(session.xpEarned ?? 0);
      getStats(token).then(({ stats: accountStats }) => setStats(accountStats)).catch(() => undefined);
      setSaveMessage('Result saved to your practice history.');
    }).catch(() => setSaveMessage('Result complete. It could not be saved right now.'));
  }, [isComplete, token, lesson.id, currentSentence, isModesPage, typingMode, difficulty, timeLimitSeconds, selectedWordCount, quoteLength, includePunctuation, includeNumbers, metrics.wpm, metrics.accuracy, metrics.mistakes, elapsedSeconds, isTimedMode]);

  function resetPractice(nextLessonId = selectedId, shouldFocus = true, closePanel = true) {
    setSelectedId(nextLessonId);
    setInput('');
    setStartedAt(null);
    setFinishedAt(null);
    setNow(Date.now());
    setSaveMessage('');
    setEarnedXp(null);
    didSave.current = false;
    if (closePanel) setMobileMenuOpen(false);
    if (shouldFocus) window.setTimeout(() => textInput.current?.focus(), 0);
  }

  function handleTyping(event: FormEvent<HTMLTextAreaElement>) {
    const nextInput = event.currentTarget.value.slice(0, runText.length);
    setInput(nextInput);
    if (nextInput.length > 0 && startedAt === null) setStartedAt(Date.now());
    if (!isTimedMode && nextInput.length >= runText.length) setFinishedAt(Date.now());
  }

  function selectLesson(nextLessonId: string) {
    if (isStatsPage || isModesPage) navigate('/');
    const nextLesson = lessons.find((item) => item.id === nextLessonId);
    if (nextLesson) setOpenStage(nextLesson.group);
    resetPractice(nextLessonId);
  }

  function beginNextChallenge() {
    selectLesson(nextChallenge.id);
  }

  function startNewSentence(length = typingMode === 'quote' ? quoteLength : undefined) {
    setCurrentSentence(getRandomSentence(length, currentSentence));
    resetPractice(selectedId, false, false);
  }

  function advanceLesson() {
    const currentIndex = lessons.findIndex((item) => item.id === selectedId);
    const next = lessons[(currentIndex + 1) % lessons.length];
    resetPractice(next.id);
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
        <aside className={`lesson-panel ${mobileMenuOpen ? 'lesson-panel-open' : ''}`}>
          <nav className="mobile-primary-links" aria-label="Main navigation">
            <Link className={`primary-nav-link ${isLearningPage ? 'primary-nav-link-active' : ''}`} to="/" aria-label="Beginner Learning" onClick={() => setMobileMenuOpen(true)}><BookOpen size={17} /><span>Beginner Learning</span></Link>
            <Link className={`primary-nav-link ${isModesPage ? 'primary-nav-link-active' : ''}`} to="/modes" aria-label="Typing Modes" onClick={() => setMobileMenuOpen(true)}><Keyboard size={17} /><span>Typing Modes</span></Link>
            <Link className="primary-nav-link" to="/stats" aria-label="Total Stats" onClick={() => setMobileMenuOpen(false)}><BarChart3 size={17} /><span>Total Stats</span></Link>
          </nav>
          <div className="lesson-panel-heading">
            <div><span className="lesson-panel-kicker">{isModesPage ? 'TYPING MODES' : 'BEGINNER LEARNING'}</span><strong>{isModesPage ? 'Practice setup' : 'Your path'}</strong></div>
            <span className="lesson-panel-total">{isModesPage ? '03 MODES' : `${completedLessonIds.size} / 25`}</span>
          </div>
          {isModesPage && <section className="typing-modes" aria-label="Typing modes">
            <div className="mode-tabs" role="group" aria-label="Typing mode">
              {(['time', 'words', 'quote'] as const).map((mode) => (
                <button key={mode} className={typingMode === mode ? 'mode-tab mode-tab-active' : 'mode-tab'} aria-pressed={typingMode === mode} onClick={() => {
                  setTypingMode(mode);
                  if (mode === 'quote') setCurrentSentence(getRandomSentence(quoteLength, currentSentence));
                  resetPractice(selectedId, false, false);
                }}>
                  {mode === 'time' ? <Clock3 size={13} /> : mode === 'words' ? <Type size={13} /> : <Quote size={13} />}{mode}
                </button>
              ))}
            </div>
          </section>}
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

      <main className={`studio-main ${isStatsPage || isGameZone ? 'studio-main-stats' : ''}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu-button icon-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open lesson menu'}>
              {mobileMenuOpen ? <X size={19} /> : <Keyboard size={19} />}
            </button>
            <span className="breadcrumb">Studio <ChevronRight size={14} /> <strong>{isStatsPage ? 'Total Stats' : isGameZone ? 'Game Zone' : isModesPage ? 'Typing Modes' : 'Beginner Learning'}</strong></span>
          </div>
          <div className="topbar-right">
            <span className="daily-mark"><span /> DAILY PRACTICE</span>
            <button className="icon-button theme-switch" onClick={onToggleTheme} aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title="Change appearance">
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {!user && <Link className="topbar-signin" to="/login">Sign in <ArrowUpRight size={14} /></Link>}
          </div>
        </header>

        <div className="studio-content">
          {!isGameZone && <section className="practice-heading">
            <div>
              <p className="eyebrow"><span className="eyebrow-bar" /> {isStatsPage ? 'ACCOUNT OVERVIEW' : isModesPage ? 'MODE SETTINGS' : lesson.group.toUpperCase()}</p>
              <h1>{isStatsPage ? 'Your typing, over time.' : isModesPage ? 'Choose your next drill.' : user ? `Ready, ${user.name.split(' ')[0]}?` : 'Find your home row.'}</h1>
              <p className="heading-subtitle">{isStatsPage ? 'Every run, every lesson, all in one place.' : isModesPage ? 'Select a mode in the sidebar, then start typing.' : 'A few steady minutes is all it takes to build a better rhythm.'}</p>
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
            <TotalStats user={user} stats={stats} sessions={sessions} />
          ) : (
          <>
          {isModesPage && <section className="mode-main-settings" aria-label="Typing mode options">
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
          <section className="practice-board" aria-label="Typing practice">
            <div className="board-topline">
              <div className="board-lesson-name"><span className="live-dot" />{isModesPage ? 'Random sentence' : lesson.title}<span className="board-divider">/</span><span className="board-keys">{isModesPage ? typingMode.toUpperCase() : lesson.keys}</span></div>
              <div className="board-actions">
                <span className={`focus-hint ${isFocused ? 'focus-hint-active' : ''}`}><Command size={13} /> {isFocused ? 'YOU’RE IN' : 'CLICK TO TYPE'}</span>
                <button className="icon-button reset-button" onClick={() => resetPractice()} aria-label={isModesPage ? 'Restart sentence' : 'Restart lesson'} title={isModesPage ? 'Restart sentence' : 'Restart lesson'}><RotateCcw size={16} /></button>
              </div>
            </div>
            <div className={`typing-stage ${isFocused ? 'typing-stage-focused' : ''} ${isComplete ? 'typing-stage-complete' : ''}`} onClick={() => textInput.current?.focus()}>
              <div className="typing-copy" aria-hidden="true">
                {Array.from(runText.slice(Math.max(0, input.length - 36), input.length + 140)).map((character, viewIndex) => {
                  const index = Math.max(0, input.length - 36) + viewIndex;
                  const typedCharacter = input[index];
                  const className = typedCharacter === undefined
                    ? index === input.length ? 'character character-current' : 'character'
                    : typedCharacter === character ? 'character character-correct' : 'character character-wrong';
                  return <span className={className} key={`${isModesPage ? 'sentence' : lesson.id}-${index}`}>{character === ' ' ? '\u00a0' : character}</span>;
                })}
              </div>
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
                disabled={isComplete}
                rows={1}
              />
              {!input && !isFocused && <div className="stage-prompt"><span className="prompt-key">A</span><span>Start typing to begin</span><ArrowDownRight size={15} /></div>}
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
              <p><strong>{isModesPage ? 'A fresh prompt.' : 'Stay loose.'}</strong> {isModesPage ? 'This sentence is independent from Beginner Learning. Use New sentence for another prompt.' : 'Accuracy first; speed follows. Your WPM and mistakes update as you type.'}</p>
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

function Stat({ label, value, unit = '' }: { label: string; value: string; unit?: string }) {
  return (
    <div className="account-stat">
      <span>{label}</span>
      <strong>{value}<i>{unit}</i></strong>
    </div>
  );
}

function TotalStats({ user, stats, sessions }: { user: Account | null; stats: UserStats | null; sessions: SavedSession[] }) {
  if (!user) {
    return (
      <section className="stats-signin">
        <BarChart3 size={25} />
        <div><h2>Your full practice history belongs to you.</h2><p>Sign in to see completed games, personal bests, and task-by-task results.</p></div>
        <Link to="/login" className="primary-button">Sign in <ArrowRight size={16} /></Link>
      </section>
    );
  }

  return (
    <div className="stats-page">
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

      <section className="task-stats-section">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-bar eyebrow-bar-teal" /> BY TASK</p><h2>How each drill is going.</h2></div></div>
        {(stats?.taskBreakdown?.length ?? 0) > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Task</th><th>Mode / options</th><th>Plays</th><th>Avg WPM</th><th>Best WPM</th><th>Accuracy</th><th>Time</th></tr></thead>
              <tbody>{stats?.taskBreakdown?.map((task) => (
                <tr key={`${task.lessonId}-${task.sentence}-${task.mode}-${task.difficulty}-${task.timeLimitSeconds}-${task.wordCount}-${task.quoteLength}-${task.includePunctuation}-${task.includeNumbers}`}>
                  <td title={task.sentence || getLessonTitle(task.lessonId)}>{task.sentence || getLessonTitle(task.lessonId)}</td><td>{formatMode(task)}</td><td>{task.gamesPlayed}</td><td>{task.averageWpm}</td><td>{task.bestWpm}</td><td>{task.averageAccuracy}%</td><td>{formatDuration(task.totalDurationSeconds)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="history-empty"><span className="history-empty-icon"><Keyboard size={17} /></span><span>Complete a timed drill and its breakdown will appear here.</span></div>}
      </section>

      <section className="task-stats-section run-history-section">
        <div className="section-heading"><div><p className="eyebrow"><span className="eyebrow-bar" /> RUN HISTORY</p><h2>Every completed task.</h2></div><span className="history-count">{sessions.length} RECENT</span></div>
        {sessions.length > 0 ? (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>Task</th><th>Mode / options</th><th>Played</th><th>WPM</th><th>Accuracy</th><th>Mistakes</th><th>Date</th></tr></thead>
              <tbody>{sessions.map((session) => (
                <tr key={session._id}>
                  <td title={session.sentence || getLessonTitle(session.lessonId)}>{session.sentence || getLessonTitle(session.lessonId)}</td><td>{formatMode(session)}</td><td>{formatDuration(session.durationSeconds)}</td><td>{session.wpm.toFixed(1)}</td><td>{session.accuracy}%</td><td>{session.mistakes}</td><td>{new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="history-empty"><span className="history-empty-icon"><Clock3 size={17} /></span><span>Your completed drills will be listed here.</span></div>}
      </section>
    </div>
  );
}

function getLessonTitle(lessonId: string) {
  if (lessonId === 'sentence-mode') return 'Typing Modes';
  return lessons.find((lesson) => lesson.id === lessonId)?.title ?? lessonId;
}

function formatLimit(seconds: number) {
  if (seconds === 0) return 'Untimed';
  return seconds >= 60 && seconds % 60 === 0 ? `${seconds / 60} min` : `${seconds}s`;
}

function formatMode(settings: {
  mode?: 'lesson' | 'time' | 'words' | 'quote' | 'race';
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimitSeconds?: number;
  wordCount?: number;
  quoteLength?: 'short' | 'medium' | 'long';
  includePunctuation?: boolean;
  includeNumbers?: boolean;
}) {
  const mode = settings.mode ?? 'lesson';
  if (mode === 'lesson') return 'Beginner lesson';
  if (mode === 'race') return 'Game Zone race';
  const label = mode === 'time'
    ? `Time · ${formatLimit(settings.timeLimitSeconds ?? 30)}`
    : mode === 'words'
      ? `Words · ${settings.wordCount || 25}`
      : `Quote · ${settings.quoteLength ?? 'short'}`;
  const options = [settings.difficulty, settings.includePunctuation ? 'punctuation' : '', settings.includeNumbers ? 'numbers' : ''].filter(Boolean);
  return `${label}${options.length ? ` · ${options.join(' · ')}` : ''}`;
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
