import { sound } from './soundEngine.js';
import { SVG_ICONS } from './svgIcons.js';

export class WindowManager {
  constructor(desktopElement, dockElement) {
    this.desktop = desktopElement;
    this.dock = dockElement?.classList?.contains('os-dock-container')
      ? dockElement
      : (dockElement?.closest?.('.os-dock-container') || document.querySelector('.os-dock-container'));
    this.windows = new Map();
    this.activeWindow = null;
    this.highestZIndex = 100;
    this.cascadeOffset = 0;
    window.addEventListener('resize', () => this.constrainWindowsToViewport());
  }

  createWindow({ id, title, iconSvg, content, width = 850, height = 580, isTerminal = false }) {
    if (this.windows.has(id)) {
      const existingWindow = this.windows.get(id);
      if (existingWindow.closeTimer !== null) {
        clearTimeout(existingWindow.closeTimer);
        existingWindow.closeTimer = null;
        existingWindow.element.classList.remove('is-closing');
      }
      this.focusWindow(id);
      this.restoreWindow(id);
      return existingWindow;
    }

    const windowEl = document.createElement('div');
    const portfolioApp = ['projects', 'resume', 'skills', 'contact'].includes(id);
    const immersiveApp = id === 'projects' || id === 'skills';
    windowEl.className = `os-window ${isTerminal ? 'terminal-window-style' : ''} ${portfolioApp ? 'portfolio-workspace' : ''} ${immersiveApp ? 'portfolio-immersive-workspace' : ''}`;
    windowEl.id = `win-${id}`;

    // Calculate position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let calcWidth = Math.min(width, viewportWidth - 32);
    let calcHeight = Math.min(height, viewportHeight - 100);

    let left;
    let top;
    if (immersiveApp) {
      calcWidth = viewportWidth;
      calcHeight = viewportHeight;
      left = 0;
      top = 0;
    } else {
      left = Math.max(20, Math.floor((viewportWidth - calcWidth) / 2) + this.cascadeOffset);
      top = Math.max(40, Math.floor((viewportHeight - calcHeight) / 2 - 20) + this.cascadeOffset);
      this.cascadeOffset = (this.cascadeOffset + 24) % 120;
    }

    windowEl.style.width = `${calcWidth}px`;
    windowEl.style.height = `${calcHeight}px`;
    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;

    this.highestZIndex += 1;
    windowEl.style.zIndex = this.highestZIndex;

    windowEl.innerHTML = `
      <div class="window-header">
        <div class="window-controls">
          <button class="win-btn win-close" title="Close Window" data-action="close">
            <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" stroke-width="3" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <button class="win-btn win-minimize" title="Minimize to Dock" data-action="minimize">
            <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" stroke-width="3" fill="none"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
          <button class="win-btn win-maximize" title="Maximize / Restore" data-action="maximize">
            <svg viewBox="0 0 24 24" width="8" height="8" stroke="currentColor" stroke-width="3" fill="none"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>
          </button>
        </div>

        <div class="window-title">
          <span class="window-title-icon">${iconSvg || ''}</span>
          <span class="window-title-text">${title}</span>
        </div>

        <div class="window-utility-bar">
          <button class="utility-btn" title="Snap Left (50%)" data-action="snap-left">
            ${SVG_ICONS.snapLeft}
          </button>
          <button class="utility-btn" title="Snap Right (50%)" data-action="snap-right">
            ${SVG_ICONS.snapRight}
          </button>
        </div>
      </div>

      <div class="window-body">
        ${typeof content === 'string' ? content : ''}
      </div>

      <div class="window-resize-handle"></div>
    `;

    if (typeof content !== 'string' && content instanceof HTMLElement) {
      windowEl.querySelector('.window-body').appendChild(content);
    }

    this.desktop.appendChild(windowEl);

    const winObj = {
      id,
      title,
      iconSvg,
      element: windowEl,
      preferredWidth: width,
      preferredHeight: height,
      isMaximized: false,
      isMinimized: false,
      closeTimer: null,
      prevBounds: null
    };

    this.windows.set(id, winObj);

    // Setup Listeners
    this.setupWindowEvents(winObj);

    this.focusWindow(id);
    this.updateDockState();
    sound.playWindowOpen();

    return winObj;
  }

