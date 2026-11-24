/*
 * worldCity.js — a night city of lit towers and streams of light, for projects about systems, platforms,
 * dashboards and data. Drone fly-over, crane reveal, street-level glide, tower orbit and a high descent.
 * Windows, traffic and beams are all shader maths on instanced boxes, so the whole city costs a handful of draws.
 */
import * as THREE from 'three';
import { makeStage, shotOf, singleton, seeded, smooth, ease, mix, hh, V } from './worldKit.js';

const P = 18; // block pitch (m)

const BLD_V = /* glsl */ `
  attribute float aSeed; attribute float aH;
  varying vec3 vW; varying vec3 vNw; varying float vSeed; varying float vH; varying float vDist;
  void main() {
    mat4 m = modelMatrix * instanceMatrix;
    vec4 wp = m * vec4(position, 1.0);
    vW = wp.xyz; vNw = normalize(mat3(m) * normal) ; vSeed = aSeed; vH = aH;
    vec4 mv = viewMatrix * wp; vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const BLD_F = /* glsl */ `
  precision highp float;
  varying vec3 vW; varying vec3 vNw; varying float vSeed; varying float vH; varying float vDist;
  uniform vec3 uAcc, uWarm, uCool, uFog; uniform float uTime, uFogD;
  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vNw);
    float side = step(abs(n.y), 0.5);
    bool xf = abs(n.x) > 0.5;
    vec2 g = vec2(xf ? vW.z : vW.x, vW.y) / vec2(1.15, 1.9);
    vec2 cell = floor(g), f = fract(g);
    float win = step(0.2, f.x) * step(f.x, 0.8) * step(0.22, f.y) * step(f.y, 0.78);
    float r = h21(cell + vSeed * 37.0 + (xf ? 11.0 : 0.0));
    float lit = step(0.62, r) * (0.75 + 0.25 * sin(uTime * (0.4 + r * 2.0) + r * 40.0));
    vec3 wc = mix(uWarm, uCool, step(0.78, fract(r * 7.0)));
    vec3 base = mix(vec3(0.010, 0.016, 0.03), vec3(0.03, 0.05, 0.085), clamp(vW.y / 120.0, 0.0, 1.0));
    base += (xf ? 0.012 : 0.0) + (1.0 - side) * vec3(0.02, 0.03, 0.045);
    vec3 col = base + side * win * lit * wc * 1.5;
    // a bright accent band near the crown of the tall ones
    float crown = smoothstep(vH - 2.2, vH - 0.2, vW.y) * step(30.0, vH);
    col += uAcc * crown * (0.6 + 0.3 * sin(uTime * 1.3 + vSeed * 20.0)) * side;
    col += uAcc * 0.18 * smoothstep(0.0, 1.0, 1.0 - vW.y / 18.0) * side * 0.5;
    float fog = 1.0 - exp(-uFogD * uFogD * vDist * vDist);
    float low = exp(-max(vW.y, 0.0) * 0.012);
    col = mix(col, uFog, clamp(fog * (0.55 + 0.45 * low), 0.0, 1.0));
    gl_FragColor = vec4(col, 1.0);
  }
