<<<<<<< HEAD:src/js/WorkReel.js
/*
 * workReel.js — the film that plays on a project's card while its case study is open.
 *
 * A real 3D rally stage (rallyScene.js) filmed with five camera set-ups of five seconds: low front tracking,
 * a roadside pass, a wheel-height run, a drone sweep and a rear chase through the dust. This file is the lens:
 * motion blur from the real camera movement, radial speed blur, chromatic fringe, bloom, a sun streak,
 * teal-and-amber grade, grain and the title cards (project, subtitle, stack, outro) laid over it.
 *
 * It renders into a small off-screen target that the card shows as its screen, so it costs nothing
 * unless a case study is open.
 */
import * as THREE from 'three';
import { getRally } from './rallyScene.js';
import { getGraph } from './worldGraph.js';
import { getCity } from './worldCity.js';

// which film suits the project: the knowledge graph, the night city, or (for driving) the rally stage
function pickWorld(project) {
  const t = `${project.title} ${project.subtitle || ''} ${project.overview || ''} ${(project.tech || []).join(' ')}`.toLowerCase();
  if (/rally|racing|\bcar\b|driv|vehicle|automotive/.test(t)) return getRally;
  if (/graph|knowledge|\bnotes?\b|vector|embedding|semantic|retriev|search|memory|chat|messag|socket|conversation|real-?time|network|social/.test(t)) return getGraph;
  return getCity;
}

