import { resumeData } from '../../data/resumeData.js';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function renderProject(project, index) {
  return `
    <section class="walk-chapter ${index % 2 ? 'walk-chapter-reverse' : ''}" id="walk-${escapeHTML(project.id)}" data-walk-chapter="${index}">
      <div class="walk-chapter-index">
        <span>0${index + 1}</span>
        <i></i>
        <small>${escapeHTML(project.period || 'SELECTED WORK')}</small>
      </div>
      <article class="walk-chapter-copy">
        <p class="walk-eyebrow">${escapeHTML(project.subtitle || 'Selected project')}</p>
        <h2>${escapeHTML(project.title)}</h2>
        <p class="walk-overview">${escapeHTML(project.overview || '')}</p>
        <div class="walk-tech" aria-label="Technologies">
          ${(project.tech || []).map(technology => `<span>${escapeHTML(technology)}</span>`).join('')}
        </div>
        <button class="walk-study-open" type="button" data-open-study="${index}">
          EXPLORE CASE STUDY <span>↗</span>
        </button>
      </article>
    </section>
  `;
}

function renderStudy(project, index) {
  const areas = project.areas || [];
  const implementation = project.implementation || [];
  const highlights = project.highlights || [];

  return `
    <div class="walk-study-heading">
      <p class="walk-eyebrow">CASE STUDY 0${index + 1}</p>
      <span>${escapeHTML(project.period || 'SELECTED WORK')}</span>
    </div>
    <h2>${escapeHTML(project.title)}</h2>
    <p class="walk-study-subtitle">${escapeHTML(project.subtitle || '')}</p>
    <div class="walk-study-tags">${(project.tech || []).map(item => `<span>${escapeHTML(item)}</span>`).join('')}</div>
    <section class="walk-study-section">
      <h3>OVERVIEW</h3>
      <p>${escapeHTML(project.overview || '')}</p>
    </section>
    ${areas.length ? `
      <section class="walk-study-section">
        <h3>SYSTEM AREAS</h3>
        <ul>${areas.map((item, itemIndex) => `<li><span>0${itemIndex + 1}</span>${escapeHTML(item)}</li>`).join('')}</ul>
      </section>
    ` : ''}
    ${implementation.length ? `
      <section class="walk-study-section">
        <h3>ENGINEERING APPROACH</h3>
        <ul>${implementation.map((item, itemIndex) => `<li><span>0${itemIndex + 1}</span>${escapeHTML(item)}</li>`).join('')}</ul>
      </section>
    ` : ''}
    ${highlights.length ? `
      <section class="walk-study-section">
        <h3>PROJECT HIGHLIGHTS</h3>
        <ul>${highlights.map((item, itemIndex) => `<li><span>0${itemIndex + 1}</span>${escapeHTML(item)}</li>`).join('')}</ul>
      </section>
    ` : ''}
    <a class="walk-study-contact" href="#contact" data-portfolio-route="contact">Discuss this project <span>↗</span></a>
  `;
}

