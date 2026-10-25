import { sound } from './soundEngine.js';
import { resumeData } from '../data/resumeData.js';

const destinations = [
  {
    name: 'Selected work', app: 'projects', desc: 'Case studies in product and systems engineering',
    keywords: resumeData.projects.flatMap(project => [project.title, ...project.tech, ...project.highlights]).join(' ')
  },
  {
    name: 'Engineering map', app: 'skills', desc: 'Languages, frameworks, data, and tools in context',
    keywords: Object.values(resumeData.skills).flat().map(skill => skill.name).join(' ')
  },
  {
    name: 'Career profile', app: 'resume', desc: 'Resume, experience, education, and a downloadable text profile',
    keywords: `resume cv ${resumeData.personal.name} ${resumeData.experience.map(experience => `${experience.company} ${experience.role} ${experience.technologies.join(' ')}`).join(' ')}`
  },
  {
    name: 'Contact', app: 'contact', desc: 'Email, phone, location, and professional links',
    keywords: `${resumeData.personal.email} ${resumeData.personal.phone} ${resumeData.personal.location} github linkedin`
  },
  { name: 'Terminal', app: 'terminal', desc: 'A small interactive developer terminal' }
];

export class ControlCenter {
  constructor(container, scenePreferences) {
    this.container = container;
    this.scenePreferences = scenePreferences;
    this.isOpen = false;
    this.initDOM();
  }

