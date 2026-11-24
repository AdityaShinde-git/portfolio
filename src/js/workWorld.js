import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createReel } from './workReel.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const clamp01 = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const WALK_TURNS = 1.6;
const TOP_Y = 17;
const DROP = 54;
// The strand runs well past the visible camera range at both ends, so its
// open ends are never on screen.
const COLUMN_BOTTOM = -66;
const COLUMN_TOP = 48;
const INTRO_SECONDS = 3.4;
const CAMERA_PHASE = 0.72;

const ACCENTS = [0x3fd0c4, 0xff5a4f, 0xe0a860, 0x8a7bff, 0x6fe0c0, 0xf06fb0];

// Used only if no projects are passed. Real usage: options.projects.
const DEFAULT_PROJECTS = [
  { title: 'Project one', subtitle: 'Selected work', period: '2025', tech: ['THREE.JS'], progress: 0.34 },
  { title: 'Project two', subtitle: 'Selected work', period: '2025', tech: ['NODE'], progress: 0.7 }
];

const hash3 = (x, y, z) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};
const valueNoise = (x, y, z) => {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u), l(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u), v),
    l(l(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u), l(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u), v),
    w
  );
};
const fbm = (x, y, z) =>
  valueNoise(x, y, z) * 0.55 + valueNoise(x * 2.1, y * 2.1, z * 2.1) * 0.28 + valueNoise(x * 4.3, y * 4.3, z * 4.3) * 0.17;

/* ---- the strand: a thick, sculpted chrome spine with fused ropes twisting round it ---- */

// the centre line drifts gently so the strand never reads as a perfect cylinder
const wanderX = y => Math.sin(y * 0.13) * 0.7 + Math.sin(y * 0.31 + 2) * 0.25;
const wanderZ = y => Math.cos(y * 0.11) * 0.7 + Math.cos(y * 0.27) * 0.25;

// stacked vertebrae: each one swells in the middle and pinches to a narrow joint, so the column reads as bone
const SEG = 3.7;
const STRAND_SCALE = 1.4; // the column is the dominant structure of the scene
const segHash = id => {
  const s = Math.sin(id * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
};
const spineBase = y => {
  const s = y / SEG, f = s - Math.floor(s);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const body = sm(0, 0.11, f) * (1 - sm(0.89, 1, f)); // a flat-sided disc with a deep, narrow groove at each joint
  const lip = 0.07 * (Math.exp(-Math.pow((f - 0.26) / 0.05, 2)) + Math.exp(-Math.pow((f - 0.74) / 0.05, 2)));
  return STRAND_SCALE * (1.0 + 0.95 * body + lip) * (1 + 0.08 * Math.sin(s * 1.9) + 0.04 * Math.sin(s * 5.3 + 1));
};
// distance from the centre line to the surface at height y, angle a
const spineRadius = (y, a) => {
  const s = y / SEG, f = s - Math.floor(s), id = Math.floor(s);
  const bump = Math.sin(Math.PI * f);
  const flute = 1 + 0.05 * Math.sin(a * 5 + y * 0.9) + 0.03 * Math.sin(a * 3 - y * 1.7);
  const lump = (fbm(Math.cos(a) * 1.6 + 5.2, y * 0.6, Math.sin(a) * 1.6 - 2.0) - 0.45) * 0.55;
  // bony processes: a pair of wings that turns a little on every vertebra
  const a0 = id * 2.39 + segHash(id) * 1.2;
  const wing = (Math.pow(Math.abs(Math.cos(a - a0)), 12) * (0.5 + 0.6 * segHash(id + 7)) + Math.pow(Math.abs(Math.sin(a - a0)), 14) * 0.2) * bump * bump * 0.8;
  const micro = (fbm(Math.cos(a) * 5.0 + 1.3, y * 2.2, Math.sin(a) * 5.0 + 9.1) - 0.45) * 0.14
    + (fbm(Math.cos(a) * 11.0 + 3.7, y * 5.0, Math.sin(a) * 11.0 - 6.2) - 0.45) * 0.07;
  // crystalline faceting: each vertebra is a six-sided prism, turned a little from its neighbour, with fine ribs
  const sm = (lo, hi, x) => { const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo))); return t * t * (3 - 2 * t); };
  const body = sm(0, 0.11, f) * (1 - sm(0.89, 1, f));
  const u = (((a - id * 0.55) / (Math.PI / 3)) % 1 + 1) % 1;
  const facet = 1 / Math.cos((u - 0.5) * (Math.PI / 3));
  const ribs = Math.pow(Math.abs(Math.sin(a * 9 + id)), 3) * 0.07 * body;
  return spineBase(y) * flute * (1 + (facet - 1) * 0.62 * body) + (lump * 0.7 + wing + micro + ribs) * STRAND_SCALE * 0.9;
};

const FILAMENTS = [
  // five fused ropes: thick, riding the surface of the spine
  ...Array.from({ length: 5 }, (_, k) => ({
    phase: (k / 5) * Math.PI * 2, twist: 0.36, rel: 0.97, off: 0.12, amp: 0.22, freq: 0.23, seed: k, thick: 0.2, thickAmp: 0.15
  })),
  // three finer counter-twisting strands standing off the surface
  ...Array.from({ length: 3 }, (_, k) => ({
    phase: (k / 3) * Math.PI * 2 + 0.5, twist: -0.52, rel: 1.0, off: 0.6, amp: 0.4, freq: 0.17, seed: k + 8, thick: 0.075, thickAmp: 0.045
  })),
  // hairline wires, wide and loose
  ...Array.from({ length: 3 }, (_, k) => ({
    phase: (k / 3) * Math.PI * 2 + 1.1, twist: 0.8, rel: 1.0, off: 1.0, amp: 0.5, freq: 0.13, seed: k + 14, thick: 0.02, thickAmp: 0.01
  }))
];
const filAngle = (f, y) => y * f.twist + f.phase + 0.5 * Math.sin(y * 0.11 + f.seed * 1.3);
const filOrbit = (f, y) => spineBase(y) * f.rel + f.off + f.amp * Math.sin(y * f.freq + f.seed * 1.9) + 0.1 * Math.sin(y * 0.9 + f.seed);
// ropes swell into soft beads every so often
const filThick = (f, y) => f.thick + f.thickAmp * Math.pow(0.5 + 0.5 * Math.sin(y * 0.8 + f.seed * 1.7), 2.2);
const filPoint = (f, y, out) => {
  const a = filAngle(f, y), r = filOrbit(f, y);
  return out.set(wanderX(y) + Math.cos(a) * r, y, wanderZ(y) + Math.sin(a) * r);
};

// sweeps a circle of varying radius along one filament
function buildFilamentGeometry(f, y0, y1, steps, radial) {
  const P = new THREE.Vector3(), Pa = new THREE.Vector3(), Pb = new THREE.Vector3();
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  const positions = new Float32Array((steps + 1) * radial * 3);
  const dy = (y1 - y0) / steps;
  let o = 0;
  for (let i = 0; i <= steps; i += 1) {
    const y = y0 + i * dy;
    filPoint(f, y, P);
    filPoint(f, y - dy, Pa);
    filPoint(f, y + dy, Pb);
    T.subVectors(Pb, Pa).normalize();
    N.set(P.x - wanderX(y), 0, P.z - wanderZ(y)).normalize();
    N.addScaledVector(T, -N.dot(T)).normalize();
    B.crossVectors(T, N);
    const r = filThick(f, y);
    for (let j = 0; j < radial; j += 1) {
      const phi = (j / radial) * Math.PI * 2;
      const c = Math.cos(phi) * r, s = Math.sin(phi) * r;
      positions[o++] = P.x + N.x * c + B.x * s;
      positions[o++] = P.y + N.y * c + B.y * s;
      positions[o++] = P.z + N.z * c + B.z * s;
    }
  }
  const indices = [];
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * radial + j, b = i * radial + ((j + 1) % radial);
      const c = (i + 1) * radial + j, d = (i + 1) * radial + ((j + 1) % radial);
      indices.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// seeded random so the strand looks the same on every load
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A dark studio with a few coloured light strips. Chrome is mostly a mirror, so what it reflects
// is what you see: black with clean teal, pink, violet and white streaks running through it.
function buildStudioEnvironment() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x010204);
  const strip = (hex, gain, w, h, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(gain), side: THREE.DoubleSide })
    );
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  strip(0x4fa3b8, 4.5, 16, 3, -15, 6, 7);    // cold teal, left
  strip(0xa8559a, 2.2, 3, 20, 16, 2, -4);    // dusky magenta, right edge
  strip(0x5a4fc0, 4.0, 22, 3, 0, 13, -14);   // violet, above and behind
  strip(0x8a6a50, 2.0, 12, 2.5, 8, -11, 12); // faint warm, low front
  strip(0xc8d8e8, 6.0, 3, 15, -6, 3, 16);    // thin pale key strip, front left
  return scene;
}

// a faint cool rim on the metal edges: the only "glow" the strand itself has
const addRim = shader => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <emissivemap_fragment>',
    `#include <emissivemap_fragment>
     float rimF = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.5);
     totalEmissiveRadiance += vec3(0.16, 0.34, 0.42) * rimF * 0.6;`
  );
};

// dust: sparse clouds of fine beads (blue, violet, rose, teal, a little green), muted
const DUST_PALETTE = [0x4f6fe0, 0x8f6ad0, 0xcf6fa8, 0x45b5a5, 0x72c283, 0xb9c6d8].map(h => new THREE.Color(h));

const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPx;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vC;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.17 + aSeed * 31.0) * 0.12;
    p.z += cos(uTime * 0.15 + aSeed * 17.0) * 0.12;
    p.y += sin(uTime * 0.3 + aSeed * 40.0) * 0.14;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, uPx * aSize * (26.0 / -mv.z));
    vC = aColor;
    vA = 0.55 + 0.45 * fract(aSeed * 13.7);
  }
`;
const DUST_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec3 vC;
  varying float vA;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    if (r2 > 1.0) discard;
    vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
    vec3 L = normalize(vec3(-0.4, 0.6, 0.7));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);
    vec3 col = vC * (0.32 + 0.8 * diff) + vec3(1.0) * spec * 0.45;
    gl_FragColor = vec4(col, vA * uFade * smoothstep(1.0, 0.82, sqrt(r2)));
  }
`;

