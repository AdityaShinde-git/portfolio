/*
 * rallyScene.js — a small real 3D world for the case-study film: a rally car on a dusk gravel stage.
 *
 * The whole scene is a pure function of film time, render(tf): the car, wheels, camera, dust and lights are all
 * computed from `tf`, nothing is stepped. So a dropped frame never changes the film, previews can jump to any
 * moment, and the dust (born on a fixed schedule, positioned in closed form) is always where it should be.
 *
 * Five camera set-ups of five seconds each (a cut every shot):
 *   0 low front tracking   — lens a hand's width off the gravel, car closing from ahead
 *   1 roadside pass        — a locked-off long lens that whips round as the car blasts by
 *   2 wheel run            — wheel-height, sliding from the front wheel back to the rear, gravel in the air
 *   3 drone                — high, sweeping across behind the car so the road and the dust trail read
 *   4 rear chase           — behind the car as it hangs the tail out, dust boiling into the low sun
 */
import * as THREE from 'three';

export const FILM = 25;          // seconds, five shots of five
export const SHOT_LEN = 5;
const SPEED = 31;                // m/s along the stage
const S0 = 40;                   // distance already driven at film time 0
const ROAD_HALF = 3.3;
const UP = new THREE.Vector3(0, 1, 0);

const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const ease = x => { x = clamp01(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
const mix = (a, b, t) => a + (b - a) * t;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

// ---- the stage ----------------------------------------------------------------------------------------------
const roadX = s => 38 * Math.sin(s / 140) + 14 * Math.sin(s / 57 + 1.3);
const roadDX = s => (38 / 140) * Math.cos(s / 140) + (14 / 57) * Math.cos(s / 57 + 1.3);

/* Car state at film time t (valid for slightly negative t too: dust born "before" the film starts). */
function carAt(t, o = {}) {
  const s = S0 + SPEED * t;
  const fx = roadDX(s), fz = -1, fl = Math.hypot(fx, fz);
  const rfx = fx / fl, rfz = fz / fl;                       // road forward
  const rrx = -rfz, rrz = rfx;                              // road right
  const weave = 0.8 * Math.sin(t * 0.9) + 0.35 * Math.sin(t * 2.3 + 1.0);
  const u = clamp01((t - 19.7) / 4.7);
  const slip = 0.05 * Math.sin(t * 1.3 + 0.5) + 0.035 * Math.sin(t * 3.1) - 0.27 * Math.sin(Math.PI * u) * (0.75 + 0.25 * Math.cos(u * 6));
  const roadYaw = Math.atan2(rfx, rfz);
  const yaw = roadYaw + slip;
  o.x = roadX(s) + rrx * weave;
  o.z = -s + rrz * weave;
  o.yaw = yaw;
  o.slip = slip;
  o.roadYaw = roadYaw;
  o.dist = s;
  o.fx = Math.sin(yaw); o.fz = Math.cos(yaw);              // body forward
  o.rx = -o.fz; o.rz = o.fx;                                // body right
  o.pitch = 0.012 * Math.sin(t * 3.7) + 0.006 * Math.sin(t * 9.1);
  o.roll = 0.03 * Math.sin(t * 1.9) - slip * 0.13 + 0.008 * Math.sin(t * 7.3);
  o.steer = Math.max(-0.5, Math.min(0.5, -slip * 1.5 + 0.05 * Math.sin(t * 2.3)));
  return o;
}

// ---- helpers for building ---------------------------------------------------------------------------------
function canvasTex(w, h, draw, { repeat = false, srgb = true, aniso = 4, renderer } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c);
  if (srgb) tx.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; }
  tx.anisotropy = Math.min(aniso, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  return tx;
}

function mergeGeos(list) {
  let vc = 0, ic = 0;
  const parts = list.map(g => { g = g.index ? g : g; vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; return g; });
  const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), idx = new Uint32Array(ic);
  let vo = 0, io = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    const n = g.attributes.position.count;
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io++] = g.index.array[i] + vo;
    else for (let i = 0; i < n; i++) idx[io++] = vo + i;
    vo += n;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// extrude a side profile (x = length along the car, y = height) across the car's width, centred, nose to +z
function sideBody(points, width, bevel, bevelOff) {
  const sh = new THREE.Shape();
  points.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1])));
  const depth = Math.max(0.01, width - 2 * bevel.t);
  const g = new THREE.ExtrudeGeometry(sh, {
    depth, bevelEnabled: true, bevelThickness: bevel.t, bevelSize: bevel.s, bevelOffset: bevelOff,
    bevelSegments: 4, curveSegments: 1, steps: 1
  });
  g.rotateY(-Math.PI / 2);
  g.translate(depth / 2, 0, 0);
  g.computeBoundingBox();
  return g;
}

function glowTex() {
  return canvasTex(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,.55)');
    g.addColorStop(0.5, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }, { srgb: false });
}

