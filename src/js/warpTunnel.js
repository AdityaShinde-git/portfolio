/**
 * ProjectObservatory — interactive 3D index for selected work
 * Features:
 * - Edge-to-edge cinematic WebGL space with ACES tone mapping & atmospheric fog
 * - Floating 3D holographic project portal stages with dynamic canvas textures
 * - Smooth inertia wheel & touch drag scrolling with spring physics (lerp)
 * - 3D card tilt & specular light glint on mouse parallax
 * - Warp-speed particle velocity streaks responding to scroll inertia
 * - Raycaster click-to-expand case study interaction
 */
import * as THREE from 'three';
import { sound } from './soundEngine.js';

export class WarpTunnel {
  constructor(canvas, projects = [], onSelectProject = null, onSectionChange = null) {
    this.canvas = canvas;
    this.projects = projects;
    this.onSelectProject = onSelectProject;
    this.onSectionChange = onSectionChange;

    this.currentSection = 0;
    this.scrollProgress = 0;
    this.targetProgress = 0;
    this.scrollVelocity = 0;
    this.lastProgress = 0;

    this.mouse = new THREE.Vector2(0, 0);
    this.targetMouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.hoveredIndex = -1;

    this.isDragging = false;
    this.dragStartY = 0;
    this.dragStartProgress = 0;
    this.disposed = false;

    this._onWheel = this._onWheel.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onClick = this._onClick.bind(this);
    this._onKey = this._onKey.bind(this);
    this._onResize = this._onResize.bind(this);

    this._init();
  }

  _init() {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;

    // 1. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // 2. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);
    this.scene.fog = new THREE.FogExp2(0x05070d, 0.018);

    // 3. Camera
    this.camera = new THREE.PerspectiveCamera(52, w / h, 0.1, 300);
    this.camera.position.set(0, 0, 10);

    // 4. Lights
    const ambient = new THREE.AmbientLight(0xdde8ff, 0.7);
    this.scene.add(ambient);

    this.keyLight = new THREE.PointLight(0xc3ed91, 4.5, 70);
    this.keyLight.position.set(5, 8, 12);
    this.scene.add(this.keyLight);

    this.fillLight = new THREE.PointLight(0xe98cbd, 3.4, 60);
    this.fillLight.position.set(-8, -4, 8);
    this.scene.add(this.fillLight);

    // 5. Build Scene Layers
    this._buildStarField();
    this._buildCosmicGrid();
    this._buildProjectCards();

    // 6. Event Listeners
    const targetEl = this.canvas.parentElement || this.canvas;
    targetEl.addEventListener('wheel', this._onWheel, { passive: false });
    targetEl.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    targetEl.addEventListener('click', this._onClick);
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', this._onResize);

    this._lastFrameTime = performance.now();
    this._animate();
  }

  _buildStarField() {
    const count = 2800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const originalZ = new Float32Array(count);

    const palette = [
      new THREE.Color(0xc3ed91),
      new THREE.Color(0x8adecc),
      new THREE.Color(0xffffff),
      new THREE.Color(0x76a5ff)
    ];

    for (let i = 0; i < count; i++) {
      const radius = 6 + Math.random() * 55;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.sin(angle) * radius;
      const z = (Math.random() - 0.5) * 160;
      positions[i * 3 + 2] = z;
      originalZ[i] = z;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
    this._starPositions = positions;
    this._originalZ = originalZ;
  }

  _buildCosmicGrid() {
    // Holographic background horizon grid plane
    const gridGeo = new THREE.PlaneGeometry(160, 240, 32, 48);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x4b6756,
      wireframe: true,
      transparent: true,
      opacity: 0.045
    });
    this.floorGrid = new THREE.Mesh(gridGeo, gridMat);
    this.floorGrid.rotation.x = -Math.PI / 2;
    this.floorGrid.position.y = -6;
    this.scene.add(this.floorGrid);

