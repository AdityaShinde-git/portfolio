import { resumeData } from '../../data/resumeData.js';
import { sound } from '../soundEngine.js';
import {
  GARAGE_POSITION,
  ROAD_DEFINITIONS,
  RIVER_MAP_ROUTE,
  WORLD_LANDMARKS,
  WORLD_DESTINATIONS,
  WORLD_SECRET_SITES,
  mapScreenPoint,
  regionAtWorldPosition,
  worldToMap
} from '../worldSystems/signalRidgeLayout.js';

const VEHICLE_BUILD_STORAGE_KEY = 'signal-ridge-vehicle-build';
const SIGNAL_PROGRESS_STORAGE_KEY = 'signal-ridge-signals';
const SECRET_PROGRESS_STORAGE_KEY = 'signal-ridge-secrets';
const SETTLEMENT_PROGRESS_STORAGE_KEY = 'signal-ridge-settlement-topics';
const DEFAULT_VEHICLE_BUILD = {
  paint: '#53645b',
  alloy: '#c2a878',
  rideHeight: 1,
  bodyWidth: 1,
  wheelStyle: 'all-terrain',
  bodyKit: 'stock',
  power: 1
};

const SKILL_EVIDENCE = {
  languages: 'PHP, JavaScript, and TypeScript appear across production application work. At K2S2 Digistrat, used Rust to build a data-sync platform for bulk migration and real-time change data capture.',
  backend: 'At V.K. Lalco, developed a centralized Update Management System that records module changes, responsible users, timestamps, and audit trails.',
  databases: 'Built interconnected HR management modules with MySQL and contributed to production features using MySQL and PostgreSQL.',
  frontend: 'Developed and maintained production application features using React, JavaScript, and TypeScript at V.K. Lalco and Volody.',
  tools: 'These tools are listed in the skills inventory. Docker and Git are presented as tools, not as claims of deployment or infrastructure ownership.',
  architecture: 'Implemented role-based access control and audit logging for the UMS, with roles, permissions, and route-level authorization in the OMS.'
};

const FIELD_EVIDENCE = {
  trailhead: SKILL_EVIDENCE.languages,
  crossing: SKILL_EVIDENCE.frontend,
  settlement: SKILL_EVIDENCE.backend,
  bones: SKILL_EVIDENCE.databases,
  signal: SKILL_EVIDENCE.architecture,
  'high-pass': SKILL_EVIDENCE.tools
};

const FIELD_STORY_FRAGMENTS = {
  trailhead: 'The keepers built the first fire where the meadow road met the ridge. Its light was meant to make a stranger feel expected.',
  crossing: 'The river did not stop the old keepers; it taught them to build a safer way across. Every bridge began as a promise to return.',
  settlement: 'When the valley emptied, the lamps stayed lit for one another. The crossroads was never the centre of the land, only its heart.',
  bones: 'The Old Giant kept the valley in its ribs long before the first road was drawn. The keepers left their records in layers of stone.',
  signal: 'At the highest station, one flame could reach every other fire. The last keeper left the door unbarred.',
  'high-pass': 'Tools were left at the pass for the next traveller. The mountain was crossed by many hands, not one.'
};

const FIELD_SECRET_NOTES = {
  cairn: {
    title: 'The Cairn',
    note: 'The old keepers stacked these stones to mark the quiet places. Stop beside it and listen for the tone.'
  },
  'waterfall-cabin': {
    title: 'The Waterfall Cabin',
    note: 'A keeper left a dry notebook behind the falls. Its last page points toward the work beyond the ridge.',
    link: true
  },
  'watchtower-radio': {
    title: 'Buried Radio',
    note: '“If you can hear this, the six fires are home again. Carry the signal farther than we could.”'
  },
  'quarry-signature': {
    title: 'A Mark in the Stone',
    note: 'A.S. · Someone wanted the next traveller to know they had made it this far.'
  },
  'bridge-plank': {
    title: 'The Secret Plank',
    note: 'A hollow plank answers with the old truck horn. The keepers had a sense of humour.'
  },
  'horizon-light': {
    title: 'A Light Beyond the Ridge',
    note: 'After the chain was restored, one small light appeared past the known horizon.'
  }
};

const FIELD_DESTINATIONS = [
  { id: 'trailhead', title: 'The Trailhead', category: 'Languages', caption: 'NOTICE BOARD · COMPLETE SKILLS REGISTER' },
  { id: 'crossing', title: 'The River Crossing', category: 'Frontend', caption: 'FORD · WATERFALL · TIMBER BRIDGE' },
  { id: 'settlement', title: 'The Ashen Settlement', category: 'Backend', caption: 'VILLAGE LOOP · LANTERN WINDOWS' },
  { id: 'bones', title: 'The Old Giant', category: 'Databases', caption: 'FOSSIL RIDGE · HIGH VISTA' },
  { id: 'signal', title: 'The Last Signal', category: 'Architecture & systems', caption: 'RIDGELINE · FINAL BEACON' },
  { id: 'high-pass', title: 'The High Pass', category: 'Tools & DevOps', caption: 'SWITCHBACKS · UPPER TRAIL' }
];

const SETTLEMENT_TOPICS = [
  ...resumeData.skills.backend,
  'Update Management System'
].map((title, index) => ({
  id: `settlement-house-${index + 1}`,
  title
}));

const SIGNAL_LIVERIES = [
  { id: 'trailhead', title: 'Trailhead · amber', paint: '#d5b77d' },
  { id: 'crossing', title: 'Crossing · river teal', paint: '#82b8ad' },
  { id: 'settlement', title: 'Settlement · ember', paint: '#c99a68' },
  { id: 'bones', title: 'Old Giant · fossil gold', paint: '#d4af73' },
  { id: 'signal', title: 'Last Signal · dusk', paint: '#c1a2b8' },
  { id: 'high-pass', title: 'High Pass · alpine', paint: '#9eafcb' }
];

