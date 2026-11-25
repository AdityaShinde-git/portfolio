/*
 * worldMemory.js — the story of Mnemosyne, told as a place.
 *
 *   capture   documents, notes and bookmarks stream in, are scanned, and dissolve into points
 *   embed     those points settle into a semantic space: clusters of meaning, inside a local-first shell
 *   retrieve  a query ripples through the space; the closest memories light up (text + vector, fused)
 *   draft     the lit memories are linked into a graph, thread by thread, then each node is approved
 *   vault     pull back to see the whole of it held inside one private shell
 */
import * as THREE from 'three';
import { makeStage, shotOf, singleton, seeded, smooth, ease, mix, hh, V } from './worldKit.js';

const CLOUD_V = /* glsl */ `
  attribute float aSeed; attribute float aCl;
  uniform vec3 uQ; uniform float uQR, uQK, uScale, uT, uAmt;
  varying float vHot; varying float vRing; varying float vA; varying float vCl; varying float vSeed;
  void main() {
    vec3 p = position + 0.35 * vec3(sin(uT * 0.4 + aSeed * 40.0), cos(uT * 0.33 + aSeed * 27.0), sin(uT * 0.27 + aSeed * 13.0));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float d = distance(p, uQ);
    vRing = exp(-pow((d - uQR) * 0.4, 2.0)) * uAmt;
    vHot = smoothstep(uQK, uQK - 3.0, d) * step(aSeed, 0.4) * uAmt;
    float dist = max(-mv.z, 0.1);
    gl_PointSize = clamp((0.2 + aSeed * 0.24 + vHot * 0.95 + vRing * 0.4) * uScale / dist, 1.0, 20.0);
    vA = clamp(1.3 - dist * 0.011, 0.0, 1.0);
    vCl = aCl; vSeed = aSeed;
    gl_Position = projectionMatrix * mv;
  }
`;
const CLOUD_F = /* glsl */ `
  precision highp float;
  varying float vHot; varying float vRing; varying float vA; varying float vCl; varying float vSeed;
  uniform vec3 uCoolA, uCoolB, uGold;
  void main() {
    vec2 q = gl_PointCoord * 2.0 - 1.0;
    float a = smoothstep(1.0, 0.0, dot(q, q));
    vec3 base = mix(uCoolA, uCoolB, fract(vCl * 0.37 + vSeed * 0.2));
    vec3 col = base * 0.9 + uGold * vRing * 1.3 + uGold * vHot * 2.4;
    gl_FragColor = vec4(col * a * vA, 1.0);
  }
`;
const DOC_V = /* glsl */ `
  attribute vec3 aStart; attribute float aSeed;
  uniform float uT, uAmt; uniform vec3 uRight, uUp, uC;
  varying vec2 vUv; varying float vF; varying float vSeedF;
  void main() {
    float f = fract(uT * 0.075 + aSeed);
    vec3 rel = mix(aStart, vec3(0.0), pow(f, 1.35));
    float ang = f * (1.2 + aSeed * 1.6);
    rel.xz = mat2(cos(ang), sin(ang), -sin(ang), cos(ang)) * rel.xz;
    vec3 c = uC + rel;
    vec2 size = vec2(2.6, 3.4) * (1.0 - smoothstep(0.62, 1.0, f) * 0.96) * (0.8 + aSeed * 0.5);
    float rz = (aSeed - 0.5) * 0.9;
    vec2 pq = position.xy * size; pq = mat2(cos(rz), sin(rz), -sin(rz), cos(rz)) * pq;
    vec3 wp = c + uRight * pq.x + uUp * pq.y;
    vUv = uv; vF = f; vSeedF = aSeed * 50.0;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;
const DOC_F = /* glsl */ `
  precision highp float;
  varying vec2 vUv; varying float vF; varying float vSeedF;
  uniform vec3 uPaper, uGold; uniform float uAmt;
  float h11(float n) { return fract(sin(n * 91.7) * 43758.5453); }
  void main() {
    vec2 p = vUv - 0.5;
    vec2 b = abs(p) - vec2(0.5 - 0.03);
    float d = length(max(b, 0.0)) + min(max(b.x, b.y), 0.0) - 0.0;
    float edge = exp(-abs(d + 0.012) * 70.0);
    float inside = step(d, 0.0);
    // lines of text, ivory above the scan line and gold once scanned
    float scanY = 1.0 - clamp((vF - 0.5) / 0.32, 0.0, 1.0);
    float scanned = step(vUv.y, scanY + 0.0) ;
    float rows = 10.0, row = floor(vUv.y * rows);
    float within = step(abs(fract(vUv.y * rows) - 0.5), 0.14) * step(0.12, vUv.x) * step(vUv.x, 0.12 + 0.76 * (0.35 + 0.65 * h11(row + vSeedF)));
    float title = step(0.86, vUv.y) * step(vUv.y, 0.92) * step(0.12, vUv.x) * step(vUv.x, 0.5);
    vec3 ink = mix(uGold * 1.8, uPaper, scanned);
    vec3 col = uPaper * 0.1 * inside + uPaper * edge * 0.8 + ink * (within * 0.55 + title * 0.9) * inside;
    float band = exp(-abs(vUv.y - scanY) * 38.0) * step(0.5, vF) * step(vF, 0.86);
    col += uGold * 2.6 * band * inside;
    float a = smoothstep(0.0, 0.1, vF) * (1.0 - smoothstep(0.88, 1.0, vF));
    gl_FragColor = vec4(col * a * (0.55 + uAmt * 0.6), 1.0);
  }