const SANS = '"Chakra Petch","Space Grotesk","JetBrains Mono",Menlo,Consolas,monospace';
const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,"Courier New",monospace';
export const REEL_SHOT = 5; // seconds per shot

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uScene, uText;
  uniform float uAspect, uTime, uLt, uShot, uFlash, uZoom, uSharp, uLinear;
  uniform vec2 uBlur;
  uniform vec3 uSun, uC1, uC2;

  float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 S(vec2 p) { return texture2D(uScene, clamp(p, 0.001, 0.999)).rgb; }
  float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

  void main() {
    vec2 uv01 = vUv;
    vec2 c = uv01 - 0.5;
    vec2 ca = c * vec2(uAspect, 1.0);
    float r = length(ca);
    // lens barrel
    vec2 uv = 0.5 + c * (1.0 + 0.035 * dot(ca, ca));

    // motion blur: the camera's own movement (strong away from the subject) plus a speed zoom
    float mask = smoothstep(uSharp, uSharp + 0.38, r);
    vec2 step1 = (uBlur * mask - c * uZoom * smoothstep(0.08, 0.7, r)) / 10.0;
    float fr = 0.0035 + 0.007 * r;                               // chromatic fringe grows to the edges
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 10; i++) {
      vec2 p = uv + step1 * (float(i) - 4.5);
      acc.r += S(p + c * fr).r;
      acc.g += S(p).g;
      acc.b += S(p - c * fr).b;
    }
    vec3 col = acc / 10.0;

    // bloom: a wide spiral of the over-bright parts
    vec3 glow = vec3(0.0);
    for (int i = 0; i < 14; i++) {
      float fi = float(i);
      float ang = fi * 2.39996;
      float rad = 0.004 + 0.075 * sqrt((fi + 0.5) / 14.0);
      vec3 s = S(uv + vec2(cos(ang) / uAspect, sin(ang)) * rad);
      glow += max(s - 0.85, 0.0) * (1.0 - 0.5 * rad / 0.08);
    }
    col += glow / 14.0 * 1.25 * vec3(1.0, 0.82, 0.66);

    // the sun: soft halo, a long anamorphic streak and two ghosts, hidden when something covers it
    float occ = 1.0 - smoothstep(2.0, 6.0, luma(S(uSun.xy))) * 0.0;
    float sunSee = uSun.z * smoothstep(0.7, 3.0, luma(S(clamp(uSun.xy, 0.02, 0.98))));
    if (sunSee > 0.001) {
      vec2 d = uv01 - uSun.xy; d.x *= uAspect;
      float halo = exp(-length(d) * 5.5) * 0.35 + exp(-length(d) * 22.0) * 0.5;
      float streak = exp(-abs(d.y) * 70.0) * exp(-abs(d.x) * 2.4) * 0.5;
      vec3 tint = vec3(1.0, 0.6, 0.32);
      col += tint * (halo + streak * vec3(0.85, 0.9, 1.25)) * sunSee * 0.55;
      for (int g = 0; g < 2; g++) {
        vec2 gp = uSun.xy + (vec2(0.5) - uSun.xy) * (g == 0 ? 1.45 : 2.1);
        vec2 gd = uv01 - gp; gd.x *= uAspect;
        col += (g == 0 ? vec3(0.35, 0.5, 0.7) : vec3(0.7, 0.4, 0.25)) * smoothstep(0.07, 0.0, length(gd)) * sunSee * 0.09;
      }
    }

    col *= 1.55 * (1.0 + uFlash * 1.4);
    // filmic curve, then teal in the shadows and amber in the lights
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    float L = luma(col);
    col *= mix(vec3(0.9, 1.0, 1.1), vec3(1.07, 1.0, 0.9), smoothstep(0.08, 0.7, L));
    col = mix(vec3(L), col, 1.08);
    col = pow(max(col, 0.0), vec3(1.06)) * 1.03;
    col *= 1.0 - 0.62 * pow(length(uv01 - 0.5) * 1.42, 2.2);

    // title cards: they belong to shots 0, 1, 3 and 4
    float T = uTime;
    int k = int(uShot + 0.5);
    int blk = k == 0 ? 0 : (k == 1 ? 1 : (k == 3 ? 2 : (k == 4 ? 3 : -1)));
    if (blk >= 0) {
      float tin = smoothstep(0.25, 0.9, uLt);
      float tout = 1.0 - smoothstep(5.0 - 1.5, 5.0 - 0.9, uLt);
      float a = tin * tout;
      if (a > 0.002) {
        // a soft dark pool behind the type so it reads over bright sky and dust
        vec2 sc = blk == 0 ? vec2(0.3, 0.26) : vec2(0.5, 0.5);
        vec2 sd = (uv01 - sc) * vec2(blk == 0 ? 1.0 : 0.8, blk == 0 ? 1.7 : 1.3);
        col *= 1.0 - 0.5 * a * (1.0 - smoothstep(0.0, 0.62, length(sd)));
        vec2 tuv = uv01;
        float row = floor(tuv.y * 50.0);
        float jit = (1.0 - tin);
        tuv.x += (h21(vec2(row, floor(T * 20.0))) - 0.5) * 0.06 * jit * jit;
        float off = 0.002 + 0.022 * jit;
        vec2 base = vec2(tuv.x, (3.0 - float(blk) + tuv.y) / 4.0);
        vec4 sr = texture2D(uText, base + vec2(off, 0.0));
        vec4 sg = texture2D(uText, base);
        vec4 sb = texture2D(uText, base - vec2(off, 0.0));
        vec3 tc = vec3(sr.r * sr.a, sg.g * sg.a, sb.b * sb.a);
        col = col * (1.0 - 0.55 * sg.a * a) + tc * a * 1.1;
      }
    }

    col += (h21(uv01 * vec2(1280.0, 800.0) + fract(T) * 91.0) - 0.5) * 0.05; // grain
    col = max(col, 0.0);
    if (uLinear > 0.5) col = pow(col, vec3(2.2));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function drawOverlay(canvas, project, index, total, accentHex) {
  const c = canvas.getContext('2d');
  const W = 1280, B = 800;
  const ar = (accentHex >> 16) & 255, ag = (accentHex >> 8) & 255, ab = accentHex & 255;
  const A = a => `rgba(${ar},${ag},${ab},${a})`;
  const pad2 = v => String(v).padStart(2, '0');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);

  const wrap = (text, maxW, maxLines) => {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  };
  const text = (s, x, y, font, color, align = 'left', spacing = 0) => {
    c.font = font;
    c.letterSpacing = `${spacing}px`;
    c.textAlign = align;
    c.fillStyle = color;
    c.fillText(s, x, y);
    c.letterSpacing = '0px';
    c.textAlign = 'left';
  };

  const title = String(project.title ?? 'UNTITLED').toUpperCase();
  const subtitle = String(project.subtitle || '').toUpperCase();
  const period = String(project.period || '').toUpperCase();

  // 0: opening title, lower left
  {
    const y0 = 0;
    text(`PROJECT ${pad2(index + 1)} — ${pad2(total)}`, 96, y0 + 120, `500 20px ${MONO}`, A(1), 'left', 5);
    text(period, W - 96, y0 + 120, `500 20px ${MONO}`, 'rgba(225,235,242,0.8)', 'right', 5);
    c.font = `500 104px ${SANS}`;
    c.letterSpacing = '3px';
    const lines = wrap(title, 1060, 3);
    const lh = 116;
    const top = B - 200 - (lines.length - 1) * lh;
    c.fillStyle = A(1);
    c.fillRect(96, top - 108, 120, 3);
    lines.forEach((l, i) => text(l, 96, y0 + top + i * lh, `500 104px ${SANS}`, '#ffffff', 'left', 3));
  }
  // 1: subtitle, centred
  {
    const y0 = B;
    text('A CASE STUDY', W / 2, y0 + 330, `500 20px ${MONO}`, A(1), 'center', 12);
    c.font = `500 56px ${SANS}`;
    c.letterSpacing = '6px';
    const lines = wrap(subtitle || title, 980, 3);
    lines.forEach((l, i) => text(l, W / 2, y0 + 420 + i * 78, `500 56px ${SANS}`, '#ffffff', 'center', 6));
    c.fillStyle = A(1);
    c.fillRect(W / 2 - 50, y0 + 420 + (lines.length - 1) * 78 + 50, 100, 3);
  }
  // 2: the stack
  {
    const y0 = B * 2;
    text('BUILT WITH', W / 2, y0 + 250, `500 20px ${MONO}`, A(1), 'center', 12);
    (project.tech || []).slice(0, 5).forEach((t, i) => {
      text(String(t).toUpperCase(), W / 2, y0 + 340 + i * 74, `500 52px ${SANS}`, '#ffffff', 'center', 10);
    });
  }
  // 3: outro
  {
    const y0 = B * 3;
    text('CASE STUDY', W / 2, y0 + 330, `500 20px ${MONO}`, A(1), 'center', 12);
    c.font = `500 64px ${SANS}`;
    c.letterSpacing = '5px';
    const lines = wrap(title, 1000, 3);
    lines.forEach((l, i) => text(l, W / 2, y0 + 420 + i * 82, `500 64px ${SANS}`, '#ffffff', 'center', 5));
    text(period, W / 2, y0 + 420 + (lines.length - 1) * 82 + 76, `500 22px ${MONO}`, A(1), 'center', 8);
  }
}

