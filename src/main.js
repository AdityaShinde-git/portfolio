import { WindowManager } from './js/windowManager.js';
import { TerminalEngine } from './js/terminalEngine.js';
import { ControlCenter } from './js/controlCenter.js';
import { SVG_ICONS } from './js/svgIcons.js';
import { sound } from './js/soundEngine.js';

import { createResumeAppContent } from './js/apps/resumeApp.js';
import { createProjectsAppContent } from './js/apps/projectsApp.js';
import { createSkillsAppContent } from './js/apps/skillsApp.js';
import { createContactAppContent } from './js/apps/contactApp.js';

function initHomeMotion() {
  const stage = document.getElementById('home-stage');
  if (!stage) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const shouldReduceMotion = () => document.body.dataset.reducedMotion === 'true'
    || (document.body.dataset.motionPreference !== 'standard' && reducedMotionQuery.matches);
  const cards = stage.querySelectorAll('.home-stat-card');
  let pointerFrame = 0;
  let pendingPointer = null;

  const resetPointer = () => {
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    pendingPointer = null;
    stage.style.setProperty('--pointer-x', '68%');
    stage.style.setProperty('--pointer-y', '50%');
    stage.style.setProperty('--atmosphere-x', '0px');
    stage.style.setProperty('--atmosphere-y', '0px');
    cards.forEach(card => {
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--card-light-x', '50%');
      card.style.setProperty('--card-light-y', '50%');
    });
  };

  document.addEventListener('pointermove', event => {
    if (shouldReduceMotion() || event.pointerType === 'touch') return;
    const target = event.target instanceof Element ? event.target : null;
    const eventBounds = stage.getBoundingClientRect();
    const insideStage = event.clientX >= eventBounds.left && event.clientX <= eventBounds.right
      && event.clientY >= eventBounds.top && event.clientY <= eventBounds.bottom;
    const overInterface = target?.closest('.os-top-bar, .desktop-icons-container, .os-dock-container, .os-window, .control-center-modal');
    if (!insideStage || overInterface) {
      resetPointer();
      return;
    }

    pendingPointer = { x: event.clientX, y: event.clientY, target: event.target };
    if (pointerFrame) return;

    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!pendingPointer) return;
      const pointer = pendingPointer;

      const bounds = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (pointer.x - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (pointer.y - bounds.top) / bounds.height));
      stage.style.setProperty('--pointer-x', `${(x * 100).toFixed(1)}%`);
      stage.style.setProperty('--pointer-y', `${(y * 100).toFixed(1)}%`);
      stage.style.setProperty('--atmosphere-x', `${((x - 0.5) * 24).toFixed(1)}px`);
      stage.style.setProperty('--atmosphere-y', `${((y - 0.5) * 18).toFixed(1)}px`);

      const card = pointer.target.closest('.home-stat-card');
      cards.forEach(item => {
        if (item === card) return;
        item.style.setProperty('--tilt-x', '0deg');
        item.style.setProperty('--tilt-y', '0deg');
        item.style.setProperty('--card-light-x', '50%');
        item.style.setProperty('--card-light-y', '50%');
      });
      if (card) {
        const cardBounds = card.getBoundingClientRect();
        const cardX = Math.max(0, Math.min(1, (pointer.x - cardBounds.left) / cardBounds.width));
        const cardY = Math.max(0, Math.min(1, (pointer.y - cardBounds.top) / cardBounds.height));
        card.style.setProperty('--tilt-x', `${((cardX - 0.5) * 4).toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${((0.5 - cardY) * 4).toFixed(2)}deg`);
        card.style.setProperty('--card-light-x', `${(cardX * 100).toFixed(1)}%`);
        card.style.setProperty('--card-light-y', `${(cardY * 100).toFixed(1)}%`);
      }
      pendingPointer = null;
    });
  });

  window.addEventListener('blur', resetPointer);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) resetPointer();
  });
  reducedMotionQuery.addEventListener?.('change', event => {
    if (event.matches) resetPointer();
  });

  requestAnimationFrame(() => stage.classList.add('home-motion-ready'));
}