  initDOM() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'control-center-modal';
    this.overlay.style.display = 'none';
    this.overlay.innerHTML = `
      <section class="control-center-card" role="dialog" aria-modal="true" aria-labelledby="preferences-title">
        <header class="preferences-heading">
          <div><span>PORTFOLIO / PREFERENCES</span><h2 id="preferences-title">Make this space yours.</h2></div>
          <button class="preferences-close" type="button" aria-label="Close preferences">×</button>
        </header>
        <label class="spotlight-search-bar">
          <span class="spotlight-icon" aria-hidden="true">⌕</span>
          <input type="search" id="spotlight-input" placeholder="Find work, skills, or a page…" autocomplete="off" />
          <kbd class="spotlight-kbd">ESC</kbd>
        </label>
        <div class="spotlight-results" id="spotlight-results" style="display:none;"></div>
        <div class="preferences-list" aria-label="Display and sound preferences">
          <button class="preference-row" type="button" id="ctrl-toggle-motion" aria-pressed="false">
            <span class="preference-mark">01</span><span class="preference-copy"><b>Motion</b><small>Reduce transitions and ambient movement</small></span><span class="preference-value" id="ctrl-motion-state" aria-live="polite">Standard</span>
          </button>
          <button class="preference-row" type="button" id="ctrl-toggle-3d" aria-pressed="false">
            <span class="preference-mark">02</span><span class="preference-copy"><b>Ambient scene</b><small>Lightweight background canvas</small></span><span class="preference-value" id="ctrl-3d-state" aria-live="polite">Off</span>
          </button>
          <button class="preference-row" type="button" id="ctrl-toggle-sound" aria-pressed="true">
            <span class="preference-mark">03</span><span class="preference-copy"><b>Interface sounds</b><small>Subtle sounds on interface actions</small></span><span class="preference-value" id="ctrl-sound-state" aria-live="polite">On</span>
          </button>
        </div>
        <footer class="preferences-footer"><span>NO SIMULATED SYSTEM METRICS.</span><span>BUILT TO BE QUIET BY DEFAULT.</span></footer>
      </section>
    `;
    this.container.appendChild(this.overlay);
    this.setupListeners();
  }

  setupListeners() {
    this.overlay.addEventListener('click', event => {
      if (event.target === this.overlay || event.target.closest('.preferences-close')) this.close();
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.isOpen) this.close();
    });

    const motionButton = this.overlay.querySelector('#ctrl-toggle-motion');
    const sceneButton = this.overlay.querySelector('#ctrl-toggle-3d');
    const soundButton = this.overlay.querySelector('#ctrl-toggle-sound');

    motionButton.addEventListener('click', () => {
      const enabled = !this.isMotionReduced();
      document.body.dataset.motionPreference = enabled ? 'reduced' : 'standard';
      document.body.dataset.reducedMotion = String(enabled);
      this.updatePreference(motionButton, '#ctrl-motion-state', enabled ? 'Reduced' : 'Standard', enabled);
    });

    sceneButton.addEventListener('click', () => {
      const enabled = !this.scenePreferences.isEnabled();
      const sceneState = this.overlay.querySelector('#ctrl-3d-state');
      if (!enabled) {
        this.scenePreferences.setEnabled(false);
        this.updatePreference(sceneButton, '#ctrl-3d-state', 'Off', false);
        return;
      }

      sceneButton.disabled = true;
      sceneState.textContent = 'Loading…';
      this.scenePreferences.setEnabled(true).then(() => {
        sceneButton.disabled = false;
        this.updatePreference(sceneButton, '#ctrl-3d-state', 'On', true);
      }).catch(error => {
        sceneButton.disabled = false;
        this.updatePreference(sceneButton, '#ctrl-3d-state', 'Unavailable', false);
        sceneState.title = error instanceof Error ? error.message : String(error);
      });
    });

    soundButton.addEventListener('click', () => {
      const enabled = sound.toggleSound();
      this.updatePreference(soundButton, '#ctrl-sound-state', enabled ? 'On' : 'Off', enabled);
    });

    this.overlay.querySelector('.preferences-close').addEventListener('click', () => this.close());

    const input = this.overlay.querySelector('#spotlight-input');
    const results = this.overlay.querySelector('#spotlight-results');
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.style.display = 'none';
        results.replaceChildren();
        return;
      }

      const matches = destinations.filter(destination =>
        `${destination.name} ${destination.desc} ${destination.keywords || ''}`.toLowerCase().includes(query)
      );

      results.innerHTML = matches.length
        ? matches.map(destination => `
          <button class="spotlight-item" type="button" data-app="${destination.app}">
            <span class="spotlight-title">${destination.name}</span>
            <span class="spotlight-desc">${destination.desc}</span>
            <span aria-hidden="true">↗</span>
          </button>`).join('')
        : '<p class="spotlight-empty">No matching pages.</p>';
      results.style.display = 'flex';
      results.querySelectorAll('[data-app]').forEach(button => {
        button.addEventListener('click', () => {
          this.close();
          if (window.openAppByName) window.openAppByName(button.dataset.app, true, true);
        });
      });
    });
  }

  updatePreference(button, stateSelector, label, enabled) {
    button.setAttribute('aria-pressed', String(enabled));
    this.overlay.querySelector(stateSelector).textContent = label;
  }

  syncPreferences() {
    const motionReduced = this.isMotionReduced();
    const sceneEnabled = this.scenePreferences.isEnabled();
    this.updatePreference(this.overlay.querySelector('#ctrl-toggle-motion'), '#ctrl-motion-state', motionReduced ? 'Reduced' : 'Standard', motionReduced);
    this.updatePreference(this.overlay.querySelector('#ctrl-toggle-3d'), '#ctrl-3d-state', sceneEnabled ? 'On' : 'Off', sceneEnabled);
    this.updatePreference(this.overlay.querySelector('#ctrl-toggle-sound'), '#ctrl-sound-state', sound.enabled ? 'On' : 'Off', sound.enabled);
  }

  isMotionReduced() {
    return document.body.dataset.reducedMotion === 'true'
      || (document.body.dataset.motionPreference !== 'standard'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.syncPreferences();
    this.overlay.style.display = 'flex';
    const input = this.overlay.querySelector('#spotlight-input');
    setTimeout(() => input.focus(), 50);
  }

  close() {
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }
}
