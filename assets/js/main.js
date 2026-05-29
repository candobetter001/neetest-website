// NEETest — shared site behavior

function renderBetaBanner() {
  if (sessionStorage.getItem('neetest_beta_hidden') === 'true') return;
  const slot = document.getElementById('beta-slot');
  const html = `
    <div class="beta-banner">
      <span class="beta-pill">BETA</span>
      <span>We're actively building this. Some features may not work yet. Found a bug? <a href="mailto:hello@neetest.online?subject=Bug%20report" class="underline">Tell us</a>.</span>
      <button class="beta-close" onclick="sessionStorage.setItem('neetest_beta_hidden','true'); this.parentElement.style.display='none';" aria-label="Dismiss">✕</button>
    </div>
  `;
  if (slot) { slot.innerHTML = html; }
  else { document.body.insertAdjacentHTML('afterbegin', `<div id="beta-slot">${html}</div>`); }
}

function renderNav(active) {
  const auth = window.NEETEST_AUTH;
  const links = [
    { href: 'index.html', label: 'Home' },
    { href: 'questions.html', label: 'Question Bank' },
    { href: 'mock-tests.html', label: 'Mock Tests' },
    { href: 'subjects.html', label: 'Subjects' },
    { href: 'exams.html', label: 'Exams' },
    { href: 'pricing.html', label: 'Pricing' },
  ];
  const loggedIn = auth.isLoggedIn();
  const user = auth.user();
  const authBtn = loggedIn
    ? `<a href="profile.html" class="btn-secondary text-sm py-2 px-3 magnetic"><i data-lucide="user" class="w-4 h-4"></i><span class="hidden sm:inline">${user?.name || 'Profile'}</span></a>`
    : `<a href="login.html" class="btn-secondary text-sm py-2 px-3 magnetic"><i data-lucide="log-in" class="w-4 h-4"></i><span class="hidden sm:inline">Log in</span></a>`;
  const html = `
    <header class="nav">
      <div class="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <a href="index.html" class="flex items-center gap-2 font-display font-bold text-xl">
          <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg" style="background:linear-gradient(135deg,#4f46e5,#06b6d4);color:white">N</span>
          <span>NEETest</span>
        </a>
        <nav class="nav-links flex items-center gap-1">
          ${links.map(l => `<a href="${l.href}" class="px-3 py-1.5 rounded-lg text-sm hover:text-[var(--primary)] ${l.href === active ? 'active' : ''}">${l.label}</a>`).join('')}
        </nav>
        <div class="flex items-center gap-2">
          ${authBtn}
          <a href="pricing.html" class="btn-primary text-sm py-2 px-4 magnetic">
            <i data-lucide="zap" class="w-4 h-4"></i>
            <span class="hidden sm:inline">Get full access</span>
          </a>
        </div>
      </div>
    </header>
  `;
  const slot = document.getElementById('nav-slot');
  if (slot) slot.innerHTML = html;
}

function renderFooter() {
  const html = `
    <footer class="border-t border-[var(--border)] mt-24 bg-[var(--surface)]">
      <div class="max-w-7xl mx-auto px-4 md:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div class="col-span-2">
          <a href="index.html" class="flex items-center gap-2 font-display font-bold text-xl mb-3">
            <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg" style="background:linear-gradient(135deg,#4f46e5,#06b6d4);color:white">N</span>
            <span>NEETest</span>
          </a>
          <p class="text-sm text-[var(--text-muted)] max-w-sm">
            An MCQ practice and progress-tracking tool for NEET PG and INI-CET aspirants.
          </p>
        </div>
        <div>
          <h4 class="font-semibold mb-3 text-sm">Product</h4>
          <ul class="space-y-2 text-sm text-[var(--text-muted)]">
            <li><a href="questions.html" class="hover:text-[var(--primary)]">Question Bank</a></li>
            <li><a href="mock-tests.html" class="hover:text-[var(--primary)]">Mock Tests</a></li>
            <li><a href="subjects.html" class="hover:text-[var(--primary)]">Subjects</a></li>
            <li><a href="features.html" class="hover:text-[var(--primary)]">Features</a></li>
            <li><a href="pricing.html" class="hover:text-[var(--primary)]">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-3 text-sm">Company</h4>
          <ul class="space-y-2 text-sm text-[var(--text-muted)]">
            <li><a href="exams.html" class="hover:text-[var(--primary)]">Exam Info</a></li>
            <li><a href="about.html" class="hover:text-[var(--primary)]">About</a></li>
            <li><a href="terms.html" class="hover:text-[var(--primary)]">Terms & Conditions</a></li>
            <li><a href="terms.html#privacy" class="hover:text-[var(--primary)]">Privacy</a></li>
            <li><a href="terms.html#refund" class="hover:text-[var(--primary)]">Refund Policy</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-[var(--border)]">
        <div class="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)] gap-2 text-center sm:text-left">
          <span>© 2026 NEETest. An independent MCQ practice tool. Not affiliated with NBEMS, AIIMS, NMC, or any examining body.</span>
          <span>By using this site you accept our <a href="terms.html" class="underline">Terms & Conditions</a>.</span>
        </div>
      </div>
    </footer>
  `;
  const slot = document.getElementById('footer-slot');
  if (slot) slot.innerHTML = html;
}

function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visible')); return; }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  els.forEach(e => obs.observe(e));
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = 1400, t0 = performance.now();
      const animate = (now) => {
        const t = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('en-IN');
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
      obs.unobserve(el);
    });
  }, { threshold: 0.4 });
  counters.forEach(c => obs.observe(c));
}

function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(btn => {
    if (btn._magnetic) return;
    btn._magnetic = true;
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T09:00:00');
  const now = new Date();
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

document.addEventListener('DOMContentLoaded', () => {
  renderBetaBanner();
  if (window.lucide) lucide.createIcons();
  initReveal();
  initCounters();
  initMagnetic();
});

window.refreshIcons = () => { if (window.lucide) lucide.createIcons(); };
