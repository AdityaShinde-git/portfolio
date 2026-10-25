/**
 * LivingWorld — Master orchestrator for all living world systems.
 * L1: Time/sky  L2: Wind  L3: Weather  L4: Wildlife  L5: NPCs+Events  L6: Sound ecology  L7: Polish
 *
 * Usage:
 *   const living = new LivingWorld(scene, renderer, terrainHeightFn);
 *   living.update(dt, { truckPosition, honking, signalCount, truckSpeed });
 *   living.dispose();
 */
import * as THREE from 'three';
import { WorldState } from './worldState.js';
import { TimeSystem } from './timeSystem.js';
import { WindSystem } from './windSystem.js';
import { WeatherSystem } from './weatherSystem.js';
import { LifeSystem } from './lifeSystem.js';
import { EventScheduler } from './eventScheduler.js';
import { SkyRenderer } from './skyRenderer.js';

export class LivingWorld {
  constructor(scene, renderer, terrainHeightFn, riverSampleFn = null) {
    this.scene = scene;
    this.renderer = renderer;
    this.terrainHeight = terrainHeightFn;
    this.disposed = false;

    // ── Core state ──────────────────────────────────────────────────
    this.worldState = new WorldState();

    // ── Systems ──────────────────────────────────────────────────────
    this.time    = new TimeSystem(this.worldState);
    this.wind    = new WindSystem(this.worldState);
    this.weather = new WeatherSystem(this.worldState, scene);
    this.life    = new LifeSystem(this.worldState, scene, terrainHeightFn, riverSampleFn);
    this.events  = new EventScheduler(this.worldState, scene, this.worldState._rngBase);
    this.sky     = new SkyRenderer(scene);

    // ── References set externally (optional wiring) ──────────────────
    this.ambientLight  = null;
    this.skyLight      = null;
    this.sunLight      = null;
    this.moonLight     = null;
    this.fogRef        = null;   // scene.fog
    this.waystoneLights = [];   // { light, phase } array
    this.garageLight   = null;
    this.windowMeshes  = [];    // settlement windows with emissive material
    this.headlights    = [];    // vehicle spotlights
    this.camera        = null;

    // ── Time readout HUD element ──────────────────────────────────────
    this._timeEl = null;

    // ── Truck state tracking ──────────────────────────────────────────
    this._honking = false;
    this._truckPos = new THREE.Vector3();
    this._lastSignalCount = 0;

    // ── Debug key: T = scrub time forward, Y = cycle weather ─────────
    this._debugKeyHandler = (e) => {
      if (e.code === 'KeyT' && e.shiftKey) {
        this.worldState.setHour((this.worldState.time.hour + 1) % 24);
      }
      if (e.code === 'KeyY' && e.shiftKey) {
        const types = ['clear', 'mist', 'rain', 'storm', 'snow'];
        const current = types.indexOf(this.worldState.weather.type);
        this.weather.transitionTo(types[(current + 1) % types.length], 10);
      }
    };
    window.addEventListener('keydown', this._debugKeyHandler);
  }

  /**
   * Wire references to Three.js objects after SkillWorld builds them.
   * Call once after construction.
   */
  wireScene({ ambientLight, skyLight, sunLight, moonLight, fogRef, waystoneLights, windowMeshes, headlights, camera }) {
    if (ambientLight)    this.ambientLight  = ambientLight;
    if (skyLight)        this.skyLight      = skyLight;
    if (sunLight)        this.sunLight      = sunLight;
    if (moonLight)       this.moonLight     = moonLight;
    if (fogRef)          this.fogRef        = fogRef;
    if (waystoneLights)  this.waystoneLights = waystoneLights;
    if (windowMeshes)    this.windowMeshes   = windowMeshes;
    if (headlights)      this.headlights     = headlights;
    if (camera) {
      this.camera = camera;
      this.weather.camera = camera;
    }
  }

  /** Wire the HUD time readout <span> element */
  wireTimeDisplay(el) {
    this._timeEl = el;
  }

