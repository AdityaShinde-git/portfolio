/**
 * EventScheduler — L5: Seeded random world events.
 * Min 2–4 game-minutes between events, each with conditions and cooldowns.
 */
import * as THREE from 'three';

const EVENTS = [
  {
    id: 'deerCrossing',
    cooldown: 480,  // 8 min real seconds
    minSignals: 3,
    condition: (ws) => {
      const h = ws.time.hour;
      return (h >= 5 && h < 9) || (h >= 17 && h < 21);
    },
    description: 'A herd crosses the road ahead'
  },
  {
    id: 'birdBurst',
    cooldown: 120,
    minSignals: 0,
    condition: () => true,
    description: 'A hawk flushes the crows from a tree'
  },
  {
    id: 'shootingStar',
    cooldown: 180,
    minSignals: 0,
    condition: (ws) => ws.sky.starAlpha > 0.6,
    description: 'A shooting star streaks across the sky'
  },
  {
    id: 'fogBank',
    cooldown: 300,
    minSignals: 0,
    condition: (ws) => ws.time.hour >= 4 && ws.time.hour < 8,
    description: 'A thick fog bank rolls through the river crossing'
  },
  {
    id: 'thunderstorm',
    cooldown: 600,
    minSignals: 0,
    condition: (ws) => ws.weather.type === 'storm',
    description: 'Lightning strikes near the Last Signal tower'
  },
  {
    id: 'lanternFestival',
    cooldown: 900,
    minSignals: 5,
    condition: (ws) => ws.time.hour >= 20 && ws.time.hour < 22,
    description: 'Floating lanterns drift up over the settlement'
  },
  {
    id: 'distantHowl',
    cooldown: 200,
    minSignals: 5,
    condition: (ws) => ws.time.hour >= 21 || ws.time.hour < 4,
    description: 'Wolf howl from the far ridge'
  },
  {
    id: 'aurora',
    cooldown: 3600 * 40,  // 1 in ~40 clear nights
    minSignals: 0,
    condition: (ws) => ws.sky.starAlpha > 0.8 && ws.weather.type === 'clear',
    description: 'Aurora borealis — green-violet curtains in the north sky'
  },
  {
    id: 'rainbow',
    cooldown: 300,
    minSignals: 0,
    condition: (ws) => ws.weather.rain < 0.2 && ws.weather.wetness > 0.3 && ws.sun.elevation > 0 && ws.sun.elevation < 35,
    description: 'A rainbow arches over the waterfall'
  }
];

export class EventScheduler {
  constructor(worldState, scene, rng) {
    this.ws = worldState;
    this.scene = scene;
    this.rng = rng;

    this._cooldowns = {};
    EVENTS.forEach(e => { this._cooldowns[e.id] = e.cooldown * rng() * 0.5; });

    this._nextEventTimer = 30 + rng() * 90; // 30–120 s until first event
    this._activeEvents = new Map();
    this._signalCount = 0;

    // Aurora mesh
    this._aurora = null;
    this._auroraTimer = 0;
  }

  setSignalCount(n) { this._signalCount = n; }

  update(dt) {
    this._nextEventTimer -= dt;

    // Decrement cooldowns
    Object.keys(this._cooldowns).forEach(id => {
      this._cooldowns[id] = Math.max(0, this._cooldowns[id] - dt);
    });

    if (this._nextEventTimer <= 0) {
      this._nextEventTimer = 120 + this.rng() * 120; // next check in 2–4 min
      this._tryFireEvent();
    }

    // Update active events
    this._updateActiveEvents(dt);
  }

  _tryFireEvent() {
    const eligible = EVENTS.filter(e =>
      this._cooldowns[e.id] <= 0 &&
      this._signalCount >= e.minSignals &&
      e.condition(this.ws)
    );
    if (eligible.length === 0) return;

    // Pick one at random
    const ev = eligible[Math.floor(this.rng() * eligible.length)];
    this._fireEvent(ev);
    this._cooldowns[ev.id] = ev.cooldown;
  }

