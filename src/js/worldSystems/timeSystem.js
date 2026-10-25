/**
 * TimeSystem — L1: Day/night cycle with interpolated keyframes.
 * 24 game hours = 20 real minutes. First visit starts at 17:30 (golden hour).
 * Drives sun direction/colour, sky gradient, fog, ambient, moon, stars.
 */
import * as THREE from 'three';

// Keyframe table from the design doc section 2.2
// hour, phase, sunElevation, keyLightHex, fogColorHex, ambient
const KEYFRAMES = [
  { hour: 2,    sunElev: -15, keyLight: 0x7088b8, fogColor: 0x1c2538, ambient: 0.18, zenith: 0x0a0f1f, horizon: 0x1a2545, starAlpha: 1.0 },
  { hour: 5,    sunElev: -8,  keyLight: 0x6a78b0, fogColor: 0x55627f, ambient: 0.35, zenith: 0x14203a, horizon: 0x3a4868, starAlpha: 0.6 },
  { hour: 6.25, sunElev: 0,   keyLight: 0xffb27a, fogColor: 0xb09a9a, ambient: 0.55, zenith: 0x2a3f5e, horizon: 0xffb27a, starAlpha: 0.0 },
  { hour: 8,    sunElev: 25,  keyLight: 0xffe2b8, fogColor: 0xb8c4cc, ambient: 0.85, zenith: 0x5580b0, horizon: 0xc8d8e8, starAlpha: 0.0 },
  { hour: 12,   sunElev: 60,  keyLight: 0xfff4e0, fogColor: 0xc8d4dc, ambient: 1.00, zenith: 0x4878b8, horizon: 0xc0d0e0, starAlpha: 0.0 },
  { hour: 16,   sunElev: 30,  keyLight: 0xffd9a0, fogColor: 0xc0b4a8, ambient: 0.90, zenith: 0x5588b0, horizon: 0xd8c8a8, starAlpha: 0.0 },
  { hour: 18,   sunElev: 10,  keyLight: 0xffb070, fogColor: 0xa8949a, ambient: 0.70, zenith: 0x3a5580, horizon: 0xffb070, starAlpha: 0.0 },
  { hour: 19,   sunElev: 0,   keyLight: 0xff8f55, fogColor: 0x8a8095, ambient: 0.55, zenith: 0x2a3862, horizon: 0xff8f55, starAlpha: 0.0 },
  { hour: 20,   sunElev: -6,  keyLight: 0x5f6f9f, fogColor: 0x4f6482, ambient: 0.40, zenith: 0x1a2848, horizon: 0x3a4870, starAlpha: 0.35 },
  { hour: 23,   sunElev: -15, keyLight: 0x8aa0d0, fogColor: 0x26324a, ambient: 0.22, zenith: 0x0c1428, horizon: 0x1e2e52, starAlpha: 0.9 },
];

function lerpColor(a, b, t) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}

function findKeyframes(hour) {
  // Wrap-around interpolation
  const kf = KEYFRAMES;
  for (let i = 0; i < kf.length; i++) {
    const next = (i + 1) % kf.length;
    let startHour = kf[i].hour;
    let endHour = kf[next].hour;

    // Handle wrap-around (e.g., 23 → 2)
    if (endHour <= startHour) endHour += 24;
    let h = hour;
    if (h < startHour && startHour > 12) h += 24;

    if (h >= startHour && h < endHour) {
      const t = (h - startHour) / (endHour - startHour);
      return { a: kf[i], b: kf[next], t };
    }
  }
  // Fallback
  return { a: kf[0], b: kf[1], t: 0 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class TimeSystem {
  constructor(worldState) {
    this.ws = worldState;
    this._sunDir = new THREE.Vector3();
    this._moonDir = new THREE.Vector3();
  }

  /** Call once per frame after worldState.tick() */
  update(dt) {
    const hour = this.ws.time.hour;
    const { a, b, t } = findKeyframes(hour);

    // Sun elevation and direction
    const sunElev = lerp(a.sunElev, b.sunElev, t);
    const sunElevRad = THREE.MathUtils.degToRad(sunElev);

    // Sun azimuth rotates through the day (east → south → west)
    const sunAzimuth = ((hour - 6) / 12) * Math.PI; // 0 at sunrise, PI at sunset
    this._sunDir.set(
      Math.cos(sunAzimuth) * Math.cos(sunElevRad),
      Math.sin(sunElevRad),
      Math.sin(sunAzimuth) * Math.cos(sunElevRad)
    ).normalize();

    this.ws.sun.dir.copy(this._sunDir);
    this.ws.sun.elevation = sunElev;
    this.ws.sun.color.copy(lerpColor(a.keyLight, b.keyLight, t));

    // Sun intensity: bright during day, zero when below horizon
    const sunFactor = THREE.MathUtils.smoothstep(sunElev, -8, 10);
    this.ws.sun.intensity = sunFactor * lerp(a.ambient, b.ambient, t) * 1.75;

    // Sky colors
    this.ws.sky.zenith.copy(lerpColor(a.zenith, b.zenith, t));
    this.ws.sky.horizon.copy(lerpColor(a.horizon, b.horizon, t));
    this.ws.sky.starAlpha = lerp(a.starAlpha, b.starAlpha, t);

    // Fog color and density
    this.ws.fog.color.copy(lerpColor(a.fogColor, b.fogColor, t));
    // Denser fog at night, thinner during day
    this.ws.fog.baseDensity = lerp(0.00048, 0.00018, sunFactor);
    this.ws.fog.density = this.ws.fog.baseDensity;

    // Ambient level — never below 0.18 (readability floor)
    const ambientLevel = Math.max(0.18, lerp(a.ambient, b.ambient, t));

    // Moon direction (opposite hemisphere, rising as sun sets)
    const moonAzimuth = sunAzimuth + Math.PI;
    const phase = this.ws.time.moonPhase;
    const moonElev = Math.max(-5, 50 * Math.sin((hour - 18) / 12 * Math.PI));
    const moonElevRad = THREE.MathUtils.degToRad(moonElev);
    this._moonDir.set(
      Math.cos(moonAzimuth) * Math.cos(moonElevRad),
      Math.max(0, Math.sin(moonElevRad)),
      Math.sin(moonAzimuth) * Math.cos(moonElevRad)
    ).normalize();
    this.ws.moon.dir.copy(this._moonDir);

    // Moon intensity: brighter at full moon, only at night
    const nightFactor = 1 - sunFactor;
    const moonBrightness = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(phase * Math.PI * 2)); // full=1, new=0.3
    this.ws.moon.intensity = nightFactor * moonBrightness * 0.4;

    return {
      sunFactor,
      ambientLevel,
      nightFactor,
      moonElev
    };
  }

  /** Format the current time as HH:MM */
  formatTime() {
    const h = Math.floor(this.ws.time.hour);
    const m = Math.floor((this.ws.time.hour - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
