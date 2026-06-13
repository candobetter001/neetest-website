// bioscenes.js — Per-section biomedical particle scenes.
//
// One canvas particle engine, parameterised per section via data-bg:
//   heart    → particles assemble into a heart, then BEAT (hero)
//   dna      → particles form a rotating DNA double helix (what-you-get)
//   neurons  → a firing neuron network with travelling synapse pulses (dark)
//   molecule → a rotating hex molecular ring + bonds (CTA)
//
// Each particle continuously eases toward a target point. When the section
// scrolls into view, particles start scattered and "assemble" as they ease in.
// Idle motion is produced by MOVING the targets (beat/rotate/phase). The cursor
// repels nearby particles. Red medical palette.
//
// Pure canvas 2D — no libraries. Respects prefers-reduced-motion; lighter on mobile.

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const targets = Array.from(document.querySelectorAll('.section-bg[data-bg]'));
  if (!targets.length) return;

  const isMobile = (window.screen && window.screen.width || window.innerWidth) < 768;
  const css = getComputedStyle(document.documentElement);
  const PRIMARY = (css.getPropertyValue('--primary').trim() || '#c1121f');

  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }
  const RGB = hexToRgb(PRIMARY);

  // ── point-cloud generators (return array of {x,y} in a -1..1 box) ────────
  function heartPoints(n) {
    // interior fill of the classic heart inequality (x²+y²−1)³ − x²y³ ≤ 0
    const pts = [];
    let tries = 0;
    while (pts.length < n && tries < n * 40) {
      tries++;
      const x = (Math.random() * 2 - 1) * 1.25;
      const y = (Math.random() * 2 - 1) * 1.25;
      const a = x * x + y * y - 1;
      if (a * a * a - x * x * y * y * y <= 0) {
        pts.push({ x, y: -y }); // flip so the point is at the bottom
      }
    }
    return pts;
  }
  function dnaPoints(n) {
    // two phosphate strands + base-pair rungs, vertical helix in -1..1
    const pts = [];
    const turns = 2.4, R = 0.62;
    for (let i = 0; i < n; i++) {
      const f = i / n;                 // 0..1 along the strand
      const yy = (f * 2 - 1) * 1.05;
      const ang = f * Math.PI * 2 * turns;
      const strand = i % 2;
      const phase = strand ? Math.PI : 0;
      pts.push({ x: Math.sin(ang + phase) * R, y: yy, _ang: ang, _strand: strand, _f: f });
      if (i % 6 === 0) { // a rung crossing the two strands
        const steps = 4;
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          pts.push({ x: (Math.sin(ang) * (1 - t) + Math.sin(ang + Math.PI) * t) * R, y: yy, _rung: true });
        }
      }
    }
    return pts;
  }
  function neuronPoints(n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({ x: (Math.random() * 2 - 1) * 1.1, y: (Math.random() * 2 - 1) * 1.0,
                 _dx: (Math.random()-0.5) * 0.0006, _dy: (Math.random()-0.5) * 0.0006 });
    }
    return pts;
  }
  function moleculePoints(n) {
    // central atom + a hexagon ring of atoms, each atom a small cluster
    const pts = [];
    const ring = 6, R = 0.8;
    const atoms = [{ x: 0, y: 0 }];
    for (let k = 0; k < ring; k++) atoms.push({ x: Math.cos(k/ring*2*Math.PI) * R, y: Math.sin(k/ring*2*Math.PI) * R });
    const per = Math.max(8, Math.floor(n / atoms.length));
    atoms.forEach(a => {
      for (let j = 0; j < per; j++) {
        const r = Math.sqrt(Math.random()) * 0.12, t = Math.random() * Math.PI * 2;
        pts.push({ x: a.x + Math.cos(t) * r, y: a.y + Math.sin(t) * r });
      }
    });
    return pts;
  }

  const SCENES = {
    heart:    { gen: heartPoints,    count: isMobile ? 360 : 720, biasX: 0.72, scale: 0.30, lines: false },
    dna:      { gen: dnaPoints,      count: isMobile ? 160 : 300, biasX: 0.78, scale: 0.32, lines: false },
    neurons:  { gen: neuronPoints,   count: isMobile ? 60  : 120, biasX: 0.5,  scale: 0.62, lines: true  },
    molecule: { gen: moleculePoints, count: isMobile ? 110 : 200, biasX: 0.7,  scale: 0.30, lines: 'bonds' },
  };

  const instances = new Map();

  function build(el) {
    const type = el.dataset.bg;
    const cfg = SCENES[type];
    if (!cfg) return null;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    el.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, raf = 0, dead = false, t = 0;
    const mouse = { x: -9999, y: -9999 };

    const base = cfg.gen(cfg.count);
    const P = base.map(() => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, sx: 0, sy: 0 }));

    function resize() {
      W = el.clientWidth || window.innerWidth;
      H = el.clientHeight || 500;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    el.closest('section')?.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    el.closest('section')?.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    // map normalised (-1..1) point → screen px
    function project(pt, S, cx, cy) { return [cx + pt.x * S, cy + pt.y * S]; }

    function frame() {
      if (dead) return;
      t += 0.016;
      ctx.clearRect(0, 0, W, H);
      const S = Math.min(W, H) * cfg.scale;
      const cx = W * cfg.biasX;
      const cy = H * 0.5;

      // beat factor for heart
      const beat = type === 'heart'
        ? 1 + Math.pow(Math.max(0, Math.sin(t * 1.25 * Math.PI)), 6) * 0.10
        : 1;
      const rot = (type === 'molecule') ? t * 0.25 : 0;
      const cosR = Math.cos(rot), sinR = Math.sin(rot);
      const dnaPhase = t * 0.9;

      for (let i = 0; i < P.length; i++) {
        let b = base[i];
        let bx = b.x, by = b.y;

        if (type === 'heart') { bx *= beat; by *= beat; }
        else if (type === 'molecule') { const nx = bx*cosR - by*sinR, ny = bx*sinR + by*cosR; bx = nx; by = ny; }
        else if (type === 'dna' && !b._rung) { bx = Math.sin(b._ang + dnaPhase + (b._strand ? Math.PI : 0)) * 0.62; }
        else if (type === 'dna' && b._rung) { /* rung follows nearby phase loosely */ bx = b.x * Math.cos(dnaPhase*0.0+0); }
        else if (type === 'neurons') { bx += Math.sin(t*0.6 + i) * 0.03; by += Math.cos(t*0.5 + i) * 0.03; }

        let [tx, ty] = project({ x: bx, y: by }, S, cx, cy);

        const p = P[i];
        // ease toward target (this produces the "assembly")
        p.sx = (p.sx || tx); p.sy = (p.sy || ty);
        p.sx += (tx - p.sx) * 0.08;
        p.sy += (ty - p.sy) * 0.08;

        // cursor repulsion
        const dx = p.sx - mouse.x, dy = p.sy - mouse.y;
        const d2 = dx*dx + dy*dy;
        let rx = p.sx, ry = p.sy;
        if (d2 < 110*110) { const d = Math.sqrt(d2) || 1, f = (110 - d) / 110 * 26; rx += dx/d*f; ry += dy/d*f; }
        p.rx = rx; p.ry = ry;
      }

      // connective lines for neurons / bonds for molecule
      if (cfg.lines === true) {
        ctx.lineWidth = 1;
        for (let i = 0; i < P.length; i++) {
          for (let j = i + 1; j < P.length; j++) {
            const a = P[i], b2 = P[j];
            const dx = a.rx - b2.rx, dy = a.ry - b2.ry, dist = Math.hypot(dx, dy);
            if (dist < 90) {
              ctx.strokeStyle = `rgba(${RGB[0]},${RGB[1]},${RGB[2]},${(1 - dist/90) * 0.22})`;
              ctx.beginPath(); ctx.moveTo(a.rx, a.ry); ctx.lineTo(b2.rx, b2.ry); ctx.stroke();
            }
          }
          // travelling synapse pulse
        }
      }

      // dots
      const dotR = type === 'neurons' ? 2.4 : (type === 'heart' ? 2.1 : 1.7);
      const dotA = type === 'neurons' ? 0.85 : (type === 'heart' ? 0.82 : 0.7);
      ctx.fillStyle = `rgba(${RGB[0]},${RGB[1]},${RGB[2]},${dotA})`;
      for (let i = 0; i < P.length; i++) {
        const p = P[i];
        ctx.beginPath(); ctx.arc(p.rx, p.ry, dotR, 0, Math.PI * 2); ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return { destroy() { dead = true; cancelAnimationFrame(raf); window.removeEventListener('resize', resize); if (canvas.parentNode) canvas.remove(); } };
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { if (!instances.has(e.target)) { const i = build(e.target); if (i) instances.set(e.target, i); } }
      else { const i = instances.get(e.target); if (i) { i.destroy(); instances.delete(e.target); } }
    });
  }, { rootMargin: '120px 0px 120px 0px', threshold: 0.01 });

  targets.forEach(t => io.observe(t));
})();