// motes: slow points of light that travel up the braid, a little warm, a little cool
const MOTE_BOTTOM = -50;
const MOTE_TOP = 28;
const MOTE_PALETTE = [0xf2d9a8, 0xf2d9a8, 0xbfe6f2, 0xbfe6f2, 0xbfe6f2].map(h => new THREE.Color(h));

const MOTE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPx;
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aColor;
  varying vec3 vC;
  varying float vA;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * aSize * (26.0 / -mv.z);
    float tw = 0.6 + 0.4 * sin(uTime * (0.8 + fract(aPhase * 7.0)) + aPhase * 6.2832);
    float edge = smoothstep(-50.0, -42.0, position.y) * smoothstep(28.0, 20.0, position.y);
    vC = aColor;
    vA = tw * edge;
  }
`;
const MOTE_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec3 vC;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float halo = smoothstep(0.5, 0.0, d);
    vec3 col = vC * (0.9 + 1.1 * smoothstep(0.16, 0.0, d));
    gl_FragColor = vec4(col, halo * halo * vA * uFade);
  }
`;

/* Clipped-corner (chamfer) outline: the HUD-glass silhouette. */
function chamferShape(w, h, c) {
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + c, y);
  s.lineTo(x + w - c, y);
  s.lineTo(x + w, y + c);
  s.lineTo(x + w, y + h - c);
  s.lineTo(x + w - c, y + h);
  s.lineTo(x + c, y + h);
  s.lineTo(x, y + h - c);
  s.lineTo(x, y + c);
  s.closePath();
  return s;
}

function wrapLines(c, text, maxW, maxLines) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (c.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{0,2}$/, '…');
  }
  return lines;
}

/*
 * Generated panel art, used when a project has no screenshot (and while one
 * loads). Big outlined index, wrapped title, period, tech chips, grid, scan bars.
 */
const PANEL_SANS = '"Chakra Petch","Space Grotesk","JetBrains Mono",Menlo,Consolas,monospace';
const PANEL_MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,"Courier New",monospace';
const hexRgb = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/*
 * Panel art (shown on the strand and, enlarged, in the case-study view).
 * A quiet dark glass plate: a braid of thin lines echoing the strand, hairline meta row,
 * Chakra Petch title, pill chips, soft accent bloom and a little grain.
 * Drawn into an existing canvas so it can be redrawn once the web font has loaded.
 */
function drawPanelArt(canvas, project, index, total, accentHex) {
  const W = canvas.width, H = canvas.height;
  const c = canvas.getContext('2d');
  const [ar, ag, ab] = hexRgb(accentHex);
  const A = a => `rgba(${ar},${ag},${ab},${a})`;
  const pad2 = v => String(v).padStart(2, '0');
  const rnd = seededRandom(index * 977 + 13);
  const L = 80; // left/right margin

  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, W, H);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.shadowBlur = 0;
  c.letterSpacing = '0px';

  // base + blooms
  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#060a10');
  bg.addColorStop(1, '#0c141b');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  const bloomA = c.createRadialGradient(W * 0.86, H * 0.1, 0, W * 0.86, H * 0.1, 780);
  bloomA.addColorStop(0, A(0.5));
  bloomA.addColorStop(1, A(0));
  c.fillStyle = bloomA;
  c.fillRect(0, 0, W, H);
  const bloomB = c.createRadialGradient(W * 0.05, H, 0, W * 0.05, H, 640);
  bloomB.addColorStop(0, A(0.3));
  bloomB.addColorStop(1, A(0));
  c.fillStyle = bloomB;
  c.fillRect(0, 0, W, H);

  c.fillStyle = A(0.14); // the whole face carries the project's colour
  c.fillRect(0, 0, W, H);

  // braid: thin strands twisting round a hairline core, fading out top and bottom
  const cx = W * 0.8;
  for (let k = 0; k < 5; k += 1) {
    const g = c.createLinearGradient(0, 0, 0, H);
    const a = 0.3 - k * 0.04;
    g.addColorStop(0, A(0));
    g.addColorStop(0.3, A(a));
    g.addColorStop(0.72, A(a));
    g.addColorStop(1, A(0));
    c.strokeStyle = g;
    c.lineWidth = k < 3 ? 2.2 : 1.1;
    c.beginPath();
    for (let y = -10; y <= H + 10; y += 5) {
      const amp = (92 + k * 16) * (0.55 + 0.45 * Math.sin(y * 0.004 + k));
      const x = cx + Math.sin(y * 0.0105 + k * 1.37 + index * 0.9) * amp;
      if (y === -10) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,0.07)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(cx, 0);
  c.lineTo(cx, H);
  c.stroke();

  // grain
  for (let i = 0; i < 2600; i += 1) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : A(0.06);
    c.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
  }

  // outlined index, low and to the right
  c.font = `500 300px ${PANEL_SANS}`;
  c.textAlign = 'right';
  c.lineWidth = 1.5;
  c.strokeStyle = A(0.16);
  c.strokeText(pad2(index + 1), W - 64, H - 86);
  c.textAlign = 'left';

  // meta row + hairline
  c.font = `500 19px ${PANEL_MONO}`;
  c.letterSpacing = '3px';
  c.fillStyle = A(0.95);
  c.fillText(`PROJECT ${pad2(index + 1)} — ${pad2(total)}`, L, 92);
  c.fillStyle = '#7f93a0';
  c.textAlign = 'right';
  c.fillText(String(project.period || '').toUpperCase(), W - L, 92);
  c.textAlign = 'left';
  c.strokeStyle = 'rgba(255,255,255,0.12)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(L, 118);
  c.lineTo(W - L, 118);
  c.stroke();
  c.strokeStyle = A(0.95);
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(L, 118);
  c.lineTo(L + 120, 118);
  c.stroke();

  // title
  c.font = `500 74px ${PANEL_SANS}`;
  c.letterSpacing = '1.5px';
  const title = String(project.title ?? project.label ?? 'UNTITLED').toUpperCase();
  const lines = wrapLines(c, title, 800, 3);
  const lineH = 88;
  const top = 270;
  c.fillStyle = '#f2f7fa';
  c.shadowColor = A(0.45);
  c.shadowBlur = 24;
  lines.forEach((l, i) => c.fillText(l, L, top + i * lineH));
  c.shadowBlur = 0;

  // subtitle
  const subY = top + (lines.length - 1) * lineH + 62;
  c.fillStyle = A(0.95);
  c.fillRect(L, subY - 7, 36, 2);
  c.font = `500 21px ${PANEL_MONO}`;
  c.letterSpacing = '2.5px';
  c.fillStyle = '#93a7b4';
  c.fillText(fitText(c, String(project.subtitle || '').toUpperCase(), 760), L + 56, subY);

  // tech chips
  c.font = `600 15px ${PANEL_MONO}`;
  c.letterSpacing = '1.5px';
  let chipX = L;
  const chipY = H - 128;
  for (const t of (project.tech || []).slice(0, 6)) {
    const label = String(t).toUpperCase();
    const w = c.measureText(label).width + 32;
    if (chipX + w > W - 300) break;
    roundRectPath(c, chipX, chipY, w, 38, 19);
    c.fillStyle = A(0.1);
    c.fill();
    c.strokeStyle = A(0.5);
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = '#dbe6ec';
    c.fillText(label, chipX + 16, chipY + 25);
    chipX += w + 10;
  }
  c.letterSpacing = '0px';

  // bottom hairline
  const hl = c.createLinearGradient(L, 0, W - L, 0);
  hl.addColorStop(0, A(0.9));
  hl.addColorStop(0.55, A(0.12));
  hl.addColorStop(1, A(0));
  c.fillStyle = hl;
  c.fillRect(L, H - 58, W - 2 * L, 2);

  // corner brackets
  c.strokeStyle = A(0.85);
  c.lineWidth = 2;
  const b = 30, m = 34;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    c.beginPath();
    c.moveTo(x, y + sy * b);
    c.lineTo(x, y);
    c.lineTo(x + sx * b, y);
    c.stroke();
  });
}

