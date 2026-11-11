import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
// ragged lathe caps are never on screen (they were the "open top" artefact).
const COLUMN_BOTTOM = -66;
const COLUMN_TOP = 48;
const RING_BOTTOM = -37;
const RING_TOP = 17;
const INTRO_SECONDS = 3.4;
const CAMERA_PHASE = 0.72;

const ACCENTS = [0x5fd0e0, 0x7fb4ff, 0xe0a860, 0x6fe0c0, 0x9fbcd8, 0xf2c66b];

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
function createPanelTexture(project, index, total, accentHex) {
  const W = 1280, H = 800;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d');
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  const mono = '"JetBrains Mono","SF Mono",Menlo,Consolas,"Courier New",monospace';
  const pad2 = v => String(v).padStart(2, '0');

  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0e14');
  bg.addColorStop(1, '#10181d');
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  const glow = c.createRadialGradient(W * 0.8, H * 0.18, 0, W * 0.8, H * 0.18, 700);
  glow.addColorStop(0, `${accent}55`);
  glow.addColorStop(1, '#00000000');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  c.strokeStyle = 'rgba(255,255,255,0.05)';
  c.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y <= H; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }

  // seeded scan bars
  for (let i = 0; i < 9; i += 1) {
    const r = Math.abs(Math.sin((index + 1) * 12.9898 + i * 78.233));
    c.fillStyle = `rgba(255,255,255,${0.025 + (r % 0.04)})`;
    c.fillRect(0, (r * 977) % H, W, 2 + (r * 40) % 10);
  }

  // outlined index
  c.font = `700 380px ${mono}`;
  c.textBaseline = 'alphabetic';
  c.lineWidth = 2;
  c.strokeStyle = `${accent}66`;
  c.strokeText(pad2(index + 1), 700, 700);

  // top meta
  c.fillStyle = accent;
  c.font = `600 20px ${mono}`;
  c.fillText(`PROJECT ${pad2(index + 1)} / ${pad2(total)}`, 80, 96);
  c.fillStyle = '#8f98a8';
  c.textAlign = 'right';
  c.fillText(String(project.period || '').toUpperCase(), W - 80, 96);
  c.textAlign = 'left';

  // title
  c.fillStyle = '#eef2f6';
  c.font = `700 84px ${mono}`;
  const title = String(project.title ?? project.label ?? 'UNTITLED').toUpperCase();
  const lines = wrapLines(c, title, 1000, 3);
  lines.forEach((l, i) => c.fillText(l, 80, 300 + i * 100));

  // subtitle
  c.fillStyle = '#8f98a8';
  c.font = `500 24px ${mono}`;
  const sub = wrapLines(c, String(project.subtitle || '').toUpperCase(), 1000, 1)[0] || '';
  c.fillText(sub, 80, 300 + lines.length * 100 + 10);

  // tech chips
  let cx = 80;
  c.font = `600 17px ${mono}`;
  for (const t of (project.tech || []).slice(0, 8)) {
    const label = String(t).toUpperCase();
    const w = c.measureText(label).width + 28;
    if (cx + w > W - 80) break;
    c.strokeStyle = `${accent}99`;
    c.lineWidth = 1.5;
    c.strokeRect(cx, H - 120, w, 38);
    c.fillStyle = '#d6dce4';
    c.fillText(label, cx + 14, H - 95);
    cx += w + 12;
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

const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SCREEN_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uAccent;
  uniform float uTime;
  uniform float uVel;
  uniform float uHover;
  uniform float uReveal;
  uniform float uGlitch;
  uniform float uFocus;
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
    col *= 1.0 + 0.22 * uFocus; // case-study panel: brighter and crisp

    gl_FragColor = vec4(col * uReveal, uReveal);
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
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
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

    this._tmpA = new THREE.Vector3();
    this._tmpB = new THREE.Vector3();
    this._tmpC = new THREE.Vector3();
    this._target = new THREE.Vector3();

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
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(45, bounds.width / bounds.height, 0.1, 220);
    this.camera.position.set(0, 12, 25);

    this.scene.add(new THREE.HemisphereLight(0x5f8aa8, 0x081016, 0.55));

    this.lightA = new THREE.PointLight(0x3f8cff, 260, 46, 2);
    this.lightB = new THREE.PointLight(0x4fd1d9, 230, 46, 2);
    this.scene.add(this.lightA, this.lightB);

    this._buildHero();
    this._buildRings();
    this._buildCards();
    this._buildParticles();
    this._buildComposer(bounds);

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
    const segs = this.compact ? 72 : 140;
    const steps = this.compact ? 520 : 840;
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const y = COLUMN_BOTTOM + t * (COLUMN_TOP - COLUMN_BOTTOM);
      const wave = Math.pow(0.5 + 0.5 * Math.sin(y * 2.35), 0.65);
      const taper = smooth(0, 0.06, t) * smooth(1, 0.94, t);
      const r = (0.85 + 1.25 * wave + 0.25 * Math.sin(y * 0.37)) * (0.25 + 0.75 * taper);
      points.push(new THREE.Vector2(Math.max(0.05, r), y));
    }

    let geo = new THREE.LatheGeometry(points, segs);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 1) {
      v.fromBufferAttribute(pos, i);
      const radial = Math.hypot(v.x, v.z) || 1;
      const nx = v.x / radial, nz = v.z / radial;
      const lump = (fbm(v.x * 0.55 + 3.1, v.y * 0.42, v.z * 0.55 - 1.7) - 0.42) * 1.9;
      const ridge = Math.pow(Math.abs(Math.sin(Math.atan2(v.z, v.x) * 3 + v.y * 0.9)), 6) * 0.38;
      const d = lump + ridge;
      v.x += nx * d + Math.sin(v.y * 0.21) * 0.55;
      v.z += nz * d + Math.cos(v.y * 0.17) * 0.55;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.deleteAttribute('uv');
    geo.deleteAttribute('normal');
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();

    this.heroMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x0a0d14,
      metalness: 0.92,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      iridescence: 0.55,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [100, 420],
      envMapIntensity: 1.5,
      side: THREE.DoubleSide
    });
    this.hero = new THREE.Mesh(geo, this.heroMaterial);
    this.scene.add(this.hero);
  }

  _buildRings() {
    const group = new THREE.Group();
    const count = this.compact ? 9 : 16;
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const warm = i % 2 === 0;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.6 + (i % 4) * 0.55, 0.028, 6, 160),
        new THREE.MeshBasicMaterial({
          color: warm ? 0x7fb4ff : 0x62e0e6,
          transparent: true,
          opacity: 0.55,
          fog: true
        })
      );
      ring.position.y = RING_BOTTOM + t * (RING_TOP - RING_BOTTOM);
      ring.rotation.set(Math.PI / 2 + Math.sin(i * 1.7) * 0.28, 0, Math.cos(i * 2.3) * 0.28);
      ring.userData.spin = (i % 2 ? 1 : -1) * (0.04 + (i % 3) * 0.02);
      group.add(ring);
    }
    this.rings = group;
    this.scene.add(group);
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
          metalness: 0.75,
          roughness: 0.24,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          iridescence: 0.5,
          iridescenceIOR: 1.4,
          iridescenceThicknessRange: [100, 380],
          envMapIntensity: 1.3
        })
      );
      body.add(frame);

      // screen
      const screenGeo = new THREE.ShapeGeometry(chamferShape(width, height, 0.4));
      const sp = screenGeo.attributes.position;
      const uv = screenGeo.attributes.uv;
      for (let i = 0; i < sp.count; i += 1) uv.setXY(i, sp.getX(i) / width + 0.5, sp.getY(i) / height + 0.5);
      uv.needsUpdate = true;

      const fallback = createPanelTexture(project, index, total, accent);
      this.textures.push(fallback);
      // base art (generated or screenshot) vs. the beat-driven texture used during a case study
      const art = { base: fallback, dyn: null, canvas: null, showingDyn: false };
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: fallback },
          uAccent: { value: accentColor.clone() },
          uTime: { value: 0 },
          uVel: { value: 0 },
          uHover: { value: 0 },
          uReveal: { value: 0 },
          uGlitch: { value: 0 },
          uFocus: { value: 0 }
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
        group, body, screen, material, glow, outline, project, index,
        progress: project.progress, basePos, baseQuat,
        reveal: 0, hover: 0, arrived: 0, focus: 0, kick: 0, accent, art
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
        uPx: { value: this.renderer.getPixelRatio() }
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

  /* ---------- post-processing ---------- */

  _buildComposer(bounds) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(bounds.width, bounds.height);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(bounds.width, bounds.height),
      this.compact ? 0.35 : 0.6,
      0.7,
      0.82
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
    this.bloom.setSize(bounds.width, bounds.height);
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
    this.progress += (target - prev) * (this.reduced ? 1 : 1 - Math.exp(-delta * 3.4));
    const rawVel = delta > 0 ? Math.abs(this.progress - prev) / delta : 0;
    this.intro = this.reduced ? 1 : Math.min(1, this.intro + delta / INTRO_SECONDS);
    const introE = 1 - Math.pow(1 - this.intro, 3); // ease-out cubic
    this.pulse *= Math.exp(-delta * 2.6);
    const wantedVel = this.reduced ? 0 : Math.min(rawVel * 5 + this.pulse * 0.9 + (1 - introE) * 0.9, 1.5);
    this.velocity += (wantedVel - this.velocity) * (1 - Math.exp(-delta * 6));

    const m = this.reduced ? new THREE.Vector2() : this.mouse;
    this.mouseSmooth.lerp(m, 1 - Math.exp(-delta * 3));

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
    const breathe = this.reduced ? 0 : Math.sin(this.time * 0.8) * 22;
    this.lightA.intensity = 260 + breathe;
    this.lightB.intensity = 230 - breathe;

    this._updateHover();

    // camera basis for the focus pose (panel sits right of centre so the text column has room)
    const fwd = this._tmpA.set(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = this._tmpB.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = this._tmpC.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
    this._target.copy(this.camera.position)
      .addScaledVector(fwd, 10)
      .addScaledVector(right, this.compact ? 0 : 3.0)
      .addScaledVector(up, this.compact ? 1.9 : 0.15);

    const focusMax = this.cards.reduce((mx, c) => Math.max(mx, c.focus), 0);
    const dim = 1 - 0.85 * focusMax;
    const k = 1 - Math.exp(-delta * (this.reduced ? 40 : 4.5));

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
      card.group.visible = reveal > 0.005;

      // fly between the path pose and the camera-facing pose
      card.group.position.lerpVectors(card.basePos, this._target, e);
      card.group.quaternion.slerpQuaternions(card.baseQuat, this.camera.quaternion, e);
      const baseScale = 0.82 + 0.18 * reveal;
      card.group.scale.setScalar(THREE.MathUtils.lerp(baseScale, this.compact ? 0.78 : 1.12, e));

      const isHover = this.cards[this.hoverIndex] === card;
      card.hover += ((isHover ? 1 : 0) - card.hover) * (1 - Math.exp(-delta * 8));

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

      const u = card.material.uniforms;
      u.uTime.value = this.time;
      u.uVel.value = this.velocity;
      u.uHover.value = Math.max(card.hover, e * 0.5);
      u.uReveal.value = reveal;
      u.uGlitch.value = Math.max(card.arrived, card.hover * 0.15) * (1 - 0.8 * e);
      u.uFocus.value = e;
      card.glow.material.opacity = reveal * (0.2 + card.hover * 0.14 + e * 0.12);
      card.outline.material.opacity = reveal * (0.35 + card.hover * 0.5 + e * 0.3 + (this.highlight?.has(card.index) ? 0.35 : 0));

      const float = this.reduced ? 0 : Math.sin(this.time * 0.6 + card.index * 2) * 0.1;
      card.body.position.y = float;
    });

    this.heroMaterial.iridescenceThicknessRange = [100 + Math.sin(this.time * 0.15) * 30, 420];
    this.rings.children.forEach(r => { r.rotation.z += r.userData.spin * delta * (this.reduced ? 0 : 1 + this.velocity * 4); });

    const pu = this.particleMaterial.uniforms;
    pu.uTime.value = this.time;
    pu.uProgress.value = p;
    pu.uVel.value = this.velocity;

    const lu = this.lookPass.uniforms;
    lu.uTime.value = this.time;
    lu.uVel.value = this.velocity;
    lu.uGrain.value = this.reduced ? 0.012 : 0.028;
    lu.uIntro.value = introE;

    this.composer.render(delta);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
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
    this.envTarget?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}