// ---- shaders ---------------------------------------------------------------------------------------------
const SKY_V = /* glsl */ `
  varying vec3 vDir;
  void main() { vDir = position; vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }
`;
const SKY_F = /* glsl */ `
  precision highp float;
  varying vec3 vDir;
  uniform vec3 uTop, uMid, uHor, uGround, uSun, uSunDir;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHor, uMid, smoothstep(0.0, 0.22, h));
    col = mix(col, uTop, smoothstep(0.14, 0.85, h));
    col = mix(col, uGround, smoothstep(0.0, -0.1, h));
    float sd = max(dot(d, uSunDir), 0.0);
    // thin streaky cloud banks, lit from below near the sun
    vec2 cp = d.xz / (abs(h) + 0.16) * vec2(0.9, 2.6);
    float cl = vn(cp * 1.1) * 0.6 + vn(cp * 2.6 + 4.0) * 0.4;
    cl = smoothstep(0.52, 0.85, cl) * smoothstep(0.02, 0.2, h) * (1.0 - smoothstep(0.5, 0.9, h));
    col = mix(col, uHor * 0.55 + uSun * pow(sd, 3.0) * 0.5, cl * 0.6);
    col += uSun * (pow(sd, 5.0) * 0.32 + pow(sd, 40.0) * 0.8 + pow(sd, 900.0) * 7.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const DUST_V = /* glsl */ `
  attribute vec4 aP; attribute vec4 aA;
  uniform vec3 uSunDir;
  varying vec2 vUv; varying vec4 vA; varying float vGlow; varying float vDist;
  void main() {
    vec4 mv = viewMatrix * vec4(aP.xyz, 1.0);
    float c = cos(aA.y), s = sin(aA.y);
    vec2 q = position.xy * aP.w;
    mv.xy += vec2(c * q.x - s * q.y, s * q.x + c * q.y);
    gl_Position = projectionMatrix * mv;
    vUv = uv; vA = aA; vDist = -mv.z;
    vec3 vd = normalize(aP.xyz - cameraPosition);
    vGlow = pow(max(dot(vd, uSunDir), 0.0), 3.0);
  }
`;
const DUST_F = /* glsl */ `
  precision highp float;
  varying vec2 vUv; varying vec4 vA; varying float vGlow; varying float vDist;
  uniform vec3 uSunC, uDustC, uFogC; uniform float uFogD;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float age = vA.x, kind = vA.w;
    vec3 col; float a;
    if (kind > 0.5) {              // gravel fleck: a crisp little glint
      a = smoothstep(1.0, 0.55, r) * (1.0 - age * age);
      col = mix(vec3(0.30, 0.22, 0.15), uSunC * 1.6, 0.35 + vGlow * 0.65);
    } else {                        // dust puff
      float n = vn(p * 2.6 + vA.z * 31.0) * 0.55 + vn(p * 5.5 - vA.z * 17.0) * 0.45;
      float shape = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.7);
      a = shape * (1.0 - age) * (1.0 - age) * smoothstep(0.0, 0.07, age) * 0.5;
      col = mix(uDustC, uSunC * 1.25, vGlow * 0.85);
      col *= 0.8 + 0.4 * n;
    }
    float fog = 1.0 - exp(-uFogD * uFogD * vDist * vDist);
    col = mix(col, uFogC, fog * 0.7);
    gl_FragColor = vec4(col, a);
  }
`;

const BEAM_V = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vT;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vT = clamp(position.z / 36.0, 0.0, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const BEAM_F = /* glsl */ `
  precision highp float;
  varying vec3 vN; varying vec3 vV; varying float vT;
  uniform float uI;
  void main() {
    float f = pow(abs(dot(normalize(vN), normalize(vV))), 2.2);
    float a = f * pow(1.0 - vT, 1.6) * smoothstep(0.0, 0.04, vT) * 0.16 * uI;
    gl_FragColor = vec4(vec3(1.0, 0.86, 0.66) * a, a);
  }
