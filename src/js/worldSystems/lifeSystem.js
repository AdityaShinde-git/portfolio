/**
 * LifeSystem — L4+L5: Wildlife, NPCs, and living environment.
 * Species are data-driven (JSON-like config), max 45 animated animals visible.
 * NPCs: Lantern keeper, Fisher, Radio operator.
 * Uses simple state machines: Idle→Alert→Flee→Hide→Return.
 */
import * as THREE from 'three';
import { ZONE_CENTRES } from './signalRidgeLayout.js';

// ─── Species definitions ─────────────────────────────────────────────────────
const SPECIES = [
  {
    id: 'crow', maxNear: 10, flockSize: [6, 10],
    habitat: 'open', hoursActive: [5, 20],
    sightRadius: 18, hearRadius: 22, fleeRadius: 15,
    unlockLevel: 0,
    color: 0x252a28, scale: 0.38, speed: 0.8,
    zones: ['trailhead', 'settlement']
  },
  {
    id: 'deer', maxNear: 6, flockSize: [3, 6],
    habitat: 'meadow', hoursActive: [5, 10, 15, 23],
    sightRadius: 60, hearRadius: 40, fleeRadius: 14,
    unlockLevel: 0,
    color: 0x7a5c3a, scale: 0.9, speed: 2.8,
    zones: ['trailhead', 'crossing', 'settlement', 'bones']
  },
  {
    id: 'rabbit', maxNear: 6, flockSize: [1, 3],
    habitat: 'grass', hoursActive: [5, 10, 15, 23],
    sightRadius: 20, hearRadius: 18, fleeRadius: 12,
    unlockLevel: 0,
    color: 0x8a7060, scale: 0.36, speed: 1.6,
    zones: ['trailhead', 'crossing']
  },
  {
    id: 'hawk', maxNear: 1, flockSize: [1, 1],
    habitat: 'sky', hoursActive: [7, 19],
    sightRadius: 100, hearRadius: 50, fleeRadius: 0,
    unlockLevel: 4,
    color: 0x5a4030, scale: 0.45, speed: 4,
    zones: ['bones', 'high-pass']
  },
  {
    id: 'owl', maxNear: 2, flockSize: [1, 1],
    habitat: 'post', hoursActive: [20, 5],
    sightRadius: 25, hearRadius: 30, fleeRadius: 8,
    unlockLevel: 4,
    color: 0x5a5042, scale: 0.42, speed: 0.4,
    zones: ['settlement', 'bones']
  },
  {
    id: 'fox', maxNear: 1, flockSize: [1, 1],
    habitat: 'road', hoursActive: [18, 23],
    sightRadius: 35, hearRadius: 28, fleeRadius: 18,
    unlockLevel: 3,
    color: 0xc06820, scale: 0.55, speed: 1.8,
    zones: ['trailhead', 'crossing']
  },
  {
    id: 'goat', maxNear: 4, flockSize: [2, 4],
    habitat: 'rock', hoursActive: [7, 18],
    sightRadius: 30, hearRadius: 20, fleeRadius: 10,
    unlockLevel: 4,
    color: 0xd0c8a8, scale: 0.72, speed: 1.2,
    zones: ['bones', 'high-pass']
  },
  {
    id: 'butterfly', maxNear: 15, flockSize: [5, 15],
    habitat: 'meadow', hoursActive: [8, 18],
    sightRadius: 5, hearRadius: 3, fleeRadius: 4,
    unlockLevel: 0,
    color: 0xe8a840, scale: 0.18, speed: 0.5,
    zones: ['crossing', 'trailhead']
  },
  {
    id: 'firefly', maxNear: 80, flockSize: [30, 80],
    habitat: 'grass', hoursActive: [20, 5],
    sightRadius: 2, hearRadius: 1, fleeRadius: 0,
    unlockLevel: 0,
    color: 0xc8ff60, scale: 0.08, speed: 0.2,
    zones: ['trailhead', 'crossing', 'settlement']
  },
  {
    id: 'fish', maxNear: 8, flockSize: [2, 5],
    habitat: 'river', hoursActive: [6, 20],
    sightRadius: 6, hearRadius: 3, fleeRadius: 5,
    unlockLevel: 1,
    color: 0x6f9290, scale: 0.34, speed: 0.7,
    zones: ['crossing']
  },
  {
    id: 'horse', maxNear: 1, flockSize: [1, 1],
    habitat: 'tied', hoursActive: [0, 24],
    sightRadius: 10, hearRadius: 24, fleeRadius: 0,
    unlockLevel: 0,
    color: 0x6e4a32, scale: 1.15, speed: 0.18,
    zones: ['trailhead']
  }
];

function isActiveHours(species, hour) {
  const h = species.hoursActive;
  if (h.length === 2) {
    // Simple range, may wrap midnight
    const [start, end] = h;
    if (start < end) return hour >= start && hour < end;
    return hour >= start || hour < end; // wraps midnight
  }
  // Multiple windows [dawn_start, dawn_end, dusk_start, dusk_end]
  if (h.length === 4) {
    return (hour >= h[0] && hour < h[1]) || (hour >= h[2] && hour < h[3]);
  }
  return true;
}

