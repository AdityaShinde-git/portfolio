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
const COLUMN_BOTTOM = -41;
const COLUMN_TOP = 21;
const CAMERA_PHASE = 0.72;

// Default chapters. Pass your own via options.projects (see constructor).
// `image` is optional: a screenshot/video-poster URL. Without it a schematic
// interface texture is drawn so the scene never shows an empty panel.
const DEFAULT_PROJECTS = [
  { kind: 'oms', label: 'OMS / WORKSPACE', progress: 0.34, accent: 0xd8a06f, image: null },
  { kind: 'dafca', label: 'DAFCA / MESSAGES', progress: 0.7, accent: 0x7fc4b6, image: null }
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

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/* Schematic fallback shown until (or unless) a real screenshot loads. */
function createInterfaceTexture(kind, accentHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 800;
  const c = canvas.getContext('2d');
  const accent = `#${accentHex.toString(16).padStart(6, '0')}`;
  const ink = '#edf1eb';
  const muted = '#8f9b97';
  const oms = kind === 'oms';

  c.fillStyle = '#0d1214';
  c.fillRect(0, 0, 1280, 800);
  c.fillStyle = '#151c1f';
  c.fillRect(0, 0, 1280, 72);
  c.fillStyle = accent;
  c.fillRect(0, 0, 8, 800);
  c.fillStyle = ink;
  c.font = '600 25px Arial, sans-serif';
  c.fillText(oms ? 'OMS  /  WORKSPACE' : 'DAFCA  /  MESSAGES', 38, 45);
  c.fillStyle = muted;
  c.font = '16px Arial, sans-serif';
  c.fillText('PROJECT INTERFACE · SCHEMATIC', 900, 42);

  c.fillStyle = '#12191c';
  c.fillRect(0, 72, 230, 728);
  const nav = oms
    ? ['OVERVIEW', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'ANNOUNCEMENTS', 'TICKETS']
    : ['CONVERSATIONS', 'DIRECT MESSAGES', 'CHANNELS', 'SHARED FILES', 'PEOPLE'];
  c.font = '17px Arial, sans-serif';
  nav.forEach((item, i) => {
    const y = 132 + i * 62;
    if (i === 0) {
      c.fillStyle = '#1d282c';
      c.fillRect(18, y - 28, 194, 42);
      c.fillStyle = accent;
      c.fillRect(18, y - 28, 4, 42);
    }
    c.fillStyle = i === 0 ? ink : muted;
    c.fillText(item, 36, y);
  });

  c.fillStyle = ink;
  c.font = '600 34px Arial, sans-serif';
  c.fillText(oms ? 'People operations' : 'Team conversations', 278, 137);
  c.fillStyle = muted;
  c.font = '18px Arial, sans-serif';
  c.fillText(oms ? 'Connected modules for everyday workplace workflows' : 'Persistent messages, shared files, live collaboration', 280, 174);

  const cards = oms ? ['EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL'] : ['MESSAGES', 'CONVERSATIONS', 'FILES'];
  const cw = oms ? 220 : 285;
  cards.forEach((label, i) => {
    const x = 280 + i * (cw + 18);
    c.fillStyle = '#162024';
    c.fillRect(x, 215, cw, 110);
    c.strokeStyle = '#2b3a40';
    c.lineWidth = 2;
    c.strokeRect(x, 215, cw, 110);
    c.fillStyle = accent;
    c.fillRect(x + 18, 233, 5, 72);
    c.fillStyle = muted;
    c.font = '15px Arial, sans-serif';
    c.fillText('WORKFLOW', x + 36, 257);
    c.fillStyle = ink;
    c.font = '600 19px Arial, sans-serif';
    c.fillText(label, x + 36, 287);
  });

  c.fillStyle = '#162024';
  c.fillRect(280, 355, 930, 388);
  c.fillStyle = '#1d282c';
  c.fillRect(280, 355, 930, 52);
  c.fillStyle = accent;
  c.font = '600 15px Arial, sans-serif';
  c.fillText(oms ? 'MODULE WORKFLOWS' : 'RECENT ACTIVITY', 305, 388);
  const rows = oms
    ? ['Employee records', 'Time and attendance', 'Leave requests', 'Payroll workflows', 'Announcements and tickets']
    : ['Persistent conversations', 'Real-time message updates', 'Shared files', 'Conversation history', 'Backend communication APIs'];
  rows.forEach((label, i) => {
    const y = 467 + i * 54;
    c.strokeStyle = '#243037';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(304, y + 17);
    c.lineTo(1188, y + 17);
    c.stroke();
    c.fillStyle = accent;
    c.beginPath();
    c.arc(316, y, 6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ink;
    c.font = '18px Arial, sans-serif';
    c.fillText(label, 338, y + 6);
    c.fillStyle = muted;
    c.font = '15px Arial, sans-serif';
    c.fillText(oms ? 'CONNECTED MODULE' : 'REAL-TIME SYSTEM', 925, y + 6);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/* ------------------------------------------------------------------ */
/*  Shaders                                                            */
/* ------------------------------------------------------------------ */

const SCREEN_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SCREEN_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uVel;
  uniform float uHover;
  uniform float uReveal;
  uniform float uGlitch;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;

    // short horizontal tear, only while the chapter is arriving or on hover
    float row = floor(uv.y * 34.0 + floor(uTime * 8.0));
    float tear = step(0.965, hash(vec2(row, floor(uTime * 8.0)))) * uGlitch;
    uv.x += tear * 0.025;

    float split = 0.0012 + uVel * 0.006 + uHover * 0.004 + uGlitch * 0.004;
    vec3 col;
    col.r = texture2D(uMap, uv + vec2(split, 0.0)).r;
    col.g = texture2D(uMap, uv).g;
    col.b = texture2D(uMap, uv - vec2(split, 0.0)).b;

    // fine scanline + grain, very low amplitude
    col *= 0.96 + 0.04 * sin(uv.y * 900.0);
    col += (hash(uv * 900.0 + uTime) - 0.5) * 0.035;

    // soft edge vignette so the glass reads as lit from within
    vec2 e = abs(uv - 0.5) * 2.0;
    col *= 1.0 - 0.28 * smoothstep(0.55, 1.15, max(e.x, e.y));
    col *= mix(0.78, 1.12, uHover);

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

    vec3 warm = vec3(1.0, 0.52, 0.78);
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

// Final look pass: chromatic aberration that scales with scroll velocity,
// film grain, vignette. Runs before OutputPass (tone mapping / sRGB).
const LookShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVel: { value: 0 },
    uGrain: { value: 0.045 },
    uAberration: { value: 0.0006 }
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
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 dir = vUv - 0.5;
      float dist = dot(dir, dir);
      float ca = uAberration + uVel * 0.0035 * (0.4 + dist * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + dir * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - dir * ca).b;
      col += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 91.0) - 0.5) * uGrain;
      col *= 1.0 - smoothstep(0.25, 0.95, dist * 1.9) * 0.55;
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
   * @param {HTMLElement} scrollArea       kept for API compatibility
   * @param {() => number} getProgress     scroll progress, 0..1
   * @param {object} [options]
   * @param {Array<{kind?:string,label?:string,progress:number,accent?:number,image?:string|null,href?:string}>} [options.projects]
   * @param {(project:object)=>void} [options.onSelect]   called when a hovered panel is clicked
   */
  constructor(canvas, scrollArea, getProgress, options = {}) {
    this.canvas = canvas;
    this.scrollArea = scrollArea;
    this.getProgress = getProgress;
    this.options = options;
    this.projects = options.projects?.length ? options.projects : DEFAULT_PROJECTS;

    this.disposed = false;
    this.progress = clamp01(getProgress?.() ?? 0);
    this.velocity = 0;
    this.time = 0;
    this.mouse = new THREE.Vector2();
    this.mouseSmooth = new THREE.Vector2();
    this.hoverIndex = -1;
    this.cards = [];
    this.textures = [];
    this.animatedLights = [];

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

  _init() {
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, this.compact ? 1.25 : 1.75);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // composer handles its own targets; bloom hides edge aliasing
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(bounds.width, bounds.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070b);
    this.scene.fog = new THREE.FogExp2(0x05070b, 0.0105);

    // Image-based light: gives the glass and iridescent hero something to reflect.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    if ('environmentIntensity' in this.scene) this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(45, bounds.width / bounds.height, 0.1, 220);
    this.camera.position.set(0, 12, 25);

    this.scene.add(new THREE.HemisphereLight(0x6f7fb8, 0x1a0f22, 0.55));

    // two colored lights that travel with the camera: magenta one side, teal the other
    this.lightA = new THREE.PointLight(0xff5fb4, 260, 46, 2);
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

  /* ---------- hero: one sculpted, iridescent spine ---------- */

  _buildHero() {
    const segs = this.compact ? 72 : 140;
    const steps = this.compact ? 260 : 460;
    const points = [];
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const y = COLUMN_BOTTOM + t * (COLUMN_TOP - COLUMN_BOTTOM);
      // vertebra rhythm: bulbous discs separated by narrow necks
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
      // organic lumps + a slow lateral drift so the column is never a perfect cylinder
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
      iridescence: 1,
      iridescenceIOR: 1.55,
      iridescenceThicknessRange: [180, 720],
      envMapIntensity: 1.5,
      side: THREE.DoubleSide
    });
    this.hero = new THREE.Mesh(geo, this.heroMaterial);
    this.scene.add(this.hero);
  }

  /* thin orbiting rings: lets the eye read the vertical travel */
  _buildRings() {
    const group = new THREE.Group();
    const count = this.compact ? 9 : 16;
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const warm = i % 2 === 0;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.6 + (i % 4) * 0.55, 0.028, 6, 160),
        new THREE.MeshBasicMaterial({
          color: warm ? 0xff7fc4 : 0x62e0e6,
          transparent: true,
          opacity: 0.55,
          fog: true
        })
      );
      ring.position.y = COLUMN_BOTTOM + 4 + t * (COLUMN_TOP - COLUMN_BOTTOM - 8);
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

    this.projects.forEach((project, index) => {
      const accent = project.accent ?? 0x7fc4b6;
      const group = new THREE.Group();
      const phase = CAMERA_PHASE + (index % 2 ? 0.1 : -0.1);
      const radial = this._radial(project.progress, phase);
      group.position.copy(this._path(project.progress, -2.6, 2.1, phase));
      group.rotation.y = Math.atan2(radial.x, radial.z);
      group.userData = { project, index, progress: project.progress, base: 1 };
      this.scene.add(group);

      // glass-and-metal frame
      const frameShape = roundedRectShape(width + 0.34, height + 0.34, 0.5);
      const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.06,
        bevelSize: 0.06,
        bevelSegments: 3,
        curveSegments: 14
      });
      frameGeo.translate(0, 0, -0.34);
      const frame = new THREE.Mesh(
        frameGeo,
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(accent).multiplyScalar(0.22),
          metalness: 0.75,
          roughness: 0.24,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          iridescence: 1,
          iridescenceIOR: 1.5,
          iridescenceThicknessRange: [200, 640],
          envMapIntensity: 1.3
        })
      );
      group.add(frame);

      // screen: rounded plane with real project art, RGB-split on scroll velocity
      const screenGeo = new THREE.ShapeGeometry(roundedRectShape(width, height, 0.42), 16);
      const sp = screenGeo.attributes.position;
      const uv = screenGeo.attributes.uv;
      for (let i = 0; i < sp.count; i += 1) uv.setXY(i, sp.getX(i) / width + 0.5, sp.getY(i) / height + 0.5);
      uv.needsUpdate = true;

      const fallback = createInterfaceTexture(project.kind ?? 'oms', accent);
      this.textures.push(fallback);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: fallback },
          uTime: { value: 0 },
          uVel: { value: 0 },
          uHover: { value: 0 },
          uReveal: { value: 0 },
          uGlitch: { value: 0 }
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
            material.uniforms.uMap.value = tex;
          },
          undefined,
          () => { /* keep the schematic fallback */ }
        );
      }
      const screen = new THREE.Mesh(screenGeo, material);
      screen.position.z = 0.02;
      group.add(screen);

      // soft glow plate behind the panel, picked up by bloom
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(width * 1.35, height * 1.5),
        new THREE.MeshBasicMaterial({
          color: accent,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      glow.position.z = -0.7;
      group.add(glow);

      this.cards.push({ group, screen, material, glow, project, reveal: 0, hover: 0, arrived: 0 });
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
      this.compact ? 0.35 : 0.6, // strength
      0.7,                       // radius
      0.82                       // threshold: only the brightest edges glow
    );
    this.composer.addPass(this.bloom);

    this.lookPass = new ShaderPass(LookShader);
    this.composer.addPass(this.lookPass);
    this.composer.addPass(new OutputPass());
  }

  /* ---------- interaction ---------- */

  _onPointerMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._pointer = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1)
    };
    this.mouse.set(this._pointer.x, this._pointer.y);
  }

  _onClick() {
    if (this.hoverIndex < 0) return;
    const project = this.cards[this.hoverIndex]?.project;
    if (!project) return;
    if (this.options.onSelect) this.options.onSelect(project);
    else if (project.href) window.open(project.href, '_blank', 'noopener');
  }

  _updateHover() {
    if (!this._pointer) return;
    this._raycaster ||= new THREE.Raycaster();
    this._raycaster.setFromCamera(this._pointer, this.camera);
    const targets = this.cards.filter(c => c.reveal > 0.5).map(c => c.screen);
    const hit = this._raycaster.intersectObjects(targets, false)[0];
    const next = hit ? this.cards.findIndex(c => c.screen === hit.object) : -1;
    if (next !== this.hoverIndex) {
      this.hoverIndex = next;
      this.canvas.style.cursor = next >= 0 ? 'pointer' : '';
    }
  }

  _resize() {
    if (!this.renderer || this.disposed) return;
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
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

    // damped scroll: the camera glides to where the page is, it doesn't snap
    const target = clamp01(this.getProgress());
    const prev = this.progress;
    this.progress += (target - prev) * (this.reduced ? 1 : 1 - Math.exp(-delta * 3.4));
    const rawVel = delta > 0 ? Math.abs(this.progress - prev) / delta : 0;
    const wantedVel = this.reduced ? 0 : Math.min(rawVel * 5, 1.4);
    this.velocity += (wantedVel - this.velocity) * (1 - Math.exp(-delta * 6));

    // pointer parallax (smoothed, off for reduced motion)
    const m = this.reduced ? new THREE.Vector2() : this.mouse;
    this.mouseSmooth.lerp(m, 1 - Math.exp(-delta * 3));

    const p = this.progress;
    const radial = this._radial(p, CAMERA_PHASE);
    const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
    const cam = this._path(p, 11, 7, CAMERA_PHASE);
    cam.addScaledVector(tangent, this.mouseSmooth.x * 1.5);
    cam.y += this.mouseSmooth.y * 0.9;
    const focus = new THREE.Vector3(0, TOP_Y - p * DROP, 0);
    focus.addScaledVector(tangent, -this.mouseSmooth.x * 0.5);
    this.camera.position.copy(cam);
    this.camera.lookAt(focus);

    // the two accent lights ride along with the camera
    this.lightA.position.copy(focus).addScaledVector(radial, 8).addScaledVector(tangent, 6).add(new THREE.Vector3(0, 4, 0));
    this.lightB.position.copy(focus).addScaledVector(radial, 8).addScaledVector(tangent, -6).add(new THREE.Vector3(0, -2, 0));
    const breathe = this.reduced ? 0 : Math.sin(this.time * 0.8) * 22;
    this.lightA.intensity = 260 + breathe;
    this.lightB.intensity = 230 - breathe;

    this._updateHover();

    this.cards.forEach(card => {
      const dist = Math.abs(p - card.group.userData.progress);
      const reveal = smooth(0.0, 1.0, clamp01((0.24 - dist) / 0.11));
      const wasHidden = card.reveal < 0.02;
      card.reveal = reveal;
      card.group.visible = reveal > 0.005;
      card.group.scale.setScalar(0.82 + 0.18 * reveal);

      // brief glitch burst when a chapter arrives
      if (wasHidden && reveal > 0.02 && !this.reduced) card.arrived = 1;
      card.arrived = Math.max(0, card.arrived - delta * 1.8);

      const isHover = this.cards[this.hoverIndex] === card;
      card.hover += ((isHover ? 1 : 0) - card.hover) * (1 - Math.exp(-delta * 8));

      const u = card.material.uniforms;
      u.uTime.value = this.time;
      u.uVel.value = this.velocity;
      u.uHover.value = card.hover;
      u.uReveal.value = reveal;
      u.uGlitch.value = Math.max(card.arrived, card.hover * 0.15);
      card.glow.material.opacity = reveal * (0.05 + card.hover * 0.06);

      // slow float so panels feel suspended, not placed
      const float = this.reduced ? 0 : Math.sin(this.time * 0.6 + card.group.userData.index * 2) * 0.1;
      card.group.children[0].position.y = float;
      card.screen.position.y = float;
    });

    this.heroMaterial.iridescenceThicknessRange = [180 + Math.sin(this.time * 0.15) * 40, 720];
    this.rings.children.forEach(r => { r.rotation.z += r.userData.spin * delta * (this.reduced ? 0 : 1 + this.velocity * 4); });

    const pu = this.particleMaterial.uniforms;
    pu.uTime.value = this.time;
    pu.uProgress.value = p;
    pu.uVel.value = this.velocity;

    const lu = this.lookPass.uniforms;
    lu.uTime.value = this.time;
    lu.uVel.value = this.velocity;
    lu.uGrain.value = this.reduced ? 0.02 : 0.045;

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
    this.canvas.style.cursor = '';
    this.scene.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
      else object.material?.dispose();
    });
    this.textures.forEach(t => t.dispose());
    this.envTarget?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}