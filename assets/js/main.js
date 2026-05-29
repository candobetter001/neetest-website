// NEETest — shared site behavior

// Render the top navigation
function renderNav(active) {
  const links = [
    { href: 'index.html', label: 'Home' },
    { href: 'features.html', label: 'Features' },
    { href: 'questions.html', label: 'Question Bank' },
    { href: 'mock-tests.html', label: 'Mock Tests' },
    { href: 'exams.html', label: 'Exams' },
    { href: 'notes.html', label: 'Notes' },
    { href: 'pricing.html', label: 'Pricing' },
  ];
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
          <a href="download.html" class="btn-primary text-sm py-2 px-4 magnetic">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span class="hidden sm:inline">Get the App</span>
          </a>
          <button class="md:hidden p-2" onclick="document.querySelector('.nav-links').classList.toggle('!flex'); document.querySelector('.nav-links').classList.toggle('!flex-col'); document.querySelector('.nav-links').classList.toggle('!absolute'); document.querySelector('.nav-links').classList.toggle('!top-16'); document.querySelector('.nav-links').classList.toggle('!right-4'); document.querySelector('.nav-links').classList.toggle('!bg-white'); document.querySelector('.nav-links').classList.toggle('!p-4'); document.querySelector('.nav-links').classList.toggle('!rounded-xl'); document.querySelector('.nav-links').classList.toggle('!shadow-2xl');">
            <i data-lucide="menu" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
    </header>
  `;
  const slot = document.getElementById('nav-slot');
  if (slot) slot.innerHTML = html;
}

// Footer
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
            Free, PYQ-first prep for NEET PG, INI-CET, and AIIMS PG aspirants. Built by doctors, for doctors.
          </p>
          <div class="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <span class="pulse-dot"></span>
            <span><span id="live-users">1,247</span> doctors prepping right now</span>
          </div>
        </div>
        <div>
          <h4 class="font-semibold mb-3 text-sm">Product</h4>
          <ul class="space-y-2 text-sm text-[var(--text-muted)]">
            <li><a href="features.html" class="hover:text-[var(--primary)]">Features</a></li>
            <li><a href="questions.html" class="hover:text-[var(--primary)]">Question Bank</a></li>
            <li><a href="mock-tests.html" class="hover:text-[var(--primary)]">Mock Tests</a></li>
            <li><a href="notes.html" class="hover:text-[var(--primary)]">Notes</a></li>
            <li><a href="pricing.html" class="hover:text-[var(--primary)]">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 class="font-semibold mb-3 text-sm">Resources</h4>
          <ul class="space-y-2 text-sm text-[var(--text-muted)]">
            <li><a href="exams.html#neetpg" class="hover:text-[var(--primary)]">NEET PG 2026</a></li>
            <li><a href="exams.html#inicet" class="hover:text-[var(--primary)]">INI-CET 2026</a></li>
            <li><a href="about.html" class="hover:text-[var(--primary)]">About</a></li>
            <li><a href="download.html" class="hover:text-[var(--primary)]">Download App</a></li>
          </ul>
        </div>
      </div>
      <div class="border-t border-[var(--border)]">
        <div class="max-w-7xl mx-auto px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-[var(--text-muted)]">
          <span>© 2026 NEETest. Made in India 🇮🇳 for India's future doctors.</span>
          <span class="mt-2 sm:mt-0">All PYQs are public exam material. NEETest is independent and not affiliated with NBEMS, AIIMS, or NMC.</span>
        </div>
      </div>
    </footer>
  `;
  const slot = document.getElementById('footer-slot');
  if (slot) slot.innerHTML = html;
}

// Reveal on scroll
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(e => obs.observe(e));
}

// Animated stat counter
function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!('IntersectionObserver' in window)) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const dur = 1400;
      const t0 = performance.now();
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

// Magnetic button effect
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.15}px, ${y * 0.25}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
}

// Live user count (fake but real-feeling)
function initLiveCount() {
  const el = document.getElementById('live-users');
  if (!el) return;
  let n = 1200 + Math.floor(Math.random() * 80);
  el.textContent = n.toLocaleString('en-IN');
  setInterval(() => {
    n += Math.random() > 0.5 ? 1 : -1;
    n = Math.max(1100, Math.min(1400, n));
    el.textContent = n.toLocaleString('en-IN');
  }, 4000);
}

// Days until target exam
function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T09:00:00');
  const now = new Date();
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

// Init everything
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initReveal();
  initCounters();
  initMagnetic();
  initLiveCount();
});

// Re-init icons after dynamic content
window.refreshIcons = () => { if (window.lucide) lucide.createIcons(); };