function accentPalette(accentHex) {
  const base = new THREE.Color(accentHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl, THREE.SRGBColorSpace);
  const s = Math.min(1, Math.max(hsl.s, 0.65));
  // authored in display space, so build them in display space too
  const mk = (h, sat, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, sat, l, THREE.SRGBColorSpace);
  const toVec = col => { const o = new THREE.Color().copy(col).convertLinearToSRGB(); return new THREE.Vector3(o.r, o.g, o.b); };
  return [
    toVec(mk(hsl.h, s, 0.46)),
    toVec(mk(hsl.h + 0.07, Math.min(1, s * 0.9), 0.62)),
    toVec(mk(hsl.h + 0.52, 0.55, 0.66))
  ];
}

/*
 * createReel({ renderer, project, index, total, accent, compact })
 *   -> { texture, reset(t0), update(delta), dispose(), debugRender(t, renderer) }
 */
export function createReel({ renderer, project, index, total, accent, compact }) {
  const SIZES = compact ? [384, 448, 512, 576] : [448, 576, 704, 832];
  const W = SIZES[3];
  const H = Math.round(W / 1.6);
  let curW = W;
  const rt = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false
  });
  rt.texture.colorSpace = THREE.NoColorSpace;

  const overlay = document.createElement('canvas');
  overlay.width = 1280;
  overlay.height = 3200;
  const overlayTex = new THREE.CanvasTexture(overlay);
  overlayTex.colorSpace = THREE.NoColorSpace;
  overlayTex.generateMipmaps = false;
  overlayTex.minFilter = THREE.LinearFilter;
  overlayTex.magFilter = THREE.LinearFilter;
  const redraw = () => { drawOverlay(overlay, project, index, total, accent); overlayTex.needsUpdate = true; };
  redraw();
  if (document.fonts?.load) {
    Promise.all([document.fonts.load('500 40px "Chakra Petch"'), document.fonts.load('500 20px "JetBrains Mono"')])
      .then(redraw)
      .catch(() => { /* keep the fallback font */ });
  }

  const makeWorld = pickWorld(project);
  let world = null, ready = false, warming = null, gone = false;
  const getW = () => world || (world = makeWorld(renderer)); // built lazily, in an idle slice, never at page load
  const [c1, c2] = accentPalette(accent);
  const tsum = [...String(project.title || '')].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uScene: { value: null },
      uText: { value: overlayTex },
      uAspect: { value: 1.6 }, uTime: { value: 0 }, uLt: { value: 0 }, uShot: { value: 0 },
      uFlash: { value: 0 }, uZoom: { value: 0 }, uSharp: { value: 0.2 }, uLinear: { value: 1 },
      uBlur: { value: new THREE.Vector2() }, uSun: { value: new THREE.Vector3(0.5, 0.5, 0) },
      uC1: { value: c1 }, uC2: { value: c2 }
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false
  });
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);

  const filmAt = (t, r, linear) => {
    const w = curW, h = Math.round(w / 1.6);
    const rally = getW();
    rally.setLook(accent, index + 1, (tsum + index * 3) | 0);
    const st = rally.render(t, w / h, w, h);
    const u = mat.uniforms;
    u.uTime.value = t; u.uLt.value = st.lt; u.uShot.value = st.k; u.uFlash.value = st.flash;
    u.uZoom.value = st.zoom; u.uSharp.value = st.sharp; u.uLinear.value = linear ? 1 : 0;
    u.uBlur.value.copy(st.blur); u.uSun.value.copy(st.sun);
    u.uScene.value = rally.rt.texture;
  };

  const reel = {
    texture: rt.texture,
    t: 0,
    acc: 0,
    // the film's resolution follows the page's frame-rate governor (level 0 = slowest machine .. 3 = fastest)
    setQuality(level) {
      const w = SIZES[Math.max(0, Math.min(3, level | 0))];
      if (w === curW) return;
      curW = w;
      rt.setSize(w, Math.round(w / 1.6));
    },
    // compile the shaders and upload textures ahead of time, so opening a card never stalls
    get ready() { return ready; },
    // build the world, compile both programs off-thread, then draw one frame so every buffer is uploaded
    warm() {
      if (warming) return warming;
      warming = new Promise(resolve => setTimeout(resolve, 0)).then(async () => {
        if (gone) return;
        const w = getW();
        w.prep?.();
        try { await Promise.all([renderer.compileAsync(w.scene, w.cam), renderer.compileAsync(scene, cam)]); } catch (e) { /* first frame compiles instead */ }
        if (gone) return;
        reel.update(0, true);
        ready = true;
      });
      return warming;
    },
    setSig() { /* the film no longer varies by signature scene */ },
    reset(t0 = 0) { reel.t = t0; reel.update(0, true); },
    update(delta, force) {
      reel.t += delta;
      reel.acc += delta;
      if (!force && reel.acc < 1 / 30) return; // the film runs at 30 fps: half the GPU cost, and it is what film looks like
      reel.acc = 0;
      filmAt(reel.t, renderer, true);
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
    },
    // draws straight to the given renderer's canvas in display colour (used by previews)
    debugRender(t, r) {
      filmAt(t, r, false);
      r.setRenderTarget(null);
      r.render(scene, cam);
    },
    dispose() {
      rt.dispose();
      overlayTex.dispose();
      mat.dispose();
      quad.geometry.dispose();
      gone = true;
      world?.release();
    }
  };
  return reel;
