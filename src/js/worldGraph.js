/*
 * worldGraph.js — a knowledge graph as a place: clusters of glowing nodes joined by threads of light,
 * a query wave sweeping through them, and a camera that dollies, orbits, tracks, pulls back and racks focus.
 * Used for projects about knowledge, search, messaging, networks and real-time systems.
 */
import * as THREE from 'three';
import { makeStage, shotOf, singleton, seeded, smooth, ease, mix, hh, V } from './worldKit.js';

const NODE_V = /* glsl */ `
  attribute float aS; attribute float aHub;
  varying vec3 vN; varying vec3 vV; varying float vHub; varying float vWave; varying float vDist;
  uniform vec3 uWaveC; uniform float uWaveR;
  void main() {
    mat4 m = modelMatrix * instanceMatrix;
    vec3 ctr = (m * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec4 wp = m * vec4(position, 1.0);
    vN = normalize(mat3(m) * normal);
    vec4 mv = viewMatrix * wp;
    vV = normalize(-mv.xyz);
    vN = normalize((viewMatrix * vec4(vN, 0.0)).xyz);
    vHub = aHub;
    vWave = exp(-pow((length(ctr - uWaveC) - uWaveR) * 0.16, 2.0));
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const NODE_F = /* glsl */ `
  precision highp float;
  varying vec3 vN; varying vec3 vV; varying float vHub; varying float vWave; varying float vDist;
  uniform vec3 uC1, uC2, uFog; uniform float uFogD;
  void main() {
    float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0);
    vec3 base = mix(uC1, uC2, vHub);
    vec3 col = base * (0.28 + 0.5 * pow(f, 1.6)) + base * pow(f, 3.0) * (0.8 + vWave * 3.0) + base * vWave * (0.9 + vHub * 1.6);
    col += vec3(1.0) * vHub * pow(1.0 - f, 6.0) * 0.5;
    float fog = 1.0 - exp(-uFogD * uFogD * vDist * vDist);
    gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
  }
`;
const EDGE_V = /* glsl */ `
  attribute float aT; attribute float aPh;
  varying float vT; varying float vPh; varying float vWave; varying float vDist;
  uniform vec3 uWaveC; uniform float uWaveR;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec4 mv = viewMatrix * wp;
    vT = aT; vPh = aPh; vDist = -mv.z;
    vWave = exp(-pow((length(wp.xyz - uWaveC) - uWaveR) * 0.16, 2.0));
    gl_Position = projectionMatrix * mv;
  }
`;
const EDGE_F = /* glsl */ `
  precision highp float;
  varying float vT; varying float vPh; varying float vWave; varying float vDist;
  uniform vec3 uC1, uC2; uniform float uTime, uFogD;
  void main() {
    float ph = fract(uTime * 0.3 + vPh);
    float pulse = exp(-pow((ph - vT) * 10.0, 2.0)) * 1.7;
    vec3 col = uC1 * (0.3 + vWave * 1.4) + uC2 * (pulse + vWave * 0.5);
    float fade = exp(-uFogD * uFogD * vDist * vDist * 0.8);
    gl_FragColor = vec4(col * fade, 1.0);
  }
`;
const MOTE_V = /* glsl */ `
  attribute float aSz; varying float vA;
  uniform float uScale, uTime;
  void main() {
    vec3 p = position + vec3(sin(uTime * 0.2 + aSz * 40.0), cos(uTime * 0.17 + aSz * 23.0), sin(uTime * 0.13 + aSz * 11.0)) * 0.8;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float d = max(-mv.z, 0.1);
    gl_PointSize = clamp(aSz * uScale / d, 1.0, 26.0);
    vA = clamp(1.4 - d * 0.012, 0.0, 1.0) * (0.35 + aSz * 0.35);
  }
`;
const MOTE_F = /* glsl */ `
  precision highp float; varying float vA; uniform vec3 uC;
  void main() { vec2 p = gl_PointCoord * 2.0 - 1.0; float r = dot(p, p); float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(uC * a * vA * 1.3, 1.0); }