function createPanelTexture(project, index, total, accentHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 800;
  drawPanelArt(canvas, project, index, total, accentHex);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* ------------------------------------------------------------------ */
/*  Shaders                                                            */
/* ------------------------------------------------------------------ */

function fitText(c, text, maxW) {
  let t = String(text);
  if (c.measureText(t).width <= maxW) return t;
  while (t.length > 1 && c.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

/*
 * Beat-driven art for the focused panel. While a case study is open the panel
 * stops being a poster and becomes the exhibit:
 *   kind 'areas' → a module map (hub + labelled nodes, active node lit)
 *   kind 'list'  → a minimap of the current section with the active row lit
 */
function drawStudyTexture(canvas, project, index, total, accentHex, state) {
  const W = canvas.width, H = canvas.height;
  const c = canvas.getContext('2d');
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  const mono = '"JetBrains Mono","SF Mono",Menlo,Consolas,"Courier New",monospace';
  const pad2 = v => String(v).padStart(2, '0');
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  c.clearRect(0, 0, W, H);

  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0e14');
  bg.addColorStop(1, '#10181d');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);
  const glow = c.createRadialGradient(W * 0.8, H * 0.18, 0, W * 0.8, H * 0.18, 700);
  glow.addColorStop(0, `${accent}44`);
  glow.addColorStop(1, '#00000000');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(255,255,255,0.045)';
  c.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y <= H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

  // header
  c.fillStyle = accent;
  c.font = `600 20px ${mono}`;
  c.fillText(`CASE STUDY ${pad2(index + 1)} / ${pad2(total)}`, 80, 96);
  c.fillStyle = '#8f98a8';
  c.textAlign = 'right';
  c.fillText(`${pad2(state.beat)} / ${pad2(state.beats)}`, W - 80, 96);
  c.textAlign = 'left';
  c.fillStyle = '#eef2f6';
  c.font = `700 30px ${mono}`;
  c.fillText(String(state.section).toUpperCase(), 80, 158);

  const items = state.items || [];
  const active = state.active ?? 0;
  const activeEnd = state.activeEnd ?? active; // a page of the case study can light several rows

  if (state.kind === 'areas') {
    const k = Math.max(1, items.length);
    const hx = W / 2, hy = 480, rx = 380, ry = 200;
    const nodes = items.map((label, i) => {
      const a = -Math.PI / 2 + (i / k) * Math.PI * 2;
      c.font = `600 19px ${mono}`;
      const text = fitText(c, String(label).toUpperCase(), 300);
      const w = c.measureText(text).width + 32;
      const x = Math.max(80 + w / 2, Math.min(W - 80 - w / 2, hx + Math.cos(a) * rx));
      const y = hy + Math.sin(a) * ry;
      return { text, w, x, y };
    });
    nodes.forEach((n, i) => {
      const on = i === active;
      c.strokeStyle = on ? accent : 'rgba(255,255,255,0.14)';
      c.lineWidth = on ? 3 : 1.5;
      c.shadowColor = on ? accent : 'transparent';
      c.shadowBlur = on ? 18 : 0;
      c.beginPath(); c.moveTo(hx, hy); c.lineTo(n.x, n.y); c.stroke();
      c.shadowBlur = 0;
    });
    c.fillStyle = '#0b1016';
    c.strokeStyle = accent;
    c.lineWidth = 2.5;
    c.beginPath(); c.arc(hx, hy, 46, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = accent;
    c.font = `700 17px ${mono}`;
    c.textAlign = 'center';
    c.fillText('CORE', hx, hy + 6);
    nodes.forEach((n, i) => {
      const on = i === active;
      c.fillStyle = '#0b1016';
      c.fillRect(n.x - n.w / 2, n.y - 22, n.w, 44);
      if (on) { c.fillStyle = `${accent}33`; c.fillRect(n.x - n.w / 2, n.y - 22, n.w, 44); }
      c.strokeStyle = on ? accent : 'rgba(255,255,255,0.28)';
      c.lineWidth = on ? 3 : 1.5;
      c.shadowColor = on ? accent : 'transparent';
      c.shadowBlur = on ? 22 : 0;
      c.strokeRect(n.x - n.w / 2, n.y - 22, n.w, 44);
      c.shadowBlur = 0;
      c.fillStyle = on ? '#ffffff' : '#8f98a8';
      c.font = `600 19px ${mono}`;
      c.fillText(n.text, n.x, n.y + 7);
    });
    c.textAlign = 'left';
  } else {
    // outlined step numeral behind the rows
    c.font = `700 340px ${mono}`;
    c.lineWidth = 2;
    c.strokeStyle = `${accent}38`;
    c.strokeText(pad2(active + 1), 800, 700);

    const rows = 7;
    const start = Math.max(0, Math.min(active - 1, Math.max(0, items.length - rows)));
    for (let r = 0; r < rows && start + r < items.length; r += 1) {
      const i = start + r;
      const y = 215 + r * 72;
      const on = i >= active && i <= activeEnd;
      if (on) {
        c.fillStyle = `${accent}22`;
        c.fillRect(80, y, W - 160, 56);
        c.fillStyle = accent;
        c.fillRect(80, y, 6, 56);
      }
      c.fillStyle = on ? accent : '#566070';
      c.font = `600 22px ${mono}`;
      c.fillText(pad2(i + 1), 108, y + 36);
      c.fillStyle = on ? '#eef2f6' : '#6c7686';
      c.font = `${on ? 600 : 500} 20px ${mono}`;
      c.fillText(fitText(c, String(items[i]).toUpperCase(), 900), 176, y + 35);
      if (on) {
        c.fillStyle = accent;
        c.textAlign = 'right';
        c.font = `700 24px ${mono}`;
        c.fillText(state.symbol || '>', W - 108, y + 36);
        c.textAlign = 'left';
      }
    }
  }

  // progress segments
  const steps = Math.max(1, items.length);
  const segGap = 8;
  const segW = (W - 160 - segGap * (steps - 1)) / steps;
  for (let i = 0; i < steps; i += 1) {
    c.fillStyle = i <= activeEnd ? accent : 'rgba(255,255,255,0.14)';
    c.fillRect(80 + i * (segW + segGap), H - 70, segW, 6);
  }

  // corner brackets
  c.strokeStyle = accent;
  c.lineWidth = 3;
  const b = 34, m = 30;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    c.beginPath();
    c.moveTo(x, y + sy * b);
    c.lineTo(x, y);
    c.lineTo(x + sx * b, y);
    c.stroke();
  });
}

/* Soft radial falloff used for the glow behind each panel (no hard rectangle). */
function createGlowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  c.fillStyle = '#000';
  c.fillRect(0, 0, size, size);
  const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, '#8a8a8a');
  g.addColorStop(0.65, '#1c1c1c');
  g.addColorStop(1, '#000000');
  c.fillStyle = g;
  c.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const TRAIL_N = 24;

// The cursor's recent path over the panel is a list of points that fade out. Their soft glow is a smooth
// field; the card's particles are pushed along it and flow back as it fades. Nothing here has an edge.
const FLOW_GLSL = /* glsl */ `
  #define TRAIL_N ${TRAIL_N}
  uniform vec3 uTrail[TRAIL_N];   // xy = uv on the card, z = strength 0..1
  uniform float uAspect;
  uniform float uOn;              // 0 while the cursor has left no trail: the field costs nothing
  float fHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float fNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(fHash(i), fHash(i + vec2(1.0, 0.0)), f.x), mix(fHash(i + vec2(0.0, 1.0)), fHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  // x: strength 0..1, yz: summed push direction (away from the path)
  vec3 flowField(vec2 uv) {
    if (uOn < 0.5) return vec3(0.0);
    float f = 0.0;
    vec2 dv = vec2(0.0);
    for (int i = 0; i < TRAIL_N; i++) {
      vec3 tr = uTrail[i];
      vec2 d = (uv - tr.xy) * vec2(uAspect, 1.0);
      float w = tr.z * exp(-dot(d, d) * 70.0);
      f += w;
      dv += d * w;
    }
    return vec3(1.0 - exp(-f * 1.4), dv);
  }
`;

const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SCREEN_FRAG = FLOW_GLSL + /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uVel;
  uniform float uHover;
  uniform float uReveal;
  uniform float uGlitch;
  uniform float uFocus;
  uniform float uDissolve;
  uniform float uPart;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;

    float row = floor(uv.y * 34.0 + floor(uTime * 8.0));
    float tear = step(0.965, hash(vec2(row, floor(uTime * 8.0)))) * uGlitch;
    uv.x += tear * 0.025;

    float calm = 1.0 - 0.85 * uFocus;
    float split = (0.0012 + uVel * 0.006 + uHover * 0.004 + uGlitch * 0.004) * calm;
    vec3 col;
    col.r = texture2D(uMap, uv + vec2(split, 0.0)).r;
    col.g = texture2D(uMap, uv).g;
    col.b = texture2D(uMap, uv - vec2(split, 0.0)).b;

    col *= 0.96 + 0.04 * calm * sin(uv.y * 900.0) + 0.04 * (1.0 - calm);
    col += (hash(uv * 900.0 + uTime) - 0.5) * 0.016 * calm;

    // a bright scan sweep that crosses the glass while hovered
    float sweep = exp(-pow((fract(uTime * 0.35) - uv.y) * 14.0, 2.0));
    col += uAccent * 0.28 * uHover * sweep;

    vec2 e = abs(uv - 0.5) * 2.0;
    col *= 1.0 - 0.28 * smoothstep(0.55, 1.15, max(e.x, e.y));
    col *= mix(0.78, 1.12, uHover);
    col *= 1.0 + 0.12 * uFocus; // case-study panel: a touch brighter and crisp
    col = mix(col, col * 0.85 + uAccent * 0.18, uFocus * 0.45); // the panel takes a hint of the project's colour
    // a faint diagonal sheen drifting across the glass
    float band = abs(fract(vUv.x * 0.7 + vUv.y * 0.35 - uTime * 0.035) - 0.5);
    col += uAccent * 0.032 * smoothstep(0.05, 0.0, band);

    // while the panel flies in or out it breaks into square flecks, edges first
    vec2 cell = floor(vUv * vec2(56.0, 35.0));
    float order = hash(cell) * 0.65 + length(vUv - 0.5) * 0.7;
    float th = uDissolve * 1.35;
    float alive = step(th, order);
    col += uAccent * 1.5 * smoothstep(th + 0.14, th, order) * alive * smoothstep(0.0, 0.04, uDissolve);

    // once the panel is open, its pixels are carried by the particle layer instead (see _buildShed)
    float fm = flowField(vUv).x;
    float mg = fm * fm * (3.0 - 2.0 * fm);
    col += mix(uAccent, vec3(1.0), 0.4) * 0.3 * (4.0 * mg * (1.0 - mg)); // a faint glow along the melting edge
    gl_FragColor = vec4(col * uReveal, uReveal * alive * (1.0 - mg));
  }
`;

// the opened card: a fine grid of beads, each carrying one pixel of the panel. Near the cursor they lift,
// drift and swirl, then ease back into place as the trail fades.
const SHED_VERT = FLOW_GLSL + /* glsl */ `
  uniform sampler2D uMap;
  uniform mat4 uCardMat;
  uniform vec3 uAccent;
  uniform vec3 uPlate;
  uniform float uTime;
  uniform float uK;
  uniform float uFade;
  uniform float uCell;
  attribute vec2 aUv;
  attribute float aSeed;
  varying vec3 vCol;
  varying float vA;
  varying float vM;
  void main() {
    vec3 fl = flowField(aUv);
    float s = fl.x;
    float mag = s * s * (3.0 - 2.0 * s);
    float sd = aSeed * 6.2831;
    float dl = length(fl.yz);
    vec2 dir = mix(vec2(cos(sd), sin(sd)), fl.yz / (dl + 1e-5), smoothstep(0.0, 0.05, dl));
    float sc = pow(fract(aSeed * 7.13), 2.2);
    vA = uFade * smoothstep(0.02, 0.3, mag) * (1.0 - 0.55 * mag) * (1.0 - 0.7 * sc * mag);
    if (vA < 0.004) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vCol = vec3(0.0); vM = 0.0; return; }
    vec2 q = aUv * vec2(uAspect, 1.0);
    // a smooth, shared swirl: neighbours move together, so the flow looks like a fluid, not static
    vec2 n2 = vec2(fNoise(q * 2.2 + uTime * 0.18), fNoise(q * 2.2 - uTime * 0.15 + 9.0)) - 0.5;
    // a few particles travel far, most only a little: the cloud thins out smoothly instead of ending at an edge
    vec2 off = dir * mag * 0.45 + vec2(cos(sd), sin(sd)) * sc * mag * 1.7 + n2 * mag * 1.1;
    vec2 local0 = (aUv - 0.5) * vec2(6.6, 4.125);
    vec2 local = local0 + off;
    float lift = 0.03 + mag * (0.1 + sc * 1.1);
    vec4 mv = viewMatrix * (uCardMat * vec4(local, lift, 1.0));
    gl_Position = projectionMatrix * mv;
    float breathe = 0.95 + 0.05 * sin(uTime * 1.3 + aSeed * 40.0);
    gl_PointSize = max(1.4, uCell * 1.34 * breathe * (1.0 - 0.35 * mag) * (1.0 - 0.4 * sc * mag) * uK / -mv.z);

    // inside the art: the panel's own pixels. In the band round it: the glass frame, also made of beads.
    vec2 ex = abs(local0) - vec2(3.3, 2.0625);
    vec3 tex;
    float fa = 1.0;
    if (ex.x > 0.0 || ex.y > 0.0) {
      tex = uPlate * 1.05;
      fa = step(ex.x + ex.y, 0.67); // the plate's clipped corners
    } else {
      tex = texture2D(uMap, aUv).rgb;
      vec2 cr = vec2(3.3, 2.0625) - abs(local0);
      fa = step(0.4, cr.x + cr.y); // the card's clipped corners
      vec2 e = abs(aUv - 0.5) * 2.0;
      tex *= 1.0 - 0.28 * smoothstep(0.55, 1.15, max(e.x, e.y));
    }
    vCol = mix(tex * 1.45, tex * 1.15 + uAccent * 0.2, 0.45) * (1.0 + 0.3 * mag) + uAccent * 0.3 * mag * sc;
    vM = mag;
    vA *= fa;
  }