  /**
   * Main update — call every frame.
   * @param {number} dt - real-time delta in seconds
   * @param {object} truckState - { position, speed, honking, signalCount }
   */
  update(dt, truckState = {}) {
    if (this.disposed) return;

    const { position, honking = false, signalCount = 0, speed = 0 } = truckState;
    if (position) this._truckPos.copy(position);

    // ── Tick world clock ────────────────────────────────────────────
    this.worldState.wind._gustPhase = (this.worldState.wind._gustPhase || 0) + dt;
    this.worldState.tick(dt);

    // ── L1: Time & sky ───────────────────────────────────────────────
    const timeResult = this.time.update(dt);
    const ws = this.worldState;

    // Weather modifies the time-of-day atmosphere before it is applied to the scene.
    this.wind.update(dt);
    this.weather.update(dt);

    // Apply to Three.js lights
    const fillLight = timeResult.ambientLevel
      * (1.45 + (1 - timeResult.ambientLevel) * timeResult.sunFactor * 4.2)
      * ws.weather.light;
    if (this.ambientLight) {
      this.ambientLight.intensity = Math.max(0.55, fillLight);
    }
    if (this.skyLight) {
      this.skyLight.intensity = Math.max(0.62, fillLight * 1.05);
      this.skyLight.groundColor.copy(ws.fog.color);
    }
    if (this.sunLight) {
      this.sunLight.position.set(
        -ws.sun.dir.x * 120,
        ws.sun.dir.y * 120,
        -ws.sun.dir.z * 120
      );
      this.sunLight.color.copy(ws.sun.color);
      this.sunLight.intensity = Math.max(0, ws.sun.intensity * ws.weather.light);
      // Shadow softness: golden hour = softer
      this.sunLight.shadow.radius = ws.sun.elevation < 15 ? 6 : 3;
    }
    if (this.moonLight) {
      this.moonLight.position.set(
        ws.moon.dir.x * 120,
        Math.max(0.1, ws.moon.dir.y * 120),
        ws.moon.dir.z * 120
      );
      this.moonLight.intensity = ws.moon.intensity * ws.weather.light * 0.8;
    }

    // Apply fog
    if (this.fogRef) {
      this.fogRef.color.copy(ws.fog.color);
      this.fogRef.density = ws.fog.density;
    }

    // Scene background
    this.scene.background?.copy(ws.sky.zenith);

    // Window emissives: on from 18:30 to 06:00
    const windowsOn = ws.time.hour >= 18.5 || ws.time.hour < 6;
    this.windowMeshes.forEach(mesh => {
      if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
        const target = windowsOn
          ? 0.06 + Math.min(1, this._lastSignalCount / 4) * 0.56
          : 0.05;
        mesh.material.emissiveIntensity += (target - mesh.material.emissiveIntensity) * Math.min(1, dt * 0.5);
      }
    });

    // Headlights: auto-on below sun elevation 5°
    const headlightsOn = ws.sun.elevation < 5;
    this.headlights.forEach(light => {
      light.visible = headlightsOn;
    });

    // Waystone lights pulse
    this.waystoneLights.forEach(({ light, phase }) => {
      const baseIntensity = 1.1 + timeResult.nightFactor * 0.8;
      light.intensity = baseIntensity + Math.sin(performance.now() * 0.003 + phase) * 0.25;
    });

    // Sky renderer
    this.sky.update(ws, dt, this.camera?.position);

    // Time readout in HUD
    if (this._timeEl) {
      this._timeEl.textContent = this.time.formatTime();
    }

    // ── L4+L5: Life & NPCs ───────────────────────────────────────────
    if (signalCount !== this._lastSignalCount) {
      this.life.setSignalCount(signalCount);
      this.events.setSignalCount(signalCount);
      this._lastSignalCount = signalCount;
    }
    this.life.update(dt, position ? this._truckPos : null, honking, signalCount);

    // ── L5: Events ───────────────────────────────────────────────────
    this.events.update(dt);

    // ── L6: Sound ecology (atmospheric description) ───────────────────
    // (Actual audio handled by soundEngine.js — here we expose readable state)
    this.soundState = this._buildSoundState(timeResult);
  }

  _buildSoundState(timeResult) {
    const ws = this.worldState;
    const hour = ws.time.hour;
    return {
      timeSlot: hour >= 5 && hour < 7 ? 'dawn'
        : hour >= 7 && hour < 18 ? 'day'
        : hour >= 18 && hour < 20 ? 'dusk'
        : 'night',
      windGain: ws.wind.speed / 9,       // 0–1
      rainGain: ws.weather.rain,          // 0–1
      isStorming: ws.weather.type === 'storm',
      isMist: ws.weather.type === 'mist',
      isNight: timeResult.nightFactor > 0.5,
      isDawn: hour >= 5 && hour < 7.5,
      isDusk: hour >= 18 && hour < 20.5,
      signalCount: this._lastSignalCount
    };
  }

  /** Pause / resume the world clock */
  setPaused(paused) {
    if (paused) this.worldState.pause();
    else this.worldState.resume();
  }

  /** Force-set the time of day (for photo mode) */
  setTimeOfDay(hour) {
    this.worldState.setHour(hour);
  }

  /** Current formatted time string */
  getFormattedTime() {
    return this.time.formatTime();
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener('keydown', this._debugKeyHandler);
    this.weather.dispose();
    this.life.dispose();
    this.events.dispose();
    this.sky.dispose();
    this.wind.dispose();
  }
}
