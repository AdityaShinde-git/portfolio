/**
 * WeatherSystem — L3: Weather states with smooth 40–90s transitions.
 * States: clear, mist, overcast, rain, storm, snow.
 * Manages wetness, rain particles, lightning, rainbow.
 */
import * as THREE from 'three';
import { WeatherType } from './worldState.js';

const WEATHER_PROBABILITIES = [
  { type: WeatherType.CLEAR,    weight: 45 },
  { type: WeatherType.OVERCAST, weight: 20 },
  { type: WeatherType.MIST,     weight: 12 },
  { type: WeatherType.RAIN,     weight: 15 },
  { type: WeatherType.STORM,    weight:  5 },
  { type: WeatherType.SNOW,     weight:  3 }
];

const WEATHER_PARAMS = {
  [WeatherType.CLEAR]:    { fogMult: 1.0, cloudCover: 0.1, rainTarget: 0, snowTarget: 0, lightMult: 1.0 },
  [WeatherType.MIST]:     { fogMult: 2.5, cloudCover: 0.85, rainTarget: 0, snowTarget: 0, lightMult: 0.7 },
  [WeatherType.OVERCAST]: { fogMult: 1.4, cloudCover: 0.9, rainTarget: 0, snowTarget: 0, lightMult: 0.65 },
  [WeatherType.RAIN]:     { fogMult: 1.6, cloudCover: 0.95, rainTarget: 0.7, snowTarget: 0, lightMult: 0.55 },
  [WeatherType.STORM]:    { fogMult: 2.0, cloudCover: 1.0, rainTarget: 1.0, snowTarget: 0, lightMult: 0.4 },
  [WeatherType.SNOW]:     { fogMult: 1.8, cloudCover: 0.88, rainTarget: 0, snowTarget: 0.6, lightMult: 0.75 }
};

// Weighted random pick seeded by day
function pickWeather(rng) {
  const total = WEATHER_PROBABILITIES.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of WEATHER_PROBABILITIES) {
    r -= p.weight;
    if (r <= 0) return p.type;
  }
  return WeatherType.CLEAR;
}

export class WeatherSystem {
  constructor(worldState, scene) {
    this.ws = worldState;
    this.scene = scene;
    this.camera = null;

    // Pick today's weather from seeded RNG
    this._targetWeather = pickWeather(this.ws.rng);
    this._currentWeather = WeatherType.CLEAR;
    this._transitionProgress = 0;
    this._transitionDuration = 60; // seconds

    // Wetness persists 3 game hours after rain (~150 real seconds)
    this._wetnessDecayRate = 1 / 150;

    // Rain particles
    this._rainParticles = null;
    this._rainGeom = null;
    this._rainCount = 1200;
    this._rainPositions = null;

    // Lightning state
    this._lightningTimer = 0;
    this._lightningActive = 0;
    this._lightningLight = new THREE.PointLight(0xe8f0ff, 0, 800, 1);
    this._lightningLight.position.set(50, 120, 60);
    this.scene.add(this._lightningLight);

    // Rainbow
    this._rainbow = null;

    this._buildRainParticles();
    this._buildRainbow();
  }

  _buildRainParticles() {
    const count = this._rainCount;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (this.ws.rng() - 0.5) * 120;
      positions[i * 3 + 1] = this.ws.rng() * 40;
      positions[i * 3 + 2] = (this.ws.rng() - 0.5) * 120;
    }
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._rainGeom = geom;
    this._rainPositions = positions;

