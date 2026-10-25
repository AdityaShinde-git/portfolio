import * as THREE from 'three';

export class ThreeBackground {
  constructor(canvasContainer) {
    this.container = canvasContainer;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.particles = null;
    this.connections = null;
    this.geometryNodes = [];
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.isEnabled = true;
    this.animationFrame = null;

    this.sceneColors = { primary: 0xb9d798, secondary: 0x899f7c };
    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.z = 400;

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    this.renderer.domElement.style.zIndex = '0';

    // 4. Create 3D Nodes Constellation
    this.createConstellation();

    // 5. Create Floating 3D Geometric Tech Solids
    this.createTechSolids();

    // 6. Listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));

    // 7. Animation Loop
    this.animate();
  }

  createConstellation() {
    const particleCount = 64;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const primaryColor = new THREE.Color(this.sceneColors.primary);
    const secondaryColor = new THREE.Color(this.sceneColors.secondary);

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 800;
      const y = (Math.random() - 0.5) * 600;
      const z = (Math.random() - 0.5) * 500;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const mixColor = Math.random() > 0.5 ? primaryColor : secondaryColor;
      colors[i * 3] = mixColor.r;
      colors[i * 3 + 1] = mixColor.g;
      colors[i * 3 + 2] = mixColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    // Network lines between close nodes
    const lineMaterial = new THREE.LineBasicMaterial({
      color: this.sceneColors.primary,
      transparent: true,
      opacity: 0.07,
      blending: THREE.AdditiveBlending
    });

    const lineGeometry = new THREE.BufferGeometry();
    this.connections = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.scene.add(this.connections);
  }

  createTechSolids() {
    const shapes = [
      new THREE.IcosahedronGeometry(20, 1),
      new THREE.OctahedronGeometry(18, 0),
      new THREE.TorusGeometry(16, 3, 16, 32),
      new THREE.DodecahedronGeometry(15, 0)
    ];

    shapes.forEach((geo, idx) => {
      const mat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? this.sceneColors.primary : this.sceneColors.secondary,
        wireframe: true,
        transparent: true,
        opacity: 0.1
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 600,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 300
      );
      mesh.rotation.x = Math.random() * Math.PI;
      mesh.rotation.y = Math.random() * Math.PI;

      this.geometryNodes.push({
        mesh,
        rotSpeedX: (Math.random() - 0.5) * 0.01,
        rotSpeedY: (Math.random() - 0.5) * 0.01
      });

      this.scene.add(mesh);
    });
  }

  setEnabled(enabled) {
    this.isEnabled = enabled;
    this.renderer.domElement.style.display = enabled ? 'block' : 'none';

    if (enabled && this.animationFrame === null) {
      this.animate();
    } else if (!enabled && this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  onMouseMove(e) {
    this.mouseX = (e.clientX - window.innerWidth / 2) * 0.2;
    this.mouseY = (e.clientY - window.innerHeight / 2) * 0.2;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    if (!this.isEnabled) return;

    // Smooth camera inertia
    this.targetX += (this.mouseX - this.targetX) * 0.05;
    this.targetY += (-this.mouseY - this.targetY) * 0.05;

    this.camera.position.x = this.targetX;
    this.camera.position.y = this.targetY;
    this.camera.lookAt(this.scene.position);

    // Rotate particles
    if (this.particles) {
      this.particles.rotation.y += 0.001;
      this.particles.rotation.x += 0.0005;
    }

    // Rotate tech solids
    this.geometryNodes.forEach(node => {
      node.mesh.rotation.x += node.rotSpeedX;
      node.mesh.rotation.y += node.rotSpeedY;
    });

    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }
}
