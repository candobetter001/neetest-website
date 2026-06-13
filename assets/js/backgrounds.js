// backgrounds.js — ONE bold, continuously-moving, mouse-interactive background
// behind the entire page. Replaces the four faint per-section effects that read
// as static/broken.
//
// Vanta NET (three.js r134) mounts on a fixed full-viewport #page-bg layer that
// sits behind all content. Its nodes drift continuously (visible motion) and
// react to the cursor. Page sections are transparent (see CSS) so the animation
// is visible across the whole page; solid cards keep text readable on top.
//
// Skipped on mobile and under prefers-reduced-motion.

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screenW = (window.screen && window.screen.width) || window.innerWidth || 1024;
  if (reduce || screenW < 768) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
  const NET_URL = 'https://cdnjs.cloudflare.com/ajax/libs/vanta/0.5.24/vanta.net.min.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function boot() {
    let host = document.getElementById('page-bg');
    if (!host) {
      host = document.createElement('div');
      host.id = 'page-bg';
      document.body.prepend(host);
    }
    try {
      await loadScript(THREE_URL);
      await loadScript(NET_URL);
    } catch (_) { return; }
    if (!window.VANTA || !window.VANTA.NET) return;

    const cssVar = (n, d) => (getComputedStyle(document.documentElement).getPropertyValue(n).trim() || d);
    const hex = (s) => parseInt(s.replace('#', ''), 16);
    const primary = hex(cssVar('--primary', '#3a36c9'));
    const paper = hex(cssVar('--bg', '#fbfaf7'));

    window.__vantaNet = window.VANTA.NET({
      el: '#page-bg',
      THREE: window.THREE,
      mouseControls: true,
      touchControls: false,
      gyroControls: false,
      minHeight: 200.0,
      minWidth: 200.0,
      scale: 1.0,
      scaleMobile: 1.0,
      color: primary,
      backgroundColor: paper,
      points: 12.0,      // node density
      maxDistance: 24.0, // link distance
      spacing: 15.0,     // grid spacing
      showDots: true,
    });

    document.addEventListener('visibilitychange', () => {
      const v = window.__vantaNet;
      if (!v) return;
      try { document.hidden ? v.pause && v.pause() : v.play && v.play(); } catch (_) {}
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