`;

const cache = new WeakMap();
export const getGraph = singleton(cache, renderer => {
  const scene = new THREE.Scene();
  const bg = new THREE.Color(0.006, 0.012, 0.02);
  scene.background = bg;
  const stage = makeStage(renderer, scene);
  const rnd = seeded(77123);

  // nodes: seven clusters plus loose drifters
  const centers = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.5, r = 22 + rnd() * 20;
    centers.push(V(Math.cos(a) * r, (rnd() - 0.5) * 22, Math.sin(a) * r));
  }
  const nodes = [];
  const gauss = () => (rnd() + rnd() + rnd() - 1.5) * 2;
  centers.forEach((c, ci) => {
    for (let i = 0; i < 38; i++) {
      const hub = i === 0;
      nodes.push({ p: hub ? c.clone() : c.clone().add(V(gauss() * 7, gauss() * 5.5, gauss() * 7)), hub, ci, s: hub ? 1.5 : 0.28 + rnd() * 0.42 });
    }
  });
  for (let i = 0; i < 46; i++) nodes.push({ p: V((rnd() - 0.5) * 140, (rnd() - 0.5) * 50, (rnd() - 0.5) * 140), hub: false, ci: -1, s: 0.2 + rnd() * 0.3 });

  const N = nodes.length;
  const sph = new THREE.IcosahedronGeometry(1, 2);
  const nodeMat = new THREE.ShaderMaterial({
    vertexShader: NODE_V, fragmentShader: NODE_F,
    uniforms: { uC1: { value: new THREE.Color(0.1, 0.5, 0.5) }, uC2: { value: new THREE.Color(1.0, 0.7, 0.4) }, uFog: { value: bg }, uFogD: { value: 0.011 }, uWaveC: { value: new THREE.Vector3() }, uWaveR: { value: -99 } }
  });
  const im = new THREE.InstancedMesh(sph, nodeMat, N);
  const aS = new Float32Array(N), aHub = new Float32Array(N), m4 = new THREE.Matrix4();
  nodes.forEach((n, i) => { m4.compose(n.p, new THREE.Quaternion(), V(n.s, n.s, n.s)); im.setMatrixAt(i, m4); aS[i] = n.s; aHub[i] = n.hub ? 1 : 0; });
  sph.setAttribute('aS', new THREE.InstancedBufferAttribute(aS, 1));
  sph.setAttribute('aHub', new THREE.InstancedBufferAttribute(aHub, 1));
  im.frustumCulled = false;
  scene.add(im);

  // edges: each node to its two nearest in the same cluster, a few long bridges, hubs to hubs
  const ep = [], eT = [], ePh = [];
  const link = (a, b) => {
    const ph = rnd();
    ep.push(a.x, a.y, a.z, b.x, b.y, b.z); eT.push(0, 1); ePh.push(ph, ph);
  };
  nodes.forEach((n, i) => {
    const near = [];
    for (let j = 0; j < N; j++) if (j !== i && (n.ci === nodes[j].ci)) near.push([n.p.distanceToSquared(nodes[j].p), j]);
    near.sort((a, b) => a[0] - b[0]);
    const k = n.hub ? 5 : 2;
    for (let q = 0; q < Math.min(k, near.length); q++) if (i < near[q][1] || rnd() < 0.3) link(n.p, nodes[near[q][1]].p);
    if (!n.hub && rnd() < 0.06) { const o = nodes[Math.floor(rnd() * N)]; if (o !== n) link(n.p, o.p); }
  });
  for (let i = 0; i < 7; i++) for (let j = i + 1; j < 7; j++) if (rnd() < 0.55) link(centers[i], centers[j]);
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
  eg.setAttribute('aT', new THREE.Float32BufferAttribute(eT, 1));
  eg.setAttribute('aPh', new THREE.Float32BufferAttribute(ePh, 1));
  const edgeMat = new THREE.ShaderMaterial({
    vertexShader: EDGE_V, fragmentShader: EDGE_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uC1: nodeMat.uniforms.uC1, uC2: nodeMat.uniforms.uC2, uTime: { value: 0 }, uFogD: nodeMat.uniforms.uFogD, uWaveC: nodeMat.uniforms.uWaveC, uWaveR: nodeMat.uniforms.uWaveR }
  });
  const edges = new THREE.LineSegments(eg, edgeMat); edges.frustumCulled = false;
  scene.add(edges);

  // drifting motes (they turn into soft bokeh when the lens gets close)
  const MN = 520, mp = new Float32Array(MN * 3), ms = new Float32Array(MN);
  for (let i = 0; i < MN; i++) { mp[i * 3] = (rnd() - 0.5) * 150; mp[i * 3 + 1] = (rnd() - 0.5) * 60; mp[i * 3 + 2] = (rnd() - 0.5) * 150; ms[i] = 0.1 + rnd() * 0.6; }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); mg.setAttribute('aSz', new THREE.BufferAttribute(ms, 1));
  const moteMat = new THREE.ShaderMaterial({
    vertexShader: MOTE_V, fragmentShader: MOTE_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uScale: { value: 300 }, uTime: { value: 0 }, uC: { value: new THREE.Color(0.5, 0.8, 0.8) } }
  });
  const motes = new THREE.Points(mg, moteMat); motes.frustumCulled = false;
  scene.add(motes);

  let phase = 0;
  const hubs = nodes.map((n, i) => n.hub ? i : -1).filter(i => i >= 0);

  function rig(tf, o) {
    const { k, lt, u } = shotOf(tf);
    let pos, tgt, fov, roll = 0, zoom = 0, sharp = 0.2;
    const C = centers, ph = phase;
    if (k === 0) {                                    // dolly in through the cluster
      const e = ease(u), c = C[(0 + ph) % 7];
      pos = c.clone().add(V(mix(-34, -9, e), mix(8, 2, e), mix(44, 15, e)));
      tgt = c.clone().add(V(mix(0, 3, e), 0, 0));
      fov = mix(52, 42, e); roll = 0.05 - 0.07 * u; zoom = 0.04;
    } else if (k === 1) {                             // orbit a hub
      const c = C[(1 + ph) % 7], a = 0.5 + u * 1.5, r = mix(26, 15, smooth(u));
      pos = c.clone().add(V(Math.cos(a) * r, mix(7, 3, u), Math.sin(a) * r));
      tgt = c.clone(); fov = 40; roll = 0.02; sharp = 0.14;
    } else if (k === 2) {                             // low lateral track between two clusters
      const e = smooth(u), c1 = C[(2 + ph) % 7], c2 = C[(3 + ph) % 7];
      const m = c1.clone().lerp(c2, e);
      pos = m.clone().add(V(0, -2.5, 16)); pos.x += mix(-6, 6, e);
      tgt = m.clone().add(V(mix(6, 14, e) * Math.sign(c2.x - c1.x || 1), 1, -4));
      fov = 58; roll = -0.04 + 0.06 * u; zoom = 0.035;
    } else if (k === 3) {                             // pull back: the whole graph
      const e = ease(u), a = 0.4 + u * 0.55;
      const r = mix(34, 128, e);
      pos = V(Math.cos(a) * r, mix(8, 46, e), Math.sin(a) * r);
      tgt = V(0, 0, 0); fov = mix(48, 42, e); roll = mix(0.05, -0.02, e); zoom = 0.012; sharp = 0.3;
    } else {                                          // macro with a pulled focus
      const e = smooth(u), c = C[(4 + ph) % 7];
      pos = c.clone().add(V(mix(9, 5.5, e), mix(2.2, 0.8, e), mix(12, 8.5, e)));
      tgt = c.clone().add(V(mix(-0.6, 0.5, e), 0, 0)); fov = mix(34, 26, e); roll = mix(0.04, -0.03, e); sharp = 0.1;
    }
    pos.x += hh(tf, 0.05, 1.4); pos.y += hh(tf, 0.04, 1.1);
    o.pos = pos; o.tgt = tgt; o.fov = fov; o.roll = roll + hh(tf, 0.004); o.zoom = zoom; o.sharp = sharp; o.k = k; o.lt = lt;
    return o;
  }
  function draw(tf, cam) {
    const cyc = Math.floor(tf / 2.5), f = tf - cyc * 2.5;
    const hi = hubs[(cyc + phase) % hubs.length];
    nodeMat.uniforms.uWaveC.value.copy(nodes[hi].p);
    nodeMat.uniforms.uWaveR.value = f * 15 - 4;
    edgeMat.uniforms.uTime.value = tf; moteMat.uniforms.uTime.value = tf;
    moteMat.uniforms.uScale.value = stage.rt.height * 0.5 / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * 0.12;
  }

  return {
    scene, cam: stage.cam, rt: stage.rt,
    setLook(accent, number, seed) {
      const c = new THREE.Color(accent), hsl = {}; c.getHSL(hsl);
      const lin = (h, s, l) => new THREE.Color().setHSL((h + 1) % 1, s, l, THREE.SRGBColorSpace);
      nodeMat.uniforms.uC1.value.copy(lin(hsl.h, 0.5, 0.34));
      nodeMat.uniforms.uC2.value.copy(lin(hsl.h + 0.09, 0.85, 0.62)).multiplyScalar(1.3);
      moteMat.uniforms.uC.value.copy(lin(hsl.h + 0.03, 0.5, 0.6));
      phase = seed % 7;
    },
    render(t, aspect, w, h) { return stage.frame(rig, draw, t, aspect, w, h, null); },
    warm() { renderer.compile(scene, stage.cam); }
  };
});