// 탐험 지도 3D 장면: 돼지저금통 열기구가 구름 사이를 날고, 시장 계절에 따라
// 꽃잎(봄)·햇빛 반짝이(여름)·낙엽(가을)·눈(겨울)이 떨어집니다.
// three.js를 CDN에서 불러오지 못하면 아무것도 하지 않고, 화면에는 SVG 그림이 그대로 남습니다.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const INK = 0x16223d;
const SEASON_FX = {
  spring: { color: 0xff9bb3, size: [0.16, 0.1], fall: 0.35, sway: 0.6, count: 46 },
  summer: { color: 0xffe08a, size: [0.09, 0.09], fall: -0.12, sway: 0.25, count: 30 },
  autumn: { color: 0xff8a3d, size: [0.18, 0.12], fall: 0.45, sway: 0.9, count: 40 },
  winter: { color: 0xffffff, size: [0.1, 0.1], fall: 0.3, sway: 0.3, count: 70 },
};

function toonRamp() {
  const t = new THREE.DataTexture(new Uint8Array([110, 190, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

function mount(el) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.className = "scene-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  el.appendChild(renderer.domElement);
  el.classList.add("has-3d");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.2, 9);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8ea2c8, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(-4, 5, 6); // 왼쪽 위 광원 (아트 바이블)
  scene.add(sun);

  const ramp = toonRamp();
  const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });
  const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  // 남색 외곽선: 같은 모양을 뒤집어 조금 크게 겹쳐 그려요.
  function part(geo, color, { pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1], line = 0.05 } = {}) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, toon(color));
    g.add(m);
    if (line) {
      const o = new THREE.Mesh(geo, outlineMat);
      o.scale.setScalar(1 + line);
      g.add(o);
    }
    g.position.set(...pos);
    g.rotation.set(...rot);
    g.scale.set(...scale);
    return g;
  }

  // ----- 돼지저금통 열기구 -----
  const pig = new THREE.Group();
  pig.add(part(new THREE.SphereGeometry(1, 40, 28), 0xff9bb3, { scale: [1.18, 1, 1], line: 0.04 }));
  pig.add(part(new THREE.CylinderGeometry(0.32, 0.34, 0.28, 28), 0xff7f9f, { pos: [0, -0.08, 0.98], rot: [Math.PI / 2, 0, 0], line: 0.08 }));
  for (const x of [-0.11, 0.11]) pig.add(part(new THREE.SphereGeometry(0.06, 12, 8), INK, { pos: [x, -0.08, 1.13], line: 0 }));
  for (const x of [-0.38, 0.38]) pig.add(part(new THREE.SphereGeometry(0.08, 12, 8), INK, { pos: [x, 0.28, 0.86], line: 0 }));
  for (const x of [-0.6, 0.6]) pig.add(part(new THREE.ConeGeometry(0.24, 0.42, 16), 0xff9bb3, { pos: [x, 0.86, 0.15], rot: [0, 0, -x * 0.7], line: 0.1 }));
  pig.add(part(new THREE.BoxGeometry(0.5, 0.06, 0.14), INK, { pos: [0, 1.0, -0.05], line: 0 }));
  const basket = part(new THREE.BoxGeometry(0.72, 0.42, 0.72), 0xc98b4f, { pos: [0, -1.85, 0], line: 0.07 });
  pig.add(basket);
  const ropeMat = new THREE.MeshBasicMaterial({ color: INK });
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const from = new THREE.Vector3(x, -1.64, z), to = new THREE.Vector3(x * 2, -0.86, z * 2);
    const len = from.distanceTo(to);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 6), ropeMat);
    rope.position.copy(from).add(to).multiplyScalar(0.5);
    rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
    pig.add(rope);
  }
  // 저금통 주위를 도는 동전
  const coins = [0, 1, 2].map((i) => {
    const c = part(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 24), 0xffc83d, { rot: [Math.PI / 2, 0, 0], line: 0.12 });
    c.userData.phase = (i * Math.PI * 2) / 3;
    pig.add(c);
    return c;
  });
  pig.position.set(1.2, 0.35, 0);
  pig.scale.setScalar(0.9);
  scene.add(pig);

  // ----- 구름 -----
  const cloudMat = new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: ramp, transparent: true, opacity: 0.95 });
  const clouds = Array.from({ length: 6 }, (_, i) => {
    const g = new THREE.Group();
    const n = 3 + (i % 3);
    for (let k = 0; k < n; k++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.35 + Math.random() * 0.25, 18, 12), cloudMat);
      s.position.set(k * 0.45 - n * 0.22, Math.random() * 0.18, Math.random() * 0.2);
      g.add(s);
    }
    g.position.set(-7 + i * 2.6, -1.6 + (i % 3) * 1.4, -2.5 - (i % 2));
    g.userData.speed = 0.15 + (i % 3) * 0.06;
    scene.add(g);
    return g;
  });

  // ----- 계절 입자 -----
  let fx = null, fxCfg = null, season = null;
  function setSeason(id) {
    if (id === season || !SEASON_FX[id]) return;
    season = id;
    fxCfg = SEASON_FX[id];
    if (fx) { scene.remove(fx); fx.children.forEach((m) => m.geometry.dispose()); }
    fx = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: fxCfg.color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    for (let i = 0; i < fxCfg.count; i++) {
      const geo = id === "winter" || id === "summer" ? new THREE.CircleGeometry(fxCfg.size[0], 10) : new THREE.PlaneGeometry(...fxCfg.size);
      const m = new THREE.Mesh(geo, mat);
      m.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, -1 + Math.random() * 2.5);
      m.userData = { seed: Math.random() * 10, spin: (Math.random() - 0.5) * 3 };
      fx.add(m);
    }
    scene.add(fx);
    if (reduce) draw(0);
  }

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // 좁은 화면에서는 열기구가 가운데 오도록
    pig.position.x = w / h < 1.6 ? 0 : 1.2;
    camera.updateProjectionMatrix();
    if (reduce) draw(0);
  }

  function draw(t) {
    pig.position.y = 0.35 + Math.sin(t * 1.1) * 0.15;
    pig.rotation.y = Math.sin(t * 0.4) * 0.45;
    pig.rotation.z = Math.sin(t * 0.8) * 0.04;
    coins.forEach((c) => {
      const a = t * 1.2 + c.userData.phase;
      c.position.set(Math.cos(a) * 1.75, 0.1 + Math.sin(a * 2) * 0.2, Math.sin(a) * 1.2);
      c.rotation.z = a * 2;
    });
    clouds.forEach((g) => {
      g.position.x += g.userData.speed * 0.016;
      if (g.position.x > 8) g.position.x = -8;
    });
    if (fx) {
      fx.children.forEach((m) => {
        const u = m.userData;
        m.position.y -= fxCfg.fall * 0.016;
        m.position.x += Math.sin(t + u.seed) * fxCfg.sway * 0.01;
        m.rotation.set(t * u.spin * 0.5, t * u.spin, 0);
        if (m.position.y < -3.2) m.position.y = 3.2;
        if (m.position.y > 3.2) m.position.y = -3.2;
      });
    }
    renderer.render(scene, camera);
  }

  let visible = true, raf = 0;
  const clock = new THREE.Clock();
  function loop() {
    raf = requestAnimationFrame(loop);
    if (visible && !document.hidden) draw(clock.getElapsedTime());
  }
  new ResizeObserver(resize).observe(el);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);
  resize();
  if (reduce) draw(0);
  else loop();
  return { setSeason, stop: () => cancelAnimationFrame(raf) };
}

let inst = null;
window.RAUM_3D = {
  mount(el) {
    if (inst) return inst;
    try {
      inst = mount(el);
    } catch (e) {
      console.warn("[raum3d] 3D를 켤 수 없어 그림으로 보여줘요:", e);
      inst = { setSeason() {} };
    }
    return inst;
  },
  setSeason: (id) => inst?.setSeason(id),
};
window.dispatchEvent(new Event("raum3d-ready"));