export function createProjectsAppContent(initialProjectId = '') {
  const container = document.createElement('div');
  container.className = 'work-experience study-experience at-walk-experience';

  const projects = resumeData.projects;
  container.innerHTML = `
    <div class="at-walk-shell is-intro">
      <canvas class="at-walk-canvas" aria-label="A 3D molecular strand that follows the selected-work scroll"></canvas>
      <div class="walk-rna-art" aria-hidden="true">
        <svg viewBox="0 0 500 900" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="rna-sage" x1="0" y1="0" x2="0.8" y2="1">
              <stop offset="0" stop-color="#d0d9b7" />
              <stop offset="1" stop-color="#76927b" />
            </linearGradient>
            <linearGradient id="rna-copper" x1="0.2" y1="0" x2="0.9" y2="1">
              <stop offset="0" stop-color="#e0b58d" />
              <stop offset="1" stop-color="#a56f50" />
            </linearGradient>
          </defs>
          <g class="walk-rna-rungs">
            <path d="M250 30L250 30 M235 95L265 95 M175 160L325 160 M145 225L355 225 M205 290L295 290 M265 355L235 355 M325 420L175 420 M295 485L205 485 M235 550L265 550 M175 615L325 615 M145 680L355 680 M205 745L295 745 M265 810L235 810 M250 875L250 875" />
          </g>
          <path class="walk-rna-strand walk-rna-strand-a" d="M250 0 C410 80 410 150 250 225 C90 300 90 375 250 450 C410 525 410 600 250 675 C90 750 90 825 250 900" />
          <path class="walk-rna-strand walk-rna-strand-b" d="M250 0 C90 80 90 150 250 225 C410 300 410 375 250 450 C90 525 90 600 250 675 C410 750 410 825 250 900" />
          <g class="walk-rna-nodes">
            <circle cx="250" cy="225" r="7" /><circle cx="250" cy="450" r="7" />
            <circle cx="250" cy="675" r="7" /><circle cx="250" cy="900" r="7" />
          </g>
        </svg>
      </div>
      <div class="at-walk-vignette" aria-hidden="true"></div>

      <header class="at-walk-header">
        <a class="at-walk-brand" href="#home" data-portfolio-route="home" aria-label="Back to desktop">
          <span>AS</span><small>ADITYA SHINDE</small>
        </a>
        <nav class="at-walk-nav" aria-label="Portfolio navigation">
          <a class="is-current" href="#work" data-portfolio-route="projects">WORK</a>
          <a href="#skills" data-portfolio-route="skills">SKILLS</a>
          <a href="#contact" data-portfolio-route="contact">CONTACT ↗</a>
        </nav>
        <a class="experience-back-link" href="#home" data-portfolio-route="home">← BACK TO DESKTOP</a>
      </header>

      <main class="at-walk-scroll" aria-label="Selected work">
        <section class="walk-intro">
          <div class="walk-intro-index"><span>SELECTED ENGINEERING</span><span>CASE STUDIES · 02</span></div>
          <div class="walk-intro-copy">
            <p class="walk-eyebrow">ENGINEERING, IN CONTEXT</p>
            <h1>Built around<br><em>real work.</em></h1>
            <p>Follow a living strand through selected work. Each project opens into its own case study: the system, the decisions, and the engineering behind it.</p>
          </div>
          <button class="walk-begin" type="button" data-walk-to="0">
            <span>DESCEND INTO THE WORK</span><i aria-hidden="true"></i>
          </button>
          <span class="walk-intro-coordinate" aria-hidden="true">FIELD 01<br>34° 12' / 58° 04'</span>
        </section>

        <div class="walk-chapters">
          <div class="walk-trajectory" aria-hidden="true">
            <svg viewBox="0 0 120 1000" preserveAspectRatio="none">
              <path d="M60 0 C60 65 97 76 97 152 C97 228 22 242 22 326 C22 410 94 421 94 502 C94 584 26 599 26 684 C26 769 81 784 81 858 C81 930 60 945 60 1000"/>
            </svg>
          </div>
          ${projects.map(renderProject).join('')}
        </div>

        <section class="walk-outro">
          <p class="walk-eyebrow">END OF THE PATH</p>
          <h2>More good work<br>starts with a conversation.</h2>
          <a href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
          <a class="walk-outro-home" href="#home" data-portfolio-route="home">← BACK TO DESKTOP</a>
        </section>
      </main>

      <div class="walk-progress" aria-hidden="true"><span></span></div>
      <div class="walk-scene-index" aria-live="polite"><span>01</span><i></i><span>0${projects.length}</span></div>

      <aside class="walk-study-drawer" aria-hidden="true">
        <button class="walk-study-backdrop" type="button" aria-label="Close case study"></button>
        <section class="walk-study-sheet" role="dialog" aria-modal="true" aria-labelledby="walk-study-title">
          <button class="walk-study-close" type="button" aria-label="Close case study">×</button>
          <div class="walk-study-content" id="walk-study-content"></div>
        </section>
      </aside>
    </div>
  `;

  const scrollArea = container.querySelector('.at-walk-scroll');
  const shell = container.querySelector('.at-walk-shell');
  const rnaArt = container.querySelector('.walk-rna-art');
  const canvas = container.querySelector('.at-walk-canvas');
  const progressBar = container.querySelector('.walk-progress span');
  const chapterEls = [...container.querySelectorAll('[data-walk-chapter]')];
  const sceneIndex = container.querySelector('.walk-scene-index');
  const beginButton = container.querySelector('.walk-begin');
  const drawer = container.querySelector('.walk-study-drawer');
  const drawerContent = container.querySelector('.walk-study-content');
  const closeButton = container.querySelector('.walk-study-close');
  const backdropButton = container.querySelector('.walk-study-backdrop');
  let world = null;
  let disposed = false;
  let studyOpener = null;

  const scrollToChapter = (index, behavior = 'smooth') => {
    const target = chapterEls[index];
    if (!target) return;
    const top = scrollArea.scrollTop + target.getBoundingClientRect().top - scrollArea.getBoundingClientRect().top;
    scrollArea.scrollTo({ top, behavior });
  };

  const updateScroll = () => {
    const scrollable = scrollArea.scrollHeight - scrollArea.clientHeight;
    const progress = scrollable > 0 ? scrollArea.scrollTop / scrollable : 0;
    progressBar.style.transform = `scaleX(${Math.max(0, Math.min(1, progress))})`;
    shell.classList.toggle('is-intro', scrollArea.scrollTop < scrollArea.clientHeight * 0.55);
    rnaArt.style.transform = `translateY(${-progress * 7}%)`;

    const midpoint = scrollArea.getBoundingClientRect().top + scrollArea.clientHeight * 0.52;
    const active = chapterEls.find(chapter => chapter.getBoundingClientRect().bottom > midpoint);
    if (active) {
      const number = Number(active.dataset.walkChapter) + 1;
      sceneIndex.querySelector('span').textContent = String(number).padStart(2, '0');
      beginButton.dataset.walkTo = String(number - 1);
      beginButton.querySelector('span').textContent = `PROJECT ${String(number).padStart(2, '0')} / ${String(projects.length).padStart(2, '0')}`;
    } else if (scrollArea.scrollTop < chapterEls[0]?.offsetTop * 0.65) {
      sceneIndex.querySelector('span').textContent = '01';
      beginButton.dataset.walkTo = '0';
      beginButton.querySelector('span').textContent = 'DESCEND INTO THE WORK';
    }
  };

  const closeStudy = () => {
    const wasOpen = drawer.classList.contains('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (wasOpen && studyOpener?.isConnected) studyOpener.focus();
  };
  const openStudy = index => {
    const project = projects[index];
    if (!project) return;
    studyOpener = container.querySelector(`[data-open-study="${index}"]`);
    drawerContent.innerHTML = renderStudy(project, index);
    drawerContent.querySelector('h2')?.setAttribute('id', 'walk-study-title');
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    closeButton.focus();
  };
  const closeOnEscape = event => {
    if (event.code === 'Escape' && drawer.classList.contains('is-open')) closeStudy();
    if (event.code !== 'Tab' || !drawer.classList.contains('is-open')) return;
    const focusable = [...drawer.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(element => !element.hasAttribute('disabled') && element.getClientRects().length);
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
  };

  scrollArea.addEventListener('scroll', updateScroll, { passive: true });
  beginButton.addEventListener('click', () => scrollToChapter(Number(beginButton.dataset.walkTo)));
  container.querySelectorAll('[data-open-study]').forEach(button => {
    button.addEventListener('click', () => openStudy(Number(button.dataset.openStudy)));
  });
  closeButton.addEventListener('click', closeStudy);
  backdropButton.addEventListener('click', closeStudy);
  window.addEventListener('keydown', closeOnEscape);
  updateScroll();
  requestAnimationFrame(() => {
    if (!disposed) updateScroll();
  });

  requestAnimationFrame(() => {
    if (disposed || !canvas.isConnected) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      canvas.hidden = true;
      container.classList.add('has-static-scene');
      return;
    }
    import('../workWorld.js').then(({ WorkWorld }) => {
      if (disposed || !canvas.isConnected) return;
      world = new WorkWorld(canvas, scrollArea, () => {
        const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
        return maxScroll > 0 ? scrollArea.scrollTop / maxScroll : 0;
      });
      canvas._workWorld = world;
    }).catch(error => {
      canvas.hidden = true;
      container.classList.add('has-static-scene');
      console.error('Failed to load the 3D work experience:', error);
    });
  });

  const removalObserver = new MutationObserver(() => {
    if (container.isConnected) return;
    disposed = true;
    world?.dispose();
    scrollArea.removeEventListener('scroll', updateScroll);
    window.removeEventListener('keydown', closeOnEscape);
    removalObserver.disconnect();
  });
  removalObserver.observe(document.body, { childList: true, subtree: true });

  container.navigateToProject = projectId => {
    const index = projects.findIndex(project => project.id === projectId);
    if (index >= 0) scrollToChapter(index);
  };

  if (initialProjectId) {
    requestAnimationFrame(() => {
      const index = projects.findIndex(project => project.id === initialProjectId);
      if (index >= 0) scrollToChapter(index, 'instant');
    });
  }

  return container;
}