`;
const SHED_FRAG = /* glsl */ `
  varying vec3 vCol;
  varying float vA;
  varying float vM;
  void main() {
    vec2 c = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(c, c);
    if (r2 > 1.0 || vA < 0.01) discard;
    vec3 n = vec3(c.x, -c.y, sqrt(1.0 - r2));
    vec3 L = normalize(vec3(-0.45, 0.6, 0.65));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 26.0);
    float w = mix(0.1, 0.65, vM);
    vec3 col = vCol * (1.0 - w + w * (0.35 + 0.95 * diff)) + vec3(0.8, 0.9, 1.0) * spec * w * 0.45;
    gl_FragColor = vec4(col, vA * smoothstep(1.0, 0.8, sqrt(r2)));
  }
`;

const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uProgress;
  uniform float uVel;
  uniform float uPx;
  attribute float aSeed;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float range = 64.0;
    float rise = uTime * (0.2 + aSeed * 0.45) + uProgress * (14.0 + aSeed * 24.0);
    p.y = mod(p.y + 42.0 + rise, range) - 42.0;

    float a = uTime * 0.025 * (aSeed - 0.5) * 2.0;
    float s = sin(a), c = cos(a);
    p.xz = mat2(c, -s, s, c) * p.xz;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPx * (0.7 + aSeed * 1.9) * (30.0 / -mv.z) * (1.0 + uVel * 1.6);

    vec3 warm = vec3(1.0, 0.66, 0.3);
    vec3 cool = vec3(0.38, 0.82, 0.92);
    vColor = mix(warm, cool, step(0.55, fract(aSeed * 7.31)));
    vAlpha = 0.25 + aSeed * 0.5;
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * uFade;
    gl_FragColor = vec4(vColor, a);
  }
`;

/* The case-study "ink": a screen-space particle field that answers the pointer.
 * Particles live in NDC (so it fills any aspect ratio), sit behind the panel in depth,
 * burst outward from the panel when a study opens and fall back into it when it closes. */
const INK_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPx;
  uniform float uReveal;
  uniform vec2 uTan;
  uniform vec2 uMouse;
  uniform vec2 uMouseVel;
  uniform vec2 uOrigin;
  uniform vec3 uColA;
  uniform vec3 uColB;
  uniform vec3 uColC;
  attribute vec2 aNdc;
  attribute float aDepth;
  attribute float aSize;
  attribute vec3 aRnd;
  varying vec3 vC;
  varying float vA;

  void main() {
    vec2 p = aNdc;
    // slow drift, so the field is never still
    p += 0.012 * vec2(sin(uTime * 0.23 + aRnd.y * 40.0), cos(uTime * 0.19 + aRnd.x * 35.0));

    // the pointer pushes particles away and drags them along its path
    vec2 asp = vec2(uTan.x / uTan.y, 1.0);
    vec2 d = (p - uMouse) * asp;
    float fall = exp(-dot(d, d) * 14.0);
    p += normalize(d + vec2(1e-4)) / asp * fall * (0.1 + 0.08 * aRnd.z);
    p += uMouseVel * fall * (0.3 + aRnd.x * 0.4);

    // burst from the panel (staggered per particle)
    float k = clamp(uReveal * 1.5 - aRnd.z * 0.5, 0.0, 1.0);
    k = 1.0 - pow(1.0 - k, 3.0);
    vec2 start = uOrigin + (aRnd.xy - 0.5) * 0.3;
    p = mix(start, p, k);

    vec3 v = vec3(p * uTan * aDepth, -aDepth);
    gl_Position = projectionMatrix * vec4(v, 1.0);
    gl_PointSize = uPx * aSize * (14.0 / aDepth) * (0.4 + 0.6 * k) * (1.0 + 0.5 * fall);

    float pick = fract(aRnd.x * 13.7);
    vec3 col = pick < 0.46 ? uColA
             : pick < 0.78 ? uColB
             : pick < 0.88 ? uColC
             : pick < 0.95 ? vec3(0.006, 0.006, 0.008)
             : vec3(0.32, 0.33, 0.36) * (0.5 + 0.5 * aRnd.y);
    vC = col * (0.85 + 0.3 * aRnd.y);
    vA = k * (0.45 + 0.5 * fract(aRnd.y * 9.1));
  }
`;

const INK_FRAG = /* glsl */ `
  varying vec3 vC;
  varying float vA;
  void main() {
    vec2 p = abs(gl_PointCoord - 0.5);
    float h = max(p.x * 0.8660254 + p.y * 0.5, p.y); // regular hexagon
    if (h > 0.433) discard;
    gl_FragColor = vec4(vC, smoothstep(0.433, 0.34, h) * vA);
  }
`;

const LookShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVel: { value: 0 },
    uGrain: { value: 0.028 },
    uAberration: { value: 0.0006 },
    uIntro: { value: 0 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVel;
    uniform float uGrain;
    uniform float uAberration;
    uniform float uIntro;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = dot(dir, dir);
      float ca = uAberration + uVel * 0.0035 * (0.4 + dist * 2.0);
      // intro: a soft iris opens from the centre of the strand
      float r = length(dir * vec2(1.6, 1.0));
      float open = uIntro * 1.55;
      float iris = smoothstep(open - 0.42, open, r + hash(vUv * 40.0) * 0.015);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + dir * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - dir * ca).b;
      col += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 91.0) - 0.5) * uGrain;
      col *= 1.0 - smoothstep(0.25, 0.95, dist * 1.9) * 0.55;
      col *= (1.0 - iris) * smoothstep(0.0, 0.18, uIntro);
      gl_FragColor = vec4(col, 1.0);
    }
  `
};

/* ------------------------------------------------------------------ */
/*  WorkWorld                                                          */
/* ------------------------------------------------------------------ */

