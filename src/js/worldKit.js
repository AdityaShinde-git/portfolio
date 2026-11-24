/*
 * worldKit.js — shared plumbing for the film worlds (graph, city, rally).
 * A world is a 3D scene that is a pure function of film time. This builds the stage around it:
 * camera pair (current + a hair earlier, for motion blur), the off-screen target, and the post inputs.
 */
import * as THREE from 'three';

export const FILM = 25;
export const SHOT_LEN = 5;
export const clamp01 = x => Math.max(0, Math.min(1, x));
export const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const ease = x => { x = clamp01(x); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
export const mix = (a, b, t) => a + (b - a) * t;
export const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const hh = (t, a, f = 1) => (Math.sin(t * 1.7 * f) + 0.6 * Math.sin(t * 2.9 * f + 1.3) + 0.3 * Math.sin(t * 5.3 * f + 0.4)) * a;
export const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function makeStage(renderer, scene) {
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 2600);
  const prevCam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 2600);
  const rt = new THREE.WebGLRenderTarget(832, 520, {
    type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    depthBuffer: true, generateMipmaps: false
  });
  rt.texture.colorSpace = THREE.NoColorSpace;
  const state = { rt, k: 0, lt: 0, flash: 0, blur: new THREE.Vector2(), zoom: 0, sharp: 0.2, sun: new THREE.Vector3(0.5, 0.5, 0) };
  const A = {}, B = {}, tmp = new THREE.Vector3(), fwd = new THREE.Vector3();

  const apply = (camera, r, aspect) => {
    camera.position.copy(r.pos);
    camera.fov = r.fov; camera.aspect = aspect;
    camera.up.set(Math.sin(r.roll || 0), Math.cos(r.roll || 0), 0);
    camera.lookAt(r.tgt);
    camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  };

  // rig(tf, out) -> { pos, tgt, fov, roll, zoom, sharp, k, lt }; draw(tf, cam) updates anything that moves
  function frame(rig, draw, tfIn, aspect, width, height, sunDir) {
    const tf = ((tfIn % FILM) + FILM) % FILM;
    if (rt.width !== width || rt.height !== height) rt.setSize(width, height);
    const r = rig(tf, A);
    const r2 = rig(Math.max(r.k * SHOT_LEN, tf - 1 / 40), B);
    apply(prevCam, r2, aspect);
    apply(cam, r, aspect);
    draw(tf, cam, r);
    renderer.setRenderTarget(rt);
    renderer.render(scene, cam);
    renderer.setRenderTarget(null);
    tmp.copy(r.tgt).sub(r.pos).normalize().multiplyScalar(60).add(r.pos);
    const a = tmp.clone().project(cam), b = tmp.clone().project(prevCam);
    state.blur.set(Math.max(-0.09, Math.min(0.09, (a.x - b.x) * 0.25)), Math.max(-0.09, Math.min(0.09, (a.y - b.y) * 0.25)));
    state.zoom = r.zoom || 0; state.sharp = r.sharp ?? 0.2; state.k = r.k; state.lt = r.lt;
    if (sunDir) {
      tmp.copy(sunDir).multiplyScalar(1000).add(cam.position);
      const sp = tmp.project(cam);
      cam.getWorldDirection(fwd);
      state.sun.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5, smooth(fwd.dot(sunDir) * 4));
    } else state.sun.set(0.5, 0.5, 0);
    state.flash = 0.5 * Math.exp(-r.lt * 12);
    return state;
  }
  return { cam, rt, state, frame };
}

export function shotOf(tf) {
  const k = Math.min(4, Math.floor(tf / SHOT_LEN));
  return { k, lt: tf - k * SHOT_LEN, u: (tf - k * SHOT_LEN) / SHOT_LEN };
}

export function singleton(cache, build) {
  return renderer => {
    let w = cache.get(renderer);
    if (!w) { w = build(renderer); w.refs = 0; cache.set(renderer, w); }
    w.refs++;
    w.release = () => {
      if (--w.refs > 0) return;
      cache.delete(renderer);
      w.rt.dispose();
      w.scene?.traverse(o => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach(x => x.dispose?.()); });
    };
    return w;
  };
}