// Keep the entry transition brief and truthful; the WebGL scenes load on demand.
(function initLoader() {
  const loader = document.getElementById('site-loader');
  const statusEl = document.getElementById('loader-status-text');
  if (!loader) return;

  if (statusEl) statusEl.textContent = 'PORTFOLIO READY';
  window.addEventListener('DOMContentLoaded', () => {
    window.setTimeout(() => {
      loader.classList.add('hidden');
      window.setTimeout(() => loader.remove(), 700);
    }, 180);
  }, { once: true });
})();

document.addEventListener('DOMContentLoaded', () => {
  const desktop = document.getElementById('os-desktop');
  const dockContainer = document.getElementById('os-dock-container') || document.querySelector('.os-dock-container');
  const threeCanvasContainer = document.getElementById('three-canvas-container');

  initHomeMotion();

  // 1. Initialize Window Manager
  const wm = new WindowManager(desktop, dockContainer);

  let threeBg = null;
  const scenePreferences = {
    isEnabled: () => Boolean(threeBg && threeBg.isEnabled),
    async setEnabled(enabled) {
      if (!enabled) {
        if (threeBg) threeBg.setEnabled(false);
        return;
      }
      if (!threeBg) {
        const { ThreeBackground } = await import('./js/threeBackground.js');
        threeBg = new ThreeBackground(threeCanvasContainer);
      } else {
        threeBg.setEnabled(true);
      }
    }
  };

  // 2. Initialize Control Center & Spotlight Search
  const controlCenter = new ControlCenter(desktop, scenePreferences);

  // App Launcher Registry
  const appsRegistry = {
    terminal: {
      title: 'Portfolio console',
      iconSvg: SVG_ICONS.terminal,
      width: 860,
      height: 540,
      isTerminal: true,
      createContent: () => {
        const div = document.createElement('div');
        div.style.height = '100%';
        setTimeout(() => {
          new TerminalEngine(div, wm);
        }, 0);
        return div;
      }
    },
    resume: {
      title: 'Aditya Shinde — Career profile',
      iconSvg: SVG_ICONS.resume,
      width: 1240,
      height: 760,
      createContent: createResumeAppContent
    },
    projects: {
      title: 'Selected projects — Aditya Shinde',
      iconSvg: SVG_ICONS.projects,
      width: 1320,
      height: 780,
      createContent: projectId => createProjectsAppContent(projectId)
    },
    skills: {
      title: 'Engineering map — Skills in context',
      iconSvg: SVG_ICONS.skills,
      width: 1240,
      height: 760,
      createContent: createSkillsAppContent
    },
    contact: {
      title: 'Contact — Aditya Shinde',
      iconSvg: SVG_ICONS.contact,
      width: 1240,
      height: 760,
      createContent: createContactAppContent
    }
  };

  const routeForApp = {
    projects: 'work',
    resume: 'resume',
    skills: 'skills',
    contact: 'contact'
  };
  const appForRoute = Object.fromEntries(
    Object.entries(routeForApp).map(([app, route]) => [route, app])
  );

  const shortcuts = [
    ['projects', 'Work'],
    ['skills', 'Skills'],
    ['resume', 'Resume'],
    ['contact', 'Contact'],
    ['terminal', 'Terminal']
  ];
  const desktopShortcuts = document.getElementById('desktop-app-shortcuts');
  const dockShortcuts = document.getElementById('dock-app-shortcuts');
  shortcuts.forEach(([key, label]) => {
    const app = appsRegistry[key];
    if (!app) return;
    const shortcut = document.createElement('button');
    shortcut.type = 'button';
    shortcut.className = 'desktop-icon-item';
    shortcut.dataset.launchApp = key;
    shortcut.setAttribute('aria-label', `Open ${label}`);
    shortcut.innerHTML = `<span class="icon-svg-wrap">${app.iconSvg}</span><span class="icon-label">${label}</span>`;
    desktopShortcuts.appendChild(shortcut);

    const dockItem = document.createElement('button');
    dockItem.type = 'button';
    dockItem.className = 'dock-item';
    dockItem.dataset.launchApp = key;
    dockItem.title = `Open ${label}`;
    dockItem.setAttribute('aria-label', `Open ${label}`);
    dockItem.innerHTML = `${app.iconSvg}<span class="dock-tooltip">${label}</span>`;
    dockShortcuts.appendChild(dockItem);
  });

  const clock = document.getElementById('system-clock');
  const updateClock = () => {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(now);
  };
  updateClock();
  setInterval(updateClock, 30_000);

  // Helper to open app by string key
  function openAppByName(name, updateRoute = true, replaceExperience = false, projectId = '') {
    const requestedKey = name.toLowerCase().trim();
    const key = requestedKey === 'work' ? 'projects' : requestedKey;

    if (key === 'control-center' || key === 'settings') {
      controlCenter.toggle();
      return;
    }

    if (appsRegistry[key]) {
      if (replaceExperience) {
        Object.keys(routeForApp).forEach(app => {
          if (app !== key) wm.closeWindow(app);
        });
      }
      if (updateRoute && routeForApp[key]) {
        const route = `#${routeForApp[key]}`;
        if (window.location.hash !== route) window.history.pushState(null, '', route);
      }
      const cfg = appsRegistry[key];
      const existingWindow = wm.windows.get(key);
      if (key === 'projects' && projectId && existingWindow) {
        existingWindow.element.querySelector('.study-experience')?.navigateToProject(projectId);
      }
      wm.createWindow({
        id: key,
        title: cfg.title,
        iconSvg: cfg.iconSvg,
        content: cfg.createContent(projectId),
        width: cfg.width,
        height: cfg.height,
        isTerminal: !!cfg.isTerminal
      });
    }
  }

  window.openAppByName = openAppByName;

  function returnHome(updateRoute = true) {
    Object.keys(routeForApp).forEach(app => wm.closeWindow(app));
    if (updateRoute && window.location.hash !== '#home') {
      window.history.pushState(null, '', '#home');
    }
  }

  function openRouteFromHash() {
    const route = window.location.hash.slice(1).split('/')[0].toLowerCase();
    if (!route || route === 'home') {
      returnHome(false);
      return;
    }
    const app = appForRoute[route];
    if (app) openAppByName(app, false, true);
  }

  window.addEventListener('hashchange', openRouteFromHash);
  wm.onWindowClosed = id => {
    const route = routeForApp[id];
    if (route && window.location.hash === `#${route}`) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  desktop.addEventListener('click', event => {
    const launcher = event.target.closest('[data-launch-app]');
    if (launcher) {
      const isDock = Boolean(launcher.closest('.os-dock-container'));
      const appKey = launcher.dataset.launchApp;
      if (isDock && wm.windows.has(appKey)) {
        const win = wm.windows.get(appKey);
        if (win.isMinimized) {
          wm.restoreWindow(appKey);
        } else if (wm.activeWindow === appKey) {
          wm.minimizeWindow(appKey);
        } else {
          wm.focusWindow(appKey);
        }
        return;
      }
      openAppByName(
        launcher.dataset.launchApp,
        true,
        false,
        launcher.dataset.projectTarget || ''
      );
      return;
    }
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    event.preventDefault();
    const destination = link.dataset.portfolioRoute || link.getAttribute('href').slice(1);
    if (destination === 'home') {
      returnHome();
    } else {
      openAppByName(destination, true, true);
    }
  });

  // Bind Top Bar Items
  document.getElementById('top-control-center-btn')?.addEventListener('click', returnHome);
  document.getElementById('top-spotlight-trigger')?.addEventListener('click', () => controlCenter.open());
  document.getElementById('top-open-terminal')?.addEventListener('click', () => openAppByName('terminal'));
  document.getElementById('top-open-projects')?.addEventListener('click', () => openAppByName('projects', true, true));
  document.getElementById('top-open-resume')?.addEventListener('click', () => openAppByName('resume', true, true));
  document.getElementById('top-open-skills')?.addEventListener('click', () => openAppByName('skills', true, true));
  document.getElementById('top-recruit-btn')?.addEventListener('click', () => openAppByName('contact', true, true));

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K for Spotlight
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      controlCenter.toggle();
    }
  });

  openRouteFromHash();
});