`;
const GROUND_V = `varying vec3 vW; varying float vDist; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; vec4 mv = viewMatrix * wp; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const GROUND_F = /* glsl */ `
  precision highp float;
  varying vec3 vW; varying float vDist;
  uniform vec3 uAcc, uFog; uniform float uFogD;
  void main() {
    vec2 q = mod(vW.xz, ${P}.0);
    vec2 m = abs(q - ${P / 2}.0);
    float streetX = step(m.x, 3.0), streetZ = step(m.y, 3.0);
    float st = max(streetX, streetZ);
    vec3 col = mix(vec3(0.006, 0.01, 0.018), vec3(0.016, 0.022, 0.034), st);
    float dash = step(0.5, fract((streetX > 0.5 ? vW.z : vW.x) / 5.0)) * (1.0 - smoothstep(0.0, 0.18, min(m.x, m.y)));
    col += vec3(0.2, 0.16, 0.1) * 0.12 * dash * st;
    // curb lines catch the accent
    float curb = (1.0 - smoothstep(0.0, 0.16, abs(m.x - 3.0))) + (1.0 - smoothstep(0.0, 0.16, abs(m.y - 3.0)));
    col += uAcc * 0.13 * curb;
    float fog = 1.0 - exp(-uFogD * uFogD * vDist * vDist);
    gl_FragColor = vec4(mix(col, uFog, clamp(fog, 0.0, 1.0)), 1.0);
  }
`;
const CAR_V = /* glsl */ `
  attribute vec4 aDef; // x: axis, y: street line, z: lane, w: speed (signed)
  attribute float aPh;
  varying vec3 vC; varying float vDist;
  uniform float uTime; uniform vec2 uBase, uLen; uniform vec3 uFog;
  void main() {
    float ax = aDef.x;
    float L = ax < 0.5 ? uLen.x : uLen.y, B = ax < 0.5 ? uBase.x : uBase.y;
    float s = B + mod(aPh * L + uTime * aDef.w, L);
    vec3 loc = position * vec3(0.5, 0.22, 3.2);
    vec3 wp;
    if (ax < 0.5) wp = vec3(aDef.y + aDef.z + loc.x, 0.3 + loc.y, s + loc.z);
    else wp = vec3(s + loc.z, 0.3 + loc.y, aDef.y + aDef.z + loc.x);
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vDist = -mv.z;
    vC = aDef.w > 0.0 ? vec3(2.4, 2.1, 1.6) : vec3(2.6, 0.15, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`;
