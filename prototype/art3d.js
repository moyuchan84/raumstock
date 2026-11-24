// 라움스톡 3D 일러스트 (three.js). 챕터 표지(미리 렌더링해 img/에 저장)와 홈 화면의 실시간 마켓 시티.
// 팔레트: 남색 바탕, 금색·민트, 한국식 상승=빨강 / 하락=파랑. 그림 안에 글자는 넣지 않음.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const C = { bg: 0x0b1020, ground: 0x10182c, gold: 0xffc83d, mint: 0x2fd3a5, up: 0xff5a5f, down: 0x4c8dff, white: 0xe9eefb, navy: 0x1b2a4d };

// ---------- 무대 ----------
export function makeStage(canvas, w, h, { bg = C.bg, fog = [16, 34], cam = [7, 5.2, 9], look = [0, 1.2, 0], fov = 30, exposure = 1.05, pixelRatio = 1 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.Fog(bg, fog[0], fog[1]);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.6;
  const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 100);
  camera.position.set(...cam);
  camera.lookAt(...look);
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-5, 10, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.radius = 5;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7f9cff, 1.6);
  rim.position.set(7, 5, -7);
  scene.add(rim);
  const warm = new THREE.PointLight(C.gold, 40, 22, 2);
  warm.position.set(4, 5, 5);
  scene.add(warm);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 96), new THREE.MeshStandardMaterial({ color: C.ground, roughness: 0.6, metalness: 0.2 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // 바닥의 은은한 동심원 (깊이감)
  for (let i = 1; i <= 4; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(i * 2.2, i * 2.2 + 0.02, 128), new THREE.MeshBasicMaterial({ color: 0x2a3a64, transparent: true, opacity: 0.5 - i * 0.08 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);
  }
  return { renderer, scene, camera, key, rim, warm, ground, pm };
}

// ---------- 재료 ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, ...o });
const glossy = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, ...o });
const metal = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.22, metalness: 1, ...o });
const glass = (o = {}) => new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.04, metalness: 0, transmission: 1, thickness: 0.35, ior: 1.45, transparent: true, opacity: 1, ...o });
const rbox = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2));
function mesh(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  m.rotation.set(...rot);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------- 소품 ----------
export function coin(r = 0.5) {
  const g = new THREE.Group();
  const gold = metal(C.gold);
  g.add(mesh(new THREE.CylinderGeometry(r, r, r * 0.22, 64), gold));
  g.add(mesh(new THREE.TorusGeometry(r * 0.78, r * 0.05, 12, 64), metal(0xffd76a), [0, r * 0.11, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.TorusGeometry(r * 0.78, r * 0.05, 12, 64), metal(0xffd76a), [0, -r * 0.11, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, r * 0.26, 6), metal(0xe0a92a), [0, 0, 0]));
  return g;
}
export function coinStack(n, x, z, r = 0.5) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const c = coin(r);
    c.position.set(x + Math.sin(i * 1.7) * 0.03, r * 0.11 + i * r * 0.23, z + Math.cos(i * 2.3) * 0.03);
    c.rotation.y = i * 0.4;
    g.add(c);
  }
  return g;
}
export function candle(x, open, close, high, low, color, w = 0.42, z = 0) {
  const g = new THREE.Group();
  const top = Math.max(open, close), bot = Math.min(open, close);
  g.add(mesh(rbox(w, Math.max(0.08, top - bot), w, 0.05), glossy(color, { emissive: color, emissiveIntensity: 0.12 }), [x, (top + bot) / 2, z]));
  g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, high - low, 12), std(color, { roughness: 0.4 }), [x, (high + low) / 2, z]));
  return g;
}
function bankCard() {
  const g = new THREE.Group();
  g.add(mesh(rbox(3.4, 2.15, 0.09, 0.16), glossy(0x1e3a8a, { metalness: 0.3, roughness: 0.3 })));
  g.add(mesh(rbox(3.42, 0.32, 0.1, 0.02), std(0x0f1a33), [0, 0.55, 0]));
  g.add(mesh(rbox(0.52, 0.4, 0.04, 0.06), metal(C.gold), [-1.1, -0.05, 0.06]));
  for (let i = 0; i < 4; i++) g.add(mesh(rbox(0.36, 0.07, 0.03, 0.02), metal(C.white, { roughness: 0.35 }), [-1.1 + i * 0.44, -0.62, 0.05]));
  g.add(mesh(new THREE.CircleGeometry(0.22, 48), std(C.up, { emissive: C.up, emissiveIntensity: 0.2 }), [1.05, -0.62, 0.051]));
  g.add(mesh(new THREE.CircleGeometry(0.22, 48), std(C.gold, { emissive: C.gold, emissiveIntensity: 0.2, transparent: true, opacity: 0.9 }), [1.3, -0.62, 0.052]));
  return g;
}
function magnifier() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.TorusGeometry(0.95, 0.11, 24, 96), metal(C.gold)));
  g.add(mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.06, 64), glass({ attenuationColor: 0xbfe6ff, attenuationDistance: 3 }), [0, 0, 0], [Math.PI / 2, 0, 0]));
  g.add(mesh(rbox(0.26, 1.5, 0.26, 0.1), glossy(0x1a2440), [0, -1.75, 0]));
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.25, 32), metal(C.gold), [0, -1.0, 0]));
  return g;
}
function jar() {
  const g = new THREE.Group();
  const mat = glass({ thickness: 0.15, roughness: 0.02 });
  const jarGeo = new THREE.LatheGeometry([[0, 0], [1.15, 0], [1.25, 0.15], [1.25, 2.0], [1.05, 2.25], [1.05, 2.45]].map(([x, y]) => new THREE.Vector2(x, y)), 96);
  const m = mesh(jarGeo, mat);
  m.material.side = THREE.DoubleSide;
  g.add(m);
  g.add(mesh(new THREE.TorusGeometry(1.06, 0.06, 16, 96), metal(C.gold), [0, 2.45, 0], [Math.PI / 2, 0, 0]));
  return g;
}
function donut(segs, rIn = 1.0, rOut = 2.3) {
  const g = new THREE.Group();
  let a = Math.PI / 2;
  for (const { p, color, h } of segs) {
    const a2 = a - p * Math.PI * 2 + 0.03;
    const s = new THREE.Shape();
    s.absarc(0, 0, rOut, a, a2, true);
    s.absarc(0, 0, rIn, a2, a, false);
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 64 });
    g.add(mesh(geo, glossy(color), [0, 0, 0], [-Math.PI / 2, 0, 0]));
    a = a2 - 0.03;
  }
  return g;
}
function arrowUp(points, color) {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  g.add(mesh(new THREE.TubeGeometry(curve, 160, 0.13, 20, false), glossy(color, { emissive: color, emissiveIntensity: 0.25 })));
  const end = curve.getPoint(1), dir = curve.getTangent(1);
  const head = mesh(new THREE.ConeGeometry(0.34, 0.75, 32), glossy(color, { emissive: color, emissiveIntensity: 0.25 }));
  head.position.copy(end).addScaledVector(dir, 0.25);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  g.add(head);
  return g;
}
function sparkles(n, box, colors, seed = 1) {
  const g = new THREE.Group();
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const m = mesh(rbox(0.12, 0.12, 0.02, 0.02), std(colors[i % colors.length], { emissive: colors[i % colors.length], emissiveIntensity: 0.6 }), [box[0] + r() * box[3], box[1] + r() * box[4], box[2] + r() * box[5]], [r() * 6, r() * 6, r() * 6]);
    m.castShadow = false;
    g.add(m);
  }
  return g;
}
function spotlight(scene, pos, target, color = 0xffffff, intensity = 120) {
  const s = new THREE.SpotLight(color, intensity, 30, Math.PI / 9, 0.6, 1.6);
  s.position.set(...pos);
  s.target.position.set(...target);
  s.castShadow = true;
  s.shadow.mapSize.set(1024, 1024);
  scene.add(s, s.target);
}

