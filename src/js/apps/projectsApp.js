import { resumeData } from '../../data/resumeData.js';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

const pad = value => String(value).padStart(2, '0');
const DEPTH_METERS = 1200;

// same order as the panel accents in workWorld.js, so the text matches its panel
const ACCENT_CSS = ['#3fd0c4', '#ff5a4f', '#e0a860', '#8a7bff', '#6fe0c0', '#f06fb0'];

/* ------------------------------------------------------------------ */
/*  Styles (self-contained: nothing here depends on the old walk-* CSS) */
/* ------------------------------------------------------------------ */

const STYLE = `
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;500&display=swap');

.wx-shell{position:relative;width:100%;height:100%;min-height:520px;overflow:hidden;background:#040a10;color:var(--wx-ink);
  font-family:ui-monospace,"JetBrains Mono","SF Mono",Menlo,Consolas,"Courier New",monospace;font-size:12px;letter-spacing:.06em;text-transform:uppercase;
  --wx-ink:#eaf2f6;--wx-dim:#8aa6b4;--wx-line:rgba(140,200,220,.28);
  --wx-serif:"Chakra Petch","Space Grotesk",ui-monospace,Menlo,Consolas,monospace}
.wx-shell *{box-sizing:border-box}
.has-static-scene .wx-shell{background:radial-gradient(60% 50% at 70% 30%,rgba(60,140,200,.16),transparent 70%),radial-gradient(50% 50% at 30% 80%,rgba(98,224,230,.1),transparent 70%),#040a10}
.wx-canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.wx-vignette{position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 90% at 55% 50%,transparent 48%,rgba(2,5,8,.7)),linear-gradient(90deg,rgba(4,10,16,.55),transparent 36%)}
.wx-scroll{position:absolute;inset:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}
.wx-scroll::-webkit-scrollbar{display:none}
.wx-spacer{height:100%}

/* HUD layer ------------------------------------------------------- */
.wx-hud{position:absolute;inset:0;pointer-events:none}
.wx-hud>*{transition:opacity .4s ease}
.wx-shell.is-study .wx-hud>*{opacity:0!important;visibility:hidden;pointer-events:none!important;transition:opacity .3s ease,visibility 0s .3s}

.wx-fade{transition:opacity .45s ease,visibility 0s}
.wx-fade.is-hidden{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .35s ease,visibility 0s .35s}

.wx-block{position:absolute;left:clamp(46px,5.2vw,78px);bottom:clamp(100px,17vh,160px);width:min(430px,calc(100% - 90px));
  transition:opacity .45s ease,transform .45s ease,visibility 0s}
.wx-block.is-hidden{opacity:0;transform:translateY(14px);visibility:hidden;pointer-events:none;transition:opacity .35s ease,transform .35s ease,visibility 0s .35s}
.wx-block button,.wx-block a{pointer-events:auto}
.wx-meta{margin:0;color:var(--wx-dim);font-size:10.5px;letter-spacing:.14em}

/* intro: big editorial headline, inverted where it crosses the strand */
.wx-intro{width:min(820px,calc(100% - 110px));mix-blend-mode:difference;color:#fff}
.wx-h1{margin:.5em 0 .45em;font-family:var(--wx-serif);font-weight:400;text-transform:none;letter-spacing:-.025em;
  font-size:clamp(40px,6.6vw,104px);line-height:.98;text-transform:uppercase;letter-spacing:.01em}
.wx-h1 em{font-style:normal;opacity:.7}
.wx-intro .wx-overview{max-width:380px;color:#fff;opacity:.85;-webkit-line-clamp:unset;display:block}
.wx-cta{display:inline-flex;align-items:center;gap:14px;padding:13px 24px;border:1px solid rgba(255,255,255,.55);border-radius:999px;background:none;color:#fff;
  font:inherit;letter-spacing:.12em;text-transform:inherit;cursor:pointer;transition:background .25s,color .25s}
.wx-cta:hover,.wx-cta:focus-visible{background:#fff;color:#000;outline:none}
.wx-cta span{display:inline-block;animation:wx-bob 1.8s ease-in-out infinite}
@keyframes wx-bob{0%,100%{transform:translateY(-2px)}50%{transform:translateY(3px)}}

.wx-intro>*{animation:wx-rise 1s cubic-bezier(.2,.7,.2,1) both}
.wx-intro>*:nth-child(2){animation-delay:.12s}
.wx-intro>*:nth-child(3){animation-delay:.26s}
.wx-intro>*:nth-child(4){animation-delay:.38s}
@keyframes wx-rise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}

/* project info */
.wx-num{display:flex;align-items:center;gap:14px;color:var(--wx-dim);font-size:10.5px;letter-spacing:.14em}
.wx-num i{display:block;width:44px;height:1px;background:var(--wx-line)}
.wx-title{margin:.5em 0 .35em;font-family:var(--wx-serif);font-weight:400;font-size:clamp(28px,3vw,44px);line-height:1;letter-spacing:.01em;text-transform:uppercase}
.wx-sub{margin:0 0 1.7em;color:var(--wx-dim);font-size:11px;letter-spacing:.1em}
.wx-overview{margin:0 0 1.3em;line-height:1.8;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;font-size:11.5px}
.wx-tags{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0 0 1.5em;color:var(--wx-dim);font-size:10.5px}
.wx-tags span::before{content:"-> "}
.wx-link{background:none;border:0;padding:0;color:var(--wx-ink);font:inherit;letter-spacing:.12em;text-transform:inherit;
  text-decoration:underline;text-underline-offset:6px;text-decoration-color:var(--wx-line);cursor:pointer;display:inline-block;transition:text-decoration-color .25s}
.wx-link:hover,.wx-link:focus-visible{text-decoration-color:#fff;outline:none}

.wx-pill{position:absolute;left:clamp(46px,5.2vw,78px);bottom:clamp(24px,5vh,44px);pointer-events:auto;display:inline-flex;align-items:center;
  padding:13px 24px;border:1px solid var(--wx-line);border-radius:999px;color:var(--wx-dim);text-decoration:none;font-size:11px;letter-spacing:.12em;
  background:rgba(6,14,22,.6);transition:color .25s,border-color .25s,background .25s}
.wx-pill:hover,.wx-pill:focus-visible{color:#fff;border-color:rgba(170,225,240,.7);background:rgba(90,170,210,.14);outline:none}

/* depth gauge: scroll progress as a descent */
.wx-gauge{position:absolute;left:clamp(14px,1.9vw,26px);top:clamp(70px,14vh,120px);bottom:clamp(100px,17vh,160px);display:flex;flex-direction:column;align-items:flex-start;gap:10px;
  color:var(--wx-dim);font-size:9px;letter-spacing:.14em}
.wx-gauge-ticks{position:relative;flex:1;width:10px;
  background:repeating-linear-gradient(to bottom,rgba(140,200,220,.38) 0 1px,transparent 1px 9px)}
.wx-gauge-ticks::before{content:"";position:absolute;inset:0;width:17px;
  background:repeating-linear-gradient(to bottom,rgba(190,230,240,.6) 0 1px,transparent 1px 45px)}
.wx-gauge-mark{position:absolute;left:0;top:0;width:26px;height:1px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.8);transition:top .12s linear}
.wx-gauge-val{color:var(--wx-ink)}

/* project index (intro only) */
.wx-toc{position:absolute;right:clamp(16px,3vw,40px);bottom:clamp(100px,17vh,160px);width:min(310px,26vw);pointer-events:auto}
.wx-toc .wx-meta{margin-bottom:12px}
.wx-toc button{display:grid;grid-template-columns:2.4em 1fr auto;align-items:baseline;gap:8px;width:100%;padding:13px 0;background:none;border:0;border-top:1px solid rgba(140,200,220,.2);
  color:var(--wx-dim);font:inherit;font-size:11px;letter-spacing:.1em;text-transform:inherit;text-align:left;cursor:pointer;transition:color .25s,padding-left .25s,opacity .3s}
.wx-toc button:last-child{border-bottom:1px solid rgba(140,200,220,.2)}
.wx-toc button b{font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--wx-ink)}
.wx-toc button em{font-style:normal;font-size:10px}
.wx-toc button:hover,.wx-toc button:focus-visible{color:#fff;padding-left:8px;outline:none}

/* scroll cue (intro only) */
.wx-cue{position:absolute;right:clamp(16px,3vw,40px);bottom:clamp(24px,5vh,44px);display:flex;align-items:center;gap:12px;color:var(--wx-dim);font-size:10px;letter-spacing:.16em}
.wx-cue i{position:relative;display:block;width:1px;height:46px;background:var(--wx-line);overflow:hidden}
.wx-cue i::after{content:"";position:absolute;left:0;top:-40%;width:1px;height:40%;background:#fff;animation:wx-drop 1.9s cubic-bezier(.5,0,.2,1) infinite}
@keyframes wx-drop{to{top:110%}}

/* rail + counter (project mode) */
.wx-rail{position:absolute;right:clamp(16px,3vw,40px);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:12px;align-items:flex-end;pointer-events:auto}
.wx-rail button{display:flex;align-items:center;gap:12px;background:none;border:0;padding:4px 0;color:var(--wx-dim);font:inherit;font-size:10.5px;letter-spacing:.12em;text-transform:inherit;cursor:pointer;transition:opacity .3s}
.wx-rail b{font-weight:500;max-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;opacity:0;transition:max-width .35s ease,opacity .35s ease}
.wx-rail em{font-style:normal}
.wx-rail i{display:block;width:14px;height:1px;background:currentColor;transition:width .35s ease}
.wx-rail button:hover b,.wx-rail button.is-active b,.wx-rail button:focus-visible b{max-width:190px;opacity:1}
.wx-rail button.is-active{color:var(--wx-ink)}
.wx-rail button.is-active i{width:38px}
.wx-rail button:focus-visible{outline:none;color:#fff}

.wx-count{position:absolute;right:clamp(16px,3vw,40px);bottom:clamp(28px,5vh,48px);display:flex;align-items:center;gap:12px;color:var(--wx-dim);font-size:10.5px}
.wx-count-bar{width:90px;height:1px;background:var(--wx-line);position:relative;overflow:hidden}
.wx-count-bar span{position:absolute;inset:0;background:var(--wx-ink);transform-origin:left;transform:scaleX(0)}

/* case study: one calm screen -------------------------------------- */
.wx-study{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .5s ease,visibility 0s .5s;--wx-accent:#7fb4ff}
.wx-study.is-open{opacity:1;visibility:visible;transition:opacity .5s ease}
.wx-study-fx{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(90% 80% at 58% 48%,color-mix(in srgb,var(--wx-accent) 24%,transparent),transparent 72%),
    linear-gradient(0deg,color-mix(in srgb,var(--wx-accent) 18%,transparent),transparent 42%)}
.wx-study-fx::before{content:"";position:absolute;inset:-40px;opacity:.13;will-change:transform;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='600'%3E%3Cfilter id='f' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.0035 0.55' numOctaves='2' seed='7'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1.5 0 0 0 -0.62'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)'/%3E%3C/svg%3E");background-size:900px 600px;
  -webkit-mask-image:radial-gradient(ellipse 40% 44% at 57% 50%,transparent 58%,#000 100%);mask-image:radial-gradient(ellipse 40% 44% at 57% 50%,transparent 58%,#000 100%);
  animation:wx-streak 1.1s steps(5) infinite}
@keyframes wx-streak{0%{transform:translate(0,0)}25%{transform:translate(-14px,6px)}50%{transform:translate(9px,-9px)}75%{transform:translate(-6px,12px)}100%{transform:translate(0,0)}}
.wx-study-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(2,5,8,.5) 0,rgba(2,5,8,.28) 26%,rgba(2,5,8,0) 46%)}
.wx-study button,.wx-study a{pointer-events:auto}
.wx-study-hint{position:absolute;top:clamp(18px,4.5vh,40px);left:50%;transform:translateX(-50%);font-size:10px;color:var(--wx-dim);letter-spacing:.16em;white-space:nowrap}

.wx-st{position:absolute;left:clamp(58px,5vw,84px);bottom:clamp(84px,15vh,140px);width:min(330px,calc(100% - 120px));outline:none}
.wx-st-kicker{display:flex;align-items:center;gap:14px;margin:0 0 18px;color:var(--wx-dim);font-size:10.5px;letter-spacing:.16em}
.wx-st-kicker::before{content:"";width:34px;height:1px;background:var(--wx-dim)}
.wx-st-title{margin:0 0 .55em;font-family:var(--wx-serif);font-weight:500;font-size:clamp(20px,1.7vw,26px);line-height:1.15;letter-spacing:.08em;text-transform:uppercase;color:#fff}
.wx-st-sub{margin:0 0 1.4em;color:var(--wx-accent);font-size:11.5px;letter-spacing:.14em;line-height:1.7}
.wx-st-desc{margin:0 0 1.7em;color:color-mix(in srgb,var(--wx-accent) 22%,#fff);font-size:12px;line-height:1.95;letter-spacing:.07em}
.wx-st-desc .wx-ghost{visibility:hidden}
.wx-st .wx-tags{margin:0 0 1.9em}
.wx-st-links{display:flex;flex-wrap:wrap;align-items:center;gap:12px 30px}
.wx-st-links a,.wx-st-links button{background:none;border:0;padding:0;color:var(--wx-accent);font:inherit;letter-spacing:.12em;text-transform:inherit;text-decoration:underline;
  text-underline-offset:6px;text-decoration-color:color-mix(in srgb,var(--wx-accent) 45%,transparent);cursor:pointer;transition:text-decoration-color .25s,color .25s}
.wx-st-links a:hover,.wx-st-links button:hover,.wx-st-links a:focus-visible,.wx-st-links button:focus-visible{color:#fff;text-decoration-color:#fff;outline:none}
.wx-fadein{opacity:0;animation:wx-fadein .8s ease forwards}
@keyframes wx-fadein{to{opacity:1}}

@media (max-width:900px){
  .wx-toc{display:none}
}
@media (max-width:760px){
  .wx-rail,.wx-count,.wx-gauge,.wx-cue{display:none}
  .wx-block{left:20px;bottom:92px;width:calc(100% - 40px)}
  .wx-intro{width:calc(100% - 40px)}
  .wx-pill{left:20px}
  .wx-study-scrim{background:linear-gradient(0deg,rgba(4,10,16,.95) 0,rgba(4,10,16,.86) 56%,rgba(4,10,16,.1) 82%,transparent)}
  .wx-st{left:20px;width:calc(100% - 40px);bottom:56px}
  .wx-study-fx::before{-webkit-mask-image:none;mask-image:none;opacity:.3}
  .wx-study-hint{display:none}
}
@media (prefers-reduced-motion:reduce){
  .wx-block,.wx-study,.wx-rail b,.wx-rail i,.wx-fade{transition:none}
  .wx-intro>*,.wx-cta span,.wx-cue i::after,.wx-study-fx::before{animation:none!important}
  .wx-fadein{animation:none;opacity:1}
}
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const GLYPHS = '▌▐░▒#/\\<>_-+*0123456789ABCDEFXYZ';
const TYPE_GLYPHS = '#/\\<>_-+*0123456789ABCDEFXYZ';

// title-style reveal: every letter flickers through noise, then settles left to right
function scramble(element, text, reduced, duration = 520) {
  cancelAnimationFrame(element._wxRaf);
  if (reduced || !text) { element.textContent = text; return; }
  const start = performance.now();
  const step = now => {
    const t = Math.min(1, (now - start) / duration);
    const settled = Math.floor(t * text.length);
    let out = '';
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      out += i < settled || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    element.textContent = t < 1 ? out : text;
    if (t < 1) element._wxRaf = requestAnimationFrame(step);
  };
  element._wxRaf = requestAnimationFrame(step);
}

// description reveal: letters load in one by one, with a short run of noise at the cursor.
// The unrevealed remainder stays in the layout (hidden), so the lines never reflow.
function typeReveal(element, text, reduced, { delay = 0, cps = 90, tail = 5 } = {}) {
  cancelAnimationFrame(element._wxRaf);
  clearTimeout(element._wxT);
  if (reduced || !text) { element.textContent = text; return; }
  const shown = document.createTextNode('');
  const ghost = document.createElement('span');
  ghost.className = 'wx-ghost';
  ghost.textContent = text;
  element.replaceChildren(shown, ghost);
  const begin = () => {
    const start = performance.now();
    const step = now => {
      const n = Math.min(text.length, Math.floor(((now - start) / 1000) * cps));
      if (n >= text.length) { element.textContent = text; return; }
      const noise = Math.min(tail, text.length - n);
      let head = text.slice(0, n);
      for (let i = 0; i < noise; i += 1) {
        const ch = text[n + i];
        head += ch === ' ' ? ' ' : TYPE_GLYPHS[Math.floor(Math.random() * TYPE_GLYPHS.length)];
      }
      shown.nodeValue = head;
      ghost.textContent = text.slice(n + noise);
      element._wxRaf = requestAnimationFrame(step);
    };
    element._wxRaf = requestAnimationFrame(step);
  };
  if (delay) element._wxT = setTimeout(begin, delay); else begin();
}

// Finds a project's outbound links. Add any of these fields to a project in resumeData
// (liveUrl / github, or a links array) and they show up in the expanded view.
const isUrl = u => typeof u === 'string' && /^(https?:\/\/|\/|#)/.test(u);
function projectLinks(project) {
  const links = [];
  const add = (label, url) => { if (isUrl(url) && !links.some(l => l.url === url)) links.push({ label, url }); };
  add('OPEN PROJECT', project.liveUrl || project.live || project.demo || project.demoUrl || project.website || project.url || project.link || project.href);
  add('VIEW SOURCE', project.github || project.repo || project.repoUrl || project.source || project.code);
  if (Array.isArray(project.links)) {
    project.links.forEach(l => (typeof l === 'string'
      ? add('OPEN LINK', l)
      : add(String(l.label || l.title || l.name || 'OPEN LINK').toUpperCase(), l.url || l.href)));
  }
  return links;
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

const MNEMOSYNE = {
  id: 'mnemosyne',
  title: 'Mnemosyne — Local-first Personal Knowledge Graph',
  subtitle: 'Local-first personal knowledge graph',
  period: '2026',
  tech: ['Python', 'FastAPI', 'PostgreSQL/pgvector', 'SQLAlchemy', 'Typer', 'JavaScript'],
  overview: 'A knowledge-management application for capturing, organizing, searching and connecting notes, documents, bookmarks and decisions. Ingestion and indexing run asynchronously on a PostgreSQL job queue with concurrent-safe job claiming, retries and backoff. Retrieval is text, vector or hybrid, fusing ranked results with Reciprocal Rank Fusion. An editable natural-language graph-drafting workflow validates structured output and evidence, with human approval before anything is saved. REST API and CLI workflows cover capture, search, ingestion, folder watching and reindexing.',
  liveUrl: 'https://mnemosyne-teal.vercel.app/',
  github: 'https://github.com/AdityaShinde-git/Mnemosyne'
};

export function createProjectsAppContent(initialProjectId = '') {
  // Mnemosyne is added here when the resume data does not list it yet, so the page works either way.
  const projects = /mnemosyne/i.test(JSON.stringify(resumeData.projects.map(p => p.title)))
    ? resumeData.projects
    : [...resumeData.projects, MNEMOSYNE];
  const n = projects.length;
  const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const container = document.createElement('div');
  container.className = 'work-experience study-experience at-walk-experience';
  container.innerHTML = `
    <style>${STYLE}</style>
    <div class="wx-shell">
      <canvas class="wx-canvas" aria-label="A 3D strand with one floating panel per project, following the scroll"></canvas>
      <div class="wx-vignette" aria-hidden="true"></div>

      <main class="wx-scroll" aria-label="Selected work">
        ${'<section class="wx-spacer"></section>'.repeat(n + 2)}
      </main>

      <div class="wx-hud">
        <div class="wx-gauge" aria-hidden="true">
          <span>DEPTH</span>
          <div class="wx-gauge-ticks"><i class="wx-gauge-mark"></i></div>
          <span class="wx-gauge-val">0000M</span>
        </div>

        <section class="wx-block wx-intro">
          <p class="wx-meta" style="color:inherit;opacity:.7">SELECTED ENGINEERING · ${pad(n)} CASE STUDIES</p>
          <h1 class="wx-h1">Built around<br><em>real work.</em></h1>
          <p class="wx-overview">Follow the strand down through selected work. Hover a panel and click to open its case study.</p>
          <div><button class="wx-cta" type="button" data-wx-go="0">DESCEND INTO THE WORK <span aria-hidden="true">↓</span></button></div>
        </section>

        <section class="wx-block wx-info is-hidden" aria-live="polite">
          <div class="wx-num"><span class="wx-info-meta"></span><i></i><span class="wx-info-period"></span></div>
          <h2 class="wx-title wx-info-title"></h2>
          <p class="wx-sub wx-info-sub"></p>
          <button class="wx-link" type="button" data-wx-open>-&gt; OPEN CASE STUDY</button>
        </section>

        <section class="wx-block wx-outro is-hidden">
          <p class="wx-meta">END OF THE PATH</p>
          <h2 class="wx-h1" style="font-size:clamp(34px,4.6vw,72px)">More good work<br>starts with a<br><em>conversation.</em></h2>
          <a class="wx-link" href="#contact" data-portfolio-route="contact">-&gt; GET IN TOUCH ↗</a>
        </section>

        <nav class="wx-toc wx-fade" aria-label="Project index">
          <p class="wx-meta">INDEX</p>
          ${projects.map((p, i) => `<button type="button" data-wx-go="${i}"><span>${pad(i + 1)}</span><b>${escapeHTML(p.title)}</b><em>${escapeHTML(p.period || '')}</em></button>`).join('')}
        </nav>

        <div class="wx-cue wx-fade" aria-hidden="true"><span>SCROLL</span><i></i></div>

        <a class="wx-pill" href="#contact" data-portfolio-route="contact">DISCUSS A PROJECT...</a>

        <nav class="wx-rail wx-fade is-hidden" aria-label="Projects">
          ${projects.map((p, i) => `<button type="button" data-wx-go="${i}" aria-label="${escapeHTML(p.title)}"><b>${escapeHTML(p.title)}</b><em>${pad(i + 1)}</em><i></i></button>`).join('')}
        </nav>

        <div class="wx-count" aria-hidden="true">
          <span class="wx-count-now">00</span>
          <div class="wx-count-bar"><span></span></div>
          <span>${pad(n)}</span>
        </div>
      </div>

      <aside class="wx-study" aria-hidden="true">
        <div class="wx-study-fx" aria-hidden="true"></div>
        <div class="wx-study-scrim"></div>
        <div class="wx-study-hint">SCROLL OR ESC TO RETURN</div>
        <section class="wx-st" role="dialog" aria-modal="true" aria-label="Case study" tabindex="-1">
          <p class="wx-st-kicker"></p>
          <h2 class="wx-st-title"></h2>
          <p class="wx-st-sub"></p>
          <p class="wx-st-desc"></p>
          <div class="wx-tags wx-st-tags"></div>
          <div class="wx-st-links"></div>
        </section>
      </aside>
    </div>
  `;

  const q = selector => container.querySelector(selector);
  const shell = q('.wx-shell');
  const canvas = q('.wx-canvas');
  const scrollArea = q('.wx-scroll');
  const introEl = q('.wx-intro');
  const infoEl = q('.wx-info');
  const outroEl = q('.wx-outro');
  const tocEl = q('.wx-toc');
  const cueEl = q('.wx-cue');
  const metaEl = q('.wx-info-meta');
  const periodEl = q('.wx-info-period');
  const titleEl = q('.wx-info-title');
  const subEl = q('.wx-info-sub');
  const openBtn = q('[data-wx-open]');
  const rail = q('.wx-rail');
  const railButtons = [...container.querySelectorAll('.wx-rail [data-wx-go]')];
  const countNow = q('.wx-count-now');
  const countBar = q('.wx-count-bar span');
  const gaugeMark = q('.wx-gauge-mark');
  const gaugeVal = q('.wx-gauge-val');
  const study = q('.wx-study');
  const st = {
    root: q('.wx-st'),
    kicker: q('.wx-st-kicker'),
    title: q('.wx-st-title'),
    sub: q('.wx-st-sub'),
    desc: q('.wx-st-desc'),
    tags: q('.wx-st-tags'),
    links: q('.wx-st-links')
  };

  let world = null;
  let disposed = false;
  let current = -2;      // -1 intro, 0..n-1 project, n outro
  let studyIndex = -1;
  let studyOpener = null;
  let openedAt = 0;
  let wheelAcc = 0;
  let wheelTimer = 0;
  let touchY = null;

  // Project i is centred at scrollTop = (i + 1) * viewport height,
  // i.e. progress (i + 1) / (n + 1). The 3D scene uses the same mapping.
  const scrollToChapter = (index, behavior = 'smooth') => {
    scrollArea.scrollTo({ top: (index + 1) * scrollArea.clientHeight, behavior });
  };

  /* ---------- scroll-linked HUD ---------- */

  const setActive = active => {
    if (active === current) return;
    current = active;
    const isProject = active >= 0 && active < n;
    introEl.classList.toggle('is-hidden', active !== -1);
    outroEl.classList.toggle('is-hidden', active !== n);
    infoEl.classList.toggle('is-hidden', !isProject);
    tocEl.classList.toggle('is-hidden', active !== -1);
    cueEl.classList.toggle('is-hidden', active !== -1);
    rail.classList.toggle('is-hidden', active === -1);
    railButtons.forEach((button, i) => button.classList.toggle('is-active', i === active));
    countNow.textContent = pad(Math.max(0, Math.min(n, active + 1)));

    if (!isProject) return;
    const project = projects[active];
    metaEl.textContent = `${pad(active + 1)} / ${pad(n)}`;
    periodEl.textContent = project.period || 'SELECTED WORK';
    scramble(titleEl, project.title || '', reduced);
    scramble(subEl, project.subtitle || '', reduced, 640);
    openBtn.dataset.wxOpen = String(active);
  };

  const updateScroll = () => {
    const scrollable = scrollArea.scrollHeight - scrollArea.clientHeight;
    const progress = scrollable > 0 ? scrollArea.scrollTop / scrollable : 0;
    const clamped = Math.max(0, Math.min(1, progress));
    countBar.style.transform = `scaleX(${clamped})`;
    gaugeMark.style.top = `${clamped * 100}%`;
    gaugeVal.textContent = `${String(Math.round(clamped * DEPTH_METERS)).padStart(4, '0')}M`;
    setActive(Math.max(-1, Math.min(n, Math.round(progress * (n + 1)) - 1)));
  };

  /* ---------- case study: a single screen ---------- */

  const fadeIn = (element, delayMs) => {
    element.classList.add('wx-fadein');
    element.style.animationDelay = `${Math.max(0, delayMs)}ms`;
  };

  const playStudy = index => {
    const project = projects[index];
    study.style.setProperty('--wx-accent', ACCENT_CSS[index % ACCENT_CSS.length]);
    st.root.setAttribute('aria-label', `Case study: ${project.title}`);
    st.kicker.textContent = `CASE STUDY ${pad(index + 1)} / ${pad(n)} · ${project.period || 'SELECTED WORK'}`;

    scramble(st.title, project.title || '', reduced, 700);
    scramble(st.sub, project.subtitle || '', reduced, 800);

    const desc = project.overview || project.subtitle || '';
    const DESC_DELAY = 420;
    const CPS = 90;
    typeReveal(st.desc, desc, reduced, { delay: DESC_DELAY, cps: CPS });
    // tags and links arrive just as the last letters land
    const doneMs = reduced ? 0 : DESC_DELAY + (desc.length / CPS) * 1000;

    st.tags.replaceChildren(...(project.tech || []).slice(0, 6).map((tech, i) => {
      const span = document.createElement('span');
      span.textContent = tech;
      if (!reduced) fadeIn(span, doneMs - 250 + i * 70);
      return span;
    }));

    const links = projectLinks(project);
    const linkHTML = links.length
      ? links.map((l, i) => `<a href="${escapeHTML(l.url)}" target="_blank" rel="noopener noreferrer">-&gt; ${escapeHTML(l.label)} ↗</a>`).join('')
      : '<a href="#contact" data-portfolio-route="contact">-&gt; DISCUSS THIS PROJECT ↗</a>';
    st.links.innerHTML = `${linkHTML}<button type="button" data-wx-close>&lt;- CLOSE</button>`;
    st.links.classList.remove('wx-fadein');
    st.links.style.animationDelay = '';
    if (!reduced) fadeIn(st.links, doneMs + 100);
  };

  const closeStudy = () => {
    if (studyIndex < 0) return;
    cancelAnimationFrame(st.desc._wxRaf);
    clearTimeout(st.desc._wxT);
    studyIndex = -1;
    wheelAcc = 0;
    study.classList.remove('is-open');
    study.setAttribute('aria-hidden', 'true');
    shell.classList.remove('is-study');
    scrollArea.style.overflowY = '';
    world?.setFocus(-1);
    if (studyOpener?.isConnected) studyOpener.focus();
  };

  const openStudy = index => {
    if (!projects[index]) return;
    studyOpener = document.activeElement instanceof HTMLElement && container.contains(document.activeElement) ? document.activeElement : null;
    studyIndex = index;
    openedAt = performance.now();
    wheelAcc = 0;
    study.classList.add('is-open');
    study.setAttribute('aria-hidden', 'false');
    shell.classList.add('is-study');
    scrollArea.style.overflowY = 'hidden';
    playStudy(index);
    world?.setFocus(index);
    st.root.focus({ preventScroll: true });
  };

  // a short grace period after opening, so scroll momentum from the click can't close it at once
  const GRACE_MS = 700;

  const onKeydown = event => {
    if (studyIndex < 0) return;
    if (event.code === 'Escape') { closeStudy(); return; }
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp'].includes(event.code)) {
      if (performance.now() - openedAt > GRACE_MS) closeStudy();
      return;
    }
    if (event.code !== 'Tab') return;
    const focusable = [...study.querySelectorAll('button, a[href]')].filter(el => !el.hasAttribute('disabled') && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === st.root)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  // Scrolling past the case study ends it: one deliberate scroll returns to the normal view,
  // and the rest of the gesture carries on as ordinary scrolling (never stuck).
  const onWheel = event => {
    if (studyIndex < 0) return;
    if (performance.now() - openedAt < GRACE_MS) return;
    wheelAcc += event.deltaY;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAcc = 0; }, 220);
    if (Math.abs(wheelAcc) >= 60) closeStudy();
  };

  /* ---------- wiring ---------- */

  scrollArea.addEventListener('scroll', updateScroll, { passive: true });
  shell.addEventListener('wheel', onWheel, { passive: true });
  shell.addEventListener('touchstart', event => { if (studyIndex >= 0) touchY = event.touches[0].clientY; }, { passive: true });
  shell.addEventListener('touchend', event => {
    if (studyIndex < 0 || touchY == null) return;
    const dy = touchY - event.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) > 50 && performance.now() - openedAt > GRACE_MS) closeStudy();
  }, { passive: true });

  // the rail and index sit above the scroller, so hand their wheel events back
  const forwardWheel = event => scrollArea.scrollBy({ top: event.deltaY });
  rail.addEventListener('wheel', forwardWheel, { passive: true });
  tocEl.addEventListener('wheel', forwardWheel, { passive: true });

  container.querySelectorAll('.wx-hud [data-wx-go]').forEach(button => {
    button.addEventListener('click', () => scrollToChapter(Number(button.dataset.wxGo)));
  });
  openBtn.addEventListener('click', () => openStudy(Number(openBtn.dataset.wxOpen)));

  study.addEventListener('click', event => {
    if (event.target.closest('[data-wx-close]')) closeStudy();
  });

  window.addEventListener('keydown', onKeydown);

  updateScroll();
  requestAnimationFrame(() => { if (!disposed) updateScroll(); });

  requestAnimationFrame(() => {
    if (disposed || !canvas.isConnected) return;
    if (reduced) {
      canvas.hidden = true;
      container.classList.add('has-static-scene');
      return;
    }
    import('../workWorld.js').then(({ WorkWorld }) => {
      if (disposed || !canvas.isConnected) return;
      world = new WorkWorld(
        canvas,
        scrollArea,
        () => {
          const maxScroll = scrollArea.scrollHeight - scrollArea.clientHeight;
          return maxScroll > 0 ? scrollArea.scrollTop / maxScroll : 0;
        },
        {
          projects: projects.map((project, i) => ({
            id: project.id,
            title: project.title,
            subtitle: project.subtitle,
            period: project.period,
            tech: project.tech,
            overview: project.overview,
            image: project.image || project.cover || project.screenshot || null,
            progress: (i + 1) / (n + 1)
          })),
          onSelect: (_project, i) => openStudy(i)
        }
      );
      canvas._workWorld = world;
      if (studyIndex >= 0) world.setFocus(studyIndex);
    }).catch(error => {
      canvas.hidden = true;
      container.classList.add('has-static-scene');
      console.error('Failed to load the 3D work experience:', error);
    });
  });

  const removalObserver = new MutationObserver(() => {
    if (container.isConnected) return;
    disposed = true;
    cancelAnimationFrame(st.desc._wxRaf);
    clearTimeout(st.desc._wxT);
    clearTimeout(wheelTimer);
    world?.dispose();
    scrollArea.removeEventListener('scroll', updateScroll);
    window.removeEventListener('keydown', onKeydown);
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