    // Floating concentric energy rings
    this.rings = [];
    for (let i = 0; i < 8; i++) {
      const ringGeo = new THREE.TorusGeometry(8 + i * 2.5, 0.03, 8, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xc3ed91 : 0x8adecc,
        transparent: true,
        opacity: 0.08 + (i % 3 === 0 ? 0.08 : 0)
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.z = -i * 12;
      this.scene.add(ring);
      this.rings.push(ring);
    }
  }

  _createProjectCanvasTexture(project, index) {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 900;
    const ctx = canvas.getContext('2d');
    const isOms = project.id === 'oms-hrms';
    const accent = isOms ? '#c7f28b' : '#ff9fbd';
    const bgGrad = ctx.createLinearGradient(0, 0, 1400, 900);
    bgGrad.addColorStop(0, '#17211d');
    bgGrad.addColorStop(0.55, '#111613');
    bgGrad.addColorStop(1, '#080b0c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(1010, 450, 12, 1010, 450, 580);
    glow.addColorStop(0, isOms ? 'rgba(129, 188, 122, 0.25)' : 'rgba(199, 111, 130, 0.26)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(250, 40, 1150, 820);
    ctx.lineWidth = 1;

    if (isOms) {
      const polygon = (points, fill, stroke = null) => {
        ctx.beginPath();
        points.forEach(([x, y], pointIndex) => {
          if (pointIndex === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.stroke();
        }
      };
      const block = (x, y, width, depth, height, front, side, top) => {
        const skew = depth * 0.52;
        polygon([[x, y], [x + width, y - skew], [x + width, y - skew - height], [x, y - height]], front, 'rgba(231,245,222,.12)');
        polygon([[x + width, y - skew], [x + width + depth, y], [x + width + depth, y - height], [x + width, y - skew - height]], side, 'rgba(231,245,222,.12)');
        polygon([[x, y - height], [x + width, y - skew - height], [x + width + depth, y - height], [x + depth, y]], top, 'rgba(231,245,222,.16)');
        ctx.fillStyle = 'rgba(221,247,191,.64)';
        for (let row = 0; row < 4; row += 1) {
          for (let column = 0; column < 3; column += 1) {
            ctx.fillRect(x + 18 + column * 29, y - height + 22 + row * 29, 12, 15);
          }
        }
      };
      ctx.strokeStyle = 'rgba(212,239,200,.12)';
      for (let step = 0; step < 8; step += 1) {
        ctx.beginPath();
        ctx.ellipse(960, 520, 240 + step * 39, 78 + step * 15, -0.16, 0.1, Math.PI * 1.78);
        ctx.stroke();
      }
      ctx.shadowColor = accent;
      ctx.shadowBlur = 48;
      block(660, 600, 190, 94, 345, '#455d47', '#2a3d31', '#849d67');
      block(890, 554, 142, 78, 240, '#4c6348', '#304134', '#9bb776');
      block(1070, 620, 170, 84, 305, '#475b45', '#2e3b31', '#829c69');
      ctx.shadowBlur = 0;
      block(780, 695, 420, 180, 90, '#293c32', '#1d2a25', '#71845b');

      ctx.strokeStyle = 'rgba(205,242,164,.44)';
      ctx.lineWidth = 2;
      [[716, 362, 955, 230], [955, 230, 1160, 367], [716, 362, 1090, 440]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo((x1 + x2) / 2, Math.min(y1, y2) - 80, x2, y2);
        ctx.stroke();
      });
      [[716, 362], [955, 230], [1160, 367], [1090, 440]].forEach(([x, y], nodeIndex) => {
        ctx.beginPath();
        ctx.arc(x, y, nodeIndex === 1 ? 15 : 7, 0, Math.PI * 2);
        ctx.fillStyle = nodeIndex === 1 ? '#e4f4c6' : accent;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 24;
        ctx.fill();
      });
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(236,245,224,.78)';
      [[510, 712, 42], [1248, 240, 31], [582, 275, 20], [1260, 640, 52]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(199,242,139,.5)';
        ctx.stroke();
      });
    } else {
      ctx.lineWidth = 1.5;
      for (let ring = 0; ring < 7; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(1000, 455, 190 + ring * 45, 75 + ring * 21, -0.35, 0.08 + ring * 0.13, Math.PI * 1.7 + ring * 0.1);
        ctx.strokeStyle = `rgba(255,159,189,${0.36 - ring * 0.035})`;
        ctx.stroke();
      }
      ctx.shadowColor = accent;
      ctx.shadowBlur = 75;
      const core = ctx.createRadialGradient(1000, 430, 5, 1000, 430, 210);
      core.addColorStop(0, 'rgba(255,237,239,.96)');
      core.addColorStop(0.15, 'rgba(255,159,189,.76)');
      core.addColorStop(0.48, 'rgba(194,89,138,.3)');
      core.addColorStop(1, 'rgba(194,89,138,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(1000, 430, 210, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const message = (x, y, width, height, sent) => {
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 22);
        ctx.fillStyle = sent ? 'rgba(255,159,189,.21)' : 'rgba(229,236,233,.1)';
        ctx.fill();
        ctx.strokeStyle = sent ? 'rgba(255,159,189,.62)' : 'rgba(229,236,233,.28)';
        ctx.stroke();
        ctx.fillStyle = sent ? 'rgba(255,213,226,.82)' : 'rgba(234,241,235,.56)';
        for (let line = 0; line < 3; line += 1) {
          ctx.beginPath();
          ctx.roundRect(x + 23, y + 25 + line * 20, width * (0.47 + ((line * 7) % 3) * 0.1), 5, 3);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(x + width - 29, y + height - 24, 6, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
      };
      message(570, 230, 226, 142, false);
      message(1080, 264, 220, 142, true);
      message(710, 590, 258, 148, true);
      message(1065, 590, 208, 130, false);
      message(470, 510, 190, 126, false);

      ctx.strokeStyle = 'rgba(255,190,207,.46)';
      ctx.setLineDash([4, 11]);
      [[796, 300, 866, 360], [1080, 345, 1086, 411], [660, 567, 826, 486], [960, 580, 1002, 475], [1090, 450, 1180, 590]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo((x1 + x2) / 2 + 44, y1 - 35, (x1 + x2) / 2 - 35, y2 + 30, x2, y2);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      [[843, 325, 5], [1082, 390, 7], [991, 488, 6], [1050, 540, 4], [678, 540, 5]].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
      });
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  _buildProjectCards() {
    this.cards = [];
    this.cardSpacing = 28; // spacing along Z-axis

    this.projects.forEach((project, index) => {
      const texture = this._createProjectCanvasTexture(project, index);
      const width = 14;
      const height = 9;

      const cardGeo = new THREE.PlaneGeometry(width, height);
      const cardMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false
      });

      const cardMesh = new THREE.Mesh(cardGeo, cardMat);
      cardMesh.position.set(0, 0, -index * this.cardSpacing);
      cardMesh.rotation.y = index % 2 === 0 ? 0.055 : -0.055;
      cardMesh.rotation.z = index % 2 === 0 ? -0.018 : 0.018;
      cardMesh.userData = { index, project };

      const accentColors = index === 0 ? [0xc3ed91, 0x8adecc] : [0xf1a9c2, 0xe98cbd];
      [-1, 1].forEach((side, accentIndex) => {
        const accentColor = accentColors[(index + accentIndex) % accentColors.length];
        const halo = new THREE.Mesh(
          new THREE.TorusGeometry(1.75 + accentIndex * 0.36, 0.016, 4, 64),
          new THREE.MeshBasicMaterial({
            color: accentColor,
            transparent: true,
            opacity: 0.42
          })
        );
        halo.position.set(side * 8.2, side * 1.15, -0.72);
        halo.rotation.set(0.32, side * 0.38, side * 0.2);
        cardMesh.add(halo);
      });

      // Glowing glass backing slab for 3D thickness
      const backGeo = new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.2);
      const backMat = new THREE.MeshBasicMaterial({
        color: index === 0 ? 0x18211a : 0x21171a,
        transparent: true,
        opacity: 0.92
      });
      const backMesh = new THREE.Mesh(backGeo, backMat);
      backMesh.position.z = -0.15;
      cardMesh.add(backMesh);

      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.2)),
        new THREE.LineBasicMaterial({
          color: index === 0 ? 0xc3ed91 : 0xe3a0a1,
          transparent: true,
          opacity: 0.38
        })
      );
      frame.position.z = -0.15;
      cardMesh.add(frame);

      this.scene.add(cardMesh);
      this.cards.push(cardMesh);
    });
  }

  _onWheel(e) {
    const drawer = this.canvas.parentElement?.querySelector('.at-study-drawer');
    if (drawer?.classList.contains('is-open') && drawer.contains(e.target)) return;

    e.preventDefault();
    const maxProgress = Math.max(0, this.projects.length - 1);
    const delta = e.deltaY * 0.0018;
    this.targetProgress = THREE.MathUtils.clamp(this.targetProgress + delta, 0, maxProgress);
  }

  _onPointerDown(e) {
    this.isDragging = true;
    this.dragStartY = e.clientY;
    this.dragStartProgress = this.targetProgress;
  }

  _onPointerMove(e) {
    const parent = this.canvas.parentElement || document.body;
    const rect = parent.getBoundingClientRect();
    this.targetMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.targetMouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    if (this.isDragging) {
      const deltaY = (this.dragStartY - e.clientY) * 0.004;
      const maxProgress = Math.max(0, this.projects.length - 1);
      this.targetProgress = THREE.MathUtils.clamp(this.dragStartProgress + deltaY, 0, maxProgress);
    }
  }

  _onPointerUp() {
    this.isDragging = false;
  }

  _onClick(e) {
    if (this.hoveredIndex >= 0) {
      sound.playSuccess();
      if (this.onSelectProject) {
        this.onSelectProject(this.hoveredIndex);
      }
    }
  }

  _onKey(e) {
    const maxProgress = Math.max(0, this.projects.length - 1);
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      this.targetProgress = THREE.MathUtils.clamp(this.targetProgress + 1, 0, maxProgress);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      this.targetProgress = THREE.MathUtils.clamp(this.targetProgress - 1, 0, maxProgress);
    } else if (e.key >= '1' && e.key <= String(this.projects.length)) {
      this.goTo(parseInt(e.key, 10) - 1);
    }
  }

  goTo(index) {
    const maxProgress = Math.max(0, this.projects.length - 1);
    this.targetProgress = THREE.MathUtils.clamp(index, 0, maxProgress);
    sound.playWhoosh();
  }

  _onResize() {
    const parent = this.canvas.parentElement || document.body;
    const w = parent.clientWidth || window.innerWidth;
    const h = parent.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _getCameraDistance() {
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const widthFit = 9.2 / (2 * Math.tan(halfFov) * this.camera.aspect);
    return Math.max(10, widthFit * 1.05);
  }

  _animate() {
    if (this.disposed) return;
    requestAnimationFrame(() => this._animate());

    const now = performance.now();
    const delta = Math.min((now - this._lastFrameTime) / 1000, 0.05);
    this._lastFrameTime = now;

    // 1. Smooth Spring Lerp for Scroll Progress
    const prevProgress = this.scrollProgress;
    this.scrollProgress = THREE.MathUtils.lerp(this.scrollProgress, this.targetProgress, 0.08);
    this.scrollVelocity = Math.abs(this.scrollProgress - prevProgress) * 60;

    // 2. Mouse Parallax Lerp
    this.mouse.lerp(this.targetMouse, 0.07);
    this.rings.forEach((ring, index) => {
      ring.rotation.z += delta * (index % 2 === 0 ? 0.012 : -0.01);
    });

    // 3. Move Camera along Z
    const cameraDistance = this._getCameraDistance();
    const cameraTargetZ = cameraDistance - this.scrollProgress * this.cardSpacing;
    this.camera.position.z = cameraTargetZ;
    this.camera.position.x = this.mouse.x * 1.2;
    this.camera.position.y = this.mouse.y * 0.8;
    this.camera.lookAt(this.mouse.x * 0.4, this.mouse.y * 0.3, cameraTargetZ - cameraDistance);

    // Lights follow camera
    this.keyLight.position.set(this.camera.position.x + 5, this.camera.position.y + 6, cameraTargetZ + 2);
    this.fillLight.position.set(this.camera.position.x - 6, this.camera.position.y - 4, cameraTargetZ + 1);

    // 4. Update Cards with 3D Tilt & Proximity
    this.cards.forEach((card, i) => {
      const distFromCam = card.position.z - (cameraTargetZ - cameraDistance);
      const isCurrent = Math.abs(distFromCam) < 14;

      if (isCurrent) {
        // Subtle pointer parallax keeps the active study tactile.
        const tiltX = -this.mouse.y * 0.18;
        const tiltY = (i % 2 === 0 ? 0.055 : -0.055) + this.mouse.x * 0.22;
        card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, tiltX, 0.1);
        card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, tiltY, 0.1);
        card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, (i % 2 === 0 ? -0.018 : 0.018) - this.mouse.x * 0.025, 0.1);
        card.position.y = THREE.MathUtils.lerp(card.position.y, Math.sin(now * 0.0008 + i) * 0.18, 0.08);
        card.scale.setScalar(THREE.MathUtils.lerp(card.scale.x, 1.0, 0.1));
      } else {
        card.rotation.x = THREE.MathUtils.lerp(card.rotation.x, 0, 0.1);
        card.rotation.y = THREE.MathUtils.lerp(card.rotation.y, i % 2 === 0 ? 0.055 : -0.055, 0.1);
        card.rotation.z = THREE.MathUtils.lerp(card.rotation.z, i % 2 === 0 ? -0.018 : 0.018, 0.1);
        card.position.y = THREE.MathUtils.lerp(card.position.y, 0, 0.08);
        const fadeScale = Math.max(0.7, 1 - Math.abs(distFromCam) * 0.015);
        card.scale.setScalar(fadeScale);
      }
    });

    // 5. Warp Speed Particle Streaks
    if (this.stars) {
      const pos = this.stars.geometry.attributes.position;
      const velocityOffset = this.scrollVelocity * 0.4;

      for (let i = 0; i < this._originalZ.length; i++) {
        let z = this._originalZ[i] + (cameraTargetZ % 160);
        if (z > cameraTargetZ + 40) z -= 160;
        if (z < cameraTargetZ - 120) z += 160;
        pos.setZ(i, z - velocityOffset);
      }
      pos.needsUpdate = true;
      this.stars.rotation.z += (0.036 + this.scrollVelocity * 0.12) * delta;
    }

    // 6. Floor grid forward motion
    if (this.floorGrid) {
      this.floorGrid.position.z = cameraTargetZ - 30;
    }

    // 7. Raycasting for Card Hover Detection
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.cards, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      this.hoveredIndex = hit.userData.index;
      this.canvas.style.cursor = 'pointer';
    } else {
      this.hoveredIndex = -1;
      this.canvas.style.cursor = 'default';
    }

    // 8. Trigger Section Change Callback
    const roundedSection = Math.round(this.scrollProgress);
    if (roundedSection !== this.currentSection) {
      this.currentSection = roundedSection;
      if (this.onSectionChange) {
        this.onSectionChange(this.currentSection, this.scrollProgress);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    const targetEl = this.canvas.parentElement || this.canvas;
    targetEl.removeEventListener('wheel', this._onWheel);
    targetEl.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    targetEl.removeEventListener('click', this._onClick);
    window.removeEventListener('keydown', this._onKey);
    window.removeEventListener('resize', this._onResize);

    this.renderer.dispose();
  }
}
