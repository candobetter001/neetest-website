// backgrounds.js — Per-section interactive animated backgrounds.
//
// Each <section class="has-bg"> contains <div class="section-bg" data-bg="...">.
// We mount a distinct effect into each:
//   data-bg="ecg"   → custom three.js ECG ribbon (hero, brand signature)
//   data-bg="net"   → Vanta NET   (dark ethos — mouse-interactive node web)
//   data-bg="dots"  → Vanta DOTS  (light feature section — drifting points)
//   data-bg="globe" → Vanta GLOBE (CTA — rotating wireframe globe)
//
// Only ONE effect is alive per section, and effects are created when the
// section scrolls into view and destroyed when it leaves — so we never run
// more than ~2 WebGL contexts at once. Skipped entirely on mobile and under
// prefers-reduced-motion (CSS hides .section-bg too, this is the JS guard).
//
// Vanta 0.5.24 is pinned to three.js r134 (its supported version). The custom
// ECG also uses that same global THREE, so the page loads one three.js only.

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screenW = (window.screen && window.screen.width) || window.innerWidth || 1024;
  if (reduce || screenW < 768) return;

  const targets = Array.from(document.querySelectorAll('.section-bg[data-bg]'));
  if (!targets.length) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
  const VANTA_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.';
  const VANTA_EFFECTS = { net: 'net', dots: 'dots', globe: 'globe', waves: 'waves' };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function boot() {
    try {
      await loadScript(THREE_URL);
      const needed = new Set(targets.map(t => t.dataset.bg).filter(n => VANTA_EFFECTS[n]));
      await Promise.all([...needed].map(n => loadScript(VANTA_BASE + VANTA_EFFECTS[n] + '.min.js')));
    } catch (_) {
      return; // CDN down → page keeps its flat backgrounds, no error surfaced
    }
    initManager();
  }

  const instances = new Map();

  function makeEffect(el) {
    const type = el.dataset.bg;
    const THREE = window.THREE;
    if (!THREE) return null;
    if (type === 'ecg') return makeEcg(el, THREE);

    const common = {
      el, THREE,
      mouseControls: true, touchControls: false, gyroControls: false,
      minHeight: 200.0, minWidth: 200.0, scale: 1.0, scaleMobile: 1.0,
    };
    const V = window.VANTA || {};
    if (type === 'net' && V.NET) {
      return V.NET({ ...common,
        color: 0x4ec5cf, backgroundColor: 0x100f0d,
        points: 9.0, maxDistance: 21.0, spacing: 17.0, showDots: true });
    }
    if (type === 'dots' && V.DOTS) {
      return V.DOTS({ ...common,
        color: 0x3a36c9, color2: 0x0e7c86, backgroundColor: 0xffffff,
        size: 3.0, spacing: 36.0, showLines: false });
    }
    if (type === 'globe' && V.GLOBE) {
      return V.GLOBE({ ...common,
        color: 0x3a36c9, color2: 0x0e7c86, backgroundColor: 0xfbfaf7, size: 1.05 });
    }
    if (type === 'waves' && V.WAVES) {
      return V.WAVES({ ...common, color: 0x3a36c9, shininess: 28, waveHeight: 11, zoom: 0.92 });
    }
    return null;
  }

  function destroyEffect(el) {
    const inst = instances.get(el);
    if (!inst) return;
    try { if (typeof inst.destroy === 'function') inst.destroy(); } catch (_) {}
    instances.delete(el);
  }

  function initManager() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          if (!instances.get(e.target)) {
            const inst = makeEffect(e.target);
            if (inst) instances.set(e.target, inst);
          }
        } else {
          destroyEffect(e.target);
        }
      });
    }, { rootMargin: '120px 0px 120px 0px', threshold: 0.01 });
    targets.forEach(t => io.observe(t));

    // Pause everything when the tab is hidden (saves battery/GPU)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) instances.forEach((inst) => { try { inst.pause && inst.pause(); } catch (_) {} });
    });
  }

  // ── Custom ECG ribbon (hero) ────────────────────────────────────────────
  function makeEcg(el, THREE) {
    let raf = 0, renderer, scene, camera, ribbon, disposed = false;
    try {
      const w = el.clientWidth || (el.parentElement && el.parentElement.clientWidth) || window.innerWidth || 1280;
      const h = el.clientHeight || (el.parentElement && el.parentElement.clientHeight) || 600;
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(w, h);
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0.30;';
      el.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
      camera.position.set(0, 0, 12);

      const ecg = [];
      for (let cycle = -3; cycle < 3; cycle++) {
        const b = cycle * 4;
        ecg.push(new THREE.Vector3(b, 0, 0),
                 new THREE.Vector3(b + 0.6, 0.15, 0),
                 new THREE.Vector3(b + 0.9, 0, 0),
                 new THREE.Vector3(b + 1.1, -0.1, 0),
                 new THREE.Vector3(b + 1.25, 1.6, 0),
                 new THREE.Vector3(b + 1.4, -0.4, 0),
                 new THREE.Vector3(b + 1.6, 0, 0),
                 new THREE.Vector3(b + 2.2, 0.3, 0),
                 new THREE.Vector3(b + 2.7, 0, 0),
                 new THREE.Vector3(b + 4, 0, 0));
      }
      const curve = new THREE.CatmullRomCurve3(ecg);
      const geo = new THREE.TubeGeometry(curve, 600, 0.045, 6, false);
      const color = (getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#3a36c9').trim();
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6 });
      ribbon = new THREE.Mesh(geo, mat);
      ribbon.rotation.x = -0.3;
      scene.add(ribbon);

      let t = 0, last = performance.now();
      const tick = (now) => {
        if (disposed) return;
        const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        ribbon.rotation.y = t * 0.02;
        const beat = Math.max(0, Math.sin(t * Math.PI)) ** 8;
        ribbon.scale.y = 1 + beat * 0.04;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const onResize = () => {
        if (disposed) return;
        const nw = el.clientWidth, nh = el.clientHeight;
        camera.aspect = nw / nh; camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', onResize, { passive: true });

      return {
        destroy() {
          disposed = true;
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', onResize);
          try { geo.dispose(); mat.dispose(); renderer.dispose(); } catch (_) {}
          if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
        },
      };
    } catch (_) {
      return null;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
