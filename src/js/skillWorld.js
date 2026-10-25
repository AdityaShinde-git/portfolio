/**
 * SkillWorld — Signal Ridge, a ruined mountain pass
 * Powered by Three.js & Cannon-es
 *
 * Features:
 * - A map-aligned mountain region linking six skill destinations and side landmarks
 * - Open-road exploration, a vehicle workshop, and optional rally checkpoints
 * - Arcade driving with off-road handling, rally gates, destination guidance, and touch controls
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { resumeData } from '../data/resumeData.js';
import { sound } from './soundEngine.js';
import { LivingWorld } from './worldSystems/livingWorld.js';
import {
  FORD,
  FOSSIL_RIDGE,
  GARAGE_POSITION,
  HIGH_PASS,
  ROAD_DEFINITIONS,
  RIVER_ROUTE,
  SETTLEMENT,
  SIGNAL_PEAK,
  TRAILHEAD,
  TRAILHEAD_HEADING,
  TRAILHEAD_SPAWN,
  WORLD_DEPTH,
  WORLD_DESTINATIONS,
  WORLD_SECRET_SITES,
  WORLD_WIDTH,
  mapPosition,
  mapRoute
} from './worldSystems/signalRidgeLayout.js';

const WORLD_FLOOR_Y = -38.5;
const TERRAIN_COLLISION_GROUP = 1 << 1;

function buildRoadGuidanceGraph() {
  const nodes = [];
  const nodeIndexes = new Map();
  const edges = [];
  const addNode = point => {
    const key = `${Math.round(point.x * 10)}:${Math.round(point.z * 10)}`;
    if (!nodeIndexes.has(key)) {
      nodeIndexes.set(key, nodes.length);
      nodes.push({ x: point.x, z: point.z });
      edges.push([]);
    }
    return nodeIndexes.get(key);
  };
  const addEdge = (from, to) => {
    if (from === to || edges[from].some(edge => edge.node === to)) return;
    const weight = Math.hypot(nodes[from].x - nodes[to].x, nodes[from].z - nodes[to].z);
    edges[from].push({ node: to, weight });
    edges[to].push({ node: from, weight });
  };

  ROAD_DEFINITIONS.forEach(({ points, closed = false }) => {
    const curve = new THREE.CatmullRomCurve3(
      points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      closed,
      'centripetal'
    );
    const samples = curve.getSpacedPoints(Math.max(2, Math.ceil(curve.getLength() / 6)));
    const routeNodes = samples.map(addNode);
    for (let index = 1; index < routeNodes.length; index += 1) {
      addEdge(routeNodes[index - 1], routeNodes[index]);
    }
    if (closed) addEdge(routeNodes[routeNodes.length - 1], routeNodes[0]);
  });

  return { nodes, edges };
}

const ROAD_GUIDANCE_GRAPH = buildRoadGuidanceGraph();

export class SkillWorld {
  constructor(
    canvas,
    onDiscoverDestination = null,
    onTelemetry = null,
    onGarageChange = null,
    onSignalChange = null,
    initialSignals = [],
    onSecretDiscovery = null,
    initialSecrets = [],
    onSettlementTopic = null,
    settlementTopicDefinitions = [],
    initialSettlementTopics = []
  ) {
    this.canvas = canvas;
    this.onDiscoverDestination = onDiscoverDestination;
    this.onTelemetry = onTelemetry;
    this.onGarageChange = onGarageChange;
    this.onSignalChange = onSignalChange;
    this.onSecretDiscovery = onSecretDiscovery;
    this.onSettlementTopic = onSettlementTopic;
    this.settlementTopicDefinitions = settlementTopicDefinitions;
    this.litSettlementTopicIds = new Set(initialSettlementTopics);
    this.settlementTopics = [];
    this.nearbySettlementTopic = null;
    this.foundSecrets = new Set(initialSecrets.filter(id =>
      WORLD_SECRET_SITES.some(site => site.id === id)
    ));
    this.secretSites = WORLD_SECRET_SITES;
    this.litBeacons = new Set(initialSignals.filter(id =>
      WORLD_DESTINATIONS.some(destination => destination.id === id)
    ));
    this.disposed = false;
    this.paused = true;
    this.vehicleSpeed = 0;
    this.checkpointIndex = 0;
    this.trackComplete = false;
    this.rallyActive = false;
    this.rallyElapsedMs = 0;
    this.rallyBestMs = 0;
    this.destinationId = null;
    this.lastTelemetryAt = 0;
    this.garageOpen = false;
    this.garageReturnState = null;
    this.lowRange = false;
    this.cameraDistance = 10;
    this.cameraDistanceTarget = 10;
    this.cameraYawOffset = 0;
    this.cameraYawTarget = 0;
    this.cameraPitch = 0;
    this.cameraPitchTarget = 0;
    this.cameraDragging = false;
    this.lastCameraInput = 0;
    this.autoDriveTarget = null;
    this.vehicleBuild = {
      paint: '#53645b',
      alloy: '#c2a878',
      rideHeight: 1,
      bodyWidth: 1,
      wheelStyle: 'all-terrain',
      bodyKit: 'stock',
      power: 1
    };

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      brake: false,
      nitro: false
    };

    this.activeDestinations = new Set();
    this.roadGlowMeshes = [];
    this.breadcrumb = [];
    this.timePaused = false;
    this.reducedMotion = false;
    this.particles = [];
    this.worldTextures = [];
    this.windowMeshes = [];    // settlement windows — wired to LivingWorld
    this.livingWorld = null;   // initialised after scene is built
    this.windShaders = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onResize = this._onResize.bind(this);
    this._clearControls = this._clearControls.bind(this);
    this._onCanvasPointerDown = this._onCanvasPointerDown.bind(this);
    this._onCanvasPointerMove = this._onCanvasPointerMove.bind(this);
    this._onCanvasPointerUp = this._onCanvasPointerUp.bind(this);
    this._onCanvasWheel = this._onCanvasWheel.bind(this);
    this._onCanvasDoubleClick = this._onCanvasDoubleClick.bind(this);

    this._init();
  }

  _init() {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;

    // 1. Three.js Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    const compactQuality = w <= 760
      || navigator.hardwareConcurrency <= 4;
    this.compactQuality = compactQuality;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compactQuality ? 1.35 : 1.85));
    this.renderer.setSize(w, h, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !compactQuality;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    // 2. Three.js Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x202d38);
    this.scene.fog = new THREE.FogExp2(0x879092, 0.0003);

    this.camera = new THREE.PerspectiveCamera(54, w / h, 0.1, compactQuality ? 1400 : 8000);
    this.camera.position.set(0, 7, 12);

    // 3. Lighting
    const ambient = new THREE.AmbientLight(0xdce2e1, 0.9);
    this.ambientLight = ambient;
    this.scene.add(ambient);

    const skyLight = new THREE.HemisphereLight(0xbacbd1, 0x414643, 1.25);
    this.skyLight = skyLight;
    this.scene.add(skyLight);

    const sun = new THREE.DirectionalLight(0xffd0a2, 1.75);
    this.sunLight = sun;
    sun.position.set(-112, 88, -42);
    sun.castShadow = !compactQuality;
    sun.shadow.intensity = 0.3;
    sun.shadow.radius = 4;
    sun.shadow.blurSamples = 8;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 520;
    const d = 160;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(sun.target);

    const moon = new THREE.DirectionalLight(0x9aaddb, 0);
    this.moonLight = moon;
    moon.castShadow = false;
    this.scene.add(moon);

    this._buildSky();

    // 4. Cannon-es Physics World
    this.world = new CANNON.World();
    this.world.gravity.set(0, -28, 0);
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;

    // Materials
    this.groundMaterial = new CANNON.Material('ground');
    this.carMaterial = new CANNON.Material('car');
    this.propMaterial = new CANNON.Material('prop');

    const carGroundContact = new CANNON.ContactMaterial(this.carMaterial, this.groundMaterial, {
      friction: 0,
      restitution: 0.1
    });
    const propGroundContact = new CANNON.ContactMaterial(this.propMaterial, this.groundMaterial, {
      friction: 0.4,
      restitution: 0.35
    });
    const carPropContact = new CANNON.ContactMaterial(this.carMaterial, this.propMaterial, {
      friction: 0.3,
      restitution: 0.5
    });

    this.world.addContactMaterial(carGroundContact);
    this.world.addContactMaterial(propGroundContact);
    this.world.addContactMaterial(carPropContact);

    // 5. Build Environment & Obstacles
    this._buildFloor();
    this._buildEnvironment();
    this._buildVehicle();
    this._buildCheckpointGates();
    this._buildSkillsNoticeboard();
    this._buildNavigationLandmarks();
    this._buildRoadSignposts();
    this._buildGarage();
    this._buildWorldLandmarks();
    if (!this.compactQuality) {
      // Keep shadows on major silhouettes, not the small details that dominate the shadow pass.
      this.scene.traverse(object => {
        if (!object.isMesh || !object.castShadow) return;
        if (object.geometry?.type === 'BoxGeometry') {
          const { width, height, depth } = object.geometry.parameters;
          if (Math.max(width, height, depth) <= 3) object.castShadow = false;
        } else if (
          object.geometry?.type === 'CylinderGeometry'
          && object.geometry.parameters.height <= 2.5
        ) {
          object.castShadow = false;
        }
      });
    }
    const trailheadSpawn = new THREE.Vector3(TRAILHEAD_SPAWN.x, 0, TRAILHEAD_SPAWN.z);
    trailheadSpawn.y = this.terrainHeight(trailheadSpawn.x, trailheadSpawn.z);
    this.camera.position.set(
      trailheadSpawn.x - Math.sin(TRAILHEAD_HEADING) * 8,
      trailheadSpawn.y + 7.5,
      trailheadSpawn.z - Math.cos(TRAILHEAD_HEADING) * 8
    );
    this.camera.lookAt(TRAILHEAD.x, trailheadSpawn.y + 1.5, TRAILHEAD.z);
    this.camera.lookAt(TRAILHEAD.x, this.terrainHeight(TRAILHEAD.x, TRAILHEAD.z) + 4.5, TRAILHEAD.z);
    this.bowlingPins = [];
    this.crates = [];

    // 6. LivingWorld — full day/night/weather/wildlife/events system
    this._initLivingWorld();

    // 7. Event Listeners
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._clearControls);
    window.addEventListener('resize', this._onResize);
    this._onVisibilityChange = () => {
      this._clearControls();
      if (!document.hidden && !this.paused) this._scheduleFrame();
    };
    document.addEventListener('visibilitychange', this._onVisibilityChange);
    this.canvas.addEventListener('pointerdown', this._onCanvasPointerDown);
    this.canvas.addEventListener('pointermove', this._onCanvasPointerMove);
    this.canvas.addEventListener('pointerup', this._onCanvasPointerUp);
    this.canvas.addEventListener('pointercancel', this._onCanvasPointerUp);
    this.canvas.addEventListener('wheel', this._onCanvasWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this._onCanvasDoubleClick);

    this.lastFrameTime = performance.now();
    this._animate();
    this._applyBeaconState();
  }

  _buildSky() {
    // Sky is now handled by LivingWorld → SkyRenderer (procedural day/night).
    // We keep a minimal static background as fallback until LivingWorld initialises.
    this.duskSkyColor = new THREE.Color(0x718392);
    this.dawnSkyColor = new THREE.Color(0xffd1a0);
    this.duskFogColor = new THREE.Color(0x697a83);
    this.dawnFogColor = new THREE.Color(0xd1b99a);
  }

  _initLivingWorld() {
    // Collect settlement window meshes for the day/night emissive schedule
    const windowMeshes = [];
    this.scene.traverse(obj => {
      if (obj.isMesh && obj.material &&
          typeof obj.material.emissiveIntensity === 'number' &&
          obj.material.color &&
          (obj.material.color.getHex() === 0xb29b70 || obj.material.color.getHex() === 0xb8c8bc ||
           obj.material.emissive?.getHex() === 0xe0a05b || obj.material.emissive?.getHex() === 0x334d45)) {
        windowMeshes.push(obj);
      }
    });
    this.windowMeshes = windowMeshes;

    this.livingWorld = new LivingWorld(this.scene, this.renderer, this.terrainHeight, this.sampleRiver);
    this.livingWorld.wireScene({
      ambientLight:   this.ambientLight,
      skyLight:       this.skyLight,
      sunLight:       this.sunLight,
      moonLight:      this.moonLight,
      fogRef:         this.scene.fog,
      waystoneLights: this.waystoneLights ?? [],
      windowMeshes,
      headlights:     this.headlights ?? [],
      camera:         this.camera
    });

    // Wire HUD time display if it exists
    const timeEl = document.getElementById('world-time-display');
    if (timeEl) this.livingWorld.wireTimeDisplay(timeEl);
    this._updateLivingWorld(0);
  }

  _loadMaterialTexture(material, property, path, repeat = [1, 1], colorSpace = THREE.NoColorSpace) {
    const texture = new THREE.TextureLoader().load(
      path,
      loadedTexture => {
        if (this.disposed) {
          loadedTexture.dispose();
          return;
        }
        loadedTexture.colorSpace = colorSpace;
        loadedTexture.wrapS = THREE.RepeatWrapping;
        loadedTexture.wrapT = THREE.RepeatWrapping;
        loadedTexture.repeat.set(...repeat);
        loadedTexture.anisotropy = Math.min(16, this.renderer.capabilities.getMaxAnisotropy());
        const previousTexture = material[property];
        material[property] = loadedTexture;
        if (previousTexture && previousTexture !== loadedTexture) previousTexture.dispose();
        material.needsUpdate = true;
      },
      undefined,
      error => console.error(`Unable to load Signal Ridge texture: ${path}`, error)
    );
    texture.colorSpace = colorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    material[property] = texture;
  }

  _attachWindMaterial(material, bendScale) {
    material.onBeforeCompile = shader => {
      shader.uniforms.uWindTime = { value: 0 };
      shader.uniforms.uWindDirection = { value: new THREE.Vector2(1, 0) };
      shader.uniforms.uWindStrength = { value: 0 };
      shader.uniforms.uBendScale = { value: bendScale };
      this.windShaders.push(shader.uniforms);
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nuniform float uWindTime;\nuniform vec2 uWindDirection;\nuniform float uWindStrength;\nuniform float uBendScale;'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        #ifdef USE_INSTANCING
          float windPhase = uWindTime * 1.7 + instanceMatrix[3].x * 0.045
            + instanceMatrix[3].z * 0.05 + position.y * 1.4;
          float windBend = sin(windPhase) * uWindStrength * max(position.y, 0.0) * uBendScale;
          vec3 windViewDirection = mat3(viewMatrix) * vec3(uWindDirection.x, 0.0, uWindDirection.y);
          mvPosition.xyz += windViewDirection * windBend;
          gl_Position = projectionMatrix * mvPosition;
        #endif`
      );
    };
    material.customProgramCacheKey = () => `signal-ridge-wind-${bendScale}`;
  }

  _buildFloor() {
    const textureCanvas = document.createElement('canvas');
    textureCanvas.width = 512;
    textureCanvas.height = 512;
    const textureContext = textureCanvas.getContext('2d');
    textureContext.fillStyle = '#ffffff';
    textureContext.fillRect(0, 0, 512, 512);

    let seed = 947;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 2400; i++) {
      const shade = Math.floor(random() * 26);
      textureContext.fillStyle = `rgba(${46 + shade}, ${54 + shade}, ${37 + shade}, ${0.025 + random() * 0.055})`;
      const size = 1 + random() * 3;
      textureContext.fillRect(random() * 512, random() * 512, size, size);
    }
    for (let i = 0; i < 90; i++) {
      const shade = Math.floor(random() * 22);
      textureContext.fillStyle = i % 3 === 0
        ? `rgba(${105 + shade}, ${81 + shade}, ${54 + shade}, ${0.025 + random() * 0.04})`
        : `rgba(${93 + shade}, ${113 + shade}, ${73 + shade}, ${0.025 + random() * 0.04})`;
      textureContext.beginPath();
      textureContext.ellipse(
        random() * 512,
        random() * 512,
        8 + random() * 30,
        5 + random() * 23,
        random() * Math.PI,
        0,
        Math.PI * 2
      );
      textureContext.fill();
    }

    const groundTexture = new THREE.CanvasTexture(textureCanvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(1, 1);
    groundTexture.colorSpace = THREE.SRGBColorSpace;
    this.groundTexture = groundTexture;

    const boundaryHeight = 900;
    [
      [0, boundaryHeight / 2, -WORLD_DEPTH / 2, WORLD_WIDTH / 2, 0],
      [0, boundaryHeight / 2, WORLD_DEPTH / 2, WORLD_WIDTH / 2, 0],
      [-WORLD_WIDTH / 2, boundaryHeight / 2, 0, WORLD_DEPTH / 2, Math.PI / 2],
      [WORLD_WIDTH / 2, boundaryHeight / 2, 0, WORLD_DEPTH / 2, Math.PI / 2]
    ].forEach(([x, y, z, halfLength, rot]) => {
      const wallShape = new CANNON.Box(new CANNON.Vec3(halfLength, boundaryHeight / 2, 0.5));
      const wallBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      wallBody.addShape(wallShape);
      wallBody.position.set(x, y, z);
      wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rot);
      this.world.addBody(wallBody);
    });

    // Cannon-es Ground Plane
    const groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: this.groundMaterial
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    groundBody.position.y = WORLD_FLOOR_Y;
    this.world.addBody(groundBody);
  }

  _buildEnvironment() {
    const ground = new THREE.Group();
    ground.name = 'landscape-details';
    this.scene.add(ground);
    let sampleRoadSurface = () => null;

    let seed = 719;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    const trailMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4c4a0,
      roughness: 0.98,
      metalness: 0
    });
    const shoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0x514838,
      roughness: 1,
      metalness: 0
    });
    this._loadMaterialTexture(
      trailMaterial,
      'map',
      '/assets/signal-ridge/dirt_aerial_02_diff_2k.jpg',
      [1, 1],
      THREE.SRGBColorSpace
    );
    this._loadMaterialTexture(
      trailMaterial,
      'normalMap',
      '/assets/signal-ridge/dirt_aerial_02_nor_dx_2k.jpg'
    );
    trailMaterial.normalScale.set(0.18, -0.18);
    const addTrail = (points, width, material, y = 0.035, closed = false) => {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([x, z]) => new THREE.Vector3(x, y, z)),
        closed
      );
      const divisions = Math.max(24, points.length * 16);
      const vertices = [];
      const uvs = [];
      const indices = [];
      const samples = curve.getSpacedPoints(divisions);

      samples.forEach((point, index) => {
        const tangent = curve.getTangentAt(index / divisions);
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
        const leftX = point.x - side.x;
        const leftZ = point.z - side.z;
        const rightX = point.x + side.x;
        const rightZ = point.z + side.z;
        const leftRoad = sampleRoadSurface(leftX, leftZ);
        const rightRoad = sampleRoadSurface(rightX, rightZ);
        const leftBlend = leftRoad
          ? 1 - THREE.MathUtils.smoothstep(leftRoad.distance, width * 0.12, width * 0.86)
          : 0;
        const rightBlend = rightRoad
          ? 1 - THREE.MathUtils.smoothstep(rightRoad.distance, width * 0.12, width * 0.86)
          : 0;
        const leftY = THREE.MathUtils.lerp(
          terrainHeight(leftX, leftZ),
          leftRoad?.height ?? terrainHeight(leftX, leftZ),
          leftBlend
        );
        const rightY = THREE.MathUtils.lerp(
          terrainHeight(rightX, rightZ),
          rightRoad?.height ?? terrainHeight(rightX, rightZ),
          rightBlend
        );
        vertices.push(leftX, leftY + y, leftZ);
        vertices.push(rightX, rightY + y, rightZ);
        const alongRoad = (curve.getLength() * index) / divisions;
        const textureScale = 1 / 30;
        uvs.push(0, alongRoad * textureScale, width * textureScale, alongRoad * textureScale);
        if (index < samples.length - 1) {
          const offset = index * 2;
          indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
        }
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.y = 0;
      mesh.receiveShadow = true;
      ground.add(mesh);
      return mesh;
    };

    this.roadCurves = ROAD_DEFINITIONS.map(({ points, closed = false }) => (
      new THREE.CatmullRomCurve3(
        points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
        closed,
        'centripetal'
      )
    ));
    this.courseCurve = this.roadCurves[0];
    const roadSamples = this.roadCurves.flatMap(curve => (
      curve.getSpacedPoints(Math.max(12, Math.ceil(curve.getLength() / 2)))
    ));
    this.drivableSamples = roadSamples.map(({ x, z }) => ({ x, z }));
    const courseBucketSize = 16;
    const courseBuckets = new Map();
    roadSamples.forEach(point => {
      const key = `${Math.floor(point.x / courseBucketSize)}:${Math.floor(point.z / courseBucketSize)}`;
      if (!courseBuckets.has(key)) courseBuckets.set(key, []);
      courseBuckets.get(key).push(point);
    });
    const riverCurve = new THREE.CatmullRomCurve3(
      RIVER_ROUTE.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      'centripetal'
    );
    const riverTerrainSamples = riverCurve.getSpacedPoints(
      Math.max(2, Math.ceil(riverCurve.getLength() / 8))
    );
    const riverBucketSize = 32;
    const riverBuckets = new Map();
    riverTerrainSamples.forEach((point, index) => {
      const key = `${Math.floor(point.x / riverBucketSize)}:${Math.floor(point.z / riverBucketSize)}`;
      if (!riverBuckets.has(key)) riverBuckets.set(key, []);
      riverBuckets.get(key).push({ point, index });
    });
    const nearestRiverSample = (x, z) => {
      const bucketX = Math.floor(x / riverBucketSize);
      const bucketZ = Math.floor(z / riverBucketSize);
      let nearest = null;
      let distance = Infinity;
      let nearestIndex = -1;
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
          const candidates = riverBuckets.get(`${bucketX + offsetX}:${bucketZ + offsetZ}`);
          if (!candidates) continue;
          candidates.forEach(({ point, index }) => {
            const nextDistance = Math.hypot(point.x - x, point.z - z);
            if (nextDistance < distance) {
              nearest = point;
              distance = nextDistance;
              nearestIndex = index;
            }
          });
        }
      }
      return { point: nearest, distance, index: nearestIndex };
    };
    this.riverCurve = riverCurve;
    this.riverTerrainSamples = riverTerrainSamples;
    const isNearCourse = (x, z, radius = 12) => {
      const bucketX = Math.floor(x / courseBucketSize);
      const bucketZ = Math.floor(z / courseBucketSize);
      const reach = Math.ceil(radius / courseBucketSize);
      for (let offsetX = -reach; offsetX <= reach; offsetX += 1) {
        for (let offsetZ = -reach; offsetZ <= reach; offsetZ += 1) {
          const points = courseBuckets.get(`${bucketX + offsetX}:${bucketZ + offsetZ}`);
          if (points?.some(point => Math.hypot(point.x - x, point.z - z) < radius)) return true;
        }
      }
      return false;
    };

    const terrainSegmentsX = this.compactQuality ? 240 : 420;
    const terrainSegmentsZ = this.compactQuality ? 154 : 270;
    const terrainStep = WORLD_WIDTH / terrainSegmentsX;
    const gridWidth = terrainSegmentsZ + 1;
    const terrainIndex = (xIndex, zIndex) => xIndex * gridWidth + zIndex;
    const hashNoise = (x, z) => {
      let value = Math.imul(x, 374761393) ^ Math.imul(z, 668265263);
      value = Math.imul(value ^ (value >>> 13), 1274126177);
      return ((value ^ (value >>> 16)) >>> 0) / 2147483647.5 - 1;
    };
    const valueNoise = (x, z) => {
      const x0 = Math.floor(x);
      const z0 = Math.floor(z);
      const tx = x - x0;
      const tz = z - z0;
      const sx = tx * tx * (3 - 2 * tx);
      const sz = tz * tz * (3 - 2 * tz);
      const top = THREE.MathUtils.lerp(hashNoise(x0, z0), hashNoise(x0 + 1, z0), sx);
      const bottom = THREE.MathUtils.lerp(hashNoise(x0, z0 + 1), hashNoise(x0 + 1, z0 + 1), sx);
      return THREE.MathUtils.lerp(top, bottom, sz);
    };
    const distanceToPolyline = (points, x, z) => {
      let distance = Infinity;
      for (let index = 1; index < points.length; index += 1) {
        const [ax, az] = points[index - 1];
        const [bx, bz] = points[index];
        const dx = bx - ax;
        const dz = bz - az;
        const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
        distance = Math.min(distance, Math.hypot(x - ax - dx * t, z - az - dz * t));
      }
      return distance;
    };
    const northRidge = mapRoute([[540, 15], [620, 20], [700, 8], [790, 34], [900, 26], [1000, 4]]);
    const southRidge = mapRoute([[610, 622], [700, 616], [790, 625], [890, 610], [1000, 630]]);
    const westRidge = mapRoute([[8, -20], [18, 140], [6, 320], [24, 500], [10, 660]]);
    const eastRidge = mapRoute([[992, -20], [980, 140], [994, 320], [976, 500], [990, 660]]);
    const mirrorTarnPosition = mapPosition(630, 250);
    const foothillPeaks = [
      [SIGNAL_PEAK.x, SIGNAL_PEAK.z, 310, 170, 190],
      [HIGH_PASS.x, HIGH_PASS.z, 190, 190, 170],
      [FOSSIL_RIDGE.x, FOSSIL_RIDGE.z, 125, 260, 170],
      ...mapRoute([[730, 78], [820, 88], [930, 72]]).map(([x, z], index) =>
        [x, z, 120 + index * 30, 180, 220]
      )
    ];
    const terrainHeightAt = (x, z) => {
      const broadNoise = valueNoise(x / 360, z / 360);
      const midNoise = valueNoise(x / 130 + 17, z / 130 - 9);
      const detailNoise = valueNoise(x / 38 - 31, z / 38 + 23);
      const farRidges = Math.max(
        Math.exp(-((distanceToPolyline(northRidge, x, z) / 220) ** 2)),
        Math.exp(-((distanceToPolyline(southRidge, x, z) / 200) ** 2))
      );
      const boundaryRidges = Math.max(
        Math.exp(-((distanceToPolyline(westRidge, x, z) / 140) ** 2)),
        Math.exp(-((distanceToPolyline(eastRidge, x, z) / 140) ** 2))
      );
      const lowlandBasin = Math.exp(-(((x - TRAILHEAD.x) / 320) ** 2 + ((z - TRAILHEAD.z) / 240) ** 2));
      const ashenBasin = Math.exp(-(((x - SETTLEMENT.x) / 250) ** 2 + ((z - SETTLEMENT.z) / 200) ** 2));
      const riverValley = Math.exp(-((distanceToPolyline(RIVER_ROUTE, x, z) / 180) ** 2));
      const tarnBasin = Math.exp(-(((x - mirrorTarnPosition.x) / 300) ** 2
        + ((z - mirrorTarnPosition.z) / 200) ** 2));
      let foothills = 0;
      foothillPeaks.forEach(([cx, cz, peak, radiusX, radiusZ]) => {
        foothills += peak * Math.exp(-(((x - cx) / radiusX) ** 2 + ((z - cz) / radiusZ) ** 2));
      });
      return Math.max(0.5, 26 + broadNoise * 34 + midNoise * 14 + detailNoise * 3
        + farRidges * 150 + boundaryRidges * 230 + foothills
        - lowlandBasin * 18 - ashenBasin * 24 - riverValley * 36 - tarnBasin * 18);
    };
    let smoothedHeights = new Float32Array((terrainSegmentsX + 1) * gridWidth);
    for (let xIndex = 0; xIndex <= terrainSegmentsX; xIndex += 1) {
      const x = -WORLD_WIDTH / 2 + xIndex * terrainStep;
      for (let zIndex = 0; zIndex <= terrainSegmentsZ; zIndex += 1) {
        const z = WORLD_DEPTH / 2 - zIndex * terrainStep;
        smoothedHeights[terrainIndex(xIndex, zIndex)] = terrainHeightAt(x, z);
      }
    }
    for (let pass = 0; pass < 3; pass += 1) {
      const filtered = new Float32Array(smoothedHeights.length);
      for (let xIndex = 0; xIndex <= terrainSegmentsX; xIndex += 1) {
        for (let zIndex = 0; zIndex <= terrainSegmentsZ; zIndex += 1) {
          let sum = 0;
          let weight = 0;
          for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
            for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
              const sampleX = THREE.MathUtils.clamp(xIndex + offsetX, 0, terrainSegmentsX);
              const sampleZ = THREE.MathUtils.clamp(zIndex + offsetZ, 0, terrainSegmentsZ);
              const kernelWeight = (offsetX === 0 ? 2 : 1) * (offsetZ === 0 ? 2 : 1);
              sum += smoothedHeights[terrainIndex(sampleX, sampleZ)] * kernelWeight;
              weight += kernelWeight;
            }
          }
          filtered[terrainIndex(xIndex, zIndex)] = sum / weight;
        }
      }
      smoothedHeights = filtered;
    }
    const sampleGrid = (grid, x, z) => {
      const gx = THREE.MathUtils.clamp((x + WORLD_WIDTH / 2) / terrainStep, 0, terrainSegmentsX);
      const gz = THREE.MathUtils.clamp((WORLD_DEPTH / 2 - z) / terrainStep, 0, terrainSegmentsZ);
      const x0 = Math.floor(gx);
      const z0 = Math.floor(gz);
      const x1 = Math.min(terrainSegmentsX, x0 + 1);
      const z1 = Math.min(terrainSegmentsZ, z0 + 1);
      const tx = gx - x0;
      const tz = gz - z0;
      const top = THREE.MathUtils.lerp(
        grid[terrainIndex(x0, z0)],
        grid[terrainIndex(x1, z0)],
        tx
      );
      const bottom = THREE.MathUtils.lerp(
        grid[terrainIndex(x0, z1)],
        grid[terrainIndex(x1, z1)],
        tx
      );
      return THREE.MathUtils.lerp(top, bottom, tz);
    };
    const roadGroups = this.roadCurves.map((curve, index) => {
      const definition = ROAD_DEFINITIONS[index];
      const sampleCount = Math.max(12, Math.ceil(curve.getLength() / 3));
      const samples = curve.getSpacedPoints(sampleCount);
      samples.forEach(point => { point.y = sampleGrid(smoothedHeights, point.x, point.z); });
      for (let pass = 0; pass < 2; pass += 1) {
        for (let sample = 1; sample < samples.length; sample += 1) {
          const previous = samples[sample - 1];
          const current = samples[sample];
          const maxRise = Math.hypot(current.x - previous.x, current.z - previous.z) * 0.095;
          current.y = THREE.MathUtils.clamp(current.y, previous.y - maxRise, previous.y + maxRise);
        }
        for (let sample = samples.length - 2; sample >= 0; sample -= 1) {
          const next = samples[sample + 1];
          const current = samples[sample];
          const maxRise = Math.hypot(next.x - current.x, next.z - current.z) * 0.095;
          current.y = THREE.MathUtils.clamp(current.y, next.y - maxRise, next.y + maxRise);
        }
      }
      return { samples, closed: definition.closed ?? false };
    });
    const roadBuckets = new Map();
    const roadBucketSize = 16;
    roadGroups.forEach(({ samples }) => {
      samples.forEach((point, index) => {
        const key = `${Math.floor(point.x / roadBucketSize)}:${Math.floor(point.z / roadBucketSize)}`;
        if (!roadBuckets.has(key)) roadBuckets.set(key, []);
        roadBuckets.get(key).push({ point, samples, index });
      });
    });
    sampleRoadSurface = (x, z, maxDistance = Infinity) => {
      const bucketX = Math.floor(x / roadBucketSize);
      const bucketZ = Math.floor(z / roadBucketSize);
      let nearest = null;
      let nearestDistance = maxDistance;
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        for (let offsetZ = -1; offsetZ <= 1; offsetZ += 1) {
          const points = roadBuckets.get(`${bucketX + offsetX}:${bucketZ + offsetZ}`);
          if (!points) continue;
          for (const candidate of points) {
            const { samples, index } = candidate;
            for (const segmentIndex of [index - 1, index]) {
              if (segmentIndex < 0 || segmentIndex >= samples.length - 1) continue;
              const start = samples[segmentIndex];
              const end = samples[segmentIndex + 1];
              const dx = end.x - start.x;
              const dz = end.z - start.z;
              const lengthSquared = dx * dx + dz * dz;
              const progress = lengthSquared > 0
                ? THREE.MathUtils.clamp(((x - start.x) * dx + (z - start.z) * dz) / lengthSquared, 0, 1)
                : 0;
              const roadX = start.x + dx * progress;
              const roadZ = start.z + dz * progress;
              const distance = Math.hypot(roadX - x, roadZ - z);
              if (distance < nearestDistance) {
                nearest = {
                  x: roadX,
                  z: roadZ,
                  height: THREE.MathUtils.lerp(start.y, end.y, progress),
                  directionX: dx,
                  directionZ: dz,
                  distance
                };
                nearestDistance = distance;
              }
            }
          }
        }
      }
      return nearest;
    };
    this.sampleRoadSurface = sampleRoadSurface;
    const roadHeightAt = (x, z, baseHeight) => {
      const nearest = sampleRoadSurface(x, z, 48);
      const influence = nearest ? 1 - THREE.MathUtils.smoothstep(nearest.distance, 8, 42) : 0;
      return THREE.MathUtils.lerp(baseHeight, nearest?.height ?? baseHeight, influence);
    };
    const finalHeights = new Float32Array(smoothedHeights.length);
    const riverDistances = new Float32Array(smoothedHeights.length);
    const settlementHeight = sampleGrid(smoothedHeights, SETTLEMENT.x, SETTLEMENT.z);
    for (let xIndex = 0; xIndex <= terrainSegmentsX; xIndex += 1) {
      const x = -WORLD_WIDTH / 2 + xIndex * terrainStep;
      for (let zIndex = 0; zIndex <= terrainSegmentsZ; zIndex += 1) {
        const z = WORLD_DEPTH / 2 - zIndex * terrainStep;
        const index = terrainIndex(xIndex, zIndex);
        const baseHeight = smoothedHeights[index];
        const roadHeight = roadHeightAt(x, z, baseHeight);
        const settlementDistance = Math.hypot(x - SETTLEMENT.x, z - SETTLEMENT.z);
        const settlementBlend = 1 - THREE.MathUtils.smoothstep(settlementDistance, 34, 108);
        const gradedHeight = THREE.MathUtils.lerp(roadHeight, settlementHeight, settlementBlend);
        const river = nearestRiverSample(x, z);
        const channel = 1 - THREE.MathUtils.smoothstep(river.distance, 8, 52);
        finalHeights[index] = gradedHeight - channel * 3.4;
        riverDistances[index] = river.distance;
      }
    }
    const terrainHeight = (x, z) => sampleGrid(finalHeights, x, z);
    this.terrainHeight = terrainHeight;
    const riverDepthAt = (x, z) => {
      const fordDistance = Math.hypot(x - FORD.x, z - FORD.z);
      const fordBlend = 1 - THREE.MathUtils.smoothstep(fordDistance, 3, 12);
      return THREE.MathUtils.lerp(0.95, 0.38, fordBlend);
    };
    this.sampleRiver = (x, z) => {
      const nearest = nearestRiverSample(x, z);
      if (!nearest.point) return null;
      const progress = nearest.index / (riverTerrainSamples.length - 1);
      const tangent = riverCurve.getTangentAt(progress);
      return {
        distance: nearest.distance,
        surfaceY: terrainHeight(nearest.point.x, nearest.point.z)
          + riverDepthAt(nearest.point.x, nearest.point.z),
        directionX: tangent.x,
        directionZ: tangent.z
      };
    };
    this.riverDepthAt = riverDepthAt;

    const terrainGeometry = new THREE.BufferGeometry();
    const terrainPositions = [];
    const terrainIndices = [];
    const terrainUvs = [];
    const terrainColors = [];
    const lowlandColor = new THREE.Color(0x9da76a);
    const riverlandColor = new THREE.Color(0x63775b);
    const ashenColor = new THREE.Color(0x777268);
    const fossilColor = new THREE.Color(0xb4936e);
    const alpineColor = new THREE.Color(0xb2b7b4);
    const rockColor = new THREE.Color(0xbcb7ab);
    const riverbankColor = new THREE.Color(0x8d9c88);
    const terrainColor = new THREE.Color();
    const weightedColor = new THREE.Color();
    for (let xIndex = 0; xIndex <= terrainSegmentsX; xIndex += 1) {
      for (let zIndex = 0; zIndex <= terrainSegmentsZ; zIndex += 1) {
        const x = -WORLD_WIDTH / 2 + xIndex * terrainStep;
        const z = WORLD_DEPTH / 2 - zIndex * terrainStep;
        const index = terrainIndex(xIndex, zIndex);
        const height = finalHeights[index];
        terrainPositions.push(x, height - 0.08, z);
        terrainUvs.push(x / 15, z / 15);
        const leftHeight = finalHeights[terrainIndex(Math.max(0, xIndex - 1), zIndex)];
        const rightHeight = finalHeights[terrainIndex(Math.min(terrainSegmentsX, xIndex + 1), zIndex)];
        const nearHeight = finalHeights[terrainIndex(xIndex, Math.max(0, zIndex - 1))];
        const farHeight = finalHeights[terrainIndex(xIndex, Math.min(terrainSegmentsZ, zIndex + 1))];
        const slope = Math.hypot(
          (rightHeight - leftHeight) / (2 * terrainStep),
          (farHeight - nearHeight) / (2 * terrainStep)
        );
        const regionWeights = [
          [lowlandColor, Math.exp(-(((x - TRAILHEAD.x) / 125) ** 2 + ((z - TRAILHEAD.z) / 92) ** 2))],
          [riverlandColor, Math.exp(-((riverDistances[index] / 170) ** 2)) * 0.88],
          [ashenColor, Math.exp(-(((x - SETTLEMENT.x) / 88) ** 2 + ((z - SETTLEMENT.z) / 72) ** 2))],
          [fossilColor, Math.exp(-(((x - FOSSIL_RIDGE.x) / 96) ** 2 + ((z - FOSSIL_RIDGE.z) / 70) ** 2))],
          [alpineColor, Math.exp(-(((x - SIGNAL_PEAK.x) / 94) ** 2 + ((z - SIGNAL_PEAK.z) / 96) ** 2))],
          [alpineColor, Math.exp(-(((x - HIGH_PASS.x) / 82) ** 2 + ((z - HIGH_PASS.z) / 72) ** 2)) * 0.82]
        ];
        let totalWeight = 0;
        terrainColor.setRGB(0, 0, 0);
        regionWeights.forEach(([color, weight]) => {
          terrainColor.add(weightedColor.copy(color).multiplyScalar(weight));
          totalWeight += weight;
        });
        if (totalWeight < 1) {
          terrainColor.add(weightedColor.copy(lowlandColor).multiplyScalar(1 - totalWeight));
          totalWeight = 1;
        }
        terrainColor.multiplyScalar(1 / totalWeight);
        terrainColor.lerp(rockColor, THREE.MathUtils.smoothstep(slope, 0.18, 0.62) * 0.72);
        terrainColor.lerp(riverbankColor, (1 - THREE.MathUtils.smoothstep(riverDistances[index], 12, 80)) * 0.3);
        terrainColor.multiplyScalar(1.08 + hashNoise(Math.floor(x / 22), Math.floor(z / 22)) * 0.12);
        terrainColors.push(terrainColor.r, terrainColor.g, terrainColor.b);

        if (xIndex < terrainSegmentsX && zIndex < terrainSegmentsZ) {
          const vertex = xIndex * gridWidth + zIndex;
          terrainIndices.push(
            vertex, vertex + gridWidth, vertex + 1,
            vertex + gridWidth, vertex + gridWidth + 1, vertex + 1
          );
        }
      }
    }
    terrainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(terrainPositions, 3));
    terrainGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(terrainUvs, 2));
    terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(terrainColors, 3));
    terrainGeometry.setIndex(terrainIndices);
    terrainGeometry.computeVertexNormals();
    const terrainMaterial = new THREE.MeshStandardMaterial({
      map: this.groundTexture,
      color: 0xffffff,
      vertexColors: true,
      roughness: 1,
      metalness: 0
    });
    this._loadMaterialTexture(
      terrainMaterial,
      'map',
      '/assets/signal-ridge/aerial_grass_rock_diff_2k.jpg',
      [1, 1],
      THREE.SRGBColorSpace
    );
    this._loadMaterialTexture(
      terrainMaterial,
      'normalMap',
      '/assets/signal-ridge/aerial_grass_rock_nor_dx_1k.jpg'
    );
    terrainMaterial.normalScale.set(0.28, -0.28);
    this.terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    this.terrainMesh.receiveShadow = true;
    ground.add(this.terrainMesh);

    const terrainBody = new CANNON.Body({
      mass: 0,
      material: this.groundMaterial,
      position: new CANNON.Vec3(-WORLD_WIDTH / 2, 0, WORLD_DEPTH / 2)
    });
    terrainBody.addShape(
      new CANNON.Heightfield(Array.from({ length: terrainSegmentsX + 1 }, (_, xIndex) =>
        Array.from({ length: terrainSegmentsZ + 1 }, (_, zIndex) =>
          finalHeights[terrainIndex(xIndex, zIndex)]
        )
      ), { elementSize: terrainStep }),
      new CANNON.Vec3(0, 0, 0),
      new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0)
    );
    terrainBody.collisionFilterGroup = TERRAIN_COLLISION_GROUP;
    this.world.addBody(terrainBody);

    this.roadGlowMeshes = [];
    ROAD_DEFINITIONS.forEach(definition => {
      const { points, closed, from, to } = definition;
      const roadWidth = definition.kind === 'pass' ? 6.2 : 4.8;
      addTrail(points, roadWidth + 1.8, shoulderMaterial, 0.026, closed);
      addTrail(points, roadWidth, trailMaterial, 0.052, closed);
      if (/^[1-6]$/.test(String(from)) && /^[1-6]$/.test(String(to))) {
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xffb45f,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        const glow = addTrail(points, 2.5, glowMaterial, 0.18, closed);
        glow.visible = false;
        this.roadGlowMeshes.push({ from: String(from), to: String(to), mesh: glow });
      }
    });

    const addTrailJunction = (centerX, centerZ, radius) => {
      const segments = 32;
      const positions = [centerX, terrainHeight(centerX, centerZ) + 0.07, centerZ];
      const uvs = [centerX / 30, centerZ / 30];
      const indices = [];
      for (let segment = 0; segment < segments; segment += 1) {
        const angle = (segment / segments) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const z = centerZ + Math.sin(angle) * radius;
        positions.push(x, terrainHeight(x, z) + 0.07, z);
        uvs.push(x / 30, z / 30);
        const next = (segment + 1) % segments;
        indices.push(0, next + 1, segment + 1);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const apron = new THREE.Mesh(geometry, trailMaterial);
      apron.receiveShadow = true;
      ground.add(apron);
    };
    addTrailJunction(TRAILHEAD.x, TRAILHEAD.z, 7);
    addTrailJunction(SETTLEMENT.x, SETTLEMENT.z, 6);

    const grassMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 1,
      flatShading: true
    });
    this._attachWindMaterial(grassMaterial, 0.18);
    const bladePositions = [];
    const bladeIndices = [];
    [0, Math.PI / 3, (Math.PI * 2) / 3].forEach((angle, index) => {
      const base = index * 3;
      const sideX = Math.cos(angle) * 0.075;
      const sideZ = Math.sin(angle) * 0.075;
      const leanX = Math.cos(angle + 0.8) * 0.12;
      const leanZ = Math.sin(angle + 0.8) * 0.12;
      bladePositions.push(
        -sideX, 0, -sideZ,
        sideX, 0, sideZ,
        leanX, 1, leanZ
      );
      bladeIndices.push(base, base + 1, base + 2);
    });
    const bladeGeometry = new THREE.BufferGeometry();
    bladeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bladePositions, 3));
    bladeGeometry.setIndex(bladeIndices);
    bladeGeometry.computeVertexNormals();
    grassMaterial.side = THREE.DoubleSide;
    const maxGrass = this.compactQuality ? 4000 : 10000;
    const grass = new THREE.InstancedMesh(bladeGeometry, grassMaterial, maxGrass);
    const dummy = new THREE.Object3D();
    const bladeColor = new THREE.Color();
    let grassCount = 0;
    for (let attempt = 0; attempt < maxGrass * 2.4 && grassCount < maxGrass; attempt += 1) {
      let x;
      let z;
      const region = random();
      if (region < 0.38) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random()) * 280;
        x = TRAILHEAD.x + Math.cos(angle) * radius;
        z = TRAILHEAD.z + Math.sin(angle) * radius;
      } else if (region < 0.84) {
        const riverIndex = Math.floor(random() * riverTerrainSamples.length);
        const point = riverTerrainSamples[riverIndex];
        const next = riverTerrainSamples[Math.min(riverTerrainSamples.length - 1, riverIndex + 1)];
        const tangentLength = Math.hypot(next.x - point.x, next.z - point.z) || 1;
        const offset = (random() - 0.5) * 170;
        x = point.x + ((next.z - point.z) / tangentLength) * offset;
        z = point.z - ((next.x - point.x) / tangentLength) * offset;
      } else {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(random()) * 180;
        x = SETTLEMENT.x + Math.cos(angle) * radius;
        z = SETTLEMENT.z + Math.sin(angle) * radius;
      }
      const nearRiver = nearestRiverSample(x, z).distance;
      const nearDestination = WORLD_DESTINATIONS.some(destination =>
        Math.hypot(x - destination.x, z - destination.z) < 16
      );
      const elevation = terrainHeight(x, z);
      const inMeadow = Math.hypot(x - TRAILHEAD.x, z - TRAILHEAD.z) < 280
        || nearRiver < 85
        || (Math.hypot(x - SETTLEMENT.x, z - SETTLEMENT.z) < 180 && random() < 0.24);
      const slope = Math.hypot(
        terrainHeight(x + 2, z) - elevation,
        terrainHeight(x, z + 2) - elevation
      );
      if (!inMeadow || nearDestination || isNearCourse(x, z, 7) || slope > 2.8 || random() < 0.35) continue;

      const scale = 0.35 + random() * 0.45;
      dummy.position.set(x, elevation + 0.02, z);
      dummy.rotation.y = random() * Math.PI;
      dummy.scale.set(0.8 + random() * 0.8, scale, 0.8 + random() * 0.8);
      dummy.updateMatrix();
      grass.setMatrixAt(grassCount++, dummy.matrix);
      bladeColor.setHSL(0.22 + random() * 0.04, 0.38 + random() * 0.2, 0.28 + random() * 0.14);
      grass.setColorAt(grassCount - 1, bladeColor);
    }
    grass.count = grassCount;
    grass.instanceMatrix.needsUpdate = true;
    if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
    grass.receiveShadow = true;
    ground.add(grass);

    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x71604d, roughness: 1 });
    const foliageMaterials = [
      new THREE.MeshStandardMaterial({ color: 0x4e7158, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0x68825b, roughness: 1, flatShading: true }),
      new THREE.MeshStandardMaterial({ color: 0xa1946d, roughness: 1, flatShading: true })
    ];
    foliageMaterials.forEach(material => this._attachWindMaterial(material, 0.035));
    const trunkGeometry = new THREE.CylinderGeometry(0.16, 0.3, 3.8, 7);
    const createPineGeometry = variant => {
      const profiles = [
        [
          [0.35, 0.42], [0.75, 1.18], [1.02, 0.76], [1.34, 1.42],
          [1.68, 1.05], [1.98, 1.26], [2.31, 0.84], [2.6, 1.08],
          [2.91, 0.66], [3.18, 0.83], [3.51, 0.46], [3.84, 0.52], [4.42, 0.03]
        ],
        [
          [0.3, 0.58], [0.72, 1.34], [1.12, 1.12], [1.48, 1.58],
          [1.86, 1.27], [2.2, 1.42], [2.56, 1.12], [2.91, 1.23],
          [3.27, 0.92], [3.62, 0.94], [3.98, 0.6], [4.46, 0.03]
        ],
        [
          [0.28, 0.68], [0.64, 1.42], [0.94, 1.04], [1.27, 1.67],
          [1.62, 1.2], [1.94, 1.48], [2.28, 1.02], [2.61, 1.26],
          [2.94, 0.74], [3.27, 0.94], [3.62, 0.42], [4.02, 0.03]
        ]
      ];
      const profile = profiles[variant];
      const radialSegments = 7;
      const positions = [];
      const indices = [];
      profile.forEach(([y, radius], level) => {
        for (let segment = 0; segment < radialSegments; segment += 1) {
          const angle = (segment / radialSegments) * Math.PI * 2;
          const branchVariation = 0.82
            + 0.13 * Math.sin(angle * 3 + variant * 1.7)
            + 0.08 * Math.cos(angle * 5 + level * 0.7 + variant);
          const levelVariation = 0.9 + 0.1 * Math.sin(level * 1.3 + variant);
          const variedRadius = radius * branchVariation * levelVariation;
          const branchSweep = level > 1 && level < profile.length - 1
            ? Math.sin(angle * 2 + variant + level * 0.35) * 0.16
            : 0;
          positions.push(
            Math.cos(angle) * variedRadius,
            y + branchSweep,
            Math.sin(angle) * variedRadius
          );
          if (level < profile.length - 1) {
            const current = level * radialSegments + segment;
            const next = level * radialSegments + (segment + 1) % radialSegments;
            const upper = current + radialSegments;
            const upperNext = next + radialSegments;
            indices.push(current, next, upper, next, upperNext, upper);
          }
        }
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    };
    const crownGeometries = [createPineGeometry(0), createPineGeometry(1), createPineGeometry(2)];

    const forestRegions = [
      [mapPosition(300, 82), 42],
      [mapPosition(265, 180), 35],
      [mapPosition(205, 180), 24],
      [mapPosition(290, 225), 33],
      [mapPosition(795, 250), 31],
      [mapPosition(720, 525), 34],
      [mapPosition(910, 75), 29],
      [mapPosition(180, 400), 24]
    ].map(([position, radius]) => [position.x, position.z, radius]);
    const grovePositions = [];
    for (let index = 0; index < 4800; index += 1) {
      const [centerX, centerZ, radius] = forestRegions[Math.floor(random() * forestRegions.length)];
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * radius;
      const x = centerX + Math.cos(angle) * distance;
      const z = centerZ + Math.sin(angle) * distance;
      const nearGarage = Math.hypot(x - GARAGE_POSITION.x, z - GARAGE_POSITION.z) < 28;
      const nearDestination = WORLD_DESTINATIONS.some(destination =>
        Math.hypot(x - destination.x, z - destination.z) < 22
      );
      if (
        !nearGarage
        && !nearDestination
        && !isNearCourse(x, z, 14)
        && random() > (this.compactQuality ? 0.9 : 0.55)
      ) {
        grovePositions.push([x, z]);
      }
    }
    const treeData = grovePositions
      .filter(([x, z]) => !isNearCourse(x, z, 8))
      .map(([x, z]) => ({
        x: x + (random() - 0.5) * 4,
        z: z + (random() - 0.5) * 4,
        rotation: random() * Math.PI,
        scale: 2.8 + random() * 1.4,
        groundY: terrainHeight(x, z),
        color: Math.floor(random() * foliageMaterials.length),
        species: Math.floor(random() * crownGeometries.length)
      }));
    const treeTrunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, treeData.length);
    treeTrunks.castShadow = false;
    const treeCrowns = crownGeometries.map((geometry, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.94
      });
      const crowns = new THREE.InstancedMesh(geometry, material, treeData.length);
      crowns.castShadow = false;
      let crownIndex = 0;
      treeData.forEach((tree, treeIndex) => {
        if (tree.species !== index) return;
        const transform = new THREE.Object3D();
        transform.position.set(tree.x, tree.groundY + 0.35 * tree.scale, tree.z);
        transform.rotation.y = tree.rotation;
        transform.scale.set(tree.scale * 0.92, tree.scale, tree.scale * 0.92);
        transform.updateMatrix();
        crowns.setMatrixAt(crownIndex, transform.matrix);
        crowns.setColorAt(crownIndex, foliageMaterials[tree.color].color);
        crownIndex += 1;
      });
      crowns.count = crownIndex;
      crowns.instanceMatrix.needsUpdate = true;
      if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
      ground.add(crowns);
      return crowns;
    });
    const treeTransform = new THREE.Object3D();
    treeData.forEach((tree, index) => {
      treeTransform.position.set(tree.x, tree.groundY + 1.9 * tree.scale, tree.z);
      treeTransform.rotation.y = tree.rotation;
      treeTransform.scale.setScalar(tree.scale);
      treeTransform.updateMatrix();
      treeTrunks.setMatrixAt(index, treeTransform.matrix);

      if (
        Math.hypot(tree.x - TRAILHEAD.x, tree.z - TRAILHEAD.z) < 300
        || Math.hypot(tree.x - SETTLEMENT.x, tree.z - SETTLEMENT.z) < 170
        || (isNearCourse(tree.x, tree.z, 25) && index % 3 === 0)
      ) {
        const trunkBody = new CANNON.Body({
          mass: 0,
          material: this.propMaterial,
          position: new CANNON.Vec3(tree.x, tree.groundY + 1.6 * tree.scale, tree.z)
        });
        trunkBody.addShape(new CANNON.Cylinder(
          0.34 * tree.scale,
          0.42 * tree.scale,
          3.2 * tree.scale,
          7
        ));
        this.world.addBody(trunkBody);
      }
    });
    treeTrunks.instanceMatrix.needsUpdate = true;
    ground.add(treeTrunks);
    this.treeCrowns = treeCrowns;

    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    const stoneGeometry = new THREE.DodecahedronGeometry(1, 0);
    const stones = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, this.compactQuality ? 50 : 100);
    stones.castShadow = true;
    stones.receiveShadow = true;
    const stoneTransform = new THREE.Object3D();
    const stonePalette = [0x77766b, 0x89806c, 0x62695e, 0x8a8878].map(color => new THREE.Color(color));
    let stoneCount = 0;
    const maxStones = this.compactQuality ? 50 : 100;
    for (let i = 0; i < 520 && stoneCount < maxStones; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 48 + random() * 212;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const nearDestination = WORLD_DESTINATIONS.some(destination =>
        Math.hypot(x - destination.x, z - destination.z) < 17
      );
      const nearGarage = Math.hypot(x - GARAGE_POSITION.x, z - GARAGE_POSITION.z) < 22;
      if (nearDestination || nearGarage || isNearCourse(x, z, 9) || random() < 0.34) continue;

      const scale = 0.4 + random() * 1.1;
      const groundY = terrainHeight(x, z);
      stoneTransform.position.set(x, groundY + scale * 0.28, z);
      stoneTransform.rotation.set(random() * 0.35, random() * Math.PI * 2, random() * 0.35);
      stoneTransform.scale.set(scale, scale * (0.45 + random() * 0.45), scale * (0.8 + random() * 0.35));
      stoneTransform.updateMatrix();
      stones.setMatrixAt(stoneCount, stoneTransform.matrix);
      stones.setColorAt(stoneCount, stonePalette[Math.floor(random() * stonePalette.length)]);
      stoneCount += 1;

      if (Math.hypot(x, z) < 205) {
        const stoneBody = new CANNON.Body({
          mass: 0,
          material: this.propMaterial,
          position: new CANNON.Vec3(x, groundY + scale * 0.22, z)
        });
        stoneBody.addShape(new CANNON.Sphere(Math.max(0.45, scale * 0.58)));
        this.world.addBody(stoneBody);
      }
    }
    stones.count = stoneCount;
    stones.instanceMatrix.needsUpdate = true;
    if (stones.instanceColor) stones.instanceColor.needsUpdate = true;
    ground.add(stones);

    const waystoneMaterial = new THREE.MeshStandardMaterial({ color: 0x62635c, roughness: 0.98 });
    const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffc781 });
    this.waystoneLights = [];
    WORLD_DESTINATIONS.forEach(({ x: destinationX, z: destinationZ }, index) => {
      const x = index === 0
        ? destinationX - Math.cos(TRAILHEAD_HEADING) * 20
        : destinationX + (index % 2 ? 7 : -7);
      const z = index === 0
        ? destinationZ + Math.sin(TRAILHEAD_HEADING) * 20
        : destinationZ + 10;
      const baseY = terrainHeight(x, z);
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.2, 2.7, 6), waystoneMaterial);
      stone.position.set(x, baseY + 1.35, z);
      stone.rotation.y = index * 0.37;
      stone.castShadow = true;
      stone.receiveShadow = true;
      ground.add(stone);

      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.88, 0.13), flameMaterial);
      rune.position.set(x, baseY + 2.3, z + 0.62);
      ground.add(rune);

      const light = new THREE.PointLight(0xffb66d, 1.25, 20, 2);
      light.position.set(x, baseY + 2.9, z);
      ground.add(light);
      this.waystoneLights.push({ light, phase: index * 1.17 });
    });

  }

  _buildVillage() {
    const wallMaterials = [0xb69a78, 0x9d9b83, 0x81958c, 0xa77e6c].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true })
    );
    const roofMaterials = [0x584b42, 0x46584d, 0x615560].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.82, flatShading: true })
    );
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x60452f, roughness: 0.92 });
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c8bc,
      emissive: 0x334d45,
      emissiveIntensity: 0.22,
      roughness: 0.24,
      metalness: 0.12
    });
    const housePositions = Array.from({ length: 12 }, (_, index) => {
      const angle = (index / 12) * Math.PI * 2;
      return [Math.cos(angle) * 23, Math.sin(angle) * 19];
    });

    housePositions.forEach(([x, z], index) => {
      const house = new THREE.Group();
      const walls = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.2, 4.2), wallMaterials[index % wallMaterials.length]);
      walls.position.y = 1.65;
      walls.castShadow = true;
      walls.receiveShadow = true;
      house.add(walls);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(3.7, 2.7, 4), roofMaterials[index % roofMaterials.length]);
      roof.position.y = 4.55;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      house.add(roof);

      const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.12), doorMaterial);
      door.position.set(0, 0.92, 2.16);
      house.add(door);
      [-1.25, 1.25].forEach(windowX => {
        const window = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.75, 0.14), windowMaterial);
        window.position.set(windowX, 2, 2.18);
        house.add(window);
      });

      house.position.set(SETTLEMENT.x + x, this.terrainHeight(SETTLEMENT.x + x, SETTLEMENT.z + z), SETTLEMENT.z + z);
      house.rotation.y = (index % 3) * Math.PI / 2;
      this.scene.add(house);
    });
  }

  _buildVehicle() {
    this.carGroup = new THREE.Group();
    this.carVisual = new THREE.Group();
    this.carGroup.add(this.carVisual);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x53645b,
      roughness: 0.62,
      metalness: 0.18
    });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x343d39, roughness: 0.52, metalness: 0.58 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x49636a,
      roughness: 0.16,
      metalness: 0.18,
      emissive: 0x101d20,
      emissiveIntensity: 0.18,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const alloyMat = new THREE.MeshStandardMaterial({ color: 0xc2a878, roughness: 0.34, metalness: 0.78 });
    this.carPaintMaterial = bodyMat;
    this.alloyMaterial = alloyMat;

    const addBox = (size, position, material, rotation = [0, 0, 0]) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.carVisual.add(mesh);
      return mesh;
    };
    const createLoftGeometry = sections => {
      const positions = [];
      const indices = [];
      sections.forEach(([z, lowerWidth, lowerY, upperWidth, upperY]) => {
        positions.push(
          -lowerWidth / 2, lowerY, z,
          lowerWidth / 2, lowerY, z,
          upperWidth / 2, upperY, z,
          -upperWidth / 2, upperY, z
        );
      });
      for (let section = 0; section < sections.length - 1; section += 1) {
        for (let edge = 0; edge < 4; edge += 1) {
          const a = section * 4 + edge;
          const b = section * 4 + (edge + 1) % 4;
          const c = (section + 1) * 4 + (edge + 1) % 4;
          const d = (section + 1) * 4 + edge;
          indices.push(a, b, d, b, c, d);
        }
      }
      const last = (sections.length - 1) * 4;
      indices.push(3, 2, 1, 3, 1, 0, last, last + 1, last + 2, last, last + 2, last + 3);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      return geometry;
    };
    const addPanel = vertices => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
      geometry.setIndex([0, 1, 2, 0, 2, 3]);
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, glassMat);
      this.carVisual.add(mesh);
    };

    const chassisProfile = new THREE.Shape();
    chassisProfile.moveTo(-2.05, -0.08);
    chassisProfile.lineTo(-1.84, -0.08);
    chassisProfile.absarc(-1.29, -0.08, 0.55, Math.PI, 0, true);
    chassisProfile.lineTo(0.74, -0.08);
    chassisProfile.absarc(1.29, -0.08, 0.55, Math.PI, 0, true);
    chassisProfile.lineTo(2.05, 0.04);
    chassisProfile.lineTo(2.04, 0.27);
    chassisProfile.lineTo(0.78, 0.39);
    chassisProfile.lineTo(-1.14, 0.39);
    chassisProfile.lineTo(-1.98, 0.25);
    chassisProfile.closePath();
    const chassisGeometry = new THREE.ExtrudeGeometry(chassisProfile, {
      depth: 2.04,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.045,
      bevelThickness: 0.045,
      steps: 1,
    });
    chassisGeometry.rotateY(-Math.PI / 2);
    chassisGeometry.translate(1.02, 0, 0);
    const chassis = new THREE.Mesh(chassisGeometry, bodyMat);
    chassis.castShadow = true;
    chassis.receiveShadow = false;
    this.carVisual.add(chassis);
    const hood = new THREE.Mesh(createLoftGeometry([
      [0.34, 1.72, 0.27, 1.76, 0.64],
      [0.92, 1.86, 0.25, 1.88, 0.61],
      [1.52, 1.78, 0.19, 1.72, 0.49],
      [1.98, 1.48, 0.13, 1.43, 0.3]
    ]), bodyMat);
    hood.castShadow = true;
    hood.receiveShadow = true;
    this.carVisual.add(hood);
    [-0.53, 0.53].forEach(side => {
      addBox([0.1, 0.035, 0.68], [side, 0.65, 1.1], trimMat);
      addBox([0.06, 0.24, 0.12], [side * 0.96, 0.58, 1.67], trimMat);
    });
    addBox([1.94, 0.24, 3.7], [0, -0.17, -0.02], trimMat);
    [-1, 1].forEach(side => {
      addBox([0.12, 0.2, 2.45], [side * 1.03, -0.02, -0.05], trimMat);
      addBox([0.045, 0.035, 2.05], [side * 1.091, 0.12, -0.02], alloyMat);
    });

    const cabin = new THREE.Mesh(createLoftGeometry([
      [-1.12, 1.76, 0.3, 1.5, 0.9],
      [-0.7, 1.82, 0.34, 1.34, 1.32],
      [0.12, 1.84, 0.35, 1.32, 1.32],
      [0.9, 1.84, 0.3, 1.68, 0.72]
    ]), bodyMat);
    cabin.castShadow = true;
    this.carVisual.add(cabin);
    addPanel([
      [-0.82, 0.48, 1.02], [0.82, 0.48, 1.02],
      [0.62, 1.15, 0.42], [-0.62, 1.15, 0.42]
    ]);
    addPanel([
      [-0.7, 0.48, -1.05], [0.7, 0.48, -1.05],
      [0.61, 1.14, -0.78], [-0.61, 1.14, -0.78]
    ]);
    [-1, 1].forEach(side => {
      addPanel([
        [side * 0.91, 0.46, -0.91], [side * 0.91, 0.47, 0.69],
        [side * 0.7, 1.16, 0.18], [side * 0.7, 1.16, -0.62]
      ]);
      addBox([0.22, 0.07, 0.08], [side * 1.02, 0.55, -0.28], alloyMat);
      addBox([0.2, 0.13, 0.24], [side * 1.02, 0.78, 0.14], trimMat);
      addBox([0.28, 0.13, 0.22], [side * 1.14, 0.8, 0.16], bodyMat);
    });
    addBox([1.35, 0.1, 1.2], [0, 1.34, -0.3], bodyMat);
    [-0.5, 0.5].forEach(x => addBox([0.07, 0.08, 1.34], [x, 1.4, -0.3], trimMat));

    const headlampMat = new THREE.MeshStandardMaterial({
      color: 0xffe2ae,
      emissive: 0xffb85c,
      emissiveIntensity: 1.4,
      roughness: 0.22
    });
    const tailLampMat = new THREE.MeshStandardMaterial({
      color: 0x8d3025,
      emissive: 0xd03e2c,
      emissiveIntensity: 0.45,
      roughness: 0.3
    });
    this.headlights = [];
    [-0.68, 0.68].forEach(xOffset => {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), headlampMat);
      lens.scale.set(1.08, 0.72, 0.42);
      lens.position.set(xOffset, 0.17, 2.13);
      this.carVisual.add(lens);
      addBox([0.38, 0.19, 0.08], [xOffset, 0.17, -2.08], tailLampMat);
      addBox([0.12, 0.1, 0.08], [xOffset, -0.02, 2.17], headlampMat);

      const spot = new THREE.SpotLight(0xffd7a0, 1.7, 24, Math.PI / 7, 0.48, 1.4);
      spot.position.set(xOffset, 0.16, 2.1);
      spot.target.position.set(xOffset, 0, 20);
      this.carVisual.add(spot);
      this.carVisual.add(spot.target);
      this.headlights.push(spot);
    });
    addBox([0.78, 0.4, 0.08], [0, -0.01, 2.17], trimMat);
    for (let bar = -3; bar <= 3; bar += 1) {
      addBox([0.035, 0.28, 0.035], [bar * 0.095, -0.01, 2.22], trimMat);
    }
    addBox([2.08, 0.09, 0.14], [0, -0.28, 2.12], trimMat);
    addBox([2.04, 0.09, 0.14], [0, -0.27, -2.04], trimMat);
    [-0.5, 0.5].forEach(x => addBox([0.06, 0.34, 0.04], [x, 0.13, 1.58], trimMat));

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141817, roughness: 0.88, metalness: 0.04 });
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x222725, roughness: 0.96, metalness: 0.02 });
    const fenderMat = new THREE.MeshStandardMaterial({ color: 0x26302d, roughness: 0.58, metalness: 0.35 });
    const treadGeometry = new THREE.BoxGeometry(0.28, 0.095, 0.17);
    const spokeGeometry = new THREE.BoxGeometry(0.055, 0.29, 0.075);
    const tyreBandGeometry = new THREE.TorusGeometry(0.37, 0.018, 6, 24);

    this.wheels = [];
    const wheelOffsets = [
      { x: -1.06, z: 1.29, isFront: true },
      { x: 1.06, z: 1.29, isFront: true },
      { x: -1.06, z: -1.29, isFront: false },
      { x: 1.06, z: -1.29, isFront: false }
    ];

    wheelOffsets.forEach(({ x, z, isFront }) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0, z);

      const wheelGeo = new THREE.CylinderGeometry(0.47, 0.47, 0.4, 24, 1);
      wheelGeo.rotateZ(Math.PI / 2);
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.castShadow = true;
      wMesh.receiveShadow = true;
      const treadMesh = new THREE.InstancedMesh(treadGeometry, treadMat, 12);
      const treadTransform = new THREE.Object3D();
      for (let treadIndex = 0; treadIndex < 12; treadIndex += 1) {
        const angle = (treadIndex / 12) * Math.PI * 2;
        treadTransform.position.set(0, Math.cos(angle) * 0.47, Math.sin(angle) * 0.47);
        treadTransform.rotation.set(angle, 0, 0);
        treadTransform.updateMatrix();
        treadMesh.setMatrixAt(treadIndex, treadTransform.matrix);
      }
      treadMesh.instanceMatrix.needsUpdate = true;
      wMesh.add(treadMesh);
      const rimGeo = new THREE.CylinderGeometry(0.29, 0.29, 0.42, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rimMesh = new THREE.Mesh(rimGeo, alloyMat);
      wMesh.add(rimMesh);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.46, 12), trimMat);
      hub.rotation.z = Math.PI / 2;
      wMesh.add(hub);
      const tyreBands = new THREE.InstancedMesh(tyreBandGeometry, fenderMat, 2);
      [-1, 1].forEach((side, index) => {
        const bandTransform = new THREE.Object3D();
        bandTransform.rotation.y = Math.PI / 2;
        bandTransform.position.x = side * 0.205;
        bandTransform.updateMatrix();
        tyreBands.setMatrixAt(index, bandTransform.matrix);
      });
      tyreBands.instanceMatrix.needsUpdate = true;
      wMesh.add(tyreBands);
      const spokeMesh = new THREE.InstancedMesh(spokeGeometry, alloyMat, 10);
      const spokeTransform = new THREE.Object3D();
      for (let spokeIndex = 0; spokeIndex < 5; spokeIndex += 1) {
        [-1, 1].forEach((side, sideIndex) => {
          spokeTransform.position.set(side * 0.215, 0, 0);
          spokeTransform.rotation.set((spokeIndex / 5) * Math.PI * 2, 0, 0);
          spokeTransform.updateMatrix();
          spokeMesh.setMatrixAt(spokeIndex * 2 + sideIndex, spokeTransform.matrix);
        });
      }
      spokeMesh.instanceMatrix.needsUpdate = true;
      wMesh.add(spokeMesh);

      pivot.add(wMesh);
      this.carVisual.add(pivot);
      this.wheels.push({
        pivot,
        mesh: wMesh,
        rimMesh,
        isFront,
        radius: 0.47,
        baseY: pivot.position.y
      });

      const archPoints = [];
      for (let angle = 0; angle <= Math.PI; angle += Math.PI / 16) {
        archPoints.push(new THREE.Vector3(
          x,
          Math.sin(angle) * 0.56 + 0.02,
          z + Math.cos(angle) * 0.56
        ));
      }
      const arch = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 24, 0.085, 7, false),
        fenderMat
      );
      arch.castShadow = true;
      this.carVisual.add(arch);
    });

    const spareTire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.24, 20),
      wheelMat
    );
    spareTire.rotation.x = Math.PI / 2;
    spareTire.position.set(0, 0.5, -2.24);
    spareTire.castShadow = true;
    this.carVisual.add(spareTire);
    const spareRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.255, 16),
      alloyMat
    );
    spareRim.rotation.x = Math.PI / 2;
    spareRim.position.set(0, 0.5, -2.39);
    spareRim.castShadow = true;
    this.carVisual.add(spareRim);
    const spareHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.27, 12),
      trimMat
    );
    spareHub.rotation.x = Math.PI / 2;
    spareHub.position.set(0, 0.5, -2.4);
    this.carVisual.add(spareHub);
    for (let spokeIndex = 0; spokeIndex < 6; spokeIndex += 1) {
      const angle = (spokeIndex / 6) * Math.PI * 2;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.2, 0.035),
        alloyMat
      );
      spoke.position.set(Math.cos(angle) * 0.14, 0.5 + Math.sin(angle) * 0.14, -2.53);
      spoke.rotation.z = angle;
      this.carVisual.add(spoke);
    }

    this.carAccessories = {};
    const makeAccessory = (name, parts) => {
      const group = new THREE.Group();
      group.name = `vehicle-${name}-kit`;
      const material = new THREE.MeshStandardMaterial({
        color: name === 'rally' ? 0xc2a878 : 0x48544c,
        roughness: 0.48,
        metalness: 0.46
      });
      parts.forEach(([size, position, rotationY = 0]) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
        mesh.position.set(...position);
        mesh.rotation.y = rotationY;
        mesh.castShadow = true;
        group.add(mesh);
      });
      this.carVisual.add(group);
      this.carAccessories[name] = group;
    };
    makeAccessory('rally', [
      [[0.08, 0.12, 1.72], [-0.53, 1.48, -0.3]],
      [[0.08, 0.12, 1.72], [0.53, 1.48, -0.3]],
      [[1.14, 0.08, 0.12], [0, 1.48, 0.53]],
      [[1.14, 0.08, 0.12], [0, 1.48, -1.13]],
      [[1.8, 0.12, 0.22], [0, 0.48, 2.12]]
    ]);
    makeAccessory('utility', [
      [[0.1, 0.12, 2.3], [-0.67, 1.48, -0.2]],
      [[0.1, 0.12, 2.3], [0.67, 1.48, -0.2]],
      [[1.4, 0.12, 0.1], [0, 1.48, -1.3]],
      [[1.4, 0.12, 0.1], [0, 1.48, 0.9]],
      [[1.6, 0.12, 0.16], [0, 0.42, 2.1]]
    ]);
    this.carAccessories.rally.visible = false;
    this.carAccessories.utility.visible = false;

    this.scene.add(this.carGroup);

    // 3. Cannon-es Vehicle Rigid Body
    const chassisShape = new CANNON.Box(new CANNON.Vec3(1.06, 0.45, 2.0));
    this.carBody = new CANNON.Body({
      mass: 165,
      shape: chassisShape,
      material: this.carMaterial,
      position: new CANNON.Vec3(
        TRAILHEAD_SPAWN.x,
        this.terrainHeight(TRAILHEAD_SPAWN.x, TRAILHEAD_SPAWN.z) + 0.48,
        TRAILHEAD_SPAWN.z
      ),
      linearDamping: 0.15,
      angularDamping: 0.4,
      allowSleep: false
    });
    this.carBody.collisionFilterMask = ~TERRAIN_COLLISION_GROUP;
    this.world.addBody(this.carBody);

    this.vehicleSpeed = 0;
    this.steeringAngle = 0;
    this.targetSteering = 0;
    this.driveYaw = TRAILHEAD_HEADING;
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.driveYaw);
  }

  _buildCheckpointGates() {
    const gateMaterial = new THREE.MeshStandardMaterial({
      color: 0xfff0b0,
      emissive: 0xffa927,
      emissiveIntensity: 1.8,
      roughness: 0.28,
      metalness: 0.12
    });
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0xf4bf53,
      roughness: 0.55,
      flatShading: true
    });
    const rallyRoadIndex = ROAD_DEFINITIONS.findIndex(definition =>
      definition.from === 3 && definition.to === 6
    );
    if (rallyRoadIndex < 0 || !this.roadCurves[rallyRoadIndex]) {
      throw new Error('The High Pass-to-settlement rally road is missing.');
    }
    this.rallyCurve = this.roadCurves[rallyRoadIndex];
    const route = [0.9, 0.65, 0.4, 0.15].map(progress => {
      const position = this.rallyCurve.getPointAt(progress);
      const direction = this.rallyCurve.getTangentAt(progress).negate();
      return {
        position,
        heading: Math.atan2(direction.x, direction.z)
      };
    });
    const ringGeometry = new THREE.TorusGeometry(3.2, 0.2, 8, 32, Math.PI);
    const postGeometry = new THREE.CylinderGeometry(0.18, 0.28, 4.2, 6);

    this.checkpoints = route.map(({ position, heading }) => {
      const group = new THREE.Group();
      group.visible = false;
      const ring = new THREE.Mesh(ringGeometry, gateMaterial.clone());
      ring.position.y = 3.6;
      group.add(ring);

      [-3.2, 3.2].forEach(offset => {
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(offset, 1.8, 0);
        group.add(post);
      });
      group.position.set(position.x, 0, position.z);
      group.rotation.y = heading;
      group.userData.ring = ring;
      group.userData.position = position;
      this.scene.add(group);
      return group;
    });
  }

  _buildBowlingAlley() {
    this.bowlingPins = [];
    const pinGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.4, 16);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5eb,
      roughness: 0.3,
      metalness: 0.1
    });

    // Red neck stripe
    const ringGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.2, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 });

    const startX = TRAILHEAD.x + 32;
    const startZ = TRAILHEAD.z - 30;
    const rows = 4;
    let pinIndex = 0;

    for (let r = 0; r < rows; r++) {
      const rowCount = r + 1;
      const rowZ = startZ - r * 1.5;
      const rowStartX = startX - (r * 1.2) / 2;

      for (let c = 0; c < rowCount; c++) {
        const pinX = rowStartX + c * 1.2;

        // Visual pin
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.castShadow = true;
        const stripe = new THREE.Mesh(ringGeo, ringMat);
        stripe.position.y = 0.35;
        pinMesh.add(stripe);
        this.scene.add(pinMesh);

        // Cannon pin rigid body
        const pinShape = new CANNON.Cylinder(0.2, 0.35, 1.4, 12);
        const pinBody = new CANNON.Body({
          mass: 3.5,
          material: this.propMaterial,
          position: new CANNON.Vec3(pinX, 0.7, rowZ)
        });
        pinBody.addShape(pinShape);
        pinBody.linearDamping = 0.2;
        pinBody.angularDamping = 0.3;

        pinBody.addEventListener('collide', e => {
          if (e.body === this.carBody) {
            sound.playCrash();
          }
        });

        this.world.addBody(pinBody);
        this.bowlingPins.push({ mesh: pinMesh, body: pinBody });
        pinIndex++;
      }
    }
  }

  _buildPhysicsCrates() {
    this.crates = [];
    const crateGeo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.7,
      metalness: 0.1
    });

    const positions = [
      [18, 0.8, -12],
      [18, 2.4, -12],
      [19.8, 0.8, -12],
      [18.9, 0.8, -10.4],
      [18.9, 2.4, -11.2],
      [18.9, 4.0, -11.2]
    ];

    positions.forEach(([x, y, z]) => {
      const mesh = new THREE.Mesh(crateGeo, crateMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const shape = new CANNON.Box(new CANNON.Vec3(0.8, 0.8, 0.8));
      const body = new CANNON.Body({
        mass: 8,
        material: this.propMaterial,
        position: new CANNON.Vec3(x, y, z)
      });
      body.addShape(shape);
      body.linearDamping = 0.25;
      body.angularDamping = 0.35;

      body.addEventListener('collide', e => {
        if (e.body === this.carBody) {
          sound.playCrash();
        }
      });

      this.world.addBody(body);
      this.crates.push({ mesh, body });
    });
  }

  _buildStuntRamp() {
    const rampWidth = 6;
    const rampLength = 9;
    const rampHeight = 2.4;

    const rampGeo = new THREE.BoxGeometry(rampWidth, 0.4, rampLength);
    const rampMat = new THREE.MeshStandardMaterial({
      color: 0x223628,
      roughness: 0.4,
      metalness: 0.5
    });
    const rampMesh = new THREE.Mesh(rampGeo, rampMat);
    rampMesh.position.set(-18, rampHeight / 2, -14);
    rampMesh.rotation.x = 0.26; // ~15 deg incline
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    this.scene.add(rampMesh);

    // Chevron markings on ramp
    const chevronGeo = new THREE.PlaneGeometry(rampWidth - 0.8, rampLength - 0.5);
    const chevronMat = new THREE.MeshBasicMaterial({
      color: 0xc3ed91,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    chevron.rotation.x = -Math.PI / 2;
    chevron.position.y = 0.22;
    rampMesh.add(chevron);

    // Cannon Ramp Body
    const rampShape = new CANNON.Box(new CANNON.Vec3(rampWidth / 2, 0.2, rampLength / 2));
    const rampBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      material: this.groundMaterial,
      position: new CANNON.Vec3(-18, rampHeight / 2, -14)
    });
    rampBody.addShape(rampShape);
    rampBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), 0.26);
    this.world.addBody(rampBody);
  }

  _buildSkillsNoticeboard() {
    const board = new THREE.Group();
    board.position.set(TRAILHEAD.x, this.terrainHeight(TRAILHEAD.x, TRAILHEAD.z), TRAILHEAD.z);
    board.rotation.y = TRAILHEAD_HEADING;
    this.scene.add(board);

    const timber = new THREE.MeshStandardMaterial({ color: 0x514338, roughness: 0.9 });
    const bronze = new THREE.MeshStandardMaterial({
      color: 0xa78358,
      roughness: 0.5,
      metalness: 0.48
    });
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.5, 2.6), timber);
    plinth.position.y = 0.25;
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    board.add(plinth);

    [-4.8, 4.8].forEach(x => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.48, 6.6, 0.48), timber);
      post.position.set(x, 3.55, 0);
      post.castShadow = true;
      post.receiveShadow = true;
      board.add(post);
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(10.2, 5.8, 0.46), timber);
    frame.position.set(0, 4.15, 0);
    frame.castShadow = true;
    frame.receiveShadow = true;
    board.add(frame);

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 900;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to render the Signal Ridge skills board.');
    context.fillStyle = '#d6c8a7';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#303730';
    context.fillRect(0, 0, canvas.width, 152);
    context.fillStyle = '#e8dcc0';
    context.font = 'bold 54px Georgia, serif';
    context.fillText('FIELD SKILLS  /  ADITYA SHINDE', 54, 66);
    context.font = '24px monospace';
    context.fillStyle = '#c2b69a';
    context.fillText('A COMPLETE INVENTORY · SELECT A CATEGORY IN THE FIELD GUIDE', 56, 116);

    const categories = [
      ['LANGUAGES', resumeData.skills.languages],
      ['BACKEND', resumeData.skills.backend],
      ['FRONTEND', resumeData.skills.frontend],
      ['DATABASES', resumeData.skills.databases],
      ['ARCHITECTURE & SYSTEMS', resumeData.skills.architecture],
      ['TOOLS & DEVOPS', resumeData.skills.toolsAndDevops]
    ];
    const columnWidth = 730;
    const rowHeight = 230;
    categories.forEach(([title, skills], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 54 + column * 770;
      const y = 174 + row * rowHeight;
      context.fillStyle = index % 2 ? '#f0e7d1' : '#e9dec5';
      context.fillRect(x, y, columnWidth, 204);
      context.fillStyle = '#485247';
      context.font = 'bold 29px monospace';
      context.fillText(title, x + 24, y + 44);
      context.fillStyle = '#41433a';
      context.font = '24px monospace';
      const lines = [];
      let line = '';
      skills.forEach(skill => {
        const next = line ? `${line} · ${skill}` : skill;
        if (context.measureText(next).width > columnWidth - 48) {
          lines.push(line);
          line = skill;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      lines.slice(0, 4).forEach((text, lineIndex) => {
        context.fillText(text, x + 24, y + 92 + lineIndex * 34);
      });
      context.fillStyle = '#8b7658';
      context.font = '18px monospace';
      context.fillText(`FIELD LOG 0${index + 1}  /  ${String(skills.length).padStart(2, '0')} SKILLS`, x + 24, y + 184);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.worldTextures.push(texture);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(9.68, 5.445),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    face.position.set(0, 4.15, -0.245);
    face.rotation.y = Math.PI;
    board.add(face);

    const headerLine = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.12, 0.52), bronze);
    headerLine.position.set(0, 7.12, 0);
    board.add(headerLine);

  }

  _buildNavigationLandmarks() {
    this.destinations = [];
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x625d52, roughness: 0.9 });
    const ironMaterial = new THREE.MeshStandardMaterial({
      color: 0x393c38,
      roughness: 0.48,
      metalness: 0.64
    });
    WORLD_DESTINATIONS.forEach((destination, index) => {
      const groundY = this.terrainHeight(destination.x, destination.z);
      const marker = new THREE.Group();
      const trailheadOffset = destination.id === 'trailhead' ? 18 : 0;
      const markerX = destination.markerX
        ?? destination.x + Math.cos(TRAILHEAD_HEADING) * trailheadOffset;
      const markerZ = destination.markerZ
        ?? destination.z - Math.sin(TRAILHEAD_HEADING) * trailheadOffset;
      const markerGroundY = this.terrainHeight(markerX, markerZ);
      marker.position.set(markerX, markerGroundY, markerZ);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.8, 1.2, 7), stoneMaterial);
      plinth.position.y = 0.6;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      marker.add(plinth);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.42, 6.8, 7), ironMaterial);
      mast.position.y = 4.4;
      mast.castShadow = true;
      marker.add(mast);
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 0.2), ironMaterial);
      crossbar.position.set(0, 6.4, 0);
      marker.add(crossbar);
      const lanternFrame = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 1), ironMaterial);
      lanternFrame.position.y = 7.5;
      marker.add(lanternFrame);

      const flameMaterial = new THREE.MeshStandardMaterial({
        color: destination.accent,
        emissive: destination.accent,
        emissiveIntensity: 0,
        roughness: 0.32,
        metalness: 0.08
      });
      const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.58, 1), flameMaterial);
      flame.position.y = 7.5;
      flame.visible = false;
      marker.add(flame);

      const emblemMaterial = new THREE.MeshStandardMaterial({
        color: destination.accent,
        emissive: destination.accent,
        emissiveIntensity: 0.2,
        roughness: 0.42,
        metalness: 0.28
      });
      const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), emblemMaterial);
      emblem.position.set(0, 2.7, 0);
      marker.add(emblem);

      const beacon = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.08, 6, 32),
        new THREE.MeshBasicMaterial({
          color: destination.accent,
          transparent: true,
          opacity: 0,
          depthWrite: false
        })
      );
      beacon.rotation.x = Math.PI / 2;
      beacon.position.y = 0.14;
      marker.add(beacon);

      const light = new THREE.PointLight(destination.accent, 0.16, 30, 2);
      light.position.set(0, 7.5, 0);
      marker.add(light);
      this.scene.add(marker);
      this.destinations.push({
        ...destination,
        pos: new THREE.Vector3(destination.x, groundY + 1.1, destination.z),
        beacon,
        emblem,
        light,
        flame,
        lit: this.litBeacons.has(destination.id)
      });
    });
  }

  _buildRoadSignposts() {
    const destinationPositions = Object.fromEntries(
      WORLD_DESTINATIONS.map(destination => [destination.id, destination])
    );
    const signposts = [
      { position: destinationPositions.crossing, heading: 0.18, labels: ['ASHEN SETTLEMENT  →', '← RIVER FORD'] },
      { position: destinationPositions.settlement, heading: -0.45, labels: ['OLD GIANT  →', '← RIVER CROSSING'] },
      { position: destinationPositions.bones, heading: 0.7, labels: ['LAST SIGNAL  →', '← ASHEN SETTLEMENT'] },
      { position: destinationPositions['high-pass'], heading: -0.55, labels: ['ASHEN VALE  →', '← QUARRY TRAIL'] },
      { position: GARAGE_POSITION, heading: -0.25, labels: ['MOTOR WORKS  →', '← WATCHTOWER LOOP'] }
    ];
    const postMaterial = new THREE.MeshStandardMaterial({
      color: 0x55483a,
      roughness: 0.88,
      flatShading: true
    });
    const boardGeometry = new THREE.BoxGeometry(5.2, 1.05, 0.16);
    const postGeometry = new THREE.CylinderGeometry(0.13, 0.2, 3.9, 6);

    signposts.forEach(({ position: location, heading, labels }) => {
      const position = { ...location };
      position.x += Math.cos(heading) * 10;
      position.z -= Math.sin(heading) * 10;
      const ground = this.terrainHeight(position.x, position.z);
      const group = new THREE.Group();
      group.position.set(position.x, ground, position.z);
      group.rotation.y = heading;

      const post = new THREE.Mesh(postGeometry, postMaterial);
      post.position.y = 1.95;
      post.castShadow = true;
      group.add(post);

      labels.forEach((label, index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 768;
        canvas.height = 160;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Unable to render Signal Ridge road signs.');
        context.fillStyle = '#343a32';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#c8a66a';
        context.lineWidth = 10;
        context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);
        context.fillStyle = '#f0dfb5';
        context.font = '600 52px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(label, canvas.width / 2, canvas.height / 2, canvas.width - 48);

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        const board = new THREE.Mesh(boardGeometry, postMaterial);
        board.position.set(index === 0 ? 0 : 0.6, 3.25 - index * 0.82, 0);
        board.rotation.z = index === 0 ? -0.04 : 0.04;
        board.castShadow = true;
        group.add(board);

        const face = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 0.76), new THREE.MeshStandardMaterial({
          color: 0xffffff,
          map: texture,
          roughness: 0.82,
          side: THREE.DoubleSide
        }));
        face.position.set(
          index === 0 ? 0 : 0.6,
          3.25 - index * 0.82,
          index === 0 ? 0.09 : -0.09
        );
        face.rotation.y = index === 0 ? 0 : Math.PI;
        face.rotation.z = index === 0 ? -0.04 : 0.04;
        group.add(face);
      });
      this.scene.add(group);
    });
  }

  _applyBeaconState() {
    const progress = this.litBeacons.size / WORLD_DESTINATIONS.length;
    // LivingWorld handles fog/sky now; we still lerp beacon lights
    const skyColor = this.duskSkyColor.clone().lerp(this.dawnSkyColor, progress);
    const fogColor = this.duskFogColor.clone().lerp(this.dawnFogColor, progress);
    // Only tint if LivingWorld hasn't taken over yet
    if (!this.livingWorld) {
      this.scene.fog.color.copy(fogColor);
      this.scene.background?.copy(fogColor);
      this.ambientLight.intensity = 0.72 + progress * 0.24;
      this.skyLight.intensity = 1.1 + progress * 0.35;
      this.sunLight.intensity = 1.1 + progress * 0.65;
    }
    this.destinations.forEach(destination => {
      destination.lit = this.litBeacons.has(destination.id);
      destination.flame.visible = destination.lit;
      destination.flame.material.emissiveIntensity = destination.lit ? 2.8 : 0;
      destination.light.intensity = destination.lit ? 2.3 : 0.16;
      destination.beacon.material.opacity = destination.lit ? 0.72 : 0;
      destination.emblem.material.emissiveIntensity = destination.lit ? 1.5 : 0.2;
    });
    if (this.lastSignalFlame) this.lastSignalFlame.visible = this.litBeacons.has('signal');
    if (this.lastSignalLight) this.lastSignalLight.intensity = this.litBeacons.has('signal') ? 3 : 0;
    const signalByRouteId = {
      '1': 'trailhead',
      '2': 'crossing',
      '3': 'settlement',
      '4': 'bones',
      '5': 'signal',
      '6': 'high-pass'
    };
    this.roadGlowMeshes.forEach(({ from, to, mesh }) => {
      const connected = this.litBeacons.has(signalByRouteId[from])
        && this.litBeacons.has(signalByRouteId[to]);
      mesh.visible = connected;
      mesh.material.opacity = connected ? 0.28 : 0;
    });
    // Pass signal count to LivingWorld to unlock life
    if (this.livingWorld) {
      this.livingWorld.life.setSignalCount(this.litBeacons.size);
      this.livingWorld.events.setSignalCount(this.litBeacons.size);
    }
    this.onSignalChange?.([...this.litBeacons], WORLD_DESTINATIONS.length);
  }

  _relightBeacon(id) {
    if (!WORLD_DESTINATIONS.some(destination => destination.id === id) || this.litBeacons.has(id)) return;
    this.litBeacons.add(id);
    this._applyBeaconState();
    if (this.litBeacons.size === WORLD_DESTINATIONS.length) this._startSignalChain();
  }

  _startSignalChain() {
    if (this.signalChainLines) return;
    const source = this.destinations.find(destination => destination.id === 'signal');
    if (!source) return;
    this.signalChainStart = performance.now();
    const valleyCenter = new THREE.Vector3(0, this.terrainHeight(0, 0), 0);
    this.signalCinematic = this.reducedMotion ? null : {
      phase: 'pullback',
      startTime: this.signalChainStart,
      duration: 7600,
      startPosition: this.camera.position.clone(),
      startTarget: this.carGroup.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
      endPosition: new THREE.Vector3(0, 4300, 1400),
      endTarget: valleyCenter
    };
    if (this.signalCinematic && this.compactQuality) {
      this.camera.far = 8000;
      this.camera.updateProjectionMatrix();
    }
    this._clearControls();
    this.vehicleSpeed = 0;
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.signalChainLines = this.destinations.map(destination => {
      const points = [
        new THREE.Vector3(source.x, source.pos.y + 30, source.z),
        new THREE.Vector3(destination.x, destination.pos.y + 8, destination.z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffd18a,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      return line;
    });
  }

  relightBeacon(id) {
    const destination = this.destinations.find(item => item.id === id);
    if (!destination) return false;
    const distance = Math.hypot(
      this.carBody.position.x - destination.pos.x,
      this.carBody.position.z - destination.pos.z
    );
    if (distance > 9.5) return false;
    if (id === 'signal'
      && !['trailhead', 'crossing', 'settlement', 'bones'].every(signal => this.litBeacons.has(signal))) {
      return false;
    }
    if (id === 'settlement'
      && this.settlementTopics.length > 0
      && this.settlementTopics.some(topic => !topic.lit)) {
      return false;
    }
    if (!this.litBeacons.has(id)) {
      this._relightBeacon(id);
      sound.playSignal(id);
    }
    return true;
  }

  interactWithNearbyBeacon() {
    let nearest = null;
    let nearestDistance = 9.5;
    this.destinations.forEach(destination => {
      if (destination.lit) return;
      const distance = Math.hypot(
        this.carBody.position.x - destination.pos.x,
        this.carBody.position.z - destination.pos.z
      );
      if (distance <= nearestDistance) {
        nearest = destination;
        nearestDistance = distance;
      }
    });
    if (!nearest) return false;
    if (nearest.id === 'settlement'
      && this.settlementTopics.some(topic => !topic.lit)) return true;
    return this.relightBeacon(nearest.id);
  }

  interactWithNearbySettlementTopic() {
    const topic = this.nearbySettlementTopic;
    if (!topic) return false;
    if (Math.hypot(this.carBody.velocity.x, this.carBody.velocity.z) > 2.2) return true;
    topic.lit = true;
    this.litSettlementTopicIds.add(topic.id);
    topic.lampMaterial.color.setHex(0xffd49a);
    topic.lampMaterial.emissive.setHex(0xffa74d);
    topic.lampMaterial.emissiveIntensity = 2.2;
    topic.lampGlow.intensity = 1.8;
    topic.windowMaterials.forEach(material => {
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 1.4);
    });
    sound.playDiscovery();
    this.onSettlementTopic?.({
      id: topic.id,
      title: topic.title,
      litCount: this.litSettlementTopicIds.size,
      total: this.settlementTopics.length
    });
    return true;
  }

  interactWithNearbySecret() {
    const position = this.carBody.position;
    const speed = Math.hypot(this.carBody.velocity.x, this.carBody.velocity.z);
    const site = this.secretSites.find(candidate => {
      const distance = Math.hypot(position.x - candidate.x, position.z - candidate.z);
      const requirementsMet = (candidate.requiresSignals ?? 0) <= this.litBeacons.size
        && (!candidate.nightOnly || this.livingWorld?.worldState.time.hour >= 20
          || this.livingWorld?.worldState.time.hour < 5);
      return distance <= 9 && requirementsMet && (!candidate.requiresStopped || speed < 0.5);
    });
    if (!site) return false;
    if (!this.foundSecrets.has(site.id)) {
      this.foundSecrets.add(site.id);
      this.onSecretDiscovery?.(site.id);
      if (site.id === 'bridge-plank') this.honk();
      else sound.playDiscovery();
    } else if (site.id === 'bridge-plank') {
      this.honk();
    }
    return true;
  }

  setBeaconProgress(ids = []) {
    this.litBeacons = new Set(ids.filter(id =>
      WORLD_DESTINATIONS.some(destination => destination.id === id)
    ));
    this._applyBeaconState();
  }

  setGarageStyle(style = 'field') {
    const palettes = {
      field: { structure: 0x3f403b, metal: 0x8f8065, light: 0xe18d4a },
      relay: { structure: 0x343b40, metal: 0x637b83, light: 0x73c2c2 },
      alpine: { structure: 0x43494b, metal: 0x87929a, light: 0xd6c48c }
    };
    const selectedStyle = Object.hasOwn(palettes, style) ? style : 'field';
    const palette = palettes[selectedStyle];
    this.garageThemeMaterials.structure.color.setHex(palette.structure);
    this.garageThemeMaterials.metal.color.setHex(palette.metal);
    this.garageThemeMaterials.light.color.setHex(palette.light);
    this.garageThemeMaterials.light.emissive.setHex(palette.light);
    this.garagePointLight.color.setHex(palette.light);
    this.garageStyle = selectedStyle;
  }

  _buildGarage() {
    this.garage = new THREE.Group();
    this.garage.position.set(
      GARAGE_POSITION.x,
      this.terrainHeight(GARAGE_POSITION.x, GARAGE_POSITION.z),
      GARAGE_POSITION.z
    );
    this.garage.rotation.y = 0;
    this.scene.add(this.garage);

    const concrete = new THREE.MeshStandardMaterial({ color: 0x575852, roughness: 0.96 });
    const structure = new THREE.MeshStandardMaterial({ color: 0x3f403b, roughness: 0.88, metalness: 0.08 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x8f8065, roughness: 0.42, metalness: 0.72 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x344c49,
      emissive: 0x375d50,
      emissiveIntensity: 0.22,
      roughness: 0.24,
      metalness: 0.46
    });
    const light = new THREE.MeshStandardMaterial({
      color: 0xd5a769,
      emissive: 0xe18d4a,
      emissiveIntensity: 0.8,
      roughness: 0.35,
      metalness: 0.28
    });
    this.garageThemeMaterials = { structure, metal, light };
    this.garagePointLight = new THREE.PointLight(0xe18d4a, 10, 30, 1.5);
    this.garagePointLight.position.set(0, 6.7, -1);
    this.garage.add(this.garagePointLight);
    const addBox = (size, position, material, castShadow = true) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...position);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      this.garage.add(mesh);
      return mesh;
    };

    const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.24, 32), concrete);
    floor.position.set(0, -0.12, 0);
    floor.receiveShadow = true;
    this.garage.add(floor);
    addBox([25, 0.6, 20], [0, 0.4, 0], structure);
    addBox([27, 0.55, 22], [0, 8.2, 0], metal);
    addBox([0.65, 7.4, 20], [-12.2, 4, 0], structure);
    addBox([0.65, 7.4, 20], [12.2, 4, 0], structure);
    addBox([24, 7.4, 0.65], [0, 4, -9.7], structure);
    addBox([7.4, 7.2, 0.65], [-8.55, 3.9, 9.7], structure);
    addBox([7.4, 7.2, 0.65], [8.55, 3.9, 9.7], structure);
    addBox([10, 0.9, 0.9], [0, 7.5, 9.7], metal);
    addBox([10.8, 0.2, 0.35], [0, 6.9, 9.35], light, false);

    for (let bay = -1; bay <= 1; bay += 1) {
      addBox([0.15, 5.8, 0.13], [bay * 3.1, 3.6, 9.27], light, false);
    }
    addBox([15, 0.08, 0.11], [0, 0.08, 9.3], light, false);

    const liftMaterial = new THREE.MeshStandardMaterial({ color: 0x46544a, roughness: 0.54, metalness: 0.42 });
    [-4.8, 4.8].forEach(x => {
      addBox([0.18, 2.2, 0.2], [x, 1.1, -1.3], liftMaterial);
      addBox([0.8, 0.18, 2.6], [x, 2.05, -1.3], metal);
    });
    addBox([13.8, 3.1, 0.32], [0, 4.2, -9.25], liftMaterial);
    addBox([14.4, 0.24, 1.8], [0, 1.8, -7.35], metal);
    [-6.1, 6.1].forEach(x => {
      addBox([0.22, 1.8, 0.22], [x, 0.9, -7.35], liftMaterial);
    });
    for (let tool = 0; tool < 7; tool += 1) {
      const x = -5.2 + tool * 1.72;
      const silhouette = addBox(
        [tool % 2 ? 0.14 : 0.34, tool % 2 ? 1.15 : 0.72, 0.12],
        [x, 4.2 + (tool % 2) * 0.14, -9.03],
        tool % 3 ? metal : light,
        false
      );
      silhouette.castShadow = false;
    }
    [-9.5, 9.5].forEach(x => {
      const window = addBox([3.1, 2.4, 0.12], [x, 4.8, 9.28], glass, false);
      window.castShadow = false;
    });

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const context = signCanvas.getContext('2d');
    context.fillStyle = '#1a211d';
    context.fillRect(0, 0, 512, 128);
    context.fillStyle = '#d5a769';
    context.fillRect(0, 0, 10, 128);
    context.fillStyle = '#f0eadc';
    context.font = '700 36px Arial, sans-serif';
    context.fillText('SIGNAL RIDGE  /  FIELD SMITHY', 32, 57);
    context.fillStyle = '#9eaa9f';
    context.font = '18px monospace';
    context.fillText('VEHICLE SETUP  ·  REPAIR  ·  TUNING', 32, 95);
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.colorSpace = THREE.SRGBColorSpace;
    this.worldTextures.push(signTexture);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 3),
      new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false, side: THREE.DoubleSide })
    );
    sign.position.set(0, 11.3, 10);
    this.garage.add(sign);

    const entryMarker = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.12, 8, 48),
      light
    );
    entryMarker.position.set(0, 0.4, 15);
    entryMarker.rotation.x = Math.PI / 2;
    this.garage.add(entryMarker);

    this.garage.updateMatrixWorld(true);
    const addCollider = (size, localPosition) => {
      const position = this.garage.localToWorld(new THREE.Vector3(...localPosition));
      const body = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(position.x, position.y, position.z)
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)));
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.garage.rotation.y);
      this.world.addBody(body);
    };
    addCollider([0.65, 7.4, 20], [-12.2, 4, 0]);
    addCollider([0.65, 7.4, 20], [12.2, 4, 0]);
    addCollider([24, 7.4, 0.65], [0, 4, -9.7]);
    addCollider([7.4, 7.2, 0.65], [-8.55, 3.9, 9.7]);
    addCollider([7.4, 7.2, 0.65], [8.55, 3.9, 9.7]);

    this.garageEntry = this.garage.localToWorld(new THREE.Vector3(0, 0, 15));
    this.garageInterior = this.garage.localToWorld(new THREE.Vector3(0, 0.65, 2.5));
  }

  _buildWorldLandmarks() {
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x527a7c,
      emissive: 0x0a171a,
      emissiveIntensity: 0.12,
      roughness: 0.16,
      metalness: 0.08,
      side: THREE.DoubleSide
    });
    waterMaterial.onBeforeCompile = shader => {
      shader.uniforms.uWaterTime = { value: 0 };
      this.waterShader = shader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <common>',
        '#include <common>\nuniform float uWaterTime;'
      );
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 waterWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;
        float waterWave = sin(waterWorldPosition.x * 0.32 + uWaterTime * 1.2)
          * cos(waterWorldPosition.z * 0.27 - uWaterTime * 0.85)
          + sin(waterWorldPosition.x * 0.83 + waterWorldPosition.z * 0.6 - uWaterTime * 1.7) * 0.28;
        transformed += objectNormal * waterWave * 0.035;`
      );
    };
    waterMaterial.customProgramCacheKey = () => 'signal-ridge-water-v1';
    const lakePosition = mapPosition(630, 250);
    const waterOutline = new THREE.Shape();
    waterOutline.moveTo(-15, -5);
    waterOutline.bezierCurveTo(-18, -11, -10, -15, -3, -13);
    waterOutline.bezierCurveTo(4, -17, 11, -11, 12, -7);
    waterOutline.bezierCurveTo(19, -2, 15, 6, 10, 8);
    waterOutline.bezierCurveTo(5, 14, -4, 12, -7, 10);
    waterOutline.bezierCurveTo(-15, 12, -20, 3, -15, -5);
    const lakeMaterial = new THREE.MeshStandardMaterial({
      color: 0x527a7c,
      roughness: 0.14,
      metalness: 0.12,
      side: THREE.DoubleSide
    });
    const lake = new THREE.Mesh(new THREE.ShapeGeometry(waterOutline, 16), lakeMaterial);
    lake.position.set(
      lakePosition.x,
      this.terrainHeight(lakePosition.x, lakePosition.z) + 0.7,
      lakePosition.z
    );
    lake.scale.set(4, 3, 1);
    lake.rotation.x = -Math.PI / 2;
    lake.receiveShadow = true;
    this.scene.add(lake);

    const town = new THREE.Group();
    const settlementGround = this.terrainHeight(SETTLEMENT.x, SETTLEMENT.z);
    town.position.set(SETTLEMENT.x, settlementGround, SETTLEMENT.z);
    this.scene.add(town);
    const wallMaterials = [0x9b8870, 0x858d7d, 0x9b7766, 0xa79c80].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true })
    );
    const roofMaterials = [0x4b4a42, 0x46534a, 0x575048].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.78, flatShading: true })
    );
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xb29b70,
      emissive: 0xe0a05b,
      emissiveIntensity: 0.2,
      roughness: 0.36
    });
    const settlementHomes = Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2;
      return {
        x: Math.cos(angle) * (24 + (index % 2) * 5),
        z: Math.sin(angle) * 18,
        rotation: -angle + Math.PI / 2
      };
    });
    this.settlementTopics = [];
    settlementHomes.forEach(({ x, z, rotation }, index) => {
      const worldX = SETTLEMENT.x + x;
      const worldZ = SETTLEMENT.z + z;
      const definition = this.settlementTopicDefinitions[index];
      const topicId = definition?.id ?? `settlement-house-${index + 1}`;
      const isLit = this.litSettlementTopicIds.has(topicId);
      const house = new THREE.Group();
      const bodyHeight = 5.2;
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(9.2, bodyHeight, 7.6),
        wallMaterials[index % wallMaterials.length]
      );
      body.position.y = bodyHeight / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      house.add(body);
      [-1, 1].forEach(side => {
        const roofPlane = new THREE.Mesh(
          new THREE.BoxGeometry(5.75, 0.28, 8.5),
          roofMaterials[index % roofMaterials.length]
        );
        roofPlane.position.set(side * 2.55, 6.35, 0);
        roofPlane.rotation.z = side * -0.46;
        roofPlane.castShadow = true;
        roofPlane.receiveShadow = true;
        house.add(roofPlane);
      });
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.7, 0.18),
        roofMaterials[(index + 1) % roofMaterials.length]
      );
      door.position.set(0, 1.35, 3.9);
      house.add(door);
      [-2.5, 2.5].forEach(windowX => {
        const houseWindowMaterial = windowMaterial.clone();
        houseWindowMaterial.emissiveIntensity = isLit ? 1.4 : 0.2;
        const window = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.35, 0.12), houseWindowMaterial);
        window.position.set(windowX, 3.1, 3.88);
        house.add(window);
      });
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.18, 0.9),
        roofMaterials[index % roofMaterials.length]
      );
      canopy.position.set(0, 2.85, 4.2);
      house.add(canopy);
      const lampMaterial = new THREE.MeshStandardMaterial({
        color: isLit ? 0xffd49a : 0x52483a,
        emissive: isLit ? 0xffa74d : 0x281d13,
        emissiveIntensity: isLit ? 2.2 : 0.18,
        roughness: 0.35
      });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMaterial);
      lamp.position.set(0, 3.35, 4.35);
      house.add(lamp);
      const lampGlow = new THREE.PointLight(0xffb663, isLit ? 1.8 : 0.08, 19, 2);
      lampGlow.position.copy(lamp.position);
      house.add(lampGlow);
      house.position.set(x, this.terrainHeight(worldX, worldZ) - settlementGround, z);
      house.rotation.y = rotation;
      town.add(house);
      this.settlementTopics.push({
        id: topicId,
        title: definition?.title ?? `Backend topic ${index + 1}`,
        x: worldX + Math.sin(rotation) * 6.4,
        z: worldZ + Math.cos(rotation) * 6.4,
        lit: isLit,
        lampMaterial,
        lampGlow,
        windowMaterials: house.children
          .filter(child => child.geometry?.type === 'BoxGeometry' && child.position.y === 3.1)
          .map(child => child.material)
      });

      const collider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldX, this.terrainHeight(worldX, worldZ) + bodyHeight / 2, worldZ)
      });
      collider.addShape(new CANNON.Box(new CANNON.Vec3(4.7, bodyHeight / 2, 3.9)));
      collider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
      this.world.addBody(collider);
    });
    this._buildSettlementLife();

    const beaconStone = new THREE.MeshStandardMaterial({ color: 0x474a49, roughness: 0.96 });
    const beaconFire = new THREE.MeshStandardMaterial({
      color: 0xd79b62,
      emissive: 0xb96a3f,
      emissiveIntensity: 1.25,
      roughness: 0.58
    });
    this.windTurbines = [];
    [[SIGNAL_PEAK.x, SIGNAL_PEAK.z]].forEach(([x, z]) => {
      const height = 32;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 2.8, height, 7), beaconStone);
      pillar.position.set(x, this.terrainHeight(x, z) + height / 2, z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);

      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 5.6, 7), beaconStone);
      crown.position.set(x, this.terrainHeight(x, z) + height + 1.2, z);
      crown.rotation.y = Math.PI / 7;
      crown.castShadow = true;
      this.scene.add(crown);
      const signal = new THREE.Mesh(new THREE.OctahedronGeometry(1.2, 1), beaconFire);
      signal.position.set(x, this.terrainHeight(x, z) + height + 4.1, z);
      signal.visible = this.litBeacons.has('signal');
      this.scene.add(signal);
      const signalLight = new THREE.PointLight(0xffa969, this.litBeacons.has('signal') ? 3 : 0, 56, 2);
      signalLight.position.copy(signal.position);
      this.scene.add(signalLight);
      this.lastSignalFlame = signal;
      this.lastSignalLight = signalLight;
    });

    this.birds = [];
    const birdMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f403d,
      roughness: 0.82,
      flatShading: true
    });
    for (let flock = 0; flock < 3; flock += 1) {
      const group = new THREE.Group();
      for (let bird = 0; bird < 4; bird += 1) {
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.6, 4), birdMaterial);
        body.rotation.x = Math.PI / 2;
        body.position.set((bird - 1.5) * 2.3, Math.sin(bird * 1.7) * 0.8, Math.cos(bird * 2.4) * 1.4);
        group.add(body);
      }
      const x = SETTLEMENT.x + 24 + flock * 7;
      const z = SETTLEMENT.z + 26;
      group.position.set(x, this.terrainHeight(x, z) + 22 + flock * 3, z);
      this.scene.add(group);
      this.birds.push({ group, phase: flock * 2.1 });
    }

    this.ambientVehicles = [];

    const streamCurve = this.riverCurve;
    const streamDivisions = Math.max(2, Math.ceil(streamCurve.getLength() / 8));
    const streamSamples = streamCurve.getSpacedPoints(streamDivisions);
    const streamPositions = [];
    const streamUvs = [];
    const streamIndices = [];
    const bankPositions = [[], []];
    const shorelinePositions = [[], []];
    const bankIndices = [[], []];
    streamSamples.forEach((point, index) => {
      const progress = index / streamDivisions;
      const tangent = streamCurve.getTangentAt(progress);
      const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      const fordWidth = 1 - THREE.MathUtils.smoothstep(
        Math.hypot(point.x - FORD.x, point.z - FORD.z),
        8,
        30
      );
      const width = 14 + fordWidth * 14 + Math.sin(progress * Math.PI) * 5;
      const waterY = this.terrainHeight(point.x, point.z) + this.riverDepthAt(point.x, point.z);
      const left = point.clone().addScaledVector(side, width * 0.5);
      const right = point.clone().addScaledVector(side, -width * 0.5);
      streamPositions.push(left.x, waterY, left.z, right.x, waterY, right.z);
      streamUvs.push(0, progress * 10, 1, progress * 10);
      [-1, 1].forEach((bank, bankIndex) => {
        const edge = bank < 0 ? right : left;
        const outside = edge.clone().addScaledVector(side, bank * (2.2 + Math.sin(progress * 16 + bankIndex) * 0.55));
        const outsideY = this.terrainHeight(outside.x, outside.z) + 0.06;
        bankPositions[bankIndex].push(
          edge.x, waterY - 0.08, edge.z,
          outside.x, Math.max(waterY - 0.12, outsideY), outside.z
        );
        const shoreline = edge.clone().addScaledVector(side, bank * 0.16);
        shorelinePositions[bankIndex].push(
          edge.x, waterY + 0.015, edge.z,
          shoreline.x, waterY + 0.025, shoreline.z
        );
      });
      if (index < streamDivisions) {
        const offset = index * 2;
        streamIndices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
        bankIndices.forEach(indices => {
          const bankOffset = index * 2;
          indices.push(bankOffset, bankOffset + 1, bankOffset + 2, bankOffset + 1, bankOffset + 3, bankOffset + 2);
        });
      }
    });
    const streamGeometry = new THREE.BufferGeometry();
    streamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streamPositions, 3));
    streamGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(streamUvs, 2));
    streamGeometry.setIndex(streamIndices);
    streamGeometry.computeVertexNormals();
    const stream = new THREE.Mesh(streamGeometry, waterMaterial);
    stream.receiveShadow = true;
    this.scene.add(stream);
    const bankMaterial = new THREE.MeshStandardMaterial({
      color: 0x635a45,
      roughness: 0.96,
      side: THREE.DoubleSide
    });
    const foamMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8c6b4,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    bankPositions.forEach((positions, index) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setIndex(bankIndices[index]);
      geometry.computeVertexNormals();
      const bankMesh = new THREE.Mesh(geometry, bankMaterial);
      bankMesh.receiveShadow = true;
      this.scene.add(bankMesh);

      const shorelineGeometry = new THREE.BufferGeometry();
      shorelineGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(shorelinePositions[index], 3)
      );
      shorelineGeometry.setIndex(bankIndices[index]);
      shorelineGeometry.computeVertexNormals();
      const foam = new THREE.Mesh(shorelineGeometry, foamMaterial);
      foam.renderOrder = 1;
      this.scene.add(foam);
    });

    const riverBarrierSegments = [];
    const barrierTransform = new THREE.Object3D();
    for (let index = 4; index < streamSamples.length - 4; index += 8) {
      const point = streamSamples[index];
      if (Math.hypot(point.x - FORD.x, point.z - FORD.z) < 52) continue;
      const progress = index / streamDivisions;
      const tangent = streamCurve.getTangentAt(progress);
      const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      const fordWidth = 1 - THREE.MathUtils.smoothstep(
        Math.hypot(point.x - FORD.x, point.z - FORD.z),
        8,
        30
      );
      const width = 14 + fordWidth * 14 + Math.sin(progress * Math.PI) * 5;
      const yaw = Math.atan2(tangent.x, tangent.z);
      [-1, 1].forEach(bank => {
        const center = point.clone().addScaledVector(side, bank * (width * 0.5 + 2.4));
        const centerY = this.terrainHeight(center.x, center.z) + 1.8;
        const position = new CANNON.Vec3(center.x, centerY, center.z);
        const quaternion = new CANNON.Quaternion();
        quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), yaw);
        const body = new CANNON.Body({
          mass: 0,
          material: this.groundMaterial,
          position,
          quaternion
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3(2.2, 1.8, 34)));
        this.world.addBody(body);
        riverBarrierSegments.push({ center, centerY, yaw });
      });
    }
    const riverWallMaterial = new THREE.MeshStandardMaterial({
      color: 0x5e584b,
      roughness: 0.98,
      flatShading: true
    });
    const riverWalls = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(1, 0),
      riverWallMaterial,
      riverBarrierSegments.length
    );
    riverBarrierSegments.forEach(({ center, centerY, yaw }, index) => {
      barrierTransform.position.set(center.x, centerY, center.z);
      barrierTransform.rotation.set(0, yaw, 0);
      barrierTransform.scale.set(2.4, 2, 36);
      barrierTransform.updateMatrix();
      riverWalls.setMatrixAt(index, barrierTransform.matrix);
    });
    riverWalls.instanceMatrix.needsUpdate = true;
    riverWalls.castShadow = !this.compactQuality;
    riverWalls.receiveShadow = true;
    this.scene.add(riverWalls);

    const fallMaterial = new THREE.MeshStandardMaterial({
      color: 0x8db9b3,
      emissive: 0x173b3b,
      emissiveIntensity: 0.18,
      roughness: 0.22,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const fallGeometry = new THREE.CylinderGeometry(4.2, 4.2, 18, 20, 12, true, 0, Math.PI);
    const fallPositions = fallGeometry.attributes.position;
    for (let index = 0; index < fallPositions.count; index += 1) {
      const y = fallPositions.getY(index);
      fallPositions.setX(index, fallPositions.getX(index) + Math.sin(y * 0.45) * 0.3);
    }
    fallGeometry.computeVertexNormals();
    const falls = new THREE.Mesh(fallGeometry, fallMaterial);
    const waterfallPosition = mapPosition(468, 122);
    falls.position.set(
      waterfallPosition.x,
      this.terrainHeight(waterfallPosition.x, waterfallPosition.z) - 8.5,
      waterfallPosition.z
    );
    falls.rotation.y = Math.PI * 0.16;
    this.scene.add(falls);
    this.waterfall = falls;

    const bridge = new THREE.Group();
    const crossingCurve = this.roadCurves[1];
    const crossingTangent = crossingCurve?.getTangentAt(0.04);
    const bridgeHeading = crossingTangent
      ? Math.atan2(crossingTangent.x, crossingTangent.z)
      : 0;
    bridge.rotation.y = bridgeHeading - Math.PI / 2;
    const bridgeRoad = this.sampleRoadSurface(FORD.x, FORD.z, 12);
    bridge.position.set(
      FORD.x,
      (bridgeRoad?.height ?? this.terrainHeight(FORD.x, FORD.z)) - 0.49,
      FORD.z
    );
    const bridgeWood = new THREE.MeshStandardMaterial({ color: 0x554635, roughness: 0.94 });
    const bridgeTop = new THREE.MeshStandardMaterial({ color: 0x79644a, roughness: 0.88 });
    [-4.8, 4.8].forEach(z => {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(48, 0.42, 0.72), bridgeWood);
      stringer.position.set(0, 0.12, z);
      stringer.castShadow = true;
      bridge.add(stringer);
    });
    for (let plank = 0; plank < 24; plank += 1) {
      const x = -23 + plank * 2;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.22, 11), bridgeTop);
      const worldX = FORD.x + x * Math.cos(bridge.rotation.y);
      const worldZ = FORD.z - x * Math.sin(bridge.rotation.y);
      const roadHeight = this.sampleRoadSurface(worldX, worldZ, 14)?.height
        ?? this.terrainHeight(worldX, worldZ);
      deck.position.set(x, roadHeight + 0.05 - bridge.position.y - 0.11, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      bridge.add(deck);
    }
    [-5.1, 5.1].forEach(z => {
      for (let postIndex = 0; postIndex < 9; postIndex += 1) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.5, 0.34), bridgeWood);
        post.position.set(-22 + postIndex * 5.5, 1.06, z);
        post.castShadow = true;
        bridge.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(47, 0.3, 0.28), bridgeTop);
      rail.position.set(0, 1.82, z);
      rail.castShadow = true;
      bridge.add(rail);
    });
    this.scene.add(bridge);
    for (let section = 0; section < 12; section += 1) {
      const x = -22 + section * 4;
      const worldX = FORD.x + x * Math.cos(bridge.rotation.y);
      const worldZ = FORD.z - x * Math.sin(bridge.rotation.y);
      const roadHeight = this.sampleRoadSurface(worldX, worldZ, 14)?.height
        ?? this.terrainHeight(worldX, worldZ);
      const sectionBody = new CANNON.Body({
        mass: 0,
        material: this.groundMaterial,
        position: new CANNON.Vec3(worldX, roadHeight + 0.05 - 0.18, worldZ)
      });
      sectionBody.addShape(new CANNON.Box(new CANNON.Vec3(2, 0.18, 5.5)));
      sectionBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, 1, 0),
        bridge.rotation.y
      );
      this.world.addBody(sectionBody);
    }

    const oldBridgePosition = mapPosition(337, 408);
    const oldBridge = new THREE.Group();
    oldBridge.position.set(
      oldBridgePosition.x,
      this.terrainHeight(oldBridgePosition.x, oldBridgePosition.z) + 0.18,
      oldBridgePosition.z
    );
    oldBridge.rotation.y = 0.72;
    [-3.5, 3.5].forEach(z => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 0.65), bridgeWood);
      beam.position.set(0, 0.08, z);
      beam.rotation.z = z < 0 ? 0.035 : -0.035;
      beam.castShadow = true;
      oldBridge.add(beam);
    });
    for (let plank = 0; plank < 17; plank += 1) {
      const x = -16 + plank * 2;
      if (Math.abs(x) < 3) continue;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.18, 7.7), bridgeTop);
      deck.position.set(x, 0.38 + Math.sin(plank * 2.7) * 0.12, (plank % 2 ? -0.2 : 0.2));
      deck.rotation.y = (plank % 2 ? -1 : 1) * 0.035;
      deck.castShadow = true;
      deck.receiveShadow = true;
      oldBridge.add(deck);
    }
    this.scene.add(oldBridge);

    const watchtowerPosition = mapPosition(225, 395);
    const watchtower = new THREE.Group();
    watchtower.position.set(
      watchtowerPosition.x,
      this.terrainHeight(watchtowerPosition.x, watchtowerPosition.z),
      watchtowerPosition.z
    );
    const timber = new THREE.MeshStandardMaterial({ color: 0x51483b, roughness: 0.96 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x66645a, roughness: 1, flatShading: true });
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7.5, 2.2, 8), stone);
    towerBase.position.y = 1.1;
    towerBase.castShadow = true;
    towerBase.receiveShadow = true;
    watchtower.add(towerBase);
    [-1, 1].forEach(side => {
      [-1, 1].forEach(depth => {
        const postHeight = side === 1 && depth === -1 ? 11 : 14;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.72, postHeight, 0.72),
          timber
        );
        post.position.set(side * 3.2, 2.2 + postHeight / 2, depth * 3.2);
        post.rotation.z = side === 1 && depth === -1 ? -0.08 : 0;
        post.castShadow = true;
        watchtower.add(post);
      });
    });
    const towerPlatform = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.72, 8.2), bridgeWood);
    towerPlatform.position.y = 12.2;
    towerPlatform.castShadow = true;
    watchtower.add(towerPlatform);
    const towerLantern = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.1, 1),
      new THREE.MeshStandardMaterial({
        color: 0xd69a59,
        emissive: 0xd69a59,
        emissiveIntensity: 0.9,
        roughness: 0.5
      })
    );
    towerLantern.position.set(0, 14.2, 0);
    watchtower.add(towerLantern);
    const towerLight = new THREE.PointLight(0xf3b66d, 1.1, 42, 2);
    towerLight.position.copy(towerLantern.position);
    watchtower.add(towerLight);
    this.scene.add(watchtower);

    const quarryPosition = mapPosition(760, 500);
    const quarry = new THREE.Group();
    quarry.position.set(
      quarryPosition.x,
      this.terrainHeight(quarryPosition.x, quarryPosition.z),
      quarryPosition.z
    );
    const rustedMetal = new THREE.MeshStandardMaterial({
      color: 0x625b4d,
      roughness: 0.82,
      metalness: 0.28
    });
    [-1, 1].forEach(side => {
      const support = new THREE.Mesh(new THREE.BoxGeometry(1.35, 16, 1.35), rustedMetal);
      support.position.set(side * 10, 8, 0);
      support.castShadow = true;
      quarry.add(support);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.8, 18, 0.8), bridgeWood);
      brace.position.set(side * 5, 8, 0);
      brace.rotation.z = side * -0.62;
      brace.castShadow = true;
      quarry.add(brace);
    });
    const quarryBeam = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 1.4), rustedMetal);
    quarryBeam.position.y = 15.6;
    quarryBeam.castShadow = true;
    quarry.add(quarryBeam);
    const pulley = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.42, 8, 18), rustedMetal);
    pulley.position.set(0, 12.8, 0.9);
    quarry.add(pulley);
    const conveyor = new THREE.Mesh(new THREE.BoxGeometry(22, 0.8, 4.5), bridgeWood);
    conveyor.position.set(-4, 3.8, -8);
    conveyor.rotation.z = 0.32;
    conveyor.castShadow = true;
    quarry.add(conveyor);
    for (let beltRib = 0; beltRib < 8; beltRib += 1) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 4.7), rustedMetal);
      rib.position.set(-12 + beltRib * 2.2, 3.8 + beltRib * 0.32, -8);
      rib.rotation.z = 0.32;
      quarry.add(rib);
    }
    const quarryRock = new THREE.MeshStandardMaterial({ color: 0x746c5b, roughness: 1, flatShading: true });
    for (let rock = 0; rock < 14; rock += 1) {
      const size = 1.5 + (rock % 4) * 0.65;
      const fragment = new THREE.Mesh(
        new THREE.DodecahedronGeometry(size, 0),
        quarryRock
      );
      const angle = rock * 2.4;
      const radius = 14 + (rock % 3) * 3;
      fragment.position.set(Math.cos(angle) * radius, size * 0.45, Math.sin(angle) * radius);
      fragment.rotation.set(angle * 0.3, angle, angle * 0.18);
      fragment.castShadow = true;
      fragment.receiveShadow = true;
      quarry.add(fragment);
    }
    this.scene.add(quarry);

    const campPosition = mapPosition(535, 340);
    const camp = new THREE.Group();
    camp.position.set(
      campPosition.x,
      this.terrainHeight(campPosition.x, campPosition.z),
      campPosition.z
    );
    for (let rock = 0; rock < 9; rock += 1) {
      const angle = (rock / 9) * Math.PI * 2;
      const ringStone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), stone);
      ringStone.position.set(Math.cos(angle) * 3.1, 0.28, Math.sin(angle) * 3.1);
      ringStone.scale.set(1.2, 0.72, 0.92);
      ringStone.rotation.y = angle;
      ringStone.castShadow = true;
      camp.add(ringStone);
    }
    const firewood = new THREE.MeshStandardMaterial({ color: 0x48372b, roughness: 1 });
    [-0.42, 0.42].forEach(offset => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 2.6, 7), firewood);
      log.position.set(0, 0.48, offset);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = offset;
      log.castShadow = true;
      camp.add(log);
    });
    const fire = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 1),
      new THREE.MeshBasicMaterial({ color: 0xffa852 })
    );
    fire.position.y = 1.25;
    camp.add(fire);
    const campfireLight = new THREE.PointLight(0xffa15f, 2.2, 34, 2);
    campfireLight.position.set(0, 2.1, 0);
    camp.add(campfireLight);
    this.campfireLight = campfireLight;
    this.campfireFlame = fire;
    this.scene.add(camp);

    const bone = new THREE.MeshStandardMaterial({ color: 0xaaa48d, roughness: 0.92 });
    const darkBone = new THREE.MeshStandardMaterial({ color: 0x514d46, roughness: 1 });
    const remains = new THREE.Group();
    remains.position.set(
      FOSSIL_RIDGE.x,
      this.terrainHeight(FOSSIL_RIDGE.x, FOSSIL_RIDGE.z),
      FOSSIL_RIDGE.z
    );
    remains.rotation.y = -0.55;
    for (let rib = 0; rib < 6; rib += 1) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(8.8 - rib * 0.52, 0.58, 7, 18, Math.PI),
        bone
      );
      arc.position.set(0, 6.2, (rib - 2.5) * 3.2);
      arc.rotation.z = Math.PI;
      arc.castShadow = true;
      remains.add(arc);
    }
    for (let vertebra = 0; vertebra < 8; vertebra += 1) {
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.85 - vertebra * 0.04, 9, 7), bone);
      joint.position.set(0, 6.4, (vertebra - 3.5) * 3.2);
      remains.add(joint);
    }
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(5.4, 1), bone);
    skull.position.set(0, 7.1, 17);
    skull.scale.set(1.2, 0.8, 1.25);
    skull.castShadow = true;
    remains.add(skull);
    [-2, 2].forEach(x => {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), darkBone);
      socket.position.set(x, 7.4, 21.2);
      remains.add(socket);
    });
    this.scene.add(remains);

    const secretWood = new THREE.MeshStandardMaterial({ color: 0x544637, roughness: 0.94 });
    const secretMetal = new THREE.MeshStandardMaterial({ color: 0x66645a, roughness: 0.82, metalness: 0.28 });
    const cabinSite = WORLD_SECRET_SITES.find(site => site.id === 'waterfall-cabin');
    const cabin = new THREE.Group();
    cabin.position.set(cabinSite.x, this.terrainHeight(cabinSite.x, cabinSite.z), cabinSite.z);
    const cabinWalls = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 7), secretWood);
    cabinWalls.position.y = 2.1;
    cabinWalls.castShadow = true;
    cabin.add(cabinWalls);
    const cabinRoof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 3.2, 4), bridgeTop);
    cabinRoof.position.y = 5.6;
    cabinRoof.rotation.y = Math.PI / 4;
    cabinRoof.castShadow = true;
    cabin.add(cabinRoof);
    const cabinDoor = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.5, 0.18), secretMetal);
    cabinDoor.position.set(0, 1.25, 3.58);
    cabin.add(cabinDoor);
    this.scene.add(cabin);

    const cairnSite = WORLD_SECRET_SITES.find(site => site.id === 'cairn');
    const cairn = new THREE.Group();
    cairn.position.set(cairnSite.x, this.terrainHeight(cairnSite.x, cairnSite.z), cairnSite.z);
    for (let index = 0; index < 5; index += 1) {
      const cairnStone = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 - index * 0.14, 0), stone);
      cairnStone.position.set(Math.sin(index * 1.3) * 0.24, 0.7 + index * 1.05, Math.cos(index * 1.1) * 0.2);
      cairnStone.rotation.set(index * 0.27, index * 0.6, index * 0.2);
      cairnStone.castShadow = true;
      cairn.add(cairnStone);
    }
    this.scene.add(cairn);

    const radioSite = WORLD_SECRET_SITES.find(site => site.id === 'watchtower-radio');
    const radio = new THREE.Group();
    radio.position.set(radioSite.x, this.terrainHeight(radioSite.x, radioSite.z), radioSite.z);
    const radioBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.4), secretWood);
    radioBody.position.y = 0.55;
    radio.add(radioBody);
    const radioDial = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), new THREE.MeshBasicMaterial({ color: 0xd8a86e }));
    radioDial.position.set(-0.55, 0.63, 0.72);
    radio.add(radioDial);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 2.4, 5), secretMetal);
    antenna.position.set(0.8, 1.65, -0.35);
    antenna.rotation.z = -0.22;
    radio.add(antenna);
    this.scene.add(radio);

    const signatureSite = WORLD_SECRET_SITES.find(site => site.id === 'quarry-signature');
    const signedStone = new THREE.Mesh(new THREE.DodecahedronGeometry(2.8, 0), quarryRock);
    signedStone.position.set(
      signatureSite.x,
      this.terrainHeight(signatureSite.x, signatureSite.z) + 1.2,
      signatureSite.z
    );
    signedStone.rotation.set(0.2, 0.4, -0.08);
    signedStone.castShadow = true;
    this.scene.add(signedStone);
    const signatureCanvas = document.createElement('canvas');
    signatureCanvas.width = 256;
    signatureCanvas.height = 128;
    const signatureContext = signatureCanvas.getContext('2d');
    signatureContext.fillStyle = '#514d46';
    signatureContext.fillRect(0, 0, 256, 128);
    signatureContext.fillStyle = '#e2c79f';
    signatureContext.font = 'bold 72px Georgia, serif';
    signatureContext.fillText('A.S.', 76, 88);
    const signatureTexture = new THREE.CanvasTexture(signatureCanvas);
    signatureTexture.colorSpace = THREE.SRGBColorSpace;
    this.worldTextures.push(signatureTexture);
    const signaturePlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 1.3),
      new THREE.MeshBasicMaterial({ map: signatureTexture, toneMapped: false })
    );
    signaturePlaque.position.set(signatureSite.x, signedStone.position.y + 0.4, signatureSite.z + 2.4);
    this.scene.add(signaturePlaque);

    const plankSite = WORLD_SECRET_SITES.find(site => site.id === 'bridge-plank');
    const secretPlank = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 10.5), bridgeTop);
    secretPlank.position.set(
      plankSite.x + 4 * Math.cos(0.72),
      this.terrainHeight(plankSite.x, plankSite.z) + this.riverDepthAt(plankSite.x, plankSite.z) + 1.1,
      plankSite.z - 4 * Math.sin(0.72)
    );
    secretPlank.rotation.y = 0.72;
    secretPlank.castShadow = true;
    this.scene.add(secretPlank);

    const horizonSite = WORLD_SECRET_SITES.find(site => site.id === 'horizon-light');
    const horizonLight = new THREE.Group();
    horizonLight.position.set(
      horizonSite.x,
      this.terrainHeight(horizonSite.x, horizonSite.z) + 18,
      horizonSite.z
    );
    const distantFlame = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2, 1),
      new THREE.MeshBasicMaterial({ color: 0xffca82 })
    );
    horizonLight.add(distantFlame);
    const distantGlow = new THREE.PointLight(0xffb76b, 4, 48, 2);
    horizonLight.add(distantGlow);
    horizonLight.visible = false;
    this.scene.add(horizonLight);
    this.horizonLight = horizonLight;
  }

  _buildSettlementLife() {
    const center = new THREE.Vector3(SETTLEMENT.x, 0, SETTLEMENT.z);
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: 0x625b4e,
      roughness: 0.96,
      flatShading: true
    });
    const plaza = new THREE.Mesh(
      new THREE.CylinderGeometry(13, 14, 0.22, 12),
      stoneMaterial
    );
    plaza.position.set(center.x - 7, this.terrainHeight(center.x - 7, center.z - 6) + 0.08, center.z - 6);
    plaza.receiveShadow = true;
    this.scene.add(plaza);

    const fireRing = new THREE.Group();
    fireRing.position.copy(plaza.position);
    fireRing.position.y -= 0.08;
    for (let index = 0; index < 10; index += 1) {
      const angle = (index / 10) * Math.PI * 2;
      const stone = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.72, 0),
        stoneMaterial
      );
      stone.position.set(Math.cos(angle) * 2.1, 0.32, Math.sin(angle) * 2.1);
      stone.scale.set(1, 0.7, 1);
      fireRing.add(stone);
    }
    const firewoodMaterial = new THREE.MeshStandardMaterial({
      color: 0x483a2c,
      roughness: 0.94
    });
    [-1, 1].forEach(side => {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 3.6, 7), firewoodMaterial);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = side * 0.28;
      log.position.set(0, 0.5, side * 0.32);
      fireRing.add(log);
    });
    const emberMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9b4d,
      emissive: 0xff672e,
      emissiveIntensity: 2.4,
      roughness: 0.4
    });
    const fire = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 1), emberMaterial);
    fire.position.y = 0.95;
    fireRing.add(fire);
    const fireLight = new THREE.PointLight(0xff9955, 2.8, 24, 2);
    fireLight.position.y = 1.6;
    fireRing.add(fireLight);
    this.scene.add(fireRing);
    this.settlementHearth = { fire, fireLight, phase: 0 };

    const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4532, roughness: 0.9 });
    [-1, 1].forEach(side => {
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.28, 1), benchMaterial);
      seat.position.y = 1.05;
      bench.add(seat);
      [-1.8, 1.8].forEach(x => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1, 0.7), benchMaterial);
        leg.position.set(x, 0.5, 0);
        bench.add(leg);
      });
      bench.position.set(center.x - 7 + side * 7.5, this.terrainHeight(center.x - 7 + side * 7.5, center.z + 1) - center.y, center.z + 1);
      bench.rotation.y = side * 0.18;
      this.scene.add(bench);
    });

    const clothing = [0x8b5940, 0x4f6559, 0x6e6175].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true })
    );
    const skin = new THREE.MeshStandardMaterial({ color: 0xc99872, roughness: 0.9 });
    const darkCloth = new THREE.MeshStandardMaterial({ color: 0x393a34, roughness: 0.9 });
    const lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc56f,
      emissive: 0xff8e3d,
      emissiveIntensity: 1.4,
      roughness: 0.35
    });
    this.settlementWalkers = [];
    for (let index = 0; index < 3; index += 1) {
      const radius = 34 + index * 4;
      const pathPoints = Array.from({ length: 8 }, (_, pointIndex) => {
        const angle = (pointIndex / 8) * Math.PI * 2 + index * 0.72;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius * 0.72;
        return new THREE.Vector3(x, this.terrainHeight(x, z), z);
      });
      const path = new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal');
      const person = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.46, 1.45, 7),
        clothing[index]
      );
      body.position.y = 0.82;
      body.castShadow = true;
      person.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
      head.position.y = 1.78;
      head.castShadow = true;
      person.add(head);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.48), darkCloth);
      cap.position.y = 1.98;
      person.add(cap);
      const armPivots = [-1, 1].map(side => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.38, 1.28, 0);
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.13, 0.78, 6),
          clothing[index]
        );
        sleeve.position.y = -0.34;
        sleeve.rotation.z = side * -0.18;
        arm.add(sleeve);
        person.add(arm);
        return arm;
      });
      if (index === 1) {
        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), lanternMaterial);
        lantern.position.set(0.56, 0.88, 0.08);
        person.add(lantern);
      }
      this.scene.add(person);
      this.settlementWalkers.push({
        person,
        path,
        armPivots,
        progress: index / 3,
        speed: 0.004 + index * 0.00045,
        phase: index * 1.8
      });
    }
  }

  setVehicleBuild(build = {}) {
    const validColor = (value, fallback) => (
      typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback
    );
    const validOption = (value, options, fallback) => (
      typeof value === 'string' && options.includes(value) ? value : fallback
    );
    const wheelStyles = {
      street: { radius: 0.44, width: 0.34 },
      rally: { radius: 0.5, width: 0.42 },
      'all-terrain': { radius: 0.47, width: 0.4 }
    };
    const rideHeight = THREE.MathUtils.clamp(Number(build.rideHeight) || 1, 0.84, 1.2);
    const previousRideHeight = this.vehicleBuild.rideHeight;
    const bodyWidth = THREE.MathUtils.clamp(Number(build.bodyWidth) || 1, 0.84, 1.2);
    const power = THREE.MathUtils.clamp(Number(build.power) || 1, 0.9, 1.3);
    const wheelStyle = validOption(build.wheelStyle, Object.keys(wheelStyles), 'all-terrain');
    const bodyKit = validOption(build.bodyKit, ['stock', 'rally', 'utility'], 'stock');
    const paint = validColor(build.paint, '#53645b');
    const alloy = validColor(build.alloy, '#c2a878');

    this.vehicleBuild = { paint, alloy, rideHeight, bodyWidth, wheelStyle, bodyKit, power };
    if (!this.carGroup) return { ...this.vehicleBuild };

    this.carPaintMaterial.color.set(paint);
    this.alloyMaterial.color.set(alloy);
    this.carGroup.scale.set(bodyWidth, rideHeight, 1);
    this.carAccessories.rally.visible = bodyKit === 'rally';
    this.carAccessories.utility.visible = bodyKit === 'utility';

    const wheel = wheelStyles[wheelStyle];
    this.wheels.forEach(({ pivot, mesh, rimMesh }) => {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.CylinderGeometry(wheel.radius, wheel.radius, wheel.width, 20);
      mesh.geometry.rotateZ(Math.PI / 2);
      rimMesh.geometry.dispose();
      rimMesh.geometry = new THREE.CylinderGeometry(
        wheel.radius * 0.62,
        wheel.radius * 0.62,
        wheel.width * 1.04,
        wheelStyle === 'street' ? 8 : 12
      );
      rimMesh.geometry.rotateZ(Math.PI / 2);
      const wheelRecord = this.wheels.find(item => item.pivot === pivot);
      if (wheelRecord) {
        wheelRecord.radius = wheel.radius;
        wheelRecord.baseY = pivot.position.y;
      }
      pivot.position.y = (wheel.radius - 0.45 * rideHeight) / rideHeight;
      if (wheelRecord) wheelRecord.baseY = pivot.position.y;
    });

    this.carBody.removeShape(this.carBody.shapes[0]);
    this.carBody.addShape(new CANNON.Box(new CANNON.Vec3(
      1.06 * bodyWidth,
      0.45 * rideHeight,
      2
    )));
    this.carBody.position.y += 0.45 * (rideHeight - previousRideHeight);
    this.carBody.updateMassProperties();
    this.carBody.aabbNeedsUpdate = true;
    this.carBody.wakeUp();
    return { ...this.vehicleBuild };
  }

  getVehicleBuild() {
    return { ...this.vehicleBuild };
  }

  enterGarage() {
    if (this.garageOpen) return true;
    const distance = Math.hypot(
      this.carBody.position.x - this.garageEntry.x,
      this.carBody.position.z - this.garageEntry.z
    );
    if (distance > 12) return false;
    return this._openGarage();
  }

  travelToGarage() {
    if (this.disposed) return false;
    if (this.garageOpen) return true;
    return this._openGarage();
  }

  _openGarage() {
    this.garageReturnState = {
      position: this.carBody.position.clone(),
      quaternion: this.carBody.quaternion.clone(),
      driveYaw: this.driveYaw
    };
    this._clearControls();
    this.carBody.position.set(
      this.garageInterior.x,
      this.garageInterior.y,
      this.garageInterior.z
    );
    this.driveYaw = Math.PI;
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.driveYaw);
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.vehicleSpeed = 0;
    this.garageOpen = true;
    this.carBody.aabbNeedsUpdate = true;
    this.carBody.wakeUp();
    this.onGarageChange?.(true, this.getVehicleBuild());
    return true;
  }

  exitGarage() {
    if (!this.garageOpen || !this.garageReturnState) return;
    this._clearControls();
    this.carBody.position.copy(this.garageReturnState.position);
    this.carBody.quaternion.copy(this.garageReturnState.quaternion);
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.driveYaw = this.garageReturnState.driveYaw;
    this.garageReturnState = null;
    this.garageOpen = false;
    this.destinationId = null;
    this.vehicleSpeed = 0;
    this.carBody.aabbNeedsUpdate = true;
    this.carBody.wakeUp();
    this.onGarageChange?.(false, this.getVehicleBuild());
  }

  _onCanvasPointerDown(event) {
    if (event.button !== 0 || this.garageOpen) return;
    this.cameraDragging = true;
    this.pointerPosition = { x: event.clientX, y: event.clientY };
    this.lastCameraInput = performance.now();
    this.canvas.setPointerCapture(event.pointerId);
  }

  _onCanvasPointerMove(event) {
    if (!this.cameraDragging || !this.pointerPosition) return;
    const deltaX = event.clientX - this.pointerPosition.x;
    const deltaY = event.clientY - this.pointerPosition.y;
    this.pointerPosition = { x: event.clientX, y: event.clientY };
    this.cameraYawTarget -= deltaX * 0.006;
    this.cameraPitchTarget = THREE.MathUtils.clamp(
      this.cameraPitchTarget - deltaY * 0.004,
      -0.18,
      0.5
    );
    this.lastCameraInput = performance.now();
  }

  _onCanvasPointerUp(event) {
    if (!this.cameraDragging) return;
    this.cameraDragging = false;
    this.pointerPosition = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.lastCameraInput = performance.now();
  }

  _onCanvasWheel(event) {
    if (this.garageOpen) return;
    event.preventDefault();
    this.cameraDistanceTarget = THREE.MathUtils.clamp(
      this.cameraDistanceTarget + Math.sign(event.deltaY) * 1.25,
      5,
      16
    );
    this.lastCameraInput = performance.now();
  }

  _onCanvasDoubleClick(event) {
    if (this.garageOpen || !this.terrainMesh || !this.drivableSamples?.length) return;
    const bounds = this.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const hit = raycaster.intersectObject(this.terrainMesh)[0];
    if (!hit) return;
    let nearest = null;
    let distance = Infinity;
    this.drivableSamples.forEach(point => {
      const nextDistance = Math.hypot(point.x - hit.point.x, point.z - hit.point.z);
      if (nextDistance < distance) {
        nearest = point;
        distance = nextDistance;
      }
    });
    if (nearest && distance < 14) {
      this.autoDriveTarget = new THREE.Vector3(nearest.x, 0, nearest.z);
    }
  }

  _spawnTireSmoke() {
    if (performance.now() - (this._lastSmokeAt || 0) < 100) return;
    this._lastSmokeAt = performance.now();
    const carPos = this.carBody.position;
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.carGroup.quaternion);
    const rearPos = new THREE.Vector3(carPos.x, 0.16, carPos.z)
      .sub(forward.clone().multiplyScalar(1.6));

    this._smokeGeometry ||= new THREE.SphereGeometry(0.16, 8, 6);
    this._smokeMaterial ||= new THREE.MeshBasicMaterial({
      color: 0x9b9587, transparent: true, opacity: 0.24
    });
    const geo = this._smokeGeometry;
    const mat = this._smokeMaterial;
    const p = new THREE.Mesh(geo, mat);
    p.position.copy(rearPos);
    p.position.x += (Math.random() - 0.5) * 0.8;

    this.scene.add(p);
    this.particles.push({
      mesh: p,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.45, (Math.random() - 0.5) * 0.8),
      life: 0.5,
      maxLife: 0.5,
      opacity: mat.opacity,
      fade: true,
      fadeByScale: true
    });
  }

  _spawnWaterSpray(surfaceY, intensity) {
    const now = performance.now();
    if (now - (this._lastWaterSprayAt || 0) < 140) return;
    this._lastWaterSprayAt = now;
    this._waterParticleGeometry ||= new THREE.SphereGeometry(0.07, 5, 4);
    this._waterParticleMaterial ||= new THREE.MeshBasicMaterial({
      color: 0xa7d6d0, transparent: true, opacity: 0.62
    });

    const forward = new THREE.Vector3(Math.sin(this.driveYaw), 0, Math.cos(this.driveYaw));
    const right = new THREE.Vector3(Math.cos(this.driveYaw), 0, -Math.sin(this.driveYaw));
    const rear = new THREE.Vector3(this.carBody.position.x, surfaceY, this.carBody.position.z)
      .addScaledVector(forward, -1.55);

    [-1, 1].forEach(side => {
      const mesh = new THREE.Mesh(this._waterParticleGeometry, this._waterParticleMaterial);
      mesh.position.copy(rear).addScaledVector(right, side * 0.8);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: right.clone().multiplyScalar(side * (0.55 + intensity * 0.7))
          .addScaledVector(forward, -Math.abs(this.vehicleSpeed) * 0.12)
          .add(new THREE.Vector3(0, 0.7 + intensity * 0.5, 0)),
        life: 0.42,
        maxLife: 0.42,
        opacity: this._waterParticleMaterial.opacity,
        fade: true,
        fadeByScale: true
      });
    });
  }

  _onKeyDown(e) {
    if (!this.canvas.isConnected) return;
    const appWindow = this.canvas.closest('.os-window');
    if (appWindow && (appWindow.classList.contains('is-minimized') || !appWindow.classList.contains('active-window'))) return;
    const target = e.target;
    const editingControl = target instanceof HTMLElement
      && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
    if (e.code === 'Escape' && this.garageOpen && !editingControl) {
      e.preventDefault();
      this.exitGarage();
      return;
    }
    if (this.garageOpen) return;

    if (target instanceof HTMLElement && (
      target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    )) return;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
      this.autoDriveTarget = null;
    }

    let handled = true;
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = true;
        break;
      case 'Space':
        this.keys.brake = true;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.nitro = true;
        break;
      case 'KeyH':
        if (!e.repeat) this.honk();
        break;
      case 'KeyR':
        if (!e.repeat) this.resetVehicle();
        break;
      case 'KeyE':
        if (!e.repeat && !this.interactWithNearbySettlementTopic()
          && !this.interactWithNearbyBeacon()
          && !this.interactWithNearbySecret()) this.enterGarage();
        break;
      case 'KeyC':
        if (!e.repeat) this.lowRange = !this.lowRange;
        break;
      case 'KeyL':
        if (!e.repeat && this.headlights?.length) {
          const anyVisible = this.headlights.some(l => l.visible);
          this.headlights.forEach(light => { light.visible = !anyVisible; });
        }
        break;
      case 'KeyV':
        if (!e.repeat) {
          const presets = [7.5, 10, 13];
          const nextPreset = presets.find(distance => distance > this.cameraDistanceTarget + 0.5);
          this.cameraDistanceTarget = nextPreset ?? presets[0];
        }
        break;
      default:
        handled = false;
        break;
    }

    if (handled) {
      e.preventDefault();
      this.carBody.wakeUp();
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = false;
        break;
      case 'Space':
        this.keys.brake = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.nitro = false;
        break;
    }
  }

  _clearControls() {
    Object.keys(this.keys).forEach(key => {
      this.keys[key] = false;
    });
  }

  setDestination(destinationId) {
    const destination = this.destinations.find(item => item.id === destinationId);
    if (!destination) return;
    this.stopRally();
    this.destinationId = destination.id;
  }

  clearDestination() {
    this.destinationId = null;
  }

  travelToDestination(destinationId) {
    const destination = this.destinations.find(item => item.id === destinationId);
    if (!destination || this.disposed) return false;
    if (this.garageOpen) this.exitGarage();
    this._clearControls();
    this.autoDriveTarget = null;
    this.stopRally();
    this.destinationId = destination.id;
    this.carBody.position.set(destination.x, 0, destination.z);
    this._syncVehicleToTerrain();
    let nearestCurve = null;
    let nearestProgress = 0;
    let nearestDistance = Infinity;
    this.roadCurves.forEach(curve => {
      for (let step = 0; step <= 32; step += 1) {
        const progress = step / 32;
        const point = curve.getPointAt(progress);
        const distance = Math.hypot(point.x - destination.x, point.z - destination.z);
        if (distance < nearestDistance) {
          nearestCurve = curve;
          nearestProgress = progress;
          nearestDistance = distance;
        }
      }
    });
    const tangent = nearestCurve?.getTangentAt(nearestProgress);
    this.driveYaw = tangent ? Math.atan2(tangent.x, tangent.z) : TRAILHEAD_HEADING;
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.driveYaw);
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.carBody.aabbNeedsUpdate = true;
    this.carBody.wakeUp();
    this.vehicleSpeed = 0;
    this.camera.position.set(destination.x - Math.sin(this.driveYaw) * 9, this.carBody.position.y + 7, destination.z - Math.cos(this.driveYaw) * 9);
    this.carGroup.position.copy(this.carBody.position);
    this.carGroup.quaternion.copy(this.carBody.quaternion);
    this.carVisual.rotation.set(0, 0, 0);
    this.breadcrumb = [{ x: destination.x, z: destination.z }];
    sound.playWindowOpen();
    return true;
  }

  setTimePaused(paused) {
    this.timePaused = paused;
    this.livingWorld?.setPaused(paused);
  }

  setReducedMotion(enabled) {
    this.reducedMotion = Boolean(enabled);
    if (this.reducedMotion) this._updateWindVisuals(0);
  }

  startRally() {
    this.rallyActive = true;
    this.trackComplete = false;
    this.checkpointIndex = 0;
    this.destinationId = null;
    this.autoDriveTarget = null;
    this.rallyElapsedMs = 0;
    try {
      this.rallyBestMs = Number(window.localStorage.getItem('signal-ridge-rally-best-ms')) || 0;
    } catch (error) {
      console.error('Unable to load the saved Signal Ridge rally time:', error);
      this.rallyBestMs = 0;
    }
    const start = this.rallyCurve.getPointAt(0.99);
    const direction = this.rallyCurve.getTangentAt(0.99).negate();
    this.carBody.position.set(start.x, 0, start.z);
    this._syncVehicleToTerrain();
    this.driveYaw = Math.atan2(direction.x, direction.z);
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.driveYaw);
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.carBody.aabbNeedsUpdate = true;
    this.carBody.wakeUp();
    this.vehicleSpeed = 0;
    this.breadcrumb = [{ x: start.x, z: start.z }];
    this.checkpoints.forEach((checkpoint, index) => {
      checkpoint.visible = index === 0;
      checkpoint.userData.ring.material.emissiveIntensity = index === 0 ? 2.6 : 0.65;
      checkpoint.userData.ring.scale.setScalar(1);
    });
  }

  stopRally() {
    this.rallyActive = false;
    this.checkpoints?.forEach(checkpoint => {
      checkpoint.visible = false;
    });
  }

  setGarageDestination() {
    this.stopRally();
    this.destinationId = 'garage';
  }

  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this._clearControls();
      if (this.carBody) {
        this.carBody.velocity.x = 0;
        this.carBody.velocity.z = 0;
        this.vehicleSpeed = 0;
      }
      this.renderer.render(this.scene, this.camera);
    } else {
      this.carBody?.wakeUp();
      this.lastFrameTime = performance.now();
      this._scheduleFrame();
    }
  }

  _getGuidance(target) {
    const { nodes, edges } = ROAD_GUIDANCE_GRAPH;
    const directDx = target.x - this.carBody.position.x;
    const directDz = target.z - this.carBody.position.z;
    const directDistance = Math.hypot(directDx, directDz);
    if (directDistance <= 24) {
      const relativeBearing = Math.atan2(directDx, directDz) - this.driveYaw;
      const normalizedBearing = Math.atan2(Math.sin(relativeBearing), Math.cos(relativeBearing));
      return {
        distance: Math.round(directDistance),
        direction: Math.abs(normalizedBearing) < 0.4
          ? 'AHEAD'
          : normalizedBearing > 0 ? 'RIGHT' : 'LEFT'
      };
    }
    const nearestNode = point => {
      let nearestIndex = 0;
      let nearestDistance = Infinity;
      nodes.forEach((node, index) => {
        const distance = Math.hypot(node.x - point.x, node.z - point.z);
        if (distance < nearestDistance) {
          nearestIndex = index;
          nearestDistance = distance;
        }
      });
      return { index: nearestIndex, distance: nearestDistance };
    };
    const start = nearestNode(this.carBody.position);
    const end = nearestNode(target);
    const distances = new Float64Array(nodes.length).fill(Infinity);
    const nextNodes = new Int32Array(nodes.length).fill(-1);
    const visited = new Uint8Array(nodes.length);
    distances[end.index] = 0;

    for (let step = 0; step < nodes.length; step += 1) {
      let current = -1;
      let currentDistance = Infinity;
      for (let index = 0; index < nodes.length; index += 1) {
        if (!visited[index] && distances[index] < currentDistance) {
          current = index;
          currentDistance = distances[index];
        }
      }
      if (current === -1) break;
      if (current === start.index) break;
      visited[current] = 1;
      edges[current].forEach(({ node, weight }) => {
        const candidate = currentDistance + weight;
        if (candidate < distances[node]) {
          distances[node] = candidate;
          nextNodes[node] = current;
        }
      });
    }

    const routeDistance = distances[start.index];
    if (!Number.isFinite(routeDistance)) {
      const dx = target.x - this.carBody.position.x;
      const dz = target.z - this.carBody.position.z;
      const relativeBearing = Math.atan2(dx, dz) - this.driveYaw;
      const normalizedBearing = Math.atan2(Math.sin(relativeBearing), Math.cos(relativeBearing));
      return {
        distance: Math.round(Math.hypot(dx, dz)),
        direction: Math.abs(normalizedBearing) < 0.4
          ? 'AHEAD'
          : normalizedBearing > 0 ? 'RIGHT' : 'LEFT'
      };
    }
    const nextIndex = nextNodes[start.index];
    const waypoint = nextIndex >= 0 ? nodes[nextIndex] : target;
    const dx = waypoint.x - this.carBody.position.x;
    const dz = waypoint.z - this.carBody.position.z;
    const relativeBearing = Math.atan2(dx, dz) - this.driveYaw;
    const normalizedBearing = Math.atan2(Math.sin(relativeBearing), Math.cos(relativeBearing));
    return {
      distance: Math.round(start.distance + routeDistance + end.distance),
      direction: Math.abs(normalizedBearing) < 0.4
        ? 'AHEAD'
        : normalizedBearing > 0 ? 'RIGHT' : 'LEFT'
    };
  }

  honk() {
    this._honkingThisFrame = true;
    sound.playHonk();
    // Expanding visual sound ring
    const ringGeo = new THREE.RingGeometry(0.5, 0.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc3ed91, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(this.carBody.position);
    ring.position.y += 0.5;
    this.scene.add(ring);

    let scale = 1;
    const expand = () => {
      scale += 0.4;
      ring.scale.set(scale, scale, scale);
      ring.material.opacity -= 0.05;
      if (ring.material.opacity > 0) {
        requestAnimationFrame(expand);
      } else {
        this.scene.remove(ring);
      }
    };
    expand();
  }

  resetVehicle() {
    if (this.garageOpen) this.exitGarage();
    this._clearControls();
    this.signalCinematic = null;
    if (this.compactQuality && this.camera.far !== 1400) {
      this.camera.far = 1400;
      this.camera.updateProjectionMatrix();
    }
    this.autoDriveTarget = null;
    this.carBody.position.set(TRAILHEAD_SPAWN.x, 0, TRAILHEAD_SPAWN.z);
    this._syncVehicleToTerrain();
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), TRAILHEAD_HEADING);
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.vehicleSpeed = 0;
    this.driveYaw = TRAILHEAD_HEADING;
    this.carBody.aabbNeedsUpdate = true;
    this.steeringAngle = 0;
    this.checkpointIndex = 0;
    this.trackComplete = false;
    this.stopRally();
    this.destinationId = null;
    this.checkpoints.forEach(checkpoint => checkpoint.userData.ring.scale.setScalar(1));
    const target = this.checkpoints[0].userData.position;
    const guidance = this._getGuidance(target);
    this.onTelemetry?.({
      speed: 0,
      checkpoint: 0,
      totalCheckpoints: this.checkpoints.length,
      complete: false,
      checkpointDistance: guidance.distance,
      checkpointDirection: guidance.direction,
      destinationId: null,
      destinationDistance: null,
      destinationDirection: null,
      rallyActive: this.rallyActive,
      position: { x: this.carBody.position.x, z: this.carBody.position.z },
      heading: this.driveYaw,
      elevation: this.terrainHeight(this.carBody.position.x, this.carBody.position.z),
      worldHour: this.livingWorld?.worldState.time.hour ?? 17.5
    });
    this.carBody.wakeUp();
    sound.playWindowOpen();
  }

  _syncVehicleToTerrain() {
    if (!this.carBody || !this.terrainHeight) return;
    this.carBody.position.y = this._getDriveSurfaceHeight(
      this.carBody.position.x,
      this.carBody.position.z
    ) + 0.45 * this.vehicleBuild.rideHeight + 0.02;
    this.carBody.velocity.y = 0;
    this.carBody.aabbNeedsUpdate = true;
  }

  _getDriveSurfaceHeight(x, z) {
    const terrainHeight = this.terrainHeight(x, z);
    const road = this.sampleRoadSurface?.(x, z, 5.5);
    if (!road) return terrainHeight;
    const roadBlend = 1 - THREE.MathUtils.smoothstep(road.distance, 2.6, 5.2);
    return THREE.MathUtils.lerp(terrainHeight, road.height + 0.05, roadBlend);
  }

  _onResize() {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _scheduleFrame() {
    if (this.disposed || this.paused || document.hidden || this._animationScheduled) return;
    this._animationScheduled = true;
    requestAnimationFrame(() => {
      this._animationScheduled = false;
      this._animate();
    });
  }

  _animate() {
    if (this.disposed) return;
    if (this.paused || document.hidden) return;
    this._scheduleFrame();

    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = now;
    if (this.rallyActive && !this.trackComplete) this.rallyElapsedMs += dt * 1000;

    if (!this.reducedMotion) {
      if (this.waterShader) this.waterShader.uniforms.uWaterTime.value = now * 0.001;
      this._updateWindVisuals(now);
    }
    if (this.signalChainLines) {
      const elapsed = (now - this.signalChainStart) / 1000;
      this.signalChainLines.forEach((line, index) => {
        const pulse = THREE.MathUtils.clamp(1 - Math.abs(elapsed - index * 0.65 - 0.35) / 0.35, 0, 1);
        line.material.opacity = this.reducedMotion ? 0.18 : Math.max(0.12, pulse * 0.9);
      });
    }

    // Arcade handling keeps throttle, braking, steering, and drift predictable.
    if (this.garageOpen) this._clearControls();
    let throttle = Number(this.keys.forward) - Number(this.keys.backward);
    let steering = Number(this.keys.right) - Number(this.keys.left);
    if (this.autoDriveTarget) {
      const dx = this.autoDriveTarget.x - this.carBody.position.x;
      const dz = this.autoDriveTarget.z - this.carBody.position.z;
      if (Math.hypot(dx, dz) < 5) {
        this.autoDriveTarget = null;
      } else {
        const targetYaw = Math.atan2(dx, dz);
        const yawDifference = Math.atan2(
          Math.sin(targetYaw - this.driveYaw),
          Math.cos(targetYaw - this.driveYaw)
        );
        steering = THREE.MathUtils.clamp(yawDifference * 1.6, -1, 1);
        throttle = Math.abs(yawDifference) > 1.25 ? 0.25 : 1;
      }
    }
    const roadSurface = this.sampleRoadSurface?.(
      this.carBody.position.x,
      this.carBody.position.z,
      12
    );
    const nearestRoadDistance = roadSurface?.distance ?? Infinity;
    const onRoad = nearestRoadDistance <= 5.5;
    this.isOnRoad = onRoad;
    const riverState = this.sampleRiver?.(this.carBody.position.x, this.carBody.position.z);
    const waterExposure = riverState
      ? 1 - THREE.MathUtils.smoothstep(riverState.distance, 2.2, 6.5)
      : 0;
    const weather = this.livingWorld?.worldState.weather;
    const weatherGrip = THREE.MathUtils.clamp(
      1 - (weather?.wetness ?? 0) * 0.18 - (weather?.snow ?? 0) * 0.32,
      0.55,
      1
    );
    const engineTune = this.vehicleBuild.power;
    const maxForwardSpeed = (this.lowRange
      ? 8
      : onRoad
        ? this.keys.nitro ? 31 : 23
        : this.keys.nitro ? 22 : 16) * engineTune * (1 - waterExposure * 0.5);
    const maxReverseSpeed = 6 * engineTune;
    const forward = new CANNON.Vec3(Math.sin(this.driveYaw), 0, Math.cos(this.driveYaw));
    const right = new CANNON.Vec3(Math.cos(this.driveYaw), 0, -Math.sin(this.driveYaw));
    const currentSpeed = this.carBody.velocity.dot(forward);
    const currentLateralSpeed = this.carBody.velocity.dot(right);

    if (this.keys.brake) {
      this.vehicleSpeed = THREE.MathUtils.damp(currentSpeed, 0, 9, dt);
    } else if (throttle !== 0) {
      const changingDirection = Math.abs(currentSpeed) > 0.5 && Math.sign(currentSpeed) !== throttle;
      const acceleration = (changingDirection ? 11 : (this.keys.nitro ? 13 : 8.5))
        * (onRoad ? 1 : 0.82) * (this.lowRange ? 1.25 : 1) * engineTune
        * (1 - waterExposure * 0.55) * weatherGrip;
      this.vehicleSpeed = currentSpeed + throttle * acceleration * dt;
    } else {
      this.vehicleSpeed = currentSpeed * Math.exp(-(onRoad ? 1.2 : 0.55) * dt - waterExposure * 1.5 * dt);
    }
    this.vehicleSpeed = THREE.MathUtils.clamp(this.vehicleSpeed, -maxReverseSpeed, maxForwardSpeed);
    if (!onRoad) this.vehicleSpeed *= Math.exp(-0.3 * dt);
    if (Math.abs(this.vehicleSpeed) < 0.035) this.vehicleSpeed = 0;

    this.targetSteering = steering * 0.5;
    this.steeringAngle = THREE.MathUtils.damp(this.steeringAngle, this.targetSteering, 7.5, dt);
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.vehicleSpeed) / 18, 0, 1);
    const frontWheelAngle = this.steeringAngle * (0.55 - speedFactor * 0.31);
    this.driveYaw += this.vehicleSpeed / 2.65 * Math.tan(frontWheelAngle) * dt;
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.driveYaw);

    const grip = (this.keys.brake ? 1.8 : onRoad ? 8.2 : 4.8)
      * (1 - waterExposure * 0.58) * weatherGrip;
    const driftLateralSpeed = this.keys.brake
      ? currentLateralSpeed + this.steeringAngle * Math.abs(this.vehicleSpeed) * 0.22
      : currentLateralSpeed * Math.exp(-grip * dt);
    this.carBody.velocity.x = forward.x * this.vehicleSpeed + right.x * driftLateralSpeed;
    this.carBody.velocity.z = forward.z * this.vehicleSpeed + right.z * driftLateralSpeed;
    this.carBody.angularVelocity.y = 0;
    if (throttle !== 0 || steering !== 0 || this.keys.nitro || this.keys.brake) {
      this.carBody.wakeUp();
    }

    const vehicleSurface = this._getDriveSurfaceHeight(
      this.carBody.position.x,
      this.carBody.position.z
    );
    this.wheels.forEach(w => {
      const wheelX = this.carBody.position.x
        + w.pivot.position.x * Math.cos(this.driveYaw)
        + w.pivot.position.z * Math.sin(this.driveYaw);
      const wheelZ = this.carBody.position.z
        - w.pivot.position.x * Math.sin(this.driveYaw)
        + w.pivot.position.z * Math.cos(this.driveYaw);
      const wheelHeight = this._getDriveSurfaceHeight(wheelX, wheelZ);
      const suspensionOffset = THREE.MathUtils.clamp(
        (vehicleSurface - wheelHeight) / this.vehicleBuild.rideHeight,
        -0.18,
        0.18
      );
      w.pivot.position.y = THREE.MathUtils.damp(
        w.pivot.position.y,
        w.baseY + suspensionOffset,
        9,
        dt
      );
      if (w.isFront) {
        w.pivot.rotation.y = frontWheelAngle;
      }
    });

    if (this.keys.brake && steering !== 0 && Math.abs(this.vehicleSpeed) > 5) {
      this._spawnTireSmoke();
    }
    if (waterExposure > 0.2 && Math.abs(this.vehicleSpeed) > 1.2 && riverState) {
      this._spawnWaterSpray(riverState.surfaceY, waterExposure);
    }

    this.wheels.forEach(w => {
      w.mesh.rotation.x += this.vehicleSpeed * dt / w.radius;
    });

    this.world.step(1 / 60, dt, 3);

    if (!this.garageOpen) this._syncVehicleToTerrain();
    this.vehicleSpeed = this.carBody.velocity.x * forward.x + this.carBody.velocity.z * forward.z;
    this.carGroup.position.copy(this.carBody.position);
    this.carGroup.quaternion.copy(this.carBody.quaternion);
    const vehicleX = this.carBody.position.x;
    const vehicleZ = this.carBody.position.z;
    const vehicleForward = new THREE.Vector2(forward.x, forward.z);
    const vehicleRight = new THREE.Vector2(right.x, right.z);
    const frontHeight = this._getDriveSurfaceHeight(
      vehicleX + vehicleForward.x * 2.1,
      vehicleZ + vehicleForward.y * 2.1
    );
    const rearHeight = this._getDriveSurfaceHeight(
      vehicleX - vehicleForward.x * 2.1,
      vehicleZ - vehicleForward.y * 2.1
    );
    const rightHeight = this._getDriveSurfaceHeight(
      vehicleX + vehicleRight.x * 1.1,
      vehicleZ + vehicleRight.y * 1.1
    );
    const leftHeight = this._getDriveSurfaceHeight(
      vehicleX - vehicleRight.x * 1.1,
      vehicleZ - vehicleRight.y * 1.1
    );
    const terrainPitch = Math.atan2(rearHeight - frontHeight, 4.2);
    const terrainRoll = Math.atan2(rightHeight - leftHeight, 2.2);
    this.carVisual.position.y = THREE.MathUtils.damp(
      this.carVisual.position.y,
      -Math.min(Math.abs(this.steeringAngle), 0.5) * speedFactor * 0.025,
      8,
      dt
    );
    this.carVisual.rotation.z = THREE.MathUtils.damp(
      this.carVisual.rotation.z,
      -this.steeringAngle * speedFactor * 0.075,
      5,
      dt
    );
    this.carVisual.rotation.x = THREE.MathUtils.damp(
      this.carVisual.rotation.x,
      terrainPitch + (throttle > 0 && currentSpeed < 2 ? -0.018 : throttle < 0 ? 0.025 : 0),
      4,
      dt
    );
    this.carVisual.rotation.z = THREE.MathUtils.damp(
      this.carVisual.rotation.z,
      terrainRoll - this.steeringAngle * speedFactor * 0.075,
      5,
      dt
    );

    this.bowlingPins.forEach(p => {
      p.mesh.position.copy(p.body.position);
      p.mesh.quaternion.copy(p.body.quaternion);
    });

    this.crates.forEach(c => {
      c.mesh.position.copy(c.body.position);
      c.mesh.quaternion.copy(c.body.quaternion);
    });

    const carPos3 = new THREE.Vector3(this.carBody.position.x, this.carBody.position.y, this.carBody.position.z);
    this.nearbyBeaconId = null;
    let closestBeaconDistance = 10;
    this.destinations.forEach(m => {
      const dist = carPos3.distanceTo(m.pos);
      const horizontalDistance = Math.hypot(
        this.carBody.position.x - m.pos.x,
        this.carBody.position.z - m.pos.z
      );
      if (!m.lit && horizontalDistance < closestBeaconDistance) {
        this.nearbyBeaconId = m.id;
        closestBeaconDistance = horizontalDistance;
      }
      const selected = this.destinationId === m.id;
      m.beacon.visible = selected || m.lit;
      m.beacon.material.opacity = m.lit
        ? 0.72
        : selected
          ? 0.12 + (Math.sin(now * 0.0012 + m.pos.x) + 1) * 0.05
          : 0;
      m.emblem.material.emissiveIntensity = m.lit
        ? 1.5
        : 0.18 + (Math.sin(now * 0.001 + m.pos.z) + 1) * 0.035;
      if (dist < 6.5) {
        if (!this.activeDestinations.has(m.id)) {
          this.activeDestinations.add(m.id);
          sound.playDiscovery();
          if (this.onDiscoverDestination) {
            this.onDiscoverDestination(m.id, m.title);
          }
        }
        m.light.intensity = m.lit ? 3.5 : 0.65;
      } else {
        if (this.activeDestinations.has(m.id) && dist > 8.5) {
          this.activeDestinations.delete(m.id);
        }
        m.light.intensity = THREE.MathUtils.lerp(
          m.light.intensity,
          m.lit ? 2.3 : selected ? 0.65 : 0.16,
          0.05
        );
      }
    });
    this.nearbySettlementTopic = null;
    let nearestSettlementTopicDistance = 11;
    this.settlementTopics.forEach(topic => {
      if (topic.lit) return;
      const distance = Math.hypot(
        this.carBody.position.x - topic.x,
        this.carBody.position.z - topic.z
      );
      if (distance < nearestSettlementTopicDistance) {
        nearestSettlementTopicDistance = distance;
        this.nearbySettlementTopic = topic;
      }
    });
    const worldHour = this.livingWorld?.worldState.time.hour ?? 17.5;
    if (this.horizonLight) {
      this.horizonLight.visible = this.litBeacons.size === WORLD_DESTINATIONS.length
        && (worldHour >= 20 || worldHour < 5);
    }
    this.nearbySecretId = this.secretSites.find(site => {
      const available = (site.requiresSignals ?? 0) <= this.litBeacons.size
        && (!site.nightOnly || worldHour >= 20 || worldHour < 5);
      return available
        && Math.hypot(this.carBody.position.x - site.x, this.carBody.position.z - site.z) <= 12;
    })?.id ?? null;

    this.waystoneLights?.forEach(({ light, phase }) => {
      light.intensity = 1.1 + Math.sin(now * 0.003 + phase) * 0.18;
    });
    if (this.waterfall) this.waterfall.scale.x = 1 + Math.sin(now * 0.0022) * 0.025;
    if (this.campfireLight) this.campfireLight.intensity = 2 + Math.sin(now * 0.014) * 0.25;
    if (this.campfireFlame) this.campfireFlame.scale.y = 0.85 + Math.sin(now * 0.012) * 0.12;
    this.birds?.forEach(({ group, phase }) => {
      const orbit = now * 0.00012 + phase;
      group.position.x = SETTLEMENT.x + 45 + phase * 10 + Math.cos(orbit) * 36;
      group.position.z = SETTLEMENT.z + 60 + phase * 8 + Math.sin(orbit) * 28;
      group.position.y = this.terrainHeight(group.position.x, group.position.z)
        + 38 + Math.sin(now * 0.0015 + phase) * 4;
      group.rotation.y = -orbit;
      group.rotation.z = Math.sin(now * 0.002 + phase) * 0.08;
    });
    if (this.settlementHearth) {
      this.settlementHearth.phase += dt;
      const flicker = 1 + Math.sin(this.settlementHearth.phase * 7.1) * 0.1;
      this.settlementHearth.fire.scale.set(1, flicker, 1);
      this.settlementHearth.fireLight.intensity = 2.6 + Math.sin(this.settlementHearth.phase * 8.7) * 0.45;
    }
    this.settlementWalkers?.forEach(walker => {
      walker.progress = (walker.progress + walker.speed * dt) % 1;
      walker.phase += dt * 5;
      walker.waveTimer = Math.max(0, (walker.waveTimer ?? 0) - dt);
      const point = walker.path.getPointAt(walker.progress);
      const tangent = walker.path.getTangentAt(walker.progress);
      walker.person.position.set(point.x, point.y + Math.abs(Math.sin(walker.phase)) * 0.04, point.z);
      walker.person.rotation.y = Math.atan2(tangent.x, tangent.z);
      const nearVehicle = Math.hypot(
        point.x - this.carBody.position.x,
        point.z - this.carBody.position.z
      ) < 45;
      if (nearVehicle && this._honkingThisFrame) walker.waveTimer = 1.1;
      walker.armPivots.forEach((arm, index) => {
        const gait = Math.sin(walker.phase + index * Math.PI) * 0.16;
        arm.rotation.x = walker.waveTimer > 0 && index === 1 ? -0.85 : gait;
      });
    });
    this.ambientVehicles?.forEach(vehicle => {
      vehicle.progress = (vehicle.progress + dt * vehicle.speed) % 1;
      const point = vehicle.route.getPointAt(vehicle.progress);
      const tangent = vehicle.route.getTangentAt(vehicle.progress);
      vehicle.group.position.set(point.x, this.terrainHeight(point.x, point.z) + 0.5, point.z);
      vehicle.group.rotation.y = Math.atan2(tangent.x, tangent.z);
    });

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.mesh.position.addScaledVector(p.vel, dt);
      p.life -= dt;
      if (p.fade) {
        if (p.fadeByScale) {
          p.mesh.scale.setScalar(Math.max(0.08, p.life / p.maxLife));
        } else {
          p.mesh.material.opacity = p.opacity * (p.life / p.maxLife);
        }
      }
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    const forward3 = new THREE.Vector3(Math.sin(this.driveYaw), 0, Math.cos(this.driveYaw));
    if (!this.cameraDragging && now - this.lastCameraInput > 1800) {
      this.cameraYawTarget = 0;
      this.cameraPitchTarget = 0;
    }
    this.cameraYawOffset = THREE.MathUtils.damp(this.cameraYawOffset, this.cameraYawTarget, 5.5, dt);
    this.cameraPitch = THREE.MathUtils.damp(this.cameraPitch, this.cameraPitchTarget, 5.5, dt);
    this.cameraDistance = THREE.MathUtils.damp(this.cameraDistance, this.cameraDistanceTarget, 7, dt);
    const cameraSpeedFactor = THREE.MathUtils.clamp(Math.abs(this.vehicleSpeed) / 20, 0, 1);
    const cameraDistance = this.cameraDistance + cameraSpeedFactor * 1.5;
    const cameraHeight = THREE.MathUtils.lerp(4.2, 5.4, cameraSpeedFactor);
    const cameraYaw = this.driveYaw + this.cameraYawOffset;
    const targetCamPos = this.garageOpen
      ? this.carGroup.position.clone().add(new THREE.Vector3(8, 6, -10))
      : this.carGroup.position.clone()
        .add(new THREE.Vector3(
          -Math.sin(cameraYaw) * cameraDistance,
          cameraHeight + Math.tan(this.cameraPitch) * cameraDistance,
          -Math.cos(cameraYaw) * cameraDistance
        ));
    this.camera.position.lerp(targetCamPos, 1 - Math.exp(-7.2 * dt));
    const lookAt = this.garageOpen
      ? this.carGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0))
      : this.carGroup.position.clone()
        .addScaledVector(forward3, 7.5 + cameraSpeedFactor * 3)
        .add(new THREE.Vector3(0, 1.4, 0));
    this.camera.lookAt(lookAt);
    if (this.signalCinematic) {
      const elapsed = (now - this.signalCinematic.startTime) / this.signalCinematic.duration;
      const progress = THREE.MathUtils.clamp(elapsed, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      if (this.signalCinematic.phase === 'pullback') {
        this.camera.position.lerpVectors(
          this.signalCinematic.startPosition,
          this.signalCinematic.endPosition,
          eased
        );
        this.camera.lookAt(
          this.signalCinematic.startTarget.clone()
            .lerp(this.signalCinematic.endTarget, eased)
        );
        if (progress >= 1) {
          this.signalCinematic.phase = 'return';
          this.signalCinematic.startTime = now;
          this.signalCinematic.duration = 2200;
          this.signalCinematic.startPosition.copy(this.camera.position);
          this.signalCinematic.startTarget.copy(this.signalCinematic.endTarget);
        }
      } else {
        this.camera.position.lerpVectors(
          this.signalCinematic.startPosition,
          targetCamPos,
          eased
        );
        this.camera.lookAt(
          this.signalCinematic.startTarget.clone()
            .lerp(lookAt, eased)
        );
        if (progress >= 1) {
          this.signalCinematic = null;
          if (this.compactQuality) {
            this.camera.far = 1400;
            this.camera.updateProjectionMatrix();
          }
        }
      }
    }

    if (this.rallyActive && !this.trackComplete && this.checkpoints[this.checkpointIndex]) {
      this.checkpoints.forEach((checkpoint, index) => {
        const active = index === this.checkpointIndex;
        checkpoint.visible = active;
        const ring = checkpoint.userData.ring;
        ring.material.emissiveIntensity = THREE.MathUtils.lerp(
          ring.material.emissiveIntensity,
          active ? 2.6 : 0.65,
          1 - Math.exp(-4 * dt)
        );
        if (active) ring.scale.setScalar(1 + Math.sin(now * 0.003) * 0.045);
      });

      const target = this.checkpoints[this.checkpointIndex].userData.position;
      if (Math.hypot(this.carGroup.position.x - target.x, this.carGroup.position.z - target.z) < 5.5) {
        sound.playDiscovery();
        this.checkpointIndex++;
        this.trackComplete = this.checkpointIndex === this.checkpoints.length;
        if (this.trackComplete) {
          if (!this.rallyBestMs || this.rallyElapsedMs < this.rallyBestMs) {
            this.rallyBestMs = this.rallyElapsedMs;
            try {
              window.localStorage.setItem('signal-ridge-rally-best-ms', String(this.rallyBestMs));
            } catch (error) {
              console.error('Unable to save the Signal Ridge rally time:', error);
            }
          }
        }
        this.onTelemetry?.({
          speed: Math.round(Math.abs(this.vehicleSpeed) * 3.6),
          checkpoint: this.checkpointIndex,
          totalCheckpoints: this.checkpoints.length,
          complete: this.trackComplete,
          rallyElapsedMs: this.rallyElapsedMs,
          rallyBestMs: this.rallyBestMs
        });
      }
    }

    if (
      this.destinationId === 'garage'
      && !this.garageOpen
      && Math.hypot(
        this.carBody.position.x - this.garageEntry.x,
        this.carBody.position.z - this.garageEntry.z
      ) <= 12
    ) {
      this.enterGarage();
    }

    if (this.onTelemetry && now - this.lastTelemetryAt >= 150) {
      this.lastTelemetryAt = now;
      const speed = Math.round(Math.abs(this.vehicleSpeed) * 3.6);
      const drifting = this.keys.brake && Math.abs(this.vehicleSpeed) > 4;
      const nextCheckpoint = this.checkpoints[Math.min(this.checkpointIndex, this.checkpoints.length - 1)];
      const destination = this.destinations.find(item => item.id === this.destinationId);
      const garageTarget = this.destinationId === 'garage';
      const routeTarget = garageTarget
        ? this.garageEntry
        : destination?.pos ?? (this.rallyActive && !this.trackComplete ? nextCheckpoint.userData.position : null);
      const guidance = routeTarget
        ? this._getGuidance(routeTarget)
        : { distance: null, direction: null };
      const carQuat = new THREE.Quaternion(
        this.carBody.quaternion.x,
        this.carBody.quaternion.y,
        this.carBody.quaternion.z,
        this.carBody.quaternion.w
      );
      const carEuler = new THREE.Euler().setFromQuaternion(carQuat, 'YXZ');
      const pitch = Math.round(THREE.MathUtils.radToDeg(carEuler.x));
      const roll = Math.round(THREE.MathUtils.radToDeg(carEuler.z));

      this.onTelemetry({
        speed,
        pitch,
        roll,
        drifting,
        checkpoint: this.checkpointIndex,
        totalCheckpoints: this.checkpoints.length,
        complete: this.trackComplete,
        rallyActive: this.rallyActive,
        checkpointDistance: this.rallyActive ? guidance.distance : null,
        checkpointDirection: this.rallyActive ? guidance.direction : null,
        destinationId: garageTarget ? 'garage' : destination?.id ?? null,
        destinationDistance: destination || garageTarget ? guidance.distance : null,
        destinationDirection: destination || garageTarget ? guidance.direction : null,
        nearbyBeaconId: this.nearbyBeaconId,
        nearbySecretId: this.nearbySecretId,
        nearbySettlementTopic: this.nearbySettlementTopic
          ? { id: this.nearbySettlementTopic.id, title: this.nearbySettlementTopic.title }
          : null,
        settlementTopicCount: this.litSettlementTopicIds.size,
        settlementTopicTotal: this.settlementTopics.length,
        signalCount: this.litBeacons.size,
        signalTotal: WORLD_DESTINATIONS.length,
        lowRange: this.lowRange,
        offRoad: !onRoad,
        autoDriving: Boolean(this.autoDriveTarget),
        position: { x: this.carBody.position.x, z: this.carBody.position.z },
        heading: this.driveYaw,
        elevation: this.terrainHeight(this.carBody.position.x, this.carBody.position.z),
        rallyElapsedMs: this.rallyElapsedMs,
        rallyBestMs: this.rallyBestMs
      });
    }

    this._updateLivingWorld(dt);
    this.renderer.render(this.scene, this.camera);
  }

  _updateWindVisuals(now) {
    const wind = this.livingWorld?.worldState.wind;
    if (!wind || this.windShaders.length === 0) return;
    const strength = this.reducedMotion ? 0 : (wind.speed / 9) * (0.25 + wind.gust * 0.75);
    this.windShaders.forEach(uniforms => {
      uniforms.uWindTime.value = now * 0.001;
      uniforms.uWindDirection.value.copy(wind.dir);
      uniforms.uWindStrength.value = strength;
    });
  }

  _updateLivingWorld(dt) {
    if (!this.livingWorld || this.disposed) return;
    const truckPos = this.carBody
      ? new THREE.Vector3(this.carBody.position.x, this.carBody.position.y, this.carBody.position.z)
      : null;
    this.livingWorld.update(dt, {
      position:    truckPos,
      speed:       Math.abs(this.vehicleSpeed),
      honking:     this._honkingThisFrame ?? false,
      signalCount: this.litBeacons.size
    });
    if (truckPos && this.sunLight) {
      const direction = this.livingWorld.worldState.sun.dir;
      this.sunLight.target.position.copy(truckPos);
      this.sunLight.position.set(
        truckPos.x - direction.x * 160,
        truckPos.y + direction.y * 160,
        truckPos.z - direction.z * 160
      );
      this.sunLight.target.updateMatrixWorld();
    }
    this._honkingThisFrame = false;
  }

  dispose() {
    this.disposed = true;
    sound.stopWorldAmbience();
    this.livingWorld?.dispose();
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._clearControls);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.canvas.removeEventListener('pointerdown', this._onCanvasPointerDown);
    this.canvas.removeEventListener('pointermove', this._onCanvasPointerMove);
    this.canvas.removeEventListener('pointerup', this._onCanvasPointerUp);
    this.canvas.removeEventListener('pointercancel', this._onCanvasPointerUp);
    this.canvas.removeEventListener('wheel', this._onCanvasWheel);
    this.canvas.removeEventListener('dblclick', this._onCanvasDoubleClick);
    const disposedTextures = new Set();
    this.scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (!material) return;
        Object.values(material).forEach(value => {
          if (value?.isTexture && !disposedTextures.has(value)) {
            disposedTextures.add(value);
            value.dispose();
          }
        });
        material.dispose();
      });
    });
    this._smokeGeometry?.dispose();
    this._smokeMaterial?.dispose();
    this._waterParticleGeometry?.dispose();
    this._waterParticleMaterial?.dispose();
    this.worldTextures.forEach(texture => {
      if (disposedTextures.has(texture)) return;
      disposedTextures.add(texture);
      texture.dispose();
    });
    this.renderer.dispose();
  }
}