=======
/*
 * workReel.js — the short film that plays on a project's card while its case study is open.
 *
 * It is a real-time, GPU-rendered film, not a slideshow: five shots of about five seconds that loop —
 *   1. light flowing through smoke (warped noise with bright filaments and drifting sparks)
 *   2. a flight down a glowing lattice tunnel
 *   3. a liquid-chrome form turning slowly in a dark studio
 *   4. light streams (dashboard / data projects) or a pulsing node network (chat projects)
 *   5. the opening smoke again, from another angle
 * Shots whip-pan into each other with a flash. Over it: lens bend, slow push-ins,
 * film grain, vignette, and title cards (project, subtitle, stack, outro) that arrive with a glitchy split.
 * Everything is tinted from the project's own accent colour, and each project seeds its own variation.
 *
 * It renders to a small off-screen target that the card then shows as its screen, so it costs nothing
 * unless a case study is open.
 */
import * as THREE from 'three';

const SANS = '"Chakra Petch","Space Grotesk","JetBrains Mono",Menlo,Consolas,monospace';
const MONO = '"JetBrains Mono","SF Mono",Menlo,Consolas,"Courier New",monospace';
export const REEL_SHOT = 5; // seconds per shot (keep in sync with SHOT in the shader)

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSeed;
  uniform float uAspect;
  uniform float uTheme;   // 0 = streams, 1 = network
  uniform float uLinear;  // 1 = write linear colour (for the card), 0 = write display colour (for previews)
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform sampler2D uText;

  #define PI 3.14159265
  #define SHOT 5.0
  #define XF 0.9

  float h11(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
  float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = m * p; a *= 0.5; }
    return s;
  }
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

  /* ---------- 1. light in smoke ---------- */
  vec3 sparks(vec2 uv, float t) {
    vec3 c = vec3(0.0);
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 p = uv * (5.0 + fi * 4.0) + vec2(fi * 13.1 + uSeed, -t * (0.15 + fi * 0.1));
      vec2 id = floor(p);
      vec2 f = fract(p) - 0.5;
      float h = h21(id + fi * 7.0);
      vec2 off = (vec2(h21(id + 3.1), h21(id + 7.7)) - 0.5) * 0.6;
      float d = length(f - off);
      float tw = 0.5 + 0.5 * sin(t * (1.0 + h * 3.0) + h * 40.0);
      float s = smoothstep(0.07 + 0.02 * fi, 0.0, d) * step(0.55, h) * tw;
      c += (mix(uC1, uC3, h) + 0.3) * s * (1.3 - fi * 0.3);
    }
    return c;
  }
  vec3 sceneFlow(vec2 uv, float t, float variant) {
    vec2 p = uv * vec2(0.9, 1.0) + vec2(uSeed * 3.0 + variant * 7.0, uSeed);
    p.x += t * 0.035;
    vec2 q = vec2(fbm(p * 1.3 + t * 0.05), fbm(p * 1.3 + vec2(5.2, 1.3) - t * 0.04));
    vec2 r = vec2(fbm(p * 1.6 + 4.0 * q + vec2(1.7, 9.2) + t * 0.06), fbm(p * 1.6 + 4.0 * q + vec2(8.3, 2.8) - t * 0.05));
    float f = fbm(p * 1.4 + 4.0 * r);
    float ridge = 1.0 - abs(2.0 * fbm(p * 2.2 + 3.0 * r + t * 0.03) - 1.0);
    ridge = pow(ridge, 8.0);
    vec3 a = variant > 0.5 ? uC2 : uC1;
    vec3 b = variant > 0.5 ? uC1 : uC2;
    vec3 col = mix(vec3(0.006, 0.01, 0.02), a * 0.5, smoothstep(0.25, 0.95, f));
    col += b * ridge * 1.5 * smoothstep(0.3, 0.8, f);
    col += a * 0.3 * pow(f, 3.0);
    return col;
  }

  /* ---------- 2. lattice tunnel ---------- */
  vec3 sceneTunnel(vec2 uv, float t) {
    uv = rot(sin(t * 0.21) * 0.35 + t * 0.06) * uv;
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    float z = 0.55 / (r + 0.06) + t * 1.7;
    float ang = a / (2.0 * PI) * 26.0 + z * 0.04;
    vec2 g = vec2(ang, z * 0.9);
    vec2 id = floor(g);
    vec2 fr = abs(fract(g) - 0.5);
    float line = smoothstep(0.05, 0.0, 0.5 - fr.x) + smoothstep(0.05, 0.0, 0.5 - fr.y);
    float hsh = h21(id + uSeed);
    float lit = step(0.93, hsh) * (0.35 + 0.35 * sin(t * 2.0 + hsh * 40.0));
    float ring = smoothstep(0.05, 0.0, 0.5 - abs(fract(z * 0.45) - 0.5));
    float fog = smoothstep(0.0, 0.42, r);
    vec3 col = (line * uC1 * 0.55 + lit * uC2 * 0.9 + ring * uC1 * 0.5) * fog;
    col += uC1 * 0.05 / (r * r + 0.03);
    col += uC2 * 0.35 * exp(-r * 6.0);
    col *= smoothstep(1.8, 0.7, r + 0.0);
    return col;
  }

  /* ---------- 3. liquid chrome ---------- */
  float mapO(vec3 p) {
    float t = uTime;
    float d = length(p) - 1.0;
    d += 0.14 * sin(3.0 * p.x + t * 0.8) * sin(3.0 * p.y + t * 0.6 + 1.0) * sin(3.0 * p.z + t * 0.9 + uSeed);
    d += 0.04 * sin(10.0 * p.y + t * 1.2 + 3.0 * p.x);
    return d * 0.65;
  }
  vec3 envO(vec3 rd, float t) {
    vec3 c = vec3(0.004, 0.006, 0.012);
    c += uC2 * 3.2 * smoothstep(0.93, 0.99, dot(rd, normalize(vec3(-0.6, 0.5, 0.6))));
    c += uC1 * 2.8 * smoothstep(0.88, 0.97, dot(rd, normalize(vec3(0.7, -0.2, 0.5))));
    c += vec3(0.85, 0.92, 1.0) * 2.4 * smoothstep(0.96, 0.995, dot(rd, normalize(vec3(0.1, 0.9, -0.3))));
    c += uC1 * 0.28 * smoothstep(-0.1, -1.0, rd.y);
    c += uC3 * 1.6 * smoothstep(0.985, 1.0, sin(rd.x * 5.0 + rd.y * 3.0 + t * 0.8) * 0.5 + 0.5) * 0.5;
    return c;
  }
  vec3 sceneOrb(vec2 uv, float t) {
    float a = t * 0.18;
    vec3 ro = vec3(sin(a), 0.25, cos(a)) * 2.55;
    vec3 fw = normalize(-ro);
    vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
    vec3 up = cross(fw, rt);
    vec3 rd = normalize(fw * 1.5 + rt * uv.x + up * uv.y);
    float tt = 0.0, md = 10.0;
    for (int i = 0; i < 48; i++) {
      float d = mapO(ro + rd * tt);
      md = min(md, d);
      if (d < 0.002 || tt > 8.0) break;
      tt += d;
    }
    vec3 col = vec3(0.004, 0.006, 0.012) + uC1 * 0.32 * exp(-length(uv) * 1.4);
    float m = max(md, 0.0);
    col += uC2 * 0.004 / (0.01 + m * m) * 0.5;
    if (tt < 8.0) {
      vec3 p = ro + rd * tt;
      vec2 e = vec2(0.004, 0.0);
      vec3 n = normalize(vec3(mapO(p + e.xyy) - mapO(p - e.xyy), mapO(p + e.yxy) - mapO(p - e.yxy), mapO(p + e.yyx) - mapO(p - e.yyx)));
      float fr = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
      vec3 env = envO(reflect(rd, n), t);
      vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fr * 1.1 + vec3(0.0, 0.33, 0.67)) + t * 0.2);
      col = env * mix(vec3(0.75), irid * 0.8 + 0.3, 0.35) + uC1 * fr * 0.6 + env * fr;
    }
    return col;
  }

  /* ---------- 4a. light streams ---------- */
  vec3 sceneStreams(vec2 uv, float t) {
    vec3 col = vec3(0.005, 0.008, 0.014) + uC1 * 0.1 * exp(-abs(uv.y + 0.15) * 2.2);
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float sc = 1.0 + fi * 0.8;
      vec2 p = uv * vec2(9.0, 1.0) * sc;
      float cell = floor(p.x);
      float h = h11(cell + fi * 17.0 + uSeed * 9.0);
      float x = fract(p.x) - 0.5;
      float dir = mod(fi, 2.0) < 0.5 ? 1.0 : -1.0;
      float head = fract(uv.y * (0.35 + h * 0.4) * dir + t * (0.12 + h * 0.2 + fi * 0.04) + h * 9.0);
      float w = 0.018 + 0.03 * h / sc;
      float streak = smoothstep(w, 0.0, abs(x)) * pow(1.0 - head, 7.0);
      float tip = smoothstep(0.03, 0.0, head) * smoothstep(w * 4.0, 0.0, abs(x));
      vec3 c = mix(uC1, uC2, h);
      col += (c * streak * 1.9 + (c + 0.5) * tip * 1.6) * step(0.2, h) / (1.0 + fi * 0.5);
    }
    col += uC3 * 0.12 * smoothstep(0.01, 0.0, abs(uv.y - 0.55 * sin(t * 0.4))) ;
    return col;
  }

  /* ---------- 4b. node network ---------- */
  vec2 nodeAt(float i, float t) {
    float h1 = h11(i + uSeed * 5.0), h2 = h11(i * 3.7 + 1.0 + uSeed);
    return vec2(sin(t * (0.12 + h1 * 0.18) + h2 * 6.2831) * 1.45, cos(t * (0.1 + h2 * 0.16) + h1 * 6.2831) * 0.82);
  }
  vec3 sceneNet(vec2 uv, float t) {
    vec3 col = vec3(0.005, 0.008, 0.014) + uC1 * 0.08 * exp(-length(uv) * 1.2);
    for (int i = 0; i < 11; i++) {
      vec2 pi = nodeAt(float(i), t);
      float dn = length(uv - pi);
      col += mix(uC1, uC2, h11(float(i))) * 0.0025 / (dn * dn + 0.0006);
      for (int j = 0; j < 11; j++) {
        if (j <= i) continue;
        vec2 pj = nodeAt(float(j), t);
        float L = length(pj - pi);
        if (L > 1.15) continue;
        vec2 pa = uv - pi, ba = pj - pi;
        float s = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        float d = length(pa - ba * s);
        float fade = 1.0 - L / 1.15;
        float seg = smoothstep(0.004, 0.0, d) * fade * 0.55;
        float ph = fract(t * 0.35 + h11(float(i) * 7.0 + float(j)) * 3.0);
        float pulse = exp(-pow((ph - s) * 14.0, 2.0)) * smoothstep(0.012, 0.0, d) * 2.2 * fade;
        col += uC1 * seg + (uC2 + 0.4) * pulse;
      }
    }
    return col;
  }

  vec3 renderShot(int k, vec2 uv, float t) {
    if (k == 0) return sceneFlow(uv, t, 0.0) + sparks(uv, t) * 0.9;
    if (k == 1) return sceneTunnel(uv, t);
    if (k == 2) return sceneOrb(uv, t);
    if (k == 3) return uTheme > 0.5 ? sceneNet(uv, t) : sceneStreams(uv, t);
    return sceneFlow(uv * 0.8 + vec2(0.3, 0.1), t + 40.0, 1.0) + sparks(uv * 1.3, t + 9.0) * 0.8;
  }

  void main() {
    vec2 uv01 = vUv;
    vec2 uv = (uv01 - 0.5) * vec2(uAspect, 1.0) * 2.0;
    float T = uTime;
    float ft = mod(T, SHOT * 5.0);
    int k = int(floor(ft / SHOT));
    float lt = ft - float(k) * SHOT;
    int k2 = k >= 4 ? 0 : k + 1;
    float b = smoothstep(SHOT - XF, SHOT, lt);

    vec2 d = uv * (1.0 + 0.045 * dot(uv, uv)); // lens bend
    float push = 1.0 - 0.06 * (lt / SHOT);     // slow push-in
    vec3 col = renderShot(k, d * push + vec2(b * b * 0.55, 0.0), T);
    if (b > 0.001) {
      vec3 nxt = renderShot(k2, d - vec2((1.0 - b) * (1.0 - b) * 0.55, 0.0), T);
      col = mix(col, nxt, b);
      col += uC2 * 0.3 * exp(-pow((b - 0.5) * 4.0, 2.0));
    }

    col = col / (1.0 + col * 0.4);
    col *= 1.0 - 0.55 * pow(length(uv01 - 0.5) * 1.45, 2.0);
    col *= 1.0 + 0.012 * sin(T * 47.0);

    // title cards: they belong to shots 0, 1, 3 and 4
    int blk = k == 0 ? 0 : (k == 1 ? 1 : (k == 3 ? 2 : (k == 4 ? 3 : -1)));
    if (blk >= 0) {
      float tin = smoothstep(0.25, 0.9, lt);
      float tout = 1.0 - smoothstep(SHOT - 1.5, SHOT - 0.9, lt);
      float a = tin * tout;
      if (a > 0.002) {
        vec2 tuv = uv01;
        float row = floor(tuv.y * 50.0);
        float jit = (1.0 - tin);
        tuv.x += (h21(vec2(row, floor(T * 20.0))) - 0.5) * 0.06 * jit * jit;
        float off = 0.002 + 0.022 * jit;
        vec2 base = vec2(tuv.x, (3.0 - float(blk) + tuv.y) / 4.0);
        vec4 sr = texture2D(uText, base + vec2(off, 0.0));
        vec4 sg = texture2D(uText, base);
        vec4 sb = texture2D(uText, base - vec2(off, 0.0));
        vec3 tc = vec3(sr.r * sr.a, sg.g * sg.a, sb.b * sb.a);
        col = col * (1.0 - 0.6 * sg.a * a) + tc * a * 1.1;
      }
    }

    col += (h21(uv01 * vec2(1280.0, 800.0) + fract(T) * 91.0) - 0.5) * 0.055; // grain
    col = max(col, 0.0);
    if (uLinear > 0.5) col = pow(col, vec3(2.2));
    gl_FragColor = vec4(col, 1.0);
  }
