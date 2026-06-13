// dashboard.js — Renders the four data visualisations on the home page:
//   1. Hero sparkline      — 14-day accuracy trend (#hero-spark)
//   2. Heatmap             — 19 subjects, mastery-graded     (#dash-heatmap)
//   3. Scatter             — time-per-q vs accuracy bubbles (#dash-scatter)
//   4. Mock history bars   — last 10 mocks, percentile      (#dash-mocks)
//
// Data is hardcoded SAMPLE data (clearly labelled as such on the page).
// Chart.js is loaded lazily via CDN — total cost is borne only when at
// least one canvas needs it.

(function () {
  // ── Sample data (one plausible NEET PG aspirant, ~50 mocks deep) ─────
  const SPARK_14 = [54, 58, 56, 61, 64, 62, 68, 71, 69, 74, 76, 75, 78, 81];

  // 19 subjects with mastery + attempts. Order matches the NBEMS pattern.
  const SUBJECTS = [
    { name: 'Anatomy',           pct: 84, n: 156 },
    { name: 'Physiology',        pct: 79, n: 142 },
    { name: 'Biochemistry',      pct: 73, n: 134 },
    { name: 'Pharmacology',      pct: 71, n: 188 },
    { name: 'Microbiology',      pct: 68, n: 121 },
    { name: 'Pathology',         pct: 62, n: 167 },
    { name: 'Community Med',     pct: 82, n: 96  },
    { name: 'Forensic Med',      pct: 88, n: 54  },
    { name: 'Ophthalmology',     pct: 76, n: 71  },
    { name: 'ENT',               pct: 81, n: 49  },
    { name: 'Anesthesia',        pct: 66, n: 38  },
    { name: 'Dermatology',       pct: 72, n: 47  },
    { name: 'Psychiatry',        pct: 85, n: 32  },
    { name: 'Radiology',         pct: 58, n: 41  },
    { name: 'Medicine',          pct: 64, n: 224 },
    { name: 'Surgery',           pct: 57, n: 198 },
    { name: 'Orthopedics',       pct: 39, n: 78  },  // critical
    { name: 'Paediatrics',       pct: 69, n: 92  },
    { name: 'OBG',               pct: 48, n: 154 },  // weak
  ];

  // For scatter: average seconds per question, x-axis. Higher = slower.
  const TIME_PER_Q = {
    'Anatomy': 32, 'Physiology': 38, 'Biochemistry': 41, 'Pharmacology': 35,
    'Microbiology': 44, 'Pathology': 51, 'Community Med': 28, 'Forensic Med': 24,
    'Ophthalmology': 39, 'ENT': 33, 'Anesthesia': 47, 'Dermatology': 36,
    'Psychiatry': 29, 'Radiology': 56, 'Medicine': 62, 'Surgery': 58,
    'Orthopedics': 49, 'Paediatrics': 42, 'OBG': 53,
  };

  const MOCKS = [62, 65, 64, 71, 73, 78, 81, 84, 96, 89]; // last 10 percentiles
  const TARGET_LINE = 95;

  // ── Colour palette derived from CSS custom properties ────────────────
  const css = getComputedStyle(document.documentElement);
  const PRIMARY  = (css.getPropertyValue('--primary')  || '#0B6E6E').trim() || '#0B6E6E';
  const WARNING  = (css.getPropertyValue('--warning')  || '#b45309').trim() || '#b45309';
  const DANGER   = (css.getPropertyValue('--danger')   || '#b91c1c').trim() || '#b91c1c';
  const SUCCESS  = (css.getPropertyValue('--success')  || '#15803d').trim() || '#15803d';
  const MUTED    = (css.getPropertyValue('--text-muted') || '#5c574e').trim() || '#5c574e';
  const BORDER   = (css.getPropertyValue('--border')   || '#e6e2d8').trim() || '#e6e2d8';

  // Map a percent → hue. Quiet earth-toned palette to fit the editorial style.
  function pctColor(pct) {
    if (pct >= 80) return '#15803d';   // strong
    if (pct >= 60) return '#a3a35e';   // ok
    if (pct >= 40) return '#b45309';   // weak
    return '#b91c1c';                  // critical
  }

  // ── Heatmap (no library, just CSS grid + DOM) ────────────────────────
  function renderHeatmap() {
    const root = document.getElementById('dash-heatmap');
    if (!root) return;
    root.innerHTML = SUBJECTS.map(s => `
      <div class="rounded-lg p-3 border border-[var(--border)] transition-all hover:shadow-md hover:-translate-y-0.5"
           style="background:${pctColor(s.pct)};color:white;cursor:default"
           title="${s.name} · ${s.pct}% across ${s.n} attempts">
        <div class="text-xs opacity-90 font-medium leading-tight">${s.name}</div>
        <div class="mt-1 flex items-baseline gap-1">
          <span class="font-display text-2xl font-bold tabular-nums">${s.pct}</span>
          <span class="text-xs opacity-80">%</span>
        </div>
        <div class="text-[10px] opacity-75 mt-0.5">${s.n} attempted</div>
      </div>
    `).join('');
  }

  // ── Sparkline (Chart.js) ─────────────────────────────────────────────
  function renderSpark(Chart) {
    const el = document.getElementById('hero-spark');
    if (!el) return;
    new Chart(el, {
      type: 'line',
      data: {
        labels: SPARK_14.map((_, i) => `D${i + 1}`),
        datasets: [{
          data: SPARK_14,
          borderColor: PRIMARY,
          backgroundColor: PRIMARY + '14',
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: ctx => ctx.dataIndex === SPARK_14.length - 1 ? 4 : 0,
          pointBackgroundColor: WARNING,
          pointBorderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 40, max: 100 } },
        animation: { duration: 1400, easing: 'easeOutCubic' },
      },
    });
  }

  // ── Scatter: time vs accuracy ───────────────────────────────────────
  function renderScatter(Chart) {
    const el = document.getElementById('dash-scatter');
    if (!el) return;
    const data = SUBJECTS.map(s => ({
      x: TIME_PER_Q[s.name] || 40,
      y: s.pct,
      r: Math.max(5, Math.sqrt(s.n) * 1.2),
      label: s.name,
    }));
    new Chart(el, {
      type: 'bubble',
      data: { datasets: [{
        data,
        backgroundColor: data.map(d => pctColor(d.y) + 'aa'),
        borderColor: data.map(d => pctColor(d.y)),
        borderWidth: 1.5,
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const d = ctx.raw;
                return `${d.label} — ${d.y}% in ${d.x}s`;
              },
            },
          },
        },
        scales: {
          x: { title: { display: true, text: 'Avg seconds per question', color: MUTED, font: { size: 11 } }, grid: { color: BORDER }, ticks: { color: MUTED, font: { size: 11 } } },
          y: { title: { display: true, text: 'Accuracy %', color: MUTED, font: { size: 11 } }, grid: { color: BORDER }, ticks: { color: MUTED, font: { size: 11 } }, min: 30, max: 100 },
        },
        animation: { duration: 1400, easing: 'easeOutCubic' },
      },
    });
  }

  // ── Mock history bars with target line ───────────────────────────────
  function renderMocks(Chart) {
    const el = document.getElementById('dash-mocks');
    if (!el) return;
    new Chart(el, {
      type: 'bar',
      data: {
        labels: MOCKS.map((_, i) => `M${i + 1}`),
        datasets: [{
          data: MOCKS,
          backgroundColor: MOCKS.map(m => m >= TARGET_LINE ? SUCCESS : PRIMARY + 'cc'),
          borderRadius: 4,
          barPercentage: 0.72,
          categoryPercentage: 0.85,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `Percentile: ${ctx.parsed.y}` } },
          annotation: { /* requires plugin; we'll draw the line manually below */ },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: MUTED, font: { size: 11 } } },
          y: { min: 50, max: 100, grid: { color: BORDER }, ticks: { color: MUTED, font: { size: 11 }, callback: v => v } },
        },
        animation: { duration: 1400, easing: 'easeOutCubic' },
      },
      plugins: [{
        id: 'target-line',
        afterDatasetsDraw(chart) {
          const { ctx, chartArea, scales } = chart;
          const y = scales.y.getPixelForValue(TARGET_LINE);
          ctx.save();
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = DANGER;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(chartArea.left, y);
          ctx.lineTo(chartArea.right, y);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = DANGER;
          ctx.font = '500 10px Inter, system-ui, sans-serif';
          ctx.fillText('95p target', chartArea.right - 60, y - 4);
          ctx.restore();
        },
      }],
    });
  }

  // ── Hero bars animation (CSS transitions, triggered on view) ─────────
  function animateBars() {
    const bars = document.querySelectorAll('[data-bar]');
    if (!bars.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.style.width = e.target.dataset.bar + '%';
        obs.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    bars.forEach(b => obs.observe(b));
  }

  // ── Lazy Chart.js loader (only fetched if a canvas exists on the page) ─
  function needsChart() {
    return document.getElementById('hero-spark')
        || document.getElementById('dash-scatter')
        || document.getElementById('dash-mocks');
  }

  function boot() {
    renderHeatmap();    // CSS-only, no library — free
    animateBars();      // CSS transitions only

    if (!needsChart()) return;
    if (window.Chart) return doCharts(window.Chart);

    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4/dist/chart.umd.js';
    s.async = true;
    s.onload = () => doCharts(window.Chart);
    s.onerror = () => { /* CDN failure: charts simply absent; section degrades to text */ };
    document.head.appendChild(s);
  }

  function doCharts(Chart) {
    try { renderSpark(Chart); }   catch (e) { console.warn('spark', e); }
    try { renderScatter(Chart); } catch (e) { console.warn('scatter', e); }
    try { renderMocks(Chart); }   catch (e) { console.warn('mocks', e); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
