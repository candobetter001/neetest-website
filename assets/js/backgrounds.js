// backgrounds.js — THREE distinct, bold, continuously-moving section backgrounds.
//
//   data-bg="ecg"   → Hero: a scrolling ECG monitor (custom 2D canvas, red).
//                     A heartbeat trace that runs right-to-left like a real
//                     patient monitor — unmistakably medical, unmistakably moving.
//   data-bg="cells" → Dark "difference" section: Vanta CELLS (red/maroon),
//                     drifting blood-cell-like blobs.
//   data-bg="net"   → CTA: Vanta NET (red), a mouse-interactive constellation.
//
// Three different visual languages (line / blobs / lattice), all in the medical
// red theme. IntersectionObserver creates each effect when its section is in
// view and destroys it when it leaves. Skipped on mobile + reduced-motion.

(function () {
  // Animations run on mobile too now (users asked to see them on their phones).
  // Only "reduce motion" accessibility preference disables them.
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const targets = Array.from(document.querySelectorAll('.section-bg[data-bg]'));
  if (!targets.length) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
  const VANTA_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.';
  const VANTA_FX = { cells: 'cells', net: 'net' };

  const cssVar = (n, d) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d);
  const hexNum = (s) => parseInt(s.replace('#', ''), 16);

  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  let vantaLoading = null;
  function ensureVanta(effect) {
    if (!vantaLoading) vantaLoading = loadScript(THREE_URL);
    return vantaLoading
      .then(() => loadScript(VANTA_BASE + effect + '.min.js'))
      .then(() => window.VANTA && window.VANTA[effect.toUpperCase()]);
  }

  const instances = new Map();

  async function create(el) {
    const type = el.dataset.bg;
    if (type === 'ecg') return makeEcg(el);

    const fx = VANTA_FX[type];
    if (!fx) return null;
    const ctor = await ensureVanta(fx);
    if (!ctor) return null;

    const primary = hexNum(cssVar('--primary', '#c1121f'));
    const accent = hexNum(cssVar('--accent', '#7d0a14'));
    const common = {
      el, THREE: window.THREE,
      mouseControls: true, touchControls: false, gyroControls: false,
      minHeight: 200.0, minWidth: 200.0, scale: 1.0, scaleMobile: 1.0,
    };
    if (type === 'cells') {
      return window.VANTA.CELLS({ ...common,
        color1: primary, color2: accent, size: 1.7, speed: 1.6 });
    }
    if (type === 'net') {
      return window.VANTA.NET({ ...common,
        color: primary, backgroundColor: hexNum(cssVar('--bg', '#fdfbfa')),
        points: 11.0, maxDistance: 23.0, spacing: 16.0, showDots: true });
    }
    return null;
  }

  function destroy(el) {
    const inst = instances.get(el);
    if (!inst) return;
    try { typeof inst.destroy === 'function' && inst.destroy(); } catch (_) {}
    instances.delete(el);
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(async (e) => {
      if (e.isIntersecting) {
        if (!instances.has(e.target)) {
          instances.set(e.target, true); // reserve slot to avoid double-create
          const inst = await create(e.target);
          if (inst) instances.set(e.target, inst);
          else instances.delete(e.target);
        }
      } else {
        destroy(e.target);
      }
    });
  }, { rootMargin: '150px 0px 150px 0px', threshold: 0.01 });

  targets.forEach(t => io.observe(t));

  // ── Custom 2D ECG monitor (hero) ────────────────────────────────────────
  function makeEcg(el) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const color = cssVar('--primary', '#c1121f');
    let raf = 0, disposed = false, w = 0, h = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = el.clientWidth || window.innerWidth;
      h = el.clientHeight || 600;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // One PQRST beat as amplitude offsets across a unit cell of width `cell`.
    const cell = 240;          // px per heartbeat
    const speed = 90;          // px/sec scroll
    function beatY(x, mid, amp) {
      const p = ((x % cell) + cell) % cell; // 0..cell
      const f = p / cell;                    // 0..1
      // piecewise PQRST
      let y = 0;
      if (f < 0.12) y = 0;
      else if (f < 0.18) y = Math.sin((f - 0.12) / 0.06 * Math.PI) * 0.12;   // P
      else if (f < 0.30) y = 0;
      else if (f < 0.33) y = -((f - 0.30) / 0.03) * 0.18;                     // Q
      else if (f < 0.36) y = -0.18 + ((f - 0.33) / 0.03) * 1.18;             // R up
      else if (f < 0.39) y = 1.0 - ((f - 0.36) / 0.03) * 1.4;               // S down
      else if (f < 0.43) y = -0.4 + ((f - 0.39) / 0.04) * 0.4;             // back to base
      else if (f < 0.62) y = 0;
      else if (f < 0.78) y = Math.sin((f - 0.62) / 0.16 * Math.PI) * 0.28;   // T
      else y = 0;
      return mid - y * amp;
    }

    let t0 = performance.now();
    function frame(now) {
      if (disposed) return;
      const dt = now - t0;
      const scroll = (dt / 1000) * speed;
      ctx.clearRect(0, 0, w, h);

      const mid = h * 0.52;
      const amp = Math.min(160, h * 0.30);

      // faint baseline grid (monitor feel)
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      for (let gx = -((scroll * 0.5) % 40); gx < w; gx += 40) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }

      // the trace
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = color; ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;
      for (let px = 0; px <= w; px += 2) {
        const y = beatY(px + scroll, mid, amp);
        if (!started) { ctx.moveTo(px, y); started = true; } else ctx.lineTo(px, y);
      }
      ctx.stroke();

      // leading glow dot at the right edge
      const ly = beatY(w + scroll, mid, amp);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = color;
      ctx.shadowColor = color; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(w - 2, ly, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return {
      destroy() {
        disposed = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      },
    };
  }
})();
