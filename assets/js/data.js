// NEETest — feature catalog. Honest about what's built.
// Status: 'live' = working today; 'soon' = planned, not yet built.
window.NEETEST_FEATURES = [
  // PRACTICE
  { id: 'pyq_bank', cat: 'practice', icon: 'book-open', title: 'PYQ Practice', tagline: 'Previous-year MCQs tagged by subject, year, exam', status: 'live', paid: true, href: 'questions.html' },
  { id: 'grand_test', cat: 'practice', icon: 'trophy', title: 'Full-Length Mock', tagline: '200-question, 3.5-hour mock test', status: 'soon', paid: true },
  { id: 'subject_mock', cat: 'practice', icon: 'flask-conical', title: 'Subject Mock', tagline: '40-Q mini-mock per subject', status: 'soon', paid: true },
  { id: 'daily_ten', cat: 'practice', icon: 'calendar-days', title: 'Daily 10', tagline: '10 fresh MCQs each day', status: 'soon', paid: true },
  { id: 'qotd', cat: 'practice', icon: 'star', title: 'Question of the Day', tagline: 'One featured MCQ daily', status: 'soon', paid: false },
  { id: 'custom_test', cat: 'practice', icon: 'sliders-horizontal', title: 'Custom Test', tagline: 'Pick subjects, count, difficulty', status: 'soon', paid: true },
  { id: 'speed_mode', cat: 'practice', icon: 'zap', title: 'Speed Mode', tagline: '60 seconds per Q', status: 'soon', paid: true },
  { id: 'bookmarks', cat: 'practice', icon: 'bookmark', title: 'Bookmarks', tagline: 'Save questions for revision', status: 'live', paid: true },
  { id: 'wrong_answers', cat: 'practice', icon: 'x-circle', title: 'Wrong Answers Drill', tagline: 'Re-attempt the ones you got wrong', status: 'live', paid: true },
  { id: 'skipped', cat: 'practice', icon: 'skip-forward', title: 'Skipped Questions', tagline: 'Come back to flagged questions', status: 'soon', paid: true },

  // ANALYTICS
  { id: 'dashboard', cat: 'analytics', icon: 'layout-dashboard', title: 'Progress Dashboard', tagline: 'Accuracy, time-per-Q, trends', status: 'live', paid: false },
  { id: 'heatmap', cat: 'analytics', icon: 'flame', title: 'Subject Heatmap', tagline: 'Strong vs weak subjects visualised', status: 'live', paid: false },
  { id: 'topic_mastery', cat: 'analytics', icon: 'gauge', title: 'Topic Mastery', tagline: 'Per-topic mastery score', status: 'soon', paid: true },
  { id: 'progress', cat: 'analytics', icon: 'line-chart', title: 'Progress Tracker', tagline: 'Day-over-day, week-over-week', status: 'live', paid: false },
  { id: 'time_analysis', cat: 'analytics', icon: 'clock', title: 'Time Analysis', tagline: 'Which subjects eat your clock', status: 'soon', paid: true },
  { id: 'attempt_log', cat: 'analytics', icon: 'history', title: 'Attempt Log', tagline: 'Full history of every attempt', status: 'soon', paid: true },

  // PLANNER
  { id: 'daily_goals', cat: 'planner', icon: 'flag', title: 'Daily Goals', tagline: 'Hit your daily question count', status: 'live', paid: false },
  { id: 'streak', cat: 'planner', icon: 'flame', title: 'Streak Tracker', tagline: "Don't break the chain", status: 'live', paid: false },
  { id: 'pomodoro', cat: 'planner', icon: 'timer', title: 'Pomodoro Timer', tagline: '25/5 focus blocks', status: 'live', paid: false },
  { id: 'countdown', cat: 'planner', icon: 'calendar', title: 'Exam Countdown', tagline: 'Days, hours to D-day', status: 'live', paid: false },
  { id: 'syllabus', cat: 'planner', icon: 'list-todo', title: 'Syllabus Tracker', tagline: 'Tick off topics as you finish', status: 'live', paid: false },

  // EXAM INFO
  { id: 'neet_pg_dash', cat: 'exam', icon: 'graduation-cap', title: 'NEET PG 2026', tagline: 'Official dates, pattern, eligibility', status: 'live', paid: false, href: 'exams.html#neetpg' },
  { id: 'ini_cet_dash', cat: 'exam', icon: 'graduation-cap', title: 'INI-CET Nov 2026', tagline: 'Official dates, pattern, eligibility', status: 'live', paid: false, href: 'exams.html#inicet' },
];