    const mat = new THREE.PointsMaterial({
      color: 0x9ab8c8,
      size: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: true
    });
    this._rainMaterial = mat;
    this._rainParticles = new THREE.Points(geom, mat);
    this._rainParticles.renderOrder = 10;
    this.scene.add(this._rainParticles);
  }

  _buildRainbow() {
    // A torus arc positioned over the waterfall area
    const geom = new THREE.TorusGeometry(28, 1.2, 3, 64, Math.PI);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff8844,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this._rainbowMesh = new THREE.Mesh(geom, mat);
    this._rainbowMesh.position.set(55, 12, 70);
    this._rainbowMesh.rotation.x = Math.PI / 2;
    this._rainbowMesh.rotation.z = 0.3;
    this.scene.add(this._rainbowMesh);
  }

  get currentType() { return this._currentWeather; }

  update(dt) {
    const ws = this.ws;
    if (this.camera && this._rainParticles) {
      this._rainParticles.position.copy(this.camera.position);
    }

    // Advance weather transition
    this._transitionProgress = Math.min(1, this._transitionProgress + dt / this._transitionDuration);
    const t = THREE.MathUtils.smoothstep(this._transitionProgress, 0, 1);

    const fromP = WEATHER_PARAMS[this._currentWeather];
    const toP = WEATHER_PARAMS[this._targetWeather];

    // Blend weather parameters
    ws.weather.rain   = THREE.MathUtils.lerp(fromP.rainTarget, toP.rainTarget, t);
    ws.weather.snow   = THREE.MathUtils.lerp(fromP.snowTarget, toP.snowTarget, t);
    ws.sky.cloudCover = THREE.MathUtils.lerp(fromP.cloudCover, toP.cloudCover, t);

    const fogMult = THREE.MathUtils.lerp(fromP.fogMult, toP.fogMult, t);
    ws.fog.density = ws.fog.baseDensity * fogMult;
    ws.weather.light = THREE.MathUtils.lerp(fromP.lightMult, toP.lightMult, t);

    // Wetness: rises in rain, decays slowly after
    if (ws.weather.rain > 0.1) {
      ws.weather.wetness = Math.min(1, ws.weather.wetness + dt * ws.weather.rain * 0.02);
    } else {
      ws.weather.wetness = Math.max(0, ws.weather.wetness - dt * this._wetnessDecayRate);
    }

    ws.weather.type = this._transitionProgress >= 1 ? this._targetWeather : this._currentWeather;

    // Rain particles
    this._updateRain(dt, ws.weather.rain);

    // Lightning in storm
    if ((this._targetWeather === WeatherType.STORM || this._targetWeather === WeatherType.RAIN)
      && ws.weather.rain > 0.8) {
      this._updateLightning(dt, ws);
    } else {
      this._lightningLight.intensity = 0;
      ws.weather.lightning = 0;
    }

    // Rainbow: after rain, low sun
    const afterRain = ws.weather.rain < 0.2 && ws.weather.wetness > 0.3;
    const lowSun = ws.sun.elevation > 0 && ws.sun.elevation < 35;
    const rainbowStrength = afterRain && lowSun ? Math.min(1, ws.weather.wetness) : 0;
    if (this._rainbowMesh) {
      this._rainbowMesh.material.opacity = rainbowStrength * 0.55;
    }

    // Complete transition
    if (this._transitionProgress >= 1 && this._currentWeather !== this._targetWeather) {
      this._currentWeather = this._targetWeather;
    }
  }

  _updateRain(dt, intensity) {
    if (!this._rainParticles) return;
    const mat = this._rainMaterial;
    mat.opacity = intensity * 0.65;

    if (intensity < 0.05) return;

    const pos = this._rainPositions;
    const ws = this.ws.wind;
    const windX = ws.dir.x * ws.speed * dt * 0.6;
    const windZ = ws.dir.y * ws.speed * dt * 0.6;

    for (let i = 0; i < this._rainCount; i++) {
      pos[i * 3]     += windX;
      pos[i * 3 + 1] -= (3.5 + intensity * 2.5) * dt * 8;
      pos[i * 3 + 2] += windZ;

      if (pos[i * 3 + 1] < 0) {
        pos[i * 3]     = (this.ws.rng() - 0.5) * 120;
        pos[i * 3 + 1] = 35 + this.ws.rng() * 8;
        pos[i * 3 + 2] = (this.ws.rng() - 0.5) * 120;
      }
    }
    this._rainGeom.attributes.position.needsUpdate = true;
  }

  _updateLightning(dt, ws) {
    this._lightningTimer -= dt;
    if (this._lightningActive > 0) {
      this._lightningActive -= dt;
      const flicker = this.ws.rng() > 0.5 ? 1 : 0.3;
      this._lightningLight.intensity = 80 * flicker * this._lightningActive;
      ws.weather.lightning = this._lightningActive;
    } else {
      this._lightningLight.intensity = 0;
      ws.weather.lightning = 0;
    }

    if (this._lightningTimer <= 0 && this._targetWeather === WeatherType.STORM) {
      // Random strike 4–15s
      this._lightningTimer = 4 + this.ws.rng() * 11;
      this._lightningActive = 0.18 + this.ws.rng() * 0.14;
      // Random position
      this._lightningLight.position.set(
        (this.ws.rng() - 0.5) * 300,
        100 + this.ws.rng() * 80,
        (this.ws.rng() - 0.5) * 300
      );
    }
  }

  /** Force a weather transition (for debug/events) */
  transitionTo(type, duration = 60) {
    if (type in WEATHER_PARAMS) {
      this._currentWeather = this.ws.weather.type;
      this._targetWeather = type;
      this._transitionProgress = 0;
      this._transitionDuration = duration;
    }
  }

  dispose() {
    this._rainGeom?.dispose();
    this._rainMaterial?.dispose();
    this._rainbowMesh?.geometry.dispose();
    this._rainbowMesh?.material.dispose();
    this.scene.remove(this._rainParticles);
    this.scene.remove(this._rainbowMesh);
    this.scene.remove(this._lightningLight);
  }
}