`;

// ---------------------------------------------------------------------------------------------------------------
const cache = new WeakMap();
export function getRally(renderer) {
  let r = cache.get(renderer);
  if (!r) { r = buildRally(renderer); cache.set(renderer, r); }
  r.refs++;
  return r;
}

function buildRally(renderer) {
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.12, 2600);
  const prevCam = new THREE.PerspectiveCamera(50, 1.6, 0.12, 2600);
  const rt = new THREE.WebGLRenderTarget(832, 520, {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: true, generateMipmaps: false
  });
  rt.texture.colorSpace = THREE.NoColorSpace;

  const sunDir = new THREE.Vector3(-0.34, 0.115, -0.93).normalize();
  const palette = {
    top: new THREE.Color(0.010, 0.026, 0.062), mid: new THREE.Color(0.045, 0.085, 0.14),
    hor: new THREE.Color(0.62, 0.27, 0.12), ground: new THREE.Color(0.10, 0.06, 0.045),
    sun: new THREE.Color(1.0, 0.58, 0.30), fog: new THREE.Color(0.25, 0.145, 0.095)
  };
  scene.fog = new THREE.FogExp2(palette.fog, 0.0036);

  // sky + ridges follow the camera so they sit at infinity
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: palette.top }, uMid: { value: palette.mid }, uHor: { value: palette.hor.clone() },
      uGround: { value: palette.ground }, uSun: { value: palette.sun.clone() }, uSunDir: { value: sunDir }
    }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);

  const ridgeGroup = new THREE.Group();
  const mkRidge = (R, base, amp, seed, col) => {
    const N = 120, pos = [], colr = [], idx = [];
    const top = new THREE.Color(col), foot = new THREE.Color(palette.fog).multiplyScalar(1.15);
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const hgt = base + amp * (Math.sin(a * 5 + seed) * 0.5 + Math.sin(a * 11 + seed * 2.3) * 0.3 + Math.sin(a * 23 + seed * 4.1) * 0.2 + 0.6);
      pos.push(Math.cos(a) * R, -20, Math.sin(a) * R, Math.cos(a) * R, hgt, Math.sin(a) * R);
      colr.push(foot.r, foot.g, foot.b, top.r, top.g, top.b);
      if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false }));
    m.frustumCulled = false;
    return m;
  };
  ridgeGroup.add(mkRidge(820, 30, 70, 1.7, 0x2a2429), mkRidge(640, 18, 48, 4.2, 0x1b1a1d));
  scene.add(ridgeGroup);

  // light
  const sun = new THREE.DirectionalLight(0xffb27a, 5.0);
  sun.position.copy(sunDir).multiplyScalar(200);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x7d9cc6, 0x6a4630, 2.6);
  scene.add(hemi);

  // reflections for the paint and glass: the same sky, baked once
  let envTex = null;
  const bakeEnv = () => {
    if (envTex) return;
    const es = new THREE.Scene();
    const em = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat);
    es.add(em);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(40, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.6, 1.1), side: THREE.DoubleSide }));
    strip.position.set(-14, 9, -26); strip.lookAt(0, 0, 0);
    es.add(strip);
    const pm = new THREE.PMREMGenerator(renderer);
    envTex = pm.fromScene(es, 0.02, 0.1, 100).texture;
    pm.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.9;
  };

  // ---- ground and road ------------------------------------------------------------------------------------
  const groundTex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = 'rgb(104,88,62)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * w, y = Math.random() * h, rr = 2 + Math.random() * 16, v = 60 + Math.random() * 60;
      c.fillStyle = `rgba(${v + 20},${v + 12},${v - 4},${0.06 + Math.random() * 0.1})`;
      for (const ox of [0, -w, w]) for (const oy of [0, -h, h]) { c.beginPath(); c.arc(x + ox, y + oy, rr, 0, 7); c.fill(); }
    }
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      c.strokeStyle = `rgba(${70 + Math.random() * 40},${64 + Math.random() * 30},${30},${0.18 + Math.random() * 0.2})`;
      c.lineWidth = 1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 6, y - 4 - Math.random() * 8); c.stroke();
    }
  }, { repeat: true, renderer, aniso: 8 });
  groundTex.repeat.set(70, 70);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1700, 1700), new THREE.MeshStandardMaterial({ map: groundTex, bumpMap: groundTex, bumpScale: 2.2, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -520);
  scene.add(ground);

  const roadTex = canvasTex(256, 512, (c, w, h) => {
    c.fillStyle = 'rgb(168,134,98)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * w, y = Math.random() * h, v = Math.random();
      c.fillStyle = v > 0.5 ? `rgba(190,160,120,${0.12 + Math.random() * 0.2})` : `rgba(60,42,28,${0.12 + Math.random() * 0.22})`;
      const s = 1 + Math.random() * 3;
      for (const oy of [0, -h, h]) c.fillRect(x, y + oy, s, s * (1 + Math.random() * 2));
    }
    for (const u of [0.31, 0.69]) {            // tyre ruts
      const g = c.createLinearGradient((u - 0.1) * w, 0, (u + 0.1) * w, 0);
      g.addColorStop(0, 'rgba(40,28,20,0)'); g.addColorStop(0.5, 'rgba(40,28,20,.55)'); g.addColorStop(1, 'rgba(40,28,20,0)');
      c.fillStyle = g; c.fillRect((u - 0.1) * w, 0, 0.2 * w, h);
    }
    const mid = c.createLinearGradient(0.4 * w, 0, 0.6 * w, 0);   // loose gravel ridge between the ruts
    mid.addColorStop(0, 'rgba(200,170,130,0)'); mid.addColorStop(0.5, 'rgba(200,170,130,.2)'); mid.addColorStop(1, 'rgba(200,170,130,0)');
    c.fillStyle = mid; c.fillRect(0.4 * w, 0, 0.2 * w, h);
    // soft verge: fade the road into the ground
    const img = c.getImageData(0, 0, w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = x / w, e = Math.min(u, 1 - u), a = Math.min(1, e / 0.16);
      d[(y * w + x) * 4 + 3] = Math.round(255 * a * a * (3 - 2 * a) * 0.97);
    }
    c.putImageData(img, 0, 0);
  }, { repeat: true, renderer, aniso: 8 });
  roadTex.wrapS = THREE.ClampToEdgeWrapping;
  {
    const pos = [], uv = [], idx = [];
    const S_A = -160, S_B = 1100, STEP = 2.5, n = Math.round((S_B - S_A) / STEP);
    for (let i = 0; i <= n; i++) {
      const s = S_A + i * STEP, fx = roadDX(s), l = Math.hypot(fx, 1), rx = 1 / l, rz = fx / l;
      const cx = roadX(s), cz = -s, hw = ROAD_HALF + 0.5;
      pos.push(cx - rx * hw, 0.015, cz - rz * hw, cx + rx * hw, 0.015, cz + rz * hw);
      uv.push(0, s / 12, 1, s / 12);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const road = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
      map: roadTex, bumpMap: roadTex, bumpScale: 3, roughness: 0.95, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
    road.renderOrder = -2;
    scene.add(road);
  }

  // trees, bushes and marker posts
  {
    const cones = [];
    [[2.3, 4.2, 2.6], [1.8, 3.6, 4.7], [1.25, 3.2, 6.6]].forEach(([r, h, y]) => {
      const g = new THREE.ConeGeometry(r, h, 8, 1); g.translate(0, y, 0); cones.push(g);
    });
    const trunk = new THREE.CylinderGeometry(0.16, 0.22, 2.0, 5); trunk.translate(0, 1.0, 0); cones.push(trunk);
    const tg = mergeGeos(cones);
    const trees = [];
    for (let s = -60; s < 1080; s += 4.6) for (const side of [-1, 1]) {
      const k = Math.round(s * 10 + side * 3);
      const n = 1 + Math.floor(hash(k) * 2.2);
      for (let j = 0; j < n; j++) {
        const lat = 8.5 + Math.pow(hash(k + j * 13 + 1), 1.6) * 110;
        trees.push([roadX(s) + side * lat, -s + (hash(k + j * 7 + 3) - 0.5) * 6, 0.8 + hash(k + j * 5 + 9) * 1.0, hash(k + j * 3 + 5)]);
      }
    }
    const im = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), trees.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), col = new THREE.Color();
    trees.forEach((t, i) => {
      q.setFromAxisAngle(UP, t[3] * 6.28);
      sc.set(t[2] * (0.8 + t[3] * 0.35), t[2], t[2] * (0.8 + t[3] * 0.35));
      m4.compose(new THREE.Vector3(t[0], 0, t[1]), q, sc);
      im.setMatrixAt(i, m4);
      col.setRGB(0.05 + t[3] * 0.05, 0.085 + t[3] * 0.06, 0.07 + t[3] * 0.03);
      im.setColorAt(i, col);
    });
    im.frustumCulled = false;
    scene.add(im);

    const bush = new THREE.IcosahedronGeometry(0.55, 1); bush.translate(0, 0.28, 0);
    const bushes = [];
    for (let s = -40; s < 1070; s += 3.4) for (const side of [-1, 1]) {
      const k = Math.round(s * 7 + side * 11);
      if (hash(k) > 0.8) continue;
      bushes.push([roadX(s) + side * (8.2 + hash(k + 1) * 8), -s + hash(k + 2) * 3, 0.6 + hash(k + 3) * 1.2, hash(k + 4)]);
    }
    const bm = new THREE.InstancedMesh(bush, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), bushes.length);
    bushes.forEach((t, i) => {
      sc.set(t[2] * 1.4, t[2] * 0.8, t[2] * 1.2);
      m4.compose(new THREE.Vector3(t[0], 0, t[1]), q.setFromAxisAngle(UP, t[3] * 6.28), sc);
      bm.setMatrixAt(i, m4);
      col.setRGB(0.12 + t[3] * 0.08, 0.1 + t[3] * 0.06, 0.05 + t[3] * 0.03);
      bm.setColorAt(i, col);
    });
    bm.frustumCulled = false;
    scene.add(bm);

    const postG = new THREE.CylinderGeometry(0.035, 0.045, 1.25, 6); postG.translate(0, 0.62, 0);
    const posts = [];
    for (let s = -40; s < 1070; s += 11) for (const side of [-1, 1]) posts.push([roadX(s + 0) + side * (ROAD_HALF + 0.9) + (roadDX(s) * -0.0), -s, side]);
    const pm = new THREE.InstancedMesh(postG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, emissive: 0x331a08 }), posts.length);
    posts.forEach((t, i) => {
      m4.compose(new THREE.Vector3(t[0], 0, t[1]), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      pm.setMatrixAt(i, m4);
      col.setRGB(i % 2 ? 0.9 : 0.9, i % 2 ? 0.55 : 0.86, i % 2 ? 0.2 : 0.78);
      pm.setColorAt(i, col);
    });
    pm.frustumCulled = false;
    scene.add(pm);
  }

  // ---- the car --------------------------------------------------------------------------------------------
  const carRoot = new THREE.Group();     // position + yaw
  const carBody = new THREE.Group();     // pitch + roll
  carRoot.add(carBody);
  scene.add(carRoot);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x15171b, metalness: 0.6, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.5 });
  const livery = new THREE.MeshPhysicalMaterial({ color: 0x1fb6aa, metalness: 0.2, roughness: 0.45, clearcoat: 0.6, emissive: 0x000000 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x020305, metalness: 0.2, roughness: 0.06, clearcoat: 1, envMapIntensity: 2.2 });
  const black = new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.7, metalness: 0.2 });
  const carbon = new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.45, metalness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.95, metalness: 0 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 0.28, metalness: 0.95 });
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.3, 1.8) });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 0.12, 0.06) });
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = carBody) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };

  const lower = sideBody([[-2.0, 0.36], [-2.03, 0.93], [-1.5, 1.0], [1.1, 0.97], [1.98, 0.8], [2.09, 0.58], [2.05, 0.36]], 1.8, { t: 0.14, s: 0.12 }, -0.12);
  add(lower, paint);
  const stripeG = sideBody([[-2.0, 0.36], [-2.03, 0.93], [-1.5, 1.0], [1.1, 0.97], [1.98, 0.8], [2.09, 0.58], [2.05, 0.36]], 0.52, { t: 0.1, s: 0.1 }, -0.1);
  const stripe = add(stripeG, livery); stripe.scale.set(1, 1.012, 1.004);
  const cabin = sideBody([[-1.62, 0.99], [-0.95, 1.36], [0.5, 1.36], [1.1, 0.97]], 1.34, { t: 0.07, s: 0.06 }, -0.06);
  add(cabin, glass);
  const roof = sideBody([[-1.0, 1.34], [0.55, 1.34], [0.5, 1.425], [-0.95, 1.425]], 1.34, { t: 0.06, s: 0.04 }, -0.04);
  add(roof, paint);
  const roofStripe = sideBody([[-1.0, 1.34], [0.55, 1.34], [0.5, 1.425], [-0.95, 1.425]], 0.42, { t: 0.04, s: 0.03 }, -0.03);
  add(roofStripe, livery).scale.set(1, 1.02, 1.006);
  for (const sx of [-1, 1]) {                                    // pillars and sills
    add(new THREE.BoxGeometry(0.07, 0.42, 0.08), paint, sx * 0.68, 1.17, -0.34);
    add(new THREE.BoxGeometry(0.04, 0.05, 3.5), livery, sx * 0.905, 0.5, 0.0);
    add(new THREE.BoxGeometry(0.035, 0.04, 3.3), black, sx * 0.9, 0.33, 0.0);
  }
  // intake scoop, bonnet vents, splitter, wing
  add(new THREE.BoxGeometry(0.34, 0.12, 0.42), black, 0, 1.46, 0.0);
  add(new THREE.BoxGeometry(0.5, 0.012, 0.38), black, 0, 0.985, 1.55);
  add(new THREE.BoxGeometry(1.96, 0.045, 0.45), carbon, 0, 0.275, 2.1);
  add(new THREE.BoxGeometry(1.7, 0.035, 0.42), carbon, 0, 1.36, -2.0);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.03, 0.3, 0.46), carbon, sx * 0.86, 1.28, -2.0);
    add(new THREE.BoxGeometry(0.05, 0.34, 0.05), carbon, sx * 0.5, 1.16, -1.92);
  }
  // lights
  const lampGeo = new THREE.CircleGeometry(0.095, 20);
  const lamps = [];
  for (const x of [-0.62, -0.31, 0.31, 0.62]) {
    const m = add(lampGeo, lampMat, x, 0.6, 2.105);
    add(new THREE.RingGeometry(0.095, 0.125, 20), black, x, 0.6, 2.103);
    lamps.push([x, 0.6, 2.12]);
  }
  for (const sx of [-1, 1]) {
    add(new THREE.PlaneGeometry(0.34, 0.07), lampMat, sx * 0.62, 0.76, 2.07).rotation.y = 0;
    add(new THREE.PlaneGeometry(0.56, 0.07), tailMat, sx * 0.58, 0.86, -2.045).rotation.y = Math.PI;
  }
  // door numbers
  const numTex = canvasTex(128, 128, () => {}, {});
  const numMat = new THREE.MeshStandardMaterial({ map: numTex, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const d = add(new THREE.CircleGeometry(0.27, 32), numMat, sx * 0.907, 0.68, 0.2);
    d.rotation.y = sx * Math.PI / 2;
  }
  const drawNum = (n, hex) => {
    const c = numTex.image.getContext('2d');
    c.clearRect(0, 0, 128, 128);
    c.fillStyle = '#eef0f2'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
    c.fillStyle = hex; c.font = '800 78px "Chakra Petch", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(String(n), 64, 70);
    numTex.needsUpdate = true;
  };
  // wheels
  const wheels = [];
  const tireG = new THREE.CylinderGeometry(0.37, 0.37, 0.27, 32); tireG.rotateZ(Math.PI / 2);
  const discG = new THREE.CylinderGeometry(0.245, 0.245, 0.285, 28); discG.rotateZ(Math.PI / 2);
  const spokeG = new THREE.BoxGeometry(0.295, 0.46, 0.05);
  const nutG = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8); nutG.rotateZ(Math.PI / 2);
  const wheelDefs = [[-0.87, 1.3, true], [0.87, 1.3, true], [-0.87, -1.22, false], [0.87, -1.22, false]];
  for (const [x, z, front] of wheelDefs) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.37, z); carBody.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    add(tireG, rubber, 0, 0, 0, spin);
    add(discG, black, 0, 0, 0, spin);
    for (let i = 0; i < 3; i++) { const s = add(spokeG, alloy, 0, 0, 0, spin); s.rotation.x = i * Math.PI / 3; }
    add(nutG, alloy, 0, 0, 0, spin);
    // flare over the wheel
    const fl = add(new THREE.TorusGeometry(0.45, 0.05, 6, 24, Math.PI), black, Math.sign(x) * 0.9, 0.37, z, carBody);
    fl.rotation.y = Math.PI / 2;
    wheels.push({ pivot, spin, front });
  }
  // blob shadow + headlight beams + glow sprites
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5.6), new THREE.MeshBasicMaterial({
    map: canvasTex(128, 256, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, h / 2);
      g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.55, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.save(); c.translate(w / 2, h / 2); c.scale(0.5, 1); c.translate(-w / 2, -h / 2); c.fillRect(-w, 0, w * 3, h); c.restore();
    }, { srgb: false }), transparent: true, depthWrite: false
  }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.03; blob.renderOrder = -1;
  carRoot.add(blob);

  const spots = [];
  for (const sx of [-1, 1]) {
    const sp = new THREE.SpotLight(0xffe2b8, 90, 80, 0.4, 0.9, 1.6);
    sp.position.set(sx * 0.62, 0.76, 2.35);
    sp.target.position.set(sx * 1.6, 0.2, 26);
    carBody.add(sp); carBody.add(sp.target);
    spots.push(sp);
  }
  const beamGeo = new THREE.ConeGeometry(3.3, 36, 24, 1, true); beamGeo.translate(0, -18, 0); beamGeo.rotateX(-Math.PI / 2);
  const beamMat = new THREE.ShaderMaterial({ vertexShader: BEAM_V, fragmentShader: BEAM_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uI: { value: 1 } }, fog: false });
  const beams = [-1, 1].map(sx => { const b = add(beamGeo, beamMat, sx * 0.62, 0.76, 2.08); b.rotation.y = sx * -0.03; b.renderOrder = 5; return b; });

  const gTex = glowTex();
  const mkGlow = (color, size) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
    s.scale.set(size, size, 1); s.renderOrder = 6; carBody.add(s); return s;
  };
  const glows = [
    { s: mkGlow(new THREE.Color(1.6, 1.3, 0.95), 1.5), p: [-0.62, 0.76, 2.2], dir: 1, big: 1 },
    { s: mkGlow(new THREE.Color(1.6, 1.3, 0.95), 1.5), p: [0.62, 0.76, 2.2], dir: 1, big: 1 },
    ...lamps.map(l => ({ s: mkGlow(new THREE.Color(1.2, 1.0, 0.75), 0.9), p: l, dir: 1, big: 0.8 })),
    { s: mkGlow(new THREE.Color(1.5, 0.12, 0.05), 1.4), p: [-0.58, 0.86, -2.15], dir: -1, big: 1 },
    { s: mkGlow(new THREE.Color(1.5, 0.12, 0.05), 1.4), p: [0.58, 0.86, -2.15], dir: -1, big: 1 }
  ];
  glows.forEach(g => g.s.position.set(...g.p));

  // ---- dust ---------------------------------------------------------------------------------------------
  const MAXP = 900;
  const dustGeo = new THREE.InstancedBufferGeometry();
  { const q = new THREE.PlaneGeometry(1, 1); dustGeo.index = q.index; dustGeo.setAttribute('position', q.attributes.position); dustGeo.setAttribute('uv', q.attributes.uv); }
  const aP = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4); aP.setUsage(THREE.DynamicDrawUsage);
  const aA = new THREE.InstancedBufferAttribute(new Float32Array(MAXP * 4), 4); aA.setUsage(THREE.DynamicDrawUsage);
  dustGeo.setAttribute('aP', aP); dustGeo.setAttribute('aA', aA);
  dustGeo.instanceCount = 0;
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_V, fragmentShader: DUST_F, transparent: true, depthWrite: false, fog: false,
    uniforms: {
      uSunDir: { value: sunDir }, uSunC: { value: new THREE.Color(1.0, 0.62, 0.36) },
      uDustC: { value: new THREE.Color(0.2, 0.15, 0.115) }, uFogC: { value: palette.fog.clone() }, uFogD: { value: 0.0036 }
    }
  });
  const dust = new THREE.Mesh(dustGeo, dustMat);
  dust.frustumCulled = false; dust.renderOrder = 4;
  scene.add(dust);

  const tmpC = {};
  const emitters = [
    // [wheel x, wheel z, rate/s, kind]
    [-0.87, -1.22, 52, 0], [0.87, -1.22, 52, 0], [-0.87, 1.3, 16, 0], [0.87, 1.3, 16, 0],
    [-0.87, -1.22, 36, 1], [0.87, -1.22, 36, 1]
  ];
  function updateDust(tf) {
    let n = 0;
    for (let e = 0; e < emitters.length && n < MAXP - 1; e++) {
      const [wx, wz, rate, kind] = emitters[e];
      const maxLife = kind ? 1.1 : 3.6;
      const j0 = Math.ceil((tf - maxLife) * rate), j1 = Math.floor(tf * rate);
      for (let j = j0; j <= j1 && n < MAXP; j++) {
        const seed = j * 1.37 + e * 911.3;
        const life = kind ? 0.6 + hash(seed + 1) * 0.5 : 2.2 + hash(seed + 1) * 1.4;
        const tb = j / rate + hash(seed + 2) * 0.01;
        const age = tf - tb;
        if (age < 0 || age > life) continue;
        const c = carAt(tb, tmpC);
        const rx = (hash(seed + 3) - 0.5) * 0.3, rz = (hash(seed + 4) - 0.5) * 0.4;
        const px = c.x + c.rx * (wx + rx) + c.fx * (wz + rz), pz = c.z + c.rz * (wx + rx) + c.fz * (wz + rz);
        const side = Math.sign(wx) || 1;
        let x, y, z, size;
        if (kind) {
          const back = 3 + hash(seed + 5) * 9, up = 2.2 + hash(seed + 6) * 3.6, lat = (hash(seed + 7) - 0.3) * 6 * side;
          x = px - c.fx * back * age + c.rx * lat * age; z = pz - c.fz * back * age + c.rz * lat * age;
          y = 0.1 + up * age - 4.9 * age * age; if (y < 0.03) y = 0.03;
          size = 0.05 + hash(seed + 8) * 0.06;
        } else {
          const k = 1.25, f = (1 - Math.exp(-k * age)) / k;
          const back = 3 + Math.pow(hash(seed + 5), 2) * 11, up = 1.2 + hash(seed + 6) * 2.6, lat = (hash(seed + 7) - 0.4) * 5 * side;
          x = px - c.fx * back * f + c.rx * lat * f + 0.9 * age; z = pz - c.fz * back * f + c.rz * lat * f - 0.3 * age;
          y = 0.12 + up * f * 0.7 + 0.18 * age;
          const sz = e < 2 ? 1 : 0.55;
          size = (0.7 + hash(seed + 8) * 0.7 + Math.sqrt(age) * 2.6) * sz;
        }
        const i4 = n * 4;
        aP.array[i4] = x; aP.array[i4 + 1] = y; aP.array[i4 + 2] = z; aP.array[i4 + 3] = size;
        aA.array[i4] = age / life; aA.array[i4 + 1] = hash(seed + 9) * 6.28 + age * (hash(seed + 10) - 0.5) * 0.8; aA.array[i4 + 2] = hash(seed + 11); aA.array[i4 + 3] = kind;
        n++;
      }
    }
    dustGeo.instanceCount = n;
    aP.needsUpdate = true; aA.needsUpdate = true;
  }

  // ---- cameras --------------------------------------------------------------------------------------------
  const cs = {}, cs2 = {};
  const hh = (t, a, f = 1) => (Math.sin(t * 1.7 * f) + 0.6 * Math.sin(t * 2.9 * f + 1.3) + 0.3 * Math.sin(t * 5.3 * f + 0.4)) * a;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();

  function rig(tf, out) {
    const k = Math.min(4, Math.floor(tf / SHOT_LEN)), lt = tf - k * SHOT_LEN, u = lt / SHOT_LEN;
    const c = carAt(tf, cs);
    const P = V(c.x, 0, c.z), F = V(c.fx, 0, c.fz), R = V(c.rx, 0, c.rz);
    let pos, tgt, fov, roll = 0, zoom = 0, sharp = 0.2;
    if (k === 0) {
      const d = mix(11, 4.7, ease(u)), lat = mix(-1.9, 1.1, smooth(u)), y = mix(0.32, 0.62, smooth(u));
      pos = P.clone().addScaledVector(F, d).addScaledVector(R, lat).add(V(0, y, 0));
      tgt = P.clone().addScaledVector(F, 0.3).add(V(0, 0.56 + 0.05 * u, 0));
      fov = mix(60, 47, ease(u)); roll = 0.045 - 0.05 * u + hh(tf, 0.004);
      pos.y += hh(tf, 0.012, 3); pos.x += hh(tf, 0.012, 2.3);
      zoom = 0.05; sharp = 0.2;
    } else if (k === 1) {
      const t0 = k * SHOT_LEN + 2.35, m = carAt(t0, cs2);
      pos = V(m.x - m.rx * 6.2, 0.52, m.z - m.rz * 6.2);
      tgt = P.clone().add(V(0, 0.62, 0)).addScaledVector(F, 0.2);
      fov = 19 + 36 * Math.exp(-Math.pow((lt - 2.35) / 0.95, 2));
      roll = 0.0 + hh(tf, 0.002); sharp = 0.16;
    } else if (k === 2) {
      const e = smooth(u);
      const camZ = mix(3.4, 0.0, e), tz = mix(1.3, -1.25, e), off = mix(2.8, 2.15, e);
      pos = P.clone().addScaledVector(R, -off).addScaledVector(F, camZ).add(V(0, mix(0.34, 0.5, e), 0));
      tgt = P.clone().addScaledVector(R, -0.9).addScaledVector(F, tz).add(V(0, 0.4, 0));
      fov = mix(40, 34, e); roll = -0.03 + 0.05 * u + hh(tf, 0.004);
      pos.y += hh(tf, 0.01, 3.1); pos.x += hh(tf, 0.01, 2.1);
      zoom = 0.0; sharp = 0.2;
    } else if (k === 3) {
      const e = ease(u);
      pos = P.clone().add(V(0, mix(32, 21, e), 0)).addScaledVector(R, mix(24, -11, e)).addScaledVector(F, mix(-44, -10, e));
      tgt = P.clone().addScaledVector(F, mix(10, 14, e)).add(V(0, 0, 0));
      fov = mix(44, 38, e); roll = mix(0.07, -0.05, e) + hh(tf, 0.003);
      pos.x += hh(tf, 0.05, 1.3); zoom = 0.012; sharp = 0.25;
    } else {
      const e = ease(u);
      pos = P.clone().addScaledVector(F, -mix(8.4, 5.7, e)).addScaledVector(R, mix(1.3, -0.9, e)).add(V(0, mix(2.1, 1.12, e), 0));
      tgt = P.clone().addScaledVector(F, 3.8).add(V(0, 0.95, 0));
      fov = mix(54, 44, e); roll = mix(-0.03, 0.04, e) + hh(tf, 0.004);
      pos.y += hh(tf, 0.012, 3.4); pos.x += hh(tf, 0.012, 2.6);
      zoom = 0.045; sharp = 0.22;
    }
    pos.y = Math.max(pos.y, 0.16);
    out.pos = pos; out.tgt = tgt; out.fov = fov; out.roll = roll; out.zoom = zoom; out.sharp = sharp; out.k = k; out.lt = lt;
    return out;
  }
  function applyCam(camera, r, aspect) {
    camera.position.copy(r.pos);
    camera.fov = r.fov; camera.aspect = aspect;
    camera.up.set(Math.sin(r.roll), Math.cos(r.roll), 0);
    camera.lookAt(r.tgt);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  }

  // ---- look: livery colour, number, dusk variation per project ---------------------------------------------
  let lookKey = '';
  function setLook(accentHex, number, seed) {
    const key = `${accentHex}|${number}|${seed}`;
    if (key === lookKey) return;
    lookKey = key;
    const a = new THREE.Color(accentHex);
    livery.color.copy(a).multiplyScalar(0.92);
    drawNum(number, '#' + new THREE.Color(accentHex).getHexString());
    const w = (seed % 7) / 7;                             // a touch more or less sun per project
    sun.intensity = 4.6 + w * 0.9;
    const sd = new THREE.Vector3(-0.34 + (w - 0.5) * 0.16, 0.13 + w * 0.08, -0.93).normalize();
    sunDir.copy(sd); sun.position.copy(sd).multiplyScalar(200);
    const hsl = {}; a.getHSL(hsl);
    skyMat.uniforms.uMid.value.copy(palette.mid).lerp(new THREE.Color().setHSL(hsl.h, 0.5, 0.06), 0.35);
    envTex && (scene.environmentIntensity = 0.9);
  }

  const tmpV = new THREE.Vector3(), tmpO = {}, tmpP = {};
  const state = { rt, k: 0, lt: 0, flash: 0, blur: new THREE.Vector2(), zoom: 0, sharp: 0.2, sun: new THREE.Vector3(0.5, 0.5, 0) };

  function render(tfIn, aspect, width, height) {
    const tf = ((tfIn % FILM) + FILM) % FILM;
    if (rt.width !== width || rt.height !== height) rt.setSize(width, height);
    bakeEnv();
    const r = rig(tf, tmpO);
    // previous camera (a hair earlier, never across a cut) for the motion-blur vector
    const tp = Math.max(r.k * SHOT_LEN, tf - 1 / 40);
    const r2 = rig(tp, tmpP);
    applyCam(prevCam, r2, aspect);
    applyCam(cam, r, aspect);

    const c = carAt(tf, cs);
    carRoot.position.set(c.x, 0, c.z);
    carRoot.rotation.set(0, c.yaw, 0);
    carBody.rotation.set(c.pitch, 0, c.roll);
    carBody.position.y = 0.012 * Math.sin(tf * 11.3);
    const dist = c.dist, spinA = -dist / 0.37;
    for (const w of wheels) { w.spin.rotation.x = spinA; w.pivot.rotation.y = w.front ? c.steer : 0; }
    // lamps fade in as the light falls; glows fade with the angle to the camera
    for (const gl of glows) {
      tmpV.set(gl.p[0], gl.p[1], gl.p[2]).applyMatrix4(carBody.matrixWorld);
      const dx = cam.position.x - c.x, dz = cam.position.z - c.z, dl = Math.hypot(dx, dz) || 1;
      const facing = (dx * c.fx + dz * c.fz) / dl * gl.dir;
      const f = Math.pow(Math.max(facing, 0), 1.5);
      gl.s.material.opacity = Math.min(1, f * 0.8);
      const dd = cam.position.distanceTo(tmpV);
      const sz = (gl.big > 0.9 ? 0.7 : 0.4) * (0.7 + Math.min(dd, 30) * 0.02) * (0.5 + f * 0.7);
      gl.s.scale.set(sz, sz, 1);
    }
    carBody.updateMatrixWorld(true);
    beamMat.uniforms.uI.value = 1;
    sky.position.copy(cam.position);
    ridgeGroup.position.set(cam.position.x, 0, cam.position.z);
    updateDust(tf);
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);

    // post inputs: where an infinitely far point moved on screen since the previous camera = camera blur
    tmpV.copy(r.tgt).sub(r.pos).normalize().multiplyScalar(60).add(r.pos);
    const a = tmpV.clone().project(cam), b = tmpV.clone().project(prevCam);
    state.blur.set((a.x - b.x) * 0.25, (a.y - b.y) * 0.25);   // uv units, half-shutter
    state.blur.x = Math.max(-0.09, Math.min(0.09, state.blur.x));
    state.blur.y = Math.max(-0.09, Math.min(0.09, state.blur.y));
    state.zoom = r.zoom; state.sharp = r.sharp; state.k = r.k; state.lt = r.lt;
    // the sun on screen
    tmpV.copy(sunDir).multiplyScalar(1000).add(cam.position);
    const sp = tmpV.project(cam);
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const front = smooth(fwd.dot(sunDir) * 4);
    state.sun.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, front);
    state.flash = 0.55 * Math.exp(-r.lt * 12);
    return state;
  }

  const rally = {
    refs: 0, rt, render, setLook, bakeEnv, prep: bakeEnv, scene, cam, palette,
    warm() { bakeEnv(); renderer.compile(scene, cam); },
    release() {
      if (--rally.refs > 0) return;
      cache.delete(renderer);
      rt.dispose(); envTex?.dispose();
      scene.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => { x.map?.dispose?.(); x.dispose?.(); }); });
    }
  };
  return rally;
}