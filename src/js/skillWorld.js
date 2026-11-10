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
  ASHEN_SETTLEMENT_BUILDINGS,
  SETTLEMENT_HIGHLAND_HOMESTEADS,
  SETTLEMENT_ROADSIDE_HOMESTEADS,
  SETTLEMENT_ROWHOUSE_LAYOUT,
  SETTLEMENT_GATE_OFFSET,
  SIGNAL_PEAK,
  PIER_POSITION,
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
    const sampleCount = Math.max(2, Math.ceil(curve.getLength() / 6));
    const routePoints = Array.from({ length: sampleCount + 1 }, (_, index) => ({
      progress: index / sampleCount,
      point: curve.getPoint(index / sampleCount)
    }));
    const controlPointCount = closed ? points.length : points.length - 1;
    // Keep authored junctions as graph nodes so intersecting street splines stay connected.
    points.forEach(([x, z], index) => {
      routePoints.push({
        progress: index / controlPointCount,
        point: new THREE.Vector3(x, 0, z)
      });
    });
    routePoints.sort((left, right) => left.progress - right.progress);
    const routeNodes = routePoints.map(({ point }) => addNode(point));
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
    initialSettlementTopics = [],
    onSkillsBoardInteract = null,
    onCitizenStory = null
  ) {
    this.canvas = canvas;
    this.onDiscoverDestination = onDiscoverDestination;
    this.onTelemetry = onTelemetry;
    this.onGarageChange = onGarageChange;
    this.onSignalChange = onSignalChange;
    this.onSecretDiscovery = onSecretDiscovery;
    this.onSettlementTopic = onSettlementTopic;
    this.onSkillsBoardInteract = onSkillsBoardInteract;
    this.onCitizenStory = onCitizenStory;
    this.settlementTopicDefinitions = settlementTopicDefinitions;
    this.litSettlementTopicIds = new Set(initialSettlementTopics);
    this.settlementTopics = [];
    this.nearbySettlementTopic = null;
    this.nearbySettlementCitizen = null;
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
    const cobbleCanvas = document.createElement('canvas');
    cobbleCanvas.width = 256;
    cobbleCanvas.height = 256;
    const cobbleContext = cobbleCanvas.getContext('2d');
    if (!cobbleContext) throw new Error('Unable to create Ashen Settlement paving.');
    cobbleContext.fillStyle = '#494840';
    cobbleContext.fillRect(0, 0, cobbleCanvas.width, cobbleCanvas.height);
    const cobblePalette = ['#817b6e', '#716d62', '#8a8374', '#777165', '#69665c'];
    for (let row = 0; row < 16; row += 1) {
      let x = row % 2 ? -14 : -4;
      const y = row * 16;
      while (x < cobbleCanvas.width) {
        const width = 24 + ((row * 11 + x * 7) % 12);
        const height = 13 + ((row * 5 + x) % 4);
        const inset = 1.5;
        const variation = Math.abs(row * 17 + x * 13) % cobblePalette.length;
        cobbleContext.beginPath();
        cobbleContext.moveTo(x + inset, y + inset + 1);
        cobbleContext.lineTo(x + width - inset - 2, y + inset);
        cobbleContext.lineTo(x + width - inset, y + height - inset);
        cobbleContext.lineTo(x + inset + 2, y + height - inset - 1);
        cobbleContext.closePath();
        cobbleContext.fillStyle = cobblePalette[variation];
        cobbleContext.fill();
        cobbleContext.strokeStyle = '#5b574d';
        cobbleContext.lineWidth = 1;
        cobbleContext.stroke();
        x += width;
      }
    }
    const cobbleTexture = new THREE.CanvasTexture(cobbleCanvas);
    cobbleTexture.colorSpace = THREE.SRGBColorSpace;
    cobbleTexture.wrapS = THREE.RepeatWrapping;
    cobbleTexture.wrapT = THREE.RepeatWrapping;
    cobbleTexture.repeat.set(8, 8);
    this.worldTextures.push(cobbleTexture);
    const cobblestoneMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cobbleTexture,
      roughness: 0.96,
      metalness: 0
    });
    const cobblestoneShoulderMaterial = new THREE.MeshStandardMaterial({
      color: 0x70695c,
      roughness: 0.98,
      metalness: 0
    });
    const sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x81796a,
      roughness: 0.96,
      metalness: 0
    });
    const addTrail = (
      points,
      width,
      material,
      y = 0.035,
      closed = false,
      lateralOffset = 0,
      surfaceOffset = 0
    ) => {
      const curve = new THREE.CatmullRomCurve3(
        points.map(([x, z]) => new THREE.Vector3(x, y, z)),
        closed,
        'centripetal'
      );
      const divisions = Math.max(24, points.length * 16);
      const vertices = [];
      const uvs = [];
      const indices = [];
      const samples = curve.getSpacedPoints(divisions);

      samples.forEach((point, index) => {
        const tangent = curve.getTangentAt(index / divisions);
        point.x -= tangent.z * lateralOffset;
        point.z += tangent.x * lateralOffset;
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width / 2);
        const leftX = point.x - side.x;
        const leftZ = point.z - side.z;
        const rightX = point.x + side.x;
        const rightZ = point.z + side.z;
        const roadHeight = sampleRoadSurface(point.x, point.z)?.height
          ?? terrainHeight(point.x, point.z);
        vertices.push(leftX, roadHeight + y + surfaceOffset, leftZ);
        vertices.push(rightX, roadHeight + y + surfaceOffset, rightZ);
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
    const coastalHeadland = mapPosition(820, 120);
    const foothillPeaks = [
      [coastalHeadland.x, coastalHeadland.z, 190, 220, 200],
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
      const inlandHeight = Math.max(0.5, 26 + broadNoise * 34 + midNoise * 14 + detailNoise * 3
        + farRidges * 150 + boundaryRidges * 230 + foothills
        - lowlandBasin * 18 - ashenBasin * 24 - riverValley * 36 - tarnBasin * 18);
      const coastalBand = 1 - THREE.MathUtils.smoothstep(
        Math.abs(z - SIGNAL_PEAK.z),
        210,
        720
      );
      const coastalBlend = THREE.MathUtils.smoothstep(x, 2080, 2500) * coastalBand;
      const islandRadius = Math.hypot(
        (x - SIGNAL_PEAK.x) / 210,
        (z - SIGNAL_PEAK.z) / 160
      );
      const islandWeight = 1 - THREE.MathUtils.smoothstep(islandRadius, 0.5, 1.15);
      const seaBed = WORLD_FLOOR_Y + 2.5;
      const coastalHeight = seaBed + islandWeight * 45;
      return THREE.MathUtils.lerp(inlandHeight, coastalHeight, coastalBlend);
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
    const settlementHeight = sampleGrid(smoothedHeights, SETTLEMENT.x, SETTLEMENT.z);
    const roadJunctionHeights = new Map();
    const roadJunctionKey = point => `${Math.round(point.x * 10)}:${Math.round(point.z * 10)}`;
    const roadGroups = this.roadCurves.map((curve, index) => {
      const definition = ROAD_DEFINITIONS[index];
      const isCityStreet = definition.surface === 'cobblestone';
      const sampleCount = Math.max(12, Math.ceil(curve.getLength() / 3));
      const samples = curve.getSpacedPoints(sampleCount);
      samples.forEach(point => { point.y = sampleGrid(smoothedHeights, point.x, point.z); });
      const startKey = roadJunctionKey(samples[0]);
      const endKey = roadJunctionKey(samples[samples.length - 1]);
      const startsAtSettlement = definition.from === 3 || Math.hypot(
        samples[0].x - SETTLEMENT.x,
        samples[0].z - SETTLEMENT.z
      ) < 12;
      const endsAtSettlement = definition.to === 3 || Math.hypot(
        samples[samples.length - 1].x - SETTLEMENT.x,
        samples[samples.length - 1].z - SETTLEMENT.z
      ) < 12;
      if (isCityStreet || definition.from === 'settlement-loop') {
        samples.forEach(point => { point.y = settlementHeight; });
      } else {
        const startAnchor = startsAtSettlement
          ? settlementHeight
          : roadJunctionHeights.get(startKey);
        const endAnchor = endsAtSettlement
          ? settlementHeight
          : roadJunctionHeights.get(endKey);
        const hasStartAnchor = startAnchor !== undefined;
        const hasEndAnchor = endAnchor !== undefined;
        if (hasStartAnchor) samples[0].y = startAnchor;
        if (hasEndAnchor) samples[samples.length - 1].y = endAnchor;
        for (let pass = 0; pass < (hasStartAnchor || hasEndAnchor ? 3 : 2); pass += 1) {
          for (let sample = 1; sample < samples.length; sample += 1) {
            if (sample === samples.length - 1 && hasEndAnchor) continue;
            const previous = samples[sample - 1];
            const current = samples[sample];
            const maxRise = Math.hypot(current.x - previous.x, current.z - previous.z) * 0.095;
            current.y = THREE.MathUtils.clamp(current.y, previous.y - maxRise, previous.y + maxRise);
          }
          for (let sample = samples.length - 2; sample >= 0; sample -= 1) {
            if (sample === 0 && hasStartAnchor) continue;
            const next = samples[sample + 1];
            const current = samples[sample];
            const maxRise = Math.hypot(next.x - current.x, next.z - current.z) * 0.095;
            current.y = THREE.MathUtils.clamp(current.y, next.y - maxRise, next.y + maxRise);
          }
        }
        if (hasStartAnchor) samples[0].y = startAnchor;
        if (hasEndAnchor) samples[samples.length - 1].y = endAnchor;
      }
      if (startsAtSettlement) roadJunctionHeights.set(startKey, settlementHeight);
      else if (!roadJunctionHeights.has(startKey)) {
        roadJunctionHeights.set(startKey, samples[0].y);
      }
      if (endsAtSettlement) roadJunctionHeights.set(endKey, settlementHeight);
      else if (!roadJunctionHeights.has(endKey)) {
        roadJunctionHeights.set(endKey, samples[samples.length - 1].y);
      }
      return {
        samples,
        closed: definition.closed ?? false,
        width: definition.width ?? (isCityStreet ? 8.5 : definition.kind === 'pass' ? 22 : 18)
      };
    });
    const roadBuckets = new Map();
    const roadBucketSize = 16;
    roadGroups.forEach(({ samples, width }) => {
      samples.forEach((point, index) => {
        const key = `${Math.floor(point.x / roadBucketSize)}:${Math.floor(point.z / roadBucketSize)}`;
        if (!roadBuckets.has(key)) roadBuckets.set(key, []);
        roadBuckets.get(key).push({ point, samples, index, width });
      });
    });
    sampleRoadSurface = (x, z, maxDistance = Infinity) => {
      const bucketX = Math.floor(x / roadBucketSize);
      const bucketZ = Math.floor(z / roadBucketSize);
      const bucketRadius = Number.isFinite(maxDistance)
        ? Math.ceil(maxDistance / roadBucketSize)
        : 1;
      let nearest = null;
      let nearestDistance = maxDistance;
      for (let offsetX = -bucketRadius; offsetX <= bucketRadius; offsetX += 1) {
        for (let offsetZ = -bucketRadius; offsetZ <= bucketRadius; offsetZ += 1) {
          const points = roadBuckets.get(`${bucketX + offsetX}:${bucketZ + offsetZ}`);
          if (!points) continue;
          for (const candidate of points) {
            const { samples, index, width } = candidate;
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
                  width,
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
    const finalHeights = new Float32Array(smoothedHeights.length);
    const riverDistances = new Float32Array(smoothedHeights.length);
    for (let xIndex = 0; xIndex <= terrainSegmentsX; xIndex += 1) {
      const x = -WORLD_WIDTH / 2 + xIndex * terrainStep;
      for (let zIndex = 0; zIndex <= terrainSegmentsZ; zIndex += 1) {
        const z = WORLD_DEPTH / 2 - zIndex * terrainStep;
        const index = terrainIndex(xIndex, zIndex);
        const baseHeight = smoothedHeights[index];
        const settlementDistance = Math.hypot(x - SETTLEMENT.x, z - SETTLEMENT.z);
        const settlementBlend = 1 - THREE.MathUtils.smoothstep(settlementDistance, 165, 250);
        const settledHeight = THREE.MathUtils.lerp(baseHeight, settlementHeight, settlementBlend);
        const nearestRoad = sampleRoadSurface(x, z, 48);
        const roadInfluence = nearestRoad
          ? 1 - THREE.MathUtils.smoothstep(
            nearestRoad.distance,
            Math.max(6, nearestRoad.width / 2),
            nearestRoad.width / 2 + 5
          )
          : 0;
        const gradedHeight = THREE.MathUtils.lerp(
          settledHeight,
          nearestRoad?.height ?? settledHeight,
          roadInfluence
        );
        const river = nearestRiverSample(x, z);
        const channel = 1 - THREE.MathUtils.smoothstep(river.distance, 8, 52);
        finalHeights[index] = gradedHeight - channel * 3.4;
        riverDistances[index] = river.distance;
      }
    }
    [...SETTLEMENT_ROADSIDE_HOMESTEADS, ...SETTLEMENT_HIGHLAND_HOMESTEADS].forEach(site => {
      const worldX = SETTLEMENT.x + site.x;
      const worldZ = SETTLEMENT.z + site.z;
      const padHeight = sampleGrid(finalHeights, worldX, worldZ);
      const innerRadius = Math.hypot(site.w / 2, site.d / 2) + 1;
      const outerRadius = innerRadius + 10;
      const minX = Math.max(0, Math.floor((worldX - outerRadius + WORLD_WIDTH / 2) / terrainStep));
      const maxX = Math.min(terrainSegmentsX, Math.ceil((worldX + outerRadius + WORLD_WIDTH / 2) / terrainStep));
      const minZ = Math.max(0, Math.floor((WORLD_DEPTH / 2 - worldZ - outerRadius) / terrainStep));
      const maxZ = Math.min(terrainSegmentsZ, Math.ceil((WORLD_DEPTH / 2 - worldZ + outerRadius) / terrainStep));
      for (let xIndex = minX; xIndex <= maxX; xIndex += 1) {
        const x = -WORLD_WIDTH / 2 + xIndex * terrainStep;
        for (let zIndex = minZ; zIndex <= maxZ; zIndex += 1) {
          const z = WORLD_DEPTH / 2 - zIndex * terrainStep;
          const distance = Math.hypot(x - worldX, z - worldZ);
          if (distance >= outerRadius) continue;
          const weight = 1 - THREE.MathUtils.smoothstep(distance, innerRadius, outerRadius);
          const index = terrainIndex(xIndex, zIndex);
          finalHeights[index] = THREE.MathUtils.lerp(finalHeights[index], padHeight, weight);
        }
      }
    });
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
    ROAD_DEFINITIONS.forEach((definition, roadIndex) => {
      const { points, closed, from, to, surface } = definition;
      const isTownStreet = surface === 'cobblestone';
      const isCityEntrance = from === 'settlement-gate';
      const surfaceOffset = isTownStreet ? 0.006 + roadIndex * 0.0008 : 0;
      const roadWidth = definition.width ?? (isCityEntrance
        ? 14
        : isTownStreet ? 8.5 : definition.kind === 'pass' ? 22 : 18);
      const shoulder = isTownStreet ? cobblestoneShoulderMaterial : shoulderMaterial;
      const roadSurface = isTownStreet ? cobblestoneMaterial : trailMaterial;
      if (isTownStreet) {
        addTrail(points, roadWidth + 2.6, sidewalkMaterial, 0.026, closed, 0, surfaceOffset);
        addTrail(points, roadWidth + 0.6, cobblestoneShoulderMaterial, 0.038, closed, 0, surfaceOffset);
      } else {
        addTrail(points, roadWidth + 1.8, shoulder, 0.026, closed);
      }
      addTrail(points, roadWidth, roadSurface, 0.052, closed, 0, surfaceOffset);
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

    const cityJunctions = [-82, -25, 25, 75, 125, 145]
      .flatMap(x => [-60, -20, 20, 60].map(z => [x, z]));
    cityJunctions.push([-82, 0]);
    cityJunctions.forEach(([x, z]) => {
      const apron = new THREE.Mesh(new THREE.CircleGeometry(5.25, 16), cobblestoneMaterial);
      apron.rotation.x = -Math.PI / 2;
      apron.position.set(SETTLEMENT.x + x, settlementHeight + 0.085, SETTLEMENT.z + z);
      apron.receiveShadow = true;
      ground.add(apron);
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
    addTrailJunction(TRAILHEAD.x, TRAILHEAD.z, 8);

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
        const radius = Math.sqrt(random()) * 230;
        x = SETTLEMENT.x + Math.cos(angle) * radius;
        z = SETTLEMENT.z + Math.sin(angle) * radius;
      }
      const nearRiver = nearestRiverSample(x, z).distance;
      const settlementDistance = Math.hypot(x - SETTLEMENT.x, z - SETTLEMENT.z);
      const insideSettlementBlocks = settlementDistance < 165;
      const nearDestination = WORLD_DESTINATIONS.some(destination =>
        Math.hypot(x - destination.x, z - destination.z) < 16
      );
      const settlementOutskirts = settlementDistance > 175 && settlementDistance < 250;
      const nearCivicHall = Math.abs(x - (SETTLEMENT.x + 90)) < 24
        && Math.abs(z - SETTLEMENT.z) < 18;
      const nearStable = Math.abs(x - (SETTLEMENT.x + 114)) < 30
        && Math.abs(z - (SETTLEMENT.z + 78)) < 24;
      const elevation = terrainHeight(x, z);
      const inMeadow = Math.hypot(x - TRAILHEAD.x, z - TRAILHEAD.z) < 280
        || nearRiver < 85
        || settlementOutskirts;
      const slope = Math.hypot(
        terrainHeight(x + 2, z) - elevation,
        terrainHeight(x, z + 2) - elevation
      );
      if (
        !inMeadow
        || nearDestination
        || insideSettlementBlocks
        || (settlementOutskirts && (nearCivicHall || nearStable))
        || isNearCourse(x, z, 7)
        || slope > 2.8
        || random() < 0.35
      ) continue;

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
    const shoulderOffset = 17;
    const boardX = TRAILHEAD.x - Math.cos(TRAILHEAD_HEADING) * shoulderOffset;
    const boardZ = TRAILHEAD.z + Math.sin(TRAILHEAD_HEADING) * shoulderOffset;
    const boardY = this.terrainHeight(boardX, boardZ);
    board.position.set(boardX, boardY, boardZ);
    board.rotation.y = TRAILHEAD_HEADING;
    this.scene.add(board);
    this.skillsBoardPosition = new THREE.Vector3(boardX, boardY, boardZ);

    const timber = new THREE.MeshStandardMaterial({ color: 0x514338, roughness: 0.9 });
    const bronze = new THREE.MeshStandardMaterial({
      color: 0xa78358,
      roughness: 0.5,
      metalness: 0.48
    });
    const padSize = 18;
    const padDepth = 12;
    const padCorners = [
      [-padSize / 2, -padDepth / 2],
      [padSize / 2, -padDepth / 2],
      [padSize / 2, padDepth / 2],
      [-padSize / 2, padDepth / 2]
    ];
    const padPositions = padCorners.flatMap(([localX, localZ]) => {
      const worldX = boardX + Math.cos(TRAILHEAD_HEADING) * localX
        + Math.sin(TRAILHEAD_HEADING) * localZ;
      const worldZ = boardZ - Math.sin(TRAILHEAD_HEADING) * localX
        + Math.cos(TRAILHEAD_HEADING) * localZ;
      return [localX, this.terrainHeight(worldX, worldZ) - boardY + 0.035, localZ];
    });
    const padGeometry = new THREE.BufferGeometry();
    padGeometry.setAttribute('position', new THREE.Float32BufferAttribute(padPositions, 3));
    padGeometry.setIndex([0, 2, 1, 0, 3, 2]);
    padGeometry.computeVertexNormals();
    const pullOff = new THREE.Mesh(
      padGeometry,
      new THREE.MeshStandardMaterial({ color: 0x5b5548, roughness: 0.98, flatShading: true })
    );
    pullOff.receiveShadow = true;
    board.add(pullOff);

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
    context.fillText('PARK BESIDE THE ROAD · STOP AND PRESS E TO BROWSE ALL SIX CATEGORIES', 56, 116);

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

    // Glowing approach ground ring
    const ringGeo = new THREE.RingGeometry(3.6, 4.4, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xe6a84d,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const approachRing = new THREE.Mesh(ringGeo, ringMat);
    approachRing.position.set(0, 0.08, -3.2);
    board.add(approachRing);
    this.noticeBoardRing = approachRing;

    board.updateMatrixWorld(true);
    this.noticeBoardPromptPosition = board.localToWorld(new THREE.Vector3(0, 7.8, -0.2));
    this.noticeBoardPrompt = document.createElement('div');
    this.noticeBoardPrompt.className = 'bruno-world-prompt';
    this.noticeBoardPrompt.textContent = '[ E ]  READ THE BOARD';
    this.noticeBoardPrompt.hidden = true;
    this.canvas.parentElement.append(this.noticeBoardPrompt);
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
      const markerHeading = Number.isFinite(this.fordBridgeHeading)
        ? this.fordBridgeHeading
        : TRAILHEAD_HEADING;
      const markerOffset = destination.id === 'crossing' ? 34 : trailheadOffset;
      const markerX = destination.markerX
        ?? destination.x + Math.sin(markerHeading) * markerOffset;
      const markerZ = destination.markerZ
        ?? destination.z + Math.cos(markerHeading) * markerOffset;
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
      marker.visible = destination.id !== 'signal';
      this.scene.add(marker);
      this.destinations.push({
        ...destination,
        pos: new THREE.Vector3(
          markerX,
          (destination.id === 'crossing' ? markerGroundY : groundY) + 1.1,
          markerZ
        ),
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
      {
        position: destinationPositions.crossing,
        heading: this.fordBridgeHeading,
        along: 28,
        side: 7,
        labels: ['ASHEN SETTLEMENT  →', '← RIVER FORD']
      },
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

    signposts.forEach(({ position: location, heading, labels, along = 0, side = 10 }) => {
      const position = { ...location };
      position.x += Math.sin(heading) * along + Math.cos(heading) * side;
      position.z += Math.cos(heading) * along - Math.sin(heading) * side;
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
    if (this.lastSignalLight) this.lastSignalLight.intensity = this.litBeacons.has('signal') ? 6 : 0.35;
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

  interactWithNearbyCitizen() {
    const citizen = this.nearbySettlementCitizen;
    if (!citizen) return false;
    if (Math.hypot(this.carBody.velocity.x, this.carBody.velocity.z) > 2.2) return true;
    this.onCitizenStory?.({
      name: citizen.name,
      role: citizen.profession,
      story: citizen.story
    });
    return true;
  }

  enterNoticeBoardView() {
    this.noticeBoardViewActive = true;
    const boardX = this.skillsBoardPosition.x;
    const boardY = this.skillsBoardPosition.y;
    const boardZ = this.skillsBoardPosition.z;
    const heading = TRAILHEAD_HEADING;

    const frontX = -Math.sin(heading) * 6.2;
    const frontZ = -Math.cos(heading) * 6.2;
    const camTargetPos = new THREE.Vector3(boardX + frontX, boardY + 4.15, boardZ + frontZ);
    const camTargetLookAt = new THREE.Vector3(boardX, boardY + 4.15, boardZ);

    this.noticeBoardCinematic = {
      phase: 'enter',
      startTime: performance.now(),
      duration: 850,
      startPosition: this.camera.position.clone(),
      endPosition: camTargetPos,
      startTarget: this.carGroup.position.clone().add(new THREE.Vector3(0, 1.4, 0)),
      endTarget: camTargetLookAt,
      callbackFired: false
    };
  }

  exitNoticeBoardView() {
    if (!this.noticeBoardViewActive && !this.noticeBoardCinematic) return;
    this.noticeBoardViewActive = false;
    this.noticeBoardCinematic = {
      phase: 'exit',
      startTime: performance.now(),
      duration: 750,
      startPosition: this.camera.position.clone(),
      startTarget: new THREE.Vector3(this.skillsBoardPosition.x, this.skillsBoardPosition.y + 4.15, this.skillsBoardPosition.z)
    };
  }

  interactWithNearbySkillsBoard() {
    if (!this.skillsBoardPosition || !this.onSkillsBoardInteract) return false;
    const distance = Math.hypot(
      this.carBody.position.x - this.skillsBoardPosition.x,
      this.carBody.position.z - this.skillsBoardPosition.z
    );
    if (distance > 22) return false;
    if (this.noticeBoardViewActive) {
      this.exitNoticeBoardView();
      return true;
    }
    if (Math.hypot(this.carBody.velocity.x, this.carBody.velocity.z) > 4.0) return true;
    this.enterNoticeBoardView();
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
      sound.playDiscovery();
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
    this.waterMaterial = waterMaterial;

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

    // Build the settlement around its square, market streets, and open gate.
    this._buildAshenSettlement();

    // The lighthouse is the final signal landmark; avoid a second tower at its arrival point.
    this._buildPier();
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
    const approachTangent = this.roadCurves[0]?.getTangentAt(0.99);
    const bridgeHeading = approachTangent
      ? Math.atan2(approachTangent.x, approachTangent.z)
      : 0;
    this.fordBridgeHeading = bridgeHeading;
    bridge.rotation.y = bridgeHeading - Math.PI / 2;
    const bridgeRoad = this.sampleRoadSurface(FORD.x, FORD.z, 12);
    bridge.position.set(
      FORD.x,
      (bridgeRoad?.height ?? this.terrainHeight(FORD.x, FORD.z)) - 0.49,
      FORD.z
    );
    const bridgeWood = new THREE.MeshStandardMaterial({ color: 0x554635, roughness: 0.94 });
    const bridgeTop = new THREE.MeshStandardMaterial({ color: 0x79644a, roughness: 0.88 });
    [-3.6, 3.6].forEach(z => {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(48, 0.42, 0.72), bridgeWood);
      stringer.position.set(0, 0.12, z);
      stringer.castShadow = true;
      bridge.add(stringer);
    });
    for (let plank = 0; plank < 24; plank += 1) {
      const x = -23 + plank * 2;
      const deck = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.22, 8.4), bridgeTop);
      const worldX = FORD.x + x * Math.cos(bridge.rotation.y);
      const worldZ = FORD.z - x * Math.sin(bridge.rotation.y);
      const roadHeight = this.sampleRoadSurface(worldX, worldZ, 14)?.height
        ?? this.terrainHeight(worldX, worldZ);
      deck.position.set(x, roadHeight + 0.05 - bridge.position.y - 0.11, 0);
      deck.castShadow = true;
      deck.receiveShadow = true;
      bridge.add(deck);
    }
    [-3.9, 3.9].forEach(z => {
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
      sectionBody.addShape(new CANNON.Box(new CANNON.Vec3(2, 0.18, 4.2)));
      sectionBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, 1, 0),
        bridge.rotation.y
      );
      this.world.addBody(sectionBody);
    }

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


  _buildAshenSettlement() {
    const settlementGround = this.terrainHeight(SETTLEMENT.x, SETTLEMENT.z);
    const town = new THREE.Group();
    town.position.set(SETTLEMENT.x, settlementGround, SETTLEMENT.z);
    this.scene.add(town);
    town.updateMatrixWorld(true);
    this._buildCityFortifications(town);

    const stonePlaster = [
      0xe2d3b5, 0xd0b27f, 0xc98d68, 0xb86c56,
      0xe8c99a, 0xaeb8a1, 0xb6aaa0, 0xd7bd93
    ].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true })
    );
    const plasterCanvas = document.createElement('canvas');
    plasterCanvas.width = 128;
    plasterCanvas.height = 128;
    const plasterContext = plasterCanvas.getContext('2d');
    if (!plasterContext) throw new Error('Unable to create Ashen Settlement plaster texture.');
    plasterContext.fillStyle = '#e6dfd0';
    plasterContext.fillRect(0, 0, 128, 128);
    for (let fleck = 0; fleck < 700; fleck += 1) {
      const shade = Math.floor(100 + Math.random() * 100);
      plasterContext.fillStyle = `rgba(${shade}, ${shade - 8}, ${shade - 18}, 0.16)`;
      plasterContext.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const plasterTexture = new THREE.CanvasTexture(plasterCanvas);
    plasterTexture.colorSpace = THREE.SRGBColorSpace;
    plasterTexture.wrapS = THREE.RepeatWrapping;
    plasterTexture.wrapT = THREE.RepeatWrapping;
    plasterTexture.repeat.set(2, 2);
    this.worldTextures.push(plasterTexture);
    stonePlaster.forEach(material => {
      material.map = plasterTexture;
      material.needsUpdate = true;
    });
    const darkTimber = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 0.94 });
    const agedPlank = new THREE.MeshStandardMaterial({ color: 0x5a4635, roughness: 0.9 });
    const churchSandstone = new THREE.MeshStandardMaterial({ color: 0xc7b99d, roughness: 0.88, flatShading: true });
    const slateRoof = [0x9b543e, 0x864939, 0x6f4037].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.74, flatShading: true })
    );
    const terracottaRoof = new THREE.MeshStandardMaterial({ color: 0x854636, roughness: 0.82, flatShading: true });
    const stainedGlass = new THREE.MeshStandardMaterial({
      color: 0xffb359,
      emissive: 0xff7711,
      emissiveIntensity: 1.6,
      roughness: 0.25
    });
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0xb59e74,
      emissive: 0xdf9d54,
      emissiveIntensity: 0.2,
      roughness: 0.35
    });
    const awningStripedRed = new THREE.MeshStandardMaterial({ color: 0x943228, roughness: 0.85 });
    const awningStripedGreen = new THREE.MeshStandardMaterial({ color: 0x2d593e, roughness: 0.85 });
    const ironMaterial = new THREE.MeshStandardMaterial({ color: 0x252a2e, roughness: 0.5, metalness: 0.75 });
    const signPlank = new THREE.MeshStandardMaterial({ color: 0x533c2a, roughness: 0.9 });
    const signMaterialFor = title => {
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 144;
      const context = signCanvas.getContext('2d');
      if (!context) throw new Error('Unable to create an Ashen Settlement establishment sign.');
      context.fillStyle = '#d7c49c';
      context.fillRect(0, 0, signCanvas.width, signCanvas.height);
      context.strokeStyle = '#594430';
      context.lineWidth = 8;
      context.strokeRect(8, 8, signCanvas.width - 16, signCanvas.height - 16);
      context.fillStyle = '#35281e';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.font = '32px Georgia';
      const words = title.split(/\s+/);
      const lines = [];
      let line = '';
      words.forEach(word => {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > 460 && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      const lineHeight = 38;
      const firstLineY = signCanvas.height / 2 - ((Math.min(lines.length, 2) - 1) * lineHeight) / 2;
      lines.slice(0, 2).forEach((text, index) => {
        context.fillText(text, signCanvas.width / 2, firstLineY + index * lineHeight, 460);
      });
      const texture = new THREE.CanvasTexture(signCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.worldTextures.push(texture);
      return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82 });
    };

    const pavingCanvas = document.createElement('canvas');
    pavingCanvas.width = 512;
    pavingCanvas.height = 512;
    const pavingContext = pavingCanvas.getContext('2d');
    if (!pavingContext) throw new Error('Unable to create Ashen Settlement paving texture.');
    pavingContext.fillStyle = '#756f64';
    pavingContext.fillRect(0, 0, 512, 512);
    const pavingColors = ['#837d71', '#777166', '#8a8376', '#706b62', '#918979'];
    for (let row = 0; row < 22; row += 1) {
      for (let column = 0; column < 16; column += 1) {
        const x = column * 32 - (row % 2) * 16;
        const y = row * 24;
        pavingContext.fillStyle = pavingColors[Math.floor(Math.random() * pavingColors.length)];
        pavingContext.fillRect(x + 1, y + 1, 30, 22);
      }
    }
    const pavingTexture = new THREE.CanvasTexture(pavingCanvas);
    pavingTexture.colorSpace = THREE.SRGBColorSpace;
    this.worldTextures.push(pavingTexture);
    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: pavingTexture,
      roughness: 0.96
    });
    const walkwayMaterial = new THREE.MeshStandardMaterial({
      color: 0x777367,
      roughness: 0.94,
      flatShading: true
    });
    const plazaShape = new THREE.Shape();
    plazaShape.moveTo(-11, -8);
    plazaShape.lineTo(9, -8);
    plazaShape.lineTo(12, -5);
    plazaShape.lineTo(12, 6);
    plazaShape.lineTo(9, 9);
    plazaShape.lineTo(-9, 9);
    plazaShape.lineTo(-12, 6);
    plazaShape.lineTo(-12, -5);
    plazaShape.closePath();
    const plaza = new THREE.Mesh(new THREE.ShapeGeometry(plazaShape), plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.12;
    plaza.receiveShadow = true;
    town.add(plaza);

    const plazaBorderMaterial = new THREE.MeshStandardMaterial({ color: 0xaaa18e, roughness: 0.9 });
    const plazaBorder = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-11, 0.19, -8),
        new THREE.Vector3(9, 0.19, -8),
        new THREE.Vector3(12, 0.19, -5),
        new THREE.Vector3(12, 0.19, 6),
        new THREE.Vector3(9, 0.19, 9),
        new THREE.Vector3(-9, 0.19, 9),
        new THREE.Vector3(-12, 0.19, 6),
        new THREE.Vector3(-12, 0.19, -5)
      ]),
      plazaBorderMaterial
    );
    plazaBorder.computeLineDistances();
    town.add(plazaBorder);

    const plazaBarrier = (x, z, halfWidth, halfDepth) => {
      const barrier = new THREE.Mesh(
        new THREE.BoxGeometry(halfWidth * 2, 0.36, halfDepth * 2),
        plazaBorderMaterial
      );
      barrier.position.set(x, 0.18, z);
      barrier.castShadow = true;
      town.add(barrier);
      const body = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(SETTLEMENT.x + x, settlementGround + 0.18, SETTLEMENT.z + z)
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(halfWidth, 0.18, halfDepth)));
      this.world.addBody(body);
    };
    [-6, 6].forEach(x => {
        plazaBarrier(x, -9.5, 5, 0.25);
        plazaBarrier(x, 9.5, 5, 0.25);
    });
    [-4, 4].forEach(z => {
      plazaBarrier(-12.5, z, 0.25, 3.5);
      plazaBarrier(12.5, z, 0.25, 3.5);
    });
    const plazaBollard = (x, z) => {
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.26, 0.34, 1, 8),
        churchSandstone
      );
      bollard.position.set(x, 0.5, z);
      bollard.castShadow = true;
      town.add(bollard);
      const body = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(SETTLEMENT.x + x, settlementGround + 0.5, SETTLEMENT.z + z)
      });
      body.addShape(new CANNON.Cylinder(0.34, 0.34, 1, 8));
      this.world.addBody(body);
    };
    [[-1.25, -9.5], [1.25, -9.5], [-1.25, 9.5], [1.25, 9.5],
      [-12.5, -1.25], [-12.5, 1.25], [12.5, -1.25], [12.5, 1.25]]
      .forEach(([x, z]) => plazaBollard(x, z));
    const squareWalkway = (x, z, width, depth) => {
      const path = new THREE.Mesh(
        new THREE.BoxGeometry(width, 0.07, depth),
        walkwayMaterial
      );
      path.position.set(x, 0.1, z);
      path.receiveShadow = true;
      town.add(path);
    };
    squareWalkway(-16, 0, 8, 1.6);
    squareWalkway(16, 0, 8, 1.6);
    squareWalkway(0, -12, 1.6, 6);
    squareWalkway(0, 13, 1.6, 6);

    const fountain = new THREE.Group();
    const fountainStone = new THREE.MeshStandardMaterial({ color: 0xb6a78b, roughness: 0.86, flatShading: true });
    const fountainWater = new THREE.MeshStandardMaterial({
      color: 0x77aaa6,
      roughness: 0.24,
      metalness: 0.12
    });
    const fountainBasin = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.8, 0.8, 12), fountainStone);
    fountainBasin.position.y = 0.48;
    fountainBasin.castShadow = true;
    fountain.add(fountainBasin);
    const fountainPool = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.35, 0.12, 12), fountainWater);
    fountainPool.position.y = 0.91;
    fountain.add(fountainPool);
    const fountainColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1, 3.1, 8), fountainStone);
    fountainColumn.position.y = 2.25;
    fountainColumn.castShadow = true;
    fountain.add(fountainColumn);
    const fountainBowl = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 0.75, 0.7, 10), fountainStone);
    fountainBowl.position.y = 3.6;
    fountainBowl.castShadow = true;
    fountain.add(fountainBowl);
    const fountainWaterTop = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 0.08, 10), fountainWater);
    fountainWaterTop.position.y = 3.98;
    fountain.add(fountainWaterTop);
    fountain.position.set(0, 0, 0);
    town.add(fountain);
    const fountainCollider = new CANNON.Body({
      mass: 0,
      material: this.propMaterial,
      position: new CANNON.Vec3(SETTLEMENT.x, settlementGround + 1.1, SETTLEMENT.z)
    });
    fountainCollider.addShape(new CANNON.Box(new CANNON.Vec3(3.7, 1.1, 3.7)));
    this.world.addBody(fountainCollider);

    const chapel = new THREE.Group();
    const chapelBody = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 20), churchSandstone);
    chapelBody.position.y = 4;
    chapelBody.castShadow = true;
    chapelBody.receiveShadow = true;
    chapel.add(chapelBody);
    [-1, 1].forEach(side => {
      const roofSlope = new THREE.Mesh(new THREE.BoxGeometry(10, 0.45, 21), slateRoof[0]);
      roofSlope.position.set(side * 4.2, 9.2, 0);
      roofSlope.rotation.z = side * -0.58;
      roofSlope.castShadow = true;
      chapel.add(roofSlope);
    });
    const bellTower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3, 9, 8), churchSandstone);
    bellTower.position.set(0, 12.5, 4.7);
    bellTower.castShadow = true;
    chapel.add(bellTower);
    const bellRoof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 5.5, 4), slateRoof[1]);
    bellRoof.position.set(0, 20, 4.7);
    bellRoof.rotation.y = Math.PI / 4;
    chapel.add(bellRoof);
    const chapelDoor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.6, 0.18), darkTimber);
    chapelDoor.position.set(0, 2.3, 10.1);
    chapel.add(chapelDoor);
    const chapelDoorArch = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.28, 8, 20, Math.PI),
      churchSandstone
    );
    chapelDoorArch.position.set(0, 2.5, 10.18);
    chapel.add(chapelDoorArch);
    [-1, 1].forEach(side => {
      const window = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.2, 0.22), stainedGlass);
      window.position.set(side * 5.3, 4.8, 10.05);
      chapel.add(window);
      [-6, 0, 6].forEach(windowZ => {
        const buttress = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 8.8, 1.4),
          churchSandstone
        );
        buttress.position.set(side * 8.1, 4.4, windowZ);
        buttress.castShadow = true;
        chapel.add(buttress);
        if (windowZ !== -6 && windowZ !== 6) return;
        const lancet = new THREE.Mesh(
          new THREE.BoxGeometry(0.24, 2.8, 1.2),
          stainedGlass
        );
        lancet.position.set(side * 8.12, 4.6, windowZ * 0.5);
        chapel.add(lancet);
      });
    });
    const chapelLight = new THREE.PointLight(0xff9944, 1.4, 20, 1.8);
    chapelLight.position.set(0, 5, 8);
    chapel.add(chapelLight);
    const chapelGround = this.terrainHeight(SETTLEMENT.x + 118, SETTLEMENT.z - 105);
    chapel.position.set(118, chapelGround - settlementGround, -105);
    town.add(chapel);

    const chapelCollider = new CANNON.Body({
      mass: 0,
      material: this.propMaterial,
      position: new CANNON.Vec3(SETTLEMENT.x + 118, chapelGround + 4, SETTLEMENT.z - 105)
    });
    chapelCollider.addShape(new CANNON.Box(new CANNON.Vec3(8.3, 4, 10.3)));
    this.world.addBody(chapelCollider);

    const guardSkin = new THREE.MeshStandardMaterial({ color: 0xc49673, roughness: 0.9 });
    const guardArmor = new THREE.MeshStandardMaterial({ color: 0x6e7880, metalness: 0.75, roughness: 0.35 });
    const guardCoat = new THREE.MeshStandardMaterial({ color: 0x962822, roughness: 0.8 });

    const gateGuardGroup = new THREE.Group();
    gateGuardGroup.position.set(-92, 0, 0);
    gateGuardGroup.rotation.y = Math.PI / 2;
    [-9, 9].forEach(gx => {
      const guard = new THREE.Group();
      guard.position.set(gx, 0, 5);
      guard.rotation.y = Math.PI;

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.44, 1.45, 8), guardCoat);
      body.position.y = 0.9;
      body.castShadow = true;
      guard.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), guardSkin);
      head.position.y = 1.76;
      guard.add(head);

      const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.42, 8), guardArmor);
      helmet.position.y = 1.98;
      guard.add(helmet);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.9, 6), darkTimber);
      pole.position.set(0.42, 1.45, 0.15);
      guard.add(pole);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.04), guardArmor);
      blade.position.set(0.42, 2.7, 0.15);
      guard.add(blade);

      gateGuardGroup.add(guard);
    });
    town.add(gateGuardGroup);

    this.settlementTopics = [];

    ASHEN_SETTLEMENT_BUILDINGS.forEach((bldg, index) => {
      const worldX = SETTLEMENT.x + bldg.x;
      const worldZ = SETTLEMENT.z + bldg.z;
      const definition = this.settlementTopicDefinitions[index];
      const topicId = definition?.id ?? `settlement-house-${index + 1}`;
      const isLit = this.litSettlementTopicIds.has(topicId);

      const house = new THREE.Group();
      const bodyHeight = bldg.type === 'ruin' ? bldg.h * 0.68 : bldg.h;
      const bodyWidth = bldg.w;
      const bodyDepth = bldg.d;

      const bodyMaterial = bldg.type === 'warehouse'
        ? agedPlank
        : stonePlaster[bldg.color % stonePlaster.length];
      if (bldg.type === 'townhouse' || bldg.type === 'merchant') {
        const lowerHeight = bodyHeight * 0.52;
        const lowerStorey = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth * 0.94, lowerHeight, bodyDepth * 0.92),
          bodyMaterial
        );
        lowerStorey.position.y = lowerHeight / 2;
        lowerStorey.castShadow = true;
        lowerStorey.receiveShadow = true;
        house.add(lowerStorey);
        const upperStorey = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth + 0.45, bodyHeight - lowerHeight, bodyDepth + 0.35),
          bodyMaterial
        );
        upperStorey.position.y = lowerHeight + (bodyHeight - lowerHeight) / 2;
        upperStorey.castShadow = true;
        upperStorey.receiveShadow = true;
        house.add(upperStorey);
        [-1, 1].forEach(side => {
          const corbel = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 1.15, 0.24),
            darkTimber
          );
          corbel.position.set(side * bodyWidth * 0.34, lowerHeight - 0.28, bodyDepth / 2 + 0.3);
          corbel.rotation.z = side * 0.48;
          house.add(corbel);
        });
      } else {
        const bodyMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyDepth),
          bodyMaterial
        );
        bodyMesh.position.y = bodyHeight / 2;
        bodyMesh.castShadow = true;
        bodyMesh.receiveShadow = true;
        house.add(bodyMesh);
      }
      const stoneFooting = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth + 0.7, 0.62, bodyDepth + 0.7),
        stonePlaster[0]
      );
      stoneFooting.position.y = 0.31;
      stoneFooting.castShadow = true;
      stoneFooting.receiveShadow = true;
      house.add(stoneFooting);

      if (bldg.type === 'townhouse' || bldg.type === 'merchant') {
        const timberBand = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth + 0.35, 0.28, bodyDepth + 0.35),
          darkTimber
        );
        timberBand.position.y = bodyHeight * 0.58;
        timberBand.castShadow = true;
        house.add(timberBand);
        const frontCornice = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth + 0.55, 0.22, 0.42),
          stonePlaster[0]
        );
        frontCornice.position.set(0, bodyHeight - 0.28, bodyDepth / 2 + 0.12);
        house.add(frontCornice);
      }
      if (bldg.type === 'warehouse') {
        for (let plankIndex = 1; plankIndex < 5; plankIndex += 1) {
          const plank = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth + 0.08, 0.12, 0.14),
            darkTimber
          );
          plank.position.set(0, plankIndex * 0.78, bodyDepth / 2 + 0.05);
          house.add(plank);
        }
      }

      if (bldg.type === 'townhouse' || bldg.type === 'merchant') {
        [-1, 1].forEach(sx => {
          [-1, 1].forEach(sz => {
            const cornerPost = new THREE.Mesh(
              new THREE.BoxGeometry(0.28, bodyHeight, 0.28),
              darkTimber
            );
            cornerPost.position.set(sx * (bodyWidth / 2 - 0.05), bodyHeight / 2, sz * (bodyDepth / 2 - 0.05));
            cornerPost.castShadow = true;
            house.add(cornerPost);
          });
        });
      }

      if (bldg.type === 'ruin') {
        const brokenRoof = new THREE.Mesh(
          new THREE.BoxGeometry(bodyWidth * 0.62, 0.34, bodyDepth + 0.6),
          slateRoof[2]
        );
        brokenRoof.position.set(-bodyWidth * 0.16, bodyHeight + 0.25, 0);
        brokenRoof.rotation.z = -0.28;
        brokenRoof.castShadow = true;
        house.add(brokenRoof);
      } else if (bldg.roof === 'gable') {
        [-1, 1].forEach(side => {
          const roofPlane = new THREE.Mesh(
            new THREE.BoxGeometry(bodyWidth * 0.6, 0.28, bodyDepth + 1.1),
            slateRoof[index % slateRoof.length]
          );
          roofPlane.position.set(side * (bodyWidth * 0.28), bodyHeight + 1.6, 0);
          roofPlane.rotation.z = side * -0.52;
          roofPlane.castShadow = true;
          roofPlane.receiveShadow = true;
          house.add(roofPlane);
        });
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.38, bodyDepth + 1.35),
          slateRoof[index % slateRoof.length]
        );
        ridge.position.y = bodyHeight + 2.55;
        ridge.castShadow = true;
        house.add(ridge);
        const gableShape = new THREE.Shape();
        gableShape.moveTo(-bodyWidth / 2, bodyHeight - 0.15);
        gableShape.lineTo(bodyWidth / 2, bodyHeight - 0.15);
        gableShape.lineTo(0, bodyHeight + 2.55);
        gableShape.closePath();
        const gableFront = new THREE.Mesh(
          new THREE.ShapeGeometry(gableShape),
          stonePlaster[bldg.color % stonePlaster.length]
        );
        gableFront.position.z = bodyDepth / 2 + 0.13;
        house.add(gableFront);
        const gableBack = gableFront.clone();
        gableBack.position.z = -bodyDepth / 2 - 0.13;
        gableBack.rotation.y = Math.PI;
        house.add(gableBack);
      } else if (bldg.roof === 'hip') {
        const hipRoof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(bodyWidth, bodyDepth) * 0.72, 3.4, 4),
          terracottaRoof
        );
        hipRoof.position.y = bodyHeight + 1.7;
        hipRoof.rotation.y = Math.PI / 4;
        hipRoof.castShadow = true;
        house.add(hipRoof);
      } else {
        const hipRoof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(bodyWidth, bodyDepth) * 0.72, 3.8, 4),
          bldg.roof === 'parapet' ? slateRoof[0] : terracottaRoof
        );
        hipRoof.position.y = bodyHeight + 1.9;
        hipRoof.rotation.y = Math.PI / (bldg.roof === 'parapet' ? 4 : 2);
        hipRoof.castShadow = true;
        house.add(hipRoof);
      }

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.8, 0.8), stonePlaster[3]);
      chimney.position.set(bodyWidth * 0.28, bodyHeight + 1.8, bodyDepth * 0.2);
      chimney.castShadow = true;
      house.add(chimney);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 2.5, 0.18),
        darkTimber
      );
      door.position.set(0, 1.25, bodyDepth / 2 + 0.05);
      house.add(door);
      [-0.88, 0.88].forEach(side => {
        const jamb = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 2.8, 0.3),
          stonePlaster[0]
        );
        jamb.position.set(side, 1.4, bodyDepth / 2 + 0.16);
        house.add(jamb);
      });
      const doorLintel = new THREE.Mesh(
        new THREE.BoxGeometry(2.05, 0.28, 0.38),
        stonePlaster[0]
      );
      doorLintel.position.set(0, 2.78, bodyDepth / 2 + 0.18);
      house.add(doorLintel);
      const doorHandle = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xc69b58, metalness: 0.65, roughness: 0.38 })
      );
      doorHandle.position.set(0.38, 1.35, bodyDepth / 2 + 0.16);
      house.add(doorHandle);
      const shopSign = new THREE.Mesh(
        new THREE.BoxGeometry(Math.min(bodyWidth - 1, 7.8), 1.08, 0.28),
        signPlank
      );
      shopSign.position.set(0, 4.35, bodyDepth / 2 + 0.2);
      shopSign.castShadow = true;
      house.add(shopSign);
      const signFace = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(bodyWidth - 1.5, 7.3), 0.76),
        signMaterialFor(bldg.name)
      );
      signFace.position.set(0, 4.35, bodyDepth / 2 + 0.36);
      house.add(signFace);
      const doorstep = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.24, 1.05),
        stonePlaster[0]
      );
      doorstep.position.set(0, 0.12, bodyDepth / 2 + 0.58);
      doorstep.receiveShadow = true;
      house.add(doorstep);

      const windowMaterials = [];
      [-bodyWidth * 0.28, bodyWidth * 0.28].forEach(wx => {
        [bodyHeight * 0.37, bodyHeight * 0.73].forEach(windowY => {
          const winMat = windowMaterial.clone();
          winMat.emissiveIntensity = isLit ? 1.8 : 0.42;
          windowMaterials.push(winMat);
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(1.52, 1.67, 0.14),
            stonePlaster[0]
          );
          frame.position.set(wx, windowY, bodyDepth / 2 + 0.04);
          house.add(frame);
          const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.35, 0.14), winMat);
          win.position.set(wx, windowY, bodyDepth / 2 + 0.13);
          house.add(win);
          const mullionV = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 1.25, 0.08),
            darkTimber
          );
          mullionV.position.set(wx, windowY, bodyDepth / 2 + 0.23);
          house.add(mullionV);
          [-0.38, 0.38].forEach(offsetY => {
            const mullionH = new THREE.Mesh(
              new THREE.BoxGeometry(1.1, 0.07, 0.08),
              darkTimber
            );
            mullionH.position.set(wx, windowY + offsetY, bodyDepth / 2 + 0.23);
            house.add(mullionH);
          });
          [-1, 1].forEach(side => {
            const shutter = new THREE.Mesh(
              new THREE.BoxGeometry(0.25, 1.46, 0.15),
              darkTimber
            );
            shutter.position.set(wx + side * 0.72, windowY, bodyDepth / 2 + 0.15);
            house.add(shutter);
          });
          const sill = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.16, 0.34),
            stonePlaster[0]
          );
          sill.position.set(wx, windowY - 0.82, bodyDepth / 2 + 0.15);
          house.add(sill);
        });
      });

      if (bldg.type === 'merchant') {
        const awning = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 0.16, 1.45),
          index % 2 === 0 ? awningStripedRed : awningStripedGreen
        );
        awning.position.set(0, 3.15, bodyDepth / 2 + 0.68);
        awning.rotation.x = 0.2;
        house.add(awning);
        const lintel = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 0.24, 0.28),
          darkTimber
        );
        lintel.position.set(0, 3.42, bodyDepth / 2 + 0.12);
        house.add(lintel);
      }

      const lampMaterial = new THREE.MeshStandardMaterial({
        color: isLit ? 0xffdfa8 : 0x544a3e,
        emissive: isLit ? 0xffa044 : 0x241a12,
        emissiveIntensity: isLit ? 2.4 : 0.2,
        roughness: 0.32
      });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampMaterial);
      lamp.position.set(0, 3.2, bodyDepth / 2 + 0.85);
      house.add(lamp);

      const lampGlow = new THREE.PointLight(0xffb25a, isLit ? 2.2 : 0.08, 18, 2);
      lampGlow.position.copy(lamp.position);
      house.add(lampGlow);

      const localGroundY = this.terrainHeight(worldX, worldZ) - settlementGround;
      house.position.set(bldg.x, localGroundY, bldg.z);
      house.rotation.y = bldg.rot;
      town.add(house);

      this.settlementTopics.push({
        id: topicId,
        title: definition?.title ?? `Backend topic ${index + 1}`,
        establishment: bldg.name,
        district: bldg.district,
        x: worldX + Math.sin(bldg.rot) * (bodyDepth / 2 + 2.5),
        z: worldZ + Math.cos(bldg.rot) * (bodyDepth / 2 + 2.5),
        lit: isLit,
        lampMaterial,
        lampGlow,
        windowMaterials
      });

      const collider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldX, this.terrainHeight(worldX, worldZ) + bodyHeight / 2, worldZ)
      });
      collider.addShape(new CANNON.Box(new CANNON.Vec3(bodyWidth / 2 + 0.2, bodyHeight / 2, bodyDepth / 2 + 0.2)));
      collider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), bldg.rot);
      this.world.addBody(collider);
    });

    const rowhouseWindow = new THREE.MeshStandardMaterial({
      color: 0xcaa46c,
      emissive: 0x8c5425,
      emissiveIntensity: 0.28,
      roughness: 0.32
    });
    const rowhouseSpecs = SETTLEMENT_ROWHOUSE_LAYOUT.map(({ x, z, w, d, rot }, index) => [
      x,
      z,
      w,
      d,
      9 + ((index * 3) % 4),
      rot
    ]);
    rowhouseSpecs.forEach(([x, z, width, depth, height, rotation], index) => {
      const house = new THREE.Group();
      const facade = stonePlaster[(index + 2) % stonePlaster.length];
      const lowerFloorHeight = height * 0.48;
      const lowerStorey = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.92, lowerFloorHeight, depth * 0.9),
        facade
      );
      lowerStorey.position.y = lowerFloorHeight / 2;
      lowerStorey.castShadow = true;
      lowerStorey.receiveShadow = true;
      house.add(lowerStorey);
      const upperStorey = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.45, height - lowerFloorHeight, depth + 0.35),
        facade
      );
      upperStorey.position.y = lowerFloorHeight + (height - lowerFloorHeight) / 2;
      upperStorey.castShadow = true;
      upperStorey.receiveShadow = true;
      house.add(upperStorey);
      const footing = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.65, 0.58, depth + 0.65),
        stonePlaster[0]
      );
      footing.position.y = 0.29;
      footing.castShadow = true;
      footing.receiveShadow = true;
      house.add(footing);

      const floorBand = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.35, 0.28, depth + 0.35),
        darkTimber
      );
      floorBand.position.y = height * 0.58;
      house.add(floorBand);
      const eaveBand = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.55, 0.24, depth + 0.55),
        stonePlaster[0]
      );
      eaveBand.position.y = height - 0.24;
      house.add(eaveBand);
      [-1, 1].forEach(side => {
        const corbel = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 1.05, 0.2),
          darkTimber
        );
        corbel.position.set(side * (width / 2 - 0.9), lowerFloorHeight - 0.24, depth / 2 + 0.28);
        corbel.rotation.z = side * 0.48;
        house.add(corbel);
      });

      if (index % 4 === 0 || index % 4 === 2) {
        [-1, 1].forEach(side => {
          const roofPlane = new THREE.Mesh(
            new THREE.BoxGeometry(width * 0.62, 0.32, depth + 0.8),
            slateRoof[(index + 1) % slateRoof.length]
          );
          roofPlane.position.set(side * width * 0.27, height + 1.55, 0);
          roofPlane.rotation.z = side * -0.52;
          roofPlane.castShadow = true;
          roofPlane.receiveShadow = true;
          house.add(roofPlane);
          [-1, 1].forEach(end => {
            const fascia = new THREE.Mesh(
              new THREE.BoxGeometry(width * 0.62, 0.24, 0.24),
              darkTimber
            );
            fascia.position.set(side * width * 0.27, height + 1.55, end * (depth / 2 + 0.32));
            fascia.rotation.z = side * -0.52;
            house.add(fascia);
          });
        });
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.34, depth + 1.1),
          slateRoof[(index + 1) % slateRoof.length]
        );
        ridge.position.y = height + 2.5;
        house.add(ridge);
        const gableShape = new THREE.Shape();
        gableShape.moveTo(-width / 2, height - 0.12);
        gableShape.lineTo(width / 2, height - 0.12);
        gableShape.lineTo(0, height + 2.5);
        gableShape.closePath();
        const gable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), facade);
        gable.position.z = depth / 2 + 0.13;
        house.add(gable);
        const backGable = gable.clone();
        backGable.position.z = -depth / 2 - 0.13;
        backGable.rotation.y = Math.PI;
        house.add(backGable);
      } else if (index % 4 === 1) {
        const hipRoof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 3.8, 4),
          terracottaRoof
        );
        hipRoof.position.y = height + 1.9;
        hipRoof.rotation.y = Math.PI / 4;
        hipRoof.castShadow = true;
        house.add(hipRoof);
      } else {
        const hipRoof = new THREE.Mesh(
          new THREE.ConeGeometry(Math.max(width, depth) * 0.72, 3.8, 4),
          slateRoof[index % slateRoof.length]
        );
        hipRoof.position.y = height + 1.9;
        hipRoof.rotation.y = Math.PI / (index % 4 === 1 ? 4 : 2);
        hipRoof.castShadow = true;
        house.add(hipRoof);
      }

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.8, 1.05), stonePlaster[3]);
      chimney.position.set(width * 0.28, height + 2, -depth * 0.22);
      chimney.castShadow = true;
      house.add(chimney);

      const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.8, 0.18), darkTimber);
      door.position.set(0, 1.4, depth / 2 + 0.1);
      house.add(door);
      [-0.95, 0.95].forEach(side => {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.35, 0.28), stonePlaster[0]);
        jamb.position.set(side, 1.35, depth / 2 + 0.18);
        house.add(jamb);
      });
      const doorwayArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.9, 0.14, 6, 14, Math.PI),
        stonePlaster[0]
      );
      doorwayArch.position.set(0, 2.12, depth / 2 + 0.2);
      house.add(doorwayArch);
      const doorstep = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.22, 1.25), stonePlaster[0]);
      doorstep.position.set(0, 0.11, depth / 2 + 0.68);
      house.add(doorstep);
      const doorHandle = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 6, 5),
        new THREE.MeshStandardMaterial({ color: 0xc69b58, metalness: 0.65, roughness: 0.38 })
      );
      doorHandle.position.set(0.42, 1.45, depth / 2 + 0.22);
      house.add(doorHandle);

      [-1, 1].forEach(side => {
        [height * 0.28, height * 0.72].forEach(windowY => {
          const frame = new THREE.Mesh(new THREE.BoxGeometry(1.58, 1.72, 0.16), stonePlaster[0]);
          frame.position.set(side * width * 0.25, windowY, depth / 2 + 0.04);
          house.add(frame);
          const window = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.4, 0.16), rowhouseWindow);
          window.position.set(side * width * 0.25, windowY, depth / 2 + 0.14);
          house.add(window);
          const windowArch = new THREE.Mesh(
            new THREE.TorusGeometry(0.68, 0.1, 6, 12, Math.PI),
            stonePlaster[0]
          );
          windowArch.position.set(side * width * 0.25, windowY + 0.65, depth / 2 + 0.24);
          house.add(windowArch);
          const mullionV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.08), darkTimber);
          mullionV.position.set(side * width * 0.25, windowY, depth / 2 + 0.24);
          house.add(mullionV);
          const mullionH = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.08, 0.08), darkTimber);
          mullionH.position.set(side * width * 0.25, windowY, depth / 2 + 0.24);
          house.add(mullionH);
          [-1, 1].forEach(shutterSide => {
            const shutter = new THREE.Mesh(
              new THREE.BoxGeometry(0.28, 1.55, 0.2),
              darkTimber
            );
            shutter.position.set(
              side * width * 0.25 + shutterSide * 0.83,
              windowY,
              depth / 2 + 0.12
            );
            house.add(shutter);
          });
          const sill = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 0.36), stonePlaster[0]);
          sill.position.set(side * width * 0.25, windowY - 0.88, depth / 2 + 0.18);
          house.add(sill);
          if (windowY < height * 0.5 && index % 3 === 0) {
            const flowerBox = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.32, 0.5), agedPlank);
            flowerBox.position.set(side * width * 0.25, windowY - 1.15, depth / 2 + 0.48);
            house.add(flowerBox);
            const flowers = new THREE.Mesh(
              new THREE.BoxGeometry(1.25, 0.22, 0.35),
              new THREE.MeshStandardMaterial({ color: index % 2 ? 0x8b6842 : 0x566744, roughness: 0.95 })
            );
            flowers.position.set(side * width * 0.25, windowY - 0.91, depth / 2 + 0.48);
            house.add(flowers);
          }
        });
      });

      if (index % 2 === 0) {
        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.72, 0.28, 1.4),
          darkTimber
        );
        balcony.position.set(0, height * 0.56, depth / 2 + 0.65);
        house.add(balcony);
        const railing = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.72, 0.9, 0.18),
          darkTimber
        );
        railing.position.set(0, height * 0.56 + 0.56, depth / 2 + 1.24);
        house.add(railing);
        for (let baluster = -2; baluster <= 2; baluster += 1) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 0.14), stonePlaster[0]);
          post.position.set(baluster * width * 0.12, height * 0.56 + 0.56, depth / 2 + 1.24);
          house.add(post);
        }
      }

      const worldX = SETTLEMENT.x + x;
      const worldZ = SETTLEMENT.z + z;
      const groundY = this.terrainHeight(worldX, worldZ);
      house.position.set(x, groundY - settlementGround, z);
      house.rotation.y = rotation;
      town.add(house);

      const collider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldX, groundY + height / 2, worldZ)
      });
      collider.addShape(new CANNON.Box(new CANNON.Vec3(width / 2 + 0.3, height / 2, depth / 2 + 0.3)));
      collider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
      this.world.addBody(collider);
    });

    const crateGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const barrelGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.05, 8);
    [
      [150, -51], [152, -50], [154, -51], [150, -48]
    ].forEach(([cx, cz], i) => {
      const isBarrel = i % 2 === 0;
      const prop = new THREE.Mesh(isBarrel ? barrelGeo : crateGeo, agedPlank);
      prop.position.set(cx, 0.5, cz);
      prop.castShadow = true;
      town.add(prop);
    });

    const cartGroup = new THREE.Group();
    cartGroup.position.set(160, 0.5, -47);
    cartGroup.rotation.y = -0.4;
    const cartBed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.35, 4.2), agedPlank);
    cartBed.position.y = 0.6;
    cartGroup.add(cartBed);
    [-1.3, 1.3].forEach(wx => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.16, 12), darkTimber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.65, 0);
      cartGroup.add(wheel);
    });
    town.add(cartGroup);

    const marketStall = (x, z, clothMaterial, rotation) => {
      const stall = new THREE.Group();
      stall.position.set(x, this.terrainHeight(SETTLEMENT.x + x, SETTLEMENT.z + z) - settlementGround, z);
      stall.rotation.y = rotation;
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.2), agedPlank);
      counter.position.y = 0.5;
      stall.add(counter);
      [-1.4, 1.4].forEach(postX => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.5, 0.12), darkTimber);
        post.position.set(postX, 1.25, -0.5);
        stall.add(post);
      });
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 2.2), clothMaterial);
      canopy.position.set(0, 2.45, -0.5);
      canopy.rotation.x = -0.06;
      stall.add(canopy);
      for (let crateIndex = 0; crateIndex < 2; crateIndex += 1) {
        const crate = new THREE.Mesh(crateGeo, agedPlank);
        crate.position.set((crateIndex - 0.5) * 1.1, 0.52, 1.1);
        stall.add(crate);
      }
      town.add(stall);
    };
    marketStall(-7, 0, awningStripedRed, Math.PI / 2);
    marketStall(7, 0, awningStripedGreen, -Math.PI / 2);

    const streetLampMetal = new THREE.MeshStandardMaterial({ color: 0x343737, metalness: 0.68, roughness: 0.54 });
    const streetLampGlow = new THREE.MeshStandardMaterial({
      color: 0xffd18a,
      emissive: 0xffa34d,
      emissiveIntensity: 1.7,
      roughness: 0.35
    });
    const addStreetLamp = (x, z, facing) => {
      const worldX = SETTLEMENT.x + x;
      const worldZ = SETTLEMENT.z + z;
      const groundY = this.terrainHeight(worldX, worldZ);
      const lamp = new THREE.Group();
      lamp.position.set(x, groundY - settlementGround, z);
      lamp.rotation.y = facing;
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.68, 0.34, 8), churchSandstone);
      plinth.position.y = 0.17;
      lamp.add(plinth);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.24, 4.25, 8), streetLampMetal);
      post.position.y = 2.4;
      post.castShadow = true;
      lamp.add(post);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.9), streetLampMetal);
      arm.position.set(0, 4.42, 0.35);
      lamp.add(arm);
      const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.58), streetLampGlow);
      lantern.position.set(0, 4.12, 0.78);
      lamp.add(lantern);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.45, 4), streetLampMetal);
      cap.position.set(0, 4.72, 0.78);
      cap.rotation.y = Math.PI / 4;
      lamp.add(cap);
      const light = new THREE.PointLight(0xffb25a, 0.9, 20, 2);
      light.position.copy(lantern.position);
      lamp.add(light);
      town.add(lamp);
      const collider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldX, groundY + 2.3, worldZ)
      });
      collider.addShape(new CANNON.Cylinder(0.24, 0.24, 4.3, 8));
      this.world.addBody(collider);
    };
    [
      [-55, -23.2, 0], [0, -23.2, 0], [50, -23.2, 0], [100, -23.2, 0],
      [-55, 23.2, Math.PI], [0, 23.2, Math.PI], [50, 23.2, Math.PI], [100, 23.2, Math.PI],
      [0, -63.2, 0], [50, -63.2, 0], [100, -63.2, 0],
      [0, 63.2, Math.PI], [50, 63.2, Math.PI], [100, 63.2, Math.PI],
      [148.2, -40, -Math.PI / 2], [148.2, 40, -Math.PI / 2]
    ].forEach(([x, z, facing]) => addStreetLamp(x, z, facing));

    this._buildSettlementOutskirts(settlementGround, town, {
      stonePlaster,
      darkTimber,
      agedPlank,
      slateRoof,
      terracottaRoof,
      churchSandstone
    });
    this._buildHighlandHamlet(settlementGround, town, {
      stonePlaster,
      darkTimber,
      agedPlank,
      terracottaRoof,
      churchSandstone
    });
    this._buildSettlementHarbor(settlementGround, town);
    this._buildSettlementLife();
  }

  _buildSettlementOutskirts(settlementGround, town, materials) {
    const { stonePlaster, darkTimber, agedPlank, slateRoof, terracottaRoof, churchSandstone } = materials;
    const approachIndex = ROAD_DEFINITIONS.findIndex(road => road.from === 3 && road.to === 4);
    const approach = this.roadCurves[approachIndex];
    if (!approach) throw new Error('Unable to build the Ashen Settlement roadside homesteads.');

    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x78684f, roughness: 1 });
    const buildFootpath = (roadPoint, sideNormal, side, houseWorldX, houseWorldZ, frontX, frontZ, depth) => {
      const start = new THREE.Vector3(
        roadPoint.x + sideNormal.x * side * 16,
        0,
        roadPoint.z + sideNormal.z * side * 5.4
      );
      const end = new THREE.Vector3(
        houseWorldX + frontX * (depth / 2 + 1),
        0,
        houseWorldZ + frontZ * (depth / 2 + 1)
      );
      const pathCurve = new THREE.CatmullRomCurve3([
        start,
        new THREE.Vector3(
          (start.x + end.x) / 2 + sideNormal.x * side * 1.5,
          0,
          (start.z + end.z) / 2 + sideNormal.z * side * 1.5
        ),
        end
      ], false, 'centripetal');
      const segments = 14;
      const vertices = [];
      const indices = [];
      for (let index = 0; index <= segments; index += 1) {
        const progress = index / segments;
        const point = pathCurve.getPointAt(progress);
        const tangent = pathCurve.getTangentAt(progress);
        const halfWidth = 1.1;
        const sideX = -tangent.z * halfWidth;
        const sideZ = tangent.x * halfWidth;
        const groundY = this.terrainHeight(point.x, point.z) + 0.06;
        vertices.push(
          point.x - sideX, groundY, point.z - sideZ,
          point.x + sideX, groundY, point.z + sideZ
        );
        if (index < segments) {
          const offset = index * 2;
          indices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const path = new THREE.Mesh(geometry, pathMaterial);
      path.receiveShadow = true;
      this.scene.add(path);
    };

    const outskirtsRoad = ROAD_DEFINITIONS.findIndex(road => road.to === 'settlement-highland-hamlet');
    if (outskirtsRoad < 0) throw new Error('Unable to connect the Ashen Settlement croft lane.');
    const accessRoads = [approach, this.roadCurves[outskirtsRoad]].filter(Boolean);
    const approachSamples = accessRoads.flatMap(curve => {
      const samples = curve.getSpacedPoints(140);
      return samples.map((point, index) => ({
        point,
        curve,
        progress: index / (samples.length - 1)
      }));
    });
    SETTLEMENT_ROADSIDE_HOMESTEADS.forEach(({ x, z, w: width, d: depth, h: height, type, color }, index) => {
      const worldX = SETTLEMENT.x + x;
      const worldZ = SETTLEMENT.z + z;
      const roadAccess = approachSamples.reduce((nearest, sample) =>
        Math.hypot(sample.point.x - worldX, sample.point.z - worldZ)
          < Math.hypot(nearest.point.x - worldX, nearest.point.z - worldZ)
          ? sample
          : nearest
      );
      const { point: roadPoint, curve, progress } = roadAccess;
      const tangent = curve.getTangentAt(progress);
      const sideNormal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const offsetX = worldX - roadPoint.x;
      const offsetZ = worldZ - roadPoint.z;
      const side = Math.sign(offsetX * sideNormal.x + offsetZ * sideNormal.z) || 1;
      const frontX = -sideNormal.x * side;
      const frontZ = -sideNormal.z * side;
      const rotation = Math.atan2(frontX, frontZ);
      const groundY = this.terrainHeight(worldX, worldZ);

      const house = new THREE.Group();
      const facade = stonePlaster[color];
      const footing = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.8, 0.62, depth + 0.8),
        churchSandstone
      );
      footing.position.y = 0.31;
      footing.castShadow = true;
      footing.receiveShadow = true;
      house.add(footing);

      if (type === 'inn') {
        const lowerHeight = 4.25;
        const lower = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.94, lowerHeight, depth * 0.92),
          facade
        );
        lower.position.y = lowerHeight / 2;
        lower.castShadow = true;
        lower.receiveShadow = true;
        house.add(lower);
        const upper = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.4, height - lowerHeight, depth + 0.3),
          facade
        );
        upper.position.y = lowerHeight + (height - lowerHeight) / 2;
        upper.castShadow = true;
        upper.receiveShadow = true;
        house.add(upper);
        const timberBand = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.55, 0.28, depth + 0.42),
          darkTimber
        );
        timberBand.position.y = lowerHeight;
        house.add(timberBand);
        [-1, 1].forEach(corner => {
          const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), darkTimber);
          corbel.position.set(corner * (width / 2 - 1), lowerHeight - 0.2, depth / 2 + 0.25);
          corbel.rotation.z = corner * 0.42;
          house.add(corbel);
        });
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), facade);
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        house.add(body);
      }

      const roofMaterial = index % 2 === 0 ? terracottaRoof : slateRoof[index % slateRoof.length];
      [-1, 1].forEach(roofSide => {
        const roofPlane = new THREE.Mesh(
          new THREE.BoxGeometry(width * 0.62, 0.34, depth + 1.2),
          roofMaterial
        );
        roofPlane.position.set(roofSide * width * 0.27, height + 1.55, 0);
        roofPlane.rotation.z = roofSide * -0.52;
        roofPlane.castShadow = true;
        house.add(roofPlane);
      });
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.35, depth + 1.4),
        roofMaterial
      );
      ridge.position.y = height + 2.5;
      ridge.castShadow = true;
      house.add(ridge);
      const gableShape = new THREE.Shape();
      gableShape.moveTo(-width / 2, height - 0.08);
      gableShape.lineTo(width / 2, height - 0.08);
      gableShape.lineTo(0, height + 2.5);
      gableShape.closePath();
      const gable = new THREE.Mesh(new THREE.ShapeGeometry(gableShape), facade);
      gable.position.z = depth / 2 + 0.12;
      house.add(gable);
      const backGable = gable.clone();
      backGable.position.z = -depth / 2 - 0.12;
      backGable.rotation.y = Math.PI;
      house.add(backGable);

      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.4, 0.9),
        stonePlaster[3]
      );
      chimney.position.set(width * 0.27, height + 1.5, -depth * 0.2);
      chimney.castShadow = true;
      house.add(chimney);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.45, 2.45, 0.18),
        darkTimber
      );
      door.position.set(0, 1.22, depth / 2 + 0.12);
      house.add(door);
      const doorwayArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.12, 6, 12, Math.PI),
        churchSandstone
      );
      doorwayArch.position.set(0, 2.34, depth / 2 + 0.2);
      house.add(doorwayArch);
      const doorstep = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.22, 1.1),
        churchSandstone
      );
      doorstep.position.set(0, 0.11, depth / 2 + 0.64);
      house.add(doorstep);

      [-1, 1].forEach(windowSide => {
        const windowX = windowSide * width * 0.25;
        const windowY = type === 'inn' ? [2.4, 6.2] : [3.8];
        windowY.forEach(y => {
          const frame = new THREE.Mesh(
            new THREE.BoxGeometry(1.55, 1.72, 0.18),
            churchSandstone
          );
          frame.position.set(windowX, y, depth / 2 + 0.12);
          house.add(frame);
          const glass = new THREE.Mesh(
            new THREE.BoxGeometry(1.22, 1.38, 0.12),
            new THREE.MeshStandardMaterial({
              color: 0xb8905e,
              emissive: 0x6a3719,
              emissiveIntensity: 0.24,
              roughness: 0.4
            })
          );
          glass.position.set(windowX, y, depth / 2 + 0.22);
          house.add(glass);
          [-1, 1].forEach(shutterSide => {
            const shutter = new THREE.Mesh(
              new THREE.BoxGeometry(0.22, 1.52, 0.14),
              darkTimber
            );
            shutter.position.set(windowX + shutterSide * 0.8, y, depth / 2 + 0.2);
            house.add(shutter);
          });
        });
      });

      if (type === 'inn') {
        const signCanvas = document.createElement('canvas');
        signCanvas.width = 384;
        signCanvas.height = 112;
        const signContext = signCanvas.getContext('2d');
        if (!signContext) throw new Error('Unable to create the roadside inn sign.');
        signContext.fillStyle = '#533c2a';
        signContext.fillRect(0, 0, signCanvas.width, signCanvas.height);
        signContext.strokeStyle = '#d7c49c';
        signContext.lineWidth = 6;
        signContext.strokeRect(5, 5, signCanvas.width - 10, signCanvas.height - 10);
        signContext.fillStyle = '#f0dfbd';
        signContext.font = 'bold 34px Georgia';
        signContext.textAlign = 'center';
        signContext.textBaseline = 'middle';
        signContext.fillText('GATEWARD INN', signCanvas.width / 2, signCanvas.height / 2);
        const signTexture = new THREE.CanvasTexture(signCanvas);
        signTexture.colorSpace = THREE.SRGBColorSpace;
        this.worldTextures.push(signTexture);
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(5.4, 1.5),
          new THREE.MeshStandardMaterial({ map: signTexture, roughness: 0.9 })
        );
        sign.position.set(0, 3.65, depth / 2 + 0.38);
        house.add(sign);
        const signBeam = new THREE.Mesh(
          new THREE.BoxGeometry(5.9, 0.2, 0.2),
          agedPlank
        );
        signBeam.position.set(0, 4.45, depth / 2 + 0.26);
        house.add(signBeam);
      }

      const localGroundY = groundY - settlementGround;
      house.position.set(worldX - SETTLEMENT.x, localGroundY, worldZ - SETTLEMENT.z);
      house.rotation.y = rotation;
      town.add(house);
      const houseCollider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldX, groundY + height / 2, worldZ)
      });
      houseCollider.addShape(new CANNON.Box(new CANNON.Vec3(width / 2 + 0.3, height / 2, depth / 2 + 0.3)));
      houseCollider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
      this.world.addBody(houseCollider);

      if (type === 'farm') {
        const barnWorldX = worldX - frontX * (depth / 2 + 9);
        const barnWorldZ = worldZ - frontZ * (depth / 2 + 9);
        const barnGround = this.terrainHeight(barnWorldX, barnWorldZ);
        const barn = new THREE.Group();
        const barnBody = new THREE.Mesh(
          new THREE.BoxGeometry(10, 5.2, 8),
          agedPlank
        );
        barnBody.position.y = 2.6;
        barnBody.castShadow = true;
        barnBody.receiveShadow = true;
        barn.add(barnBody);
        [-1, 1].forEach(roofSide => {
          const barnRoof = new THREE.Mesh(
            new THREE.BoxGeometry(6.4, 0.34, 8.6),
            slateRoof[2]
          );
          barnRoof.position.set(roofSide * 2.35, 6.15, 0);
          barnRoof.rotation.z = roofSide * -0.48;
          barnRoof.castShadow = true;
          barn.add(barnRoof);
        });
        const barnRidge = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.34, 8.9),
          slateRoof[2]
        );
        barnRidge.position.y = 7.55;
        barn.add(barnRidge);
        const barnGableShape = new THREE.Shape();
        barnGableShape.moveTo(-5, 5.08);
        barnGableShape.lineTo(5, 5.08);
        barnGableShape.lineTo(0, 7.55);
        barnGableShape.closePath();
        const barnGable = new THREE.Mesh(
          new THREE.ShapeGeometry(barnGableShape),
          agedPlank
        );
        barnGable.position.z = 4.04;
        barn.add(barnGable);
        const barnBackGable = barnGable.clone();
        barnBackGable.position.z = -4.04;
        barnBackGable.rotation.y = Math.PI;
        barn.add(barnBackGable);
        const barnDoor = new THREE.Mesh(
          new THREE.BoxGeometry(3.2, 3.8, 0.18),
          darkTimber
        );
        barnDoor.position.set(0, 1.9, 4.08);
        barn.add(barnDoor);
        barn.position.set(
          barnWorldX - SETTLEMENT.x,
          barnGround - settlementGround,
          barnWorldZ - SETTLEMENT.z
        );
        barn.rotation.y = rotation;
        town.add(barn);
        const barnCollider = new CANNON.Body({
          mass: 0,
          material: this.propMaterial,
          position: new CANNON.Vec3(barnWorldX, barnGround + 2.6, barnWorldZ)
        });
        barnCollider.addShape(new CANNON.Box(new CANNON.Vec3(5.2, 2.6, 4.2)));
        barnCollider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
        this.world.addBody(barnCollider);

        const wellWorldX = worldX + tangent.x * 12 - frontX * 4;
        const wellWorldZ = worldZ + tangent.z * 12 - frontZ * 4;
        const wellGround = this.terrainHeight(wellWorldX, wellWorldZ);
        const well = new THREE.Group();
        const wellStone = new THREE.Mesh(
          new THREE.CylinderGeometry(1.3, 1.55, 1.45, 9),
          churchSandstone
        );
        wellStone.position.y = 0.72;
        well.add(wellStone);
        [-1, 1].forEach(postSide => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), darkTimber);
          post.position.set(postSide * 1.3, 2.25, 0);
          well.add(post);
        });
        const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.3, 4), terracottaRoof);
        wellRoof.position.y = 4.2;
        wellRoof.rotation.y = Math.PI / 4;
        well.add(wellRoof);
        well.position.set(
          wellWorldX - SETTLEMENT.x,
          wellGround - settlementGround,
          wellWorldZ - SETTLEMENT.z
        );
        town.add(well);
        const wellCollider = new CANNON.Body({
          mass: 0,
          material: this.propMaterial,
          position: new CANNON.Vec3(wellWorldX, wellGround + 0.75, wellWorldZ)
        });
        wellCollider.addShape(new CANNON.Cylinder(1.55, 1.3, 1.45, 9));
        this.world.addBody(wellCollider);
      }

      buildFootpath(
        roadPoint,
        sideNormal,
        side,
        worldX,
        worldZ,
        frontX,
        frontZ,
        depth
      );
    });
  }

  _buildHighlandHamlet(settlementGround, town, materials) {
    const { stonePlaster, darkTimber, agedPlank, terracottaRoof, churchSandstone } = materials;
    const expansionRoad = ROAD_DEFINITIONS.find(item => item.to === 'settlement-highland-hamlet');
    if (!expansionRoad) throw new Error('Unable to build the Ashen Settlement hillside lane.');
    const expansionRoads = [expansionRoad];
    const roadCurves = expansionRoads.map(road => new THREE.CatmullRomCurve3(
      road.points.map(([x, z]) => new THREE.Vector3(x, this.terrainHeight(x, z), z)),
      road.closed ?? false,
      'centripetal'
    ));
    const accessMaterial = new THREE.MeshStandardMaterial({ color: 0x746249, roughness: 1 });
    const stone = new THREE.MeshStandardMaterial({ color: 0x81796a, roughness: 0.96, flatShading: true });

    SETTLEMENT_HIGHLAND_HOMESTEADS.forEach((site, index) => {
      const worldX = SETTLEMENT.x + site.x;
      const worldZ = SETTLEMENT.z + site.z;
      const groundY = this.terrainHeight(worldX, worldZ);
      const home = new THREE.Group();
      const footing = new THREE.Mesh(
        new THREE.BoxGeometry(site.w + 1.1, 0.72, site.d + 1.1),
        churchSandstone
      );
      footing.position.y = 0.36;
      footing.castShadow = true;
      footing.receiveShadow = true;
      home.add(footing);

      const lowerHeight = site.h * 0.62;
      const lower = new THREE.Mesh(
        new THREE.BoxGeometry(site.w, lowerHeight, site.d),
        stonePlaster[site.color]
      );
      lower.position.y = lowerHeight / 2 + 0.5;
      lower.castShadow = true;
      lower.receiveShadow = true;
      home.add(lower);
      const timberBand = new THREE.Mesh(
        new THREE.BoxGeometry(site.w + 0.28, 0.3, site.d + 0.28),
        darkTimber
      );
      timberBand.position.y = lowerHeight + 0.5;
      home.add(timberBand);
      const upper = new THREE.Mesh(
        new THREE.BoxGeometry(site.w * 0.92, site.h - lowerHeight, site.d * 0.9),
        stonePlaster[site.color]
      );
      upper.position.y = lowerHeight + (site.h - lowerHeight) / 2 + 0.65;
      upper.castShadow = true;
      upper.receiveShadow = true;
      home.add(upper);

      [-1, 1].forEach(side => {
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(site.w * 0.62, 0.38, site.d + 1.4),
          terracottaRoof
        );
        roof.position.set(side * site.w * 0.25, site.h + 1.45, 0);
        roof.rotation.z = side * -0.57;
        roof.castShadow = true;
        home.add(roof);
        const timberPost = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, site.h + 0.15, 0.26),
          darkTimber
        );
        timberPost.position.set(side * (site.w / 2 - 0.45), (site.h + 0.15) / 2, site.d / 2 + 0.12);
        home.add(timberPost);
      });
      const ridge = new THREE.Mesh(
        new THREE.BoxGeometry(0.48, 0.36, site.d + 1.6),
        terracottaRoof
      );
      ridge.position.y = site.h + 2.45;
      home.add(ridge);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 2.45, 0.18),
        darkTimber
      );
      door.position.set(0, 1.76, site.d / 2 + 0.11);
      home.add(door);
      [-1, 1].forEach(side => {
        const window = new THREE.Mesh(
          new THREE.BoxGeometry(1.25, 1.35, 0.14),
          new THREE.MeshStandardMaterial({
            color: 0xc49c66,
            emissive: 0x80502b,
            emissiveIntensity: 0.16,
            roughness: 0.48
          })
        );
        window.position.set(side * site.w * 0.27, 3.6, site.d / 2 + 0.1);
        home.add(window);
        const shutter = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.52, 0.14), darkTimber);
        [-1, 1].forEach(shutterSide => {
          const copy = shutter.clone();
          copy.position.set(side * site.w * 0.27 + shutterSide * 0.76, 3.6, site.d / 2 + 0.12);
          home.add(copy);
        });
      });
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 2.4, 1.05),
        stone
      );
      chimney.position.set(site.w * 0.26, site.h + 1.35, -site.d * 0.2);
      chimney.castShadow = true;
      home.add(chimney);
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.28, 1.25),
        churchSandstone
      );
      step.position.set(0, 0.14, site.d / 2 + 0.72);
      home.add(step);

      home.position.set(site.x, groundY - settlementGround, site.z);
      home.rotation.y = site.rot;
      town.add(home);
      const collider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldX, groundY + site.h / 2 + 0.35, worldZ)
      });
      collider.addShape(new CANNON.Box(new CANNON.Vec3(site.w / 2, site.h / 2 + 0.35, site.d / 2)));
      collider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), site.rot);
      this.world.addBody(collider);

      const nearest = roadCurves.flatMap(curve => curve.getSpacedPoints(100)).reduce((best, point) =>
        Math.hypot(point.x - worldX, point.z - worldZ) < Math.hypot(best.x - worldX, best.z - worldZ)
          ? point
          : best
      );
      const start = new THREE.Vector3(nearest.x, 0, nearest.z);
      const end = new THREE.Vector3(
        worldX + Math.sin(site.rot) * (site.d / 2 + 1),
        0,
        worldZ + Math.cos(site.rot) * (site.d / 2 + 1)
      );
      const approach = new THREE.CatmullRomCurve3([
        start,
        new THREE.Vector3((start.x + end.x) / 2 + (index % 2 ? 2 : -2), 0, (start.z + end.z) / 2),
        end
      ], false, 'centripetal');
      const pathPoints = approach.getSpacedPoints(12);
      const pathVertices = [];
      const pathIndices = [];
      pathPoints.forEach((point, pointIndex) => {
        const tangent = approach.getTangentAt(pointIndex / (pathPoints.length - 1));
        const halfWidth = 1.2;
        const sideX = -tangent.z * halfWidth;
        const sideZ = tangent.x * halfWidth;
        const y = this.terrainHeight(point.x, point.z) + 0.08;
        pathVertices.push(
          point.x - sideX, y, point.z - sideZ,
          point.x + sideX, y, point.z + sideZ
        );
        if (pointIndex < pathPoints.length - 1) {
          const offset = pointIndex * 2;
          pathIndices.push(offset, offset + 1, offset + 2, offset + 1, offset + 3, offset + 2);
        }
      });
      const pathGeometry = new THREE.BufferGeometry();
      pathGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pathVertices, 3));
      pathGeometry.setIndex(pathIndices);
      pathGeometry.computeVertexNormals();
      const footpath = new THREE.Mesh(pathGeometry, accessMaterial);
      footpath.receiveShadow = true;
      this.scene.add(footpath);

      const yard = new THREE.Group();
      yard.position.set(site.x, groundY - settlementGround, site.z);
      yard.rotation.y = site.rot;
      const yardPost = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.25, 0.22), darkTimber);
      const addFence = (x, z, width, depth) => {
        [-1, 1].forEach(side => {
          [-1, 1].forEach(endSide => {
            const post = yardPost.clone();
            post.position.set(x + side * width / 2, 0.62, z + endSide * depth / 2);
            yard.add(post);
          });
        });
        [-1, 1].forEach(side => {
          [0.42, 0.92].forEach(height => {
            const sideRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, 0.18), agedPlank);
            sideRail.position.set(x, height, z + side * depth / 2);
            yard.add(sideRail);
            const endRail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, depth), agedPlank);
            endRail.position.set(x + side * width / 2, height, z);
            yard.add(endRail);
          });
        });
      };
      const yardCenterZ = -site.d / 2 - 4;
      if (site.trade.includes('HERDS') || site.trade.includes('WOOL')) {
        addFence(0, yardCenterZ, 7, 5);
        const trough = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 0.8), agedPlank);
        trough.position.set(0, 0.45, yardCenterZ);
        yard.add(trough);
      } else if (site.trade.includes('STONE')) {
        for (let row = 0; row < 2; row += 1) {
          for (let block = 0; block < 3; block += 1) {
            const stoneBlock = new THREE.Mesh(
              new THREE.BoxGeometry(1.7, 0.75, 1.1),
              churchSandstone
            );
            stoneBlock.position.set(0.7 + block * 1.8, 0.4 + (row % 2) * 0.8, yardCenterZ - 2.2 + row * 1.3);
            stoneBlock.rotation.y = (block % 2) * 0.08;
            yard.add(stoneBlock);
          }
        }
      } else if (site.trade.includes('ROOT')) {
        addFence(0, yardCenterZ, 7, 5);
        for (let row = 0; row < 3; row += 1) {
          const bed = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.18, 4.2),
            agedPlank
          );
          bed.position.set(-2.2 + row * 2.2, 0.22, yardCenterZ);
          yard.add(bed);
          for (let plant = 0; plant < 4; plant += 1) {
            const crop = new THREE.Mesh(
              new THREE.ConeGeometry(0.18, 0.55, 5),
              stonePlaster[3]
            );
            crop.position.set(-2.2 + row * 2.2, 0.55, yardCenterZ - 1.5 + plant);
            yard.add(crop);
          }
        }
      } else {
        for (let log = 0; log < 5; log += 1) {
          const timberLog = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 7), agedPlank);
          timberLog.rotation.z = Math.PI / 2;
          timberLog.position.set(0, 0.3 + (log % 2) * 0.36, yardCenterZ - 1.3 + Math.floor(log / 2) * 0.55);
          yard.add(timberLog);
        }
      }
      town.add(yard);
    });

    const wellPosition = { x: -187, z: -142 };
    const wellGround = this.terrainHeight(SETTLEMENT.x + wellPosition.x, SETTLEMENT.z + wellPosition.z);
    const well = new THREE.Group();
    well.position.set(wellPosition.x, wellGround - settlementGround, wellPosition.z);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.45, 0.65, 10), churchSandstone);
    plinth.position.y = 0.33;
    well.add(plinth);
    const wellRim = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 1.2, 10), stone);
    wellRim.position.y = 1.05;
    well.add(wellRim);
    [-1, 1].forEach(side => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), darkTimber);
      post.position.set(side * 1.4, 2.5, 0);
      well.add(post);
    });
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.22), darkTimber);
    crossbeam.position.y = 4;
    well.add(crossbeam);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.5, 4), terracottaRoof);
    roof.position.y = 4.9;
    roof.rotation.y = Math.PI / 4;
    well.add(roof);
    town.add(well);
  }

  _buildSettlementHarbor(settlementGround, town) {
    const seaLevel = WORLD_FLOOR_Y + 7;
    const dockWaypoints = [
      [145, -60],
      [166, -60],
      [190, -56],
      [216, -52],
      [242, -48]
    ];
    const dockCurve = new THREE.CatmullRomCurve3(dockWaypoints.map(([offsetX, offsetZ], index) => {
      const x = SETTLEMENT.x + offsetX;
      const z = SETTLEMENT.z + offsetZ;
      const ground = index === 0 ? settlementGround : this.terrainHeight(x, z);
      return new THREE.Vector3(x, Math.max(ground + 0.325, seaLevel + 0.825), z);
    }), false, 'centripetal');
    const timber = new THREE.MeshStandardMaterial({ color: 0x59432f, roughness: 0.94 });
    const deck = new THREE.MeshStandardMaterial({ color: 0x746047, roughness: 0.95, flatShading: true });
    const iron = new THREE.MeshStandardMaterial({ color: 0x343737, metalness: 0.55, roughness: 0.62 });
    const lantern = new THREE.MeshStandardMaterial({
      color: 0xffc66e,
      emissive: 0xff8e3d,
      emissiveIntensity: 1.8,
      roughness: 0.34
    });
    const samples = dockCurve.getSpacedPoints(32);
    const bodyQuaternion = new THREE.Quaternion();
    const deckWidth = 8;

    for (let index = 0; index < samples.length - 1; index += 1) {
      const point = dockCurve.getPointAt((index + 0.5) / (samples.length - 1));
      const tangent = dockCurve.getTangentAt((index + 0.5) / (samples.length - 1)).normalize();
      const segmentLength = samples[index].distanceTo(samples[index + 1]);
      const geometry = new THREE.BoxGeometry(deckWidth, 0.65, segmentLength + 0.3);
      const segment = new THREE.Mesh(geometry, deck);
      segment.position.copy(point);
      bodyQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      segment.quaternion.copy(bodyQuaternion);
      segment.castShadow = true;
      segment.receiveShadow = true;
      this.scene.add(segment);

      const collider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(point.x, point.y, point.z)
      });
      collider.addShape(new CANNON.Box(new CANNON.Vec3(deckWidth / 2, 0.4, segmentLength / 2 + 0.15)));
      collider.quaternion.set(bodyQuaternion.x, bodyQuaternion.y, bodyQuaternion.z, bodyQuaternion.w);
      this.world.addBody(collider);
    }

    const support = new THREE.CylinderGeometry(0.42, 0.58, 1, 7);
    for (let index = 0; index <= 8; index += 1) {
      const point = dockCurve.getPointAt(index / 8);
      const tangent = dockCurve.getTangentAt(index / 8).normalize();
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      [-1, 1].forEach(sideOffset => {
        const x = point.x + side.x * sideOffset * (deckWidth / 2 - 0.5);
        const z = point.z + side.z * sideOffset * (deckWidth / 2 - 0.5);
        const pileHeight = Math.max(1.2, point.y - seaLevel + 1.7);
        const pile = new THREE.Mesh(support, timber);
        pile.scale.y = pileHeight;
        pile.position.set(x, seaLevel - 2 + pileHeight / 2, z);
        pile.castShadow = true;
        this.scene.add(pile);
      });
    }

    const quayStall = new THREE.Group();
    quayStall.position.set(156, this.terrainHeight(SETTLEMENT.x + 156, SETTLEMENT.z - 55) - settlementGround, -55);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1, 1.4), timber);
    counter.position.y = 0.55;
    quayStall.add(counter);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.2, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x56716a, roughness: 0.92 })
    );
    awning.position.set(0, 2.55, -0.3);
    quayStall.add(awning);
    [-1.6, 1.6].forEach(side => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.5, 0.15), timber);
      post.position.set(side, 1.25, -0.75);
      quayStall.add(post);
    });
    [-1.2, 0, 1.2].forEach((x, index) => {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.85, 6), index % 2 ? iron : deck);
      fish.rotation.z = Math.PI / 2;
      fish.position.set(x, 1.18, 0.2);
      quayStall.add(fish);
    });
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.9), deck);
    crate.position.set(-2.1, 0.42, 1.2);
    quayStall.add(crate);
    const netFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 0.12), iron);
    netFrame.position.set(2.8, 1.35, 1.05);
    quayStall.add(netFrame);
    for (let knot = 0; knot < 5; knot += 1) {
      const rope = new THREE.Mesh(
        new THREE.TorusGeometry(0.4 + knot * 0.08, 0.045, 4, 10),
        timber
      );
      rope.position.set(1.6 + knot * 0.55, 0.65, 1.05);
      quayStall.add(rope);
    }
    town.add(quayStall);

    [0.08, 0.92].forEach(progress => {
      const point = dockCurve.getPointAt(progress);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 5.5, 7), timber);
      post.position.set(point.x, point.y + 2.45, point.z);
      post.castShadow = true;
      this.scene.add(post);
      const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 1), lantern);
      lamp.position.set(point.x, point.y + 5.35, point.z);
      this.scene.add(lamp);
      const glow = new THREE.PointLight(0xffad59, 1.4, 24, 2);
      glow.position.copy(lamp.position);
      this.scene.add(glow);
    });

    const boat = new THREE.Group();
    boat.position.set(SETTLEMENT.x + 257, seaLevel + 1.1, SETTLEMENT.z - 52);
    const hull = new THREE.Mesh(
      new THREE.CapsuleGeometry(1.1, 7.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5b4633, roughness: 0.92 })
    );
    hull.rotation.z = Math.PI / 2;
    hull.castShadow = true;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 5.5, 6), timber);
    mast.position.y = 3.4;
    boat.add(mast);
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 3.8),
      new THREE.MeshStandardMaterial({ color: 0xcbbd9d, side: THREE.DoubleSide, roughness: 0.98 })
    );
    sail.position.set(0, 3.55, -0.15);
    sail.rotation.y = Math.PI / 2;
    boat.add(sail);
    this.scene.add(boat);
    [
      [SETTLEMENT.x + 242, seaLevel + 1.1, SETTLEMENT.z - 74, -0.3],
      [SETTLEMENT.x + 268, seaLevel + 1.1, SETTLEMENT.z - 31, 0.24],
      [SETTLEMENT.x + 236, seaLevel + 1.1, SETTLEMENT.z - 5, -0.18]
    ].forEach(([x, y, z, heading]) => {
      const mooredBoat = boat.clone(true);
      mooredBoat.position.set(x, y, z);
      mooredBoat.rotation.y = heading;
      this.scene.add(mooredBoat);
    });
  }

  _buildCityFortifications(town) {
    const stone = new THREE.MeshStandardMaterial({ color: 0x938b7b, roughness: 0.92, flatShading: true });
    const paleStone = new THREE.MeshStandardMaterial({ color: 0xc3b69a, roughness: 0.9, flatShading: true });
    const roof = new THREE.MeshStandardMaterial({ color: 0x74453b, roughness: 0.82, flatShading: true });
    const timber = new THREE.MeshStandardMaterial({ color: 0x493729, roughness: 0.9 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x282c2d, roughness: 0.52, metalness: 0.72 });
    const addMesh = (parent, geometry, material, position, castShadow = true) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...position);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const addCollider = (localPosition, halfExtents, rotation = 0) => {
      const worldPosition = town.localToWorld(new THREE.Vector3(...localPosition));
      const body = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(worldPosition.x, worldPosition.y, worldPosition.z)
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(...halfExtents)));
      body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
      this.world.addBody(body);
    };

    const councilHall = new THREE.Group();
    councilHall.position.set(105, 0, 0);
    addMesh(councilHall, new THREE.BoxGeometry(25, 11, 18), paleStone, [0, 5.5, 0]);
    [-1, 1].forEach(side => {
      const roofPlane = addMesh(
        councilHall,
        new THREE.BoxGeometry(13.5, 0.55, 19.2),
        roof,
        [side * 5.8, 11.6, 0]
      );
      roofPlane.rotation.z = side * -0.45;
    });
    addMesh(councilHall, new THREE.BoxGeometry(0.42, 0.4, 19.6), roof, [0, 14.35, 0]);
    [-1, 1].forEach(side => {
      addMesh(councilHall, new THREE.BoxGeometry(0.65, 10.7, 0.72), stone, [-12.72, 5.35, side * 8.25]);
    });
    addMesh(councilHall, new THREE.BoxGeometry(0.42, 0.8, 18.8), paleStone, [-12.72, 0.8, 0]);
    addMesh(councilHall, new THREE.BoxGeometry(0.48, 0.6, 18.8), paleStone, [-12.72, 10.35, 0]);
    addMesh(councilHall, new THREE.BoxGeometry(0.3, 4.2, 2.5), timber, [-12.7, 2.3, 0]);
    addMesh(councilHall, new THREE.BoxGeometry(2.4, 0.28, 4.4), timber, [-13.7, 4.5, 0]);
    addMesh(councilHall, new THREE.BoxGeometry(2.8, 0.25, 4.8), paleStone, [-13.9, 0.16, 0]);
    [-1, 1].forEach(side => {
      [4.3, 7.2].forEach(windowZ => {
        addMesh(councilHall, new THREE.BoxGeometry(0.32, 2.6, 2.1), paleStone, [-12.72, windowZ, side * 4.6]);
        const window = addMesh(
          councilHall,
          new THREE.BoxGeometry(0.18, 2.2, 1.65),
          iron,
          [-12.84, windowZ, side * 4.6],
          false
        );
        window.material = window.material.clone();
        window.material.color.setHex(windowZ < 5 ? 0x846b4a : 0xc28b46);
        window.material.emissive.setHex(windowZ < 5 ? 0x1f160d : 0x5b3517);
      });
    });
    addMesh(councilHall, new THREE.BoxGeometry(0.24, 1.4, 7.5), timber, [-12.6, 9.2, 0]);
    addMesh(councilHall, new THREE.OctahedronGeometry(1.05, 0), paleStone, [-12.25, 10.1, 0]);
    const hallSignCanvas = document.createElement('canvas');
    hallSignCanvas.width = 512;
    hallSignCanvas.height = 112;
    const hallSignContext = hallSignCanvas.getContext('2d');
    if (!hallSignContext) throw new Error('Unable to create the council hall sign.');
    hallSignContext.fillStyle = '#533c2a';
    hallSignContext.fillRect(0, 0, hallSignCanvas.width, hallSignCanvas.height);
    hallSignContext.fillStyle = '#e2d3b5';
    hallSignContext.font = 'bold 42px Georgia';
    hallSignContext.textAlign = 'center';
    hallSignContext.textBaseline = 'middle';
    hallSignContext.fillText('COUNCIL HALL', hallSignCanvas.width / 2, hallSignCanvas.height / 2);
    const hallSignTexture = new THREE.CanvasTexture(hallSignCanvas);
    hallSignTexture.colorSpace = THREE.SRGBColorSpace;
    this.worldTextures.push(hallSignTexture);
    const hallSign = addMesh(
      councilHall,
      new THREE.PlaneGeometry(4.2, 0.92),
      new THREE.MeshStandardMaterial({ map: hallSignTexture, roughness: 0.9 }),
      [-12.92, 5.2, 0],
      false
    );
    hallSign.rotation.y = -Math.PI / 2;
    town.add(councilHall);
    addCollider([105, 5.5, 0], [12.5, 5.5, 9]);

    const gateGroundX = SETTLEMENT_GATE_OFFSET.x;
    const gateGroundZ = SETTLEMENT_GATE_OFFSET.z;
    const gateHeading = Math.PI / 2;
    const gate = new THREE.Group();
    gate.position.set(gateGroundX, 0, gateGroundZ);
    gate.rotation.y = gateHeading;
    town.add(gate);
    [-6.4, 6.4].forEach(x => {
      addMesh(gate, new THREE.BoxGeometry(2.6, 7.2, 2.8), stone, [x, 3.6, 0]);
      addMesh(gate, new THREE.BoxGeometry(3.2, 0.55, 3.4), paleStone, [x, 7.45, 0]);
      const sconceMaterial = new THREE.MeshStandardMaterial({
        color: 0xffc56f,
        emissive: 0xff8e3d,
        emissiveIntensity: 1.1,
        roughness: 0.3
      });
      addMesh(gate, new THREE.OctahedronGeometry(0.38, 1), sconceMaterial, [x, 6, 1.9]);
      const sconceLight = new THREE.PointLight(0xffad59, 0.8, 14, 2);
      sconceLight.position.set(x, 6, 1.9);
      gate.add(sconceLight);
    });
    [-1.85, 1.85].forEach(z => {
      addMesh(
        gate,
        new THREE.TorusGeometry(5.4, 0.74, 8, 20, Math.PI),
        paleStone,
        [0, 1.5, z]
      );
    });
    addMesh(gate, new THREE.BoxGeometry(15.6, 0.55, 4), roof, [0, 8.9, 0]);
    addMesh(gate, new THREE.BoxGeometry(7, 0.92, 0.24), timber, [0, 8.05, -1.78]);
    const gateSignCanvas = document.createElement('canvas');
    gateSignCanvas.width = 768;
    gateSignCanvas.height = 128;
    const gateSignContext = gateSignCanvas.getContext('2d');
    if (!gateSignContext) throw new Error('Unable to create the Ashen Settlement gate sign.');
    gateSignContext.fillStyle = '#d7c49c';
    gateSignContext.fillRect(0, 0, gateSignCanvas.width, gateSignCanvas.height);
    gateSignContext.strokeStyle = '#594430';
    gateSignContext.lineWidth = 8;
    gateSignContext.strokeRect(8, 8, gateSignCanvas.width - 16, gateSignCanvas.height - 16);
    gateSignContext.fillStyle = '#35281e';
    gateSignContext.textAlign = 'center';
    gateSignContext.textBaseline = 'middle';
    gateSignContext.font = 'bold 52px Georgia';
    gateSignContext.fillText('ASHEN SETTLEMENT', gateSignCanvas.width / 2, gateSignCanvas.height / 2);
    const gateSignTexture = new THREE.CanvasTexture(gateSignCanvas);
    gateSignTexture.colorSpace = THREE.SRGBColorSpace;
    this.worldTextures.push(gateSignTexture);
    const gateSign = addMesh(
      gate,
      new THREE.PlaneGeometry(6.7, 0.82),
      new THREE.MeshStandardMaterial({ map: gateSignTexture, roughness: 0.88 }),
      [0, 8.05, -1.93],
      false
    );
    gateSign.rotation.y = Math.PI;
    [-6.4, 6.4].forEach(x => {
      addCollider([gateGroundX, 3.6, gateGroundZ - x], [1.3, 3.6, 1.4], gateHeading);
    });
    addCollider([gateGroundX, 8, gateGroundZ], [7.2, 0.625, 1.7], gateHeading);
    const entranceWorld = town.localToWorld(gate.position.clone());
    this.cityEntrance = entranceWorld;
    this.cityEntranceHeading = gateHeading;

    const stable = new THREE.Group();
    const stableGround = this.terrainHeight(SETTLEMENT.x + 155, SETTLEMENT.z + 100);
    const stableGroundOffset = stableGround - town.position.y;
    stable.position.set(155, stableGroundOffset, 100);
    town.add(stable);
    addMesh(stable, new THREE.BoxGeometry(22, 0.7, 15), stone, [0, 0.35, 0]);
    addMesh(stable, new THREE.BoxGeometry(22, 8, 0.8), timber, [0, 4, -7.1]);
    [-10.6, 10.6].forEach(x => {
      addMesh(stable, new THREE.BoxGeometry(0.8, 8, 15), timber, [x, 4, 0]);
    });
    [-1, 1].forEach(side => {
      const roofPlane = addMesh(stable, new THREE.BoxGeometry(13.5, 0.65, 19), roof, [side * 5.4, 9, 0]);
      roofPlane.rotation.z = side * -0.45;
    });
    [-6.7, 0, 6.7].forEach(x => {
      addMesh(stable, new THREE.BoxGeometry(0.55, 6.2, 8), paleStone, [x, 3.1, 3.5]);
    });
    addMesh(stable, new THREE.BoxGeometry(25, 0.42, 0.42), timber, [0, 7.8, 7.5]);
    addMesh(stable, new THREE.BoxGeometry(0.22, 0.22, 0.22), iron, [0, 10.1, 0]);
    addCollider([155, stableGroundOffset + 4, 92.9], [11, 4, 0.4]);
    addCollider([144.4, stableGroundOffset + 4, 100], [0.4, 4, 7.5]);
    addCollider([165.6, stableGroundOffset + 4, 100], [0.4, 4, 7.5]);
    const stableHorseMaterial = new THREE.MeshStandardMaterial({ color: 0x78523a, roughness: 0.9 });
    [-4, 4].forEach((x, index) => {
      const horse = this._createHorseModel(stableHorseMaterial, index ? 0x6a382e : 0x39464a);
      horse.position.set(x, 0.8, 1.5);
      stable.add(horse);
    });
    const hay = new THREE.MeshStandardMaterial({ color: 0xb69b57, roughness: 0.95 });
    [-8, 8].forEach(x => {
      const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 2.2, 8), hay);
      bale.rotation.z = Math.PI / 2;
      bale.position.set(x, 1.35, -4.5);
      stable.add(bale);
    });
  }

  _createHorseModel(coatMaterial, tackColor = 0x39464a) {
    const horse = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), coatMaterial);
    torso.scale.set(0.82, 0.68, 1.42);
    torso.position.y = 1.28;
    torso.castShadow = true;
    horse.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.56, 1.65, 9), coatMaterial);
    neck.position.set(0, 1.92, 0.98);
    neck.rotation.x = -0.46;
    neck.castShadow = true;
    horse.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), coatMaterial);
    head.scale.set(0.82, 1.25, 0.9);
    head.position.set(0, 2.55, 1.58);
    head.castShadow = true;
    horse.add(head);
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x4b3b33, roughness: 0.88 })
    );
    muzzle.position.set(0, 2.25, 1.86);
    horse.add(muzzle);
    const mane = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 1.7, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x292522, roughness: 0.95 })
    );
    mane.position.set(0, 2.5, 0.93);
    mane.rotation.x = -0.42;
    horse.add(mane);
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.56, 5), coatMaterial);
      ear.position.set(side * 0.25, 3.04, 1.54);
      ear.rotation.z = side * -0.22;
      horse.add(ear);
    });

    const tack = new THREE.MeshStandardMaterial({
      color: tackColor,
      roughness: 0.84,
      metalness: 0.12
    });
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.32, 1.12), tack);
    saddle.position.set(0, 1.78, -0.12);
    horse.add(saddle);
    const legs = [];
    [-1, 1].forEach(side => {
      [-1, 1].forEach(frontBack => {
        const leg = new THREE.Group();
        leg.position.set(side * 0.52, 0.98, frontBack * 0.92);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.9, 6), coatMaterial);
        shin.position.y = -0.45;
        shin.castShadow = true;
        leg.add(shin);
        const hoof = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.18, 0.34),
          new THREE.MeshStandardMaterial({ color: 0x302a26, roughness: 0.9 })
        );
        hoof.position.set(0, -0.88, 0.05);
        leg.add(hoof);
        horse.add(leg);
        legs.push(leg);
      });
    });
    horse.userData.legs = legs;
    return horse;
  }

  _buildPier() {
    const seaLevel = WORLD_FLOOR_Y + 7;
    const coast = mapPosition(875, 110);
    const bridgeApproach = mapPosition(895, 108);
    const bridgeMidpoint = mapPosition(925, 105);
    const islandArrival = mapPosition(951, 108);
    const islandGround = this.terrainHeight(islandArrival.x, islandArrival.z);
    this.signalArrival = islandArrival;
    const approachGround = this.terrainHeight(bridgeApproach.x, bridgeApproach.z);
    const roadCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(coast.x, this.terrainHeight(coast.x, coast.z), coast.z),
      new THREE.Vector3(bridgeApproach.x, Math.max(approachGround + 0.4, seaLevel + 5), bridgeApproach.z),
      new THREE.Vector3(bridgeMidpoint.x, seaLevel + 5, bridgeMidpoint.z),
      new THREE.Vector3(islandArrival.x, Math.max(islandGround + 0.4, seaLevel + 5), islandArrival.z)
    ], false, 'centripetal');
    const causeway = new THREE.Group();
    this.scene.add(causeway);

    const asphalt = new THREE.MeshStandardMaterial({
      color: 0x343b3c,
      roughness: 0.9,
      metalness: 0.04
    });
    const basalt = new THREE.MeshStandardMaterial({
      color: 0x585954,
      roughness: 0.98,
      flatShading: true
    });
    const concrete = new THREE.MeshStandardMaterial({
      color: 0x9b9b8c,
      roughness: 0.86
    });
    const railMaterial = new THREE.MeshStandardMaterial({ color: 0x3e4b4b, roughness: 0.6, metalness: 0.48 });
    const timber = new THREE.MeshStandardMaterial({
      color: 0x513a29,
      roughness: 0.92
    });
    const lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xff9933,
      emissiveIntensity: 2.5,
      roughness: 0.3
    });
    const deckWidth = 12;
    const deckHalfWidth = deckWidth / 2;
    const samples = roadCurve.getSpacedPoints(72);
    const deckGeo = new THREE.BoxGeometry(deckWidth, 0.85, roadCurve.getLength() / 72 + 0.2);
    const supportGeo = new THREE.CylinderGeometry(1.2, 1.8, 1, 7);
    const roadBodyQuaternion = new THREE.Quaternion();
    for (let index = 0; index < samples.length - 1; index += 1) {
      const progress = (index + 0.5) / (samples.length - 1);
      const point = roadCurve.getPointAt(progress);
      const tangent = roadCurve.getTangentAt(progress).normalize();
      const segmentLength = samples[index].distanceTo(samples[index + 1]);
      const segment = new THREE.Group();
      segment.position.copy(point);
      roadBodyQuaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      segment.quaternion.copy(roadBodyQuaternion);
      const deck = new THREE.Mesh(deckGeo, asphalt);
      deck.position.y = -0.42;
      deck.receiveShadow = true;
      deck.castShadow = true;
      segment.add(deck);
      [-1, 1].forEach(side => {
        const curb = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, segmentLength + 0.25), concrete);
        curb.position.set(side * (deckHalfWidth - 0.18), -0.1, 0);
        curb.castShadow = true;
        segment.add(curb);
      });
      this.scene.add(segment);

      const body = new CANNON.Body({
        mass: 0,
        material: this.roadMaterial,
        position: new CANNON.Vec3(point.x, point.y - 0.42, point.z)
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(
        deckWidth / 2,
        0.43,
        Math.max(1, segmentLength / 2 + 0.2)
      )));
      body.quaternion.set(
        roadBodyQuaternion.x,
        roadBodyQuaternion.y,
        roadBodyQuaternion.z,
        roadBodyQuaternion.w
      );
      this.world.addBody(body);
    }

    for (let index = 3; index < samples.length - 1; index += 6) {
      const point = samples[index];
      const tangent = roadCurve.getTangentAt(index / (samples.length - 1)).normalize();
      const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize();
      const pierHeight = Math.max(2, point.y - (seaLevel - 2));
      [-1, 1].forEach(direction => {
        const support = new THREE.Mesh(supportGeo, basalt);
        support.scale.y = pierHeight;
        support.position.set(
          point.x + side.x * direction * (deckHalfWidth - 0.6),
          (point.y + seaLevel - 2) / 2,
          point.z + side.z * direction * (deckHalfWidth - 0.6)
        );
        support.castShadow = true;
        causeway.add(support);
      });
      if (index % 12 === 3) {
        const lampPost = new THREE.Group();
        const lampSide = Math.floor(index / 12) % 2 ? -1 : 1;
        lampPost.position.set(
          point.x + side.x * lampSide * (deckHalfWidth - 1.2),
          point.y + 0.65,
          point.z + side.z * lampSide * (deckHalfWidth - 1.2)
        );
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.23, 5.4, 7), railMaterial);
        mast.position.y = 2.7;
        lampPost.add(mast);
        const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 1), lanternMaterial);
        lantern.position.y = 5.3;
        lampPost.add(lantern);
        const glow = new THREE.PointLight(0xffb86c, 2.2, 34, 2);
        glow.position.y = 5.3;
        lampPost.add(glow);
        causeway.add(lampPost);
      }
    }

    const seaGeometry = new THREE.PlaneGeometry(4000, 4000, 48, 48);
    seaGeometry.rotateX(-Math.PI / 2);
    const seaMesh = new THREE.Mesh(seaGeometry, this.waterMaterial);
    seaMesh.position.set(3000, -31.5, 1200);
    seaMesh.receiveShadow = true;
    this.scene.add(seaMesh);

    const islandGroup = new THREE.Group();
    islandGroup.position.set(SIGNAL_PEAK.x, islandGround, SIGNAL_PEAK.z);

    const lighthouse = new THREE.Group();
    const lighthouseStone = new THREE.MeshStandardMaterial({
      color: 0xe9e5d7,
      roughness: 0.75,
      flatShading: true
    });
    const lighthouseRed = new THREE.MeshStandardMaterial({
      color: 0x9e5142,
      roughness: 0.78,
      flatShading: true
    });
    const lighthouseMetal = new THREE.MeshStandardMaterial({
      color: 0x384343,
      roughness: 0.58,
      metalness: 0.48
    });
    const lighthouseWindow = new THREE.MeshStandardMaterial({
      color: 0x433d32,
      emissive: 0xff9f4b,
      emissiveIntensity: 0.38,
      roughness: 0.32
    });
    const lighthouseRoofMaterial = new THREE.MeshStandardMaterial({
      color: 0x303738,
      roughness: 0.78,
      flatShading: true
    });
    const lanternGlass = new THREE.MeshStandardMaterial({
      color: 0x9ac4c3,
      emissive: 0xffc97c,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.8,
      roughness: 0.2
    });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 7.2, 34, 12), lighthouseStone);
    tower.position.y = 17;
    tower.castShadow = true;
    tower.receiveShadow = true;
    lighthouse.add(tower);
    const foundation = new THREE.Mesh(
      new THREE.CylinderGeometry(8.1, 8.5, 2.4, 12),
      basalt
    );
    foundation.position.y = 1.2;
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    lighthouse.add(foundation);
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const buttress = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 5.6, 2.2),
        lighthouseStone
      );
      buttress.position.set(Math.sin(angle) * 5.9, 2.8, Math.cos(angle) * 5.9);
      buttress.rotation.y = angle;
      buttress.castShadow = true;
      buttress.receiveShadow = true;
      lighthouse.add(buttress);
    }
    const towerDoor = new THREE.Group();
    towerDoor.position.set(-6.9, 0, 0);
    towerDoor.rotation.y = -Math.PI / 2;
    const entryDoor = new THREE.Mesh(new THREE.BoxGeometry(1.9, 3.2, 0.22), timber);
    entryDoor.position.set(0, 1.6, 0);
    towerDoor.add(entryDoor);
    [-1, 1].forEach(side => {
      const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 3.7, 0.46), lighthouseStone);
      jamb.position.set(side * 1.17, 1.85, 0.08);
      towerDoor.add(jamb);
    });
    const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.42, 0.56), lighthouseStone);
    doorLintel.position.set(0, 3.75, 0.08);
    towerDoor.add(doorLintel);
    for (let index = 0; index < 3; index += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.24, 1.15), basalt);
      step.position.set(-8.1 - index * 1.1, 0.12 + index * 0.2, 0);
      step.castShadow = true;
      step.receiveShadow = true;
      lighthouse.add(step);
    }
    lighthouse.add(towerDoor);
    [7, 15, 23, 30].forEach((height, level) => {
      const radius = 7.2 - (height / 34) * 2.9 + 0.08;
      [0, 1, 2, 3].forEach(side => {
        const angle = (side / 4) * Math.PI * 2 + (level % 2) * Math.PI / 4;
        const slit = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.9, 0.18), lighthouseWindow);
        slit.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
        slit.rotation.y = angle;
        lighthouse.add(slit);
      });
    });
    [6, 14, 22, 30].forEach((height, index) => {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(THREE.MathUtils.lerp(6.7, 4.8, height / 34) + 0.12, THREE.MathUtils.lerp(7.05, 4.4, height / 34) + 0.12, 1.25, 12),
        index % 2 ? lighthouseRed : lighthouseStone
      );
      band.position.y = height;
      lighthouse.add(band);
    });
    const galleryDeck = new THREE.Mesh(
      new THREE.CylinderGeometry(5.9, 6.1, 0.65, 16),
      lighthouseStone
    );
    galleryDeck.position.y = 34.2;
    galleryDeck.castShadow = true;
    galleryDeck.receiveShadow = true;
    lighthouse.add(galleryDeck);
    const galleryRail = new THREE.Mesh(
      new THREE.TorusGeometry(5.9, 0.16, 8, 24),
      lighthouseMetal
    );
    galleryRail.rotation.x = Math.PI / 2;
    galleryRail.position.y = 35.2;
    lighthouse.add(galleryRail);
    for (let index = 0; index < 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      const baluster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.075, 1.15, 6),
        lighthouseMetal
      );
      baluster.position.set(Math.sin(angle) * 5.9, 34.85, Math.cos(angle) * 5.9);
      lighthouse.add(baluster);
    }
    const lanternRoom = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 4.4, 12), lanternGlass);
    lanternRoom.position.y = 36;
    lighthouse.add(lanternRoom);
    const lighthouseFlameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc77d,
      emissive: 0xff8a36,
      emissiveIntensity: 1.8,
      roughness: 0.4
    });
    const lighthouseFlame = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2, 1),
      lighthouseFlameMaterial
    );
    lighthouseFlame.position.y = 36;
    lighthouseFlame.visible = this.litBeacons.has('signal');
    lighthouse.add(lighthouseFlame);
    const lanternRoof = new THREE.Mesh(new THREE.ConeGeometry(5.1, 2.4, 12), lighthouseRoofMaterial);
    lanternRoof.position.y = 39.4;
    lighthouse.add(lanternRoof);
    const lanternLight = new THREE.PointLight(
      0xffc77d,
      this.litBeacons.has('signal') ? 6 : 0.35,
      280,
      1.45
    );
    lanternLight.position.y = 36;
    lighthouse.add(lanternLight);
    lighthouse.position.set(
      85,
      this.terrainHeight(SIGNAL_PEAK.x + 85, SIGNAL_PEAK.z + 12) - islandGround,
      12
    );
    islandGroup.add(lighthouse);
    const lighthouseCollider = new CANNON.Body({
      mass: 0,
      material: this.propMaterial,
      position: new CANNON.Vec3(SIGNAL_PEAK.x + 85, this.terrainHeight(SIGNAL_PEAK.x + 85, SIGNAL_PEAK.z + 12) + 17, SIGNAL_PEAK.z + 12)
    });
    lighthouseCollider.addShape(new CANNON.Box(new CANNON.Vec3(7.5, 17, 7.5)));
    this.world.addBody(lighthouseCollider);
    this.lastSignalFlame = lighthouseFlame;
    this.lastSignalLight = lanternLight;

    const houseWall = new THREE.MeshStandardMaterial({
      color: 0xd5c8ac,
      roughness: 0.88,
      flatShading: true
    });
    const houseRoof = new THREE.MeshStandardMaterial({
      color: 0x814c3c,
      roughness: 0.9,
      flatShading: true
    });
    const islandHouses = [
      [-58, -36, 0.12], [-68, 0, -0.12], [-58, 38, 0.2],
      [-25, 62, -0.08], [18, 58, 0.12], [50, 34, -0.18]
    ];
    islandHouses.forEach(([x, z, rotation], index) => {
      const house = new THREE.Group();
      const houseGround = this.terrainHeight(SIGNAL_PEAK.x + x, SIGNAL_PEAK.z + z);
      house.position.set(x, houseGround - islandGround, z);
      house.rotation.y = rotation;
      const size = index % 2 ? 12 : 14;
      const footing = new THREE.Mesh(new THREE.BoxGeometry(size + 0.8, 0.6, size * 0.72 + 0.8), lighthouseStone);
      footing.position.y = 0.3;
      footing.castShadow = true;
      footing.receiveShadow = true;
      house.add(footing);
      const walls = new THREE.Mesh(new THREE.BoxGeometry(size, 6, size * 0.72), houseWall);
      walls.position.y = 3;
      walls.castShadow = true;
      house.add(walls);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(size * 0.68, 4.4, 4), houseRoof);
      roof.position.y = 8.1;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      house.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.1, 0.2), timber);
      door.position.set(0, 1.55, size * 0.37 + 0.12);
      house.add(door);
      [-1, 1].forEach(side => {
        const window = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.3, 0.14), lighthouseWindow);
        window.position.set(side * size * 0.22, 4, size * 0.36 + 0.12);
        house.add(window);
      });
      islandGroup.add(house);
      const houseCollider = new CANNON.Body({
        mass: 0,
        material: this.propMaterial,
        position: new CANNON.Vec3(SIGNAL_PEAK.x + x, houseGround + 3, SIGNAL_PEAK.z + z)
      });
      houseCollider.addShape(new CANNON.Box(new CANNON.Vec3(size / 2 + 0.3, 3, size * 0.36 + 0.3)));
      houseCollider.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotation);
      this.world.addBody(houseCollider);
    });

    const dock = new THREE.Group();
    dock.position.set(
      PIER_POSITION.x - SIGNAL_PEAK.x,
      seaLevel + 0.3 - islandGround,
      PIER_POSITION.z - SIGNAL_PEAK.z
    );
    dock.rotation.y = 0.38;
    const dockDeck = new THREE.Mesh(new THREE.BoxGeometry(9, 0.7, 42), timber);
    dockDeck.position.y = 0.3;
    dockDeck.castShadow = true;
    dockDeck.receiveShadow = true;
    dock.add(dockDeck);
    [-3.6, 3.6].forEach(x => {
      for (let z = -18; z <= 18; z += 9) {
        const piling = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 18, 8), timber);
        piling.position.set(x, -8.5, z);
        piling.castShadow = true;
        dock.add(piling);
      }
    });
    islandGroup.add(dock);

    const boat = new THREE.Group();
    boat.position.set(200, seaLevel + 4 - islandGround, 18);
    boat.rotation.y = -0.72;
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(4.2, 18, 5, 10), new THREE.MeshStandardMaterial({
      color: 0x35464a,
      roughness: 0.55,
      metalness: 0.25
    }));
    hull.rotation.x = Math.PI / 2;
    hull.scale.set(1, 0.65, 0.42);
    boat.add(hull);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 8), houseWall);
    cabin.position.y = 4.4;
    boat.add(cabin);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 13, 7), timber);
    mast.position.set(0, 10, -1.5);
    boat.add(mast);
    islandGroup.add(boat);

    this.scene.add(islandGroup);
  }

  _buildSettlementLife() {
    const center = new THREE.Vector3(SETTLEMENT.x, 0, SETTLEMENT.z);
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
      const benchX = center.x + side * 13;
      const benchZ = center.z + 14;
      bench.position.set(
        benchX,
        this.terrainHeight(benchX, benchZ) - center.y,
        benchZ
      );
      bench.rotation.y = side * 0.18;
      this.scene.add(bench);
    });

    const clothing = [
      0x8b5940, 0x4f6559, 0x6e6175, 0x9e5238, 0x3d5966, 0x7a6348, 0x566042, 0x8a453d
    ].map(color =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.88, flatShading: true })
    );
    const skin = new THREE.MeshStandardMaterial({ color: 0xc99872, roughness: 0.9 });
    const darkCloth = new THREE.MeshStandardMaterial({ color: 0x393a34, roughness: 0.9 });
    const trouserMaterial = new THREE.MeshStandardMaterial({ color: 0x514b42, roughness: 0.93 });
    const guardArmorMat = new THREE.MeshStandardMaterial({ color: 0x727a82, metalness: 0.7, roughness: 0.35 });
    const lanternMaterial = new THREE.MeshStandardMaterial({
      color: 0xffc56f,
      emissive: 0xff8e3d,
      emissiveIntensity: 1.4,
      roughness: 0.35
    });

    const WALKER_ROUTES = [
      {
        name: 'Alda Fen', role: 'signal keeper', speed: 0.0048,
        story: 'Alda keeps the names of every signal runner in a little ledger. Her mother carried the first flame across the river; Alda still leaves a lantern in the window for the next one.',
        waypoints: [[-16, -12], [-12, -16], [12, -16], [16, -12], [16, 12], [12, 16], [-12, 16], [-16, 12]]
      },
      {
        name: 'Captain Rusk', role: 'guard', profession: 'city guard', speed: 0.0038,
        story: 'Rusk has watched the harbor gate for eleven winters. He makes a quiet circuit from the arch to the square, checking the market road before the morning carts arrive.',
        waypoints: [[-100, 0], [-82, 0], [-74, 0], [-74, -20], [-25, -20], [25, -20], [25, 20], [-25, 20], [-74, 20], [-74, 0], [-82, 0]]
      },
      {
        name: 'Toma Vale', role: 'crier', profession: 'town crier', speed: 0.0052,
        story: 'Toma reads the market notices twice: once for the crowd, once for anyone too shy to ask for help. His sister is travelling with the eastern signal patrol.',
        waypoints: [[-74, -20], [-50, -20], [-25, -20], [25, -20], [55, -20], [75, -20], [125, -20], [143, -20], [125, 20], [75, 20], [25, 20], [-25, 20], [-74, 20]]
      },
      {
        name: 'Neri Venn', role: 'apothecary', speed: 0.0042,
        story: 'Neri learned remedies from the ash scrub and keeps a second set of books for travellers who cannot pay. The small green lamp outside her shop means the door is open.',
        waypoints: [[-42, -36], [-42, -30], [-42, -24], [-25, -20], [-25, -60], [-74, -60], [-74, -20], [-42, -20]]
      },
      {
        name: 'Kellan Or', role: 'cartographer', speed: 0.0055,
        story: 'Kellan redraws the pass after every storm. He marks safe ground in amber and flooded ground in blue, even when the council asks him to make the map look simpler.',
        waypoints: [[-74, -60], [-25, -60], [-25, -20], [-25, 20], [-25, 60], [25, 60], [75, 60], [75, 20], [75, -20], [75, -60], [25, -60], [-25, -60]]
      },
      {
        name: 'Mira Sol', role: 'carter', profession: 'carter', speed: 0.004,
        story: 'Mira knows every stable and market in town. She keeps a ledger of which traders have heard the signal, and paints a small amber mark on their wagons when the road is safe.',
        waypoints: [[125, 60], [145, 82], [176, 82], [184, 102], [184, 123], [155, 123], [184, 123], [184, 102], [176, 82], [145, 82], [125, 60], [125, 20], [75, 20], [75, 60], [125, 60]]
      },
      {
        name: 'Eryk Dain', role: 'lantern', profession: 'lantern maker', speed: 0.0046,
        story: 'Eryk makes lanterns with a small notch in the handle: one notch for every mile a keeper has to walk home. He has never made one with six notches.',
        waypoints: [[-42, 30], [-25, 20], [25, 20], [75, 20], [75, 60], [25, 60], [-25, 60], [-74, 60], [-74, 20], [-42, 30]]
      },
      {
        name: 'Ivo Marr', role: 'road courier', profession: 'road courier', speed: 0.005,
        story: 'Ivo carries market letters between the harbor gate, square and quay. He can tell which streets are safe by the lanterns still burning after dusk.',
        waypoints: [[-100, 0], [-82, 0], [-74, 0], [-25, 0], [-20, -20], [25, -20], [75, -20], [125, -20], [143, -20], [145, -60], [166, -60], [190, -56], [216, -52], [242, -48], [216, -52], [190, -56], [166, -60], [145, -60], [125, -20], [75, -20], [25, -20], [-25, -20], [-20, 0], [-74, 0], [-82, 0]]
      },
      {
        name: 'Sella Rook', role: 'dockhand', profession: 'dock keeper', speed: 0.0038,
        story: 'Sella keeps the harbor tally and mends nets between the morning tide and the market bell. She knows which boats can make the headland before the evening wind turns.',
        waypoints: [[145, -60], [166, -60], [190, -56], [216, -52], [242, -48], [216, -52], [190, -56], [166, -60]]
      },
      {
        name: 'Yara Venn', role: 'cloth merchant', profession: 'market trader', speed: 0.0044,
        story: 'Yara walks the north market before opening her stall. She knows which families need winter cloth and keeps their names in the back of her order book.',
        waypoints: [[-74, -60], [-25, -60], [25, -60], [75, -60], [125, -60], [125, -20], [75, -20], [25, -20], [-25, -20], [-74, -20], [-74, -60]]
      },
      {
        name: 'Perrin Holt', role: 'porter', profession: 'harbor porter', speed: 0.005,
        story: 'Perrin moves flour, lamp oil and letters between the south blocks and the quay. He takes the long street around the square so the market carts can pass.',
        waypoints: [[-25, 20], [-25, 60], [25, 60], [75, 60], [125, 60], [145, 82], [176, 82], [184, 102], [184, 123], [155, 123], [184, 123], [184, 102], [176, 82], [145, 82], [125, 60], [125, 20], [75, 20], [25, 20]]
      },
      {
        name: 'Oren Sable', role: 'courier', profession: 'coast courier', speed: 0.0052,
        story: 'Oren carries sealed letters along the coast road. The harbor loop is longer than the old shortcut, but it stays clear of the chapel yard and the stable carts.',
        waypoints: [[125, -60], [145, -60], [166, -60], [190, -56], [216, -52], [242, -48], [216, -52], [190, -56], [166, -60], [145, -60], [145, 20], [125, 20], [75, 20], [75, -20], [125, -20]]
      },
      {
        name: 'Mella Rusk', role: 'baker', profession: 'baker', speed: 0.0041,
        story: 'Mella brings the first loaves to the gate watch and leaves yesterday’s bread beside the fountain for anyone arriving after dark.',
        waypoints: [[-100, 0], [-82, 0], [-74, 0], [-74, -20], [-25, -20], [25, -20], [25, 20], [-25, 20], [-74, 20], [-74, 0]]
      },
      {
        name: 'Bera Moss', role: 'shepherd', profession: 'herder', speed: 0.0037,
        story: 'Bera brings wool and milk down from the crofts before the gate opens. The well lane is the only route wide enough for her flock to pass without crossing the market carts.',
        waypoints: [[-100, 0], [-180, -50], [-155, -72], [-143, -102], [-150, -136], [-178, -158], [-207, -151], [-224, -123], [-220, -91], [-197, -64], [-180, -50], [-100, 0]]
      },
      {
        name: 'Tarin Vale', role: 'woodcutter', profession: 'woodcutter', speed: 0.0039,
        story: 'Tarin stacks winter wood behind the croft lane and walks a bundle to the inn each morning. The stonecutters keep the lane clear so his cart can reach the lower gate.',
        waypoints: [[-100, 0], [-180, -50], [-155, -72], [-143, -102], [-150, -136], [-178, -158], [-207, -151], [-224, -123], [-220, -91], [-197, -64], [-180, -50], [-100, 0]]
      }
    ];

    this.settlementWalkers = [];
    WALKER_ROUTES.forEach((route, index) => {
      const pathPoints = route.waypoints.map(([offsetX, offsetZ]) => {
        const x = center.x + offsetX;
        const z = center.z + offsetZ;
        const ground = this.terrainHeight(x, z);
        const y = route.role === 'dockhand' && offsetX >= 144
          ? Math.max(ground + 0.65, WORLD_FLOOR_Y + 8.15)
          : ground;
        return new THREE.Vector3(x, y, z);
      });
      const path = new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal');
      const person = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.46, 1.05, 7),
        clothing[index % clothing.length]
      );
      body.position.y = 0.95;
      body.castShadow = true;
      person.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
      head.position.y = 1.78;
      head.castShadow = true;
      person.add(head);
      const boots = new THREE.MeshStandardMaterial({ color: 0x332a23, roughness: 0.94 });
      const legPivots = [-1, 1].map(side => {
        const leg = new THREE.Group();
        leg.position.set(side * 0.2, 0.65, 0);
        const trousers = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 0.62, 6),
          trouserMaterial
        );
        trousers.position.y = -0.3;
        leg.add(trousers);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.42), boots);
        foot.position.set(0, -0.53, 0.1);
        leg.add(foot);
        person.add(leg);
        return leg;
      });

      if (route.role === 'guard') {
        const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 8), guardArmorMat);
        helmet.position.y = 2.0;
        person.add(helmet);
      } else {
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.48), darkCloth);
        cap.position.y = 1.98;
        person.add(cap);
      }

      const armPivots = [-1, 1].map(side => {
        const arm = new THREE.Group();
        arm.position.set(side * 0.38, 1.28, 0);
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.13, 0.78, 6),
          clothing[index % clothing.length]
        );
        sleeve.position.y = -0.34;
        sleeve.rotation.z = side * -0.18;
        arm.add(sleeve);
        person.add(arm);
        return arm;
      });

      if (route.role === 'lantern') {
        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.42, 0.28), lanternMaterial);
        lantern.position.set(0.56, 0.88, 0.08);
        person.add(lantern);
      } else if (route.role === 'dockhand') {
        const basket = new THREE.Mesh(
          new THREE.BoxGeometry(0.62, 0.45, 0.52),
          new THREE.MeshStandardMaterial({ color: 0x7d6541, roughness: 0.95 })
        );
        basket.position.set(0.55, 0.72, 0.08);
        person.add(basket);
      } else if (route.role === 'shepherd' || route.role === 'woodcutter') {
        const staff = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.1, 1.65, 6),
          darkCloth
        );
        staff.position.set(0.55, 1.0, 0.08);
        staff.rotation.z = -0.18;
        person.add(staff);
      }
      this.scene.add(person);
      this.settlementWalkers.push({
        person,
        path,
        armPivots,
        legPivots,
        progress: index / WALKER_ROUTES.length,
        speed: route.speed,
        phase: index * 1.8,
        role: route.role,
        name: route.name,
        profession: route.profession ?? route.role,
        story: route.story,
        pauseTimer: 0,
        nextPauseAt: 0.5
      });
    });

    this.settlementArmy = [];
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
    if (e.code === 'Escape' && !editingControl) {
      if (this.noticeBoardViewActive) {
        e.preventDefault();
        this.exitNoticeBoardView();
        return;
      }
      if (this.garageOpen) {
        e.preventDefault();
        this.exitGarage();
        return;
      }
    }
    if (this.garageOpen) return;
    if (this.paused) return;

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
        if (!e.repeat && !this.interactWithNearbyCitizen()
          && !this.interactWithNearbySettlementTopic()
          && !this.interactWithNearbySkillsBoard()
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
    this.noticeBoardViewActive = false;
    this.noticeBoardCinematic = null;
    this.signalCinematic = null;
    const bridgeApproach = destination.id === 'crossing' && Number.isFinite(this.fordBridgeHeading)
      ? {
        x: destination.x - Math.sin(this.fordBridgeHeading) * 30,
        z: destination.z - Math.cos(this.fordBridgeHeading) * 30
      }
      : destination;
    const cityApproach = destination.id === 'settlement' && this.cityEntrance
      ? this.cityEntrance.clone().add(
        new THREE.Vector3(0, 0, 8).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          this.cityEntranceHeading
        )
      )
      : destination.id === 'signal' && this.signalArrival
        ? this.signalArrival
        : bridgeApproach;
    const landing = this.sampleRoadSurface(cityApproach.x, cityApproach.z, 24);
    if (!landing) return false;
    if (this.garageOpen) this.exitGarage();
    this._clearControls();
    this.autoDriveTarget = null;
    this.stopRally();
    this.destinationId = destination.id;
    this.carBody.position.set(landing.x, 0, landing.z);
    this._syncVehicleToTerrain();
    this.driveYaw = destination.id === 'settlement'
      ? Math.atan2(SETTLEMENT.x - landing.x, SETTLEMENT.z - landing.z)
      : destination.id === 'crossing' && Number.isFinite(this.fordBridgeHeading)
        ? this.fordBridgeHeading
        : Math.atan2(landing.directionX, landing.directionZ);
    this.carBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), this.driveYaw);
    this.carBody.velocity.set(0, 0, 0);
    this.carBody.angularVelocity.set(0, 0, 0);
    this.carBody.aabbNeedsUpdate = true;
    this.carBody.wakeUp();
    this.vehicleSpeed = 0;
    this.camera.position.set(
      landing.x - Math.sin(this.driveYaw) * 9,
      this.carBody.position.y + 7,
      landing.z - Math.cos(this.driveYaw) * 9
    );
    this.camera.lookAt(
      landing.x + Math.sin(this.driveYaw) * 8,
      this.carBody.position.y + 1.4,
      landing.z + Math.cos(this.driveYaw) * 8
    );
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

  _getGuidance(target, directOnly = false) {
    const { nodes, edges } = ROAD_GUIDANCE_GRAPH;
    const directDx = target.x - this.carBody.position.x;
    const directDz = target.z - this.carBody.position.z;
    const directDistance = Math.hypot(directDx, directDz);
    if (directOnly || directDistance <= 24) {
      const relativeBearing = Math.atan2(directDx, directDz) - this.driveYaw;
      const normalizedBearing = Math.atan2(Math.sin(relativeBearing), Math.cos(relativeBearing));
      return {
        distance: Math.round(directDistance),
        direction: directOnly || Math.abs(normalizedBearing) < 0.4
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
    const road = this.sampleRoadSurface?.(x, z, 20);
    if (!road) return terrainHeight;
    const roadBlend = 1 - THREE.MathUtils.smoothstep(
      road.distance,
      Math.max(2.6, road.width / 2 - 1.5),
      road.width / 2 + 3
    );
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
    let nearestSettlementTopicDistance = 14;
    this.settlementTopics.forEach(topic => {
      const distance = Math.hypot(
        this.carBody.position.x - topic.x,
        this.carBody.position.z - topic.z
      );
      const effectiveDist = topic.lit ? distance + 3 : distance;
      if (effectiveDist < nearestSettlementTopicDistance) {
        nearestSettlementTopicDistance = effectiveDist;
        this.nearbySettlementTopic = topic;
      }
    });
    const nearestCitizen = this.settlementWalkers
      ?.filter(walker => walker.name)
      .map(walker => ({
        walker,
        distance: Math.hypot(
          this.carBody.position.x - walker.person.position.x,
          this.carBody.position.z - walker.person.position.z
        )
      }))
      .filter(item => item.distance <= 12)
      .sort((a, b) => a.distance - b.distance)[0];
    this.nearbySettlementCitizen = nearestCitizen?.walker ?? null;

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
    this.settlementWalkers?.forEach(walker => {
      if (walker.role === 'crier') {
        walker.pauseTimer = Math.max(0, walker.pauseTimer - dt);
        if (walker.pauseTimer === 0) {
          const nextProgress = (walker.progress + walker.speed * dt) % 1;
          if (walker.progress < walker.nextPauseAt && nextProgress >= walker.nextPauseAt) {
            walker.progress = walker.nextPauseAt;
            walker.pauseTimer = 2.2;
            walker.nextPauseAt = walker.nextPauseAt === 0.5 ? 0.9 : 0.5;
          } else {
            walker.progress = nextProgress;
          }
        }
      } else {
        walker.progress = (walker.progress + walker.speed * dt) % 1;
      }
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
      walker.legPivots.forEach((leg, index) => {
        leg.rotation.x = Math.sin(walker.phase + index * Math.PI) * 0.18;
      });
    });
    this.settlementArmy?.forEach(unit => {
      unit.progress += unit.direction * unit.speed * dt / unit.route.getLength();
      if (unit.progress >= 1) {
        unit.progress = 1;
        unit.direction = -1;
      } else if (unit.progress <= 0) {
        unit.progress = 0;
        unit.direction = 1;
      }
      unit.phase += dt * (unit.cavalry ? 9 : 6);
      const point = unit.route.getPointAt(unit.progress);
      const tangent = unit.route.getTangentAt(unit.progress);
      unit.unit.position.set(
        point.x,
        this.terrainHeight(point.x, point.z),
        point.z
      );
      unit.unit.rotation.y = Math.atan2(tangent.x, tangent.z);
      if (unit.cavalry) {
        unit.unit.userData.legs.forEach((leg, index) => {
          leg.rotation.x = Math.sin(unit.phase + index * Math.PI) * 0.28;
        });
      } else {
        unit.unit.position.y += Math.abs(Math.sin(unit.phase)) * 0.035;
      }
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

    if (this.noticeBoardCinematic) {
      const elapsed = (now - this.noticeBoardCinematic.startTime) / this.noticeBoardCinematic.duration;
      const progress = THREE.MathUtils.clamp(elapsed, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      if (this.noticeBoardCinematic.phase === 'enter') {
        this.camera.position.lerpVectors(
          this.noticeBoardCinematic.startPosition,
          this.noticeBoardCinematic.endPosition,
          eased
        );
        this.camera.lookAt(
          this.noticeBoardCinematic.startTarget.clone().lerp(this.noticeBoardCinematic.endTarget, eased)
        );
        if (progress >= 1) {
          this.noticeBoardCinematic.phase = 'hold';
        }
      } else if (this.noticeBoardCinematic.phase === 'hold') {
        this.camera.position.copy(this.noticeBoardCinematic.endPosition);
        this.camera.lookAt(this.noticeBoardCinematic.endTarget);
        if (!this.noticeBoardCinematic.callbackFired) {
          this.noticeBoardCinematic.callbackFired = true;
          this.onSkillsBoardInteract?.();
        }
      } else if (this.noticeBoardCinematic.phase === 'exit') {
        this.camera.position.lerpVectors(
          this.noticeBoardCinematic.startPosition,
          targetCamPos,
          eased
        );
        this.camera.lookAt(
          this.noticeBoardCinematic.startTarget.clone().lerp(lookAt, eased)
        );
        if (progress >= 1) {
          this.noticeBoardCinematic = null;
        }
      }
    }


    if (this.rallyActive && !this.trackComplete && this.checkpoints[this.checkpointIndex]) {
      this.checkpoints.forEach((checkpoint, index) => {
        const active = index === this.checkpointIndex;
        const target = checkpoint.userData.position;
        const distance = Math.hypot(
          this.carGroup.position.x - target.x,
          this.carGroup.position.z - target.z
        );
        checkpoint.visible = active && distance <= (checkpoint.visible ? 84 : 70);
        const ring = checkpoint.userData.ring;
        ring.material.emissiveIntensity = THREE.MathUtils.lerp(
          ring.material.emissiveIntensity,
          active && checkpoint.visible ? 2.6 : 0.65,
          1 - Math.exp(-4 * dt)
        );
        if (active && checkpoint.visible) ring.scale.setScalar(1 + Math.sin(now * 0.003) * 0.045);
      });

      const target = this.checkpoints[this.checkpointIndex].userData.position;
      if (Math.hypot(this.carGroup.position.x - target.x, this.carGroup.position.z - target.z) < 5.5) {
        sound.playDiscovery();
        this.checkpointIndex++;
        this.trackComplete = this.checkpointIndex === this.checkpoints.length;
        if (this.trackComplete) {
          this.checkpoints.forEach(checkpoint => { checkpoint.visible = false; });
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

    const distToSkillsBoard = this.skillsBoardPosition
      ? Math.hypot(
          this.carBody.position.x - this.skillsBoardPosition.x,
          this.carBody.position.z - this.skillsBoardPosition.z
        )
      : 999;
    const nearSkillsBoard = distToSkillsBoard <= 22;

    if (this.noticeBoardRing) {
      this.noticeBoardRing.visible = nearSkillsBoard;
      if (nearSkillsBoard) {
        this.noticeBoardRing.rotation.y += dt * 0.4;
        this.noticeBoardRing.material.opacity = 0.35 + Math.sin(now * 0.004) * 0.2;
      }
    }
    if (this.noticeBoardPrompt) {
      this.camera.updateMatrixWorld();
      const projected = this.noticeBoardPromptPosition.clone().project(this.camera);
      const inView = projected.z >= -1 && projected.z <= 1
        && Math.abs(projected.x) <= 1
        && Math.abs(projected.y) <= 1;
      const visible = nearSkillsBoard && !this.noticeBoardViewActive && inView;
      this.noticeBoardPrompt.hidden = !visible;
      this.noticeBoardPrompt.setAttribute('aria-hidden', String(!visible));
      if (visible) {
        const canvasRect = this.canvas.getBoundingClientRect();
        const hostRect = this.noticeBoardPrompt.parentElement.getBoundingClientRect();
        const header = this.noticeBoardPrompt.parentElement.querySelector('.bruno-header');
        const headerBottom = header
          ? header.getBoundingClientRect().bottom - hostRect.top
          : 0;
        const x = canvasRect.left - hostRect.left + ((projected.x + 1) / 2) * canvasRect.width;
        const projectedY = canvasRect.top - hostRect.top + ((1 - projected.y) / 2) * canvasRect.height;
        const y = Math.max(projectedY, headerBottom + this.noticeBoardPrompt.offsetHeight + 8);
        this.noticeBoardPrompt.style.left = `${x}px`;
        this.noticeBoardPrompt.style.top = `${y}px`;
      }
    }

    if (this.pierWeathervane) {
      this.pierWeathervane.rotation.y = Math.sin(now * 0.0012) * 0.4 + 0.2;
    }

    const distToPierEnd = Math.hypot(
      this.carBody.position.x - PIER_POSITION.x,
      this.carBody.position.z - PIER_POSITION.z
    );
    const nearPierEnd = distToPierEnd <= 6;

    const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
    const nearPier = 1 - THREE.MathUtils.smoothstep(distToPierEnd, 50, 180);
    const eastFacing = THREE.MathUtils.smoothstep(cameraDirection.x, 0.2, 0.85);
    this.scene.fog.density = 0.0003 + nearPier * eastFacing * 0.00008;

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
        ? this._getGuidance(routeTarget, destination?.id === 'crossing')
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
      const carPosition = this.carBody.position;
      const nearestSecret = this.secretSites
        .filter(site => !this.foundSecrets.has(site.id)
          && (site.requiresSignals ?? 0) <= this.litBeacons.size
          && (!site.nightOnly || worldHour >= 20 || worldHour < 5))
        .map(site => ({
          ...site,
          distance: Math.hypot(carPosition.x - site.x, carPosition.z - site.z)
        }))
        .filter(site => site.distance <= 16)
        .sort((a, b) => a.distance - b.distance)[0];
      const nearestSettlementTopic = this.settlementTopics
        .map(topic => ({
          topic,
          distance: Math.hypot(carPosition.x - topic.x, carPosition.z - topic.z)
        }))
        .filter(item => item.distance <= 14)
        .sort((a, b) => a.distance - b.distance)[0];
      const nearestBeacon = this.destinations
        .map(destination => ({
          destination,
          distance: Math.hypot(
            carPosition.x - destination.pos.x,
            carPosition.z - destination.pos.z
          )
        }))
        .filter(item => item.distance <= 24)
        .sort((a, b) => a.distance - b.distance)[0];

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
          ? {
              id: this.nearbySettlementTopic.id,
              title: this.nearbySettlementTopic.title,
              establishment: this.nearbySettlementTopic.establishment,
              district: this.nearbySettlementTopic.district,
              lit: this.nearbySettlementTopic.lit,
              distance: Math.round(Math.hypot(
                this.carBody.position.x - this.nearbySettlementTopic.x,
                this.carBody.position.z - this.nearbySettlementTopic.z
              ))
            }
          : null,
        nearSkillsBoard: Boolean(nearSkillsBoard),
        skillsBoardDistance: Math.round(distToSkillsBoard),
        nearPierEnd: Boolean(nearPierEnd),
        pierDistance: Math.round(distToPierEnd),
        proximity: {
          secret: nearestSecret
            ? { id: nearestSecret.id, title: nearestSecret.title, distance: Math.round(nearestSecret.distance) }
            : null,
          settlement: nearestSettlementTopic
            ? {
                id: nearestSettlementTopic.topic.id,
                title: nearestSettlementTopic.topic.title,
                establishment: nearestSettlementTopic.topic.establishment,
                district: nearestSettlementTopic.topic.district,
                lit: nearestSettlementTopic.topic.lit,
                distance: Math.round(nearestSettlementTopic.distance)
              }
            : null,
          citizen: nearestCitizen
            ? {
                name: nearestCitizen.walker.name,
                role: nearestCitizen.walker.role,
                story: nearestCitizen.walker.story,
                distance: Math.round(nearestCitizen.distance)
              }
            : null,
          board: { distance: Math.round(distToSkillsBoard) },
          beacon: nearestBeacon
            ? {
                id: nearestBeacon.destination.id,
                title: nearestBeacon.destination.title,
                lit: nearestBeacon.destination.lit,
                distance: Math.round(nearestBeacon.distance)
              }
            : null,
          pier: { distance: Math.round(distToPierEnd) }
        },
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
    this.noticeBoardPrompt?.remove();
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