// ---------- 챕터 표지 ----------
export const COVERS = {
  c1(st) { // 계좌를 열어요: 카드와 동전 탑
    const card = bankCard();
    card.position.set(-1.3, 1.6, 0.4);
    card.rotation.set(-0.12, 0.55, 0.08);
    st.scene.add(card, coinStack(7, 1.6, 0.6), coinStack(11, 2.6, -0.4), coinStack(4, 2.3, 1.5));
    const c = coin(0.55);
    c.position.set(0.9, 3.4, 1.4);
    c.rotation.set(1.2, 0.3, 0.5);
    st.scene.add(c);
    st.camera.position.set(6.5, 4.2, 8.5);
    st.camera.lookAt(0.6, 1.5, 0);
  },
  c2(st) { // 회사를 조사해요: 재무 막대 위의 돋보기
    [1.0, 1.6, 1.3, 2.3, 2.9].forEach((h, i) => st.scene.add(mesh(rbox(0.7, h, 0.7, 0.08), glossy(i === 4 ? C.mint : 0x2a3f6e), [-2.2 + i * 1.0, h / 2, 0])));
    [0.6, 0.9, 0.7, 1.3, 1.8].forEach((h, i) => st.scene.add(mesh(rbox(0.5, h, 0.5, 0.06), glossy(C.gold), [-2.2 + i * 1.0, h / 2, 0.85])));
    const mg = magnifier();
    mg.position.set(1.3, 2.9, 2.0);
    mg.rotation.set(-0.15, -0.5, -0.5);
    st.scene.add(mg);
    st.camera.position.set(4.5, 4.3, 9.5);
    st.camera.lookAt(0, 1.6, 0.4);
  },
  c3(st) { // 첫 주문: 호가창 계단 (매도 파랑 위, 매수 빨강 아래)
    for (let i = 0; i < 7; i++) {
      const len = 0.8 + ((i * 37) % 7) * 0.32;
      st.scene.add(mesh(rbox(len, 0.26, 0.9, 0.06), glossy(C.down), [-0.2 - len / 2, 2.15 + i * 0.32, 0]));
      const len2 = 0.8 + ((i * 53) % 7) * 0.32;
      st.scene.add(mesh(rbox(len2, 0.26, 0.9, 0.06), glossy(C.up), [0.2 + len2 / 2, 1.85 - i * 0.26 + 0.0, 0]));
    }
    st.scene.add(mesh(rbox(0.12, 4.6, 1.3, 0.05), std(C.gold, { emissive: C.gold, emissiveIntensity: 0.9 }), [0, 2.3, 0]));
    st.camera.position.set(2.2, 3.6, 10.5);
    st.camera.lookAt(0, 2.1, 0);
  },
  c4(st) { // 실적 발표 날: 오르는 캔들과 스포트라이트
    let p = 0.5;
    const steps = [0.25, -0.15, 0.3, 0.2, -0.1, 0.35, 0.25, 1.2];
    steps.forEach((d, i) => {
      const o = p, c = p + d;
      st.scene.add(candle(-3.2 + i * 0.9, o, c, Math.max(o, c) + 0.25, Math.min(o, c) - 0.2, d >= 0 ? C.up : C.down));
      p = c;
    });
    spotlight(st.scene, [3.5, 8, 3], [3.1, 2.5, 0], 0xfff1c9, 260);
    st.scene.add(sparkles(36, [2.0, 2.6, -0.8, 2.4, 2.0, 1.6], [C.gold, C.mint, C.white], 7));
    st.camera.position.set(1.0, 3.8, 11.5);
    st.camera.lookAt(0, 2.0, 0);
  },
  c5(st) { // 배당금 받기: 유리병에 떨어지는 동전
    const j = jar();
    j.position.set(0, 0, 0);
    st.scene.add(j);
    for (let i = 0; i < 9; i++) {
      const c = coin(0.38);
      c.position.set(Math.sin(i * 2.1) * 0.55, 0.12 + i * 0.09, Math.cos(i * 1.7) * 0.5);
      c.rotation.set(Math.sin(i) * 0.4, i, Math.cos(i) * 0.3);
      st.scene.add(c);
    }
    [[0.2, 3.4, 0.1, 1.1], [-0.6, 4.4, 0.4, 0.4], [0.7, 5.3, -0.2, 2.0]].forEach(([x, y, z, r]) => {
      const c = coin(0.42);
      c.position.set(x, y, z);
      c.rotation.set(r, r * 0.6, r * 1.3);
      st.scene.add(c);
    });
    st.scene.add(coinStack(5, 2.4, 0.8), coinStack(3, -2.2, 1.0));
    st.camera.position.set(5, 4.6, 9);
    st.camera.lookAt(0, 2.0, 0);
  },
  c6(st) { // 폭락장: 떨어지는 파란 캔들, 차가운 조명
    st.scene.background = new THREE.Color(0x070b16);
    st.scene.fog = new THREE.Fog(0x070b16, 10, 26);
    st.warm.color.set(0x4c8dff);
    st.warm.intensity = 60;
    st.rim.color.set(0x9fb8ff);
    let p = 4.2;
    [-0.3, -0.5, 0.2, -0.9, -0.6, -1.0, 0.4].forEach((d, i) => {
      const o = p, c = p + d;
      st.scene.add(candle(-3.0 + i * 0.85, o, c, Math.max(o, c) + 0.2, Math.min(o, c) - 0.3, d >= 0 ? C.up : C.down));
      p = c;
    });
    // 넘어진 캔들
    const fallen = candle(0, 0, 1.4, 1.6, -0.1, C.down);
    fallen.position.set(2.0, 0.25, 0.8);
    fallen.rotation.set(0, 0.6, Math.PI / 2);
    st.scene.add(fallen);
    // 번개 모양
    const bolt = new THREE.Shape([[0, 0], [0.5, 0], [0.2, -0.8], [0.7, -0.8], [-0.2, -2.0], [0.05, -1.05], [-0.4, -1.05]].map(([x, y]) => new THREE.Vector2(x, y)));
    const b = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03 }), std(0xdbe6ff, { emissive: 0x9fb8ff, emissiveIntensity: 1.4 }), [2.8, 5.2, -2.0], [0, -0.3, 0.1]);
    b.scale.setScalar(0.85);
    st.scene.add(b);
    st.camera.position.set(1.6, 4.4, 13);
    st.camera.lookAt(0, 2.3, 0);
  },
  c7(st) { // 회복과 세금: 솟아오르는 화살표와 동전
    st.scene.add(arrowUp([[-3.4, 0.6, 0], [-2.2, 1.2, 0.3], [-1.2, 0.8, 0.2], [0, 1.8, 0], [1.2, 2.6, -0.2], [2.4, 4.0, -0.3]], C.up));
    st.scene.add(coinStack(3, -2.2, 1.4), coinStack(6, -0.6, 1.6), coinStack(9, 1.0, 1.5), coinStack(12, 2.6, 1.2));
    // 세금 영수증
    const paper = mesh(rbox(1.5, 2.0, 0.03, 0.04), std(0xf2f5ff, { roughness: 0.7 }), [3.6, 1.05, -1.2], [-0.1, -0.6, 0.05]);
    st.scene.add(paper);
    for (let i = 0; i < 5; i++) st.scene.add(mesh(rbox(i === 4 ? 0.6 : 1.1, 0.06, 0.01, 0.02), std(i === 4 ? C.up : 0x9aa6c4), [3.6 + Math.cos(0.6) * (i === 4 ? 0.22 : 0), 1.6 - i * 0.28, -1.2 + Math.sin(0.6) * 0.03], [-0.1, -0.6, 0.05]));
    st.camera.position.set(3.0, 4.4, 10.5);
    st.camera.lookAt(0.2, 1.9, 0);
  },
  c8(st) { // 자유 투자: 자산배분 도넛
    const d = donut([{ p: 0.4, color: C.up, h: 1.2 }, { p: 0.3, color: C.down, h: 0.8 }, { p: 0.15, color: C.gold, h: 1.0 }, { p: 0.15, color: C.mint, h: 0.6 }]);
    d.rotation.y = 0.4;
    st.scene.add(d);
    const c = coin(0.5);
    c.position.set(0, 1.7, 0);
    c.rotation.set(1.3, 0, 0.3);
    st.scene.add(c, coinStack(6, 3.2, 1.0), coinStack(3, -3.2, 0.6));
    st.camera.position.set(5.5, 6.2, 8.0);
    st.camera.lookAt(0, 0.6, 0);
  },
};