window.NEETEST_CATEGORIES = {
  practice: { label: 'Practice', sub: 'MCQ practice + mock tests', color: '#5b6ff6' },
  analytics: { label: 'Dashboard', sub: 'Track your progress', color: '#14b8a6' },
  planner: { label: 'Study Tools', sub: 'Stay consistent', color: '#f59e0b' },
  exam: { label: 'Exam Info', sub: 'Official dates and pattern', color: '#06b6d4' },
};

window.NEETEST_EXAMS = {
  neetpg: {
    title: 'NEET PG 2026',
    targetDateRaw: '2026-08-30',
    pattern: '200 MCQs, 3 hours 30 minutes, single session, computer-based',
    sections: '5 sections × 40 questions each (sequential, locked)',
    marking: '+4 for correct, −1 for wrong',
    eligibility: 'MBBS from MCI/NMC recognised college + internship completed by 31 July 2026',
    application: 'Information Bulletin not yet released',
    results: '~3 weeks post-exam',
    officialUrl: 'https://www.natboard.edu.in/allnotice.php',
    officialLabel: 'NBEMS Notifications',
    accent: '#6366f1',
  },
  inicet: {
    title: 'INI-CET Nov 2026',
    targetDateRaw: '2026-11-01',
    pattern: '200 MCQs, 3 hours, computer-based',
    sections: '4 parts × 50 questions',
    marking: '+1 for correct, −1/3 for wrong',
    eligibility: 'MBBS + internship by exam date',
    application: 'Typically opens 2 months before exam',
    results: '7–14 days post-exam',
    officialUrl: 'https://www.aiimsexams.ac.in/info/keydates.html',
    officialLabel: 'AIIMS Exams Key Dates',
    accent: '#06b6d4',
  },
};

// FREE FOR EVERYONE (no paywall while in beta). Unlimited mocks, all features.
window.NEETEST_FREE_MOCK_LIMIT = Infinity;
window.NEETEST_IS_FREE = true;

// Pricing object kept (defined to avoid reference errors) but the product is free.
window.NEETEST_PRICING = {
  free: true,
  earlyBird: 0,
  regular: 0,
  isEarlyBird() { return false; },
  currentPrice() { return 0; },
  savings() { return 0; },
};

// Practice modes (for paid users on questions.html)
window.NEETEST_PRACTICE_MODES = [
  { id: 'short', label: 'Short', count: 25, sub: 'A quick session' },
  { id: 'medium', label: 'Medium', count: 50, sub: 'A solid set' },
  { id: 'full', label: 'Full-length', count: 200, sub: 'Like the real paper' },
];

// Guest mock — non-logged-in users get 1 free 30-Q mock with explanations
window.NEETEST_GUEST_MOCK_COUNT = 30;

// OTP backend endpoint. Set this to your deployed Cloudflare Worker URL
// (e.g. 'https://otp.neetest.online' or 'https://neetest-otp.YOUR.workers.dev').
// When null/empty, login.html falls back to showing the OTP on screen (dev mode).
// See website/backend/README.md for deployment.
window.NEETEST_OTP_ENDPOINT = 'https://neetest-otp.neetest-app.workers.dev';

// Simple localStorage-based session (demo; real auth needs backend)
window.NEETEST_AUTH = {
  isLoggedIn: () => !!localStorage.getItem('neetest_user'),
  user: () => { try { return JSON.parse(localStorage.getItem('neetest_user')); } catch { return null; } },
  login: (email, name) => localStorage.setItem('neetest_user', JSON.stringify({ email, name, joinedAt: Date.now() })),
  logout: () => { localStorage.removeItem('neetest_user'); localStorage.removeItem('neetest_paid'); },
  isPaid: () => true,   // free for everyone — all content unlocked
  setPaid: (v) => localStorage.setItem('neetest_paid', v ? 'true' : 'false'),
  mocksTaken: () => parseInt(localStorage.getItem('neetest_mocks_taken') || '0', 10),
  incrementMocks: () => {
    const n = (parseInt(localStorage.getItem('neetest_mocks_taken') || '0', 10) || 0) + 1;
    localStorage.setItem('neetest_mocks_taken', String(n));
    return n;
  },
};
