/*
 * worldChat.js — a conversation as a place: a long helical tunnel of holographic message bubbles (sent and
 * received), typing indicators, socket lines with pulses racing down them, and a "delivered" wave that
 * lights each bubble as it passes. Used for messaging and real-time projects.
 */
import * as THREE from 'three';
import { makeStage, shotOf, singleton, seeded, smooth, ease, mix, hh, V } from './worldKit.js';

const R = 6;            // tunnel radius
const STEP = 1.7;      // metres between bubbles along the tunnel
const COUNT = 280;
const TWIST = 0.62;

const MSG_V = /* glsl */ `
  attribute vec3 aPos; attribute float aAng; attribute vec2 aSize; attribute vec3 aInfo; // side, seed, kind
  varying vec2 vUv; varying vec2 vSize; varying vec3 vInfo; varying float vWave; varying float vDist;
  uniform float uWaveZ;
  void main() {
    vec3 radial = vec3(cos(aAng), sin(aAng), 0.0);
    vec3 n = normalize(-radial * 0.78 + vec3(0.0, 0.0, 0.62));
    vec3 up = vec3(-sin(aAng), cos(aAng), 0.0);
    vec3 right = normalize(cross(up, n));
    vec3 wp = aPos + right * position.x * aSize.x + up * position.y * aSize.y;
    vec4 mv = viewMatrix * vec4(wp, 1.0);
    vUv = uv; vSize = aSize; vInfo = aInfo; vDist = -mv.z;
    vWave = exp(-pow((aPos.z - uWaveZ) * 0.085, 2.0));
    gl_Position = projectionMatrix * mv;
  }
`;
const MSG_F = /* glsl */ `
  precision highp float;
  varying vec2 vUv; varying vec2 vSize; varying vec3 vInfo; varying float vWave; varying float vDist;
  uniform vec3 uC1, uC2; uniform float uTime, uFogD;
  float h11(float n) { return fract(sin(n * 91.7) * 43758.5453); }
  float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = (vUv - 0.5) * vSize;
    float side = vInfo.x, seed = vInfo.y, kind = vInfo.z;
    vec3 tint = mix(uC2, uC1, side);
    float rad = min(vSize.y * 0.5, 0.55);
    float d = sdBox(p, vSize * 0.5 - 0.02, rad);
    float inside = smoothstep(0.015, -0.015, d);
    float border = exp(-abs(d) * 22.0);
    vec3 col = tint * (0.13 * inside + border * 1.15);
    if (kind > 0.5) {                                   // typing indicator: three bouncing dots
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float by = max(0.0, sin(uTime * 5.5 - fi * 0.9)) * 0.16;
        float dd = length(p - vec2((fi - 1.0) * 0.42, by - 0.02)) - 0.11;
        col += tint * 1.7 * smoothstep(0.03, -0.02, dd) * inside;
      }
    } else {                                            // lines of text
      float lines = 1.0 + floor(h11(seed) * 2.99);
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        if (fi >= lines) break;
        float yc = (lines - 1.0) * 0.5 * 0.34 - fi * 0.34;
        float len = (0.35 + 0.65 * h11(seed * 7.0 + fi * 3.1)) * (vSize.x - 1.0);
        float x0 = -vSize.x * 0.5 + 0.5;
        float bar = step(abs(p.y - yc), 0.065) * step(x0, p.x) * step(p.x, x0 + len);
        col += tint * bar * 0.85 * inside;
      }
    }
    col *= 1.0 + vWave * 2.4;
    col += tint * vWave * border * 1.6;
    float fade = exp(-uFogD * uFogD * vDist * vDist);
    gl_FragColor = vec4(col * fade, 1.0);
  }
`;
const LINE_V = `attribute float aT; attribute float aPh; varying float vT; varying float vPh; varying float vDist; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vT = aT; vPh = aPh; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const LINE_F = `precision highp float; varying float vT; varying float vPh; varying float vDist; uniform vec3 uC; uniform float uTime, uFogD;
  void main() { float ph = fract(uTime * 0.16 + vPh); float pulse = exp(-pow((ph - vT) * 28.0, 2.0)) * 2.4; float a = (0.1 + pulse) * exp(-uFogD * uFogD * vDist * vDist * 0.7); gl_FragColor = vec4(uC * a, 1.0); }`;
const DOT_V = `attribute float aSz; varying float vA; uniform float uScale, uTime; void main() { vec3 p = position + vec3(sin(uTime * 0.3 + aSz * 50.0), cos(uTime * 0.25 + aSz * 31.0), 0.0) * 0.6; vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv; float d = max(-mv.z, 0.1); gl_PointSize = clamp(aSz * uScale / d, 1.0, 22.0); vA = clamp(1.3 - d * 0.014, 0.0, 1.0) * 0.6; }`;
const DOT_F = `precision highp float; varying float vA; uniform vec3 uC; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float a = smoothstep(1.0, 0.0, dot(q, q)); gl_FragColor = vec4(uC * a * vA, 1.0); }`;

const cache = new WeakMap();
export const getChat = singleton(cache, renderer => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.004, 0.008, 0.016);
  const stage = makeStage(renderer, scene);
  const rnd = seeded(40417);
  const fogD = 0.009;

  const aPos = new Float32Array(COUNT * 3), aAng = new Float32Array(COUNT), aSize = new Float32Array(COUNT * 2), aInfo = new Float32Array(COUNT * 3);
  const bubble = [];
  for (let i = 0; i < COUNT; i++) {
    const ang = i * TWIST + rnd() * 0.15, side = rnd() < 0.5 ? 1 : 0, typing = rnd() < 0.09;
    const w = typing ? 1.9 : 2.6 + rnd() * 4.2, h = typing ? 1.0 : 1.0 + Math.floor(rnd() * 2.99) * 0.34 + 0.35;
    const z = -10 - i * STEP, r = R + (rnd() - 0.5) * 1.4;
    aPos.set([Math.cos(ang) * r, Math.sin(ang) * r, z], i * 3);
    aAng[i] = ang; aSize.set([w, h], i * 2); aInfo.set([side, rnd() * 50, typing ? 1 : 0], i * 3);
    bubble.push({ x: Math.cos(ang) * r, y: Math.sin(ang) * r, z, ang });
  }
  const bg = new THREE.InstancedBufferGeometry();
  const q = new THREE.PlaneGeometry(1, 1); bg.index = q.index; bg.setAttribute('position', q.attributes.position); bg.setAttribute('uv', q.attributes.uv);
  bg.setAttribute('aPos', new THREE.InstancedBufferAttribute(aPos, 3)); bg.setAttribute('aAng', new THREE.InstancedBufferAttribute(aAng, 1));
  bg.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 2)); bg.setAttribute('aInfo', new THREE.InstancedBufferAttribute(aInfo, 3));
  bg.instanceCount = COUNT;
  const msgMat = new THREE.ShaderMaterial({
    vertexShader: MSG_V, fragmentShader: MSG_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC1: { value: new THREE.Color(0.2, 0.8, 0.7) }, uC2: { value: new THREE.Color(0.45, 0.55, 0.9) }, uTime: { value: 0 }, uWaveZ: { value: 0 }, uFogD: { value: fogD } }
  });
  const msgs = new THREE.Mesh(bg, msgMat); msgs.frustumCulled = false; scene.add(msgs);

  // socket lines with pulses
  const lp = [], lt = [], lph = [];
  const LS = 150, LEN = COUNT * STEP + 20;
  for (let j = 0; j < 22; j++) {
    const a0 = rnd() * 6.28, rr = 2.5 + rnd() * 4, tw = (rnd() - 0.5) * 2.2, ph = rnd();
    for (let i = 0; i < LS; i++) for (const e of [0, 1]) {
      const f = (i + e) / LS, a = a0 + tw * f * 3;
      lp.push(Math.cos(a) * rr, Math.sin(a) * rr, -8 - f * LEN); lt.push(f); lph.push(ph);
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(lt, 1)); lg.setAttribute('aPh', new THREE.Float32BufferAttribute(lph, 1));
  const lineMat = new THREE.ShaderMaterial({ vertexShader: LINE_V, fragmentShader: LINE_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: new THREE.Color(0.2, 0.8, 0.7) }, uTime: { value: 0 }, uFogD: { value: fogD } } });
  const lines = new THREE.LineSegments(lg, lineMat); lines.frustumCulled = false; scene.add(lines);

  // presence dots drifting in the dark
  const DN = 420, dp = new Float32Array(DN * 3), ds = new Float32Array(DN);
  for (let i = 0; i < DN; i++) { const a = rnd() * 6.28, r = 1.5 + Math.pow(rnd(), 0.6) * 16; dp.set([Math.cos(a) * r, Math.sin(a) * r, -rnd() * (LEN + 40)], i * 3); ds[i] = 0.12 + rnd() * 0.5; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aSz', new THREE.BufferAttribute(ds, 1));
  const dotMat = new THREE.ShaderMaterial({ vertexShader: DOT_V, fragmentShader: DOT_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uScale: { value: 300 }, uTime: { value: 0 }, uC: { value: new THREE.Color(0.4, 0.8, 0.8) } } });
  const dots = new THREE.Points(dg, dotMat); dots.frustumCulled = false; scene.add(dots);

  let phase = 0;
  function rig(tf, o) {
    const { k, lt, u } = shotOf(tf);
    let pos, tgt, fov, roll = 0, zoom = 0, sharp = 0.2;
    const off = phase * 3;
    if (k === 0) {                                        // fly down the middle of the thread
      const z = -(14 + 19 * lt + off);
      pos = V(0.7 * Math.sin(tf * 0.9), 0.5 * Math.cos(tf * 0.7), z);
      tgt = V(0, 0, z - 34); fov = 72; roll = 0.3 * Math.sin(tf * 0.45); zoom = 0.065;
    } else if (k === 1) {                                 // glide close along the wall of bubbles
      const z = -(120 + 11 * lt + off), a = 0.9 + 0.35 * u;
      pos = V(Math.cos(a) * 3.2, Math.sin(a) * 3.2, z);
      tgt = V(Math.cos(a + 0.12) * R, Math.sin(a + 0.12) * R, z - 14); fov = 54; roll = a - 1.2;
    } else if (k === 2) {                                 // macro on one bubble
      const b = bubble[48 + phase * 2], e = smooth(u);
      const n = V(-Math.cos(b.ang) * 0.78, -Math.sin(b.ang) * 0.78, 0.62).normalize();
      pos = V(b.x, b.y, b.z).addScaledVector(n, mix(12, 7.5, e)).add(V(0.5 * (1 - e), 0.3, 0));
      tgt = V(b.x, b.y, b.z); fov = mix(36, 28, e); roll = b.ang - Math.PI / 2 + 0.05; sharp = 0.1;
    } else if (k === 3) {                                 // outside, looking along the whole tunnel
      const e = ease(u);
      pos = V(mix(30, 62, e), mix(14, 30, e), mix(-24, 12, e)); tgt = V(0, 0, -170); fov = mix(46, 40, e); roll = mix(0.06, -0.04, e); zoom = 0.01; sharp = 0.3;
    } else {                                              // fast pull back through it
      const z = -(260 - 24 * lt + off);
      pos = V(1.0 * Math.sin(tf * 1.2), 0.8 * Math.cos(tf * 1.0), z);
      tgt = V(0, 0, z + 38); fov = 80; roll = 0.4 * Math.sin(tf * 0.6); zoom = 0.08;
    }
    pos.x += hh(tf, 0.04, 1.3); pos.y += hh(tf, 0.035, 1.1);
    o.pos = pos; o.tgt = tgt; o.fov = fov; o.roll = roll + hh(tf, 0.004); o.zoom = zoom; o.sharp = sharp; o.k = k; o.lt = lt;
    return o;
  }
  function draw(tf, cam) {
    msgMat.uniforms.uTime.value = tf; lineMat.uniforms.uTime.value = tf; dotMat.uniforms.uTime.value = tf;
    msgMat.uniforms.uWaveZ.value = -((tf * 46) % (COUNT * STEP));
    dotMat.uniforms.uScale.value = stage.rt.height * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * 0.12;
  }

  return {
    scene, cam: stage.cam, rt: stage.rt,
    setLook(accent, number, seed) {
      const c = new THREE.Color(accent), hsl = {}; c.getHSL(hsl);
      const mk = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l, THREE.SRGBColorSpace);
      msgMat.uniforms.uC1.value.copy(mk(hsl.h, 0.8, 0.55)).multiplyScalar(1.3);
      msgMat.uniforms.uC2.value.copy(mk(hsl.h + 0.5, 0.45, 0.62));
      lineMat.uniforms.uC.value.copy(mk(hsl.h, 0.8, 0.55));
      dotMat.uniforms.uC.value.copy(mk(hsl.h + 0.05, 0.5, 0.6));
      phase = seed % 5;
    },
    render(t, aspect, w, h) { return stage.frame(rig, draw, t, aspect, w, h, null); },
    warm() { renderer.compile(scene, stage.cam); }
  };
});