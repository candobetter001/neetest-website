// bio3d.js — Real 3D (Three.js / WebGL) medical scenes, one per section.
//
// Builders (data-bg value → scene):
//   dna3d      → glowing DNA double helix (clip 1)
//   cells3d    → biconcave red blood cells tumbling through depth (clip 3)
//   virus3d    → spiked 3D virus particles rotating/drifting (clip 4)
//   molecule3d → ball-and-stick molecule rotating (pharmacology)
//
// All original recreations — no stock footage used. Each scene is created when
// its section scrolls into view and fully disposed (context released) when it
// leaves, so we never hold more than a couple of WebGL contexts at once.
// Skipped under prefers-reduced-motion.

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const TYPES = { dna3d: 1, cells3d: 1, virus3d: 1, molecule3d: 1 };
  const hosts = Array.from(document.querySelectorAll('.section-bg[data-bg]')).filter(h => TYPES[h.dataset.bg]);
  if (!hosts.length) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let loading = null;
  function ensureThree() { if (!loading) loading = new Promise((res, rej) => { const s = document.createElement('script'); s.src = THREE_URL; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); return loading; }

  const mouse = { x: 0, y: 0 };
  window.addEventListener('mousemove', (e) => { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  function makeScene(host, build) {
    const THREE = window.THREE;
    let W = host.clientWidth || innerWidth, H = host.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x120708, 0.07);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 15);
    scene.add(new THREE.AmbientLight(0x551015, 0.85));
    const key = new THREE.PointLight(0xff5a5a, 1.5, 80); key.position.set(10, 12, 16); scene.add(key);
    const rim = new THREE.PointLight(0xff9a6a, 0.9, 80); rim.position.set(-14, -8, 8); scene.add(rim);

    const api = build(THREE, scene, camera, W, H);  // returns {update(dt,t), biasRight}
    if (api && api.biasRight) camera.position.x = W > 900 ? -4.5 : 0;

    function resize() {
      W = host.clientWidth || innerWidth; H = host.clientHeight || 600;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
      if (api && api.biasRight) camera.position.x = W > 900 ? -4.5 : 0;
    }
    window.addEventListener('resize', resize, { passive: true });

    let last = performance.now(), raf = 0, dead = false, t = 0;
    function tick(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      if (api && api.update) api.update(dt, t, mouse);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return {
      destroy() {
        dead = true; cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); } });
        renderer.dispose();
        if (renderer.forceContextLoss) try { renderer.forceContextLoss(); } catch (e) {}
        if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      },
    };
  }

  // ── Builders ─────────────────────────────────────────────────────────────
  function buildDNA(THREE, scene) {
    const g = new THREE.Group(); scene.add(g);
    const RUNGS = 30, R = 2.6, STEP = 0.62, TURN = 0.52, totalH = RUNGS * STEP;
    const core = new THREE.SphereGeometry(0.32, 16, 16), halo = new THREE.SphereGeometry(0.62, 12, 12), base = new THREE.SphereGeometry(0.15, 8, 8);
    const mA = new THREE.MeshStandardMaterial({ color: 0xff5a5a, emissive: 0xb01020, emissiveIntensity: 0.9, roughness: 0.35 });
    const mB = new THREE.MeshStandardMaterial({ color: 0xff8a5a, emissive: 0x7a0c14, emissiveIntensity: 0.8, roughness: 0.4 });
    const mBase = new THREE.MeshStandardMaterial({ color: 0xffb0a0, emissive: 0x9a1018, emissiveIntensity: 0.7, roughness: 0.5 });
    const mHalo = new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false });
    const mRung = new THREE.MeshStandardMaterial({ color: 0xe23b42, emissive: 0x5a0a10, emissiveIntensity: 0.5, roughness: 0.6 });
    for (let i = 0; i < RUNGS; i++) {
      const y = i * STEP - totalH / 2, a = i * TURN;
      const p1 = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R), p2 = new THREE.Vector3(Math.cos(a + Math.PI) * R, y, Math.sin(a + Math.PI) * R);
      [[p1, mA], [p2, mB]].forEach(([p, m]) => { const s = new THREE.Mesh(core, m); s.position.copy(p); g.add(s); const h = new THREE.Mesh(halo, mHalo); h.position.copy(p); g.add(h); });
      const mid = p1.clone().add(p2).multiplyScalar(0.5), dir = p2.clone().sub(p1), len = dir.length();
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), mRung);
      rung.position.copy(mid); rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); g.add(rung);
      [0.32, 0.68].forEach(tt => { const b = new THREE.Mesh(base, mBase); b.position.copy(p1.clone().lerp(p2, tt)); g.add(b); });
    }
    g.rotation.z = 0.35;
    return { biasRight: true, update(dt, t, m) { g.rotation.y += dt * 0.55; g.rotation.x += (m.y * 0.25 - g.rotation.x) * 0.04; g.rotation.z += ((0.35 + m.x * 0.15) - g.rotation.z) * 0.04; } };
  }

  function buildCells(THREE, scene) {
    const cells = [];
    const disc = new THREE.SphereGeometry(1, 20, 16);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc81e28, emissive: 0x5a0810, emissiveIntensity: 0.6, roughness: 0.45 });
    const matW = new THREE.MeshStandardMaterial({ color: 0xffd7d7, emissive: 0x7a3030, emissiveIntensity: 0.4, roughness: 0.5 });
    for (let i = 0; i < 16; i++) {
      const wbc = Math.random() < 0.18;
      const m = new THREE.Mesh(disc, wbc ? matW : mat);
      const r = 0.7 + Math.random() * 0.7; m.scale.set(r, r * 0.42, r);
      m.position.set((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10);
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      m.userData = { v: 0.6 + Math.random() * 1.2, rx: (Math.random() - 0.5) * 0.6, rz: (Math.random() - 0.5) * 0.6 };
      scene.add(m); cells.push(m);
    }
    return { update(dt, t, mo) {
      for (const m of cells) { m.position.x += m.userData.v * dt * 2; m.rotation.x += m.userData.rx * dt; m.rotation.z += m.userData.rz * dt; if (m.position.x > 13) { m.position.x = -13; m.position.y = (Math.random() - 0.5) * 14; } }
    } };
  }

  function buildVirus(THREE, scene) {
    const viruses = [];
    const bodyGeo = new THREE.IcosahedronGeometry(1, 1);
    const spikeGeo = new THREE.CylinderGeometry(0.05, 0.12, 0.55, 5);
    const knobGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xa01620, emissive: 0x4a0810, emissiveIntensity: 0.6, roughness: 0.5, flatShading: true });
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xe23b42, emissive: 0x6a0c12, emissiveIntensity: 0.6, roughness: 0.5 });
    const knobMat = new THREE.MeshStandardMaterial({ color: 0xff8a8a, emissive: 0x9a1018, emissiveIntensity: 0.7, roughness: 0.5 });
    for (let n = 0; n < 4; n++) {
      const v = new THREE.Group(); const sc = 0.9 + Math.random() * 1.3;
      const body = new THREE.Mesh(bodyGeo, bodyMat); v.add(body);
      const dirs = bodyGeo.attributes.position;
      const seen = {};
      for (let i = 0; i < dirs.count; i += 2) {
        const nx = dirs.getX(i), ny = dirs.getY(i), nz = dirs.getZ(i);
        const key = (nx.toFixed(1) + ',' + ny.toFixed(1) + ',' + nz.toFixed(1)); if (seen[key]) continue; seen[key] = 1;
        const dir = new THREE.Vector3(nx, ny, nz).normalize();
        const sp = new THREE.Mesh(spikeGeo, spikeMat); sp.position.copy(dir.clone().multiplyScalar(1.2)); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); v.add(sp);
        const kb = new THREE.Mesh(knobGeo, knobMat); kb.position.copy(dir.clone().multiplyScalar(1.5)); v.add(kb);
      }
      v.scale.setScalar(sc);
      v.position.set((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 11, (Math.random() - 0.5) * 8);
      v.userData = { rx: (Math.random() - 0.5) * 0.5, ry: (Math.random() - 0.5) * 0.5, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.4 };
      scene.add(v); viruses.push(v);
    }
    return { update(dt, t) { for (const v of viruses) { v.rotation.x += v.userData.rx * dt; v.rotation.y += v.userData.ry * dt; v.position.x += v.userData.vx * dt; v.position.y += v.userData.vy * dt; if (v.position.x > 11) v.position.x = -11; if (v.position.x < -11) v.position.x = 11; if (v.position.y > 7) v.position.y = -7; if (v.position.y < -7) v.position.y = 7; } } };
  }

  function buildMolecule(THREE, scene) {
    const g = new THREE.Group(); scene.add(g);
    const atomGeo = new THREE.SphereGeometry(0.6, 18, 18);
    const c = new THREE.MeshStandardMaterial({ color: 0xe23b42, emissive: 0x6a0c12, emissiveIntensity: 0.7, roughness: 0.35 });
    const o = new THREE.MeshStandardMaterial({ color: 0xff8a5a, emissive: 0x7a2010, emissiveIntensity: 0.7, roughness: 0.35 });
    const bondMat = new THREE.MeshStandardMaterial({ color: 0xb9a4a2, emissive: 0x2a1010, roughness: 0.6 });
    const atoms = [new THREE.Vector3(0, 0, 0)];
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; atoms.push(new THREE.Vector3(Math.cos(a) * 3, Math.sin(a) * 3, Math.sin(a * 2) * 0.8)); }
    atoms.forEach((p, i) => { const m = new THREE.Mesh(atomGeo, i % 2 ? o : c); m.position.copy(p); m.scale.setScalar(i === 0 ? 1.1 : 0.85); g.add(m); });
    for (let k = 1; k <= 6; k++) {
      const p1 = atoms[k], p2 = atoms[k % 6 + 1];
      [[atoms[0], p1], [p1, p2]].forEach(([a, b]) => { const mid = a.clone().add(b).multiplyScalar(0.5), dir = b.clone().sub(a), len = dir.length(); const bond = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, len, 6), bondMat); bond.position.copy(mid); bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); g.add(bond); });
    }
    return { update(dt, t, m) { g.rotation.y += dt * 0.5; g.rotation.x += (m.y * 0.3 - g.rotation.x) * 0.04; } };
  }

  const BUILDERS = { dna3d: buildDNA, cells3d: buildCells, virus3d: buildVirus, molecule3d: buildMolecule };
  const live = new Map();

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const host = e.target;
      if (e.isIntersecting) {
        if (!live.has(host)) {
          live.set(host, true);
          ensureThree().then(() => {
            if (!live.get(host)) return;             // left before load finished
            if (!window.THREE) { live.delete(host); return; }
            live.set(host, makeScene(host, BUILDERS[host.dataset.bg]));
          }).catch(() => live.delete(host));
        }
      } else {
        const inst = live.get(host);
        if (inst && inst.destroy) inst.destroy();
        live.delete(host);
      }
    });
  }, { rootMargin: '100px 0px 100px 0px', threshold: 0.01 });

  hosts.forEach(h => io.observe(h));
})();