`;
const LINK_V = `attribute float aOrd; varying float vOrd; varying float vT; attribute float aT; uniform float uDraw; varying float vDist; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vOrd = aOrd; vT = aT; vDist = -mv.z; gl_Position = projectionMatrix * mv; }`;
const LINK_F = `precision highp float; varying float vOrd; varying float vT; varying float vDist; uniform float uDraw; uniform vec3 uGold; uniform float uTime;
  void main() { float head = uDraw * 1.25 - vOrd; float on = smoothstep(vT * 0.2, vT * 0.2 + 0.05, head); float tip = exp(-pow(head - vT * 0.2 - 0.02, 2.0) * 60.0); float a = on * (0.5 + tip * 2.5) * clamp(1.4 - vDist * 0.012, 0.0, 1.0); gl_FragColor = vec4(uGold * a, 1.0); }`;
const HALO_V = `attribute float aOrd; uniform float uScale, uDraw, uTime; varying float vOn; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float dist = max(-mv.z, 0.1); vOn = smoothstep(aOrd * 0.8 + 0.2, aOrd * 0.8 + 0.4, uDraw); gl_PointSize = clamp((2.4 + 0.5 * sin(uTime * 3.0 + aOrd * 20.0)) * uScale / dist, 2.0, 70.0) * vOn; gl_Position = projectionMatrix * mv; }`;
const HALO_F = `precision highp float; varying float vOn; uniform vec3 uGold; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; float r = length(q); float ring = exp(-pow((r - 0.62) * 9.0, 2.0)); float core = exp(-r * r * 30.0); gl_FragColor = vec4(uGold * (ring * 1.3 + core * 2.0) * vOn * step(r, 1.0), 1.0); }`;

const cache = new WeakMap();
export const getMemory = singleton(cache, renderer => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0.004, 0.005, 0.014);
  const stage = makeStage(renderer, scene);
  const rnd = seeded(90210);
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2;

  // semantic space
  const centers = [];
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.4, r = 9 + rnd() * 8; centers.push(V(Math.cos(a) * r, (rnd() - 0.5) * 12, Math.sin(a) * r)); }
  const NP = 5600, pos = new Float32Array(NP * 3), seed = new Float32Array(NP), cl = new Float32Array(NP);
  const members = [];
  for (let i = 0; i < NP; i++) {
    const loose = rnd() < 0.14, c = Math.floor(rnd() * 7);
    const p = loose ? V((rnd() - 0.5) * 50, (rnd() - 0.5) * 26, (rnd() - 0.5) * 50) : centers[c].clone().add(V(gauss() * 4.4, gauss() * 3.4, gauss() * 4.4));
    pos.set([p.x, p.y, p.z], i * 3); seed[i] = rnd(); cl[i] = loose ? 9 : c;
    if (!loose && c === 2) members.push(i);
  }
  const Q = centers[2].clone();
  const cg = new THREE.BufferGeometry();
  cg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); cg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); cg.setAttribute('aCl', new THREE.BufferAttribute(cl, 1));
  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: CLOUD_V, fragmentShader: CLOUD_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uQ: { value: Q }, uQR: { value: 0 }, uQK: { value: 6.5 }, uScale: { value: 300 }, uT: { value: 0 }, uAmt: { value: 0.3 }, uCoolA: { value: new THREE.Color(0.18, 0.26, 0.6) }, uCoolB: { value: new THREE.Color(0.4, 0.3, 0.7) }, uGold: { value: new THREE.Color(1.0, 0.7, 0.3) } }
  });
  const cloud = new THREE.Points(cg, cloudMat); cloud.frustumCulled = false; scene.add(cloud);

  // documents streaming in
  const ND = 48, dStart = new Float32Array(ND * 3), dSeed = new Float32Array(ND);
  for (let i = 0; i < ND; i++) { const a = rnd() * 6.28, r = 3 + rnd() * 15; dStart.set([Math.cos(a) * r, (rnd() - 0.5) * 12, 30 + rnd() * 30], i * 3); dSeed[i] = i / ND; }
  const dg = new THREE.InstancedBufferGeometry(); const q = new THREE.PlaneGeometry(1, 1);
  dg.index = q.index; dg.setAttribute('position', q.attributes.position); dg.setAttribute('uv', q.attributes.uv);
  dg.setAttribute('aStart', new THREE.InstancedBufferAttribute(dStart, 3)); dg.setAttribute('aSeed', new THREE.InstancedBufferAttribute(dSeed, 1)); dg.instanceCount = ND;
  const docMat = new THREE.ShaderMaterial({
    vertexShader: DOC_V, fragmentShader: DOC_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uAmt: { value: 0.5 }, uRight: { value: V(1, 0, 0) }, uUp: { value: V(0, 1, 0) }, uC: { value: new THREE.Vector3() }, uPaper: { value: new THREE.Color(0.85, 0.8, 0.65) }, uGold: { value: new THREE.Color(1.0, 0.7, 0.3) } }
  });
  const docs = new THREE.Mesh(dg, docMat); docs.frustumCulled = false; docs.renderOrder = 2; scene.add(docs);

  // the graph drafted from the retrieved memories
  const set = members.slice(0, 60).map(i => ({ i, p: V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]) })).filter(n => n.p.distanceTo(Q) < 8).slice(0, 34);
  const lp = [], lo = [], lt = [];
  const link = (a, b) => { const o = Math.min(0.95, a.p.distanceTo(Q) / 9 * 0.7 + rnd() * 0.12); lp.push(a.p.x, a.p.y, a.p.z, b.p.x, b.p.y, b.p.z); lo.push(o, o); lt.push(0, 1); };
  set.forEach((n, i) => {
    const near = set.map((m, j) => [n.p.distanceToSquared(m.p), j]).filter(x => x[1] !== i).sort((a, b) => a[0] - b[0]);
    for (let k = 0; k < 2; k++) if (near[k] && near[k][0] < 30) link(n, set[near[k][1]]);
  });
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('aOrd', new THREE.Float32BufferAttribute(lo, 1)); lg.setAttribute('aT', new THREE.Float32BufferAttribute(lt, 1));
  const linkMat = new THREE.ShaderMaterial({ vertexShader: LINK_V, fragmentShader: LINK_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uDraw: { value: 0 }, uGold: cloudMat.uniforms.uGold, uTime: { value: 0 } } });
  const links = new THREE.LineSegments(lg, linkMat); links.frustumCulled = false; scene.add(links);

  const hp = [], ho = [];
  set.forEach(n => { hp.push(n.p.x, n.p.y, n.p.z); ho.push(Math.min(0.95, n.p.distanceTo(Q) / 9 * 0.7)); });
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hp, 3)); hg.setAttribute('aOrd', new THREE.Float32BufferAttribute(ho, 1));
  const haloMat = new THREE.ShaderMaterial({ vertexShader: HALO_V, fragmentShader: HALO_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uScale: { value: 300 }, uDraw: linkMat.uniforms.uDraw, uTime: { value: 0 }, uGold: cloudMat.uniforms.uGold } });
  const halos = new THREE.Points(hg, haloMat); halos.frustumCulled = false; scene.add(halos);

  // the local-first shell
  const shellMat = new THREE.LineBasicMaterial({ color: new THREE.Color(0.1, 0.2, 0.5), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(34, 2)), shellMat); scene.add(shell);

  let phase = 0;
  const right = V(1, 0, 0), up = V(0, 1, 0);
  function rig(tf, o) {
    const { k, lt, u } = shotOf(tf);
    let pos, tgt, fov, roll = 0, zoom = 0, sharp = 0.2;
    if (k === 0) {                                        // capture: up the stream of documents
      const e = ease(u);
      pos = V(mix(-6, 4, e), mix(-9, -3, e), mix(30, 20, e)); tgt = V(0, mix(2, 0, e), 0); fov = mix(58, 50, e); roll = 0.06 - 0.08 * u; zoom = 0.045;
    } else if (k === 1) {                                 // embed: orbit through the space
      const a = 0.4 + u * 1.5 + phase * 0.3, r = mix(27, 17, smooth(u));
      pos = V(Math.cos(a) * r, mix(7, 2, u), Math.sin(a) * r); tgt = V(0, 0, 0); fov = 46; roll = 0.03 * Math.sin(tf * 0.5); sharp = 0.15;
    } else if (k === 2) {                                 // retrieve: push in on the query
      const e = ease(u), d = Q.clone().setY(0).normalize();
      pos = Q.clone().addScaledVector(d, mix(26, 11, e)).add(V(mix(-7, 3, e), mix(7, 2, e), 0)); tgt = Q.clone(); fov = mix(40, 34, e); roll = mix(-0.04, 0.03, e); sharp = 0.1;
    } else if (k === 3) {                                 // draft: slow crane round the graph as it draws
      const a = 0.2 + u * 1.2 + Math.atan2(Q.z, Q.x);
      pos = Q.clone().add(V(Math.cos(a) * 15, mix(10, 3, u), Math.sin(a) * 15)); tgt = Q.clone(); fov = 38; roll = mix(0.05, -0.03, u); sharp = 0.14;
    } else {                                              // vault: pull back, the whole shell
      const e = ease(u), a = 0.9 + u * 0.5;
      const r = mix(20, 82, e);
      pos = V(Math.cos(a) * r, mix(4, 34, e), Math.sin(a) * r); tgt = V(0, 0, 0); fov = mix(50, 44, e); roll = mix(0.04, -0.02, e); zoom = 0.014; sharp = 0.3;
    }
    pos.x += hh(tf, 0.05, 1.3); pos.y += hh(tf, 0.04, 1.1);
    o.pos = pos; o.tgt = tgt; o.fov = fov; o.roll = roll + hh(tf, 0.004); o.zoom = zoom; o.sharp = sharp; o.k = k; o.lt = lt;
    return o;
  }
  function draw(tf, cam, r) {
    const k = r.k, lt = r.lt;
    cam.matrixWorld.extractBasis(right, up, new THREE.Vector3());
    docMat.uniforms.uRight.value.copy(right); docMat.uniforms.uUp.value.copy(up);
    const scale = stage.rt.height * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * 0.11;
    cloudMat.uniforms.uScale.value = scale; haloMat.uniforms.uScale.value = scale;
    cloudMat.uniforms.uT.value = tf; docMat.uniforms.uT.value = tf; linkMat.uniforms.uTime.value = tf; haloMat.uniforms.uTime.value = tf;
    // the story beats
    docMat.uniforms.uAmt.value = k === 0 ? 1 : 0.35;
    cloudMat.uniforms.uAmt.value = k === 2 ? 1 : k === 1 ? 0.45 : k >= 3 ? 0.85 : 0.2;
    cloudMat.uniforms.uQR.value = k === 2 ? 2 + lt * 3.4 : k === 1 ? ((lt * 5) % 26) : 5;
    linkMat.uniforms.uDraw.value = k === 3 ? smooth(lt / 3.4) : k === 4 ? 1 : 0;
    shell.rotation.y = tf * 0.02;
  }

  return {
    scene, cam: stage.cam, rt: stage.rt,
    setLook(accent, number, seed) {
      const c = new THREE.Color(accent), hsl = {}; c.getHSL(hsl);
      const mk = (h, s, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, s, l, THREE.SRGBColorSpace);
      cloudMat.uniforms.uCoolA.value.copy(mk(hsl.h, 0.55, 0.3)); cloudMat.uniforms.uCoolB.value.copy(mk(hsl.h + 0.12, 0.45, 0.4));
      shellMat.color.copy(mk(hsl.h, 0.6, 0.26));
      phase = seed % 3;
    },
    render(t, aspect, w, h) { return stage.frame(rig, draw, t, aspect, w, h, null); },
    warm() { renderer.compile(scene, stage.cam); }
  };
});