export class WorkWorld {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLElement} scrollArea       receives the pointer cursor; sits above the canvas
   * @param {() => number} getProgress     scroll progress, 0..1
   * @param {object} [options]
   * @param {Array<{title?:string,subtitle?:string,period?:string,tech?:string[],progress:number,accent?:number,image?:string|null,href?:string}>} [options.projects]
   *   `progress` is the scroll position (0..1) at which that project is centred.
   * @param {(project:object, index:number)=>void} [options.onSelect]  panel clicked
   *
   * Public: setFocus(index | -1) flies a panel to the camera (case-study view).
   */
  constructor(canvas, scrollArea, getProgress, options = {}) {
    this.canvas = canvas;
    this.scrollArea = scrollArea;
    this.getProgress = getProgress;
    this.options = options;
    this.projects = options.projects?.length ? options.projects : DEFAULT_PROJECTS;

    // how wide each panel's visibility window is, relative to how tightly they're packed
    const ps = this.projects.map(p => p.progress).sort((a, b) => a - b);
    let gap = 0.5;
    for (let i = 1; i < ps.length; i += 1) gap = Math.min(gap, ps[i] - ps[i - 1]);
    this.span = Math.max(0.05, Math.min(0.26, gap * 0.62));

    this.disposed = false;
    this.progress = clamp01(getProgress?.() ?? 0);
    this.velocity = 0;
    this.pulse = 0;
    this.intro = 0;
    this.time = 0;
    this.mouse = new THREE.Vector2();
    this.mouseSmooth = new THREE.Vector2();
    this.hoverIndex = -1;
    this.focusIndex = -1;
    this.cards = [];
    this.textures = [];
    this._panelArts = [];
    this._reels = [];

    this._tmpA = new THREE.Vector3();
    this._tmpB = new THREE.Vector3();
    this._tmpC = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._baseBg = new THREE.Color(0x040a10);
    this._tint = new THREE.Color(0x040a10); // the world colour while a case study is open
    this._inkMouse = new THREE.Vector2();
    this._inkPrev = new THREE.Vector2();
    this._inkVel = new THREE.Vector2();
    this._trailOn = { value: 0 };
    this._trailU = Array.from({ length: TRAIL_N }, () => new THREE.Vector3()); // the cursor's fading path, shared by the card and the beads
    this._trail = [];
    this._trailPtr = new THREE.Vector2();
    this._trailHeld = false;
    this._ptrLive = false; // true once the pointer has moved since a study opened (so the click itself doesn't erode the panel)

    this.reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reduced = !!this.reducedMotionQuery?.matches;
    this.compact = window.innerWidth < 768;

    this._animate = this._animate.bind(this);
    this._resize = this._resize.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onMotionChange = e => { this.reduced = e.matches; };
    this._onVisibility = () => { this._lastFrameTime = performance.now(); };

    this._init();
  }

  _cursorTarget() { return this.scrollArea || this.canvas; }

  _init() {
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.compact ? 1.25 : 1.75);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(bounds.width, bounds.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x040a10);
    this.scene.fog = new THREE.FogExp2(0x040a10, 0.0105);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(buildStudioEnvironment(), 0.02);
    this.scene.environment = this.envTarget.texture;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(45, bounds.width / bounds.height, 0.1, 220);
    this.camera.position.set(0, 12, 25);

    this.scene.add(new THREE.HemisphereLight(0x5f8aa8, 0x081016, 0.5));

    this.lightA = new THREE.PointLight(0x6f9ccf, 165, 46, 2);
    this.lightB = new THREE.PointLight(0x7fc4cf, 140, 46, 2);
    this.lightC = new THREE.PointLight(0xffd7a3, 95, 40, 2); // warm kicker from behind
    this.scene.add(this.lightA, this.lightB, this.lightC);

    this._buildHero();
    this._buildCards();
    this._loadPanelFonts();
    this._buildParticles();
    this._buildInk();
    this._buildShed();
    this._buildComposer(bounds);
    // compile shaders and build the film worlds in the background, one small step per idle slice, never blocking
    // the main thread: the page stays smooth if the visitor scrolls or opens a card straight away
    this._warmQueue = [() => this._warmShaders(), ...this.cards.filter(c => c.art.reel).map(c => () => c.art.reel.warm())];
    this._warmNext = () => {
      if (this.disposed) return;
      const step = this._warmQueue.shift();
      if (!step) return;
      let p;
      try { p = step(); } catch (e) { p = null; }
      Promise.resolve(p).catch(() => {}).then(() => {
        const idle = window.requestIdleCallback || (f => setTimeout(f, 80));
        idle(() => this._warmNext(), { timeout: 400 });
      });
    };
    this._warmTimers = [setTimeout(() => this._warmNext(), 600)];

    this.resizeObserver = new ResizeObserver(this._resize);
    this.resizeObserver.observe(this.canvas.parentElement);
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('click', this._onClick);
    document.addEventListener('visibilitychange', this._onVisibility);
    this.reducedMotionQuery?.addEventListener?.('change', this._onMotionChange);

    this._lastFrameTime = performance.now();
    this._animate();
  }

  /* ---------- path ---------- */

  _path(progress, radiusOffset = 0, heightOffset = 0, phaseOffset = 0) {
    const t = clamp01(progress);
    const angle = -0.48 + t * Math.PI * 2 * WALK_TURNS + phaseOffset;
    const radius = 8.5 + radiusOffset;
    return new THREE.Vector3(Math.cos(angle) * radius, TOP_Y - t * DROP + heightOffset, Math.sin(angle) * radius);
  }

  _radial(progress, phaseOffset = 0) {
    const angle = -0.48 + clamp01(progress) * Math.PI * 2 * WALK_TURNS + phaseOffset;
    return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  }

  /* ---------- hero ---------- */

  _buildHero() {
    const rand = seededRandom(20251);
    const hero = new THREE.Group();
    const H = COLUMN_TOP - COLUMN_BOTTOM;
    const mid = (COLUMN_TOP + COLUMN_BOTTOM) / 2;

    const envTex = this.envTarget.texture;

    /* --- spine: a thick, sculpted body --- */
    let geo = new THREE.CylinderGeometry(1, 1, H, this.compact ? 56 : 96, this.compact ? 380 : 600, true);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const y = pos.getY(i) + mid;
      const a = Math.atan2(pos.getZ(i), pos.getX(i));
      const r = spineRadius(y, a);
      pos.setXYZ(i, Math.cos(a) * r + wanderX(y), y, Math.sin(a) * r + wanderZ(y));
    }
    geo.deleteAttribute('uv');
    geo.deleteAttribute('normal');
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();

    // dark glass: near-black body, a little metal, a thin iridescent film. Colour only comes from what it reflects.
    this.heroMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2b3b4e,
      metalness: 0.7,
      roughness: 0.26,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
      iridescence: 0.85,
      iridescenceIOR: 1.5,
      iridescenceThicknessRange: [220, 520],
      envMap: envTex,
      envMapIntensity: 2.8,
      side: THREE.DoubleSide
    });
    this.strandMaterial = this.heroMaterial;
    hero.add(new THREE.Mesh(geo, this.heroMaterial));

    /* --- dust: soft clouds drifting off the column, plus fine glints on its surface --- */
    const count = this.compact ? 3000 : 7000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const seeds = new Float32Array(count);
    const P = new THREE.Vector3();
    const gauss = () => (rand() + rand() + rand() - 1.5) * 0.7;
    const clouds = Array.from({ length: this.compact ? 20 : 44 }, () => ({
      y: COLUMN_BOTTOM + 4 + rand() * (H - 8),
      a: rand() * Math.PI * 2,
      off: 0.5 + rand() * 2.4,
      s: 0.28 + rand() * 0.5,
      h1: Math.floor(rand() * 6),
      h2: Math.floor(rand() * 6)
    }));
    for (let n = 0; n < count; n += 1) {
      const kind = rand();
      let y, a, r, hue;
      if (kind < 0.5) {
        const c = clouds[Math.floor(rand() * clouds.length)];
        y = c.y + gauss() * c.s * 1.3;
        a = c.a + gauss() * c.s / (spineBase(c.y) + c.off);
        r = Math.max(spineRadius(y, a) + 0.1, spineBase(c.y) + c.off + gauss() * c.s);
        hue = rand() < 0.75 ? c.h1 : c.h2;
      } else if (kind < 0.9) {
        y = COLUMN_BOTTOM + 4 + rand() * (H - 8);
        a = rand() * Math.PI * 2;
        r = spineRadius(y, a) + 0.02 + rand() * 0.22;
        hue = Math.floor(rand() * 6);
      } else {
        y = COLUMN_BOTTOM + 4 + rand() * (H - 8);
        a = rand() * Math.PI * 2;
        r = spineBase(y) + 1 + rand() * 3.8;
        hue = Math.floor(rand() * 6);
      }
      r = Math.min(r, 6.2);
      P.set(wanderX(y) + Math.cos(a) * r, y, wanderZ(y) + Math.sin(a) * r);
      positions.set([P.x, P.y, P.z], n * 3);
      const c = DUST_PALETTE[hue];
      const g = 0.7 + rand() * 0.35;
      colors.set([c.r * g, c.g * g, c.b * g], n * 3);
      sizes[n] = (kind < 0.5 ? 0.5 : 0.6) + Math.pow(rand(), 2.8) * 1.5 + (rand() < 0.04 ? 1.4 : 0);
      seeds[n] = rand();
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.dust = new THREE.Points(dustGeo, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPx: { value: this.renderer.getPixelRatio() }, uFade: { value: 1 } },
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      transparent: true,
      depthWrite: false
    }));
    this.dust.frustumCulled = false;
    hero.add(this.dust);

    /* --- motes: slow lights travelling up the filaments --- */
    const moteCount = this.compact ? 8 : 16;
    this.moteData = Array.from({ length: moteCount }, () => ({
      f: Math.floor(rand() * FILAMENTS.length),
      base: rand() * (MOTE_TOP - MOTE_BOTTOM),
      speed: 0.9 + rand() * 2.1,
      ox: gauss() * 0.16,
      oy: gauss() * 0.2,
      oz: gauss() * 0.16
    }));
    const moteGeo = new THREE.BufferGeometry();
    const moteColors = new Float32Array(moteCount * 3);
    const moteSizes = new Float32Array(moteCount);
    const motePhase = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i += 1) {
      const c = MOTE_PALETTE[Math.floor(rand() * MOTE_PALETTE.length)];
      moteColors.set([c.r, c.g, c.b], i * 3);
      moteSizes[i] = 2.2 + rand() * 2.6;
      motePhase[i] = rand();
    }
    moteGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(moteCount * 3), 3));
    moteGeo.setAttribute('aColor', new THREE.BufferAttribute(moteColors, 3));
    moteGeo.setAttribute('aSize', new THREE.BufferAttribute(moteSizes, 1));
    moteGeo.setAttribute('aPhase', new THREE.BufferAttribute(motePhase, 1));
    this.motes = new THREE.Points(moteGeo, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPx: { value: this.renderer.getPixelRatio() }, uFade: { value: 1 } },
      vertexShader: MOTE_VERT,
      fragmentShader: MOTE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    this.motes.frustumCulled = false;
    hero.add(this.motes);
    this._updateMotes();

    this.hero = hero;
    this.scene.add(hero);
  }

  // each mote rides one filament upward and wraps round at the top
  _updateMotes() {
    const tmp = this._moteTmp ||= new THREE.Vector3();
    const pos = this.motes.geometry.attributes.position;
    const span = MOTE_TOP - MOTE_BOTTOM;
    this.moteData.forEach((m, i) => {
      const y = MOTE_BOTTOM + (((m.base + this.time * m.speed) % span) + span) % span;
      filPoint(FILAMENTS[m.f], y, tmp);
      pos.setXYZ(i, tmp.x + m.ox, y + m.oy, tmp.z + m.oz);
    });
    pos.needsUpdate = true;
  }

  /* ---------- project panels ---------- */

  _buildCards() {
    const width = 6.6;
    const height = 4.125; // 16:10
    const loader = new THREE.TextureLoader();
    const total = this.projects.length;
    this.glowTex = createGlowTexture();
    this.textures.push(this.glowTex);

    this.projects.forEach((project, index) => {
      const accent = project.accent ?? ACCENTS[index % ACCENTS.length];
      const accentColor = new THREE.Color(accent);
      const group = new THREE.Group();
      const phase = CAMERA_PHASE + (index % 2 ? 0.1 : -0.1);
      const radial = this._radial(project.progress, phase);
      group.position.copy(this._path(project.progress, -2.6, 2.1, phase));
      group.rotation.y = Math.atan2(radial.x, radial.z);
      const basePos = group.position.clone();
      const baseQuat = group.quaternion.clone();
      this.scene.add(group);

      // everything that floats lives in `body`, so the group itself stays free to be flown around
      const body = new THREE.Group();
      group.add(body);

      // glass-and-metal chamfered frame
      const frameGeo = new THREE.ExtrudeGeometry(chamferShape(width + 0.34, height + 0.34, 0.5), {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 3
      });
      frameGeo.translate(0, 0, -0.34);
      const frame = new THREE.Mesh(
        frameGeo,
        new THREE.MeshPhysicalMaterial({
          color: accentColor.clone().multiplyScalar(0.22),
          transparent: true,
          metalness: 0.75,
          roughness: 0.24,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          iridescence: 0.5,
          iridescenceIOR: 1.4,
          iridescenceThicknessRange: [100, 380],
          envMapIntensity: 1.3,
          fog: false
        })
      );
      const frameFs = { value: new THREE.Vector2(1, 1) };
      frame.material.onBeforeCompile = shader => {
        shader.uniforms.uTrail = { value: this._trailU };
        shader.uniforms.uAspect = { value: 6.6 / 4.125 };
        shader.uniforms.uOn = this._trailOn;
        shader.uniforms.uFs = frameFs;
        shader.vertexShader = 'varying vec2 vFp;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vFp = position.xy;');
        shader.fragmentShader = FLOW_GLSL + 'varying vec2 vFp;\nuniform vec2 uFs;\n' + shader.fragmentShader.replace('#include <dithering_fragment>',
          '#include <dithering_fragment>\n  float fq = flowField(vFp * uFs / vec2(6.6, 4.125) + 0.5).x;\n  gl_FragColor.a *= 1.0 - fq * fq * (3.0 - 2.0 * fq);');
      };
      body.add(frame);
      const frameHsl = { h: 0, s: 0, l: 0 };
      accentColor.getHSL(frameHsl, THREE.SRGBColorSpace);
      const framePlate = new THREE.Color().setHSL(frameHsl.h, Math.min(0.9, Math.max(frameHsl.s, 0.78)), 0.34, THREE.SRGBColorSpace);

      // screen
      const screenGeo = new THREE.ShapeGeometry(chamferShape(width, height, 0.4));
      const sp = screenGeo.attributes.position;
      const uv = screenGeo.attributes.uv;
      for (let i = 0; i < sp.count; i += 1) uv.setXY(i, sp.getX(i) / width + 0.5, sp.getY(i) / height + 0.5);
      uv.needsUpdate = true;

      const fallback = createPanelTexture(project, index, total, accent);
      this.textures.push(fallback);
      this._panelArts.push({ tex: fallback, project, index, total, accent });
      // base art (generated or screenshot) vs. the beat-driven texture used during a case study
      const art = { base: fallback, dyn: null, canvas: null, showingDyn: false, reel: null };
      if (!project.image) {
        // no real media supplied: the card plays a generated short film while its case study is open
        art.reel = createReel({ renderer: this.renderer, project, index, total, accent, compact: this.compact });
        this._reels.push(art.reel);
      }
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: fallback },
          uAccent: { value: accentColor.clone() },
          uTime: { value: 0 },
          uVel: { value: 0 },
          uHover: { value: 0 },
          uReveal: { value: 0 },
          uGlitch: { value: 0 },
          uFocus: { value: 0 },
          uDissolve: { value: 0 },
          uPart: { value: 0 },
          uTrail: { value: this._trailU },
          uAspect: { value: 6.6 / 4.125 },
          uOn: this._trailOn
        },
        vertexShader: SCREEN_VERT,
        fragmentShader: SCREEN_FRAG,
        transparent: true,
        fog: false
      });
      if (project.image) {
        loader.load(
          project.image,
          tex => {
            if (this.disposed) { tex.dispose(); return; }
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = 8;
            this.textures.push(tex);
            art.base = tex;
            if (!art.showingDyn) material.uniforms.uMap.value = tex;
          },
          undefined,
          () => { /* keep generated art */ }
        );
      }
      const screen = new THREE.Mesh(screenGeo, material);
      screen.position.z = 0.02;
      body.add(screen);

      // HDR accent outline: >1.0 colour so bloom picks it up
      const outlinePts = chamferShape(width + 0.12, height + 0.12, 0.43).getPoints().map(p => new THREE.Vector3(p.x, p.y, 0.04));
      const outline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(outlinePts),
        new THREE.LineBasicMaterial({ color: accentColor.clone().multiplyScalar(2.6), transparent: true, opacity: 0, fog: false })
      );
      body.add(outline);

      // glow plate
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 2.1, height * 2.4),
        new THREE.MeshBasicMaterial({
          map: this.glowTex,
          color: accent,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      glow.position.z = -0.7;
      body.add(glow);

      this.cards.push({
        group, body, screen, material, glow, outline, frame, frameFs, frameBase: frame.material.color.clone(), framePlate, project, index,
        progress: project.progress, basePos, baseQuat,
        reveal: 0, hover: 0, arrived: 0, focus: 0, kick: 0, accent, art,
        ptr: new THREE.Vector2(0.5, 0.5), ptrAmt: 0
      });
    });
  }

  /* ---------- GPU particles ---------- */

  _buildParticles() {
    const count = this.compact ? 420 : 1100;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.pow(Math.random(), 0.7) * 26;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = -42 + Math.random() * 64;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      seeds[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uVel: { value: 0 },
        uPx: { value: this.renderer.getPixelRatio() },
        uFade: { value: 1 }
      },
      vertexShader: PARTICLE_VERT,
      fragmentShader: PARTICLE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.particles = new THREE.Points(geo, this.particleMaterial);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  // the panel art uses Chakra Petch; draw it again once the font is actually available
  _loadPanelFonts() {
    if (!document.fonts?.load) return;
    Promise.all([document.fonts.load('500 40px "Chakra Petch"'), document.fonts.load('500 20px "Chakra Petch"')])
      .then(() => {
        if (this.disposed) return;
        for (const a of this._panelArts) {
          drawPanelArt(a.tex.image, a.project, a.index, a.total, a.accent);
          a.tex.needsUpdate = true;
        }
      })
      .catch(() => { /* keep the fallback font */ });
  }

  /* ---------- case-study ink ---------- */

  _buildInk() {
    const rand = seededRandom(7);
    const count = this.compact ? 4200 : 9500;
    const ndc = new Float32Array(count * 2);
    const depth = new Float32Array(count);
    const size = new Float32Array(count);
    const rnd = new Float32Array(count * 3);
    let n = 0;
    // splatter: blotchy clumps, heavy toward the edges, thin around the panel
    for (let guard = 0; n < count && guard < count * 60; guard += 1) {
      const x = rand() * 2 - 1, y = rand() * 2 - 1;
      const edge = smooth(0.2, 1.0, Math.hypot(x * 0.8, y));
      const pdx = Math.max(Math.abs(x - 0.05) - 0.46, 0), pdy = Math.max(Math.abs(y - 0.03) - 0.62, 0);
      const near = 0.25 + 0.75 * smooth(0.0, 0.3, Math.hypot(pdx * 0.8, pdy)); // thin around the panel
      const clump = Math.pow(fbm(x * 1.9 + 3.1, y * 1.9 + 8.2, 0.5), 3.2) * 7;
      if (rand() > Math.min(1, near * (0.12 + 0.88 * edge) * (0.08 + clump) + 0.004)) continue;
      ndc[n * 2] = x;
      ndc[n * 2 + 1] = y;
      depth[n] = 12 + rand() * 10;
      size[n] = 1.8 + Math.pow(rand(), 2.6) * 15;
      rnd[n * 3] = rand();
      rnd[n * 3 + 1] = rand();
      rnd[n * 3 + 2] = rand();
      n += 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); // unused, but Points needs it
    geo.setAttribute('aNdc', new THREE.BufferAttribute(ndc, 2));
    geo.setAttribute('aDepth', new THREE.BufferAttribute(depth, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 3));
    geo.setDrawRange(0, n);
    this.ink = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPx: { value: this.renderer.getPixelRatio() },
        uReveal: { value: 0 },
        uTan: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMouseVel: { value: new THREE.Vector2(0, 0) },
        uOrigin: { value: new THREE.Vector2(0.15, 0) },
        uColA: { value: new THREE.Color(0x0a2a30) },
        uColB: { value: new THREE.Color(0x0f4d57) },
        uColC: { value: new THREE.Color(0x2bb5c4) }
      },
      vertexShader: INK_VERT,
      fragmentShader: INK_FRAG,
      transparent: true,
      depthWrite: false
    }));
    this.ink.frustumCulled = false;
    this.ink.visible = false;
    this.scene.add(this.ink);
  }

  _updateInk(delta, sm) {
    const u = this.ink.material.uniforms;
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const aspect = this.camera.aspect;
    this.ink.visible = sm > 0.002;
    u.uTan.value.set(tanH * aspect, tanH);
    u.uTime.value = this.time;
    u.uReveal.value = sm;
    u.uOrigin.value.set(this.compact ? 0 : 0.4 / (tanH * aspect * 10), (this.compact ? 1.9 : 0.1) / (tanH * 10));

    // a quick pointer follower, and its velocity, so the field can be dragged
    const target = this.reduced ? this._inkMouse : this.mouse;
    this._inkPrev.copy(this._inkMouse);
    this._inkMouse.lerp(target, 1 - Math.exp(-delta * 9));
    const vx = ((this._inkMouse.x - this._inkPrev.x) / Math.max(delta, 1e-3)) * 0.03;
    const vy = ((this._inkMouse.y - this._inkPrev.y) / Math.max(delta, 1e-3)) * 0.03;
    const len = Math.hypot(vx, vy);
    const cap = len > 0.25 ? 0.25 / len : 1;
    this._inkVel.lerp(new THREE.Vector2(vx * cap, vy * cap), 1 - Math.exp(-delta * 10));
    u.uMouse.value.copy(this._inkMouse);
    u.uMouseVel.value.copy(this._inkVel);
  }

  /* ---------- cursor dissolve: beads lifting off the focused card ---------- */

  _warmShaders() {
    if (this.disposed || !this.shed) return Promise.resolve();
    this.shed.visible = true;
    let p;
    try { p = this.renderer.compileAsync(this.scene, this.camera); } catch (e) { p = Promise.resolve(); } // collected now, compiled off-thread
    this.shed.visible = false;
    return p;
  }

  _buildShed() {
    const rand = seededRandom(4409);
    const cell = 6.6 / (this.compact ? 150 : 230);
    const FW = 0.0; // no plate: the card is a single surface is part of the field, so it moves with the cursor too
    const GX = Math.ceil((6.6 + 2 * FW) / cell), GY = Math.ceil((4.125 + 2 * FW) / cell);
    const count = GX * GY;
    const uvs = new Float32Array(count * 2);
    const seed = new Float32Array(count);
    let n = 0;
    for (let j = 0; j < GY; j += 1) {
      for (let i = 0; i < GX; i += 1) {
        const x = (i + 0.5 + (rand() - 0.5) * 0.6) * cell - FW;
        const y = (j + 0.5 + (rand() - 0.5) * 0.6) * cell - FW;
        uvs[n * 2] = x / 6.6;
        uvs[n * 2 + 1] = y / 4.125;
        seed[n] = rand();
        n += 1;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); // unused, but Points needs it
    geo.setAttribute('aUv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.shed = new THREE.Points(geo, new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.cards[0]?.material.uniforms.uMap.value ?? null },
        uCardMat: { value: new THREE.Matrix4() },
        uAccent: { value: new THREE.Color() },
        uPlate: { value: new THREE.Color() },
        uTime: { value: 0 },
        uK: { value: 800 },
        uFade: { value: 0 },
        uCell: { value: cell },
        uTrail: { value: this._trailU },
        uAspect: { value: 6.6 / 4.125 },
        uOn: this._trailOn
      },
      vertexShader: SHED_VERT,
      fragmentShader: SHED_FRAG,
      transparent: true,
      depthWrite: false
    }));
    this.shed.frustumCulled = false;
    this.shed.visible = false;
    this.shed.renderOrder = 8;
    this.scene.add(this.shed);
  }

  // The pointer leaves a trail of points on the panel. Each fades out over ~1.8s, so the hole follows the
  // cursor, holds while it rests, and closes up behind it.
  _updateShed(delta, fc, hitUv) {
    const trail = this._trail;
    const LIFE = 2.0;
    if (fc && hitUv && fc.part > 0.9) {
      if (this._trailHeld) this._trailPtr.lerp(hitUv, 1 - Math.exp(-delta * 10)); else this._trailPtr.copy(hitUv);
      this._trailHeld = true;
      const last = trail[trail.length - 1];
      if (!last || Math.hypot((this._trailPtr.x - last.x) * 1.6, this._trailPtr.y - last.y) > 0.03) {
        trail.push({ x: this._trailPtr.x, y: this._trailPtr.y, t0: this.time, born: this.time });
      } else {
        last.born = this.time; // resting: keep the hole open
      }
    } else {
      this._trailHeld = false;
    }
    for (let i = trail.length - 1; i >= 0; i -= 1) if (this.time - trail[i].born > LIFE) trail.splice(i, 1);
    while (trail.length > TRAIL_N) trail.shift();

    for (let i = 0; i < TRAIL_N; i += 1) {
      const p = trail[i];
      if (!p) { this._trailU[i].set(0, 0, 0); continue; }
      const grow = smooth(0, 1, (this.time - p.t0) / 0.5);
      const fade = Math.pow(clamp01(1 - (this.time - p.born) / LIFE), 1.7);
      const taper = trail.length >= TRAIL_N ? smooth(0, 5, i) : 1; // the oldest point never pops out
      this._trailU[i].set(p.x, p.y, grow * fade * taper);
    }

    this._trailOn.value = trail.length > 0 ? 1 : 0;
    const active = !!fc && fc.part > 0.01 && trail.length > 0;
    this.shed.visible = active;
    if (!active) return;
    fc.screen.updateWorldMatrix(true, false);
    const su = this.shed.material.uniforms;
    su.uCardMat.value.copy(fc.screen.matrixWorld);
    su.uMap.value = fc.material.uniforms.uMap.value;
    su.uAccent.value.set(fc.accent);
    su.uPlate.value.copy(fc.framePlate);
    su.uTime.value = this.time;
    su.uK.value = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2));
    su.uFade.value = fc.part;
  }

  /* ---------- post-processing ---------- */

  _buildComposer(bounds) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(bounds.width, bounds.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(bounds.width / 2, bounds.height / 2), // bloom is soft anyway: half resolution is much cheaper
      this.compact ? 0.18 : 0.26,
      0.55,
      0.9
    );
    this.composer.addPass(this.bloom);

    this.lookPass = new ShaderPass(LookShader);
    this.composer.addPass(this.lookPass);
    this.composer.addPass(new OutputPass());
  }

  /* ---------- interaction ---------- */

  setFocus(index) {
    const next = Number.isInteger(index) && index >= 0 && index < this.cards.length ? index : -1;
    if (next !== this.focusIndex) this.pulse = 1; // a burst of warp/aberration on every open/close
    // each project tints the whole world with its own accent
    if (next >= 0) {
      const hsl = { h: 0, s: 0, l: 0 };
      new THREE.Color(this.cards[next].accent).getHSL(hsl, THREE.SRGBColorSpace);
      const s = Math.min(0.9, Math.max(hsl.s, 0.6));
      this._tint.setHSL(hsl.h, s * 0.9, 0.1, THREE.SRGBColorSpace);
      const iu = this.ink.material.uniforms;
      iu.uColA.value.setHSL(hsl.h, s, 0.13, THREE.SRGBColorSpace);
      iu.uColB.value.setHSL(hsl.h, s, 0.3, THREE.SRGBColorSpace);
      iu.uColC.value.setHSL(hsl.h, Math.min(1, s * 1.1), 0.5, THREE.SRGBColorSpace);
    }
    if (next >= 0 && next !== this.focusIndex) this._ptrLive = false;
    if (next !== this.focusIndex) { this._trail.length = 0; this._trailHeld = false; }
    this.focusIndex = next;
    if (this.focusIndex >= 0) {
      this.hoverIndex = -1;
      this._cursorTarget().style.cursor = '';
    }
  }

  /**
   * Swap a panel between its base art and beat-driven art.
   * state: null → base art; {kind:'areas'|'list', section, items, active, symbol?, beat, beats} → drawn art.
   * direction nudges the panel (±1) and `quiet` skips the glitch cut (for timer-driven changes).
   */
  setPanelState(index, state, direction = 1, quiet = false) {
    const card = this.cards[index];
    if (!card) return;
    const art = card.art;
    if (!state) {
      if (art.showingDyn) { art.showingDyn = false; card.material.uniforms.uMap.value = art.base; }
    } else {
      if (!art.dyn) {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 800;
        art.canvas = canvas;
        art.dyn = new THREE.CanvasTexture(canvas);
        art.dyn.colorSpace = THREE.SRGBColorSpace;
        art.dyn.anisotropy = 8;
        this.textures.push(art.dyn);
      }
      drawStudyTexture(art.canvas, card.project, index, this.cards.length, card.accent, state);
      art.dyn.needsUpdate = true;
      art.showingDyn = true;
      card.material.uniforms.uMap.value = art.dyn;
    }
    if (!this.reduced && !quiet) { card.arrived = 1; card.kick = direction; }
  }

  /** Dim every panel whose index is not in `set` (pass null to clear). */
  setHighlight(set) {
    this.highlight = set || null;
  }

  _onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    };
    this.mouse.set(this._pointer.x, this._pointer.y);
    if (this.focusIndex >= 0) this._ptrLive = true;
  }

  _pick(ndc) {
    this._raycaster ||= new THREE.Raycaster();
    this._raycaster.setFromCamera(ndc, this.camera);
    const targets = this.cards.filter(c => c.reveal > 0.5).map(c => c.screen);
    const hit = this._raycaster.intersectObjects(targets, false)[0];
    return hit ? this.cards.findIndex(c => c.screen === hit.object) : -1;
  }

  _onClick(e) {
    if (this.focusIndex >= 0) return;
    // never hijack clicks meant for the HUD
    if (e.target?.closest?.('button, a, [data-wx-ui]')) return;
    const rect = this.canvas.getBoundingClientRect();
    const ndc = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    };
    const index = this._pick(ndc);
    if (index < 0) return;
    const project = this.cards[index].project;
    if (this.options.onSelect) this.options.onSelect(project, index);
    else if (project.href) window.open(project.href, '_blank', 'noopener');
  }

  _updateHover() {
    if (this.focusIndex >= 0 || !this._pointer) {
      if (this.hoverIndex !== -1) { this.hoverIndex = -1; this._cursorTarget().style.cursor = ''; }
      return;
    }
    const next = this._pick(this._pointer);
    if (next !== this.hoverIndex) {
      this.hoverIndex = next;
      this._cursorTarget().style.cursor = next >= 0 ? 'pointer' : '';
    }
  }

  _resize() {
    if (!this.renderer || this.disposed) return;
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    this.compact = window.innerWidth < 768;
    this.camera.aspect = bounds.width / bounds.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(bounds.width, bounds.height, false);
    this.composer.setSize(bounds.width, bounds.height);
    this.bloom.setSize(bounds.width / 2, bounds.height / 2);
    this._applyQuality();
  }

  /* ---------- frame loop ---------- */

  _animate() {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this._animate);

    const now = performance.now();
    const delta = Math.min((now - this._lastFrameTime) / 1000, 0.05);
    this._lastFrameTime = now;
    if (!this.reduced) this.time += delta;

    const target = clamp01(this.getProgress());
    const prev = this.progress;
    this.progress += (target - prev) * (this.reduced ? 1 : 1 - Math.exp(-delta * 6.5));
    const rawVel = delta > 0 ? Math.abs(this.progress - prev) / delta : 0;
    this.intro = this.reduced ? 1 : Math.min(1, this.intro + delta / INTRO_SECONDS);
    const introE = 1 - Math.pow(1 - this.intro, 3); // ease-out cubic
    this.pulse *= Math.exp(-delta * 2.6);
    const wantedVel = this.reduced ? 0 : Math.min(rawVel * 5 + this.pulse * 0.9 + (1 - introE) * 0.9, 1.5);
    this.velocity += (wantedVel - this.velocity) * (1 - Math.exp(-delta * 9));

    const m = this.reduced ? new THREE.Vector2() : this.mouse;
    this.mouseSmooth.lerp(m, 1 - Math.exp(-delta * 7));

    const p = this.progress;
    const radial = this._radial(p, CAMERA_PHASE);
    const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
    // start close so the strand fills the opening frame, ease out as the descent begins
    const cam = this._path(p, 9.2 + 1.8 * smooth(0, 0.2, p), 7, CAMERA_PHASE);
    cam.addScaledVector(tangent, this.mouseSmooth.x * 1.5);
    cam.y += this.mouseSmooth.y * 0.9;
    const focus = new THREE.Vector3(0, TOP_Y - p * DROP, 0);
    focus.addScaledVector(tangent, -this.mouseSmooth.x * 0.5);
    // intro dolly: start pulled back and high with a wide lens, settle into the strand
    if (introE < 1) {
      cam.addScaledVector(radial, (1 - introE) * 15);
      cam.y += (1 - introE) * 9;
    }
    const fov = 45 + (1 - introE) * 20;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.copy(cam);
    this.camera.lookAt(focus);

    this.lightA.position.copy(focus).addScaledVector(radial, 8).addScaledVector(tangent, 6).add(new THREE.Vector3(0, 4, 0));
    this.lightB.position.copy(focus).addScaledVector(radial, 8).addScaledVector(tangent, -6).add(new THREE.Vector3(0, -2, 0));
    this.lightC.position.copy(focus).addScaledVector(radial, -7).addScaledVector(tangent, 3).add(new THREE.Vector3(0, 3, 0));
    const breathe = this.reduced ? 0 : Math.sin(this.time * 0.8) * 10;
    this.lightA.intensity = 165 + breathe;
    this.lightB.intensity = 140 - breathe;
    this.lightC.intensity = 95 + breathe * 0.6;

    this._updateHover();

    // camera basis for the focus pose (panel sits right of centre so the text column has room)
    const fwd = this._tmpA.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = this._tmpB.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = this._tmpC.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this._target.copy(this.camera.position)
      .addScaledVector(fwd, 10)
      .addScaledVector(right, this.compact ? 0 : 0.4)
      .addScaledVector(up, this.compact ? 1.9 : 0.1);

    const focusMax = this.cards.reduce((mx, c) => Math.max(mx, c.focus), 0);
    const dim = 1 - focusMax;
    const sm = smooth(0, 1, focusMax);
    this.scene.background.copy(this._baseBg).lerp(this._tint, sm);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density = THREE.MathUtils.lerp(0.0105, 0.1, sm);
    const open = sm > 0.985; // a case study is fully open: nothing behind it needs drawing
    this.hero.visible = !open;
    const fade = 1 - sm;
    this.particles.visible = fade > 0.01;
    this.dust.material.uniforms.uFade.value = fade;
    this.motes.material.uniforms.uFade.value = fade;
    this.particleMaterial.uniforms.uFade.value = fade;
    const k = 1 - Math.exp(-delta * (this.reduced ? 40 : 7.5));

    // where the pointer touches the focused panel (uv), if it does
    const fc = this.focusIndex >= 0 ? this.cards[this.focusIndex] : null;
    let hitUv = null;
    if (fc && this._pointer && this._ptrLive && !this.reduced) {
      this._raycaster ||= new THREE.Raycaster();
      this._raycaster.setFromCamera(this._pointer, this.camera);
      fc.screen.updateWorldMatrix(true, false);
      const inv = (this._invCard ||= new THREE.Matrix4()).copy(fc.screen.matrixWorld).invert();
      const o = this._rayO ||= new THREE.Vector3(), d = this._rayD ||= new THREE.Vector3();
      o.copy(this._raycaster.ray.origin).applyMatrix4(inv);
      d.copy(this._raycaster.ray.direction).transformDirection(inv);
      if (Math.abs(d.z) > 1e-4) {
        const t = -o.z / d.z;
        if (t > 0) {
          const u = o.x / 6.6 + d.x * t / 6.6 + 0.5, v = o.y / 4.125 + d.y * t / 4.125 + 0.5;
          if (u > -0.02 && u < 1.02 && v > -0.02 && v < 1.02) hitUv = (this._hitUv ||= new THREE.Vector2()).set(u, v);
        }
      }
    }

    this.cards.forEach(card => {
      const dist = Math.abs(p - card.progress);
      let reveal = smooth(0, 1, clamp01((this.span - dist) / (this.span * 0.45)));

      const isFocus = this.focusIndex === card.index;
      card.focus += ((isFocus ? 1 : 0) - card.focus) * k;
      const e = smooth(0, 1, card.focus);

      const dimF = this.highlight && !this.highlight.has(card.index) ? 0.3 : 1;
      reveal = Math.max(reveal * dim * dimF, e);
      const wasHidden = card.reveal < 0.02;
      card.reveal = reveal;
      card.group.visible = reveal > 0.005 && (!open || isFocus);

      // fly between the path pose and the camera-facing pose
      card.group.position.lerpVectors(card.basePos, this._target, e);
      card.group.quaternion.slerpQuaternions(card.baseQuat, this.camera.quaternion, e);
      const baseScale = 0.82 + 0.18 * reveal;
      card.group.scale.setScalar(THREE.MathUtils.lerp(baseScale, this.compact ? 0.78 : 1.22, e));

      const isHover = this.cards[this.hoverIndex] === card;
      card.hover += ((isHover ? 1 : 0) - card.hover) * (1 - Math.exp(-delta * 12));

      // gentle tilt toward the pointer on hover, and parallax while focused
      const tilt = Math.max(card.hover, e * 0.25);
      if (tilt > 0.001 && !this.reduced) {
        card.group.rotateY(this.mouseSmooth.x * 0.12 * tilt);
        card.group.rotateX(-this.mouseSmooth.y * 0.08 * tilt);
      }

      // a small shove each time the case study moves to the next beat
      card.kick *= Math.exp(-delta * 4);
      if (Math.abs(card.kick) > 0.001) {
        card.group.rotateY(card.kick * 0.1);
        card.group.scale.multiplyScalar(1 + Math.abs(card.kick) * 0.03);
      }

      if (wasHidden && reveal > 0.02 && !this.reduced) card.arrived = 1;
      card.arrived = Math.max(0, card.arrived - delta * 1.8);

      const rl = card.art.reel;
      if (rl) {
        if (card === fc && e > 0.05) {
          if (!rl.on && !rl.ready) {
            rl.warm(); // not built yet (the visitor was quick): keep the still art and let it finish off-thread
          } else if (!rl.on) {
            rl.on = true;
            rl.reset(this.reduced ? 2.4 : 0);
            card.material.uniforms.uMap.value = rl.texture;
          } else if (!this.reduced) {
            rl.setQuality(this._gov ? this._gov.level : 3);
            rl.update(Math.min(delta, 0.05));
          }
        } else if (rl.on && e < 0.02) {
          rl.on = false;
          card.material.uniforms.uMap.value = card.art.base;
        }
      }

      const u = card.material.uniforms;
      u.uTime.value = this.time;
      u.uVel.value = this.velocity;
      u.uHover.value = Math.max(card.hover, e * 0.5);
      u.uReveal.value = reveal;
      u.uGlitch.value = Math.max(card.arrived, card.hover * 0.15) * (1 - 0.8 * e);
      u.uFocus.value = e;
      const dis = this.reduced ? 0 : Math.sin(Math.PI * e) * 0.8;
      u.uDissolve.value = dis;
      card.part = smooth(0.78, 0.98, e);
      u.uPart.value = card.part;
      const fm = card.frame.material;
      fm.opacity = clamp01(1 - dis * 1.5) * (1 - card.part); // opened: the card is one single face, no separate frame
      card.frameFs.value.set(1 + 0.13 * e, 1 + 0.2 * e);
      fm.color.copy(card.frameBase).lerp(card.framePlate, e);
      fm.emissive.copy(card.framePlate).multiplyScalar(0.6 * e);
      fm.metalness = THREE.MathUtils.lerp(0.75, 0.1, e); // opened: a flat, matte colour plate, not polished metal
      fm.roughness = THREE.MathUtils.lerp(0.24, 0.75, e);
      fm.clearcoat = THREE.MathUtils.lerp(1, 0.15, e);
      fm.envMapIntensity = THREE.MathUtils.lerp(1.3, 0.35, e);
      card.frame.scale.set(1 + 0.13 * e, 1 + 0.2 * e, 1);
      card.glow.material.opacity = reveal * (0.2 + card.hover * 0.14 + e * 0.12) * (1 - 0.8 * card.part);
      card.outline.material.opacity = reveal * (0.35 + card.hover * 0.5 + e * 0.3 + (this.highlight?.has(card.index) ? 0.35 : 0)) * (1 - card.part);

      const float = this.reduced ? 0 : Math.sin(this.time * 0.6 + card.index * 2) * 0.1;
      card.body.position.y = float;
    });

    this._updateShed(delta, fc, hitUv);
    this._updateInk(delta, sm);

    this.heroMaterial.iridescenceThicknessRange = [260 + Math.sin(this.time * 0.15) * 40, 760];
    // the whole strand turns very slowly
    this.hero.rotation.y = this.time * 0.025;
    this.dust.material.uniforms.uTime.value = this.time;
    this._updateMotes();
    this.motes.material.uniforms.uTime.value = this.time;
    this.strandMaterial.iridescenceThicknessRange = [200 + Math.sin(this.time * 0.12) * 40, 620];

    const pu = this.particleMaterial.uniforms;
    pu.uTime.value = this.time;
    pu.uProgress.value = p;
    pu.uVel.value = this.velocity;

    const lu = this.lookPass.uniforms;
    lu.uTime.value = this.time;
    lu.uVel.value = this.velocity;
    lu.uGrain.value = this.reduced ? 0.012 : 0.028;
    lu.uIntro.value = introE;

    this._governQuality(now);
    this.composer.render(delta);
  }

  // Keeps the frame rate smooth on any machine: if frames take too long the render resolution steps down,
  // and when there is plenty of headroom it steps back up (more cautiously each time it had to retreat).
  _governQuality(now) {
    const g = (this._gov ||= { ema: 16.7, last: now, level: 3, t: 0, hold: 6, calm: 0 });
    const dt = now - g.last;
    g.last = now;
    if (dt > 250) return; // a tab switch or a stall, not a real measurement
    g.ema += (dt - g.ema) * 0.06;
    g.t += dt / 1000;
    if (g.t < 1.2) return;
    g.t = 0;
    if (g.ema > 22 && g.level > 0) {
      g.level -= 1;
      g.calm = 0;
      g.hold = Math.min(g.hold * 1.8, 60);
      this._applyQuality();
    } else if (g.ema < 18.5 && g.level < 3) {
      g.calm += 1.2;
      if (g.calm >= g.hold) { g.level += 1; g.calm = 0; this._applyQuality(); }
    } else if (g.ema >= 18.5) {
      g.calm = 0;
    }
  }

  _applyQuality() {
    const g = this._gov;
    if (!g || !this.renderer || !this.composer) return;
    const base = Math.min(window.devicePixelRatio || 1, this.compact ? 1.25 : 1.75);
    const dpr = base * [0.55, 0.7, 0.85, 1][g.level];
    if (Math.abs(dpr - this.renderer.getPixelRatio()) < 0.01) return;
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(bounds.width, bounds.height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(bounds.width, bounds.height);
    this.bloom.setSize(bounds.width / 2, bounds.height / 2);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    (this._warmTimers || []).forEach(clearTimeout);
    this.resizeObserver?.disconnect();
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('click', this._onClick);
    document.removeEventListener('visibilitychange', this._onVisibility);
    this.reducedMotionQuery?.removeEventListener?.('change', this._onMotionChange);
    this._cursorTarget().style.cursor = '';
    this.scene.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(mt => mt.dispose());
      else object.material?.dispose();
    });
    this.textures.forEach(t => t.dispose());
    this._reels.forEach(r => r.dispose());
    this.envTarget?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}