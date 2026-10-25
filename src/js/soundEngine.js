// Web Audio API Sound Synthesizer for AdityaOS

class SoundEngine {
  constructor() {
    this.enabled = true;
    this.volume = 0.35;
    this.ctx = null;
    this.masterGain = null;
    this.worldAudio = null;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? this.volume : 0;
        this.masterGain.connect(this.ctx.destination);
      }
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.enabled ? this.volume : 0,
        this.ctx.currentTime,
        0.04
      );
    }
    return this.enabled;
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, Number(volume)));
    if (!Number.isFinite(this.volume)) this.volume = 0.35;
    if (this.masterGain && this.ctx && this.enabled) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
    }
    return this.volume;
  }

  startWorldAmbience() {
    if (!this.enabled || this.worldAudio) return;
    this.init();
    if (!this.ctx || !this.masterGain) return;
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * 0.18;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.05;
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 58;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.018;
    drone.connect(droneGain);
    droneGain.connect(this.masterGain);
    noise.start();
    drone.start();
    this.worldAudio = { noise, filter, noiseGain, drone, droneGain, region: 'lowlands' };
    this.ctx.resume().catch(error => {
      console.error('Unable to start Signal Ridge ambience:', error);
    });
  }

  setWorldRegion(region, speed = 0) {
    if (!this.worldAudio || !this.ctx) return;
    const profiles = {
      lowlands: { cutoff: 420, drone: 58, noise: 0.035 },
      riverlands: { cutoff: 780, drone: 72, noise: 0.075 },
      ashen: { cutoff: 250, drone: 49, noise: 0.028 },
      fossil: { cutoff: 1100, drone: 64, noise: 0.06 },
      signal: { cutoff: 560, drone: 82, noise: 0.048 },
      highPass: { cutoff: 1350, drone: 92, noise: 0.065 },
      motorYard: { cutoff: 340, drone: 54, noise: 0.025 }
    };
    const profile = profiles[region] ?? profiles.lowlands;
    const now = this.ctx.currentTime;
    this.worldAudio.filter.frequency.setTargetAtTime(profile.cutoff, now, 1.4);
    this.worldAudio.drone.frequency.setTargetAtTime(profile.drone, now, 1.4);
    this.worldAudio.noiseGain.gain.setTargetAtTime(profile.noise + Math.min(0.035, Math.abs(speed) * 0.001), now, 0.5);
    this.worldAudio.region = region;
  }

  stopWorldAmbience() {
    if (!this.worldAudio) return;
    this.worldAudio.noise.stop();
    this.worldAudio.drone.stop();
    this.worldAudio = null;
  }

  playKeySound() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600 + Math.random() * 200, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {
      // Ignore audio lock error
    }
  }

  playWindowOpen() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.12);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.14);
    } catch (e) {}
  }

  playWindowClose() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.1);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, index) => {
        const now = this.ctx.currentTime + index * 0.08;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.18);
      });
    } catch (e) {}
  }

  playHonk() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [380, 475].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) {}
  }

  playCrash() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  playDiscovery() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.05);
        gain.gain.setValueAtTime(0.05, now + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.05 + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.05);
        osc.stop(now + i * 0.05 + 0.3);
      });
    } catch (e) {}
  }

  playSignal(signalId) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const notes = {
      trailhead: 392,
      crossing: 440,
      settlement: 494,
      bones: 523.25,
      signal: 587.33,
      'high-pass': 659.25
    };
    const frequency = notes[signalId];
    if (!frequency) return;
    const now = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency * 0.72, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency, now + 0.32);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + 1.26);
  }

  playWhoosh() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.12);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {}
  }
}

export const sound = new SoundEngine();
