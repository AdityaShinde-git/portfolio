/**
 * WorldState — Single source of truth for all living systems.
 * Updated once per frame. Nothing invents its own clock or wind.
 * Seeded by the real date so every visitor on the same day gets the same weather and event schedule.
 */
import * as THREE from 'three';

// Seeded PRNG (mulberry32)
function createSeededRandom(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// Moon phase from real date (0=new, 0.5=full, 1=new)
function moonPhase() {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  // Simple lunation approximation
  const jd = 367 * year - Math.floor(7 * (year + Math.floor((month + 9) / 12)) / 4) +
    Math.floor(275 * month / 9) + day + 1721013.5;
  const daysSinceNew = jd - 2451550.1;
  const newMoons = daysSinceNew / 29.530588853;
  return newMoons - Math.floor(newMoons);
}

export const WeatherType = {
  CLEAR: 'clear',
  MIST: 'mist',
  OVERCAST: 'overcast',
  RAIN: 'rain',
  STORM: 'storm',
  SNOW: 'snow'
};

export class WorldState {
  constructor() {
    // Game clock: 24 game hours = 20 real minutes → 1 game hour ≈ 50 real seconds
    // timeScale: real seconds per game hour = 50
    this.timeScale = 50;

    // Start at 17:30 (golden hour) for first visit
    this.time = {
      hour: 17.5,
      day: 0,
      moonPhase: moonPhase()
    };

    this.sun = {
      dir: new THREE.Vector3(-0.5, 0.3, -0.8).normalize(),
      elevation: 10,
      color: new THREE.Color(0xffb070),
      intensity: 0.7
    };

    this.moon = {
      dir: new THREE.Vector3(0.4, 0.5, 0.6).normalize(),
      intensity: 0
    };

    this.sky = {
      zenith: new THREE.Color(0x1c2a44),
      horizon: new THREE.Color(0xc46a4a),
      starAlpha: 0,
      cloudCover: 0.15
    };

    this.fog = {
      color: new THREE.Color(0x6f7f8a),
      density: 0.0011,
      baseDensity: 0.0011,
      heightFalloff: 0.02
    };

    this.wind = {
      dir: new THREE.Vector2(1, 0).normalize(),
      speed: 4,
      gust: 0,
      // Sample wind at a specific world position
      _gustPhase: 0
    };

    this.weather = {
      type: WeatherType.CLEAR,
      rain: 0,
      snow: 0,
      wetness: 0,
      lightning: 0,
      light: 1
    };

    this.life = {
      density: 0.3,
      unlocked: new Set()
    };

    this.rng = createSeededRandom(dateSeed());
    this._rngBase = createSeededRandom(dateSeed());

    // Elapsed world time in seconds (for wind noise, etc.)
    this._elapsed = 0;
    this._paused = false;
  }

  /** Game hour as a float, 0..24 */
  get hour() {
    return this.time.hour;
  }

  /** Advance the world clock by real-time delta (seconds) */
  tick(dtReal) {
    if (this._paused) return;
    this._elapsed += dtReal;

    // Convert real seconds to game hours
    const gameHoursDelta = dtReal / this.timeScale;
    this.time.hour += gameHoursDelta;

    // Wrap at 24
    if (this.time.hour >= 24) {
      this.time.hour -= 24;
      this.time.day += 1;
      this.time.moonPhase = moonPhase();
    }
  }

  /** Manually set the game hour (for debug / photo mode) */
  setHour(hour) {
    this.time.hour = ((hour % 24) + 24) % 24;
  }

  pause() { this._paused = true; }
  resume() { this._paused = false; }
  get elapsed() { return this._elapsed; }
}