function randomInRadius(cx, cz, minR, maxR, random) {
  const angle = random() * Math.PI * 2;
  const r = minR + random() * (maxR - minR);
  return { x: cx + Math.cos(angle) * r, z: cz + Math.sin(angle) * r };
}

// ─── Individual animal ────────────────────────────────────────────────────────
class Animal {
  constructor(species, position, mesh, random) {
    this.species = species;
    this.position = position.clone();
    this.mesh = mesh;
    this.state = 'idle'; // idle | alert | flee | hide
    this.alertLevel = 0;
    this.velocity = new THREE.Vector3();
    this.age = 0;
    this.lifetime = 20 + random() * 60;

    // Wander target
    this._wanderTarget = position.clone();
    this._wanderTimer = 1 + random() * 4;

    // For fireflies / butterflies — phase offset
    this._phase = random() * Math.PI * 2;
    this._home = position.clone();
    this._threatDirection = new THREE.Vector3();
    this._fleeTimer = 0;
  }

  get isExpired() { return this.age > this.lifetime; }
}

// ─── LifeSystem ───────────────────────────────────────────────────────────────
export class LifeSystem {
  constructor(worldState, scene, terrainHeight, riverSample = null) {
    this.ws = worldState;
    this.scene = scene;
    this.terrainHeight = terrainHeight;
    this.riverSample = riverSample;

    this.animals = [];
    this.npcs = [];
    this._signalCount = 0;

    this._spawnTimers = {};
    SPECIES.forEach(s => {
      const firstSightDelay = ['deer', 'rabbit', 'crow', 'horse'].includes(s.id) ? 0.5 : 5;
      this._spawnTimers[s.id] = this.ws.rng() * firstSightDelay;
    });

    // Shared low-poly geometries
    this._geoCache = {};
    this._matCache = {};

    // NPC state
    this._lanternKeeper = null;
    this._fisher = null;
    this._radioOperator = null;
    this._keeperLanternTimer = 0;

    // Firefly group (instanced)
    this._fireflyMesh = null;
    this._fireflyCount = 0;
    this._fireflyDummy = new THREE.Object3D();
    this._fireflyBases = Array.from({ length: 120 }, (_, index) => {
      const phase = index * 0.718 + 1.0;
      const home = [ZONE_CENTRES.trailhead, ZONE_CENTRES.crossing, ZONE_CENTRES.settlement][index % 3];
      const x = home.x + Math.sin(phase * 7.3) * 40;
      const z = home.z + Math.cos(phase * 5.1) * 40;
      return { phase, x, z, y: this.terrainHeight(x, z) };
    });
    this._buildFireflies();
    this.setSignalCount(0);
  }

  _getGeo(id) {
    if (!this._geoCache[id]) {
      switch (id) {
        case 'box':    this._geoCache[id] = new THREE.BoxGeometry(1, 1, 1); break;
        case 'cone':   this._geoCache[id] = new THREE.ConeGeometry(0.5, 1, 6); break;
        case 'sphere': this._geoCache[id] = new THREE.SphereGeometry(0.5, 6, 5); break;
        case 'animalSphere': this._geoCache[id] = new THREE.SphereGeometry(1, 12, 9); break;
        case 'wing': this._geoCache[id] = new THREE.PlaneGeometry(1, 0.32); break;
        case 'leg': this._geoCache[id] = new THREE.CylinderGeometry(0.055, 0.075, 0.5, 5); break;
        case 'hoof': this._geoCache[id] = new THREE.BoxGeometry(0.18, 0.13, 0.22); break;
        case 'antler': this._geoCache[id] = new THREE.CylinderGeometry(0.035, 0.075, 1, 5); break;
        default:       this._geoCache[id] = new THREE.BoxGeometry(1, 1, 1);
      }
    }
    return this._geoCache[id];
  }