  constrainWindowsToViewport() {
    this.windows.forEach(win => {
      const { element } = win;
      if (win.isMaximized || element.style.width.startsWith('calc(')) return;

      const width = Math.min(win.preferredWidth, window.innerWidth - 16);
      const height = Math.min(win.preferredHeight, window.innerHeight - 80);
      const isImmersive = element.classList.contains('portfolio-immersive-workspace');
      const left = isImmersive
        ? Math.max(8, Math.floor((window.innerWidth - width) / 2))
        : Math.min(Math.max(8, parseFloat(element.style.left) || 0), window.innerWidth - width - 8);
      const top = isImmersive
        ? Math.max(36, Math.floor((window.innerHeight - height) / 2 - 20))
        : Math.min(Math.max(36, parseFloat(element.style.top) || 0), window.innerHeight - height - 44);

      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
    });
  }

  setupWindowEvents(winObj) {
    const { id, element } = winObj;
    const header = element.querySelector('.window-header');

    // Focus on click inside
    element.addEventListener('mousedown', () => this.focusWindow(id));

    // Header buttons
    header.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;

      if (action === 'close') this.closeWindow(id);
      if (action === 'minimize') this.minimizeWindow(id);
      if (action === 'maximize') this.toggleMaximize(id);
      if (action === 'snap-left') this.snapWindow(id, 'left');
      if (action === 'snap-right') this.snapWindow(id, 'right');
    });

    // Double click header to maximize
    header.addEventListener('dblclick', (e) => {
      if (!e.target.closest('button')) {
        this.toggleMaximize(id);
      }
    });

    // Window Dragging Logic
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    const onMouseDown = (e) => {
      if (e.target.closest('button') || winObj.isMaximized) return;
      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      initialLeft = parseInt(element.style.left, 10) || 0;
      initialTop = parseInt(element.style.top, 10) || 0;

      element.classList.add('is-dragging');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onMouseMove);
      document.addEventListener('touchend', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const deltaX = clientX - startX;
      const deltaY = clientY - startY;

      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;

      // Keep within bounds
      newTop = Math.max(34, newTop); // below top bar
      newLeft = Math.max(-element.offsetWidth + 80, Math.min(newLeft, window.innerWidth - 80));

      element.style.left = `${newLeft}px`;
      element.style.top = `${newTop}px`;
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      element.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onMouseMove);
      document.removeEventListener('touchend', onMouseUp);
    };

    header.addEventListener('mousedown', onMouseDown);
    header.addEventListener('touchstart', onMouseDown, { passive: true });

    // Resizing Logic
    const resizeHandle = element.querySelector('.window-resize-handle');
    let isResizing = false;
    let startW, startH;

    const onResizeDown = (e) => {
      if (winObj.isMaximized) return;
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = element.offsetWidth;
      startH = element.offsetHeight;

      document.addEventListener('mousemove', onResizeMove);
      document.addEventListener('mouseup', onResizeUp);
    };

    const onResizeMove = (e) => {
      if (!isResizing) return;
      const newW = Math.max(360, startW + (e.clientX - startX));
      const newH = Math.max(260, startH + (e.clientY - startY));
      element.style.width = `${newW}px`;
      element.style.height = `${newH}px`;
    };

    const onResizeUp = () => {
      isResizing = false;
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeUp);
    };

    resizeHandle.addEventListener('mousedown', onResizeDown);
  }

  snapWindow(id, direction) {
    const win = this.windows.get(id);
    if (!win) return;

    win.element.style.top = '36px';
    win.element.style.height = 'calc(100vh - 100px)';
    win.element.style.width = 'calc(50vw - 12px)';

    if (direction === 'left') {
      win.element.style.left = '6px';
    } else {
      win.element.style.left = '50vw';
    }
  }

  focusWindow(id) {
    const win = this.windows.get(id);
    if (!win || win.element.classList.contains('is-closing')) return;

    this.highestZIndex += 1;
    win.element.style.zIndex = this.highestZIndex;

    this.windows.forEach((w) => {
      w.element.classList.remove('active-window');
    });
    win.element.classList.add('active-window');
    this.activeWindow = id;
    this.updateImmersiveState();

    this.updateDockState();
  }

  toggleMaximize(id) {
    const win = this.windows.get(id);
    if (!win) return;

    if (win.isMaximized) {
      win.element.style.width = `${win.prevBounds.width}px`;
      win.element.style.height = `${win.prevBounds.height}px`;
      win.element.style.left = `${win.prevBounds.left}px`;
      win.element.style.top = `${win.prevBounds.top}px`;
      win.element.classList.remove('is-maximized');
      win.isMaximized = false;
    } else {
      win.prevBounds = {
        width: win.element.offsetWidth,
        height: win.element.offsetHeight,
        left: parseInt(win.element.style.left, 10),
        top: parseInt(win.element.style.top, 10)
      };

      win.element.style.left = '0px';
      win.element.style.top = '36px';
      win.element.style.width = '100vw';
      win.element.style.height = 'calc(100vh - 96px)';
      win.element.classList.add('is-maximized');
      win.isMaximized = true;
    }
  }

  minimizeWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.element.classList.add('is-minimized');
    win.isMinimized = true;

    if (this.activeWindow === id) {
      const nextWindow = [...this.windows.values()]
        .filter(candidate => candidate.id !== id && !candidate.isMinimized && !candidate.element.classList.contains('is-closing'))
        .sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];
      this.activeWindow = nextWindow ? nextWindow.id : null;
    }

    this.updateImmersiveState();
    this.updateDockState();
    sound.playWindowClose();
  }

  restoreWindow(id) {
    const win = this.windows.get(id);
    if (!win) return;

    win.element.classList.remove('is-minimized');
    win.isMinimized = false;
    this.focusWindow(id);
  }

  closeWindow(id) {
    const win = this.windows.get(id);
    if (!win || win.element.classList.contains('is-closing')) return;

    win.element.classList.add('is-closing');
    sound.playWindowClose();

    win.closeTimer = setTimeout(() => {
      win.closeTimer = null;
      if (this.windows.get(id) !== win) return;
      if (win.element.parentNode) {
        win.element.parentNode.removeChild(win.element);
      }
      this.windows.delete(id);
      this.updateDockState();
      if (this.onWindowClosed) this.onWindowClosed(id);

      if (this.activeWindow === id) {
        const nextWindow = [...this.windows.values()]
          .filter(candidate => !candidate.isMinimized && !candidate.element.classList.contains('is-closing'))
          .sort((a, b) => Number(b.element.style.zIndex) - Number(a.element.style.zIndex))[0];

        if (nextWindow) {
          this.focusWindow(nextWindow.id);
        } else {
          this.activeWindow = null;
        }
      }
      this.updateImmersiveState();
      this.updateDockState();
    }, 200);
  }

  updateImmersiveState() {
    const activeWindow = this.activeWindow && this.windows.get(this.activeWindow);
    const isImmersive = Boolean(
      activeWindow
      && !activeWindow.isMinimized
      && !activeWindow.element.classList.contains('is-closing')
      && activeWindow.element.classList.contains('portfolio-immersive-workspace')
    );
    this.desktop.classList.toggle('immersive-experience-active', isImmersive);
  }

  updateDockState() {
    if (!this.dock) return;
    const items = this.dock.querySelectorAll('[data-launch-app]');
    items.forEach(item => {
      const appId = item.dataset.launchApp;
      const win = this.windows.get(appId);
      const isOpen = Boolean(win && !win.element.classList.contains('is-closing'));
      const isActive = isOpen && this.activeWindow === appId && !win.isMinimized;
      const isMinimized = isOpen && win.isMinimized;

      item.classList.toggle('is-open', isOpen);
      item.classList.toggle('is-active', isActive);
      item.classList.toggle('is-minimized', isMinimized);

      if (isActive) {
        item.setAttribute('aria-current', 'true');
      } else {
        item.removeAttribute('aria-current');
      }
    });
  }
}
