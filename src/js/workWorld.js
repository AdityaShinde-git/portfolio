import * as THREE from 'three';

const clamp01 = value => Math.max(0, Math.min(1, value));
const WALK_TURNS = 1.6;

function createInterfaceTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 800;
  const context = canvas.getContext('2d');
  const accent = kind === 'oms' ? '#d8ad7c' : '#9bcabb';
  const ink = '#edf1eb';
  const muted = '#9ca9a0';

  context.fillStyle = '#111916';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#1b2520';
  context.fillRect(0, 0, canvas.width, 72);
  context.fillStyle = accent;
  context.fillRect(0, 0, 8, canvas.height);

  context.fillStyle = ink;
  context.font = '600 25px Arial, sans-serif';
  context.fillText(kind === 'oms' ? 'OMS  /  WORKSPACE' : 'DAFCA  /  MESSAGES', 38, 45);
  context.fillStyle = muted;
  context.font = '16px Arial, sans-serif';
  context.fillText('PROJECT INTERFACE · SCHEMATIC', 900, 42);

  context.fillStyle = '#18211d';
  context.fillRect(0, 72, 230, 728);
  const navItems = kind === 'oms'
    ? ['OVERVIEW', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', 'ANNOUNCEMENTS', 'TICKETS']
    : ['CONVERSATIONS', 'DIRECT MESSAGES', 'CHANNELS', 'SHARED FILES', 'PEOPLE'];
  context.font = '17px Arial, sans-serif';
  navItems.forEach((item, index) => {
    const y = 132 + index * 62;
    if (index === 0) {
      context.fillStyle = '#26342d';
      context.fillRect(18, y - 28, 194, 42);
      context.fillStyle = accent;
      context.fillRect(18, y - 28, 4, 42);
    }
    context.fillStyle = index === 0 ? ink : muted;
    context.fillText(item, 36, y);
  });

  context.fillStyle = ink;
  context.font = '600 34px Arial, sans-serif';
  context.fillText(kind === 'oms' ? 'People operations' : 'Team conversations', 278, 137);
  context.fillStyle = muted;
  context.font = '18px Arial, sans-serif';
  context.fillText(kind === 'oms'
    ? 'Connected modules for everyday workplace workflows'
    : 'Persistent messages, shared files, and live collaboration', 280, 174);

  const cardY = 215;
  const cardWidth = kind === 'oms' ? 220 : 285;
  const cardGap = 18;
  const cards = kind === 'oms'
    ? ['EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL']
    : ['MESSAGES', 'CONVERSATIONS', 'FILES'];
  cards.forEach((label, index) => {
    const x = 280 + index * (cardWidth + cardGap);
    context.fillStyle = '#1b2721';
    context.fillRect(x, cardY, cardWidth, 110);
    context.strokeStyle = '#35453b';
    context.lineWidth = 2;
    context.strokeRect(x, cardY, cardWidth, 110);
    context.fillStyle = accent;
    context.fillRect(x + 18, cardY + 18, 5, 72);
    context.fillStyle = muted;
    context.font = '15px Arial, sans-serif';
    context.fillText('WORKFLOW', x + 36, cardY + 42);
    context.fillStyle = ink;
    context.font = '600 19px Arial, sans-serif';
    context.fillText(label, x + 36, cardY + 72);
  });

  const listTop = 355;
  context.fillStyle = '#1b2721';
  context.fillRect(280, listTop, 930, 388);
  context.fillStyle = '#26342d';
  context.fillRect(280, listTop, 930, 52);
  context.fillStyle = accent;
  context.font = '600 15px Arial, sans-serif';
  context.fillText(kind === 'oms' ? 'MODULE WORKFLOWS' : 'RECENT ACTIVITY', 305, listTop + 33);

  const rowLabels = kind === 'oms'
    ? ['Employee records', 'Time and attendance', 'Leave requests', 'Payroll workflows', 'Announcements and tickets']
    : ['Persistent conversations', 'Real-time message updates', 'Shared files', 'Conversation history', 'Backend communication APIs'];
  rowLabels.forEach((label, index) => {
    const y = listTop + 112 + index * 54;
    context.strokeStyle = '#2e3b33';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(304, y + 17);
    context.lineTo(1188, y + 17);
    context.stroke();
    context.fillStyle = accent;
    context.beginPath();
    context.arc(316, y, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = ink;
    context.font = '18px Arial, sans-serif';
    context.fillText(label, 338, y + 6);
    context.fillStyle = muted;
    context.font = '15px Arial, sans-serif';
    context.fillText(kind === 'oms' ? 'CONNECTED MODULE' : 'REAL-TIME SYSTEM', 925, y + 6);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class WorkWorld {
  constructor(canvas, scrollArea, getProgress) {
    this.canvas = canvas;
    this.scrollArea = scrollArea;
    this.getProgress = getProgress;
    this.disposed = false;
    this.progress = 0;
    this.targetProgress = 0;
    this.animatedLights = [];
    this.interfaceTextures = [];
    this.projectStations = [];

    this._animate = this._animate.bind(this);
    this._resize = this._resize.bind(this);

    this._init();
  }

  _init() {
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    this.renderer.setSize(bounds.width, bounds.height, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x151b17);
    this.scene.fog = new THREE.FogExp2(0x151b17, 0.009);

    this.camera = new THREE.PerspectiveCamera(45, bounds.width / bounds.height, 0.1, 240);
    this.camera.position.set(0, 12, 25);

    this.scene.add(new THREE.HemisphereLight(0xb9c9c0, 0x28221d, 1.8));

    const key = new THREE.DirectionalLight(0xffd6a1, 3.2);
    key.position.set(-22, 38, 20);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -40;
    key.shadow.camera.right = 40;
    key.shadow.camera.top = 40;
    key.shadow.camera.bottom = -40;
    key.shadow.bias = -0.0005;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x93b7ad, 1.05);
    fill.position.set(22, 5, -24);
    this.scene.add(fill);

    const haze = new THREE.PointLight(0xd47750, 58, 58, 1.8);
    haze.position.set(4, -20, 0);
    this.scene.add(haze);

    this._buildSpiral();
    this._buildWorldFloor();
    this._buildOmsStation();
    this._buildDafcaStation();
    this._buildAtmosphere();

    this.resizeObserver = new ResizeObserver(this._resize);
    this.resizeObserver.observe(this.canvas.parentElement);
    this._lastFrameTime = performance.now();
    this._animate();
  }

  _path(progress, radiusOffset = 0, heightOffset = 0, phaseOffset = 0) {
    const t = clamp01(progress);
    const angle = -0.48 + t * Math.PI * 2 * WALK_TURNS + phaseOffset;
    const radius = 8.5 + radiusOffset;
    return new THREE.Vector3(
      Math.cos(angle) * radius,
      17 - t * 54 + heightOffset,
      Math.sin(angle) * radius
    );
  }

  _radial(progress, phaseOffset = 0) {
    const angle = -0.48 + clamp01(progress) * Math.PI * 2 * WALK_TURNS + phaseOffset;
    return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  }

  _pathCurve(radiusOffset = 0, heightOffset = 0, samples = 360, phaseOffset = 0) {
    const points = [];
    for (let i = 0; i <= samples; i += 1) {
      points.push(this._path(i / samples, radiusOffset, heightOffset, phaseOffset));
    }
    return new THREE.CatmullRomCurve3(points, false, 'centripetal');
  }

  _material(color, roughness = 0.72, metalness = 0.08, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...extra
    });
  }

  _addBox(parent, size, position, material, rotationY = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.rotation.y = rotationY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _addInterfaceDisplay(parent, kind, position, width, height) {
    const frame = new THREE.Group();
    frame.position.set(...position);
    parent.add(frame);

    const frameMaterial = this._material(0x29332d, 0.36, 0.66);
    const texture = createInterfaceTexture(kind);
    this.interfaceTextures.push(texture);
    const screenMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      toneMapped: false
    });
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.28, height + 0.28, 0.24),
      frameMaterial
    );
    back.castShadow = true;
    frame.add(back);

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      screenMaterial
    );
    screen.position.z = 0.13;
    frame.add(screen);

    const status = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 8),
      new THREE.MeshBasicMaterial({ color: kind === 'oms' ? 0xd8ad7c : 0x9bcabb })
    );
    status.position.set(width / 2 - 0.14, height / 2 - 0.14, 0.145);
    frame.add(status);
    return frame;
  }

  _buildSpiral() {
    const backboneMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8c99d,
      emissive: 0x35472d,
      emissiveIntensity: 0.62,
      roughness: 0.38,
      metalness: 0.22
    });
    const baseMaterials = [
      this._material(0x9bb9a5, 0.42, 0.3, { emissive: 0x21382e, emissiveIntensity: 0.4 }),
      this._material(0xd1b187, 0.42, 0.3, { emissive: 0x48301c, emissiveIntensity: 0.36 })
    ];
    const curve = this._pathCurve(0, 0, 520);
    const backbone = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 520, 0.17, 10, false),
      backboneMaterial
    );
    backbone.castShadow = true;
    this.scene.add(backbone);

    const baseGeometry = new THREE.CylinderGeometry(0.045, 0.045, 1, 8);
    const nodeGeometry = new THREE.SphereGeometry(0.18, 10, 8);
    for (let i = 2; i < 72; i += 2) {
      const progress = i / 74;
      const start = this._path(progress);
      const end = this._path(progress, -1.65);
      const direction = end.clone().sub(start);
      const base = new THREE.Mesh(baseGeometry, baseMaterials[(i / 2) % 2]);
      base.position.copy(start).add(end).multiplyScalar(0.5);
      base.scale.y = direction.length();
      base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      this.scene.add(base);

      const node = new THREE.Mesh(nodeGeometry, backboneMaterial);
      node.position.copy(start);
      this.scene.add(node);
    }
  }

  _buildWorldFloor() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      this._material(0x202923, 0.95)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -38.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const groundRings = [19, 29, 42, 58];
    groundRings.forEach((radius, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.035, 4, 180),
        new THREE.MeshBasicMaterial({
          color: index % 2 ? 0x586b5c : 0x88664e,
          transparent: true,
          opacity: 0.24 - index * 0.035
        })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -38.35 + index * 0.012;
      this.scene.add(ring);
    });

    const stone = this._material(0x374239, 0.92);
    for (let i = 0; i < 34; i += 1) {
      const angle = i * 2.399;
      const radius = 13 + (i % 6) * 2.2;
      const height = 1.1 + (i % 5) * 0.62;
      const boulder = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55 + (i % 4) * 0.22, 1),
        stone
      );
      boulder.position.set(Math.cos(angle) * radius, -38 + height * 0.3, Math.sin(angle) * radius);
      boulder.scale.set(1.4, height, 0.9);
      boulder.rotation.set(angle * 0.2, angle, angle * 0.07);
      boulder.castShadow = true;
      boulder.receiveShadow = true;
      this.scene.add(boulder);
    }
  }

  _makeStation(progress, accent) {
    const position = this._path(progress, -3, 0, 0.72);
    const group = new THREE.Group();
    group.position.copy(position);
    group.userData.chapterProgress = progress;
    group.userData.baseScale = 0.78;
    group.scale.setScalar(group.userData.baseScale);
    const radial = this._radial(progress, 0.72);
    group.rotation.y = Math.atan2(radial.x, radial.z);
    this.scene.add(group);
    this.projectStations.push(group);

    const platformShape = new THREE.Shape();
    platformShape.moveTo(-8, -5.8);
    platformShape.lineTo(-5.8, -8);
    platformShape.lineTo(5.8, -8);
    platformShape.lineTo(8, -5.8);
    platformShape.lineTo(8, 5.8);
    platformShape.lineTo(5.8, 8);
    platformShape.lineTo(-5.8, 8);
    platformShape.lineTo(-8, 5.8);
    platformShape.closePath();
    const platformGeometry = new THREE.ExtrudeGeometry(platformShape, {
      depth: 0.72,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.12,
      bevelThickness: 0.08
    });
    platformGeometry.rotateX(-Math.PI / 2);
    const base = new THREE.Mesh(platformGeometry, this._material(0x586257, 0.78, 0.18));
    base.position.y = -0.36;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const deckShape = new THREE.Shape();
    deckShape.moveTo(-7.45, -5.45);
    deckShape.lineTo(-5.45, -7.45);
    deckShape.lineTo(5.45, -7.45);
    deckShape.lineTo(7.45, -5.45);
    deckShape.lineTo(7.45, 5.45);
    deckShape.lineTo(5.45, 7.45);
    deckShape.lineTo(-5.45, 7.45);
    deckShape.lineTo(-7.45, 5.45);
    deckShape.closePath();
    const deckGeometry = new THREE.ExtrudeGeometry(deckShape, { depth: 0.13, bevelEnabled: false });
    deckGeometry.rotateX(-Math.PI / 2);
    const deck = new THREE.Mesh(deckGeometry, this._material(0x929284, 0.84, 0.12));
    deck.position.y = 0.37;
    deck.receiveShadow = true;
    group.add(deck);

    const deckEdge = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.28,
      roughness: 0.46,
      metalness: 0.34
    });
    [
      [[-6.2, 0.51, -7.18], [12.4, 0.08, 0.1]],
      [[-6.2, 0.51, 7.18], [12.4, 0.08, 0.1]],
      [[-7.18, 0.51, -6.2], [0.1, 0.08, 12.4]],
      [[7.18, 0.51, -6.2], [0.1, 0.08, 12.4]]
    ].forEach(([[x, y, z], size]) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(...size), deckEdge);
      strip.position.set(x, y, z);
      group.add(strip);
    });

    const approach = new THREE.Mesh(
      new THREE.BoxGeometry(5.15, 0.28, 18.4),
      this._material(0x777d70, 0.88, 0.08)
    );
    approach.position.set(0, 0.36, -16.25);
    approach.receiveShadow = true;
    group.add(approach);

    const approachEdge = this._material(0x444c43, 0.62, 0.28);
    [-2.48, 2.48].forEach(x => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 18.2), approachEdge);
      edge.position.set(x, 0.55, -16.25);
      group.add(edge);
    });

    const supportMaterial = this._material(0x434c44, 0.7, 0.34);
    const floorY = -38.5 - group.position.y;
    [-6.45, 6.45].forEach(x => {
      [-3.8, 3.8].forEach(z => {
        const top = -0.72;
        const length = top - floorY;
        const pier = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.52, length, 8),
          supportMaterial
        );
        pier.position.set(x, floorY + length / 2, z);
        pier.castShadow = true;
        pier.receiveShadow = true;
        group.add(pier);

        const footing = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 0.28, 1.4),
          supportMaterial
        );
        footing.position.set(x, floorY + 0.14, z);
        footing.castShadow = true;
        group.add(footing);
      });
    });

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 1.55, 10),
      this._material(0x69776b, 0.52, 0.24)
    );
    hub.position.y = 0.94;
    hub.castShadow = true;
    hub.receiveShadow = true;
    group.add(hub);

    const hubTop = new THREE.Mesh(
      new THREE.CylinderGeometry(1.14, 1.14, 0.12, 32),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.28,
        roughness: 0.42,
        metalness: 0.3
      })
    );
    hubTop.position.y = 1.76;
    group.add(hubTop);

    return group;
  }

  _addStationTree(group, x, z, size, tint) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09 * size, 0.15 * size, 1.25 * size, 8),
      this._material(0x5c4938)
    );
    trunk.position.set(x, 0.77 * size, z);
    group.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.6 * size, 2),
      this._material(tint, 0.9)
    );
    crown.position.set(x, 1.52 * size, z);
    crown.scale.set(0.94, 1.16, 0.94);
    crown.castShadow = true;
    group.add(crown);
  }

  _buildOmsStation() {
    const group = this._makeStation(0.34, 0xb87a52);
    const stone = this._material(0x9b927d, 0.86);
    const glass = this._material(0x536e65, 0.3, 0.34, {
      emissive: 0x14231d,
      emissiveIntensity: 0.32
    });
    const trim = this._material(0x363d35, 0.5, 0.38);
    const glazing = this._material(0xe0bb87, 0.36, 0.2, {
      emissive: 0x8c5934,
      emissiveIntensity: 0.55
    });
    const buildings = [
      { x: -2.8, z: -1.45, w: 3.5, d: 2.65, h: 4.6, material: glass },
      { x: 2.05, z: -1.6, w: 2.25, d: 2.5, h: 3.3, material: stone },
      { x: -2.6, z: 2.1, w: 2.45, d: 2.15, h: 2.75, material: stone },
      { x: 2.1, z: 2.0, w: 2.75, d: 2.2, h: 3.55, material: glass }
    ];

    buildings.forEach(building => {
      const { x, z, w, d, h } = building;
      this._addBox(group, [w, h, d], [x, h / 2 + 0.16, z], building.material);
      this._addBox(group, [w + 0.18, 0.18, d + 0.18], [x, h + 0.16, z], trim);
      this._addBox(group, [w + 0.32, 0.12, d + 0.32], [x, 0.22, z], stone);

      const floors = Math.max(2, Math.floor(h / 1.05));
      const panes = Math.max(3, Math.floor(w / 0.48));
      for (let floor = 0; floor < floors; floor += 1) {
        const y = 0.68 + floor * 1.03;
        for (let pane = 0; pane < panes; pane += 1) {
          const paneX = x - w / 2 + ((pane + 0.5) * w) / panes;
          const paneWidth = (w / panes) * 0.58;
          this._addBox(
            group,
            [paneWidth, 0.48, 0.045],
            [paneX, y, z + d / 2 + 0.028],
            pane % 4 === 1 && floor % 2 === 0 ? glazing : glass
          );
          this._addBox(
            group,
            [0.045, 0.48, (d / 3) * 0.58],
            [x + w / 2 + 0.028, y, z - d / 2 + ((pane % 3) + 0.5) * d / 3],
            pane % 3 === 0 ? glazing : glass
          );
        }
        this._addBox(group, [w + 0.06, 0.055, 0.07], [x, y + 0.31, z + d / 2 + 0.035], stone);
      }
    });

    const entry = new THREE.Group();
    entry.position.set(-0.35, 0, 2.25);
    group.add(entry);
    this._addBox(entry, [2.5, 0.16, 1.5], [0, 2.45, 0.2], trim);
    this._addBox(entry, [1.85, 2.2, 0.16], [0, 1.24, 0], glass);
    this._addBox(entry, [0.055, 2.0, 0.06], [0, 1.2, 0.1], glazing);
    [-1.05, 1.05].forEach(x => this._addBox(entry, [0.12, 2.35, 0.14], [x, 1.18, 0.24], stone));

    const interfaceDisplay = this._addInterfaceDisplay(group, 'oms', [0, 3.5, 4.3], 5.1, 3.18);
    interfaceDisplay.rotation.y = -0.08;

    const plaza = this._material(0xb1a58d, 0.92);
    this._addBox(group, [0.62, 0.04, 8.3], [-0.35, 0.08, 0], plaza);
    this._addBox(group, [9.8, 0.04, 0.62], [0, 0.08, 0], plaza);
    for (let i = 0; i < 8; i += 1) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.05, 1.7, 8),
        trim
      );
      const angle = i * Math.PI / 4;
      post.position.set(Math.cos(angle) * 5.2, 0.88, Math.sin(angle) * 5.2);
      group.add(post);
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 12, 8),
        glazing
      );
      lamp.position.set(post.position.x, 1.78, post.position.z);
      group.add(lamp);
    }

    [[-5.45, -4.15], [5.2, -4.0], [-5.25, 4.3], [5.25, 4.1]].forEach((point, index) => {
      this._addStationTree(group, point[0], point[1], index % 2 ? 1.05 : 0.82, index % 2 ? 0x647052 : 0x7b7960);
    });

    const warmLight = new THREE.PointLight(0xe0a66a, 33, 23, 1.5);
    warmLight.position.copy(group.position).add(new THREE.Vector3(-2, 8, 4));
    this.scene.add(warmLight);
    this.animatedLights.push(warmLight);
  }

  _buildDafcaStation() {
    const group = this._makeStation(0.7, 0x7faea2);
    const frameMat = this._material(0xc0b7a1, 0.38, 0.48);
    const glassMat = this._material(0x436b65, 0.26, 0.38, {
      transparent: true,
      opacity: 0.86,
      emissive: 0x102d2a,
      emissiveIntensity: 0.58
    });
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: 0xb6d4c0,
      emissive: 0x477a66,
      emissiveIntensity: 0.78,
      roughness: 0.35,
      metalness: 0.12
    });
    const connectionPoints = [
      new THREE.Vector3(-3.9, 3.0, -1.8),
      new THREE.Vector3(0, 4.5, -2.8),
      new THREE.Vector3(3.8, 3.25, -1.3),
      new THREE.Vector3(-2.7, 2.7, 2.1),
      new THREE.Vector3(2.65, 3.4, 2.15)
    ];
    const core = new THREE.Group();
    core.position.set(0, 1.3, 0);
    group.add(core);

    this._addBox(core, [3.7, 0.2, 3.3], [0, 0, 0], frameMat);
    this._addBox(core, [3.35, 1.65, 0.12], [0, 0.88, -1.58], glassMat);
    this._addBox(core, [3.35, 0.12, 0.18], [0, 1.77, -1.58], frameMat);
    this._addBox(core, [3.35, 0.12, 0.18], [0, 0.02, -1.58], frameMat);
    [-1.68, -0.57, 0.57, 1.68].forEach(x => {
      this._addBox(core, [0.1, 1.75, 0.18], [x, 0.88, -1.58], frameMat);
    });

    const addMessagePanel = (point, index) => {
      const panel = new THREE.Group();
      panel.position.copy(point);
      panel.rotation.y = Math.atan2(point.x, point.z) * 0.62;
      group.add(panel);
      const width = index === 1 ? 2.5 : 2.05;
      const height = index === 1 ? 1.72 : 1.4;
      this._addBox(panel, [width + 0.2, height + 0.2, 0.16], [0, 0, 0], frameMat);
      this._addBox(panel, [width, height, 0.13], [0, 0, 0.1], glassMat);
      this._addBox(panel, [width * 0.72, 0.09, 0.035], [-width * 0.06, height * 0.3, 0.18], bubbleMat);
      this._addBox(panel, [width * 0.48, 0.085, 0.035], [width * 0.2, height * 0.08, 0.18], frameMat);
      this._addBox(panel, [width * 0.66, 0.09, 0.035], [-width * 0.04, -height * 0.15, 0.18], bubbleMat);
      this._addBox(panel, [width * 0.28, 0.045, 0.035], [-width * 0.24, -height * 0.36, 0.18], frameMat);
      const status = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 8),
        bubbleMat
      );
      status.position.set(-width * 0.38, height * 0.37, 0.2);
      panel.add(status);
    };
    connectionPoints.forEach(addMessagePanel);

    connectionPoints.forEach((point, index) => {
      const next = connectionPoints[(index + 1) % connectionPoints.length];
      const curve = new THREE.CatmullRomCurve3([
        point,
        point.clone().lerp(next, 0.35).add(new THREE.Vector3(0, 1.1, 0)),
        point.clone().lerp(next, 0.72).add(new THREE.Vector3(0, 0.9, 0)),
        next
      ]);
      group.add(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 28, 0.035, 6, false),
        bubbleMat
      ));
    });

    const archive = new THREE.Group();
    archive.position.set(0, 1.55, 0.2);
    group.add(archive);
    for (let i = 0; i < 4; i += 1) {
      const fileCard = this._addBox(
        archive,
        [1.65, 0.11, 1.95],
        [0, i * 0.2, 0],
        i % 2 ? glassMat : frameMat
      );
      fileCard.rotation.y = (i - 1.5) * 0.055;
    }
    for (let i = 0; i < 3; i += 1) {
      this._addBox(
        archive,
        [0.78 - i * 0.1, 0.035, 0.045],
        [-0.22, 0.13 + i * 0.2, 1.01],
        bubbleMat
      );
    }

    const archiveArch = new THREE.Mesh(
      new THREE.TorusGeometry(2.35, 0.075, 8, 80, Math.PI),
      frameMat
    );
    archiveArch.position.set(0, 0.16, 0.15);
    archiveArch.rotation.z = Math.PI;
    group.add(archiveArch);

    const interfaceDisplay = this._addInterfaceDisplay(group, 'dafca', [0, 4.25, 4.1], 5.35, 3.34);
    interfaceDisplay.rotation.y = 0.08;

    const coolLight = new THREE.PointLight(0x87bdac, 36, 25, 1.5);
    coolLight.position.copy(group.position).add(new THREE.Vector3(0, 8, 3));
    this.scene.add(coolLight);
    this.animatedLights.push(coolLight);
    this.animatedCore = core;
  }

  _buildAtmosphere() {
    const count = 480;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const warm = new THREE.Color(0xd1a27a);
    const cool = new THREE.Color(0x92b2a5);
    this.particleOffsets = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const t = Math.random();
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.random() * 19;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 17 - t * 54 + (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const color = i % 3 ? warm : cool;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      this.particleOffsets[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 0.085,
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        sizeAttenuation: true,
        depthWrite: false
      })
    );
    this.scene.add(this.particles);
    this._particlePositions = positions;
  }

  _resize() {
    if (!this.renderer || this.disposed) return;
    const bounds = this.canvas.parentElement.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    this.camera.aspect = bounds.width / bounds.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(bounds.width, bounds.height, false);
  }

  _animate() {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this._animate);

    const now = performance.now();
    const delta = Math.min((now - this._lastFrameTime) / 1000, 0.05);
    this._lastFrameTime = now;
    this.targetProgress = clamp01(this.getProgress());
    this.progress = this.targetProgress;

    const cameraRadiusOffset = 11;
    const cameraHeight = 7;
    const walkPosition = this._path(this.progress, cameraRadiusOffset, cameraHeight, 0.72);
    const focus = new THREE.Vector3(0, 17 - this.progress * 54, 0);

    this.camera.position.copy(walkPosition);
    this.camera.lookAt(focus);

    this.projectStations.forEach(station => {
      const distance = Math.abs(this.progress - station.userData.chapterProgress);
      const reveal = THREE.MathUtils.clamp((0.26 - distance) / 0.12, 0, 1);
      const easedReveal = reveal * reveal * (3 - 2 * reveal);
      station.visible = easedReveal > 0.01;
      station.scale.setScalar(station.userData.baseScale * easedReveal);
    });

    if (this.animatedCore) {
      this.animatedCore.rotation.y += delta * 0.14;
    }
    this.animatedLights?.forEach((light, index) => {
      light.intensity = (index ? 27 : 19) + Math.sin(now * 0.00075 + index * 1.7) * 2.2;
    });

    for (let i = 0; i < this.particleOffsets.length; i += 1) {
      const index = i * 3;
      this._particlePositions[index + 1] += delta * (0.11 + (i % 4) * 0.018);
      if (this._particlePositions[index + 1] > 19) this._particlePositions[index + 1] = -39;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver?.disconnect();
    this.scene.traverse(object => {
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose();
    });
    this.interfaceTextures.forEach(texture => texture.dispose());
    this.renderer.dispose();
  }
}
