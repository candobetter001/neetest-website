// bio3d.js — REAL 3D (WebGL / Three.js) medical hero animation.
//
// A volumetric DNA double helix: two glowing backbone strands of spheres with
// base-pair rungs, real perspective depth, lighting, fog falloff, additive glow
// halos, slow rotation, and mouse parallax. Original recreation of the standard
// "glowing DNA helix" motif — no stock footage used.
//
// Mounts into .section-bg[data-bg="dna3d"]. Skipped on reduced-motion.

(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const host = document.querySelector('.section-bg[data-bg="dna3d"]');
  if (!host) return;

  const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  function load(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

  load(THREE_URL).then(() => { if (window.THREE) boot(window.THREE); }).catch(() => {});

  function boot(THREE) {
    let W = host.clientWidth || window.innerWidth, H = host.clientHeight || 600;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x120708, 0.085);
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 0, 14);

    // Lights
    scene.add(new THREE.AmbientLight(0x551015, 0.8));
    const key = new THREE.PointLight(0xff5a5a, 1.4, 60); key.position.set(8, 10, 14); scene.add(key);
    const rim = new THREE.PointLight(0xff9a6a, 0.9, 60); rim.position.set(-12, -6, 6); scene.add(rim);

    const dna = new THREE.Group();
    scene.add(dna);

    const RUNGS = 30, R = 2.6, STEP = 0.62, TURN = 0.52;
    const coreGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const haloGeo = new THREE.SphereGeometry(0.62, 12, 12);
    const baseGeo = new THREE.SphereGeometry(0.16, 10, 10);
    const matA = new THREE.MeshStandardMaterial({ color: 0xff5a5a, emissive: 0xb01020, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.1 });
    const matB = new THREE.MeshStandardMaterial({ color: 0xff8a5a, emissive: 0x7a0c14, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.1 });
    const matBase = new THREE.MeshStandardMaterial({ color: 0xffb0a0, emissive: 0x9a1018, emissiveIntensity: 0.7, roughness: 0.5 });
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    const rungMat = new THREE.MeshStandardMaterial({ color: 0xe23b42, emissive: 0x5a0a10, emissiveIntensity: 0.5, roughness: 0.6 });

    const totalH = RUNGS * STEP;
    for (let i = 0; i < RUNGS; i++) {
      const y = i * STEP - totalH / 2;
      const a = i * TURN;
      const p1 = new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R);
      const p2 = new THREE.Vector3(Math.cos(a + Math.PI) * R, y, Math.sin(a + Math.PI) * R);

      const s1 = new THREE.Mesh(coreGeo, matA); s1.position.copy(p1); dna.add(s1);
      const s2 = new THREE.Mesh(coreGeo, matB); s2.position.copy(p2); dna.add(s2);
      const h1 = new THREE.Mesh(haloGeo, haloMat); h1.position.copy(p1); dna.add(h1);
      const h2 = new THREE.Mesh(haloGeo, haloMat); h2.position.copy(p2); dna.add(h2);

      // base-pair rung: a thin cylinder between the two backbones + two inner bases
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const dir = p2.clone().sub(p1);
      const len = dir.length();
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 6), rungMat);
      rung.position.copy(mid);
      rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      dna.add(rung);
      const b1 = new THREE.Mesh(baseGeo, matBase); b1.position.copy(p1.clone().lerp(p2, 0.32)); dna.add(b1);
      const b2 = new THREE.Mesh(baseGeo, matBase); b2.position.copy(p1.clone().lerp(p2, 0.68)); dna.add(b2);
    }

    dna.rotation.z = 0.35; // tilt like the clip

    // position the helix toward the right of the hero
    function layout() {
      W = host.clientWidth || window.innerWidth; H = host.clientHeight || 600;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
      // shift helix right by moving the camera left of centre
      camera.position.x = W > 900 ? -4.5 : 0;
      camera.updateProjectionMatrix();
    }
    layout();
    window.addEventListener('resize', layout, { passive: true });

    const mouse = { x: 0, y: 0 };
    (host.closest('section') || document).addEventListener('mousemove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    let last = performance.now(), raf = 0, dead = false;
    function tick(now) {
      if (dead) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      dna.rotation.y += dt * 0.55;
      dna.rotation.x += (mouse.y * 0.25 - dna.rotation.x) * 0.04;
      dna.rotation.z += ((0.35 + mouse.x * 0.15) - dna.rotation.z) * 0.04;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // pause when off-screen / tab hidden
    const io = new IntersectionObserver((es) => {
      es.forEach(e => {
        if (e.isIntersecting && dead === false && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
        else if (!e.isIntersecting) { cancelAnimationFrame(raf); raf = 0; }
      });
    }, { threshold: 0.01 });
    io.observe(host);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } });
  }
})();