const CAR_F = `precision highp float; varying vec3 vC; varying float vDist; uniform vec3 uFog; uniform float uFogD; void main() { float fog = 1.0 - exp(-uFogD * uFogD * vDist * vDist); gl_FragColor = vec4(mix(vC, uFog, fog), 1.0); }`;
const SKY_V = `varying vec3 vD; void main() { vD = position; vec4 p = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const SKY_F = `precision highp float; varying vec3 vD; uniform vec3 uHor, uTop; void main() { float h = normalize(vD).y; vec3 c = mix(uHor, uTop, smoothstep(0.0, 0.6, h)); c = mix(c, uHor * 0.5, smoothstep(0.0, -0.2, h)); gl_FragColor = vec4(c, 1.0); }`;
const BEAM_V = `varying vec3 vN; varying vec3 vV; varying float vY; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vY = position.y / 80.0 + 0.5; gl_Position = projectionMatrix * mv; }`;
const BEAM_F = `precision highp float; varying vec3 vN; varying vec3 vV; varying float vY; uniform vec3 uC; uniform float uTime; void main() { float f = pow(abs(dot(normalize(vN), normalize(vV))), 1.6); float a = f * (1.0 - vY * 0.8) * (0.5 + 0.35 * sin(uTime * 2.0 + vY * 9.0)); gl_FragColor = vec4(uC * a, 1.0); }`;

const cache = new WeakMap();
export const getCity = singleton(cache, renderer => {
  const scene = new THREE.Scene();
  const fogC = new THREE.Color(0.012, 0.02, 0.034);
  const stage = makeStage(renderer, scene);
  const rnd = seeded(5521);
  const acc = new THREE.Color(0.1, 0.55, 0.6);
  const fogD = 0.0042;

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 24, 12), new THREE.ShaderMaterial({
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false,
    uniforms: { uHor: { value: new THREE.Color(0.03, 0.06, 0.1) }, uTop: { value: new THREE.Color(0.002, 0.005, 0.012) } }
  }));
  sky.frustumCulled = false; sky.renderOrder = -5; scene.add(sky);

  // towers
  const list = [];
  const TX = 0, TZ = -6; // the landmark tower's block
  for (let gx = -11; gx <= 11; gx++) for (let gz = -24; gz <= 5; gz++) {
    const cx = gx * P, cz = gz * P;
    const d2 = (gx - TX) * (gx - TX) + (gz - TZ) * (gz - TZ);
    const core = Math.exp(-d2 / 70);
    let h = 7 + Math.pow(rnd(), 2.2) * 40 + core * 60 * (0.4 + rnd());
    if (rnd() < 0.08) continue;
    if (gx === TX && gz === TZ) h = 168;
    const w = 8.5 + rnd() * 3.2, d = 8.5 + rnd() * 3.2;
    list.push({ x: cx, z: cz, w: gx === TX && gz === TZ ? 11 : w, d: gx === TX && gz === TZ ? 11 : d, h, s: rnd() });
  }
  const bg = new THREE.BoxGeometry(1, 1, 1); bg.translate(0, 0.5, 0);
  const bMat = new THREE.ShaderMaterial({
    vertexShader: BLD_V, fragmentShader: BLD_F,
    uniforms: { uAcc: { value: acc }, uWarm: { value: new THREE.Color(1.0, 0.62, 0.3) }, uCool: { value: new THREE.Color(0.5, 0.75, 1.0) }, uFog: { value: fogC }, uTime: { value: 0 }, uFogD: { value: fogD } }
  });
  const bm = new THREE.InstancedMesh(bg, bMat, list.length);
  const aSeed = new Float32Array(list.length), aH = new Float32Array(list.length), m4 = new THREE.Matrix4();
  list.forEach((b, i) => { m4.compose(V(b.x, 0, b.z), new THREE.Quaternion(), V(b.w, b.h, b.d)); bm.setMatrixAt(i, m4); aSeed[i] = b.s; aH[i] = b.h; });
  bg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 1));
  bg.setAttribute('aH', new THREE.InstancedBufferAttribute(aH, 1));
  bm.frustumCulled = false; scene.add(bm);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.ShaderMaterial({
    vertexShader: GROUND_V, fragmentShader: GROUND_F, uniforms: { uAcc: { value: acc }, uFog: { value: fogC }, uFogD: { value: fogD } }
  }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -200); scene.add(ground);

  // traffic
  const NC = 760, def = new Float32Array(NC * 4), ph = new Float32Array(NC);
  for (let i = 0; i < NC; i++) {
    const ax = rnd() < 0.62 ? 0 : 1;
    const idx = ax === 0 ? Math.floor(rnd() * 23) - 11 : Math.floor(rnd() * 29) - 24;
    const line = (idx + 0.5) * P, dir = rnd() < 0.5 ? 1 : -1;
    def[i * 4] = ax; def[i * 4 + 1] = line; def[i * 4 + 2] = dir * (0.9 + rnd() * 1.1); def[i * 4 + 3] = dir * (9 + rnd() * 16); ph[i] = rnd();
  }
  const cg = new THREE.InstancedBufferGeometry(); const cb = new THREE.BoxGeometry(1, 1, 1);
  cg.index = cb.index; cg.setAttribute('position', cb.attributes.position);
  cg.setAttribute('aDef', new THREE.InstancedBufferAttribute(def, 4)); cg.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 1));
  cg.instanceCount = NC;
  const carMat = new THREE.ShaderMaterial({ vertexShader: CAR_V, fragmentShader: CAR_F, uniforms: { uTime: { value: 0 }, uBase: { value: new THREE.Vector2(-470, -230) }, uLen: { value: new THREE.Vector2(560, 480) }, uFog: { value: fogC }, uFogD: { value: fogD } } });
  const cars = new THREE.Mesh(cg, carMat); cars.frustumCulled = false; scene.add(cars);

  // landmark: beams and rings
  const TCx = TX * P, TCz = TZ * P;
  const beamMat = new THREE.ShaderMaterial({ vertexShader: BEAM_V, fragmentShader: BEAM_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uC: { value: acc.clone().multiplyScalar(1.6) }, uTime: { value: 0 } } });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 160, 20, 1, true), beamMat); beam.position.set(TCx, 168 + 70, TCz); scene.add(beam);
  const ringMat = new THREE.MeshBasicMaterial({ color: acc.clone().multiplyScalar(2.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false });
  const rings = [0, 1, 2].map(i => { const r = new THREE.Mesh(new THREE.TorusGeometry(16 + i * 7, 0.16, 6, 96), ringMat); r.position.set(TCx, 182 + i * 9, TCz); scene.add(r); return r; });
  // a few more beams on other towers
  [[-4, -10], [5, -3], [-7, -2], [7, -12]].forEach(([gx, gz]) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 120, 14, 1, true), beamMat); m.position.set(gx * P, 80, gz * P); scene.add(m);
  });

  const TC = V(TCx, 0, TCz);
  function rig(tf, o) {
    const { k, lt, u } = shotOf(tf);
    let pos, tgt, fov, roll = 0, zoom = 0, sharp = 0.2;
    if (k === 0) {                                   // drone down the avenue
      const z = mix(34, -96, u);
      pos = V(P / 2 + 0.5 * Math.sin(tf), mix(14, 24, smooth(u)), z);
      tgt = V(P / 2, mix(12, 40, u), z - 46); fov = 62; roll = 0.03 * Math.sin(tf * 0.7); zoom = 0.055;
    } else if (k === 1) {                            // crane up the tower
      const e = ease(u);
      pos = V(mix(P / 2 + 6, 34, e), mix(2.2, 96, e), mix(-30, -34, e));
      tgt = V(TC.x, mix(60, 112, e), TC.z); fov = mix(44, 40, e); roll = mix(0.05, -0.03, e); zoom = 0.02;
    } else if (k === 2) {                            // street-level glide
      pos = V(P / 2 + 1.2, 1.7, mix(-8, -112, u));
      tgt = V(P / 2 - 16, 9 + 8 * u, pos.z - 34); fov = 54; roll = 0.025;
    } else if (k === 3) {                            // orbit the landmark
      const a = 0.35 + u * 1.5;
      pos = V(TC.x + Math.cos(a) * 66, mix(58, 40, u), TC.z + Math.sin(a) * 66);
      tgt = V(TC.x, 84, TC.z); fov = 40; roll = mix(0.05, -0.04, u); sharp = 0.18;
    } else {                                         // high descent over the grid
      const e = ease(u);
      pos = V(mix(70, 30, e), mix(148, 92, e), mix(10, -48, e));
      tgt = V(0, 0, mix(-110, -96, e)); fov = 40; roll = mix(-0.04, 0.03, e); zoom = 0.012; sharp = 0.28;
    }
    pos.x += hh(tf, 0.07, 1.3); pos.y += hh(tf, 0.05, 1.1);
    o.pos = pos; o.tgt = tgt; o.fov = fov; o.roll = roll + hh(tf, 0.003); o.zoom = zoom; o.sharp = sharp; o.k = k; o.lt = lt;
    return o;
  }
  function draw(tf, cam) {
    bMat.uniforms.uTime.value = tf; carMat.uniforms.uTime.value = tf; beamMat.uniforms.uTime.value = tf;
    sky.position.copy(cam.position);
    rings.forEach((r, i) => { r.rotation.x = Math.PI / 2 + 0.28 * Math.sin(tf * 0.5 + i); r.rotation.y = tf * (0.3 + i * 0.12) * (i % 2 ? -1 : 1); });
  }

  return {
    scene, cam: stage.cam, rt: stage.rt,
    setLook(accent) {
      const c = new THREE.Color(accent), hsl = {}; c.getHSL(hsl);
      const mk = (h, s, l) => new THREE.Color().setHSL((h + 1) % 1, s, l, THREE.SRGBColorSpace);
      acc.copy(mk(hsl.h, 0.75, 0.5));
      beamMat.uniforms.uC.value.copy(acc).multiplyScalar(1.6);
      ringMat.color.copy(acc).multiplyScalar(2.6);
      sky.material.uniforms.uHor.value.copy(mk(hsl.h, 0.5, 0.14));
    },
    render(t, aspect, w, h) { return stage.frame(rig, draw, t, aspect, w, h, null); },
    warm() { renderer.compile(scene, stage.cam); }
  };
});