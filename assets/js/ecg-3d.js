// ecg-3d.js — A slowly-rotating 3D ECG ribbon behind the hero.
//
// Why this exists: replaces the soft "mesh-bg" pastel blob (an AI-tool tell)
// with a brand-consistent medical motif. The same ECG waveform appears in
// the divider SVG already on the page — one motif, two expressions.
//
// - Respects prefers-reduced-motion → no canvas inserted, page renders flat.
// - Skipped on viewports < 768px → mobile gets the static SVG ECG divider only.
// - WebGL via three.js (CDN, ~150KB gz). Loaded only when needed.
//
// Mount: <canvas id="hero-3d"> is created lazily; this file is the controller.

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Use screen.width as primary signal (more reliable than innerWidth in iframes);
  // fall back to innerWidth only if screen is unavailable.
  const screenW = (window.screen && window.screen.width) || window.innerWidth || 1024;
  const mobile = screenW < 768;
  if (reduce || mobile) return; // no canvas, no JS work, no bytes shipped

  // Create the canvas behind everything
  const canvas = document.createElement('canvas');
  canvas.id = 'hero-3d';
  // Fixed under everything; transparent (alpha:true on renderer); subtle opacity.
  // No mix-blend-mode (causes stacking-context issues with our paper-tinted bg).
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:-1;pointer-events:none;opacity:0.32;';
  document.body.prepend(canvas);

  // Lazy-load three.js — page can paint without it
  import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js').then((THREE) => {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 12);

    // Build the ECG waveform points (P, Q, R, S, T as approximate amplitude ratios)
    const ecg = [];
    for (let cycle = -3; cycle < 3; cycle++) {
      const baseX = cycle * 4;
      ecg.push(new THREE.Vector3(baseX,           0,     0));
      ecg.push(new THREE.Vector3(baseX + 0.60,  0.15,    0)); // P
      ecg.push(new THREE.Vector3(baseX + 0.90,    0,     0));
      ecg.push(new THREE.Vector3(baseX + 1.10, -0.10,    0)); // Q
      ecg.push(new THREE.Vector3(baseX + 1.25,  1.60,    0)); // R spike
      ecg.push(new THREE.Vector3(baseX + 1.40, -0.40,    0)); // S
      ecg.push(new THREE.Vector3(baseX + 1.60,    0,     0));
      ecg.push(new THREE.Vector3(baseX + 2.20,  0.30,    0)); // T
      ecg.push(new THREE.Vector3(baseX + 2.70,    0,     0));
      ecg.push(new THREE.Vector3(baseX + 4.00,    0,     0));
    }
    const curve = new THREE.CatmullRomCurve3(ecg);
    const geometry = new THREE.TubeGeometry(curve, 600, 0.045, 6, false);
    // Brand teal — uses --primary if present, falls back to the design-token value
    const color = (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#0B6E6E').trim();
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 });
    const ribbon = new THREE.Mesh(geometry, material);
    ribbon.rotation.x = -0.3;
    scene.add(ribbon);

    // 60 BPM heartbeat — sharp QRS-style pulse on the y-scale, ~1Hz
    let t = 0, lastFrame = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      t += dt;
      ribbon.rotation.y = t * 0.02; // very slow rotation, < 1 rev/min
      const beat = Math.max(0, Math.sin(t * Math.PI)) ** 8;
      ribbon.scale.y = 1 + beat * 0.04;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }, { passive: true });
  }).catch(() => {
    // CDN failed — quietly remove our canvas, page falls back to plain bg
    canvas.remove();
  });
})();
