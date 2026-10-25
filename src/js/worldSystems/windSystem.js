/**
 * WindSystem — L2: Global wind field with gusts that travel across the map.
 * Drives grass, trees, banners, lanterns, smoke, audio.
 * A 128×128 gust texture updated per frame is sampled by shaders.
 */
import * as THREE from 'three';

export class WindSystem {
  constructor(worldState) {
    this.ws = worldState;

    // Base wind direction (slow rotation)
    this._baseDirAngle = this.ws.rng() * Math.PI * 2;
    this._baseSpeed = 4 + this.ws.rng() * 3; // 2–9 m/s

    // Gust texture: 128×128 float-ish canvas (R = gust strength at that world cell)
    this.gustCanvas = document.createElement('canvas');
    this.gustCanvas.width = 128;
    this.gustCanvas.height = 128;
    this.gustCtx = this.gustCanvas.getContext('2d');

    this.gustTexture = new THREE.CanvasTexture(this.gustCanvas);
    this.gustTexture.wrapS = THREE.RepeatWrapping;
    this.gustTexture.wrapT = THREE.RepeatWrapping;

    // Pre-built gust noise (2 layers)
    this._noiseA = this._buildNoise(128, 128, 42);
    this._noiseB = this._buildNoise(128, 128, 137);
    this._lastGustTextureTime = -Infinity;
    this._updateGustTexture(0);
  }

  _buildNoise(w, h, seed) {
    // Simple value-noise grid
    let s = seed;
    const rand = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const grid = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) grid[i] = rand();
    // Smooth with a 3×3 box blur
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = (x + dx + w) % w;
            const ny = (y + dy + h) % h;
            sum += grid[ny * w + nx]; count++;
          }
        }
        out[y * w + x] = sum / count;
      }
    }
    return out;
  }

  /**
   * Sample wind at world position (x, z).
   * Returns { speed, dir, gust } where dir is a THREE.Vector2.
   */
  windAt(x, z) {
    const ws = this.ws.wind;
    // Map world coords to gust texture coords (world is ~600m wide)
    const tx = ((x / 600) + 0.5) % 1;
    const tz = ((z / 600) + 0.5) % 1;
    const ix = Math.floor(tx * 128);
    const iz = Math.floor(tz * 128);
    const gust = this._noiseA[iz * 128 + ix] * 0.6 + this._noiseB[iz * 128 + ix] * 0.4;
    const heightFactor = 1 + Math.max(0, (z + 300) / 600) * 0.5; // stronger on ridges
    const local = ws.speed * (1 + 0.6 * gust) * heightFactor;
    return { speed: local, dir: ws.dir.clone(), gust };
  }

  /** Called once per frame */
  update(dt) {
    const t = this.ws.elapsed;
    const ws = this.ws.wind;

    // Slowly rotate prevailing wind direction (±35°, period ~6 min)
    this._baseDirAngle += dt * (Math.PI * 2 / (360)); // very slow
    const dirVariation = Math.sin(t * 0.00018) * 0.61; // ±35°
    const angle = this._baseDirAngle + dirVariation;
    ws.dir.set(Math.cos(angle), Math.sin(angle)).normalize();

    // Base speed with slow noise
    ws.speed = 2 + 7 * (0.5 + 0.5 * Math.sin(t * 0.00022 + 1.3));

    // Global gust scalar
    ws.gust = 0.5 + 0.5 * Math.sin(t * 0.00031 + 2.7);

    // Update gust texture: gust fronts scroll at 10 m/s in wind direction
    // We shift the noise in UV space proportional to elapsed time
    if (t - this._lastGustTextureTime >= 0.2) this._updateGustTexture(t);
  }

  _updateGustTexture(t) {
    this._lastGustTextureTime = t;
    const ctx = this.gustCtx;
    const w = 128, h = 128;
    const ws = this.ws.wind;

    // Scroll offset for gust fronts
    const scrollX = (ws.dir.x * t * 10 / 600) % 1;
    const scrollZ = (ws.dir.y * t * 10 / 600) % 1;

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tx = (x / w + scrollX + 10) % 1;
        const tz = (y / h + scrollZ + 10) % 1;

        const ix = Math.floor(tx * 128);
        const iz = Math.floor(tz * 128);
        const v = this._noiseA[iz * 128 + ix] * 0.7 + this._noiseB[(iz * 128 + ix + 4096) % (128 * 128)] * 0.3;
        const val = Math.floor(v * 255);

        const i = (y * w + x) * 4;
        data[i] = val;       // R = gust
        data[i + 1] = Math.floor(ws.dir.x * 127 + 128); // G = dir X
        data[i + 2] = Math.floor(ws.dir.y * 127 + 128); // B = dir Z
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    this.gustTexture.needsUpdate = true;
  }

  /** Apply wind uniforms to a material that has uWindDir, uWindSpeed, uGustStrength, uGustTex */
  applyToMaterial(material) {
    const ws = this.ws.wind;
    if (material.uniforms) {
      if (material.uniforms.uWindDir) material.uniforms.uWindDir.value.set(ws.dir.x, ws.dir.y);
      if (material.uniforms.uWindSpeed) material.uniforms.uWindSpeed.value = ws.speed;
      if (material.uniforms.uGustStrength) material.uniforms.uGustStrength.value = ws.gust;
      if (material.uniforms.uGustTex) material.uniforms.uGustTex.value = this.gustTexture;
    }
  }

  dispose() {
    this.gustTexture.dispose();
  }
}
