import { resumeData } from '../../data/resumeData.js';

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

const pad = value => String(value).padStart(2, '0');
const DEPTH_METERS = 1200;

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
.wx-title{margin:.5em 0 .35em;font-family:var(--wx-serif);font-weight:400;font-size:clamp(30px,3.4vw,50px);line-height:1;letter-spacing:.01em;text-transform:uppercase}
.wx-sub{margin:0 0 1.2em;color:var(--wx-dim);font-size:11px;letter-spacing:.1em}
.wx-overview{margin:0 0 1.3em;line-height:1.8;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;font-size:11.5px}
.wx-tags{display:flex;flex-wrap:wrap;gap:4px 16px;margin:0 0 1.5em;color:var(--wx-dim);font-size:10.5px}
.wx-tags span::before{content:"-> "}
.wx-link{background:none;border:0;padding:0;color:var(--wx-ink);font:inherit;letter-spacing:.12em;text-transform:inherit;
  text-decoration:underline;text-underline-offset:6px;text-decoration-color:var(--wx-line);cursor:pointer;display:inline-block;transition:text-decoration-color .25s}
.wx-link:hover,.wx-link:focus-visible{text-decoration-color:#fff;outline:none}

.wx-pill{position:absolute;left:clamp(46px,5.2vw,78px);bottom:clamp(24px,5vh,44px);pointer-events:auto;display:inline-flex;align-items:center;
  padding:13px 24px;border:1px solid var(--wx-line);border-radius:999px;color:var(--wx-dim);text-decoration:none;font-size:11px;letter-spacing:.12em;
  background:rgba(6,14,22,.35);backdrop-filter:blur(6px);transition:color .25s,border-color .25s,background .25s}
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

/* case study: paged beats, no scrolling wall of text ------------- */
.wx-study{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .5s ease,visibility 0s .5s}
.wx-study.is-open{opacity:1;visibility:visible;transition:opacity .5s ease}
.wx-study-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(4,10,16,.92) 0,rgba(4,10,16,.78) 22%,rgba(4,10,16,0) 40%)}
.wx-study button,.wx-study a{pointer-events:auto}
.wx-study-hint{position:absolute;top:clamp(18px,4.5vh,40px);left:50%;transform:translateX(-50%);font-size:10px;color:var(--wx-dim);letter-spacing:.16em;white-space:nowrap}
.wx-study-close{position:absolute;top:clamp(18px,4.5vh,40px);left:clamp(64px,6vw,100px)}

.wx-beats{position:absolute;left:clamp(20px,2.4vw,34px);top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px}
.wx-beats button{background:none;border:0;padding:5px 0;cursor:pointer;display:block}
.wx-beats i{display:block;width:10px;height:1px;background:rgba(140,200,220,.35);transition:width .3s,background .3s}
.wx-beats button:hover i{background:#fff}
.wx-beats button.is-done i{width:16px;background:rgba(255,255,255,.65)}
.wx-beats button.is-active i{width:32px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.7)}

.wx-study-text{position:absolute;left:clamp(64px,6vw,100px);top:clamp(80px,13vh,120px);bottom:clamp(84px,14vh,124px);width:min(540px,calc(100% - 150px));
  display:flex;flex-direction:column;justify-content:center;pointer-events:none}