const formatRallyTime = milliseconds => {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '--:--.-';
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor(milliseconds / 1000) % 60;
  const tenths = Math.floor(milliseconds / 100) % 10;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${tenths}`;
};

const SKILL_BOARD_GROUPS = [
  {
    title: 'Languages',
    skills: resumeData.skills.languages,
    evidence: SKILL_EVIDENCE.languages
  },
  {
    title: 'Backend',
    skills: resumeData.skills.backend,
    evidence: SKILL_EVIDENCE.backend
  },
  {
    title: 'Frontend',
    skills: resumeData.skills.frontend,
    evidence: SKILL_EVIDENCE.frontend
  },
  {
    title: 'Databases',
    skills: resumeData.skills.databases,
    evidence: SKILL_EVIDENCE.databases
  },
  {
    title: 'Architecture & systems',
    skills: resumeData.skills.architecture,
    evidence: SKILL_EVIDENCE.architecture
  },
  {
    title: 'Tools & DevOps',
    skills: resumeData.skills.toolsAndDevops,
    evidence: SKILL_EVIDENCE.tools
  }
];

export function createSkillsAppContent() {
  const container = document.createElement('div');
  container.className = 'skills-experience bruno-playground-app';
  container.classList.add('is-intro');

  container.innerHTML = `
    <div class="bruno-shell">
      <!-- 3D Canvas -->
      <canvas class="bruno-canvas" id="bruno-canvas" aria-label="A drivable mountain valley with a complete skills board, six beacons, and a workshop"></canvas>

      <!-- Top Overlay Bar -->
      <header class="bruno-header">
        <div class="bruno-brand">
          <a class="bruno-title" href="#home" data-portfolio-route="home">AS <span>/ ADITYA SHINDE</span></a>
          <span class="bruno-sub">SIGNAL RIDGE · THE LAST SIGNAL</span>
        </div>
        <div class="bruno-signal-meter" role="status" aria-live="polite">
          <span class="signal-meter-mark" aria-hidden="true">✳</span>
          <strong id="bruno-signal-count">0</strong><span>/ 6 SIGNALS</span>
        </div>
        <div class="bruno-time-meter" id="bruno-time-meter" role="status" title="World Time · 24h day/night cycle (Shift+T: advance time, Shift+Y: cycle weather)">
          <span class="time-meter-icon" aria-hidden="true">⏱</span>
          <span id="world-time-display">17:30</span>
        </div>

        <a class="experience-back-link" href="#home" data-portfolio-route="home">← BACK TO DESKTOP</a>

        <div class="bruno-actions">
          <button class="bruno-action-btn" id="bruno-btn-board" type="button" aria-expanded="true">
            <span>SKILLS BOARD</span>
          </button>
          <button class="bruno-action-btn" id="bruno-btn-map" type="button" aria-haspopup="dialog" aria-expanded="false">
            <span>OPEN MAP <kbd>M</kbd></span>
          </button>
          <button class="bruno-action-btn" id="bruno-btn-controls" type="button" aria-expanded="false">
            <span>CONTROLS</span>
          </button>
          <button class="bruno-action-btn" id="bruno-btn-rally" type="button" aria-pressed="false">
            <span>OPTIONAL RALLY</span>
          </button>
          <button class="bruno-action-btn" id="bruno-btn-garage" type="button">
            <span>MOTOR WORKS</span>
          </button>
        </div>
      </header>

      <section class="skills-arrival" id="skills-arrival" aria-labelledby="skills-arrival-title">
        <div class="arrival-copy">
          <span class="arrival-eyebrow">SIGNAL RIDGE · A FIELD GUIDE TO THE WORK</span>
          <h1 id="skills-arrival-title">One ridge.<br>Six signals.</h1>
          <p>The complete skills board sits in a pull-off beside the trailhead road. Start the journey, park nearby, then press E to browse all six categories.</p>
          <button class="arrival-start" id="skills-start" type="button">START THE JOURNEY <span aria-hidden="true">↗</span></button>
          <span class="arrival-controls">WASD DRIVE · E READ THE BOARD WHEN PARKED · MOUSE DRAG LOOK</span>
        </div>
        <aside class="arrival-register" aria-label="Complete skills noticeboard">
          <header>
            <span>THE COMPLETE INVENTORY</span>
            <strong>SKILLS BOARD <i>ALL CATEGORIES</i></strong>
          </header>
          <nav class="skills-register-tabs" id="skills-register-tabs" role="tablist" aria-label="Skills categories"></nav>
          <div class="skills-register-grid" id="skills-register-grid" aria-live="polite"></div>
          <div class="skills-register-controls">
            <button id="skills-register-previous" type="button" aria-label="Previous skills category">←</button>
            <div class="skills-register-progress">
              <span id="skills-register-count" aria-live="polite">01 / 06</span>
              <span class="skills-register-track"><i id="skills-register-progress"></i></span>
            </div>
            <button id="skills-register-next" type="button" aria-label="Next skills category">→</button>
          </div>
          <footer>EXPERIENCE NOTES ARE GROUNDED IN THE RESUME · TAKE THE ROAD TO EXPLORE</footer>
        </aside>
      </section>

      <section class="skill-map-panel" id="skill-map-panel" role="dialog" aria-modal="true" aria-labelledby="skill-map-title" hidden>
        <header class="skill-map-header">
          <div>
            <span class="garage-eyebrow">SIGNAL RIDGE · THE LAST SIGNAL</span>
            <h2 id="skill-map-title">Choose a place to explore</h2>
            <p>Take the old pass, follow the river, or climb for the signal fires.</p>
          </div>
          <button class="garage-close" id="skill-map-close" type="button" aria-label="Close the field map">×</button>
        </header>
        <div class="skill-map-content">
          <div class="signal-map-wrap">
            <svg class="signal-map" viewBox="0 0 420 300" role="img" aria-labelledby="signal-map-caption">
              <title id="signal-map-caption">Signal Ridge mountain pass, six beacon destinations, and the motor works</title>
              <path class="map-contour" d="M8 65 Q70 28 125 58 T236 39 T346 51 T412 32 M10 242 Q72 197 141 231 T267 219 T408 260"/>
              <path class="map-contour" d="M25 112 Q83 92 135 117 T243 103 T354 122 T402 96 M10 177 Q65 155 125 179 T232 166 T346 188 T410 160"/>
              <path class="map-river" aria-hidden="true"/>
              <g id="map-road-layer" aria-hidden="true"></g>
              <g class="map-region-labels" aria-hidden="true">
                <text x="44" y="78">LOWLANDS</text>
                <text x="125" y="99">RIVERLANDS</text>
                <text x="194" y="166">ASHEN VALE</text>
                <text x="275" y="133">FOSSIL RIDGE</text>
                <text x="334" y="65">SIGNAL RANGE</text>
                <text x="262" y="239">HIGH PASS</text>
              </g>
              <g id="map-landmark-layer" aria-hidden="true"></g>
              <defs>
                <mask id="map-fog-mask" maskContentUnits="userSpaceOnUse">
                  <rect x="0" y="0" width="420" height="300" fill="white"/>
                  <g id="map-fog-reveal" fill="black"></g>
                </mask>
              </defs>
              <rect class="map-fog-overlay" x="0" y="0" width="420" height="300" mask="url(#map-fog-mask)" aria-hidden="true"/>
              <path id="map-breadcrumb" class="map-breadcrumb" aria-hidden="true"/>
              <path id="map-waypoint-route" class="map-waypoint-route" aria-hidden="true"/>
              <g class="map-destination-points" aria-hidden="true">
                <circle data-map-marker="trailhead" r="4"/>
                <circle data-map-marker="crossing" r="4"/>
                <circle data-map-marker="settlement" r="4"/>
                <circle data-map-marker="bones" r="4"/>
                <circle data-map-marker="signal" r="4"/>
                <circle data-map-marker="high-pass" r="4"/>
                <circle class="map-garage-marker" r="4"/>
              </g>
              <g id="map-player" class="map-player" aria-hidden="true">
                <circle r="7"/>
                <path d="M0 -5 L3 2 L0 1 L-3 2 Z"/>
              </g>
            </svg>
            <div class="map-layer-controls" role="group" aria-label="Map layers">
              <button type="button" data-map-layer="roads" aria-pressed="true">ROADS</button>
              <button type="button" data-map-layer="river" aria-pressed="true">RIVER</button>
              <button type="button" data-map-layer="landmarks" aria-pressed="true">LANDMARKS</button>
              <button type="button" data-map-layer="fog" aria-pressed="true">FOG</button>
            </div>
            <div class="map-view-controls" role="group" aria-label="Map view">
              <button type="button" id="map-zoom-out" aria-label="Zoom out">−</button>
              <button type="button" id="map-zoom-in" aria-label="Zoom in">+</button>
              <button type="button" id="map-center-player">CENTER ON ME</button>
              <button type="button" id="map-fit-all">FIT ALL</button>
            </div>
            <p class="map-scale" aria-label="Map scale">SIGNAL RIDGE · 6 KM × 3.84 KM</p>
            <p class="map-location-readout" id="map-location-readout" aria-live="polite">TRAILHEAD · POSITION UNKNOWN</p>
          </div>
          <nav class="skill-map-destinations" aria-label="Signal Ridge destinations">
            <button type="button" data-destination="trailhead" aria-pressed="false"><span>01</span><strong>The Trailhead</strong><small>Languages · complete skills board</small><b>↗</b></button>
            <button type="button" data-destination="crossing" aria-pressed="false"><span>02</span><strong>The River Crossing</strong><small>Frontend · ford and timber bridge</small><b>↗</b></button>
            <button type="button" data-destination="settlement" aria-pressed="false"><span>03</span><strong>The Ashen Settlement</strong><small>Backend · lantern-lit village loop</small><b>↗</b></button>
            <button type="button" data-destination="bones" aria-pressed="false"><span>04</span><strong>The Old Giant</strong><small>Databases · fossil ridge vista</small><b>↗</b></button>
            <button type="button" data-destination="signal" aria-pressed="false"><span>05</span><strong>The Last Signal</strong><small>Architecture · final ridge beacon</small><b>↗</b></button>
            <button type="button" data-destination="high-pass" aria-pressed="false"><span>06</span><strong>The High Pass</strong><small>Tools · mountain switchbacks</small><b>↗</b></button>
            <button class="map-garage-link" id="map-garage" type="button"><span>↗</span><strong>Motor Works</strong><small>Enter the vehicle workshop</small><b>↗</b></button>
          </nav>
        </div>
        <footer class="map-actions">
          <span id="map-waypoint-status" aria-live="polite">SELECT A PLACE TO SET A WAYPOINT</span>
          <button id="map-clear-waypoint" type="button">CLEAR WAYPOINT</button>
          <button id="map-route-selected" type="button" disabled>FOLLOW ROUTE</button>
          <button id="map-travel-selected" type="button" disabled>FAST TRAVEL</button>
        </footer>
      </section>

      <section class="garage-panel" id="garage-panel" role="dialog" aria-modal="true" aria-labelledby="garage-title" hidden>
        <header class="garage-panel-header">
          <div>
            <span class="garage-eyebrow">SIGNAL RIDGE · MOTOR WORKS</span>
            <h2 id="garage-title">Vehicle setup</h2>
          </div>
          <button class="garage-close" id="garage-close" type="button" aria-label="Leave the garage">×</button>
        </header>
        <p class="garage-intro">Tune the car, then take the build back onto the road.</p>
        <label class="garage-control garage-style-control" for="garage-style">
          <span>Workshop atmosphere</span>
          <select id="garage-style" aria-label="Workshop atmosphere">
            <option value="field">Field workshop · amber</option>
            <option value="relay">Relay station · signal teal</option>
            <option value="alpine">Alpine service · cold steel</option>
          </select>
        </label>
        <label class="garage-control garage-style-control" for="garage-signal-livery">
          <span>Signal-earned livery</span>
          <select id="garage-signal-livery" aria-label="Signal-earned vehicle livery">
            <option value="">Select a restored signal</option>
            ${SIGNAL_LIVERIES.map(({ id, title }) => `<option value="${id}" data-signal-unlock="${id}" disabled>${title}</option>`).join('')}
          </select>
        </label>
        <div class="garage-controls">
          <label class="garage-control garage-color-control">
            <span>Paint</span>
            <input type="color" data-build="paint" aria-label="Vehicle paint color">
          </label>
          <label class="garage-control garage-color-control">
            <span>Alloy finish</span>
            <input type="color" data-build="alloy" aria-label="Wheel alloy color">
          </label>
          <label class="garage-control">
            <span>Ride height <output data-output="rideHeight"></output></span>
            <input type="range" data-build="rideHeight" min="0.84" max="1.2" step="0.01" aria-label="Ride height">
          </label>
          <label class="garage-control">
            <span>Body width <output data-output="bodyWidth"></output></span>
            <input type="range" data-build="bodyWidth" min="0.84" max="1.2" step="0.01" aria-label="Body width">
          </label>
          <label class="garage-control">
            <span>Engine tune <output data-output="power"></output></span>
            <input type="range" data-build="power" min="0.9" max="1.3" step="0.01" aria-label="Engine tuning">
          </label>
          <label class="garage-control">
            <span>Wheels</span>
            <select data-build="wheelStyle" aria-label="Wheel style">
              <option value="street">Street</option>
              <option value="rally">Rally</option>
              <option value="all-terrain">All-terrain</option>
            </select>
          </label>
          <label class="garage-control">
            <span>Body kit</span>
            <select data-build="bodyKit" aria-label="Body kit">
              <option value="stock">Stock</option>
              <option value="rally">Rally</option>
              <option value="utility">Utility</option>
            </select>
          </label>
        </div>
        <footer class="garage-panel-footer">
          <button class="garage-reset" id="garage-reset" type="button">RESTORE STOCK</button>
          <span id="garage-status" aria-live="polite">BUILD SAVED LOCALLY</span>
          <button class="garage-drive" id="garage-drive" type="button">BACK TO THE ROAD ↗</button>
        </footer>
      </section>

      <aside class="bruno-scene-fallback" id="bruno-scene-fallback" role="status" hidden>
        <strong>Explore the engineering map</strong>
        <span>The driving scene is unavailable here. Open the field map to browse the same portfolio evidence.</span>
        <button class="bruno-action-btn" id="fallback-map-open" type="button">OPEN FIELD MAP</button>
      </aside>

      <div class="bruno-gauge-cluster">
        <div class="bruno-inclinometer" id="bruno-inclinometer" title="Inclinometer: Pitch & Roll (Crawl gauge)">
          <div class="incline-chip">
            <span class="incline-lbl">PITCH</span>
            <span class="incline-num is-ok" id="incline-pitch-val">0°</span>
          </div>
          <div class="incline-sep"></div>
          <div class="incline-chip">
            <span class="incline-lbl">ROLL</span>
            <span class="incline-num is-ok" id="incline-roll-val">0°</span>
          </div>
        </div>
        <div class="bruno-speed" aria-live="polite">
          <span class="bruno-gear" id="bruno-gear-value" aria-label="High range">H</span>
          <strong id="bruno-speed-value">0</strong>
          <span>KM/H</span>
        </div>
      </div>

      <aside class="bruno-controls-banner" id="bruno-controls-banner" aria-label="Driving controls" hidden>
        <header><strong>DRIVE THE RIDGE</strong><button id="bruno-controls-close" type="button" aria-label="Close controls">×</button></header>
        <div class="bruno-keys-row">
          <span class="key-badge">W</span>
          <span class="key-badge">A</span>
          <span class="key-badge">S</span>
          <span class="key-badge">D</span>
          <span class="key-sep">/</span>
          <span class="key-badge">↑</span>
          <span class="key-badge">←</span>
          <span class="key-badge">↓</span>
          <span class="key-badge">→</span>
          <span class="key-label">DRIVE &amp; STEER</span>
        </div>
        <div class="bruno-keys-row">
          <span class="key-badge wide">SPACE</span>
          <span class="key-label">BRAKE</span>
          <span class="key-badge wide">SHIFT</span>
          <span class="key-label">NITRO BOOST</span>
        </div>
        <div class="bruno-keys-row">
          <span class="key-badge">E</span><span class="key-label">GARAGE AT ENTRY</span>
          <span class="key-badge">R</span><span class="key-label">RESET</span>
          <span class="key-badge">H</span><span class="key-label">HORN</span>
        </div>
        <div class="bruno-keys-row">
          <span class="key-badge">C</span><span class="key-label">LOW RANGE</span>
          <span class="key-label">MOUSE DRAG ORBITS · WHEEL ZOOMS · DOUBLE-CLICK ROAD TO DRIVE</span>
        </div>
        <div class="bruno-keys-row">
          <span class="key-badge">L</span><span class="key-label">HEADLIGHTS</span>
          <span class="key-badge">SHIFT+T</span><span class="key-label">TIME +1H</span>
          <span class="key-badge">SHIFT+Y</span><span class="key-label">WEATHER</span>
        </div>
        <div class="bruno-world-settings">
          <button type="button" id="bruno-sound-toggle" aria-pressed="true">SOUND ON</button>
          <label for="bruno-volume">VOLUME <input id="bruno-volume" type="range" min="0" max="1" value="0.35" step="0.05"></label>
          <button type="button" id="bruno-time-toggle" aria-pressed="false">PAUSE WORLD CLOCK</button>
          <button type="button" id="bruno-motion-toggle" aria-pressed="false">REDUCED MOTION OFF</button>
        </div>
      </div>

      <aside class="bruno-compass" id="bruno-compass" aria-live="polite" hidden>
        <span aria-hidden="true">↑</span><strong id="bruno-compass-label">NO WAYPOINT</strong>
      </aside>
      <button class="bruno-minimap" id="bruno-minimap" type="button" aria-label="Open map" hidden>
        <svg id="bruno-minimap-svg" viewBox="0 0 420 300" aria-hidden="true"></svg>
      </button>
      <div class="bruno-objective" id="bruno-objective">
        <span class="objective-label">FIELD NOTE</span>
        <span id="bruno-objective-text" aria-live="polite">FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD</span>
      </div>

      <aside class="bruno-proximity-badge" id="bruno-proximity-badge" aria-live="polite" aria-hidden="true" hidden>
        <button class="discovery-close" id="discovery-close" type="button" aria-label="Close field note">×</button>
        <div class="badge-accent-bar" id="badge-accent-bar"></div>
        <div class="badge-content">
          <div class="badge-eyebrow">
            <span class="badge-tag" id="badge-category">FIELD SITE</span>
            <span class="badge-metric" id="badge-metric">ARRIVE TO DISCOVER</span>
          </div>
          <h2 class="badge-title" id="badge-title">A place in the system</h2>
          <p class="badge-desc" id="badge-desc">Reach a field site to see the work behind it.</p>
          <div class="badge-chips" id="badge-chips">
            <!-- Dynamically populated -->
          </div>
          <p class="badge-evidence" id="badge-evidence"></p>
          <button class="badge-work-link" id="badge-relight-button" type="button">E · RELIGHT THIS SIGNAL <span aria-hidden="true">✳</span></button>
          <button class="badge-work-link" id="badge-board-open" type="button">OPEN THE SKILLS BOARD <span aria-hidden="true">↗</span></button>
          <a class="badge-work-link" href="#work" data-portfolio-route="projects">SEE PROJECTS <span aria-hidden="true">↗</span></a>
          <a class="badge-work-link" id="badge-transmit-link" href="#contact" data-portfolio-route="contact" hidden>TRANSMIT · OPEN CONTACT <span aria-hidden="true">↗</span></a>
        </div>
      </aside>

      <!-- On-screen Touch / Virtual Controls for Mouse/Mobile -->
      <div class="bruno-touch-controls" id="bruno-touch-controls">
        <div class="touch-dpad">
          <button class="touch-btn touch-up" data-key="forward" type="button" aria-label="Accelerate">▲</button>
          <div class="touch-horizontal">
            <button class="touch-btn touch-left" data-key="left" type="button" aria-label="Steer left">◀</button>
            <button class="touch-btn touch-down" data-key="backward" type="button" aria-label="Reverse">▼</button>
            <button class="touch-btn touch-right" data-key="right" type="button" aria-label="Steer right">▶</button>
          </div>
        </div>
        <div class="touch-actions">
          <button class="touch-action-btn nitro" data-key="nitro" type="button" aria-label="Nitro boost">NITRO</button>
          <button class="touch-action-btn brake" data-key="brake" type="button" aria-label="Brake">BRAKE</button>
        </div>
      </div>
    </div>
  `;

  // Discovery badge handler
  const boardGrid = container.querySelector('#skills-register-grid');
  const boardTabs = container.querySelector('#skills-register-tabs');
  let activeSkillSlide = 0;
  const renderSkillSlide = index => {
    activeSkillSlide = (index + SKILL_BOARD_GROUPS.length) % SKILL_BOARD_GROUPS.length;
    boardGrid.querySelectorAll('.skills-register-group').forEach((section, sectionIndex) => {
      section.hidden = sectionIndex !== activeSkillSlide;
    });
    boardTabs.querySelectorAll('[role="tab"]').forEach((tab, tabIndex) => {
      const selected = tabIndex === activeSkillSlide;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    container.querySelector('#skills-register-count').textContent =
      `${String(activeSkillSlide + 1).padStart(2, '0')} / ${String(SKILL_BOARD_GROUPS.length).padStart(2, '0')}`;
    container.querySelector('#skills-register-progress').style.transform =
      `scaleX(${(activeSkillSlide + 1) / SKILL_BOARD_GROUPS.length})`;
  };
  SKILL_BOARD_GROUPS.forEach((group, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `skills-register-tab-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `skills-register-panel-${index}`);
    tab.setAttribute('aria-selected', 'false');
    tab.tabIndex = -1;
    tab.textContent = group.title;
    tab.addEventListener('click', () => renderSkillSlide(index));
    tab.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        renderSkillSlide(index + 1);
        boardTabs.querySelector('[aria-selected="true"]')?.focus();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        renderSkillSlide(index - 1);
        boardTabs.querySelector('[aria-selected="true"]')?.focus();
      }
    });
    boardTabs.append(tab);

    const section = document.createElement('section');
    section.className = 'skills-register-group';
    section.id = `skills-register-panel-${index}`;
    section.setAttribute('role', 'tabpanel');
    section.setAttribute('aria-labelledby', tab.id);
    section.tabIndex = 0;
    const heading = document.createElement('h3');
    heading.textContent = group.title;
    const chapter = document.createElement('span');
    chapter.className = 'skills-register-chapter';
    chapter.textContent = `FIELD LOG ${String(index + 1).padStart(2, '0')} · ${group.skills.length} SKILLS`;
    const list = document.createElement('div');
    list.className = 'skills-register-list';
    group.skills.forEach(skill => {
      const item = document.createElement('span');
      item.textContent = skill;
      list.append(item);
    });
    const evidence = document.createElement('details');
    evidence.className = 'skills-register-evidence';
    const summary = document.createElement('summary');
    summary.textContent = 'FIELD EVIDENCE';
    const description = document.createElement('p');
    description.textContent = group.evidence;
    evidence.append(summary, description);
    const destination = FIELD_DESTINATIONS[index];
    const explore = document.createElement('button');
    explore.type = 'button';
    explore.className = 'skills-register-explore';
    explore.textContent = `EXPLORE ${destination.title.toUpperCase()} ↗`;
    explore.addEventListener('click', () => startJourney(destination.id));
    section.append(chapter, heading, list, evidence, explore);
    boardGrid.append(section);
  });
  renderSkillSlide(0);
  container.querySelector('#skills-register-previous').addEventListener('click', () => {
    renderSkillSlide(activeSkillSlide - 1);
  });
  container.querySelector('#skills-register-next').addEventListener('click', () => {
    renderSkillSlide(activeSkillSlide + 1);
  });

  const badgeEl = container.querySelector('#bruno-proximity-badge');
  const badgeCategory = container.querySelector('#badge-category');
  const badgeMetric = container.querySelector('#badge-metric');
  const badgeTitle = container.querySelector('#badge-title');
  const badgeDesc = container.querySelector('#badge-desc');
  const badgeChips = container.querySelector('#badge-chips');
  const badgeEvidence = container.querySelector('#badge-evidence');
  const badgeRelightButton = container.querySelector('#badge-relight-button');
  const badgeTransmitLink = container.querySelector('#badge-transmit-link');
  const badgeBoardOpen = container.querySelector('#badge-board-open');
  const badgeProjectLink = container.querySelector('.badge-work-link[href="#work"]');
  const destinationButtons = container.querySelectorAll('#skill-map-panel [data-destination]');
  const garagePanel = container.querySelector('#garage-panel');
  const mapPanel = container.querySelector('#skill-map-panel');
  const controlsPanel = container.querySelector('#bruno-controls-banner');
  const mapButton = container.querySelector('#bruno-btn-map');
  const boardButton = container.querySelector('#bruno-btn-board');
  const controlsButton = container.querySelector('#bruno-btn-controls');
  const rallyButton = container.querySelector('#bruno-btn-rally');
  const arrivalPanel = container.querySelector('#skills-arrival');
  const objectiveText = container.querySelector('#bruno-objective-text');
  const mapPlayer = container.querySelector('#map-player');
  const minimapButton = container.querySelector('#bruno-minimap');
  const minimapSvg = container.querySelector('#bruno-minimap-svg');
  const compass = container.querySelector('#bruno-compass');
  const compassNeedle = compass.querySelector('span');
  const compassLabel = container.querySelector('#bruno-compass-label');
  const waypointStatus = container.querySelector('#map-waypoint-status');
  const mapReadout = container.querySelector('#map-location-readout');
  const fogReveal = container.querySelector('#map-fog-reveal');
  const breadcrumbPath = container.querySelector('#map-breadcrumb');
  const waypointPath = container.querySelector('#map-waypoint-route');
  const mapLayerButtons = container.querySelectorAll('[data-map-layer]');
  const mapSvg = container.querySelector('.signal-map');
  const mapZoomOut = container.querySelector('#map-zoom-out');
  const mapZoomIn = container.querySelector('#map-zoom-in');
  const mapCenterPlayer = container.querySelector('#map-center-player');
  const mapFitAll = container.querySelector('#map-fit-all');
  const selectedMapDestination = container.querySelector('#map-route-selected');
  const travelMapDestination = container.querySelector('#map-travel-selected');
  const clearMapWaypoint = container.querySelector('#map-clear-waypoint');
  const soundToggle = container.querySelector('#bruno-sound-toggle');
  const volumeSlider = container.querySelector('#bruno-volume');
  const timeToggle = container.querySelector('#bruno-time-toggle');
  const motionToggle = container.querySelector('#bruno-motion-toggle');
  const garageStatus = container.querySelector('#garage-status');
  const garageStyleSelect = container.querySelector('#garage-style');
  const garageSignalLivery = container.querySelector('#garage-signal-livery');
  const signalCount = container.querySelector('#bruno-signal-count');
  const buildInputs = container.querySelectorAll('[data-build]');
  let world = null;
  let pendingDestination = null;
  let pendingGarageTravel = false;
  let pendingVehicleBuild = { ...DEFAULT_VEHICLE_BUILD };
  let savedSignals = [];
  let savedSecrets = [];
  let savedSettlementTopics = [];
  let litSignalIds = new Set();
  let activeDiscoveryId = null;
  let allSignalsLit = false;
  let rallyActive = false;
  let rallyStartPending = false;
  let started = false;
  let selectedDestinationId = null;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastBreadcrumbPosition = null;
  let lastMapPosition = null;
  let mapZoom = 1;
  let mapCenter = { x: 210, y: 150 };
  let mapDragging = false;
  let lastMapPointer = null;
  const breadcrumbPoints = [];
  const fogRevealCircles = new Map();
  container.classList.toggle('is-reduced-motion', reducedMotion);
  motionToggle.setAttribute('aria-pressed', String(reducedMotion));
  motionToggle.textContent = `REDUCED MOTION ${reducedMotion ? 'ON' : 'OFF'}`;
  soundToggle.setAttribute('aria-pressed', String(sound.enabled));
  soundToggle.textContent = sound.enabled ? 'SOUND ON' : 'SOUND OFF';
  volumeSlider.value = String(sound.setVolume(volumeSlider.value));

  soundToggle.addEventListener('click', () => {
    const enabled = sound.toggleSound();
    soundToggle.setAttribute('aria-pressed', String(enabled));
    soundToggle.textContent = enabled ? 'SOUND ON' : 'SOUND OFF';
  });
  volumeSlider.addEventListener('input', () => sound.setVolume(volumeSlider.value));
  timeToggle.addEventListener('click', () => {
    const paused = timeToggle.getAttribute('aria-pressed') !== 'true';
    world?.setTimePaused(paused);
    timeToggle.setAttribute('aria-pressed', String(paused));
    timeToggle.textContent = paused ? 'RESUME WORLD CLOCK' : 'PAUSE WORLD CLOCK';
  });
  motionToggle.addEventListener('click', () => {
    reducedMotion = !reducedMotion;
    container.classList.toggle('is-reduced-motion', reducedMotion);
    world?.setReducedMotion(reducedMotion);
    motionToggle.setAttribute('aria-pressed', String(reducedMotion));
    motionToggle.textContent = `REDUCED MOTION ${reducedMotion ? 'ON' : 'OFF'}`;
  });

  const openGarage = () => {
    rallyActive = false;
    rallyButton.setAttribute('aria-pressed', 'false');
    rallyButton.querySelector('span').textContent = 'OPTIONAL RALLY';
    destinationButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
    container.querySelectorAll('[data-map-marker]').forEach(marker => marker.classList.remove('is-selected'));
    closeDiscovery();
    if (world?.travelToGarage()) {
      pendingGarageTravel = false;
      objectiveText.textContent = 'MOTOR WORKS · BUILD READY · DRIVE BACK TO THE RIDGE';
      return;
    }
    pendingGarageTravel = true;
    objectiveText.textContent = 'MOTOR WORKS · OPENING THE WORKSHOP';
  };

  garagePanel.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...garagePanel.querySelectorAll('button, input, select')]
      .filter(element => !element.disabled && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  mapPanel.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...mapPanel.querySelectorAll('button')]
      .filter(element => !element.disabled && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  try {
    const savedBuild = window.localStorage.getItem(VEHICLE_BUILD_STORAGE_KEY);
    if (savedBuild) pendingVehicleBuild = { ...DEFAULT_VEHICLE_BUILD, ...JSON.parse(savedBuild) };
    const storedSignals = window.localStorage.getItem(SIGNAL_PROGRESS_STORAGE_KEY);
    if (storedSignals) {
      const parsedSignals = JSON.parse(storedSignals);
      if (Array.isArray(parsedSignals)) {
        savedSignals = parsedSignals.filter(id => FIELD_DESTINATIONS.some(destination => destination.id === id));
      }
    }
    const storedSecrets = window.localStorage.getItem(SECRET_PROGRESS_STORAGE_KEY);
    if (storedSecrets) {
      const parsedSecrets = JSON.parse(storedSecrets);
      if (Array.isArray(parsedSecrets)) {
        savedSecrets = parsedSecrets.filter(id => Object.hasOwn(FIELD_SECRET_NOTES, id));
      }
    }
    const storedSettlementTopics = window.localStorage.getItem(SETTLEMENT_PROGRESS_STORAGE_KEY);
    if (storedSettlementTopics) {
      const parsedTopics = JSON.parse(storedSettlementTopics);
      if (Array.isArray(parsedTopics)) {
        savedSettlementTopics = parsedTopics.filter(id => SETTLEMENT_TOPICS.some(topic => topic.id === id));
      }
    }
    const savedGarageStyle = window.localStorage.getItem('signal-ridge-garage-style');
    if (savedGarageStyle && ['field', 'relay', 'alpine'].includes(savedGarageStyle)) {
      garageStyleSelect.value = savedGarageStyle;
    }
  } catch (error) {
    console.error('Failed to load the saved Signal Ridge settings:', error);
  }
  allSignalsLit = savedSignals.length === FIELD_DESTINATIONS.length;
  litSignalIds = new Set(savedSignals);

  garageStyleSelect.addEventListener('change', () => {
    world?.setGarageStyle(garageStyleSelect.value);
    try {
      window.localStorage.setItem('signal-ridge-garage-style', garageStyleSelect.value);
    } catch (error) {
      console.error('Failed to save the Signal Ridge workshop atmosphere:', error);
      garageStatus.textContent = 'WORKSHOP STYLE NOT SAVED';
    }
  });

  function syncBuildControls(build) {
    buildInputs.forEach(input => {
      const value = build[input.dataset.build];
      if (value !== undefined) input.value = String(value);
      const output = container.querySelector(`[data-output="${input.dataset.build}"]`);
      if (output) output.value = `${Math.round(Number(value) * 100)}%`;
    });
  }

  function showFieldDiscovery(destinationId) {
    const destination = FIELD_DESTINATIONS.find(item => item.id === destinationId);
    if (!destination) return;

    badgeCategory.textContent = `SIGNAL RIDGE · ${destination.category.toUpperCase()} BEACON`;
    badgeMetric.textContent = destination.caption;
    badgeTitle.textContent = destination.title;
    badgeDesc.textContent = 'Beacon relit. The ridge brightens as the route opens; the complete inventory stays together on the Trailhead board.';
    badgeChips.replaceChildren();
    const skillGroup = SKILL_BOARD_GROUPS.find(group => group.title === destination.category);
    skillGroup?.skills.slice(0, 4).forEach(skill => {
      const chip = document.createElement('span');
      chip.textContent = skill;
      badgeChips.append(chip);
    });
    badgeEvidence.textContent = FIELD_EVIDENCE[destinationId];
    activeDiscoveryId = destinationId;
    const isLit = litSignalIds.has(destinationId);
    const requiredSignals = ['trailhead', 'crossing', 'settlement', 'bones'];
    const finalSignalLocked = destinationId === 'signal'
      && !requiredSignals.every(id => litSignalIds.has(id));
    const settlementLocked = destinationId === 'settlement'
      && savedSettlementTopics.length < SETTLEMENT_TOPICS.length;
    badgeRelightButton.hidden = isLit;
    badgeDesc.textContent = isLit
      ? `Signal restored. ${FIELD_STORY_FRAGMENTS[destinationId]}`
      : finalSignalLocked
        ? `The final beacon is sealed until the first four signals are lit. ${requiredSignals.filter(id => !litSignalIds.has(id)).length} remain.`
        : settlementLocked
          ? `The settlement signal is sealed. Light all ${SETTLEMENT_TOPICS.length} house lamps along the village loop first.`
        : `Field signal found. ${FIELD_STORY_FRAGMENTS[destinationId]}`;
    badgeRelightButton.disabled = finalSignalLocked || settlementLocked;
    badgeBoardOpen.hidden = false;
    badgeProjectLink.hidden = false;
    badgeTransmitLink.hidden = !allSignalsLit;
    badgeEl.hidden = false;
    badgeEl.classList.add('is-visible');
    badgeEl.setAttribute('aria-hidden', 'false');
  }

  function showSecretDiscovery(secretId) {
    const secret = FIELD_SECRET_NOTES[secretId];
    const site = WORLD_SECRET_SITES.find(item => item.id === secretId);
    if (!secret || !site) return;
    if (!savedSecrets.includes(secretId)) savedSecrets.push(secretId);
    try {
      window.localStorage.setItem(SECRET_PROGRESS_STORAGE_KEY, JSON.stringify(savedSecrets));
    } catch (error) {
      console.error('Failed to save discovered Signal Ridge secrets:', error);
    }
    const point = worldToMap(site.x, site.z);
    const screenPoint = mapScreenPoint(point.x, point.y);
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('class', 'map-secret-marker');
    marker.setAttribute('cx', screenPoint.x.toFixed(1));
    marker.setAttribute('cy', screenPoint.y.toFixed(1));
    marker.setAttribute('r', '4');
    const markerTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    markerTitle.textContent = secret.title;
    marker.append(markerTitle);
    landmarkLayer.append(marker);
    addFogReveal(screenPoint.x, screenPoint.y, 16, `secret-${secretId}`);
    badgeCategory.textContent = 'HIDDEN FIELD NOTE';
    badgeMetric.textContent = 'SIGNAL RIDGE · SECRET FOUND';
    badgeTitle.textContent = secret.title;
    badgeDesc.textContent = secret.note;
    badgeChips.replaceChildren();
    badgeEvidence.textContent = '';
    badgeRelightButton.hidden = true;
    badgeRelightButton.disabled = true;
    badgeBoardOpen.hidden = true;
    badgeProjectLink.hidden = !secret.link;
    badgeTransmitLink.hidden = true;
    activeDiscoveryId = null;
    badgeEl.hidden = false;
    badgeEl.classList.add('is-visible');
    badgeEl.setAttribute('aria-hidden', 'false');
    objectiveText.textContent = `SECRET FOUND · ${secret.title.toUpperCase()}`;
  }

  function showSettlementTopic(topic) {
    badgeCategory.textContent = 'ASHEN SETTLEMENT · BACKEND TOPIC';
    badgeMetric.textContent = `HOUSE LAMP ${topic.litCount} OF ${topic.total} · THE LOOP IS WAKING`;
    badgeTitle.textContent = topic.title;
    badgeDesc.textContent = 'A field note from the village loop. Light every house lamp to open the settlement signal.';
    badgeChips.replaceChildren();
    const chip = document.createElement('span');
    chip.textContent = topic.title;
    badgeChips.append(chip);
    badgeEvidence.textContent = SKILL_EVIDENCE.backend;
    badgeRelightButton.hidden = true;
    badgeRelightButton.disabled = true;
    badgeBoardOpen.hidden = false;
    badgeProjectLink.hidden = true;
    badgeTransmitLink.hidden = true;
    activeDiscoveryId = null;
    badgeEl.hidden = false;
    badgeEl.classList.add('is-visible');
    badgeEl.setAttribute('aria-hidden', 'false');
    objectiveText.textContent = `HOUSE LIT · ${topic.title.toUpperCase()} · ${topic.litCount}/${topic.total}`;
  }

  const closeDiscovery = () => {
    badgeEl.classList.remove('is-visible');
    badgeEl.hidden = true;
    badgeEl.setAttribute('aria-hidden', 'true');
  };

  const startJourney = destinationId => {
    if (destinationId) {
      pendingDestination = destinationId;
      selectedDestinationId = destinationId;
      world?.setDestination(destinationId);
      destinationButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.destination === destinationId));
      });
      container.querySelectorAll('[data-map-marker]').forEach(marker => {
        marker.classList.toggle('is-selected', marker.dataset.mapMarker === destinationId);
      });
      objectiveText.textContent = `ROUTE SET · ${FIELD_DESTINATIONS.find(item => item.id === destinationId)?.title.toUpperCase()} · FOLLOW THE OLD PASS`;
    } else {
      pendingDestination = 'trailhead';
      world?.setDestination('trailhead');
      objectiveText.textContent = 'TRAILHEAD · THE SKILLS BOARD IS AHEAD · LIGHT THE FIRST SIGNAL';
    }
    started = true;
    arrivalPanel.hidden = true;
    boardButton.setAttribute('aria-expanded', 'false');
    container.classList.remove('is-intro');
    minimapButton.hidden = false;
    sound.startWorldAmbience();
    world?.setPaused(!mapPanel.hidden || !controlsPanel.hidden);
    world?.setReducedMotion(reducedMotion);
    mapButton.focus();
  };

  const mapPathFromPoints = (points, closed = false) => {
    if (!points.length) return '';
    const screenPoints = points.map(([x, y]) => mapScreenPoint(x, y));
    let path = `M ${screenPoints[0].x.toFixed(1)} ${screenPoints[0].y.toFixed(1)}`;
    for (let index = 0; index < screenPoints.length - 1; index += 1) {
      const previous = screenPoints[Math.max(0, index - 1)];
      const start = screenPoints[index];
      const end = screenPoints[index + 1];
      const next = screenPoints[Math.min(screenPoints.length - 1, index + 2)];
      const control1X = start.x + (end.x - previous.x) / 6;
      const control1Y = start.y + (end.y - previous.y) / 6;
      const control2X = end.x - (next.x - start.x) / 6;
      const control2Y = end.y - (next.y - start.y) / 6;
      path += ` C ${control1X.toFixed(1)} ${control1Y.toFixed(1)}`
        + ` ${control2X.toFixed(1)} ${control2Y.toFixed(1)}`
        + ` ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
    }
    return closed ? `${path} Z` : path;
  };
  const updateMapView = () => {
    const width = 420 / mapZoom;
    const height = 300 / mapZoom;
    const centerX = Math.max(width / 2, Math.min(420 - width / 2, mapCenter.x));
    const centerY = Math.max(height / 2, Math.min(300 - height / 2, mapCenter.y));
    mapCenter = { x: centerX, y: centerY };
    mapSvg.setAttribute(
      'viewBox',
      `${(centerX - width / 2).toFixed(2)} ${(centerY - height / 2).toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`
    );
  };
  const zoomMap = amount => {
    mapZoom = Math.max(1, Math.min(4, mapZoom + amount));
    updateMapView();
  };

  const roadLayer = container.querySelector('#map-road-layer');
  const appendMapPath = (parent, points, className, closed = false, from = null, to = null) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', mapPathFromPoints(points, closed));
    path.setAttribute('class', className);
    if (from !== null && to !== null) {
      path.dataset.roadFrom = String(from);
      path.dataset.roadTo = String(to);
    }
    parent.append(path);
  };
  ROAD_DEFINITIONS.forEach(({ mapPoints, kind, closed, from, to }) => {
    if (kind === 'pass') appendMapPath(roadLayer, mapPoints, 'map-road-shoulder', closed, from, to);
    appendMapPath(roadLayer, mapPoints, kind === 'trail' ? 'map-road-trail' : 'map-road', closed, from, to);
  });
  container.querySelector('.map-river').setAttribute('d', mapPathFromPoints(RIVER_MAP_ROUTE));
  const landmarkLayer = container.querySelector('#map-landmark-layer');
  WORLD_LANDMARKS.forEach(landmark => {
    const point = worldToMap(landmark.x, landmark.z);
    const screenPoint = mapScreenPoint(point.x, point.y);
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.setAttribute('class', `map-landmark map-landmark-${landmark.type}`);
    marker.setAttribute('cx', screenPoint.x.toFixed(1));
    marker.setAttribute('cy', screenPoint.y.toFixed(1));
    marker.setAttribute('r', '3');
    marker.dataset.landmark = landmark.id;
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = landmark.title;
    marker.append(title);
    landmarkLayer.append(marker);
  });
  const miniMapContent = Array.from(mapSvg.childNodes)
    .filter(node => node.nodeType !== Node.ELEMENT_NODE || !node.matches('.map-fog-overlay, defs'))
    .map(node => node.cloneNode(true));
  miniMapContent.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    node.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    if (node.hasAttribute('id')) node.removeAttribute('id');
  });
  minimapSvg.classList.add('signal-map');
  minimapSvg.replaceChildren(...miniMapContent);
  const minimapPlayer = minimapSvg.querySelector('.map-player');
  WORLD_DESTINATIONS.forEach(({ id, x, z }) => {
    const point = worldToMap(x, z);
    const screenPoint = mapScreenPoint(point.x, point.y);
    const marker = container.querySelector(`[data-map-marker="${id}"]`);
    marker.setAttribute('cx', screenPoint.x.toFixed(1));
    marker.setAttribute('cy', screenPoint.y.toFixed(1));
  });
  const garageMapPoint = worldToMap(GARAGE_POSITION.x, GARAGE_POSITION.z);
  const garageScreenPoint = mapScreenPoint(garageMapPoint.x, garageMapPoint.y);
  const garageMarker = container.querySelector('.map-garage-marker');
  garageMarker.setAttribute('cx', garageScreenPoint.x.toFixed(1));
  garageMarker.setAttribute('cy', garageScreenPoint.y.toFixed(1));

  const addFogReveal = (x, y, radius, key) => {
    if (!fogReveal || fogRevealCircles.has(key)) return;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toFixed(1));
    circle.setAttribute('cy', y.toFixed(1));
    circle.setAttribute('r', radius.toFixed(1));
    fogReveal.append(circle);
    fogRevealCircles.set(key, circle);
  };
  WORLD_DESTINATIONS.forEach(({ id, x, z }) => {
    if (!litSignalIds.has(id)) return;
    const point = worldToMap(x, z);
    const screenPoint = mapScreenPoint(point.x, point.y);
    addFogReveal(screenPoint.x, screenPoint.y, 38, `signal-${id}`);
  });
  const routeSignalIds = ['trailhead', 'crossing', 'settlement', 'bones', 'signal', 'high-pass'];
  const updateMapSignalState = () => {
    [mapSvg, minimapSvg].forEach(root => root.querySelectorAll('[data-road-from]').forEach(path => {
      const from = routeSignalIds[Number(path.dataset.roadFrom) - 1];
      const to = routeSignalIds[Number(path.dataset.roadTo) - 1];
      path.classList.toggle('is-lit', Boolean(from && to && litSignalIds.has(from) && litSignalIds.has(to)));
    }));
    WORLD_DESTINATIONS.forEach(({ id, x, z }) => {
      [container.querySelector(`[data-map-marker="${id}"]`), minimapSvg.querySelector(`[data-map-marker="${id}"]`)]
        .forEach(marker => marker?.classList.toggle('is-lit', litSignalIds.has(id)));
      if (!litSignalIds.has(id)) return;
      const point = worldToMap(x, z);
      const screenPoint = mapScreenPoint(point.x, point.y);
      addFogReveal(screenPoint.x, screenPoint.y, 38, `signal-${id}`);
    });
  };
  updateMapSignalState();

  const updateMapPlayer = (position, heading = 0, elevation = 0) => {
    if (!position || !mapPlayer) return;
    lastMapPosition = { x: position.x, z: position.z };
    const point = worldToMap(position.x, position.z);
    const screenPoint = mapScreenPoint(point.x, point.y);
    const transform = `translate(${screenPoint.x.toFixed(1)} ${screenPoint.y.toFixed(1)}) rotate(${(heading * 180 / Math.PI).toFixed(1)})`;
    mapPlayer.setAttribute('transform', transform);
    minimapPlayer?.setAttribute('transform', transform);
    addFogReveal(screenPoint.x, screenPoint.y, 12, 'player');
    if (!lastBreadcrumbPosition || Math.hypot(
      position.x - lastBreadcrumbPosition.x,
      position.z - lastBreadcrumbPosition.z
    ) > 45) {
      lastBreadcrumbPosition = { x: position.x, z: position.z };
      breadcrumbPoints.push({ x: screenPoint.x, y: screenPoint.y });
      if (breadcrumbPoints.length > 180) breadcrumbPoints.shift();
      const path = breadcrumbPoints.map((item, index) =>
        `${index ? 'L' : 'M'} ${item.x.toFixed(1)} ${item.y.toFixed(1)}`
      ).join(' ');
      breadcrumbPath?.setAttribute('d', path);
      addFogReveal(screenPoint.x, screenPoint.y, 3, `trail-${breadcrumbPoints.length}`);
    }
    if (selectedDestinationId) {
      const destination = WORLD_DESTINATIONS.find(item => item.id === selectedDestinationId);
      if (destination) {
        const target = worldToMap(destination.x, destination.z);
        const targetScreen = mapScreenPoint(target.x, target.y);
        waypointPath?.setAttribute(
          'd',
          `M ${screenPoint.x.toFixed(1)} ${screenPoint.y.toFixed(1)} L ${targetScreen.x.toFixed(1)} ${targetScreen.y.toFixed(1)}`
        );
        const dx = destination.x - position.x;
        const dz = destination.z - position.z;
        const bearing = Math.atan2(dx, dz) - heading;
        compassNeedle.style.transform = `rotate(${(bearing * 180 / Math.PI).toFixed(1)}deg)`;
        compassLabel.textContent = `${destination.title} · ${Math.round(Math.hypot(dx, dz))} M`;
        compass.hidden = false;
      }
    } else {
      waypointPath?.removeAttribute('d');
      compass.hidden = true;
    }
    if (mapReadout) {
      mapReadout.textContent = `FIELD COORDINATES ${Math.round(point.x)}, ${Math.round(point.y)} · ELEVATION ${Math.round(elevation)} M`;
    }
  };

  const closeMap = (restoreFocus = true) => {
    mapPanel.hidden = true;
    mapButton.setAttribute('aria-expanded', 'false');
    world?.setPaused(!started || !controlsPanel.hidden || !arrivalPanel.hidden);
    if (restoreFocus) mapButton.focus();
  };

  const openMap = () => {
    controlsPanel.hidden = true;
    controlsButton.setAttribute('aria-expanded', 'false');
    if (started) {
      arrivalPanel.hidden = true;
      boardButton.setAttribute('aria-expanded', 'false');
    }
    mapPanel.hidden = false;
    mapButton.setAttribute('aria-expanded', 'true');
    world?.setPaused(true);
    container.querySelector('#skill-map-close').focus();
  };

  destinationButtons.forEach(button => {
    button.addEventListener('click', () => {
      const destinationId = button.dataset.destination;
      const destination = FIELD_DESTINATIONS.find(item => item.id === destinationId);
      if (!destination) return;
      selectedDestinationId = destinationId;
      selectedMapDestination.disabled = false;
      travelMapDestination.disabled = false;
      destinationButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      container.querySelectorAll('[data-map-marker]').forEach(marker => {
        marker.classList.toggle('is-selected', marker.dataset.mapMarker === destinationId);
      });
      waypointStatus.textContent = `${destination.title.toUpperCase()} · ${
        litSignalIds.has(destinationId) ? 'SIGNAL LIT' : 'SIGNAL DARK'
      } · SELECT FOLLOW ROUTE OR FAST TRAVEL`;
    });
  });

  selectedMapDestination.addEventListener('click', () => {
    if (!selectedDestinationId) return;
    pendingDestination = selectedDestinationId;
    world?.setDestination(selectedDestinationId);
    if (!started) startJourney(selectedDestinationId);
    rallyActive = false;
    rallyButton.setAttribute('aria-pressed', 'false');
    rallyButton.querySelector('span').textContent = 'OPTIONAL RALLY';
    objectiveText.textContent = `WAYPOINT SET · FOLLOW THE ROAD TO ${
      FIELD_DESTINATIONS.find(item => item.id === selectedDestinationId)?.title.toUpperCase()
    }`;
    closeMap();
  });

  travelMapDestination.addEventListener('click', () => {
    if (!selectedDestinationId) return;
    if (!started) startJourney(selectedDestinationId);
    if (!world?.travelToDestination(selectedDestinationId)) {
      waypointStatus.textContent = 'FAST TRAVEL IS UNAVAILABLE RIGHT NOW';
      return;
    }
    pendingDestination = selectedDestinationId;
    breadcrumbPoints.splice(0);
    lastBreadcrumbPosition = null;
    breadcrumbPath?.removeAttribute('d');
    for (const [key, circle] of fogRevealCircles) {
      if (key.startsWith('trail-')) {
        circle.remove();
        fogRevealCircles.delete(key);
      }
    }
    const destination = FIELD_DESTINATIONS.find(item => item.id === selectedDestinationId);
    objectiveText.textContent = litSignalIds.has(selectedDestinationId)
      ? `ARRIVED AT ${destination.title.toUpperCase()} · SIGNAL RESTORED`
      : `ARRIVED AT ${destination.title.toUpperCase()} · THE SIGNAL IS STILL DARK`;
    container.classList.add('is-fast-travelling');
    window.setTimeout(() => container.classList.remove('is-fast-travelling'), 520);
    closeMap();
  });

  clearMapWaypoint.addEventListener('click', () => {
    selectedDestinationId = null;
    pendingDestination = null;
    world?.clearDestination();
    destinationButtons.forEach(item => item.setAttribute('aria-pressed', 'false'));
    container.querySelectorAll('[data-map-marker]').forEach(marker => marker.classList.remove('is-selected'));
    waypointStatus.textContent = 'WAYPOINT CLEARED';
    selectedMapDestination.disabled = true;
    travelMapDestination.disabled = true;
    compass.hidden = true;
    waypointPath?.removeAttribute('d');
  });

  mapLayerButtons.forEach(button => {
    button.addEventListener('click', () => {
      const enabled = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(enabled));
      const layer = button.dataset.mapLayer;
      if (layer === 'roads') container.querySelector('#map-road-layer').classList.toggle('is-hidden', !enabled);
      else if (layer === 'river') container.querySelector('.map-river').classList.toggle('is-hidden', !enabled);
      else if (layer === 'landmarks') landmarkLayer.classList.toggle('is-hidden', !enabled);
      else if (layer === 'fog') container.querySelector('.map-fog-overlay').classList.toggle('is-hidden', !enabled);
    });
  });
  mapZoomIn.addEventListener('click', () => zoomMap(0.5));
  mapZoomOut.addEventListener('click', () => zoomMap(-0.5));
  mapFitAll.addEventListener('click', () => {
    mapZoom = 1;
    mapCenter = { x: 210, y: 150 };
    updateMapView();
  });
  mapCenterPlayer.addEventListener('click', () => {
    if (!lastMapPosition) {
      waypointStatus.textContent = 'START THE JOURNEY TO TRACK YOUR POSITION';
      return;
    }
    mapZoom = Math.max(mapZoom, 1.6);
    const point = worldToMap(lastMapPosition.x, lastMapPosition.z);
    mapCenter = mapScreenPoint(point.x, point.y);
    updateMapView();
  });
  mapSvg.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    mapDragging = true;
    lastMapPointer = { x: event.clientX, y: event.clientY };
    mapSvg.setPointerCapture(event.pointerId);
  });
  mapSvg.addEventListener('pointermove', event => {
    if (!mapDragging || !lastMapPointer) return;
    const bounds = mapSvg.getBoundingClientRect();
    mapCenter.x -= (event.clientX - lastMapPointer.x) * (420 / bounds.width) / mapZoom;
    mapCenter.y -= (event.clientY - lastMapPointer.y) * (300 / bounds.height) / mapZoom;
    lastMapPointer = { x: event.clientX, y: event.clientY };
    updateMapView();
  });
  const endMapDrag = event => {
    mapDragging = false;
    lastMapPointer = null;
    if (mapSvg.hasPointerCapture(event.pointerId)) mapSvg.releasePointerCapture(event.pointerId);
  };
  mapSvg.addEventListener('pointerup', endMapDrag);
  mapSvg.addEventListener('pointercancel', endMapDrag);
  mapSvg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomMap(event.deltaY < 0 ? 0.25 : -0.25);
  }, { passive: false });

  const openSkillsBoard = () => {
    if (!started || !arrivalPanel.hidden) return;
    closeDiscovery();
    mapPanel.hidden = true;
    mapButton.setAttribute('aria-expanded', 'false');
    controlsPanel.hidden = true;
    controlsButton.setAttribute('aria-expanded', 'false');
    arrivalPanel.hidden = false;
    boardButton.setAttribute('aria-expanded', 'true');
    world?.setPaused(true);
    boardTabs.querySelector('[aria-selected="true"]')?.focus();
  };

  boardButton.addEventListener('click', () => {
    if (!started) return;
    if (arrivalPanel.hidden) {
      openSkillsBoard();
      return;
    }
    arrivalPanel.hidden = true;
    boardButton.setAttribute('aria-expanded', 'false');
    world?.setPaused(!controlsPanel.hidden);
  });

  mapButton.addEventListener('click', () => {
    if (mapPanel.hidden) openMap();
    else closeMap();
  });
  minimapButton.addEventListener('click', openMap);
  container.querySelector('#fallback-map-open')?.addEventListener('click', openMap);
  container.querySelector('#skill-map-close').addEventListener('click', closeMap);
  container.querySelector('#discovery-close').addEventListener('click', closeDiscovery);
  container.querySelector('#badge-board-open').addEventListener('click', () => {
    closeDiscovery();
    if (arrivalPanel.hidden) boardButton.click();
  });
  badgeRelightButton.addEventListener('click', () => {
    if (activeDiscoveryId && !world?.relightBeacon(activeDiscoveryId)) {
      const stillLocked = activeDiscoveryId === 'signal'
        && !['trailhead', 'crossing', 'settlement', 'bones'].every(id => litSignalIds.has(id));
      badgeDesc.textContent = stillLocked
        ? 'The Last Signal needs the first four fires restored. Follow the old roads back to the dark beacons.'
        : 'Move closer to the field beacon to relight it.';
      objectiveText.textContent = stillLocked
        ? 'THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES'
        : 'MOVE CLOSER TO THE FIELD BEACON TO RELIGHT IT';
    }
  });

  controlsButton.addEventListener('click', () => {
    const open = controlsPanel.hidden;
    mapPanel.hidden = true;
    mapButton.setAttribute('aria-expanded', 'false');
    if (started) {
      arrivalPanel.hidden = true;
      boardButton.setAttribute('aria-expanded', 'false');
    }
    controlsPanel.hidden = !open;
    controlsButton.setAttribute('aria-expanded', String(open));
    world?.setPaused(open || !started || !mapPanel.hidden || !arrivalPanel.hidden);
    if (open) container.querySelector('#bruno-controls-close').focus();
  });
  container.querySelector('#bruno-controls-close').addEventListener('click', () => {
    controlsPanel.hidden = true;
    controlsButton.setAttribute('aria-expanded', 'false');
    world?.setPaused(!started || !mapPanel.hidden || !arrivalPanel.hidden);
    controlsButton.focus();
  });

  container.querySelector('#skills-start').addEventListener('click', () => startJourney());

  rallyButton.addEventListener('click', () => {
    rallyActive = !rallyActive;
    if (rallyActive) {
      if (!started) startJourney();
      pendingDestination = null;
      closeDiscovery();
      destinationButtons.forEach(button => button.setAttribute('aria-pressed', 'false'));
      container.querySelectorAll('[data-map-marker]').forEach(marker => marker.classList.remove('is-selected'));
      if (world) world.startRally();
      else rallyStartPending = true;
      objectiveText.textContent = 'RALLY STARTED · FIND THE NEXT GOLD GATE';
    } else {
      world?.stopRally();
      objectiveText.textContent = 'FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD';
    }
    rallyButton.setAttribute('aria-pressed', String(rallyActive));
    rallyButton.querySelector('span').textContent = rallyActive ? 'END RALLY' : 'OPTIONAL RALLY';
  });
  container.querySelector('#map-garage').addEventListener('click', () => {
    if (!started) startJourney();
    closeMap(false);
    openGarage();
  });

  const onGlobalKeyDown = event => {
    if (event.target instanceof HTMLElement && (
      event.target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)
    )) return;
    if (event.code === 'Escape') {
      if (!mapPanel.hidden) closeMap();
      else if (!arrivalPanel.hidden && started) {
        arrivalPanel.hidden = true;
        boardButton.setAttribute('aria-expanded', 'false');
        world?.setPaused(!controlsPanel.hidden);
        boardButton.focus();
      }
      else if (!controlsPanel.hidden) {
        controlsPanel.hidden = true;
        controlsButton.setAttribute('aria-expanded', 'false');
        world?.setPaused(!started || !mapPanel.hidden || !arrivalPanel.hidden);
        controlsButton.focus();
      }
      return;
    }
    if (event.code === 'KeyM' && !event.repeat && garagePanel.hidden) {
      event.preventDefault();
      if (mapPanel.hidden) openMap();
      else closeMap();
    }
  };
  window.addEventListener('keydown', onGlobalKeyDown);

  const revealSceneFallback = () => {
    const canvas = container.querySelector('#bruno-canvas');
    if (canvas) canvas.hidden = true;
    container.querySelector('#bruno-scene-fallback').hidden = false;
    container.classList.add('is-intro');
    arrivalPanel.hidden = false;
    container.querySelector('#skills-start').hidden = true;
  };

  // Initialize Three.js + Cannon-es 3D Engine
  window.setTimeout(() => {
    const canvas = container.querySelector('#bruno-canvas');
    if (!canvas) return;

    import('../skillWorld.js').then(({ SkillWorld }) => {
      world = new SkillWorld(
        canvas,
        discoveredId => showFieldDiscovery(discoveredId),
        ({
          speed,
          pitch,
          roll,
          checkpoint,
          totalCheckpoints,
          complete,
          checkpointDistance,
          checkpointDirection,
          destinationId,
          destinationDistance,
          destinationDirection,
          rallyActive: activeRally,
          rallyElapsedMs,
          rallyBestMs,
          nearbyBeaconId,
          nearbySecretId,
          nearbySettlementTopic,
          nearSkillsBoard,
          settlementTopicCount,
          settlementTopicTotal,
          lowRange,
          offRoad,
          autoDriving,
          position,
          heading,
          elevation,
          worldHour
        }) => {
          const speedValue = container.querySelector('#bruno-speed-value');
          const gearValue = container.querySelector('#bruno-gear-value');
          if (speedValue) speedValue.textContent = String(speed);
          if (gearValue) {
            gearValue.textContent = lowRange ? 'L' : 'H';
            gearValue.setAttribute('aria-label', lowRange ? 'Low range' : 'High range');
          }
          const pitchVal = container.querySelector('#incline-pitch-val');
          const rollVal = container.querySelector('#incline-roll-val');
          if (pitchVal && typeof pitch === 'number') {
            pitchVal.textContent = `${pitch >= 0 ? '+' : ''}${pitch}°`;
            pitchVal.className = 'incline-num ' + (Math.abs(pitch) > 30 ? 'is-danger' : Math.abs(pitch) > 20 ? 'is-warn' : 'is-ok');
          }
          if (rollVal && typeof roll === 'number') {
            rollVal.textContent = `${roll >= 0 ? '+' : ''}${roll}°`;
            rollVal.className = 'incline-num ' + (Math.abs(roll) > 30 ? 'is-danger' : Math.abs(roll) > 20 ? 'is-warn' : 'is-ok');
          }
          container.classList.toggle('is-driving', speed > 0);
          container.classList.toggle('is-off-road', Boolean(offRoad));
          container.classList.toggle('is-auto-driving', Boolean(autoDriving));
          container.dataset.gear = lowRange ? 'L' : 'H';
          updateMapPlayer(position, heading, elevation);
          if (position) {
            const region = regionAtWorldPosition(position.x, position.z);
            sound.setWorldRegion(region, speed / 3.6);
            const regionNames = {
              lowlands: 'LOWLANDS',
              riverlands: 'RIVERLANDS',
              ashen: 'ASHEN VALE',
              fossil: 'FOSSIL RIDGE',
              signal: 'SIGNAL RANGE',
              highPass: 'HIGH PASS',
              motorYard: 'MOTOR YARD'
            };
            if (mapReadout) {
              const point = worldToMap(position.x, position.z);
              mapReadout.textContent = `${regionNames[region]} · MAP ${Math.round(point.x)}, ${Math.round(point.y)} · ${Math.round(elevation ?? 0)} M`;
            }
            if (Number.isFinite(worldHour)) {
              const phase = worldHour >= 20 || worldHour < 6 ? 'night' : 'day';
              mapSvg.dataset.timePhase = phase;
              minimapSvg.dataset.timePhase = phase;
            }
          }
          if (Number.isFinite(checkpoint) && Number.isFinite(totalCheckpoints)) {
            const destination = FIELD_DESTINATIONS.find(item => item.id === destinationId);
            const objective = allSignalsLit
              ? 'ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN'
              : nearbySecretId
                ? `HIDDEN PLACE · STOP AND PRESS E · ${FIELD_SECRET_NOTES[nearbySecretId]?.title.toUpperCase()}`
                : nearbySettlementTopic
                  ? `ASHEN SETTLEMENT · STOP AND PRESS E · ${nearbySettlementTopic.title.toUpperCase()}`
                  : nearSkillsBoard
                    ? speed > 8
                      ? 'TRAILHEAD BOARD · STOP THE CAR TO BROWSE SIX SKILLS'
                      : 'TRAILHEAD BOARD · PRESS E TO BROWSE SIX SKILLS'
                    : nearbyBeaconId === 'settlement'
                    && settlementTopicCount < settlementTopicTotal
                    ? `SETTLEMENT SIGNAL SEALED · LIGHT THE HOUSE LAMPS ${settlementTopicCount}/${settlementTopicTotal}`
              : nearbyBeaconId && !litSignalIds.has(nearbyBeaconId)
                ? nearbyBeaconId === 'signal'
                  && !['trailhead', 'crossing', 'settlement', 'bones'].every(id => litSignalIds.has(id))
                  ? 'THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES'
                  : `SIGNAL READY · PRESS E TO RELIGHT ${FIELD_DESTINATIONS.find(item => item.id === nearbyBeaconId)?.title.toUpperCase()}`
              : destination
              ? destinationDistance <= 7
                ? `FIELD NOTE · ${destination.title.toUpperCase()}`
                : `ROUTE TO ${destination.title.toUpperCase()} · ${destinationDirection || 'FOLLOW'} ${destinationDistance ?? ''}M`
              : destinationId === 'garage'
                ? `MOTOR WORKS · ${destinationDistance <= 12 ? 'ENTERING GARAGE' : `${destinationDirection || 'FIND'} ${destinationDistance ?? ''}M`}`
                : activeRally
                  ? complete
                    ? `RALLY COMPLETE · ${formatRallyTime(rallyElapsedMs)} · BEST ${formatRallyTime(rallyBestMs)}`
                    : `RALLY · ${Math.min(checkpoint, totalCheckpoints)}/${totalCheckpoints} · ${formatRallyTime(rallyElapsedMs)} · ${checkpointDirection || 'FIND'} ${checkpointDistance ?? ''}M`
                  : 'FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD';
            objectiveText.textContent = objective;
          }
          if (typeof activeRally === 'boolean' && rallyActive !== activeRally) {
            rallyActive = activeRally;
            rallyButton.setAttribute('aria-pressed', String(activeRally));
            rallyButton.querySelector('span').textContent = activeRally ? 'END RALLY' : 'OPTIONAL RALLY';
          }
        },
        (garageOpen, build) => {
          garagePanel.hidden = !garageOpen;
          minimapButton.hidden = garageOpen || !started;
          syncBuildControls(build);
          container.querySelector(garageOpen ? '#garage-close' : '#bruno-btn-garage')?.focus();
        },
        (signals, total) => {
          const wasAllSignalsLit = allSignalsLit;
          litSignalIds = new Set(signals);
          allSignalsLit = signals.length === total;
          garageSignalLivery.querySelectorAll('[data-signal-unlock]').forEach(option => {
            option.disabled = !litSignalIds.has(option.dataset.signalUnlock);
          });
          updateMapSignalState();
          if (signalCount) signalCount.textContent = String(signals.length);
          if (activeDiscoveryId && litSignalIds.has(activeDiscoveryId)) {
            badgeRelightButton.hidden = true;
            badgeDesc.textContent = `Signal restored. ${FIELD_STORY_FRAGMENTS[activeDiscoveryId]}`;
            badgeTransmitLink.hidden = !allSignalsLit;
          }
          try {
            window.localStorage.setItem(SIGNAL_PROGRESS_STORAGE_KEY, JSON.stringify(signals));
          } catch (error) {
            console.error('Failed to save Signal Ridge beacon progress:', error);
          }
          if (allSignalsLit) objectiveText.textContent = 'ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN';
          if (allSignalsLit && !wasAllSignalsLit) showFieldDiscovery('signal');
        },
        savedSignals,
        showSecretDiscovery,
        savedSecrets,
        topic => {
          if (!savedSettlementTopics.includes(topic.id)) {
            savedSettlementTopics.push(topic.id);
            try {
              window.localStorage.setItem(
                SETTLEMENT_PROGRESS_STORAGE_KEY,
                JSON.stringify(savedSettlementTopics)
              );
            } catch (error) {
              console.error('Failed to save Ashen Settlement house progress:', error);
            }
          }
          showSettlementTopic(topic);
        },
        SETTLEMENT_TOPICS,
        savedSettlementTopics,
        openSkillsBoard
      );

      canvas._world = world;
      world.setGarageStyle(garageStyleSelect.value);
      world.setReducedMotion(reducedMotion);
      if (!container.isConnected) {
        world.dispose();
        window.removeEventListener('keydown', onGlobalKeyDown);
        observer.disconnect();
        return;
      }
      pendingVehicleBuild = world.setVehicleBuild(pendingVehicleBuild);
      syncBuildControls(pendingVehicleBuild);
      world.setPaused(!started || !mapPanel.hidden || !controlsPanel.hidden || !arrivalPanel.hidden);
      if (pendingDestination) world.setDestination(pendingDestination);
      if (pendingGarageTravel) {
        pendingGarageTravel = false;
        world.travelToGarage();
      }
      if (rallyStartPending) {
        world.startRally();
        rallyStartPending = false;
      }

      // Bind Horn & Reset buttons
      container.querySelector('#bruno-btn-horn')?.addEventListener('click', () => {
        world.honk();
      });
      container.querySelector('#bruno-btn-reset')?.addEventListener('click', () => {
        world.resetVehicle();
      });
      container.querySelector('#bruno-btn-garage')?.addEventListener('click', openGarage);
      container.querySelector('#garage-close')?.addEventListener('click', () => world.exitGarage());
      container.querySelector('#garage-drive')?.addEventListener('click', () => world.exitGarage());

      const applyBuild = () => {
        const nextBuild = { ...world.getVehicleBuild() };
        buildInputs.forEach(input => {
          nextBuild[input.dataset.build] = input.type === 'range'
            ? Number(input.value)
            : input.value;
        });
        pendingVehicleBuild = world.setVehicleBuild(nextBuild);
        syncBuildControls(pendingVehicleBuild);
        try {
          window.localStorage.setItem(VEHICLE_BUILD_STORAGE_KEY, JSON.stringify(pendingVehicleBuild));
          garageStatus.textContent = 'BUILD SAVED LOCALLY';
        } catch (error) {
          garageStatus.textContent = 'BUILD NOT SAVED';
          console.error('Failed to save the Signal Ridge vehicle build:', error);
        }
      };
      buildInputs.forEach(input => input.addEventListener('input', applyBuild));
      garageSignalLivery.addEventListener('change', () => {
        const livery = SIGNAL_LIVERIES.find(({ id }) => id === garageSignalLivery.value);
        if (!livery || !litSignalIds.has(livery.id)) return;
        const paintInput = container.querySelector('[data-build="paint"]');
        paintInput.value = livery.paint;
        paintInput.dispatchEvent(new Event('input', { bubbles: true }));
      });
      container.querySelector('#garage-reset')?.addEventListener('click', () => {
        pendingVehicleBuild = world.setVehicleBuild(DEFAULT_VEHICLE_BUILD);
        syncBuildControls(pendingVehicleBuild);
        try {
          window.localStorage.setItem(VEHICLE_BUILD_STORAGE_KEY, JSON.stringify(pendingVehicleBuild));
          garageStatus.textContent = 'STOCK BUILD RESTORED';
        } catch (error) {
          garageStatus.textContent = 'BUILD NOT SAVED';
          console.error('Failed to save the restored Signal Ridge vehicle build:', error);
        }
      });

      // Bind Touch Buttons
      const touchBtns = container.querySelectorAll('[data-key]');
      touchBtns.forEach(btn => {
        const keyName = btn.dataset.key;
        const press = (e) => {
          e.preventDefault();
          if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
          if (world?.keys && keyName in world.keys) world.keys[keyName] = true;
          if (world?.carBody) world.carBody.wakeUp();
        };
        const release = (e) => {
          e.preventDefault();
          if (world?.keys && keyName in world.keys) world.keys[keyName] = false;
        };

        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointerleave', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('lostpointercapture', release);
      });
    }).catch(err => {
      revealSceneFallback();
      console.error('Failed to load SkillWorld engine:', err);
    });

    const observer = new MutationObserver(() => {
      if (!container.isConnected) {
        canvas._world?.dispose();
        window.removeEventListener('keydown', onGlobalKeyDown);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }, 0);

  return container;
}
