/**
 * SkyRenderer — procedural atmosphere with animated cloud layers, sun, moon, and stars.
 */
import * as THREE from 'three';

const SKY_VERTEX_SHADER = `
  varying vec3 vWorldDirection;

  void main() {
    vWorldDirection = normalize((modelMatrix * vec4(position, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform vec3 uMoonDirection;
  uniform vec2 uWindDirection;
  uniform float uWindSpeed;
  uniform float uSunElevation;
  uniform float uMoonIntensity;
  uniform float uMoonPhase;
  uniform float uCloudCover;
  uniform float uTime;

  varying vec3 vWorldDirection;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);
    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x),
      local.y
    );
  }

  float cloudNoise(vec2 point) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 4; octave++) {
      value += noise(point) * amplitude;
      point = point * 2.03 + 17.13;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec3 direction = normalize(vWorldDirection);
    float altitude = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    float daylight = smoothstep(-0.13, 0.24, uSunElevation);
    float horizonBlend = smoothstep(-0.12, 0.72, direction.y);
    vec3 skyColor = mix(uHorizon, uZenith, horizonBlend);

    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    float sunGlow = pow(sunDot, 10.0) * 0.22 + pow(sunDot, 52.0) * 0.46;
    float sunDisk = smoothstep(cos(0.018), cos(0.008), sunDot);
    skyColor += uSunColor * sunGlow * (0.35 + daylight * 0.65);
    skyColor = mix(skyColor, vec3(1.0, 0.87, 0.68), sunDisk * 0.92);

    vec3 moonDirection = normalize(uMoonDirection);
    float moonDot = max(dot(direction, moonDirection), 0.0);
    float moonDisk = smoothstep(cos(0.014), cos(0.007), moonDot);
    vec3 moonAxis = normalize(cross(moonDirection, abs(moonDirection.y) > 0.95
      ? vec3(1.0, 0.0, 0.0)
      : vec3(0.0, 1.0, 0.0)));
    float moonX = dot(direction, moonAxis);
    float phaseSide = uMoonPhase < 0.5 ? 1.0 : -1.0;
    float terminator = cos(uMoonPhase * 6.2831853);
    float moonLit = smoothstep(terminator - 0.035, terminator + 0.035, moonX * phaseSide);
    skyColor = mix(skyColor, vec3(0.78, 0.86, 1.0), moonDisk * moonLit * uMoonIntensity * 2.4);

    vec2 cloudUv = vec2(atan(direction.z, direction.x) * 0.1591549 + 0.5, altitude);
    vec2 cloudMotion = uWindDirection * uTime * uWindSpeed * 0.00012;
    float clouds = cloudNoise(cloudUv * vec2(20.0, 8.0) + cloudMotion);
    float cloudThreshold = mix(0.83, 0.39, uCloudCover);
    float cloudShape = smoothstep(cloudThreshold, cloudThreshold + 0.16, clouds);
    float cloudBand = smoothstep(-0.04, 0.12, direction.y)
      * (1.0 - smoothstep(0.76, 0.98, direction.y));
    float cloudAlpha = cloudShape * cloudBand * mix(0.42, 0.88, uCloudCover);
    vec3 cloudColor = mix(vec3(0.28, 0.34, 0.43), vec3(0.93, 0.83, 0.72), daylight);
    cloudColor += uSunColor * pow(sunDot, 5.0) * 0.2;
    skyColor = mix(skyColor, cloudColor, cloudAlpha);

    float horizonHaze = exp(-max(direction.y, 0.0) * 11.0) * 0.09;
    skyColor = mix(skyColor, uHorizon, horizonHaze);
    gl_FragColor = vec4(skyColor, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function dailySeed() {
  const date = new Date();
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

export class SkyRenderer {
  constructor(scene) {
    this.scene = scene;
    this._uniforms = {
      uZenith: { value: new THREE.Color(0x1c2a44) },
      uHorizon: { value: new THREE.Color(0xc46a4a) },
      uSunColor: { value: new THREE.Color(0xffb070) },
      uSunDirection: { value: new THREE.Vector3(-0.5, 0.3, -0.8).normalize() },
      uMoonDirection: { value: new THREE.Vector3(0.4, 0.5, 0.6).normalize() },
      uWindDirection: { value: new THREE.Vector2(1, 0) },
      uWindSpeed: { value: 4 },
      uSunElevation: { value: 10 },
      uMoonIntensity: { value: 0 },
      uMoonPhase: { value: 0 },
      uCloudCover: { value: 0.15 },
      uTime: { value: 0 }
    };

    this._skyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 64, 48),
      new THREE.ShaderMaterial({
        uniforms: this._uniforms,
        vertexShader: SKY_VERTEX_SHADER,
        fragmentShader: SKY_FRAGMENT_SHADER,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      })
    );
    this._skyMesh.name = 'living-sky';
    this._skyMesh.frustumCulled = false;
    this._skyMesh.renderOrder = -1;
    scene.add(this._skyMesh);

    this._stars = this._buildStars(1400);
    this._stars.renderOrder = 1;
    scene.add(this._stars);
  }

  _buildStars(count) {
    const random = createRandom(dailySeed());
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(1 - random());
      const radius = 1050;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this._starMaterial = new THREE.PointsMaterial({
      color: 0xdde8f8,
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
      toneMapped: false
    });
    return new THREE.Points(geometry, this._starMaterial);
  }

  update(worldState, dt, cameraPosition) {
    const uniforms = this._uniforms;
    uniforms.uZenith.value.copy(worldState.sky.zenith);
    uniforms.uHorizon.value.copy(worldState.sky.horizon);
    uniforms.uSunColor.value.copy(worldState.sun.color);
    uniforms.uSunDirection.value.set(
      -worldState.sun.dir.x,
      worldState.sun.dir.y,
      -worldState.sun.dir.z
    ).normalize();
    uniforms.uMoonDirection.value.copy(worldState.moon.dir);
    uniforms.uWindDirection.value.copy(worldState.wind.dir);
    uniforms.uWindSpeed.value = worldState.wind.speed;
    uniforms.uSunElevation.value = worldState.sun.elevation / 90;
    uniforms.uMoonIntensity.value = worldState.moon.intensity;
    uniforms.uMoonPhase.value = worldState.time.moonPhase;
    uniforms.uCloudCover.value = worldState.sky.cloudCover;
    uniforms.uTime.value += dt;

    if (cameraPosition) {
      this._skyMesh.position.copy(cameraPosition);
      this._stars.position.copy(cameraPosition);
    }
    this._starMaterial.opacity = worldState.sky.starAlpha * (1 - worldState.sky.cloudCover * 0.75);
  }

  dispose() {
    this._skyMesh.geometry.dispose();
    this._skyMesh.material.dispose();
    this._stars.geometry.dispose();
    this._starMaterial.dispose();
    this.scene.remove(this._skyMesh);
    this.scene.remove(this._stars);
  }
}