.wx-study-text li,.wx-study-text button,.wx-study-text a{pointer-events:auto}
.wx-beat-kicker{display:flex;align-items:center;gap:14px;margin:0 0 22px;color:var(--wx-dim);font-size:10.5px;letter-spacing:.16em}
.wx-beat-kicker::before{content:"";width:34px;height:1px;background:var(--wx-dim)}
.wx-beat-body.wx-in-d{animation:wx-beat-d .75s cubic-bezier(.2,.7,.2,1) both}
.wx-beat-body.wx-in-u{animation:wx-beat-u .75s cubic-bezier(.2,.7,.2,1) both}
@keyframes wx-beat-d{from{opacity:0;transform:translateY(28px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes wx-beat-u{from{opacity:0;transform:translateY(-28px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}

.wx-beat-title{margin:0 0 .3em;font-family:var(--wx-serif);font-weight:400;font-size:clamp(30px,3.6vw,54px);line-height:1.02;letter-spacing:.01em;text-transform:uppercase}
.wx-beat-sub{margin:0 0 1.4em;color:var(--wx-dim);font-size:11.5px;letter-spacing:.1em;line-height:1.7}
.wx-beat-text{margin:0;font-family:var(--wx-serif);font-weight:400;font-size:clamp(22px,2.4vw,34px);line-height:1.25;letter-spacing:0;text-transform:none;font-weight:300}
.wx-beat-text em{font-style:italic}
.wx-beat-hint{margin:2em 0 0;color:var(--wx-dim);font-size:10.5px;letter-spacing:.16em}
.wx-beat-hint span{display:inline-block;animation:wx-bob 1.8s ease-in-out infinite}

.wx-areas{list-style:none;margin:0;padding:0}
.wx-areas li{position:relative;display:grid;grid-template-columns:2.6em 1fr;gap:6px;padding:12px 0;border-top:1px solid rgba(140,200,220,.14);color:var(--wx-dim);
  font-size:12.5px;letter-spacing:.1em;line-height:1.5;cursor:default;transition:color .3s,padding-left .3s}
.wx-areas li::before{content:"";position:absolute;left:0;top:-1px;height:1px;width:0;background:#fff;transition:width .5s ease}
.wx-areas li.is-on{color:#fff;padding-left:10px}
.wx-areas li.is-on::before{width:100%}
.wx-areas li:last-child{border-bottom:1px solid rgba(140,200,220,.14)}
.wx-areas.is-dense li{padding:8px 0;font-size:11.5px}

.wx-lede{margin:0 0 1.6em;max-width:470px;color:#cfe0e8;font-family:var(--wx-serif);font-size:clamp(15px,1.25vw,18px);line-height:1.65;letter-spacing:.01em;text-transform:none;font-weight:300}
.wx-list{list-style:none;margin:0;padding:0}
.wx-list li{display:grid;grid-template-columns:2.8em 1fr;gap:6px;padding:16px 0;border-top:1px solid rgba(140,200,220,.18)}
.wx-list li:last-child{border-bottom:1px solid rgba(140,200,220,.18)}
.wx-list span{color:var(--wx-dim);font-size:11px;letter-spacing:.14em;padding-top:.5em}
.wx-list p{margin:0;color:#eaf2f6;font-family:var(--wx-serif);font-size:clamp(15px,1.3vw,19px);line-height:1.55;letter-spacing:.005em;text-transform:none;font-weight:400}
.wx-end-links{display:flex;flex-wrap:wrap;gap:12px 28px;margin-top:2em}
.wx-end-links a,.wx-end-links button{background:none;border:0;padding:0;color:var(--wx-ink);font:inherit;letter-spacing:.12em;text-transform:inherit;
  text-decoration:underline;text-underline-offset:6px;text-decoration-color:var(--wx-line);cursor:pointer}
.wx-end-links a:hover,.wx-end-links button:hover,.wx-end-links a:focus-visible,.wx-end-links button:focus-visible{text-decoration-color:#fff;outline:none}

.wx-study-foot{position:absolute;left:clamp(64px,6vw,100px);bottom:clamp(24px,5vh,44px);display:flex;align-items:center;gap:16px;color:var(--wx-dim);font-size:10.5px;letter-spacing:.14em}
.wx-step{width:38px;height:38px;border-radius:50%;border:1px solid var(--wx-line);background:rgba(6,14,22,.35);color:var(--wx-ink);font:inherit;font-size:14px;cursor:pointer;
  transition:background .2s,border-color .2s,opacity .2s}
.wx-step:hover:not(:disabled),.wx-step:focus-visible{background:rgba(90,170,210,.2);border-color:rgba(170,225,240,.7);outline:none}
.wx-step:disabled{opacity:.3;cursor:default}

@media (max-width:900px){
  .wx-toc{display:none}
}
@media (max-width:760px){
  .wx-rail,.wx-count,.wx-gauge,.wx-cue,.wx-beats{display:none}
  .wx-block{left:20px;bottom:92px;width:calc(100% - 40px)}
  .wx-intro{width:calc(100% - 40px)}
  .wx-pill{left:20px}
  .wx-study-scrim{background:linear-gradient(0deg,rgba(4,10,16,.95) 0,rgba(4,10,16,.86) 56%,rgba(4,10,16,.1) 82%,transparent)}
  .wx-study-text{left:20px;width:calc(100% - 40px);top:48%;bottom:84px;justify-content:flex-start}
  .wx-study-close,.wx-study-foot{left:20px}
  .wx-study-hint{display:none}
}
@media (prefers-reduced-motion:reduce){
  .wx-block,.wx-study,.wx-rail b,.wx-rail i,.wx-fade{transition:none}
  .wx-intro>*,.wx-cta span,.wx-cue i::after,.wx-beat-body,.wx-beat-hint span{animation:none!important}
}
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const GLYPHS = '▌▐░▒#/\\<>_-+*0123456789ABCDEFXYZ';
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

/* A case study is a sequence of beats: one idea per screen. */
const PAGE_SIZE = 3;
function pagesOf(section, items, symbol) {
  const pages = Math.ceil(items.length / PAGE_SIZE);
  return Array.from({ length: pages }, (_, page) => ({
    kind: 'list', section, symbol, page, pages, all: items,
    start: page * PAGE_SIZE, items: items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  }));
}
function buildBeats(project) {
  const beats = [{ kind: 'intro' }]; // title, stack and overview share the first page
  if (project.areas?.length) beats.push({ kind: 'areas', section: 'SYSTEM AREAS', items: project.areas });
  beats.push(...pagesOf('ENGINEERING APPROACH', project.implementation || [], '>'));
  beats.push(...pagesOf('PROJECT HIGHLIGHTS', project.highlights || [], '+'));
  beats.push({ kind: 'end' });
  return beats;
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export function createProjectsAppContent(initialProjectId = '') {
  const projects = resumeData.projects;
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
          <p class="wx-overview wx-info-overview"></p>
          <div class="wx-tags wx-info-tags"></div>
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
        <div class="wx-study-scrim"></div>
        <button class="wx-link wx-study-close" type="button" data-wx-close>&lt;- CLOSE</button>
        <div class="wx-study-hint">SCROLL OR ↑ ↓ TO READ · ESC TO CLOSE</div>
        <nav class="wx-beats" aria-label="Case study parts"></nav>
        <section class="wx-study-text" role="dialog" aria-modal="true" aria-label="Case study">
          <p class="wx-beat-kicker"></p>
          <div class="wx-beat-body"></div>
        </section>
        <div class="wx-study-foot">
          <button class="wx-step" type="button" data-wx-step="-1" aria-label="Previous">↑</button>
          <button class="wx-step" type="button" data-wx-step="1" aria-label="Next">↓</button>
          <span class="wx-study-count">01 / 01</span>
        </div>
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
  const overviewEl = q('.wx-info-overview');
  const tagsEl = q('.wx-info-tags');
  const openBtn = q('[data-wx-open]');
  const rail = q('.wx-rail');
  const railButtons = [...container.querySelectorAll('.wx-rail [data-wx-go]')];
  const countNow = q('.wx-count-now');
  const countBar = q('.wx-count-bar span');
  const gaugeMark = q('.wx-gauge-mark');
  const gaugeVal = q('.wx-gauge-val');
  const study = q('.wx-study');
  const studyText = q('.wx-study-text');
  const kickerEl = q('.wx-beat-kicker');
  const bodyEl = q('.wx-beat-body');
  const beatsNav = q('.wx-beats');
  const studyCount = q('.wx-study-count');
  const stepButtons = [...container.querySelectorAll('[data-wx-step]')];

  let world = null;
  let disposed = false;
  let current = -2;      // -1 intro, 0..n-1 project, n outro
  let studyIndex = -1;
  let studyOpener = null;
  let beats = [];
  let beatIndex = -1;
  let areaActive = 0;
  let areaTimer = 0;
  let lockUntil = 0;
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
    overviewEl.textContent = project.overview || '';
    tagsEl.replaceChildren(...(project.tech || []).slice(0, 6).map(tech => {
      const span = document.createElement('span');
      span.textContent = tech;
      return span;
    }));
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

  /* ---------- case study: beats ---------- */

  const stopAreaCycle = () => { clearInterval(areaTimer); areaTimer = 0; };

  const panelStateFor = (beat, index) => {
    if (!beat) return null;
    const meta = { beat: index + 1, beats: beats.length };
    if (beat.kind === 'areas') return { kind: 'areas', section: beat.section, items: beat.items, active: areaActive, ...meta };
    if (beat.kind === 'list') return { kind: 'list', section: beat.section, items: beat.all, active: beat.start, activeEnd: beat.start + beat.items.length - 1, symbol: beat.symbol, ...meta };
    return null;
  };

  const setAreaActive = (value, quiet = true) => {
    const beat = beats[beatIndex];
    if (beat?.kind !== 'areas') return;
    areaActive = (value + beat.items.length) % beat.items.length;
    bodyEl.querySelectorAll('[data-wx-area]').forEach(row => row.classList.toggle('is-on', Number(row.dataset.wxArea) === areaActive));
    world?.setPanelState(studyIndex, panelStateFor(beat, beatIndex), 0, quiet);
  };

  const kickerFor = (beat, project) => {
    if (beat.kind === 'intro') return `CASE STUDY ${pad(studyIndex + 1)} / ${pad(n)} · ${escapeHTML(project.period || 'SELECTED WORK')}`;
    if (beat.kind === 'end') return 'END OF CASE STUDY';
    if (beat.pages > 1) return `${beat.section} — ${pad(beat.page + 1)} / ${pad(beat.pages)}`;
    return beat.section;
  };

  const bodyFor = (beat, project) => {
    switch (beat.kind) {
      case 'intro':
        return `
          <h2 class="wx-beat-title">${escapeHTML(project.title)}</h2>
          <p class="wx-beat-sub">${escapeHTML(project.subtitle || '')}</p>
          ${project.overview ? `<p class="wx-lede">${escapeHTML(project.overview)}</p>` : ''}
          <div class="wx-tags">${(project.tech || []).map(t => `<span>${escapeHTML(t)}</span>`).join('')}</div>
          <p class="wx-beat-hint"><span aria-hidden="true">↓</span> SCROLL TO READ THE BUILD</p>`;
      case 'areas':
        return `<ul class="wx-areas ${beat.items.length > 8 ? 'is-dense' : ''}">${beat.items.map((item, i) =>
          `<li data-wx-area="${i}" class="${i === areaActive ? 'is-on' : ''}"><span>${pad(i + 1)}</span>${escapeHTML(item)}</li>`).join('')}</ul>`;
      case 'list':
        return `<ol class="wx-list">${beat.items.map((item, i) => `<li><span>${pad(beat.start + i + 1)}</span><p>${escapeHTML(item)}</p></li>`).join('')}</ol>`;
      case 'end':
        return `
          <p class="wx-beat-text">Want to talk about<br><em>this build?</em></p>
          <div class="wx-end-links">
            <a href="#contact" data-portfolio-route="contact">DISCUSS THIS PROJECT ↗</a>
            ${n > 1 ? '<button type="button" data-wx-next>NEXT PROJECT -&gt;</button>' : ''}
            <button type="button" data-wx-close>&lt;- CLOSE</button>
          </div>`;
      default:
        return `<p class="wx-beat-text">${escapeHTML(beat.text)}</p>`;
    }
  };

  const goBeat = (next, direction = 1) => {
    if (next < 0 || next >= beats.length || next === beatIndex) return;
    const project = projects[studyIndex];
    const beat = beats[next];
    beatIndex = next;
    stopAreaCycle();
    if (beat.kind === 'areas') areaActive = 0;

    kickerEl.innerHTML = kickerFor(beat, project);
    bodyEl.innerHTML = bodyFor(beat, project);
    bodyEl.className = 'wx-beat-body';
    void bodyEl.offsetWidth; // restart the entrance animation
    if (!reduced) bodyEl.classList.add(direction >= 0 ? 'wx-in-d' : 'wx-in-u');

    [...beatsNav.children].forEach((button, i) => {
      button.classList.toggle('is-active', i === next);
      button.classList.toggle('is-done', i < next);
    });
    studyCount.textContent = `${pad(next + 1)} / ${pad(beats.length)}`;
    stepButtons.forEach(button => { button.disabled = Number(button.dataset.wxStep) < 0 ? next === 0 : next === beats.length - 1; });

    world?.setPanelState(studyIndex, panelStateFor(beat, next), direction >= 0 ? 1 : -1);
    if (beat.kind === 'areas' && !reduced) {
      areaTimer = setInterval(() => setAreaActive(areaActive + 1, true), 1700);
    }
  };

  const step = direction => goBeat(beatIndex + direction, direction);

  const startStudy = index => {
    studyIndex = index;
    beats = buildBeats(projects[index]);
    beatIndex = -1;
    areaActive = 0;
    studyText.setAttribute('aria-label', `Case study: ${projects[index].title}`);
    beatsNav.innerHTML = beats.map((_, i) => `<button type="button" data-wx-beat="${i}" aria-label="Part ${i + 1} of ${beats.length}"><i></i></button>`).join('');
    goBeat(0, 1);
  };

  const closeStudy = () => {
    if (studyIndex < 0) return;
    stopAreaCycle();
    world?.setPanelState(studyIndex, null, 0, true);
    studyIndex = -1;
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
    study.classList.add('is-open');
    study.setAttribute('aria-hidden', 'false');
    shell.classList.add('is-study');
    scrollArea.style.overflowY = 'hidden';
    startStudy(index);
    world?.setFocus(index);
    q('.wx-study-close').focus({ preventScroll: true });
  };

  // fly on to the next project without leaving the case-study view
  const nextProject = () => {
    const next = (studyIndex + 1) % n;
    stopAreaCycle();
    world?.setPanelState(studyIndex, null, 0, true);
    scrollToChapter(next);
    startStudy(next);
    world?.setFocus(next);
  };

  const onKeydown = event => {
    if (studyIndex < 0) return;
    if (event.code === 'Escape') { closeStudy(); return; }
    if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.code)) { event.preventDefault(); step(1); return; }
    if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.code)) { event.preventDefault(); step(-1); return; }
    if (event.code !== 'Tab') return;
    const focusable = [...study.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.hasAttribute('disabled') && el.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  // one gesture = one beat (locked briefly so trackpad momentum can't skip ahead)
  const onWheel = event => {
    if (studyIndex < 0) return;
    const now = performance.now();
    if (now < lockUntil || Math.abs(event.deltaY) < 8) return;
    lockUntil = now + 750;
    step(event.deltaY > 0 ? 1 : -1);
  };

  /* ---------- wiring ---------- */

  scrollArea.addEventListener('scroll', updateScroll, { passive: true });
  shell.addEventListener('wheel', onWheel, { passive: true });
  shell.addEventListener('touchstart', event => { if (studyIndex >= 0) touchY = event.touches[0].clientY; }, { passive: true });
  shell.addEventListener('touchend', event => {
    if (studyIndex < 0 || touchY == null) return;
    const dy = touchY - event.changedTouches[0].clientY;
    touchY = null;
    if (Math.abs(dy) > 50) step(dy > 0 ? 1 : -1);
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
    const target = event.target;
    if (target.closest('[data-wx-close]')) { closeStudy(); return; }
    if (target.closest('[data-wx-next]')) { nextProject(); return; }
    const stepper = target.closest('[data-wx-step]');
    if (stepper) { step(Number(stepper.dataset.wxStep)); return; }
    const beat = target.closest('[data-wx-beat]');
    if (beat) { const i = Number(beat.dataset.wxBeat); goBeat(i, i > beatIndex ? 1 : -1); }
  });
  // hovering a system area lights its node on the panel
  bodyEl.addEventListener('mouseover', event => {
    const row = event.target.closest('[data-wx-area]');
    if (!row) return;
    stopAreaCycle();
    setAreaActive(Number(row.dataset.wxArea), true);
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
            image: project.image || project.cover || project.screenshot || null,
            progress: (i + 1) / (n + 1)
          })),
          onSelect: (_project, i) => openStudy(i)
        }
      );
      canvas._workWorld = world;
      if (studyIndex >= 0) {
        world.setFocus(studyIndex);
        world.setPanelState(studyIndex, panelStateFor(beats[beatIndex], beatIndex), 0, true);
      }
    }).catch(error => {
      canvas.hidden = true;
      container.classList.add('has-static-scene');
      console.error('Failed to load the 3D work experience:', error);
    });
  });

  const removalObserver = new MutationObserver(() => {
    if (container.isConnected) return;
    disposed = true;
    stopAreaCycle();
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