  _fireEvent(ev) {
    switch (ev.id) {
      case 'shootingStar':    this._doShootingStar(); break;
      case 'aurora':          this._doAurora(); break;
      case 'lanternFestival': this._doLanternFestival(); break;
      default: break; // Other events handled by caller / sound system
    }
    // Emit event name for external listeners
    this._activeEvents.set(ev.id, { timer: 8 });
    this.scene.dispatchEvent({ type: 'world-event', eventId: ev.id });
  }

  _doShootingStar() {
    // Create a streak mesh that moves across the sky
    const geom = new THREE.BoxGeometry(0.3, 0.08, 18);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff8e8, transparent: true, opacity: 0.9, depthWrite: false });
    const streak = new THREE.Mesh(geom, mat);
    const startX = (this.rng() - 0.5) * 400;
    const startZ = (this.rng() - 0.5) * 400;
    streak.position.set(startX, 200 + this.rng() * 100, startZ);
    streak.rotation.z = 0.5;
    this.scene.add(streak);

    let progress = 0;
    const animate = () => {
      progress += 0.04;
      streak.position.x += 3.5;
      streak.position.y -= 2;
      streak.material.opacity = Math.max(0, 0.9 - progress);
      if (progress < 1) requestAnimationFrame(animate);
      else this.scene.remove(streak);
    };
    animate();
  }

  _doAurora() {
    if (this._aurora) return;
    this._auroraTimer = 25; // show for 25 real seconds

    const group = new THREE.Group();
    // Three wavy curtain planes in the north sky
    for (let c = 0; c < 3; c++) {
      const geom = new THREE.PlaneGeometry(180, 60, 16, 8);
      const pos = geom.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) + Math.sin(pos.getX(i) * 0.03 + c * 1.2) * 8);
      }
      pos.needsUpdate = true;
      geom.computeVertexNormals();
      const mat = new THREE.MeshBasicMaterial({
        color: c === 0 ? 0x40ff88 : c === 1 ? 0x8040ff : 0x40c0ff,
        transparent: true,
        opacity: 0.12 + c * 0.04,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const curtain = new THREE.Mesh(geom, mat);
      curtain.position.set(-30 + c * 20, 160, -280);
      curtain.rotation.x = -0.1;
      group.add(curtain);
    }
    this.scene.add(group);
    this._aurora = group;
  }

  _doLanternFestival() {
    // Spawn floating light spheres that drift upward
    for (let i = 0; i < 12; i++) {
      const geom = new THREE.SphereGeometry(0.4, 6, 5);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffb04a,
        transparent: true,
        opacity: 0.85
      });
      const lantern = new THREE.Mesh(geom, mat);
      lantern.position.set(
        95 + (this.rng() - 0.5) * 40,
        2 + this.rng() * 3,
        93 + (this.rng() - 0.5) * 40
      );
      this.scene.add(lantern);

      // Animate upward and fade
      let t = 0;
      const rise = () => {
        t += 0.016;
        lantern.position.y += 0.18;
        lantern.position.x += Math.sin(t * 0.8 + i) * 0.04;
        lantern.material.opacity = Math.max(0, 0.85 - t * 0.02);
        if (lantern.material.opacity > 0) requestAnimationFrame(rise);
        else this.scene.remove(lantern);
      };
      setTimeout(() => { rise(); }, i * 800);
    }
  }

  _updateActiveEvents(dt) {
    for (const [id, state] of this._activeEvents) {
      state.timer -= dt;
      if (state.timer <= 0) this._activeEvents.delete(id);
    }

    // Aurora fade-out
    if (this._aurora) {
      this._auroraTimer -= dt;
      if (this._auroraTimer <= 0) {
        this.scene.remove(this._aurora);
        this._aurora = null;
      } else if (this._auroraTimer < 5) {
        // Fade out
        this._aurora.children.forEach(c => {
          c.material.opacity = Math.max(0, c.material.opacity - dt * 0.025);
        });
      }
    }
  }

  isEventActive(id) { return this._activeEvents.has(id); }

  dispose() {
    if (this._aurora) this.scene.remove(this._aurora);
  }
}