  _getMat(hex) {
    const key = hex.toString(16);
    if (!this._matCache[key]) {
      this._matCache[key] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.86 });
    }
    return this._matCache[key];
  }

  _buildFireflies() {
    const maxCount = 200;
    const geom = new THREE.SphereGeometry(0.06, 4, 3);
    const mat = new THREE.MeshBasicMaterial({ color: 0xc8ff60 });
    this._fireflyMesh = new THREE.InstancedMesh(geom, mat, maxCount);
    this._fireflyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._fireflyMesh.visible = false;
    this.scene.add(this._fireflyMesh);
  }

  /** Called when beacon progress changes */
  setSignalCount(count) {
    this._signalCount = count;
    // Unlock species based on signal count
    SPECIES.forEach(s => {
      if (count >= s.unlockLevel) this.ws.life.unlocked.add(s.id);
    });
    // Lantern keeper appears at signal 2
    if (count >= 2 && !this._lanternKeeper) this._spawnLanternKeeper();
    // Fisher at signal 1
    if (count >= 1 && !this._fisher) this._spawnFisher();
    // The radio operator keeps the Trailhead occupied from the first visit.
    if (!this._radioOperator) this._spawnRadioOperator();
  }

  _buildAnimalMesh(species) {
    const group = new THREE.Group();
    const addPart = (geometry, material, position, scale, rotation = null) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      if (rotation) mesh.rotation.set(...rotation);
      group.add(mesh);
      return mesh;
    };

    if (species.id === 'crow' || species.id === 'hawk' || species.id === 'owl') {
      const body = new THREE.Mesh(this._getGeo('cone'), this._getMat(species.color));
      body.scale.set(0.5, 0.42, 1.05);
      body.rotation.x = Math.PI / 2;
      group.add(body);
      [-1, 1].forEach(side => {
        const wing = new THREE.Mesh(this._getGeo('wing'), this._getMat(species.color));
        wing.position.set(side * 0.32, 0, 0);
        wing.scale.set(0.72, 1, 1);
        wing.rotation.z = side * 0.3;
        group.add(wing);
      });
      group.userData.wings = group.children.slice(1);
    } else if (species.id === 'fish') {
      const fishMat = this._getMat(species.color);
      addPart(this._getGeo('animalSphere'), fishMat, [0, 0, 0], [0.7, 0.28, 1.25]);
      const tail = addPart(this._getGeo('cone'), fishMat, [0, 0, -1.05], [0.35, 0.55, 0.48], [Math.PI / 2, 0, Math.PI]);
      tail.name = 'fish-tail';
      addPart(this._getGeo('animalSphere'), this._getMat(0xd6c99b), [0.22, 0.08, 0.44], [0.065, 0.065, 0.065]);
      group.userData.tail = tail;
    } else if (species.id === 'firefly' || species.id === 'butterfly') {
      const dot = new THREE.Mesh(this._getGeo('sphere'), this._getMat(species.color));
      dot.scale.setScalar(species.id === 'firefly' ? 0.18 : 0.32);
      group.add(dot);
      if (species.id === 'butterfly') {
        const wingMaterial = this._getMat(0xf2c66d);
        group.userData.wings = [-1, 1].map(side => {
          const wing = new THREE.Mesh(this._getGeo('wing'), wingMaterial);
          wing.position.set(side * 0.33, 0.03, 0);
          wing.rotation.y = side * 0.18;
          group.add(wing);
          return wing;
        });
      }
    } else {
      const animalMat = this._getMat(species.color);
      const darkMat = this._getMat(species.id === 'horse' ? 0x30251e : 0x302a24);
      const muzzleMat = this._getMat(species.id === 'deer' ? 0x8d7056 : species.color);
      const smallAnimal = species.id === 'rabbit';
      const largeAnimal = species.id === 'horse';
      const bodyHeight = largeAnimal ? 0.91 : smallAnimal ? 0.48 : 0.78;
      const body = addPart(
        this._getGeo('animalSphere'),
        animalMat,
        [0, bodyHeight, -0.08],
        largeAnimal ? [0.58, 0.49, 1.04] : smallAnimal ? [0.4, 0.34, 0.58] : [0.5, 0.44, 0.82]
      );
      body.name = 'animal-body';
      group.userData.body = body;
      group.userData.bodyBaseY = bodyHeight;

      const neckBase = largeAnimal ? 1.13 : smallAnimal ? 0.66 : 1.06;
      const headHeight = largeAnimal ? 1.65 : smallAnimal ? 0.88 : 1.48;
      const neck = addPart(
        this._getGeo('animalSphere'),
        animalMat,
        [0, neckBase, largeAnimal ? 0.56 : 0.49],
        largeAnimal ? [0.27, 0.58, 0.3] : smallAnimal ? [0.18, 0.24, 0.22] : [0.24, 0.5, 0.29],
        [-0.3, 0, 0]
      );
      neck.name = 'animal-neck';
      const head = addPart(
        this._getGeo('animalSphere'),
        animalMat,
        [0, headHeight, 0.77],
        smallAnimal ? [0.2, 0.19, 0.24] : largeAnimal ? [0.23, 0.25, 0.3] : [0.23, 0.22, 0.27]
      );
      head.name = 'animal-head';
      group.userData.head = head;
      addPart(
        this._getGeo('animalSphere'),
        muzzleMat,
        [0, headHeight - 0.09, largeAnimal ? 1.0 : 0.98],
        [0.16, 0.13, 0.23]
      );

      [-1, 1].forEach(side => {
        addPart(this._getGeo('animalSphere'), darkMat, [side * 0.19, headHeight + 0.035, 0.94], [0.045, 0.05, 0.045]);
        if (species.id === 'rabbit' || species.id === 'deer' || species.id === 'fox' || largeAnimal) {
          const ear = addPart(
            this._getGeo('animalSphere'),
            animalMat,
            [side * (smallAnimal ? 0.13 : 0.2), headHeight + (smallAnimal ? 0.28 : 0.17), 0.7],
            smallAnimal ? [0.075, 0.28, 0.055] : species.id === 'fox' ? [0.09, 0.3, 0.07] : [0.08, 0.2, 0.07]
          );
          ear.rotation.z = side * -0.18;
        }
      });

      if (species.id === 'deer') {
        const antlerMaterial = this._getMat(0xd6c3a2);
        const antlerSegment = (start, end) => {
          const from = new THREE.Vector3(...start);
          const to = new THREE.Vector3(...end);
          const direction = to.clone().sub(from);
          const beam = new THREE.Mesh(this._getGeo('antler'), antlerMaterial);
          beam.position.copy(from).add(to).multiplyScalar(0.5);
          beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
          beam.scale.y = direction.length();
          group.add(beam);
        };
        [-1, 1].forEach(side => {
          const base = [side * 0.14, headHeight + 0.18, 0.72];
          const crown = [side * 0.32, headHeight + 0.7, 0.76];
          const tip = [side * 0.43, headHeight + 1.05, 0.82];
          antlerSegment(base, crown);
          antlerSegment(crown, tip);
          antlerSegment([side * 0.23, headHeight + 0.43, 0.74], [side * 0.48, headHeight + 0.55, 0.76]);
          antlerSegment([side * 0.3, headHeight + 0.7, 0.76], [side * 0.56, headHeight + 0.83, 0.8]);
        });
        const coatSpotMaterial = this._getMat(0xd1b18a);
        [-1, 1].forEach(side => {
          [-0.36, -0.08, 0.2].forEach((z, index) => {
            addPart(
              this._getGeo('animalSphere'),
              coatSpotMaterial,
              [side * 0.4, bodyHeight + 0.2 + (index % 2) * 0.07, z],
              [0.035, 0.055, 0.07]
            );
          });
        });
        addPart(
          this._getGeo('animalSphere'),
          this._getMat(0x211b17),
          [0, headHeight - 0.12, 1.14],
          [0.09, 0.07, 0.08]
        );
      } else if (species.id === 'goat') {
        [-1, 1].forEach(side => {
          const horn = addPart(this._getGeo('cone'), this._getMat(0xd4cbb0), [side * 0.16, headHeight + 0.23, 0.73], [0.1, 0.42, 0.1]);
          horn.rotation.z = side * -0.42;
        });
      }
      if (largeAnimal || species.id === 'fox') {
        const tail = addPart(
          this._getGeo('animalSphere'),
          species.id === 'fox' ? this._getMat(0xc06820) : animalMat,
          [0, bodyHeight + 0.05, -0.92],
          largeAnimal ? [0.12, 0.14, 0.48] : [0.2, 0.2, 0.47]
        );
        tail.name = 'animal-tail';
        group.userData.tail = tail;
      }

      const legPivots = [];
      const hipY = smallAnimal ? 0.44 : largeAnimal ? 0.72 : 0.64;
      const legLength = smallAnimal ? 0.31 : largeAnimal ? 0.73 : 0.54;
      const legWidth = smallAnimal ? 0.7 : largeAnimal ? 1.15 : 1;
      for (let legIndex = 0; legIndex < 4; legIndex += 1) {
        const pivot = new THREE.Group();
        pivot.position.set(legIndex % 2 === 0 ? -0.29 : 0.29, hipY, legIndex < 2 ? 0.43 : -0.48);
        const leg = new THREE.Mesh(this._getGeo('leg'), animalMat);
        leg.scale.set(legWidth, legLength / 0.5, legWidth);
        leg.position.y = -legLength / 2;
        pivot.add(leg);
        const hoof = new THREE.Mesh(this._getGeo('hoof'), darkMat);
        hoof.position.set(0, -legLength + 0.03, 0.045);
        hoof.scale.setScalar(smallAnimal ? 0.55 : largeAnimal ? 1.25 : 0.82);
        pivot.add(hoof);
        group.add(pivot);
        legPivots.push(pivot);
      }
      group.userData.legs = legPivots;
    }

    group.scale.setScalar(species.scale);
    return group;
  }

  _spawnAnimal(species, zone, truckPosition) {
    if (!this.ws.life.unlocked.has(species.id)) return;
    const centre = ZONE_CENTRES[zone] || { x: 0, z: 0 };

    let position;
    if (species.habitat === 'tied') {
      const x = centre.x - 7;
      const z = centre.z - 1;
      position = new THREE.Vector3(x, this.terrainHeight(x, z), z);
    } else if (species.habitat === 'sky') {
      position = new THREE.Vector3(
        centre.x + (this.ws.rng() - 0.5) * 60,
        24 + this.ws.rng() * 14,
        centre.z + (this.ws.rng() - 0.5) * 60
      );
    } else if (species.id === 'crow') {
      const x = centre.x + (this.ws.rng() - 0.5) * 44;
      const z = centre.z + (this.ws.rng() - 0.5) * 44;
      position = new THREE.Vector3(x, this.terrainHeight(x, z) + 6 + this.ws.rng() * 4, z);
    } else if (species.habitat === 'river' && this.riverSample) {
      const angle = this.ws.rng() * Math.PI * 2;
      const radius = this.ws.rng() * 2.2;
      const x = centre.x + Math.cos(angle) * radius;
      const z = centre.z + Math.sin(angle) * radius;
      const river = this.riverSample(x, z);
      position = new THREE.Vector3(x, (river?.surfaceY ?? this.terrainHeight(x, z)) - 0.45, z);
    } else {
      const zoneDistance = truckPosition
        ? Math.hypot(centre.x - truckPosition.x, centre.z - truckPosition.z)
        : Infinity;
      const spawnCentre = zoneDistance < 70 ? truckPosition : centre;
      const pos2 = randomInRadius(spawnCentre.x, spawnCentre.z, 14, 36, this.ws.rng);
      const y = this.terrainHeight(pos2.x, pos2.z);
      position = new THREE.Vector3(pos2.x, y, pos2.z);
    }

    if (truckPosition && species.habitat !== 'sky' && species.habitat !== 'river' && species.habitat !== 'tied'
      && position.distanceTo(truckPosition) < 13) {
      const offset = new THREE.Vector3(position.x - truckPosition.x, 0, position.z - truckPosition.z);
      if (offset.lengthSq() < 0.01) offset.set(1, 0, 0);
      offset.setLength(16);
      position.x = truckPosition.x + offset.x;
      position.z = truckPosition.z + offset.z;
      position.y = this.terrainHeight(position.x, position.z);
    }

    const mesh = this._buildAnimalMesh(species);
    mesh.position.copy(position);
    this.scene.add(mesh);
    const animal = new Animal(species, position, mesh, this.ws.rng);
    if (species.habitat === 'tied') animal.lifetime = 1e9;
    this.animals.push(animal);
  }

  _spawnRadioOperator() {
    const x = ZONE_CENTRES.signal.x + 18;
    const z = ZONE_CENTRES.signal.z + 15;
    const position = new THREE.Vector3(x, this.terrainHeight(x, z), z);
    const group = new THREE.Group();
    const coat = new THREE.MeshStandardMaterial({ color: 0x39433d, roughness: 0.92 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc49a76, roughness: 0.86 });
    const lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9b66a,
      emissive: 0xc67b35,
      emissiveIntensity: 0.8,
      roughness: 0.4
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 1.45, 7), coat);
    body.position.y = 0.75;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), skin);
    head.position.y = 1.65;
    group.add(head);
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.22), this._getMat(0x343633));
    radio.position.set(0.34, 1.05, 0.18);
    group.add(radio);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.18), lanternMaterial);
    lamp.position.set(-0.42, 1.1, 0.2);
    group.add(lamp);
    group.position.copy(position);
    group.rotation.y = -0.42;
    this.scene.add(group);
    this._radioOperator = { mesh: group, phase: this.ws.rng() * Math.PI * 2 };
    this.npcs.push(this._radioOperator);
  }

  _spawnLanternKeeper() {
    const x = ZONE_CENTRES.settlement.x + 12;
    const z = ZONE_CENTRES.settlement.z + 8;
    const pos = new THREE.Vector3(x, this.terrainHeight(x, z), z);
    const group = new THREE.Group();
    // Simple low-poly NPC: cylinder body + sphere head
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 1.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a5240, roughness: 0.9 })
    );
    body.position.y = 0.85;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xc8a882, roughness: 0.8 })
    );
    head.position.y = 1.98;
    group.add(head);
    // Lantern in hand
    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.28, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xe8b04a, emissive: 0xe8b04a, emissiveIntensity: 1.2, roughness: 0.4 })
    );
    lantern.position.set(0.42, 1.3, 0.2);
    group.add(lantern);

    group.position.copy(pos);
    this.scene.add(group);
    this._lanternKeeper = {
      mesh: group,
      basePos: pos.clone(),
      phase: 0,
      walkPath: this._generateLanternPath(pos),
      pathIndex: 0,
      hasWaved: false,
      waveTimer: 0
    };
    this.npcs.push(this._lanternKeeper);
  }

  _generateLanternPath(base) {
    // A small circuit around the settlement
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = 12 + Math.sin(i * 1.7) * 4;
      pts.push(new THREE.Vector3(
        base.x + Math.cos(angle) * r,
        this.terrainHeight(base.x + Math.cos(angle) * r, base.z + Math.sin(angle) * r),
        base.z + Math.sin(angle) * r
      ));
    }
    return pts;
  }

  _spawnFisher() {
    const x = ZONE_CENTRES.crossing.x + 24;
    const z = ZONE_CENTRES.crossing.z - 20;
    const pos = new THREE.Vector3(x, this.terrainHeight(x, z), z);
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.34, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a5040, roughness: 0.9 })
    );
    body.position.y = 0.75;
    group.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.26, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xc09070, roughness: 0.8 })
    );
    head.position.y = 1.72;
    group.add(head);
    // Fishing rod
    const rod = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x8a6040, roughness: 0.7 })
    );
    rod.position.set(0.3, 1.4, 0.8);
    rod.rotation.x = -0.4;
    group.add(rod);

    group.position.copy(pos);
    group.rotation.y = Math.PI * 0.1;
    this.scene.add(group);
    this._fisher = { mesh: group, basePos: pos.clone(), bobTimer: 0 };
    this.npcs.push(this._fisher);
  }

  _isHauntable(truck) {
    return truck && truck.position;
  }

  update(dt, truckPosition, honking, signalCount) {
    const ws = this.ws;
    const hour = ws.time.hour;

    // Update signal count if changed
    if (signalCount !== this._signalCount) this.setSignalCount(signalCount);

    // ── Spawn animals ──────────────────────────────────────────────
    SPECIES.forEach(species => {
      if (!ws.life.unlocked.has(species.id)) return;
      if (!isActiveHours(species, hour)) return;
      if (species.id === 'firefly') return; // rendered as one instanced batch

      const existingCount = this.animals.filter(a => a.species.id === species.id).length;
      if (existingCount >= species.maxNear || this.animals.length >= 45) return;

      this._spawnTimers[species.id] -= dt;
      if (this._spawnTimers[species.id] <= 0) {
        this._spawnTimers[species.id] = 5 + this.ws.rng() * 15;
        const zones = species.zones
          .map(zone => ({ zone, centre: ZONE_CENTRES[zone] }))
          .filter(entry => entry.centre)
          .sort((left, right) => {
            const distance = entry => truckPosition
              ? Math.hypot(entry.centre.x - truckPosition.x, entry.centre.z - truckPosition.z)
              : 0;
            return distance(left) - distance(right);
          });
        const nearby = zones.find(entry => !truckPosition
          || Math.hypot(entry.centre.x - truckPosition.x, entry.centre.z - truckPosition.z) < 100);
        if (!nearby) return;

        const remainingCapacity = Math.min(species.maxNear - existingCount, 45 - this.animals.length);
        const [minFlock, maxFlock] = species.flockSize;
        const flockCount = Math.min(
          remainingCapacity,
          minFlock + Math.floor(this.ws.rng() * (maxFlock - minFlock + 1))
        );
        for (let index = 0; index < flockCount; index += 1) {
          this._spawnAnimal(species, nearby.zone, truckPosition);
        }
      }
    });

    // ── Update animals ─────────────────────────────────────────────
    const toRemove = [];
    this.animals.forEach((animal, idx) => {
      animal.age += dt;

      const spec = animal.species;
      const farFromPlayer = truckPosition && spec.habitat !== 'tied'
        && animal.position.distanceTo(truckPosition) > 180;
      if (!isActiveHours(spec, hour) || animal.isExpired || farFromPlayer) {
        toRemove.push(idx);
        return;
      }

      // Perception of truck
      if (truckPosition) {
        const dist = Math.hypot(
          animal.position.x - truckPosition.x,
          animal.position.z - truckPosition.z
        );
        const sound = honking ? spec.hearRadius * 1.5 : spec.hearRadius * 0.5;

        if (dist < spec.fleeRadius || (honking && dist < sound)) {
          if (spec.fleeRadius > 0 || honking) {
            animal._threatDirection.set(
              animal.position.x - truckPosition.x,
              0,
              animal.position.z - truckPosition.z
            );
            if (animal._threatDirection.lengthSq() < 0.01) {
              animal._threatDirection.set(this.ws.rng() - 0.5, 0, this.ws.rng() - 0.5);
            }
            animal._threatDirection.normalize();
            animal._fleeTimer = 2.5;
            animal.state = 'flee';
            animal.alertLevel = 3;
          }
        } else if (dist < spec.sightRadius) {
          animal.alertLevel = dist < spec.sightRadius * 0.5 ? 2 : 1;
          if (animal.state === 'idle') animal.state = 'alert';
        } else {
          animal.alertLevel = Math.max(0, animal.alertLevel - dt * 0.5);
          if (animal.alertLevel < 0.5) animal.state = 'idle';
        }
      }

      // Movement
      this._updateAnimalMovement(animal, dt);

      // Sync mesh
      if (animal.mesh) {
        animal.mesh.position.copy(animal.position);

        // Face velocity
        if (animal.velocity.length() > 0.1) {
          animal.mesh.rotation.y = Math.atan2(animal.velocity.x, animal.velocity.z);
        }

        // Hawk soaring
        if (spec.id === 'hawk') {
          const t = animal.age;
          animal.position.x += Math.cos(t * 0.3) * dt * spec.speed;
          animal.position.z += Math.sin(t * 0.3) * dt * spec.speed;
          animal.position.y = 40 + Math.sin(t * 0.15) * 6;
          animal.mesh.position.copy(animal.position);
          animal.mesh.rotation.y += dt * 0.3;
        } else if (spec.id === 'crow') {
          const orbit = animal.age * 0.22 + animal._phase;
          animal.position.x = animal._home.x + Math.cos(orbit) * 9;
          animal.position.z = animal._home.z + Math.sin(orbit) * 9;
          animal.position.y = this.terrainHeight(animal.position.x, animal.position.z)
            + 6.5 + Math.sin(orbit * 1.7) * 1.2;
          animal.mesh.position.copy(animal.position);
          animal.mesh.rotation.y = -orbit;
        }
        if (spec.id === 'fish') {
          const river = this.riverSample?.(animal.position.x, animal.position.z);
          if (river) animal.mesh.position.y = river.surfaceY - 0.45;
          animal.mesh.rotation.y += Math.sin(animal.age * 2 + animal._phase) * dt * 0.25;
          if (animal.mesh.userData.tail) {
            animal.mesh.userData.tail.rotation.y = Math.sin(animal.age * 4 + animal._phase) * 0.35;
          }
        } else if (spec.id === 'butterfly') {
          animal.position.x += Math.cos(animal.age * 0.8 + animal._phase) * dt * spec.speed;
          animal.position.z += Math.sin(animal.age * 0.65 + animal._phase) * dt * spec.speed;
          animal.mesh.position.x = animal.position.x;
          animal.mesh.position.z = animal.position.z;
          animal.mesh.position.y = this.terrainHeight(animal.position.x, animal.position.z)
            + 0.9 + Math.sin(animal.age * 3 + animal._phase) * 0.4;
          animal.mesh.userData.wings?.forEach((wing, index) => {
            wing.rotation.z = (index === 0 ? -1 : 1) * Math.sin(animal.age * 18 + animal._phase) * 0.55;
          });
        } else if (animal.mesh.userData.legs?.length) {
          const moving = animal.velocity.lengthSq() > 0.08 || animal.state === 'flee';
          const gait = animal.age * (animal.state === 'flee' ? 15 : 7) + animal._phase;
          animal.mesh.userData.legs.forEach((leg, index) => {
            const stride = moving ? 0.52 : 0.025;
            leg.rotation.x = Math.sin(gait + (index % 2) * Math.PI) * stride;
          });
          if (animal.mesh.userData.body) {
            const bob = moving ? Math.abs(Math.sin(gait * 0.5)) * 0.045 : Math.sin(gait) * 0.012;
            animal.mesh.userData.body.position.y = animal.mesh.userData.bodyBaseY + bob;
          }
          if (animal.mesh.userData.head) {
            animal.mesh.userData.head.rotation.x = animal.state === 'alert'
              ? Math.sin(animal.age * 1.4 + animal._phase) * 0.05 - 0.08
              : Math.sin(animal.age * 1.1 + animal._phase) * 0.025;
          }
          if (animal.mesh.userData.tail) {
            animal.mesh.userData.tail.rotation.x = Math.sin(animal.age * 2.8 + animal._phase) * 0.18;
          }
        }
        if (animal.mesh.userData.wings && spec.id !== 'butterfly') {
          animal.mesh.userData.wings.forEach((wing, index) => {
            wing.rotation.z = (index === 0 ? -1 : 1) * Math.sin(animal.age * 8 + animal._phase) * 0.6;
          });
        }
      }
    });

    // Remove expired / out-of-hours animals
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const animal = this.animals[toRemove[i]];
      if (animal.mesh) this.scene.remove(animal.mesh);
      this.animals.splice(toRemove[i], 1);
    }

    // ── Fireflies (instanced) ──────────────────────────────────────
    const nightFactor = Math.max(0, Math.min(1, (hour < 5 || hour > 20) ? 1 : (hour > 19 ? hour - 19 : 0)));
    if (ws.life.unlocked.has('firefly')) {
      this._updateFireflies(dt, nightFactor);
    } else {
      if (this._fireflyMesh) this._fireflyMesh.visible = false;
    }

    // ── NPCs ───────────────────────────────────────────────────────
    this._updateNPCs(dt, hour, truckPosition, honking);
  }

  _updateAnimalMovement(animal, dt) {
    const spec = animal.species;
    if (spec.id === 'hawk' || spec.id === 'crow' || spec.id === 'firefly'
      || spec.habitat === 'tied') return;
    if (spec.id === 'butterfly') {
      animal.velocity.set(
        Math.cos(animal.age * 0.8 + animal._phase),
        0,
        Math.sin(animal.age * 0.65 + animal._phase)
      ).normalize();
      return;
    }
    if (spec.id === 'fish') {
      const river = this.riverSample?.(animal.position.x, animal.position.z);
      if (river) {
        let direction = 1;
        const nextX = animal.position.x + river.directionX * spec.speed * dt;
        const nextZ = animal.position.z + river.directionZ * spec.speed * dt;
        const nextRiver = this.riverSample(nextX, nextZ);
        if (!nextRiver || nextRiver.distance > 3.5) direction = -1;
        animal.position.x += river.directionX * spec.speed * dt * direction;
        animal.position.z += river.directionZ * spec.speed * dt * direction;
      }
      return;
    }

    animal._wanderTimer -= dt;

    if (animal.state === 'flee') {
      animal._fleeTimer -= dt;
      animal.velocity.lerp(animal._threatDirection, Math.min(1, dt * 4));
      animal.position.addScaledVector(animal.velocity, dt * spec.speed * 1.7);
      animal.position.y = this.terrainHeight(animal.position.x, animal.position.z);
      if (animal._fleeTimer <= 0) animal.state = 'idle';
    } else if (animal.state === 'idle') {
      if (animal._wanderTimer <= 0) {
        animal._wanderTimer = 2 + this.ws.rng() * 6;
        const offset = new THREE.Vector3((this.ws.rng() - 0.5) * 12, 0, (this.ws.rng() - 0.5) * 12);
        animal._wanderTarget.copy(animal.position).add(offset);
      }
      const dir = animal._wanderTarget.clone().sub(animal.position);
      dir.y = 0;
      if (dir.length() > 0.5) {
        dir.normalize();
        animal.velocity.lerp(dir, 0.1);
        animal.position.addScaledVector(dir, dt * spec.speed * 0.3);
        animal.position.y = this.terrainHeight(animal.position.x, animal.position.z);
      } else {
        animal.velocity.multiplyScalar(0.8);
      }
    }
  }

  _updateFireflies(dt, nightFactor) {
    const mesh = this._fireflyMesh;
    if (!mesh) return;
    mesh.visible = nightFactor > 0.1;
    if (!mesh.visible) return;

    const count = Math.floor(nightFactor * 120);
    const dummy = this._fireflyDummy;
    const t = this.ws.elapsed;

    for (let i = 0; i < count; i++) {
      const { phase, x: baseX, z: baseZ, y: baseY } = this._fireflyBases[i];
      dummy.position.set(
        baseX + Math.sin(t * 0.4 + phase) * 3,
        baseY + 0.5 + Math.sin(t * 0.6 + phase * 2) * 1.2,
        baseZ + Math.cos(t * 0.35 + phase * 1.3) * 3
      );
      dummy.scale.setScalar(0.5 + 0.5 * Math.sin(t * 2.1 + phase * 3.7));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
  }

  _updateNPCs(dt, hour, truckPos, honking) {
    // Lantern keeper: walks route at 19:00, tips hat when honked
    if (this._lanternKeeper) {
      const keeper = this._lanternKeeper;
      keeper.phase += dt;
      keeper.waveTimer = Math.max(0, keeper.waveTimer - dt);
      const isLighting = hour >= 19 || hour < 6;

      if (isLighting) {
        // Walk the circuit
        const target = keeper.walkPath[keeper.pathIndex];
        if (target) {
          const dir = target.clone().sub(keeper.mesh.position);
          dir.y = 0;
          if (dir.length() < 1.5) {
            keeper.pathIndex = (keeper.pathIndex + 1) % keeper.walkPath.length;
          } else {
            dir.normalize();
            keeper.mesh.position.addScaledVector(dir, dt * 1.2);
            keeper.mesh.position.y = this.terrainHeight(keeper.mesh.position.x, keeper.mesh.position.z);
            keeper.mesh.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }
      } else {
        // Return to base position slowly
        keeper.mesh.position.lerp(keeper.basePos, dt * 0.3);
      }

      // Tip hat on honk (bob head)
      if (honking && truckPos) {
        const dist = keeper.mesh.position.distanceTo(truckPos);
        if (dist < 30 && keeper.waveTimer <= 0) {
          keeper.waveTimer = 1.2;
        }
      }
      const head = keeper.mesh.children[1];
      if (head) head.rotation.x = keeper.waveTimer > 0 ? 0.3 : 0;
      const lantern = keeper.mesh.children[2];
      if (lantern?.material?.emissiveIntensity !== undefined) {
        const target = isLighting ? 1.2 : 0.08;
        lantern.material.emissiveIntensity += (target - lantern.material.emissiveIntensity) * Math.min(1, dt * 2);
      }
    }

    // Fisher: bob rod periodically
    if (this._fisher) {
      const fisher = this._fisher;
      fisher.bobTimer += dt;
      if (fisher.bobTimer > 4) {
        fisher.bobTimer = 0;
        fisher.biteTimer = 0.65;
      }
      fisher.biteTimer = Math.max(0, (fisher.biteTimer || 0) - dt);
      const rod = fisher.mesh.children[2];
      if (rod) rod.rotation.x = fisher.biteTimer > 0 ? -0.8 : -0.4;
    }

    if (this._radioOperator) {
      const operator = this._radioOperator;
      operator.phase += dt;
      const lamp = operator.mesh.children[3];
      if (lamp?.material?.emissiveIntensity !== undefined) {
        const isNight = hour >= 19 || hour < 6;
        const target = isNight ? 1.1 : 0.05;
        lamp.material.emissiveIntensity += (target - lamp.material.emissiveIntensity) * Math.min(1, dt * 2);
      }
      operator.mesh.children[1].rotation.z = Math.sin(operator.phase * 0.7) * 0.025;
    }
  }

  dispose() {
    this.animals.forEach(a => { if (a.mesh) this.scene.remove(a.mesh); });
    this.npcs.forEach(n => { if (n.mesh) this.scene.remove(n.mesh); });
    const sharedGeometries = new Set(Object.values(this._geoCache));
    const sharedMaterials = new Set(Object.values(this._matCache));
    this.npcs.forEach(npc => {
      npc.mesh?.traverse(object => {
        if (object.geometry && !sharedGeometries.has(object.geometry)) object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if (material && !sharedMaterials.has(material)) material.dispose();
        });
      });
    });
    if (this._fireflyMesh) {
      this._fireflyMesh.geometry.dispose();
      this._fireflyMesh.material.dispose();
      this.scene.remove(this._fireflyMesh);
    }
    Object.values(this._geoCache).forEach(g => g.dispose());
    Object.values(this._matCache).forEach(m => m.dispose());
  }
}