`;

function drawOverlay(canvas, project, index, total, accentHex) {
  const c = canvas.getContext('2d');
  const W = 1280, B = 800;
  const ar = (accentHex >> 16) & 255, ag = (accentHex >> 8) & 255, ab = accentHex & 255;
  const A = a => `rgba(${ar},${ag},${ab},${a})`;
  const pad2 = v => String(v).padStart(2, '0');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);

  const wrap = (text, maxW, maxLines) => {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines.slice(0, maxLines);
  };
  const text = (s, x, y, font, color, align = 'left', spacing = 0) => {
    c.font = font;
    c.letterSpacing = `${spacing}px`;
    c.textAlign = align;
    c.fillStyle = color;
    c.fillText(s, x, y);
    c.letterSpacing = '0px';
    c.textAlign = 'left';
  };

  const title = String(project.title ?? 'UNTITLED').toUpperCase();
  const subtitle = String(project.subtitle || '').toUpperCase();
  const period = String(project.period || '').toUpperCase();

  // 0: opening title, lower left
  {
    const y0 = 0;
    text(`PROJECT ${pad2(index + 1)} — ${pad2(total)}`, 96, y0 + 120, `500 20px ${MONO}`, A(1), 'left', 5);
    text(period, W - 96, y0 + 120, `500 20px ${MONO}`, 'rgba(225,235,242,0.8)', 'right', 5);
    c.font = `500 104px ${SANS}`;
    c.letterSpacing = '3px';
    const lines = wrap(title, 1060, 3);
    const lh = 116;
    const top = B - 200 - (lines.length - 1) * lh;
    c.fillStyle = A(1);
    c.fillRect(96, top - 108, 120, 3);
    lines.forEach((l, i) => text(l, 96, y0 + top + i * lh, `500 104px ${SANS}`, '#ffffff', 'left', 3));
  }
  // 1: subtitle, centred
  {
    const y0 = B;
    text('A CASE STUDY', W / 2, y0 + 330, `500 20px ${MONO}`, A(1), 'center', 12);
    c.font = `500 56px ${SANS}`;
    c.letterSpacing = '6px';
    const lines = wrap(subtitle || title, 980, 3);
    lines.forEach((l, i) => text(l, W / 2, y0 + 420 + i * 78, `500 56px ${SANS}`, '#ffffff', 'center', 6));
    c.fillStyle = A(1);
    c.fillRect(W / 2 - 50, y0 + 420 + (lines.length - 1) * 78 + 50, 100, 3);
  }
  // 2: the stack
  {
    const y0 = B * 2;
    text('BUILT WITH', W / 2, y0 + 250, `500 20px ${MONO}`, A(1), 'center', 12);
    (project.tech || []).slice(0, 5).forEach((t, i) => {
      text(String(t).toUpperCase(), W / 2, y0 + 340 + i * 74, `500 52px ${SANS}`, '#ffffff', 'center', 10);
    });
  }
  // 3: outro
  {
    const y0 = B * 3;
    text('CASE STUDY', W / 2, y0 + 330, `500 20px ${MONO}`, A(1), 'center', 12);
    c.font = `500 64px ${SANS}`;
    c.letterSpacing = '5px';
    const lines = wrap(title, 1000, 3);
    lines.forEach((l, i) => text(l, W / 2, y0 + 420 + i * 82, `500 64px ${SANS}`, '#ffffff', 'center', 5));
    text(period, W / 2, y0 + 420 + (lines.length - 1) * 82 + 76, `500 22px ${MONO}`, A(1), 'center', 8);
  }
}

function accentPalette(accentHex) {
  const base = new THREE.Color(accentHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl, THREE.SRGBColorSpace);
  const s = Math.min(1, Math.max(hsl.s, 0.65));
  // authored in display space, so build them in display space too
  const mk = (h, sat, l) => new THREE.Color().setHSL(((h % 1) + 1) % 1, sat, l, THREE.SRGBColorSpace);
  const toVec = col => { const o = new THREE.Color().copy(col).convertLinearToSRGB(); return new THREE.Vector3(o.r, o.g, o.b); };
  return [
    toVec(mk(hsl.h, s, 0.46)),
    toVec(mk(hsl.h + 0.07, Math.min(1, s * 0.9), 0.62)),
    toVec(mk(hsl.h + 0.52, 0.55, 0.66))
  ];
}

/*
 * createReel({ renderer, project, index, total, accent, compact })
 *   -> { texture, reset(t0), update(delta), dispose(), debugRender(t, renderer) }
 */
export function createReel({ renderer, project, index, total, accent, compact }) {
  const W = compact ? 704 : 1024;
  const H = Math.round(W / 1.6);
  const rt = new THREE.WebGLRenderTarget(W, H, {
    type: THREE.HalfFloatType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    generateMipmaps: false
  });
  rt.texture.colorSpace = THREE.NoColorSpace;

  const overlay = document.createElement('canvas');
  overlay.width = 1280;
  overlay.height = 3200;
  const overlayTex = new THREE.CanvasTexture(overlay);
  overlayTex.colorSpace = THREE.NoColorSpace;
  overlayTex.generateMipmaps = false;
  overlayTex.minFilter = THREE.LinearFilter;
  overlayTex.magFilter = THREE.LinearFilter;
  const redraw = () => { drawOverlay(overlay, project, index, total, accent); overlayTex.needsUpdate = true; };
  redraw();
  if (document.fonts?.load) {
    Promise.all([document.fonts.load('500 40px "Chakra Petch"'), document.fonts.load('500 20px "JetBrains Mono"')])
      .then(redraw)
      .catch(() => { /* keep the fallback font */ });
  }

  const text = `${project.title} ${project.subtitle} ${project.overview || ''} ${(project.tech || []).join(' ')}`.toLowerCase();
  const chatty = /chat|messag|socket|conversation|real-?time|network|graph/.test(text);
  const [c1, c2, c3] = accentPalette(accent);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: ((index * 37 + 11) % 97) / 97 * 9.0 },
      uAspect: { value: 1.6 },
      uTheme: { value: chatty ? 1 : 0 },
      uLinear: { value: 1 },
      uC1: { value: c1 },
      uC2: { value: c2 },
      uC3: { value: c3 },
      uText: { value: overlayTex }
    },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: FRAG,
    depthTest: false,
    depthWrite: false
  });
  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  scene.add(quad);

  const reel = {
    texture: rt.texture,
    t: 0,
    reset(t0 = 0) { reel.t = t0; reel.update(0); },
    update(delta) {
      reel.t += delta;
      mat.uniforms.uTime.value = reel.t;
      mat.uniforms.uLinear.value = 1;
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(rt);
      renderer.render(scene, cam);
      renderer.setRenderTarget(prev);
    },
    // draws straight to the given renderer's canvas in display colour (used by previews)
    debugRender(t, r) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uLinear.value = 0;
      r.setRenderTarget(null);
      r.render(scene, cam);
    },
    dispose() {
      rt.dispose();
      overlayTex.dispose();
      mat.dispose();
      quad.geometry.dispose();
    }
  };
  return reel;
>>>>>>> 889a3ec7d0746aaf58606c89935d76eaaa619f6b:src/js/workReel.js
}