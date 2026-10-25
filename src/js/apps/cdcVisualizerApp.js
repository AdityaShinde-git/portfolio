import { sound } from '../soundEngine.js';

export function createCDCVisualizerContent() {
  const container = document.createElement('div');
  container.className = 'app-cdc-container';

  container.innerHTML = `
    <div class="cdc-header">
      <div class="cdc-title">
        <span class="cdc-icon">⚡</span>
        <div>
          <h3>Rust CDC Real-Time Data Pipeline Visualizer</h3>
          <p>Live simulation of Rust async stream processing PostgreSQL WAL transaction logs</p>
        </div>
      </div>
      <div class="cdc-controls">
        <button class="btn-primary-glow" id="cdc-trigger-event">➕ Produce WAL Change Event</button>
        <button class="btn-secondary-glass" id="cdc-toggle-stream">▶ Play / Pause Stream</button>
      </div>
    </div>

    <div class="cdc-pipeline-wrapper">
      <!-- Node 1: Source Postgres DB -->
      <div class="cdc-node node-postgres">
        <div class="node-badge">SOURCE DB</div>
        <div class="node-title">PostgreSQL (Primary)</div>
        <div class="node-metric">WAL LSN: <span id="wal-lsn">0/1A94B20</span></div>
        <div class="node-sub">Write-Ahead-Log Enabled</div>
      </div>

      <!-- Arrow 1 -->
      <div class="cdc-arrow">
        <div class="arrow-line"></div>
        <div class="particle-container" id="stream-p1"></div>
        <span class="arrow-label">Binary Log Stream</span>
      </div>

      <!-- Node 2: Rust Engine -->
      <div class="cdc-node node-rust">
        <div class="node-badge rust-badge">RUST ENGINE</div>
        <div class="node-title">Rust Async CDC Worker</div>
        <div class="node-metric">Latency: <span id="rust-latency">1.2 µs</span></div>
        <div class="node-sub">tokio + async_std + serde</div>
      </div>

      <!-- Arrow 2 -->
      <div class="cdc-arrow">
        <div class="arrow-line"></div>
        <div class="particle-container" id="stream-p2"></div>
        <span class="arrow-label">Mapped JSON Payload</span>
      </div>

      <!-- Node 3: Target Replica DB -->
      <div class="cdc-node node-mysql">
        <div class="node-badge">TARGET REPLICA</div>
        <div class="node-title">MySQL / Data Warehouse</div>
        <div class="node-metric">Sync Status: <span class="text-green">100% Synced</span></div>
        <div class="node-sub">Zero-Data-Loss Guaranteed</div>
      </div>
    </div>

    <div class="cdc-log-panel">
      <div class="log-panel-header">
        <span>📋 CDC Transaction Audit Stream</span>
        <span class="log-count" id="log-count">Total Events Processed: 0</span>
      </div>
      <div class="log-stream-body" id="log-stream-body">
        <div class="log-entry log-system">[SYSTEM] CDC Pipeline initialized. Listening for PostgreSQL WAL events...</div>
      </div>
    </div>
  `;

  // Pipeline animation logic
  setTimeout(() => {
    setupCDCEvents(container);
  }, 0);

  return container;
}

function setupCDCEvents(container) {
  const triggerBtn = container.querySelector('#cdc-trigger-event');
  const toggleBtn = container.querySelector('#cdc-toggle-stream');
  const p1 = container.querySelector('#stream-p1');
  const p2 = container.querySelector('#stream-p2');
  const logBody = container.querySelector('#log-stream-body');
  const lsnEl = container.querySelector('#wal-lsn');
  const countEl = container.querySelector('#log-count');

  let isAutoStreaming = true;
  let eventCount = 0;
  let timerId = null;

  const sampleTables = ['users', 'orders', 'audit_logs', 'payments', 'inventory', 'module_updates'];
  const sampleOps = ['INSERT', 'UPDATE', 'DELETE'];

  function produceEvent() {
    eventCount++;
    sound.playKeySound();

    const table = sampleTables[Math.floor(Math.random() * sampleTables.length)];
    const op = sampleOps[Math.floor(Math.random() * sampleOps.length)];
    const id = Math.floor(1000 + Math.random() * 9000);
    const lsnHex = (0x1A94B20 + eventCount * 0x80).toString(16).toUpperCase();

    lsnEl.textContent = `0/${lsnHex}`;
    countEl.textContent = `Total Events Processed: ${eventCount}`;

    // Spawn Particles
    const particle1 = document.createElement('div');
    particle1.className = 'cdc-particle p-blue';
    p1.appendChild(particle1);
    setTimeout(() => particle1.remove(), 800);

    setTimeout(() => {
      const particle2 = document.createElement('div');
      particle2.className = 'cdc-particle p-green';
      p2.appendChild(particle2);
      setTimeout(() => particle2.remove(), 800);
    }, 400);

    // Append log
    const entry = document.createElement('div');
    entry.className = `log-entry ${op === 'INSERT' ? 'log-ins' : op === 'UPDATE' ? 'log-upd' : 'log-del'}`;
    const timestamp = new Date().toISOString().substring(11, 23);
    entry.innerHTML = `
      <span class="log-time">[${timestamp}]</span>
      <span class="log-op">[${op}]</span>
      <span class="log-msg">table=<b>${table}</b> pk_id=<b>${id}</b> lsn=0/${lsnHex} latency=1.${Math.floor(1 + Math.random()*8)}µs status=COMMITTED</span>
    `;

    logBody.prepend(entry);
    if (logBody.children.length > 30) {
      logBody.removeChild(logBody.lastChild);
    }
  }

  triggerBtn.addEventListener('click', produceEvent);

  toggleBtn.addEventListener('click', () => {
    isAutoStreaming = !isAutoStreaming;
    toggleBtn.textContent = isAutoStreaming ? '⏸ Pause Stream' : '▶ Play Stream';
    if (isAutoStreaming) {
      startAutoStream();
    } else {
      clearInterval(timerId);
    }
  });

  function startAutoStream() {
    clearInterval(timerId);
    timerId = setInterval(() => {
      if (isAutoStreaming) produceEvent();
    }, 1800);
  }

  startAutoStream();
}