export function renderCover(id, canvas, w = 1200, h = 675) {
  const st = makeStage(canvas, w, h);
  COVERS[id](st);
  st.renderer.render(st.scene, st.camera);
  const url = canvas.toDataURL("image/webp", 0.9);
  st.renderer.dispose();
  st.pm.dispose();
  return url;
}

// ---------- 홈: 실시간 마켓 시티 ----------
// towers: [{ sym, color, cap(시가총액, 달러 10억) }] — 높이는 시가총액의 로그
const CAP_TOP = Math.log10(2500); // 2.5조 달러를 가장 높은 빌딩 기준으로
const towerH = (cap) => 0.9 + Math.max(0, Math.log10(Math.max(cap, 1)) / CAP_TOP) ** 3 * 3.6;
export function mountCity(el, towers) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.createElement("canvas");
  canvas.className = "city-canvas";
  canvas.setAttribute("aria-hidden", "true");
  el.appendChild(canvas);
  const st = makeStage(canvas, el.clientWidth || 400, el.clientHeight || 220, { cam: [6.4, 4.2, 7.4], look: [0, 1.5, 0], fov: 34, fog: [12, 26], pixelRatio: Math.min(devicePixelRatio, 2) });
  const city = new THREE.Group();
  const n = towers.length;
  const bySym = {};
  towers.forEach((t, i) => {
    const a = (i / n) * Math.PI * 2 + 0.3, rad = 2.1;
    const h = 2; // 기준 높이 2로 만들고 scale.y로 실제 높이를 맞춤
    const g = new THREE.Group();
    g.add(mesh(rbox(0.9, h, 0.9, 0.08), glossy(t.color, { roughness: 0.28, metalness: 0.15 }), [0, h / 2, 0]));
    // 세로 창문 줄 (높이가 바뀌어도 자연스럽게 늘어나도록)
    const win = std(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.7, roughness: 0.5 });
    for (const x of [-0.22, 0.22]) for (const [fx, fz, ry] of [[x, 0.46, 0], [x, -0.46, 0], [0.46, x, Math.PI / 2], [-0.46, x, Math.PI / 2]]) {
      const w = mesh(rbox(0.1, h - 0.5, 0.02, 0.02), win, [fx, h / 2, fz], [0, ry, 0]);
      w.castShadow = false;
      g.add(w);
    }
    g.add(mesh(rbox(0.5, 0.12, 0.5, 0.04), metal(C.gold), [0, h + 0.06, 0]));
    g.position.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
    g.userData = { target: towerH(t.cap) / h, now: towerH(t.cap) / h };
    g.scale.y = g.userData.now;
    bySym[t.sym] = g;
    city.add(g);
  });
  st.scene.add(city);
  const c = coin(0.4);
  c.position.set(0, 3.5, 0);
  st.scene.add(c);
  let raf = 0, visible = true;
  const clock = new THREE.Clock();
  function frame() {
    const t = clock.getElapsedTime();
    city.rotation.y = t * 0.12;
    for (const g of city.children) { const u = g.userData; u.now += (u.target - u.now) * 0.06; g.scale.y = u.now; }
    c.rotation.set(Math.PI / 2, 0, t * 1.4);
    c.position.y = 3.5 + Math.sin(t * 1.3) * 0.12;
    st.renderer.render(st.scene, st.camera);
  }
  function loop() { raf = requestAnimationFrame(loop); if (visible && !document.hidden) frame(); }
  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    st.renderer.setSize(w, h, false);
    st.camera.aspect = w / h;
    st.camera.updateProjectionMatrix();
    if (reduce) frame();
  }
  new ResizeObserver(resize).observe(el);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);
  resize();
  if (reduce) frame(); else loop();
  el.classList.add("has-3d");
  return {
    stop: () => cancelAnimationFrame(raf),
    setCaps(caps) { for (const [sym, cap] of Object.entries(caps)) if (bySym[sym]) bySym[sym].userData.target = towerH(cap) / 2; if (reduce) { for (const g of city.children) g.scale.y = g.userData.now = g.userData.target; frame(); } },
  };
}
