const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/workWorld-efV7bGtR.js","assets/three.module-Dnpy4-mC.js","assets/skillWorld-DkXcedVQ.js","assets/threeBackground-Cf50M5EV.js"])))=>i.map(i=>d[i]);
(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))n(o);new MutationObserver(o=>{for(const l of o)if(l.type==="childList")for(const d of l.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function s(o){const l={};return o.integrity&&(l.integrity=o.integrity),o.referrerPolicy&&(l.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?l.credentials="include":o.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function n(o){if(o.ep)return;o.ep=!0;const l=s(o);fetch(o.href,l)}})();const ma="modulepreload",ga=function(a){return"/"+a},Is={},jt=function(t,s,n){let o=Promise.resolve();if(s&&s.length>0){let d=function(w){return Promise.all(w.map(O=>Promise.resolve(O).then(k=>({status:"fulfilled",value:k}),k=>({status:"rejected",reason:k}))))};document.getElementsByTagName("link");const y=document.querySelector("meta[property=csp-nonce]"),u=(y==null?void 0:y.nonce)||(y==null?void 0:y.getAttribute("nonce"));o=d(s.map(w=>{if(w=ga(w),w in Is)return;Is[w]=!0;const O=w.endsWith(".css"),k=O?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${w}"]${k}`))return;const I=document.createElement("link");if(I.rel=O?"stylesheet":ma,O||(I.as="script"),I.crossOrigin="",I.href=w,u&&I.setAttribute("nonce",u),document.head.appendChild(I),O)return new Promise((N,R)=>{I.addEventListener("load",N),I.addEventListener("error",()=>R(new Error(`Unable to preload CSS for ${w}`)))})}))}function l(d){const y=new Event("vite:preloadError",{cancelable:!0});if(y.payload=d,window.dispatchEvent(y),!y.defaultPrevented)throw d}return o.then(d=>{for(const y of d||[])y.status==="rejected"&&l(y.reason);return t().catch(l)})};class fa{constructor(){this.enabled=!0,this.volume=.35,this.ctx=null,this.masterGain=null,this.worldAudio=null}init(){if(!this.ctx&&typeof window<"u"){const t=window.AudioContext||window.webkitAudioContext;t&&(this.ctx=new t,this.masterGain=this.ctx.createGain(),this.masterGain.gain.value=this.enabled?this.volume:0,this.masterGain.connect(this.ctx.destination))}}toggleSound(){return this.enabled=!this.enabled,this.masterGain&&this.ctx&&this.masterGain.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.04),this.enabled}setVolume(t){return this.volume=Math.min(1,Math.max(0,Number(t))),Number.isFinite(this.volume)||(this.volume=.35),this.masterGain&&this.ctx&&this.enabled&&this.masterGain.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.04),this.volume}startWorldAmbience(){if(!this.enabled||this.worldAudio||(this.init(),!this.ctx||!this.masterGain))return;const t=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),s=t.getChannelData(0);for(let u=0;u<s.length;u+=1)s[u]=(Math.random()*2-1)*.18;const n=this.ctx.createBufferSource();n.buffer=t,n.loop=!0;const o=this.ctx.createBiquadFilter();o.type="lowpass",o.frequency.value=420;const l=this.ctx.createGain();l.gain.value=.05,n.connect(o),o.connect(l),l.connect(this.masterGain);const d=this.ctx.createOscillator();d.type="sine",d.frequency.value=58;const y=this.ctx.createGain();y.gain.value=.018,d.connect(y),y.connect(this.masterGain),n.start(),d.start(),this.worldAudio={noise:n,filter:o,noiseGain:l,drone:d,droneGain:y,region:"lowlands"},this.ctx.resume().catch(u=>{console.error("Unable to start Signal Ridge ambience:",u)})}setWorldRegion(t,s=0){if(!this.worldAudio||!this.ctx)return;const n={lowlands:{cutoff:420,drone:58,noise:.035},riverlands:{cutoff:780,drone:72,noise:.075},ashen:{cutoff:250,drone:49,noise:.028},ashenCoast:{cutoff:880,drone:66,noise:.068},fossil:{cutoff:1100,drone:64,noise:.06},signal:{cutoff:560,drone:82,noise:.048},highPass:{cutoff:1350,drone:92,noise:.065},motorYard:{cutoff:340,drone:54,noise:.025}},o=n[t]??n.lowlands,l=this.ctx.currentTime;this.worldAudio.filter.frequency.setTargetAtTime(o.cutoff,l,1.4),this.worldAudio.drone.frequency.setTargetAtTime(o.drone,l,1.4),this.worldAudio.noiseGain.gain.setTargetAtTime(o.noise+Math.min(.035,Math.abs(s)*.001),l,.5),this.worldAudio.region=t}stopWorldAmbience(){this.worldAudio&&(this.worldAudio.noise.stop(),this.worldAudio.drone.stop(),this.worldAudio=null)}playKeySound(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.createOscillator(),s=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(600+Math.random()*200,this.ctx.currentTime),s.gain.setValueAtTime(.015,this.ctx.currentTime),s.gain.exponentialRampToValueAtTime(1e-4,this.ctx.currentTime+.04),t.connect(s),s.connect(this.masterGain),t.start(),t.stop(this.ctx.currentTime+.04)}catch{}}playWindowOpen(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.currentTime,s=this.ctx.createOscillator(),n=this.ctx.createGain();s.type="triangle",s.frequency.setValueAtTime(320,t),s.frequency.exponentialRampToValueAtTime(640,t+.12),n.gain.setValueAtTime(.04,t),n.gain.exponentialRampToValueAtTime(.001,t+.14),s.connect(n),n.connect(this.masterGain),s.start(t),s.stop(t+.14)}catch{}}playWindowClose(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.currentTime,s=this.ctx.createOscillator(),n=this.ctx.createGain();s.type="sine",s.frequency.setValueAtTime(520,t),s.frequency.exponentialRampToValueAtTime(260,t+.1),n.gain.setValueAtTime(.03,t),n.gain.exponentialRampToValueAtTime(.001,t+.1),s.connect(n),n.connect(this.masterGain),s.start(t),s.stop(t+.1)}catch{}}playSuccess(){if(this.enabled&&(this.init(),!!this.ctx))try{[440,554.37,659.25,880].forEach((s,n)=>{const o=this.ctx.currentTime+n*.08,l=this.ctx.createOscillator(),d=this.ctx.createGain();l.type="triangle",l.frequency.setValueAtTime(s,o),d.gain.setValueAtTime(.05,o),d.gain.exponentialRampToValueAtTime(.001,o+.18),l.connect(d),d.connect(this.masterGain),l.start(o),l.stop(o+.18)})}catch{}}playHonk(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.currentTime;[380,475].forEach(s=>{const n=this.ctx.createOscillator(),o=this.ctx.createGain();n.type="sawtooth",n.frequency.setValueAtTime(s,t),o.gain.setValueAtTime(.06,t),o.gain.exponentialRampToValueAtTime(.001,t+.22),n.connect(o),o.connect(this.masterGain),n.start(t),n.stop(t+.22)})}catch{}}playCrash(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.currentTime,s=this.ctx.createOscillator(),n=this.ctx.createGain();s.type="triangle",s.frequency.setValueAtTime(140,t),s.frequency.exponentialRampToValueAtTime(40,t+.15),n.gain.setValueAtTime(.12,t),n.gain.exponentialRampToValueAtTime(.001,t+.16),s.connect(n),n.connect(this.masterGain),s.start(t),s.stop(t+.16)}catch{}}playDiscovery(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.currentTime;[523.25,659.25,783.99,1046.5].forEach((s,n)=>{const o=this.ctx.createOscillator(),l=this.ctx.createGain();o.type="sine",o.frequency.setValueAtTime(s,t+n*.05),l.gain.setValueAtTime(.05,t+n*.05),l.gain.exponentialRampToValueAtTime(1e-4,t+n*.05+.3),o.connect(l),l.connect(this.masterGain),o.start(t+n*.05),o.stop(t+n*.05+.3)})}catch{}}playSignal(t){if(!this.enabled||(this.init(),!this.ctx))return;const n={trailhead:392,crossing:440,settlement:494,bones:523.25,signal:587.33,"high-pass":659.25}[t];if(!n)return;const o=this.ctx.currentTime,l=this.ctx.createOscillator(),d=this.ctx.createGain();l.type="sine",l.frequency.setValueAtTime(n*.72,o),l.frequency.exponentialRampToValueAtTime(n,o+.32),d.gain.setValueAtTime(1e-4,o),d.gain.exponentialRampToValueAtTime(.08,o+.08),d.gain.exponentialRampToValueAtTime(1e-4,o+1.25),l.connect(d),d.connect(this.masterGain),l.start(o),l.stop(o+1.26)}playWhoosh(){if(this.enabled&&(this.init(),!!this.ctx))try{const t=this.ctx.currentTime,s=this.ctx.createOscillator(),n=this.ctx.createGain();s.type="sine",s.frequency.setValueAtTime(200,t),s.frequency.exponentialRampToValueAtTime(450,t+.12),n.gain.setValueAtTime(.03,t),n.gain.exponentialRampToValueAtTime(.001,t+.15),s.connect(n),n.connect(this.masterGain),s.start(t),s.stop(t+.15)}catch{}}}const se=new fa,Ne={terminal:`
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <defs>
        <linearGradient id="termGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#0284c7"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#termGrad)"/>
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
      <path d="M18 22L28 32L18 42" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="32" y1="42" x2="46" y2="42" stroke="#4ade80" stroke-width="4" stroke-linecap="round"/>
    </svg>
  `,projects:`
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <defs>
        <linearGradient id="projGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4c1d95"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#projGrad)"/>
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
      <path d="M32 16L48 24L32 32L16 24L32 16Z" stroke="#a78bfa" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="rgba(167,139,250,0.2)"/>
      <path d="M16 32L32 40L48 32" stroke="#c4b5fd" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M16 40L32 48L48 40" stroke="#ddd6fe" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,resume:`
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <defs>
        <linearGradient id="resGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0369a1"/>
          <stop offset="100%" stop-color="#0ea5e9"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#resGrad)"/>
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
      <rect x="20" y="14" width="24" height="36" rx="4" fill="rgba(255,255,255,0.15)" stroke="#fff" stroke-width="2.5"/>
      <line x1="26" y1="22" x2="38" y2="22" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="26" y1="28" x2="38" y2="28" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="26" y1="34" x2="34" y2="34" stroke="#bae6fd" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="36" cy="40" r="4" fill="#38bdf8"/>
    </svg>
  `,skills:`
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <defs>
        <linearGradient id="skillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#065f46"/>
          <stop offset="100%" stop-color="#10b981"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#skillGrad)"/>
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
      <path d="M22 24L14 32L22 40" stroke="#6ee7b7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M42 24L50 32L42 40" stroke="#6ee7b7" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <line x1="35" y1="20" x2="29" y2="44" stroke="#a7f3d0" stroke-width="3.5" stroke-linecap="round"/>
    </svg>
  `,contact:`
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <defs>
        <linearGradient id="cntGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#be185d"/>
          <stop offset="100%" stop-color="#f43f5e"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cntGrad)"/>
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
      <rect x="16" y="20" width="32" height="24" rx="4" stroke="#fff" stroke-width="2.5" fill="rgba(255,255,255,0.15)"/>
      <path d="M17 22L32 33L47 22" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,snapLeft:'<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',snapRight:'<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>'};class ya{constructor(t,s){var n,o;this.desktop=t,this.dock=(n=s==null?void 0:s.classList)!=null&&n.contains("os-dock-container")?s:((o=s==null?void 0:s.closest)==null?void 0:o.call(s,".os-dock-container"))||document.querySelector(".os-dock-container"),this.windows=new Map,this.activeWindow=null,this.highestZIndex=100,this.cascadeOffset=0,window.addEventListener("resize",()=>this.constrainWindowsToViewport())}createWindow({id:t,title:s,iconSvg:n,content:o,width:l=850,height:d=580,isTerminal:y=!1}){if(this.windows.has(t)){const P=this.windows.get(t);return P.closeTimer!==null&&(clearTimeout(P.closeTimer),P.closeTimer=null,P.element.classList.remove("is-closing")),this.focusWindow(t),this.restoreWindow(t),P}const u=document.createElement("div"),w=["projects","resume","skills","contact"].includes(t),O=t==="projects"||t==="skills";u.className=`os-window ${y?"terminal-window-style":""} ${w?"portfolio-workspace":""} ${O?"portfolio-immersive-workspace":""}`,u.id=`win-${t}`;const k=window.innerWidth,I=window.innerHeight;let N=Math.min(l,k-32),R=Math.min(d,I-100),v,M;O?(N=k,R=I,v=0,M=0):(v=Math.max(20,Math.floor((k-N)/2)+this.cascadeOffset),M=Math.max(40,Math.floor((I-R)/2-20)+this.cascadeOffset),this.cascadeOffset=(this.cascadeOffset+24)%120),u.style.width=`${N}px`,u.style.height=`${R}px`,u.style.left=`${v}px`,u.style.top=`${M}px`,this.highestZIndex+=1,u.style.zIndex=this.highestZIndex,u.innerHTML=`
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
          <span class="window-title-icon">${n||""}</span>
          <span class="window-title-text">${s}</span>
        </div>

        <div class="window-utility-bar">
          <button class="utility-btn" title="Snap Left (50%)" data-action="snap-left">
            ${Ne.snapLeft}
          </button>
          <button class="utility-btn" title="Snap Right (50%)" data-action="snap-right">
            ${Ne.snapRight}
          </button>
        </div>
      </div>

      <div class="window-body">
        ${typeof o=="string"?o:""}
      </div>

      <div class="window-resize-handle"></div>
    `,typeof o!="string"&&o instanceof HTMLElement&&u.querySelector(".window-body").appendChild(o),this.desktop.appendChild(u);const H={id:t,title:s,iconSvg:n,element:u,preferredWidth:l,preferredHeight:d,isMaximized:!1,isMinimized:!1,closeTimer:null,prevBounds:null};return this.windows.set(t,H),this.setupWindowEvents(H),this.focusWindow(t),this.updateDockState(),se.playWindowOpen(),H}constrainWindowsToViewport(){this.windows.forEach(t=>{const{element:s}=t;if(t.isMaximized||s.style.width.startsWith("calc("))return;const n=Math.min(t.preferredWidth,window.innerWidth-16),o=Math.min(t.preferredHeight,window.innerHeight-80),l=s.classList.contains("portfolio-immersive-workspace"),d=l?Math.max(8,Math.floor((window.innerWidth-n)/2)):Math.min(Math.max(8,parseFloat(s.style.left)||0),window.innerWidth-n-8),y=l?Math.max(36,Math.floor((window.innerHeight-o)/2-20)):Math.min(Math.max(36,parseFloat(s.style.top)||0),window.innerHeight-o-44);s.style.width=`${n}px`,s.style.height=`${o}px`,s.style.left=`${d}px`,s.style.top=`${y}px`})}setupWindowEvents(t){const{id:s,element:n}=t,o=n.querySelector(".window-header");n.addEventListener("mousedown",()=>this.focusWindow(s)),o.addEventListener("click",L=>{const J=L.target.closest("button");if(!J)return;const K=J.dataset.action;K==="close"&&this.closeWindow(s),K==="minimize"&&this.minimizeWindow(s),K==="maximize"&&this.toggleMaximize(s),K==="snap-left"&&this.snapWindow(s,"left"),K==="snap-right"&&this.snapWindow(s,"right")}),o.addEventListener("dblclick",L=>{L.target.closest("button")||this.toggleMaximize(s)});let l=!1,d,y,u,w;const O=L=>{L.target.closest("button")||t.isMaximized||(l=!0,d=L.clientX||L.touches&&L.touches[0].clientX,y=L.clientY||L.touches&&L.touches[0].clientY,u=parseInt(n.style.left,10)||0,w=parseInt(n.style.top,10)||0,n.classList.add("is-dragging"),document.addEventListener("mousemove",k),document.addEventListener("mouseup",I),document.addEventListener("touchmove",k),document.addEventListener("touchend",I))},k=L=>{if(!l)return;const J=L.clientX||L.touches&&L.touches[0].clientX,K=L.clientY||L.touches&&L.touches[0].clientY,le=J-d,S=K-y;let m=u+le,E=w+S;E=Math.max(34,E),m=Math.max(-n.offsetWidth+80,Math.min(m,window.innerWidth-80)),n.style.left=`${m}px`,n.style.top=`${E}px`},I=()=>{l&&(l=!1,n.classList.remove("is-dragging"),document.removeEventListener("mousemove",k),document.removeEventListener("mouseup",I),document.removeEventListener("touchmove",k),document.removeEventListener("touchend",I))};o.addEventListener("mousedown",O),o.addEventListener("touchstart",O,{passive:!0});const N=n.querySelector(".window-resize-handle");let R=!1,v,M;const H=L=>{t.isMaximized||(L.stopPropagation(),R=!0,d=L.clientX,y=L.clientY,v=n.offsetWidth,M=n.offsetHeight,document.addEventListener("mousemove",P),document.addEventListener("mouseup",Z))},P=L=>{if(!R)return;const J=Math.max(360,v+(L.clientX-d)),K=Math.max(260,M+(L.clientY-y));n.style.width=`${J}px`,n.style.height=`${K}px`},Z=()=>{R=!1,document.removeEventListener("mousemove",P),document.removeEventListener("mouseup",Z)};N.addEventListener("mousedown",H)}snapWindow(t,s){const n=this.windows.get(t);n&&(n.element.style.top="36px",n.element.style.height="calc(100vh - 100px)",n.element.style.width="calc(50vw - 12px)",s==="left"?n.element.style.left="6px":n.element.style.left="50vw")}focusWindow(t){const s=this.windows.get(t);!s||s.element.classList.contains("is-closing")||(this.highestZIndex+=1,s.element.style.zIndex=this.highestZIndex,this.windows.forEach(n=>{n.element.classList.remove("active-window")}),s.element.classList.add("active-window"),this.activeWindow=t,this.updateImmersiveState(),this.updateDockState())}toggleMaximize(t){const s=this.windows.get(t);s&&(s.isMaximized?(s.element.style.width=`${s.prevBounds.width}px`,s.element.style.height=`${s.prevBounds.height}px`,s.element.style.left=`${s.prevBounds.left}px`,s.element.style.top=`${s.prevBounds.top}px`,s.element.classList.remove("is-maximized"),s.isMaximized=!1):(s.prevBounds={width:s.element.offsetWidth,height:s.element.offsetHeight,left:parseInt(s.element.style.left,10),top:parseInt(s.element.style.top,10)},s.element.style.left="0px",s.element.style.top="36px",s.element.style.width="100vw",s.element.style.height="calc(100vh - 96px)",s.element.classList.add("is-maximized"),s.isMaximized=!0))}minimizeWindow(t){const s=this.windows.get(t);if(s){if(s.element.classList.add("is-minimized"),s.isMinimized=!0,this.activeWindow===t){const n=[...this.windows.values()].filter(o=>o.id!==t&&!o.isMinimized&&!o.element.classList.contains("is-closing")).sort((o,l)=>Number(l.element.style.zIndex)-Number(o.element.style.zIndex))[0];this.activeWindow=n?n.id:null}this.updateImmersiveState(),this.updateDockState(),se.playWindowClose()}}restoreWindow(t){const s=this.windows.get(t);s&&(s.element.classList.remove("is-minimized"),s.isMinimized=!1,this.focusWindow(t))}closeWindow(t){const s=this.windows.get(t);!s||s.element.classList.contains("is-closing")||(s.element.classList.add("is-closing"),se.playWindowClose(),s.closeTimer=setTimeout(()=>{if(s.closeTimer=null,this.windows.get(t)===s){if(s.element.parentNode&&s.element.parentNode.removeChild(s.element),this.windows.delete(t),this.updateDockState(),this.onWindowClosed&&this.onWindowClosed(t),this.activeWindow===t){const n=[...this.windows.values()].filter(o=>!o.isMinimized&&!o.element.classList.contains("is-closing")).sort((o,l)=>Number(l.element.style.zIndex)-Number(o.element.style.zIndex))[0];n?this.focusWindow(n.id):this.activeWindow=null}this.updateImmersiveState(),this.updateDockState()}},200))}updateImmersiveState(){const t=this.activeWindow&&this.windows.get(this.activeWindow),s=!!(t&&!t.isMinimized&&!t.element.classList.contains("is-closing")&&t.element.classList.contains("portfolio-immersive-workspace"));this.desktop.classList.toggle("immersive-experience-active",s),this.desktop.classList.toggle("skills-experience-active",s&&t.id==="skills")}updateDockState(){if(!this.dock)return;this.dock.querySelectorAll("[data-launch-app]").forEach(s=>{const n=s.dataset.launchApp,o=this.windows.get(n),l=!!(o&&!o.element.classList.contains("is-closing")),d=l&&this.activeWindow===n&&!o.isMinimized,y=l&&o.isMinimized;s.classList.toggle("is-open",l),s.classList.toggle("is-active",d),s.classList.toggle("is-minimized",y),d?s.setAttribute("aria-current","true"):s.removeAttribute("aria-current")})}}const C={personal:{name:"Aditya Shinde",title:"Backend / Full-Stack Software Engineer",email:"aditya12rash@gmail.com",phone:"(+91) 9324284783",location:"Virar, Maharashtra - 401303",githubUrl:"https://github.com/AdityaShinde-git",linkedinUrl:"https://linkedin.com/in/aditya-shinde-5a031b305",cgpa:"8.0 / 10",degree:"Bachelor of Science in Information Technology",university:"University of Mumbai",educationPeriod:"Aug 2022 – Apr 2025",summary:"Backend / Full-Stack Software Engineer experienced in building and maintaining production web applications, REST APIs, business modules, and database-driven systems. Strong experience with PHP, Laravel, CodeIgniter 4, MySQL, PostgreSQL, React, JavaScript, and TypeScript, with additional experience building Rust-based real-time CDC and data synchronization systems. Experienced in MVC architecture, RBAC, audit trails, CRUD workflows, email automation, and production feature development."},experience:[{id:"vk-lalco",company:"V.K. Lalco",role:"Software Developer",period:"Jun 2026 – Present",status:"Current Role",technologies:["PHP","Laravel","CodeIgniter","MySQL","PostgreSQL","React","JavaScript","TypeScript"],highlights:["Developed and maintained production web applications using PHP, Laravel, CodeIgniter, MySQL, PostgreSQL, React, JavaScript, and TypeScript.","Designed and developed a centralized Update Management System (UMS) to track module-level changes, responsible users, timestamps, and detailed audit trails across the application.","Implemented role-based access control (RBAC) for UMS and application features, ensuring users could access actions and data according to their roles and permissions.","Built an integrated email workflow for completed module updates, supporting configurable recipients, CC, BCC, delivery status, and system-generated notifications.","Added and maintained new features across existing modules, including backend logic, database changes, REST APIs, validation, and frontend updates.","Worked on production fixes, feature enhancements, database operations, and application maintenance while ensuring existing functionality remained stable."]},{id:"volody",company:"Volody",role:"Software Developer Intern",period:"Mar 2026 – Jun 2026",status:"Internship",technologies:["PHP","Laravel","React","JavaScript","TypeScript","MySQL","PostgreSQL"],highlights:["Developed and maintained production features using PHP, Laravel, React, JavaScript, TypeScript, MySQL, and PostgreSQL.","Built and integrated REST APIs for application features and backend business workflows.","Worked on database-driven features, query optimization, validation, CRUD operations, and application-level business logic.","Resolved production issues and implemented enhancements across existing modules while following MVC and maintainable coding practices."]},{id:"k2s2",company:"K2S2 Digistrat",role:"Software Developer Intern",period:"Sep 2025 – Feb 2026",status:"Internship",technologies:["CodeIgniter 4","PHP","Rust","REST APIs"],highlights:["Built and integrated REST APIs for production systems and developed database-driven features using CodeIgniter 4.","Developed a Lead Management System with relational data, nested CRUD operations, validation, and reusable backend business logic.","Contributed to a Railway Management System through database schema updates, backend changes, and user-interface enhancements.","Built a Rust-based Data Sync Platform supporting bulk data migration and real-time Change Data Capture (CDC) operations."]}],projects:[{id:"oms-hrms",title:"Office / HR Management System (OMS)",subtitle:"Full-stack HR management platform",overview:"A full-stack HRMS covering employee management, attendance, leave, payroll, holidays, announcements, tickets, and self-service.",areas:["Employee management","Attendance","Leave","Payroll","Holidays","Announcements","Tickets & self-service"],tech:["PHP","CodeIgniter 4","MySQL","Bootstrap 5"],highlights:["Built a full-stack HR management system across multiple interconnected workplace modules."],implementation:["MVC + Service architecture with thin controllers, reusable business logic, validation, and database-driven workflows.","Role-based access control with roles, permissions, route-level authorization, and audit logging for significant operations.","REST-based backend workflows and CRUD operations across multiple modules."],source:"Resume · Projects"},{id:"dafca-chat",title:"Dafca – Real-Time Chat Application",subtitle:"Real-time messaging with persistent conversations and file sharing",overview:"A real-time messaging platform with persistent conversations, file sharing, and backend APIs for real-time communication.",areas:["Persistent conversations","File sharing","Backend APIs"],tech:["React","Express.js","MongoDB"],period:"Jan 2025 – Apr 2025",highlights:["Built a real-time messaging platform using React, Express.js, and MongoDB."],source:"Resume · Projects"}],skills:{languages:["PHP","JavaScript","TypeScript","Rust","Python","C++"],backend:["Laravel","CodeIgniter 4","Node.js","Express.js","REST APIs","MVC","CRUD","Authentication","RBAC"],frontend:["React.js","TypeScript","JavaScript","HTML","CSS","Bootstrap","Material UI"],databases:["MySQL","PostgreSQL","MongoDB","Oracle"],architecture:["Service Layer","Role-Based Access Control","Audit Logging","API Integration","Real-Time Data Systems","Change Data Capture (CDC)"],toolsAndDevops:["Git","Docker","VMware","Android Studio","Postman"]}},Ms=["about","experience","projects","skills","resume.pdf","contact"];function $(a){return String(a).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}class ba{constructor(t,s){this.container=t,this.wm=s,this.history=[],this.historyIndex=-1,this.commands={},this.initDOM(),this.registerCommands()}initDOM(){this.container.innerHTML=`
      <div class="terminal-body" id="term-body">
        <header class="terminal-welcome">
          <span class="terminal-kicker">ADITYA SHINDE / PORTFOLIO CONSOLE</span>
          <p>A command-line index to the projects, experience, and resume on this site.</p>
          <p class="terminal-hint">Type <kbd>help</kbd> to see commands, or <kbd>open work</kbd> to browse selected work.</p>
        </header>
        <div id="term-output" aria-live="polite"></div>
        <div class="term-input-line">
          <label class="term-prompt" for="term-input"><span aria-hidden="true">$</span><span>aditya</span></label>
          <input type="text" class="term-input" id="term-input" autocomplete="off" spellcheck="false" aria-label="Enter a portfolio command" placeholder="Type a command…" autofocus />
        </div>
      </div>
    `,this.output=this.container.querySelector("#term-output"),this.input=this.container.querySelector("#term-input"),this.body=this.container.querySelector("#term-body"),this.setupListeners()}setupListeners(){this.container.addEventListener("click",t=>{t.target!==this.input&&!t.target.closest("a")&&this.input.focus()}),this.input.addEventListener("keydown",t=>{if(t.key==="Enter"){const s=this.input.value.trim();this.input.value="",s&&(this.history.push(s),this.historyIndex=this.history.length,this.executeCommand(s))}else t.key==="ArrowUp"?(t.preventDefault(),this.historyIndex>0&&(this.input.value=this.history[--this.historyIndex])):t.key==="ArrowDown"?(t.preventDefault(),this.historyIndex<this.history.length-1?this.input.value=this.history[++this.historyIndex]:(this.historyIndex=this.history.length,this.input.value="")):t.key==="Tab"&&(t.preventDefault(),this.handleTabAutocomplete());(t.key.length===1||t.key==="Backspace")&&se.playKeySound()})}handleTabAutocomplete(){const t=this.input.value.trim().toLowerCase();if(!t)return;const s=[...Object.keys(this.commands),...Ms],n=[...new Set(s)].filter(o=>o.startsWith(t));n.length===1?this.input.value=n[0]:n.length>1&&this.printLine(`Suggestions: ${n.map($).join(" · ")}`,"term-muted")}registerCommands(){this.commands={help:()=>this.cmdHelp(),about:()=>this.cmdAbout(),bio:()=>this.cmdAbout(),skills:()=>this.cmdSkills(),experience:()=>this.cmdExperience(),work:()=>this.cmdProjects(),projects:()=>this.cmdProjects(),open:t=>this.cmdOpen(t),ls:()=>this.cmdList(),cat:t=>this.cmdRead(t),contact:()=>this.cmdContact(),hire:()=>this.cmdContact(),clear:()=>this.cmdClear(),whoami:()=>this.printLine(`${$(C.personal.name)} — ${$(C.personal.title)}`),date:()=>this.printLine($(new Date().toLocaleString())),echo:t=>this.printLine($(t.join(" ")))}}executeCommand(t){this.printPromptLine(t);const[s,...n]=t.split(/\s+/),o=this.commands[s.toLowerCase()];o?o(n):this.printLine(`Unknown command: ${$(s)}. Type <span class="term-command">help</span> for the available commands.`,"term-error")}printPromptLine(t){const s=document.createElement("div");s.className="term-command-line",s.innerHTML=`<span class="term-command-prompt">$ aditya</span><span>${$(t)}</span>`,this.output.appendChild(s),this.scrollToBottom()}printLine(t,s=""){const n=document.createElement("div");n.className=`term-line ${s}`,n.innerHTML=t,this.output.appendChild(n),this.scrollToBottom()}scrollToBottom(){this.body.scrollTop=this.body.scrollHeight}cmdHelp(){const t=[["about","Read the professional summary"],["experience","Browse roles and documented contributions"],["projects","View projects listed on the resume"],["skills","List the resume skills by category"],["open [section]","Open work, resume, skills, contact, or terminal"],["ls","List the available portfolio sections"],["cat [section]","Read about, skills, projects, experience, or resume PDF"],["contact","Show direct contact details"],["date","Show the current local date and time"],["clear","Clear the console"]];this.printLine(`<section class="term-card"><h2>COMMANDS</h2><dl>${t.map(([s,n])=>`<div><dt>${$(s)}</dt><dd>${$(n)}</dd></div>`).join("")}</dl></section>`)}cmdAbout(){this.printLine(`<section class="term-card"><h2>ABOUT</h2><p>${$(C.personal.summary)}</p></section>`)}cmdSkills(){const t=[["Languages",C.skills.languages],["Backend",C.skills.backend],["Frontend",C.skills.frontend],["Databases",C.skills.databases],["Architecture",C.skills.architecture],["Tools",C.skills.toolsAndDevops]];this.printLine(`<section class="term-card"><h2>SKILLS · RESUME INVENTORY</h2>${t.map(([s,n])=>`<div class="term-skill-group"><h3>${$(s)}</h3><p>${n.map($).join(" · ")}</p></div>`).join("")}</section>`)}cmdExperience(){this.printLine(`<section class="term-card"><h2>EXPERIENCE</h2>${C.experience.map(t=>`
      <article class="term-record">
        <h3>${$(t.role)} · ${$(t.company)}</h3>
        <p class="term-muted">${$(t.period)}</p>
        <ul>${t.highlights.map(s=>`<li>${$(s)}</li>`).join("")}</ul>
      </article>
    `).join("")}</section>`)}cmdProjects(){this.printLine(`<section class="term-card"><h2>PROJECTS · RESUME LISTING</h2>${C.projects.map(t=>`
      <article class="term-record">
        <h3>${$(t.title)}</h3>
        ${t.period?`<p class="term-muted">${$(t.period)}</p>`:""}
        <p>${$(t.tech.join(" · "))}</p>
        <ul>${t.highlights.map(s=>`<li>${$(s)}</li>`).join("")}</ul>
      </article>
    `).join("")}</section>`)}cmdList(){this.printLine(`<section class="term-card"><h2>AVAILABLE PORTFOLIO SECTIONS</h2><ul class="term-section-list">${Ms.map(t=>`<li>${$(t)}</li>`).join("")}</ul><p class="term-muted">Use <code>open [section]</code> to navigate.</p></section>`)}cmdRead(t){const s=(t[0]||"").toLowerCase(),n={about:()=>this.cmdAbout(),skills:()=>this.cmdSkills(),experience:()=>this.cmdExperience(),projects:()=>this.cmdProjects(),work:()=>this.cmdProjects()};n[s]?n[s]():s==="resume.pdf"||s==="resume"?this.printLine('<a class="term-download-link" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download the verified PDF resume ↓</a>'):this.printLine(`No readable portfolio section named "${$(s)}". Try <span class="term-command">ls</span>.`,"term-error")}cmdOpen(t){const s=(t[0]||"").toLowerCase();if(s==="resume.pdf"){this.cmdRead(["resume.pdf"]);return}const n=s==="work"?"projects":s;["projects","resume","skills","contact","terminal"].includes(n)&&window.openAppByName?(window.openAppByName(n),this.printLine(`Opened ${$(s)}.`,"term-success")):this.printLine("Usage: open [work|projects|resume|skills|contact|terminal]","term-error")}cmdContact(){const t=C.personal;this.printLine(`<section class="term-card"><h2>CONTACT</h2><p><a href="mailto:${$(t.email)}">${$(t.email)}</a></p><p>${$(t.phone)}</p><p>${$(t.location)}</p></section>`),window.openAppByName&&window.openAppByName("contact")}cmdClear(){this.output.replaceChildren()}}const Ea=[{name:"Selected work",app:"projects",desc:"Case studies in product and systems engineering",keywords:C.projects.flatMap(a=>[a.title,...a.tech,...a.highlights]).join(" ")},{name:"Engineering map",app:"skills",desc:"Languages, frameworks, data, and tools in context",keywords:Object.values(C.skills).flat().map(a=>a.name).join(" ")},{name:"Career profile",app:"resume",desc:"Resume, experience, education, and a downloadable text profile",keywords:`resume cv ${C.personal.name} ${C.experience.map(a=>`${a.company} ${a.role} ${a.technologies.join(" ")}`).join(" ")}`},{name:"Contact",app:"contact",desc:"Email, phone, location, and professional links",keywords:`${C.personal.email} ${C.personal.phone} ${C.personal.location} github linkedin`},{name:"Terminal",app:"terminal",desc:"A small interactive developer terminal"}];class Sa{constructor(t,s){this.container=t,this.scenePreferences=s,this.isOpen=!1,this.initDOM()}initDOM(){this.overlay=document.createElement("div"),this.overlay.className="control-center-modal",this.overlay.style.display="none",this.overlay.innerHTML=`
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
    `,this.container.appendChild(this.overlay),this.setupListeners()}setupListeners(){this.overlay.addEventListener("click",d=>{(d.target===this.overlay||d.target.closest(".preferences-close"))&&this.close()}),window.addEventListener("keydown",d=>{d.key==="Escape"&&this.isOpen&&this.close()});const t=this.overlay.querySelector("#ctrl-toggle-motion"),s=this.overlay.querySelector("#ctrl-toggle-3d"),n=this.overlay.querySelector("#ctrl-toggle-sound");t.addEventListener("click",()=>{const d=!this.isMotionReduced();document.body.dataset.motionPreference=d?"reduced":"standard",document.body.dataset.reducedMotion=String(d),this.updatePreference(t,"#ctrl-motion-state",d?"Reduced":"Standard",d)}),s.addEventListener("click",()=>{const d=!this.scenePreferences.isEnabled(),y=this.overlay.querySelector("#ctrl-3d-state");if(!d){this.scenePreferences.setEnabled(!1),this.updatePreference(s,"#ctrl-3d-state","Off",!1);return}s.disabled=!0,y.textContent="Loading…",this.scenePreferences.setEnabled(!0).then(()=>{s.disabled=!1,this.updatePreference(s,"#ctrl-3d-state","On",!0)}).catch(u=>{s.disabled=!1,this.updatePreference(s,"#ctrl-3d-state","Unavailable",!1),y.title=u instanceof Error?u.message:String(u)})}),n.addEventListener("click",()=>{const d=se.toggleSound();this.updatePreference(n,"#ctrl-sound-state",d?"On":"Off",d)}),this.overlay.querySelector(".preferences-close").addEventListener("click",()=>this.close());const o=this.overlay.querySelector("#spotlight-input"),l=this.overlay.querySelector("#spotlight-results");o.addEventListener("input",()=>{const d=o.value.trim().toLowerCase();if(!d){l.style.display="none",l.replaceChildren();return}const y=Ea.filter(u=>`${u.name} ${u.desc} ${u.keywords||""}`.toLowerCase().includes(d));l.innerHTML=y.length?y.map(u=>`
          <button class="spotlight-item" type="button" data-app="${u.app}">
            <span class="spotlight-title">${u.name}</span>
            <span class="spotlight-desc">${u.desc}</span>
            <span aria-hidden="true">↗</span>
          </button>`).join(""):'<p class="spotlight-empty">No matching pages.</p>',l.style.display="flex",l.querySelectorAll("[data-app]").forEach(u=>{u.addEventListener("click",()=>{this.close(),window.openAppByName&&window.openAppByName(u.dataset.app,!0,!0)})})})}updatePreference(t,s,n,o){t.setAttribute("aria-pressed",String(o)),this.overlay.querySelector(s).textContent=n}syncPreferences(){const t=this.isMotionReduced(),s=this.scenePreferences.isEnabled();this.updatePreference(this.overlay.querySelector("#ctrl-toggle-motion"),"#ctrl-motion-state",t?"Reduced":"Standard",t),this.updatePreference(this.overlay.querySelector("#ctrl-toggle-3d"),"#ctrl-3d-state",s?"On":"Off",s),this.updatePreference(this.overlay.querySelector("#ctrl-toggle-sound"),"#ctrl-sound-state",se.enabled?"On":"Off",se.enabled)}isMotionReduced(){return document.body.dataset.reducedMotion==="true"||document.body.dataset.motionPreference!=="standard"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}toggle(){this.isOpen?this.close():this.open()}open(){this.isOpen=!0,this.syncPreferences(),this.overlay.style.display="flex";const t=this.overlay.querySelector("#spotlight-input");setTimeout(()=>t.focus(),50)}close(){this.isOpen=!1,this.overlay.style.display="none"}}function oe(a){return String(a).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function va(){const a=C.personal,t=document.createElement("div");return t.className="career-experience",t.innerHTML=`
    <header class="career-nav">
      <a class="career-wordmark" href="#home" aria-label="Return home">AS<span> / PROFILE</span></a>
      <a class="career-nav-link" href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
    </header>
    <div class="career-scroll">
      <section class="career-opening">
        <div class="career-opening-aside"><span>ENGINEERING<br />PROFILE</span><span>VERIFIED AGAINST<br />SOURCE RESUME</span></div>
        <div class="career-opening-main">
          <p class="career-kicker">ADITYA SHINDE <span>·</span> ${oe(a.location)}</p>
          <h1>Building for<br /><em>the real world.</em></h1>
          <p class="career-summary">${oe(a.summary)}</p>
          <a class="career-download" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download resume <span>.pdf</span> <b>↓</b></a>
        </div>
        <div class="career-opening-mark" aria-hidden="true">AS</div>
      </section>

      <section class="career-section">
        <div class="career-section-heading"><span>01 / EXPERIENCE</span><h2>Where I’ve<br /><em>made a difference.</em></h2></div>
        <div class="career-timeline">
          ${C.experience.map((s,n)=>`
            <article class="career-role">
              <div class="career-role-meta"><span>0${n+1}</span><span>${oe(s.period)}</span></div>
              <div class="career-role-content">
                <div class="career-role-heading">
                  <div><h3>${oe(s.role)}</h3><p>${oe(s.company)}</p></div>
                  <span class="career-status">${oe(s.status)}</span>
                </div>
                <ul>${s.highlights.map(o=>`<li>${oe(o)}</li>`).join("")}</ul>
                <div class="career-tech">${s.technologies.map(o=>`<span>${oe(o)}</span>`).join("")}</div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="career-education">
        <div><span class="career-section-label">02 / EDUCATION</span><h2>Education<br /><em>& foundations.</em></h2></div>
        <div class="career-education-detail">
          <span>${oe(a.university)} · ${oe(a.educationPeriod)}</span>
          <h3>${oe(a.degree)}</h3>
          <p>CGPA <b>${oe(a.cgpa)}</b></p>
        </div>
      </section>
      <footer class="career-footer"><span>GOOD WORK IS A TEAM SPORT.</span><a href="#work" data-portfolio-route="projects">VIEW SELECTED PROJECTS ↗</a></footer>
    </div>
  `,t}function te(a){return String(a).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function wa(a,t){return`
    <section class="walk-chapter ${t%2?"walk-chapter-reverse":""}" id="walk-${te(a.id)}" data-walk-chapter="${t}">
      <div class="walk-chapter-index">
        <span>0${t+1}</span>
        <i></i>
        <small>${te(a.period||"SELECTED WORK")}</small>
      </div>
      <article class="walk-chapter-copy">
        <p class="walk-eyebrow">${te(a.subtitle||"Selected project")}</p>
        <h2>${te(a.title)}</h2>
        <p class="walk-overview">${te(a.overview||"")}</p>
        <div class="walk-tech" aria-label="Technologies">
          ${(a.tech||[]).map(s=>`<span>${te(s)}</span>`).join("")}
        </div>
        <button class="walk-study-open" type="button" data-open-study="${t}">
          EXPLORE CASE STUDY <span>↗</span>
        </button>
      </article>
    </section>
  `}function Ta(a,t){const s=a.areas||[],n=a.implementation||[],o=a.highlights||[];return`
    <div class="walk-study-heading">
      <p class="walk-eyebrow">CASE STUDY 0${t+1}</p>
      <span>${te(a.period||"SELECTED WORK")}</span>
    </div>
    <h2>${te(a.title)}</h2>
    <p class="walk-study-subtitle">${te(a.subtitle||"")}</p>
    <div class="walk-study-tags">${(a.tech||[]).map(l=>`<span>${te(l)}</span>`).join("")}</div>
    <section class="walk-study-section">
      <h3>OVERVIEW</h3>
      <p>${te(a.overview||"")}</p>
    </section>
    ${s.length?`
      <section class="walk-study-section">
        <h3>SYSTEM AREAS</h3>
        <ul>${s.map((l,d)=>`<li><span>0${d+1}</span>${te(l)}</li>`).join("")}</ul>
      </section>
    `:""}
    ${n.length?`
      <section class="walk-study-section">
        <h3>ENGINEERING APPROACH</h3>
        <ul>${n.map((l,d)=>`<li><span>0${d+1}</span>${te(l)}</li>`).join("")}</ul>
      </section>
    `:""}
    ${o.length?`
      <section class="walk-study-section">
        <h3>PROJECT HIGHLIGHTS</h3>
        <ul>${o.map((l,d)=>`<li><span>0${d+1}</span>${te(l)}</li>`).join("")}</ul>
      </section>
    `:""}
    <a class="walk-study-contact" href="#contact" data-portfolio-route="contact">Discuss this project <span>↗</span></a>
  `}function Aa(a=""){const t=document.createElement("div");t.className="work-experience study-experience at-walk-experience";const s=C.projects;t.innerHTML=`
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
          ${s.map(wa).join("")}
        </div>

        <section class="walk-outro">
          <p class="walk-eyebrow">END OF THE PATH</p>
          <h2>More good work<br>starts with a conversation.</h2>
          <a href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
        </section>
      </main>

      <div class="walk-progress" aria-hidden="true"><span></span></div>
      <div class="walk-scene-index" aria-live="polite"><span>01</span><i></i><span>0${s.length}</span></div>

      <aside class="walk-study-drawer" aria-hidden="true">
        <button class="walk-study-backdrop" type="button" aria-label="Close case study"></button>
        <section class="walk-study-sheet" role="dialog" aria-modal="true" aria-labelledby="walk-study-title">
          <button class="walk-study-close" type="button" aria-label="Close case study">×</button>
          <div class="walk-study-content" id="walk-study-content"></div>
        </section>
      </aside>
    </div>
  `;const n=t.querySelector(".at-walk-scroll"),o=t.querySelector(".at-walk-shell"),l=t.querySelector(".walk-rna-art"),d=t.querySelector(".at-walk-canvas"),y=t.querySelector(".walk-progress span"),u=[...t.querySelectorAll("[data-walk-chapter]")],w=t.querySelector(".walk-scene-index"),O=t.querySelector(".walk-begin"),k=t.querySelector(".walk-study-drawer"),I=t.querySelector(".walk-study-content"),N=t.querySelector(".walk-study-close"),R=t.querySelector(".walk-study-backdrop");let v=null,M=!1,H=null;const P=(S,m="smooth")=>{const E=u[S];if(!E)return;const F=n.scrollTop+E.getBoundingClientRect().top-n.getBoundingClientRect().top;n.scrollTo({top:F,behavior:m})},Z=()=>{var q;const S=n.scrollHeight-n.clientHeight,m=S>0?n.scrollTop/S:0;y.style.transform=`scaleX(${Math.max(0,Math.min(1,m))})`,o.classList.toggle("is-intro",n.scrollTop<n.clientHeight*.55),l.style.transform=`translateY(${-m*7}%)`;const E=n.getBoundingClientRect().top+n.clientHeight*.52,F=u.find(G=>G.getBoundingClientRect().bottom>E);if(F){const G=Number(F.dataset.walkChapter)+1;w.querySelector("span").textContent=String(G).padStart(2,"0"),O.dataset.walkTo=String(G-1),O.querySelector("span").textContent=`PROJECT ${String(G).padStart(2,"0")} / ${String(s.length).padStart(2,"0")}`}else n.scrollTop<((q=u[0])==null?void 0:q.offsetTop)*.65&&(w.querySelector("span").textContent="01",O.dataset.walkTo="0",O.querySelector("span").textContent="DESCEND INTO THE WORK")},L=()=>{const S=k.classList.contains("is-open");k.classList.remove("is-open"),k.setAttribute("aria-hidden","true"),S&&(H!=null&&H.isConnected)&&H.focus()},J=S=>{var E;const m=s[S];m&&(H=t.querySelector(`[data-open-study="${S}"]`),I.innerHTML=Ta(m,S),(E=I.querySelector("h2"))==null||E.setAttribute("id","walk-study-title"),k.classList.add("is-open"),k.setAttribute("aria-hidden","false"),N.focus())},K=S=>{if(S.code==="Escape"&&k.classList.contains("is-open")&&L(),S.code!=="Tab"||!k.classList.contains("is-open"))return;const m=[...k.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(q=>!q.hasAttribute("disabled")&&q.getClientRects().length);if(!m.length)return;const E=m[0],F=m[m.length-1];S.shiftKey&&document.activeElement===E?(S.preventDefault(),F.focus()):!S.shiftKey&&document.activeElement===F&&(S.preventDefault(),E.focus())};n.addEventListener("scroll",Z,{passive:!0}),O.addEventListener("click",()=>P(Number(O.dataset.walkTo))),t.querySelectorAll("[data-open-study]").forEach(S=>{S.addEventListener("click",()=>J(Number(S.dataset.openStudy)))}),N.addEventListener("click",L),R.addEventListener("click",L),window.addEventListener("keydown",K),Z(),requestAnimationFrame(()=>{M||Z()}),requestAnimationFrame(()=>{if(!(M||!d.isConnected)){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){d.hidden=!0,t.classList.add("has-static-scene");return}jt(async()=>{const{WorkWorld:S}=await import("./workWorld-efV7bGtR.js");return{WorkWorld:S}},__vite__mapDeps([0,1])).then(({WorkWorld:S})=>{M||!d.isConnected||(v=new S(d,n,()=>{const m=n.scrollHeight-n.clientHeight;return m>0?n.scrollTop/m:0}),d._workWorld=v)}).catch(S=>{d.hidden=!0,t.classList.add("has-static-scene"),console.error("Failed to load the 3D work experience:",S)})}});const le=new MutationObserver(()=>{t.isConnected||(M=!0,v==null||v.dispose(),n.removeEventListener("scroll",Z),window.removeEventListener("keydown",K),le.disconnect())});return le.observe(document.body,{childList:!0,subtree:!0}),t.navigateToProject=S=>{const m=s.findIndex(E=>E.id===S);m>=0&&P(m)},a&&requestAnimationFrame(()=>{const S=s.findIndex(m=>m.id===a);S>=0&&P(S,"instant")}),t}const Tt=1e3,At=640,be=6,Ba=Tt*be,Fa=At*be,re={x:865,y:160},wt={x:-100,z:0},Cs=[wt.x,wt.z],Ns=[re.x+wt.x/be,re.y-wt.z/be];function Bs(a,t){return[(a-Tt/2)*be,(At/2-t)*be]}function ue(a,t){return{x:a/be+Tt/2,y:At/2-t/be}}function ge(a,t){return{x:20+a/Tt*380,y:30+t/At*240}}function La(a,t){const{x:s,y:n}=ue(a,t);return Math.hypot(s-re.x,n-re.y)<=70?"ashenCoast":s>=760&&n<260?"signal":n>=410&&s>=500?"highPass":s>=560&&s<790?"fossil":s<250&&n>=440?"motorYard":s<300?"lowlands":s<450&&n<270?"riverlands":s>=390&&s<580?"ashen":"lowlands"}function _(a,t){const[s,n]=Bs(a,t);return{x:s,z:n}}function Fs(a){return a.map(([t,s])=>Bs(t,s))}function ye(a,t,s,n,o=!1,l="dirt",d=null){return{from:a,to:t,kind:s,mapPoints:n,points:Fs(n),closed:o,surface:l,width:d}}function Y(a,t,s,n,o=!1,l="cobblestone",d=null){const y=n.map(([u,w])=>[re.x+u/be,re.y-w/be]);return ye(a,t,s,y,o,l,d)}const he=[{id:"trailhead",title:"THE TRAILHEAD",..._(130,150),accent:14006141},{id:"crossing",title:"THE RIVER CROSSING",..._(385,185),accent:8566957},{id:"settlement",title:"THE ASHEN SETTLEMENT",..._(re.x,re.y),markerX:_(re.x-4,re.y-2).x,markerZ:_(re.x-4,re.y-2).z,accent:13212264},{id:"bones",title:"THE OLD GIANT",..._(700,300),accent:13938547},{id:"signal",title:"THE LAST SIGNAL",..._(950,110),accent:12690104},{id:"high-pass",title:"THE HIGH PASS",..._(640,500),accent:10399691}],Wa=Object.fromEntries(he.map(({id:a,x:t,z:s})=>[a,{x:t,z:s}])),Ds=_(200,520),ka=[{id:"waterfall",title:"Silver Drop Waterfall",type:"water",map:[468,122],..._(468,122)},{id:"mirror-tarn",title:"Mirror Tarn",type:"lake",map:[630,250],..._(630,250)},{id:"watchtower",title:"Watchtower Ruin",type:"ruin",map:[225,395],..._(225,395)},{id:"quarry",title:"High Pass Quarry",type:"quarry",map:[760,500],..._(760,500)},{id:"fire-ring",title:"Ashen Vale Fire Ring",type:"camp",map:[535,340],..._(535,340)}],xa=[{id:"cairn",title:"The cairn tone",..._(665,272),requiresStopped:!0},{id:"waterfall-cabin",title:"The waterfall cabin",..._(454,126)},{id:"watchtower-radio",title:"The buried radio",..._(222,406),requiresSignals:6},{id:"quarry-signature",title:"The signed quarry stone",..._(780,515)},{id:"horizon-light",title:"The night light",..._(947,68),requiresSignals:6,nightOnly:!0}],Ra=[{name:"The Saffron Bell Inn",district:"NORTH MARKET",type:"merchant",w:14,h:11,d:12,x:-60,z:-33,rot:0,roof:"hip",color:0},{name:"Westgate Apothecary",district:"NORTH MARKET",type:"merchant",w:12,h:9,d:10,x:-42,z:-33,rot:0,roof:"gable",color:1},{name:"The River Ledger House",district:"NORTH MARKET",type:"townhouse",w:13,h:10,d:11,x:-12,z:-33,rot:0,roof:"parapet",color:2},{name:"Cinder & Brass Foundry",district:"NORTH MARKET",type:"warehouse",w:15,h:9,d:14,x:50,z:-33,rot:0,roof:"gable",color:3},{name:"The Reed & Salt Market",district:"EAST MARKET",type:"merchant",w:14,h:9,d:12,x:40,z:-8,rot:-Math.PI/2,roof:"shed",color:4},{name:"The Wheelwright Yard",district:"EAST MARKET",type:"merchant",w:14,h:10,d:12,x:90,z:33,rot:-Math.PI/2,roof:"gable",color:5},{name:"Stone & Reed Exchange",district:"SOUTH MARKET",type:"townhouse",w:13,h:10,d:11,x:40,z:33,rot:Math.PI,roof:"hip",color:6},{name:"The Wayfarers’ Hall",district:"SOUTH MARKET",type:"townhouse",w:14,h:11,d:12,x:56,z:33,rot:Math.PI,roof:"gable",color:7},{name:"The Lanternwrights’ Court",district:"SOUTH MARKET",type:"merchant",w:13,h:9,d:11,x:-42,z:33,rot:Math.PI,roof:"hip",color:0},{name:"The Pass Registry",district:"GATE STREET",type:"townhouse",w:12,h:10,d:10,x:-60,z:0,rot:-Math.PI/2,roof:"parapet",color:1}],Oa=(()=>{const a=new Set(["-60:-33","-42:-33","-12:-33","56:-33","40:-7","90:33","40:33","56:33","-42:33","-60:-7","-60:7","90:-7","110:-7","90:7","110:7","110:-72"]),t=[[-72,0],[-48,Math.PI],[-33,0],[-7,Math.PI],[7,0],[33,Math.PI],[48,0],[72,Math.PI]],s=[-60,-42,-12,12,40,56,90,110];return t.flatMap(([n,o],l)=>s.flatMap((d,y)=>Math.abs(n)===7&&Math.abs(d)===12||a.has(`${d}:${n}`)?[]:[{x:d,z:n,w:12+(l+y)%3,d:11+(l*2+y)%3,rot:o}]))})(),Ia=[{id:"highland-home-1",label:"HERDKEEPER’S CROFT",x:-126,z:-92,w:12,d:10,h:7,rot:.42,color:0,trade:"HERDS & HAY"},{id:"highland-home-2",label:"STONECUTTER’S HOUSE",x:-158,z:-111,w:13,d:11,h:7.5,rot:.72,color:1,trade:"ROAD STONE"},{id:"highland-home-3",label:"ASH-GARDENER’S CROFT",x:-162,z:-157,w:12,d:10,h:6.5,rot:.18,color:2,trade:"ROOT CELLAR"},{id:"highland-home-4",label:"WOODCUTTER’S HOUSE",x:-193,z:-174,w:13,d:11,h:7.5,rot:-.32,color:3,trade:"FIREWOOD"},{id:"highland-home-5",label:"SHEPHERD’S CROFT",x:-213,z:-122,w:12,d:10,h:6.5,rot:-.62,color:4,trade:"WOOL & MILK"}],Ma=[{id:"roadside-inn",label:"GATEWARD INN",x:-179,z:-86,w:16,d:13,h:8,type:"inn",color:1},{id:"roadside-cottage",label:"GATEWARD COTTAGE",x:-239,z:-100,w:13,d:11,h:6.4,type:"cottage",color:4},{id:"roadside-farm",label:"CROFT & WELL",x:-222,z:-195,w:14,d:12,h:6.8,type:"farm",color:5}],bt=[{id:"west-gate",label:"WEST GATE",type:"gate",x:-101,z:0,w:9,d:8},{id:"market-square",label:"MARKET SQUARE",type:"plaza",x:-5,z:0,w:37,d:25},{id:"council-hall",label:"COUNCIL HALL",type:"civic",x:105,z:0,w:25,d:18},{id:"chapel",label:"CHAPEL",type:"civic",x:118,z:-105,w:18,d:14},{id:"stables",label:"STABLES",type:"service",x:155,z:100,w:24,d:17},{id:"harbor-quay",label:"HARBOR QUAY",type:"harbor",x:190,z:-53,w:82,d:11},{id:"upper-cistern",label:"UPPER CISTERN",type:"service",x:-88,z:-52,w:8,d:8},{id:"highland-well",label:"CROFT WELL",type:"service",x:-187,z:-142,w:8,d:8}],Kt=[ye(1,2,"pass",[[130,150],[200,115],[290,140],[385,185]]),ye(2,3,"pass",[[385,185],[465,200],[550,215],[650,220],[735,210],[810,195],[830,178],[840,160],Ns]),Y(3,4,"pass",[Cs,[-180,-50],[-240,-100],[-320,-160],[-480,-320],[-650,-500],[-820,-670],[-990,-840]]),ye(4,5,"pass",[[700,300],[765,250],[805,170],[860,110],[875,110]],!1,"dirt",18),ye("coast",5,"pass",[[875,110],[900,104],[925,105],[940,106],[950,110]],!1,"dirt",18),Y(3,6,"pass",[[-82,60],[-140,-120],[-270,-360],[-510,-720],[-810,-1140],[-1110,-1620],[-1350,-2040]]),Y("settlement-outskirts-road","settlement-highland-hamlet","trail",[[-180,-50],[-155,-72],[-143,-102],[-150,-136],[-178,-158],[-207,-151],[-224,-123],[-220,-91],[-197,-64]],!0,"dirt",6.5),ye(6,4,"trail",[[640,500],[700,470],[650,435],[705,395],[660,350],[700,300]]),Y("settlement-gate","settlement-market-street","trail",[Cs,[-82,0]]),Y("settlement-market-street","settlement-market-street","trail",[[-82,-20],[-25,-20],[25,-20],[75,-20],[125,-20],[145,-20]]),Y("settlement-south-market-street","settlement-south-market-street","trail",[[-82,20],[-25,20],[25,20],[75,20],[125,20],[145,20]]),Y("settlement-north-street","settlement-north-street","trail",[[-82,-60],[-74,-60],[-25,-60],[25,-60],[75,-60],[125,-60],[145,-60]]),Y("settlement-south-street","settlement-south-street","trail",[[-82,60],[-74,60],[-25,60],[25,60],[75,60],[125,60],[145,60]]),Y("settlement-west-street","settlement-west-street","trail",[[-82,-60],[-82,-20],[-82,20],[-82,60]]),Y("settlement-registry-lane","settlement-registry-lane","trail",[[-25,-60],[-25,-20],[-25,20],[-25,60]]),Y("settlement-market-cross-street","settlement-market-cross-street","trail",[[25,-60],[25,-20],[25,20],[25,60]]),Y("settlement-civic-street","settlement-civic-street","trail",[[75,-60],[75,-20],[75,20],[75,60]]),Y("settlement-harbor-street","settlement-harbor-street","trail",[[125,-60],[125,-20],[125,20],[125,60]]),Y("settlement-waterfront-lane","settlement-waterfront-lane","trail",[[145,-60],[145,-20],[145,20],[145,60]]),Y("settlement-council-yard","settlement-civic-street","trail",[[75,-20],[82,-16],[88,-13]]),Y("settlement-chapel-lane","settlement-north-street","trail",[[125,-60],[120,-78],[118,-88]]),Y("settlement-quay-road","settlement-waterfront-lane","pass",[[145,-60],[166,-60],[190,-56],[216,-52],[242,-48]],!1,"dirt"),Y("settlement-south-street","settlement-stable","trail",[[125,60],[145,82],[176,82],[184,102],[184,123],[155,123]]),ye(1,"mw","trail",[[130,150],[105,260],[150,400],[200,520]]),ye("mw",3,"trail",[[200,520],[254,450],[310,365],[350,285],[385,185],[470,200],[600,225],[700,205],[780,185],[845,166],Ns]),ye("watchtower-loop","watchtower-loop","trail",[[150,400],[185,355],[230,375],[245,410],[210,440]],!0),ye("quarry-loop","quarry-loop","trail",[[640,500],[700,530],[760,500],[725,470]],!0)],We=Kt[0].points,Ua={x:We[0][0],z:We[0][1]},za=Math.atan2(We[1][0]-We[0][0],We[1][1]-We[0][1]),Ws=[[560,-10],[530,70],[470,120],[420,150],[385,185],[345,235],[330,300],[350,370],[320,440],[300,520],[320,600],[310,660]],Va=Fs(Ws),_a=he[1],Ka=he[0],Et=he[2],ja=he[3],Ps=he[4],Ya=he[5],Xa={x:Ps.x+210,z:Ps.z},zt="signal-ridge-vehicle-build",$s="signal-ridge-signals",Hs="signal-ridge-secrets",qs="signal-ridge-settlement-topics",Vt={paint:"#53645b",alloy:"#c2a878",rideHeight:1,bodyWidth:1,wheelStyle:"all-terrain",bodyKit:"stock",power:1},Fe={languages:"PHP, JavaScript, and TypeScript appear across production application work. At K2S2 Digistrat, used Rust to build a data-sync platform for bulk migration and real-time change data capture.",backend:"At V.K. Lalco, developed a centralized Update Management System that records module changes, responsible users, timestamps, and audit trails.",databases:"Built interconnected HR management modules with MySQL and contributed to production features using MySQL and PostgreSQL.",frontend:"Developed and maintained production application features using React, JavaScript, and TypeScript at V.K. Lalco and Volody.",tools:"These tools are listed in the skills inventory. Docker and Git are presented as tools, not as claims of deployment or infrastructure ownership.",architecture:"Implemented role-based access control and audit logging for the UMS, with roles, permissions, and route-level authorization in the OMS."},Ca={trailhead:"Languages used in production application work and a real-time data-sync platform.",crossing:"Frontend work across React, JavaScript and TypeScript at V.K. Lalco and Volody.",settlement:"Backend systems for HR workflows, audited updates and route-level access control.",bones:"Relational data models and production work with MySQL and PostgreSQL.",signal:"Role-based access, audit trails and systems designed around clear boundaries.","high-pass":"The day-to-day tools used to build, test and maintain application software."},St={cairn:{title:"The Cairn",note:"The old keepers stacked these stones to mark the quiet places. Stop beside it and listen for the tone."},"waterfall-cabin":{title:"The Waterfall Cabin",note:"A keeper left a dry notebook behind the falls. Its last page points toward the work beyond the ridge.",link:!0},"watchtower-radio":{title:"Buried Radio",note:"“If you can hear this, the six fires are home again. Carry the signal farther than we could.”"},"quarry-signature":{title:"A Mark in the Stone",note:"A.S. · Someone wanted the next traveller to know they had made it this far."},"horizon-light":{title:"A Light Beyond the Ridge",note:"After the chain was restored, one small light appeared past the known horizon."}},fe=[{id:"trailhead",title:"The Trailhead",category:"Languages",caption:"NOTICE BOARD · COMPLETE SKILLS REGISTER"},{id:"crossing",title:"The River Crossing",category:"Frontend",caption:"FORD · WATERFALL · TIMBER BRIDGE"},{id:"settlement",title:"The Ashen Settlement",category:"Backend",caption:"ASHEN COAST · HARBOR STREETS"},{id:"bones",title:"The Old Giant",category:"Databases",caption:"FOSSIL RIDGE · HIGH VISTA"},{id:"signal",title:"The Last Signal",category:"Architecture & systems",caption:"RIDGELINE · FINAL BEACON"},{id:"high-pass",title:"The High Pass",category:"Tools & DevOps",caption:"SWITCHBACKS · UPPER TRAIL"}],vt=[...C.skills.backend,"Update Management System"].map((a,t)=>({id:`settlement-house-${t+1}`,title:a})),Gs=[{id:"trailhead",title:"Trailhead · amber",paint:"#d5b77d"},{id:"crossing",title:"Crossing · river teal",paint:"#82b8ad"},{id:"settlement",title:"Settlement · ember",paint:"#c99a68"},{id:"bones",title:"Old Giant · fossil gold",paint:"#d4af73"},{id:"signal",title:"Last Signal · dusk",paint:"#c1a2b8"},{id:"high-pass",title:"High Pass · alpine",paint:"#9eafcb"}],_t=a=>{if(!Number.isFinite(a)||a<=0)return"--:--.-";const t=Math.floor(a/6e4),s=Math.floor(a/1e3)%60,n=Math.floor(a/100)%10;return`${String(t).padStart(2,"0")}:${String(s).padStart(2,"0")}.${n}`},Qe=[{title:"Languages",skills:C.skills.languages,evidence:Fe.languages},{title:"Backend",skills:C.skills.backend,evidence:Fe.backend},{title:"Frontend",skills:C.skills.frontend,evidence:Fe.frontend},{title:"Databases",skills:C.skills.databases,evidence:Fe.databases},{title:"Architecture & systems",skills:C.skills.architecture,evidence:Fe.architecture},{title:"Tools & DevOps",skills:C.skills.toolsAndDevops,evidence:Fe.tools}];function Na(){var bs,Es;const a=document.createElement("div");a.className="skills-experience bruno-playground-app",a.classList.add("is-intro","is-board-open"),a.innerHTML=`
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
          <button class="bruno-action-btn" id="bruno-btn-board" type="button" aria-expanded="false">
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

      <section class="skills-arrival" id="skills-arrival" aria-labelledby="skills-arrival-title" hidden>
        <button class="arrival-close" id="skills-arrival-close" type="button" aria-label="Close skills noticeboard">×</button>
        <div class="arrival-copy">
          <span class="arrival-eyebrow">SIGNAL RIDGE · FIELD REGISTER</span>
          <h1 id="skills-arrival-title">The work,<br>in its place.</h1>
          <p>Explore the skills behind the projects. Browse the evidence here, or take the road and discover each chapter in the landscape.</p>
          <button class="arrival-start" id="skills-start" type="button">ENTER THE VALLEY <span aria-hidden="true">↗</span></button>
          <span class="arrival-controls">WASD DRIVE · E INTERACT · DRAG TO LOOK · M OPEN MAP</span>
        </div>
        <aside class="arrival-register" aria-label="Complete skills noticeboard">
          <header>
            <span>FIELD NOTES · 06 CHAPTERS</span>
            <strong>Skills in context <i>Browse the register</i></strong>
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
            <div class="map-mode-controls" role="group" aria-label="Map area">
              <button type="button" id="map-mode-ridge" aria-pressed="true">RIDGE MAP</button>
              <button type="button" id="map-mode-settlement" aria-pressed="false">ASHEN SETTLEMENT PLAN</button>
            </div>
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
                <text x="340" y="100">ASHEN COAST</text>
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
            <svg class="settlement-plan-map" id="settlement-plan-map" viewBox="0 0 420 300" role="img" aria-label="Detailed Ashen Settlement street and building plan" hidden>
              <g id="settlement-plan-layer"></g>
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
            <p class="map-scale" id="map-scale" aria-label="Map scale">SIGNAL RIDGE · 6 KM × 3.84 KM</p>
            <p class="map-location-readout" id="map-location-readout" aria-live="polite">TRAILHEAD · POSITION UNKNOWN</p>
            <p class="settlement-plan-detection" id="settlement-plan-detection" aria-live="polite" hidden></p>
          </div>
          <nav class="skill-map-destinations" aria-label="Signal Ridge destinations">
            <button type="button" data-destination="trailhead" aria-pressed="false"><span>01</span><strong>The Trailhead</strong><small>Languages · complete skills board</small><b>↗</b></button>
            <button type="button" data-destination="crossing" aria-pressed="false"><span>02</span><strong>The River Crossing</strong><small>Frontend · ford and timber bridge</small><b>↗</b></button>
            <button type="button" data-destination="settlement" aria-pressed="false"><span>03</span><strong>The Ashen Settlement</strong><small>Backend · market streets and harbor quay</small><b>↗</b></button>
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
            ${Gs.map(({id:e,title:i})=>`<option value="${e}" data-signal-unlock="${e}" disabled>${i}</option>`).join("")}
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

      <aside class="city-story-dialog" id="city-story-dialog" role="status" aria-live="polite" aria-atomic="true" hidden>
        <div class="city-story-line">
          <span class="city-story-eyebrow" id="city-story-eyebrow">THE ASHEN SETTLEMENT</span>
          <h2 id="city-story-title">A citizen's story</h2>
          <p class="city-story-copy" id="city-story-copy"></p>
          <button class="city-story-dismiss" id="city-story-dismiss" type="button" hidden>CONTINUE <span aria-hidden="true">↗</span></button>
        </div>
      </aside>

      <aside class="bruno-proximity-prompt is-hidden" id="bruno-proximity-card" aria-live="polite" aria-hidden="true">
        <div class="prox-card__mark" aria-hidden="true"><span></span></div>
        <div class="prox-card__body">
          <div class="prox-card__eyebrow">
            <span class="prox-card__tag" id="prox-card-tag">THE ASHEN SETTLEMENT</span>
            <span class="prox-card__dist" id="prox-card-dist">12 M</span>
          </div>
          <div class="prox-card__title" id="prox-card-title">The Golden Sturgeon</div>
          <div class="prox-card__action" id="prox-card-action">
            <kbd class="prox-card__key">E</kbd>
            <span class="prox-card__hint" id="prox-card-hint">PRESS TO DISCOVER</span>
          </div>
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
  `;const t=a.querySelector("#skills-register-grid"),s=a.querySelector("#skills-register-tabs");let n=0,o=null;const l=e=>{n=(e+Qe.length)%Qe.length,t.querySelectorAll(".skills-register-group").forEach((i,r)=>{i.hidden=r!==n}),s.querySelectorAll('[role="tab"]').forEach((i,r)=>{const p=r===n;i.setAttribute("aria-selected",String(p)),i.tabIndex=p?0:-1}),a.querySelector("#skills-register-count").textContent=`${String(n+1).padStart(2,"0")} / ${String(Qe.length).padStart(2,"0")}`,a.querySelector("#skills-register-progress").style.transform=`scaleX(${(n+1)/Qe.length})`};Qe.forEach((e,i)=>{const r=document.createElement("button");r.type="button",r.id=`skills-register-tab-${i}`,r.setAttribute("role","tab"),r.setAttribute("aria-controls",`skills-register-panel-${i}`),r.setAttribute("aria-selected","false"),r.tabIndex=-1,r.textContent=e.title,r.addEventListener("click",()=>l(i)),r.addEventListener("keydown",g=>{var x,z;g.key==="ArrowRight"?(g.preventDefault(),l(i+1),(x=s.querySelector('[aria-selected="true"]'))==null||x.focus()):g.key==="ArrowLeft"&&(g.preventDefault(),l(i-1),(z=s.querySelector('[aria-selected="true"]'))==null||z.focus())}),s.append(r);const p=document.createElement("section");p.className="skills-register-group",p.id=`skills-register-panel-${i}`,p.setAttribute("role","tabpanel"),p.setAttribute("aria-labelledby",r.id),p.tabIndex=0;const h=document.createElement("h3");h.textContent=e.title;const b=document.createElement("span");b.className="skills-register-chapter",b.textContent=`FIELD LOG ${String(i+1).padStart(2,"0")} · ${e.skills.length} SKILLS`;const T=document.createElement("div");T.className="skills-register-list",e.skills.forEach(g=>{const x=document.createElement("span");x.textContent=g,T.append(x)});const D=document.createElement("details");D.className="skills-register-evidence";const W=document.createElement("summary");W.textContent="FIELD EVIDENCE";const B=document.createElement("p");B.textContent=e.evidence,D.append(W,B);const ne=fe[i],f=document.createElement("button");f.type="button",f.className="skills-register-explore",f.textContent=`EXPLORE ${ne.title.toUpperCase()} ↗`,f.addEventListener("click",()=>Oe(ne.id)),p.append(b,h,T,D,f),t.append(p)}),l(0),a.querySelector("#skills-register-previous").addEventListener("click",()=>{l(n-1)}),a.querySelector("#skills-register-next").addEventListener("click",()=>{l(n+1)}),t.addEventListener("pointerdown",e=>{e.pointerType!=="touch"||e.target.closest("button, summary")||(o={x:e.clientX,y:e.clientY})}),t.addEventListener("pointerup",e=>{if(!o)return;const i=e.clientX-o.x,r=e.clientY-o.y;o=null,!(Math.abs(i)<48||Math.abs(i)<Math.abs(r))&&l(n+(i<0?1:-1))}),t.addEventListener("pointercancel",()=>{o=null});const d=a.querySelectorAll("#skill-map-panel [data-destination]"),y=a.querySelector("#garage-panel"),u=a.querySelector("#skill-map-panel"),w=a.querySelector("#bruno-controls-banner"),O=a.querySelector("#bruno-btn-map"),k=a.querySelector("#bruno-btn-board"),I=a.querySelector("#bruno-btn-controls"),N=a.querySelector("#bruno-btn-rally"),R=a.querySelector("#skills-arrival"),v=a.querySelector("#bruno-objective-text"),M=a.querySelector("#bruno-proximity-card"),H=a.querySelector("#prox-card-tag"),P=a.querySelector("#prox-card-dist"),Z=a.querySelector("#prox-card-title"),L=a.querySelector("#prox-card-hint");let J=null;const K=a.querySelector("#map-player"),le=a.querySelector("#bruno-minimap"),S=a.querySelector("#bruno-minimap-svg"),m=a.querySelector("#bruno-compass"),E=m.querySelector("span"),F=a.querySelector("#bruno-compass-label"),q=a.querySelector("#map-waypoint-status"),G=a.querySelector("#map-location-readout"),U=a.querySelector("#settlement-plan-detection"),De=a.querySelector("#map-fog-reveal"),ae=a.querySelector("#map-breadcrumb"),ie=a.querySelector("#map-waypoint-route"),ke=a.querySelectorAll("[data-map-layer]"),ee=a.querySelector(".signal-map"),Us=a.querySelector("#settlement-plan-map"),zs=a.querySelector("#settlement-plan-layer"),Yt=a.querySelector("#map-mode-ridge"),Xt=a.querySelector("#map-mode-settlement"),Vs=a.querySelector("#map-scale"),_s=a.querySelectorAll(".map-layer-controls, .map-view-controls"),Ks=a.querySelector("#map-zoom-out"),js=a.querySelector("#map-zoom-in"),Ys=a.querySelector("#map-center-player"),Xs=a.querySelector("#map-fit-all"),Lt=a.querySelector("#map-route-selected"),kt=a.querySelector("#map-travel-selected"),Zs=a.querySelector("#map-clear-waypoint"),Ue=a.querySelector("#bruno-sound-toggle"),et=a.querySelector("#bruno-volume"),tt=a.querySelector("#bruno-time-toggle"),ze=a.querySelector("#bruno-motion-toggle"),Ve=a.querySelector("#garage-status"),_e=a.querySelector("#garage-style"),xt=a.querySelector("#garage-signal-livery"),Zt=a.querySelector("#bruno-signal-count"),Rt=a.querySelectorAll("[data-build]"),xe=a.querySelector("#city-story-dialog"),Js=a.querySelector("#city-story-eyebrow"),Qs=a.querySelector("#city-story-title"),ea=a.querySelector("#city-story-copy"),Jt=a.querySelector("#city-story-dismiss");let c=null,Ae=null,st=!1,me={...Vt},at=[],Ke=[],Pe=[],Q=new Set,$e=!1,Ee=!1,Ot=!1,j=!1,X=null,ce=window.matchMedia("(prefers-reduced-motion: reduce)").matches,je=null,nt=null,Se=1,Re={x:210,y:150},It=!1,He=null;const qe=[],it=new Map,ve=()=>{xe.hidden=!0,xe.dataset.mode="",window.clearTimeout(Mt)};let Mt=0;const ot=({name:e,role:i,story:r})=>{window.clearTimeout(Mt),xe.dataset.mode="citizen",Js.textContent=`THE ASHEN SETTLEMENT · ${i.toUpperCase()}`,Qs.textContent=e,ea.textContent=r,Jt.hidden=!1,xe.hidden=!1,M==null||M.classList.add("is-hidden"),Mt=window.setTimeout(ve,16e3)};Jt.addEventListener("click",()=>{ve()}),a.classList.toggle("is-reduced-motion",ce),ze.setAttribute("aria-pressed",String(ce)),ze.textContent=`REDUCED MOTION ${ce?"ON":"OFF"}`,Ue.setAttribute("aria-pressed",String(se.enabled)),Ue.textContent=se.enabled?"SOUND ON":"SOUND OFF",et.value=String(se.setVolume(et.value)),Ue.addEventListener("click",()=>{const e=se.toggleSound();Ue.setAttribute("aria-pressed",String(e)),Ue.textContent=e?"SOUND ON":"SOUND OFF"}),et.addEventListener("input",()=>se.setVolume(et.value)),tt.addEventListener("click",()=>{const e=tt.getAttribute("aria-pressed")!=="true";c==null||c.setTimePaused(e),tt.setAttribute("aria-pressed",String(e)),tt.textContent=e?"RESUME WORLD CLOCK":"PAUSE WORLD CLOCK"}),ze.addEventListener("click",()=>{ce=!ce,a.classList.toggle("is-reduced-motion",ce),c==null||c.setReducedMotion(ce),ze.setAttribute("aria-pressed",String(ce)),ze.textContent=`REDUCED MOTION ${ce?"ON":"OFF"}`});const Qt=()=>{if(Ee=!1,N.setAttribute("aria-pressed","false"),N.querySelector("span").textContent="OPTIONAL RALLY",d.forEach(e=>e.setAttribute("aria-pressed","false")),a.querySelectorAll("[data-map-marker]").forEach(e=>e.classList.remove("is-selected")),ve(),c!=null&&c.travelToGarage()){st=!1,v.textContent="MOTOR WORKS · BUILD READY · DRIVE BACK TO THE RIDGE";return}st=!0,v.textContent="MOTOR WORKS · OPENING THE WORKSHOP"};y.addEventListener("keydown",e=>{if(e.key!=="Tab")return;const i=[...y.querySelectorAll("button, input, select")].filter(h=>!h.disabled&&h.getClientRects().length);if(!i.length)return;const r=i[0],p=i[i.length-1];e.shiftKey&&document.activeElement===r?(e.preventDefault(),p.focus()):!e.shiftKey&&document.activeElement===p&&(e.preventDefault(),r.focus())}),u.addEventListener("keydown",e=>{if(e.key!=="Tab")return;const i=[...u.querySelectorAll("button")].filter(h=>!h.disabled&&h.getClientRects().length);if(!i.length)return;const r=i[0],p=i[i.length-1];e.shiftKey&&document.activeElement===r?(e.preventDefault(),p.focus()):!e.shiftKey&&document.activeElement===p&&(e.preventDefault(),r.focus())});try{const e=window.localStorage.getItem(zt);e&&(me={...Vt,...JSON.parse(e)});const i=window.localStorage.getItem($s);if(i){const b=JSON.parse(i);Array.isArray(b)&&(at=b.filter(T=>fe.some(D=>D.id===T)))}const r=window.localStorage.getItem(Hs);if(r){const b=JSON.parse(r);Array.isArray(b)&&(Ke=b.filter(T=>Object.hasOwn(St,T)))}const p=window.localStorage.getItem(qs);if(p){const b=JSON.parse(p);Array.isArray(b)&&(Pe=b.filter(T=>vt.some(D=>D.id===T)))}const h=window.localStorage.getItem("signal-ridge-garage-style");h&&["field","relay","alpine"].includes(h)&&(_e.value=h)}catch(e){console.error("Failed to load the saved Signal Ridge settings:",e)}$e=at.length===fe.length,Q=new Set(at),_e.addEventListener("change",()=>{c==null||c.setGarageStyle(_e.value);try{window.localStorage.setItem("signal-ridge-garage-style",_e.value)}catch(e){console.error("Failed to save the Signal Ridge workshop atmosphere:",e),Ve.textContent="WORKSHOP STYLE NOT SAVED"}});function rt(e){Rt.forEach(i=>{const r=e[i.dataset.build];r!==void 0&&(i.value=String(r));const p=a.querySelector(`[data-output="${i.dataset.build}"]`);p&&(p.value=`${Math.round(Number(r)*100)}%`)})}function es(e){const i=fe.find(W=>W.id===e);if(!i)return;const r=Q.has(e),h=e==="signal"&&!["trailhead","crossing","settlement","bones"].every(W=>Q.has(W))||e==="settlement"&&Pe.length<vt.length,b=e==="settlement"?"Town signal":"Signal fire",T=e==="settlement"?"The market streets connect to the hillside crofts. Follow the lanes and light the house lamps along the way.":Ca[e],D=r?"This signal is already burning.":h?e==="signal"?"The last signal stays sealed until the first four fires are restored.":`The town signal waits until all ${vt.length} market-house lamps are lit.`:"The beacon waits beside the road. Press E near it to restore the fire.";ot({name:i.title,role:b,story:`${D} ${T}`}),v.textContent=r?`SIGNAL LIT · ${i.title.toUpperCase()}`:h?`BEACON FOUND · ${i.title.toUpperCase()} · THE ROAD AHEAD IS SEALED`:`BEACON FOUND · ${i.title.toUpperCase()} · PRESS E NEAR THE FIRE`}function ta(e){const i=St[e],r=xa.find(D=>D.id===e);if(!i||!r)return;Ke.includes(e)||Ke.push(e);try{window.localStorage.setItem(Hs,JSON.stringify(Ke))}catch(D){console.error("Failed to save discovered Signal Ridge secrets:",D)}const p=ue(r.x,r.z),h=ge(p.x,p.y),b=document.createElementNS("http://www.w3.org/2000/svg","circle");b.setAttribute("class","map-secret-marker"),b.setAttribute("cx",h.x.toFixed(1)),b.setAttribute("cy",h.y.toFixed(1)),b.setAttribute("r","4");const T=document.createElementNS("http://www.w3.org/2000/svg","title");T.textContent=i.title,b.append(T),Pt.append(b),Ze(h.x,h.y,16,`secret-${e}`),ot({name:i.title,role:"Hidden field note",story:i.note}),v.textContent=`SECRET FOUND · ${i.title.toUpperCase()}`}function sa(e){ve(),ot({name:e.establishment,role:e.district||"Market street",story:`We trade in ${e.title}. This is house lamp ${e.litCount} of ${e.total}; every light brings the town signal closer.`}),v.textContent=`HOUSE LIT · ${e.title.toUpperCase()} · ${e.litCount}/${e.total}`}const Oe=e=>{var i;e?(Ae=e,X=e,c==null||c.setDestination(e),d.forEach(r=>{r.setAttribute("aria-pressed",String(r.dataset.destination===e))}),a.querySelectorAll("[data-map-marker]").forEach(r=>{r.classList.toggle("is-selected",r.dataset.mapMarker===e)}),v.textContent=`ROUTE SET · ${(i=fe.find(r=>r.id===e))==null?void 0:i.title.toUpperCase()} · FOLLOW THE OLD PASS`):(Ae="trailhead",c==null||c.setDestination("trailhead"),v.textContent="TRAILHEAD · THE SKILLS BOARD IS AHEAD · LIGHT THE FIRST SIGNAL"),j=!0,R.hidden=!0,a.querySelector("#skills-start").hidden=!0,a.classList.remove("is-board-open"),k.setAttribute("aria-expanded","false"),a.classList.remove("is-intro"),le.hidden=!1,se.startWorldAmbience(),c==null||c.setPaused(!u.hidden||!w.hidden),c==null||c.setReducedMotion(ce),O.focus()},ts=(e,i=!1)=>{if(!e.length)return"";const r=e.map(([h,b])=>ge(h,b));let p=`M ${r[0].x.toFixed(1)} ${r[0].y.toFixed(1)}`;for(let h=0;h<r.length-1;h+=1){const b=r[Math.max(0,h-1)],T=r[h],D=r[h+1],W=r[Math.min(r.length-1,h+2)],B=T.x+(D.x-b.x)/6,ne=T.y+(D.y-b.y)/6,f=D.x-(W.x-T.x)/6,g=D.y-(W.y-T.y)/6;p+=` C ${B.toFixed(1)} ${ne.toFixed(1)} ${f.toFixed(1)} ${g.toFixed(1)} ${D.x.toFixed(1)} ${D.y.toFixed(1)}`}return i?`${p} Z`:p},lt=()=>{const e=420/Se,i=300/Se,r=Math.max(e/2,Math.min(420-e/2,Re.x)),p=Math.max(i/2,Math.min(300-i/2,Re.y));Re={x:r,y:p},ee.setAttribute("viewBox",`${(r-e/2).toFixed(2)} ${(p-i/2).toFixed(2)} ${e.toFixed(2)} ${i.toFixed(2)}`)},Ct=e=>{Se=Math.max(1,Math.min(4,Se+e)),lt()},ss=a.querySelector("#map-road-layer"),as=(e,i,r,p=!1,h=null,b=null)=>{const T=document.createElementNS("http://www.w3.org/2000/svg","path");return T.setAttribute("d",ts(i,p)),T.setAttribute("class",r),h!==null&&b!==null&&(T.dataset.roadFrom=String(h),T.dataset.roadTo=String(b)),e.append(T),T},ns=Kt.filter(e=>e.surface==="cobblestone"||e.from==="settlement-outskirts-road"||e.from===3&&e.to===4).map(e=>({...e,localPoints:e.points.map(([i,r])=>[i-Et.x,r-Et.z]).filter(([i,r])=>i>=-250&&r>=-220)})),Nt=[...Oa.map((e,i)=>({...e,id:`rowhouse-${i}`,label:`Townhouse ${i+1}`})),...Ra.map(e=>({...e,id:e.name,label:e.name})),...Ma.map(e=>({...e,type:"homestead",rot:0})),...Ia.map(e=>({...e,type:"homestead"}))],Le=[...Nt.flatMap(({x:e,z:i,w:r,d:p})=>[[e-r/2-8,i-p/2-8],[e+r/2+8,i+p/2+8]]),...bt.map(({x:e,z:i,w:r,d:p})=>[e-r/2-8,i-p/2-8]).flatMap(([e,i],r)=>{const{w:p,d:h}=bt[r];return[[e,i],[e+p+16,i+h+16]]}),...ns.flatMap(e=>e.localPoints)].reduce((e,[i,r])=>({minX:Math.min(e.minX,i),maxX:Math.max(e.maxX,i),minZ:Math.min(e.minZ,r),maxZ:Math.max(e.maxZ,r)}),{minX:1/0,maxX:-1/0,minZ:1/0,maxZ:-1/0}),ct=Math.min(364/(Le.maxX-Le.minX),250/(Le.maxZ-Le.minZ)),aa=(Le.minX+Le.maxX)/2,na=(Le.minZ+Le.maxZ)/2,Ye=(e,i)=>({x:210+(e-aa)*ct,y:150-(i-na)*ct}),is=e=>e.map(([i,r],p)=>{const h=Ye(i,r);return`${p?"L":"M"} ${h.x.toFixed(1)} ${h.y.toFixed(1)}`}).join(" "),we=(e,i,r={})=>{const p=document.createElementNS("http://www.w3.org/2000/svg",e);return i&&p.setAttribute("class",i),Object.entries(r).forEach(([h,b])=>p.setAttribute(h,String(b))),zs.append(p),p};we("rect","settlement-plan-background",{x:0,y:0,width:420,height:300}).setAttribute("aria-hidden","true");const Ie=bt.find(e=>e.type==="plaza");if(Ie){const e=Ye(Ie.x,Ie.z);we("rect","settlement-plan-plaza",{x:e.x-Ie.w*.46/2,y:e.y-Ie.d*.46/2,width:Ie.w*.46,height:Ie.d*.46,rx:2})}ns.forEach(e=>{const i=e.width??(e.surface==="cobblestone"?8.5:e.kind==="pass"?22:18);we("path","settlement-plan-road-edge",{d:is(e.localPoints)}).setAttribute("stroke-width",String(Math.max(2.2,i*ct*.76+2))),we("path",e.to==="settlement-highland-hamlet"?"settlement-plan-hill-road":e.from===3&&e.to===4?"settlement-plan-ridge-road":"settlement-plan-street",{d:is(e.localPoints)}).setAttribute("stroke-width",String(Math.max(1.5,i*ct*.76)))});const Dt=new Map,os=({id:e,label:i,type:r,x:p,z:h,w:b,d:T,rot:D=0,trade:W})=>{const B=Ye(p,h),ne=b*.46,f=T*.46,g=we("rect",`settlement-plan-building settlement-plan-${r}`,{x:(B.x-ne/2).toFixed(2),y:(B.y-f/2).toFixed(2),width:ne.toFixed(2),height:f.toFixed(2),transform:`rotate(${-D*180/Math.PI} ${B.x.toFixed(2)} ${B.y.toFixed(2)})`});e&&(g.dataset.siteId=e,Dt.set(e,g));const x=document.createElementNS("http://www.w3.org/2000/svg","title");x.textContent=W?`${i} · ${W}`:i,g.append(x)};Nt.forEach(e=>os({...e,type:e.type??"home"})),bt.filter(e=>e.type!=="plaza").forEach(e=>{os({...e,label:e.label,type:e.type})});const Xe=(e,i,r,p="")=>{const h=Ye(i,r),b=we("text",`settlement-plan-label ${p}`.trim(),{x:h.x.toFixed(1),y:h.y.toFixed(1)});b.textContent=e};Xe("ASHEN SETTLEMENT",35,-95,"settlement-plan-title"),Xe("MARKET WARD",44,-15),Xe("HARBOR QUAY",195,-68),Xe("CROFT LANE",-182,-181),Xe("GATEWARD INN",-179,-103);const dt=we("g","settlement-plan-player",{"aria-label":"Player position on settlement plan",display:"none"}),rs=document.createElementNS("http://www.w3.org/2000/svg","circle");rs.setAttribute("r","7"),dt.append(rs);const ls=document.createElementNS("http://www.w3.org/2000/svg","path");ls.setAttribute("d","M 0 -5 L 3 2 L 0 1 L -3 2 Z"),dt.append(ls),we("path","settlement-plan-north-arrow",{d:"M 396 40 L 396 20 M 390 28 L 396 20 L 402 28"});const ia=we("text","settlement-plan-north-label",{x:396,y:15});ia.textContent="N",Kt.forEach(({mapPoints:e,kind:i,closed:r,from:p,to:h,width:b})=>{const T=Math.max(1.25,(b??(i==="pass"?22:18))*380/6e3);i==="pass"&&as(ss,e,"map-road-shoulder",r,p,h).setAttribute("stroke-width",String(T+2.2)),as(ss,e,i==="trail"?"map-road-trail":"map-road",r,p,h).setAttribute("stroke-width",String(T))}),a.querySelector(".map-river").setAttribute("d",ts(Ws));const Pt=a.querySelector("#map-landmark-layer");ka.forEach(e=>{const i=ue(e.x,e.z),r=ge(i.x,i.y),p=document.createElementNS("http://www.w3.org/2000/svg","circle");p.setAttribute("class",`map-landmark map-landmark-${e.type}`),p.setAttribute("cx",r.x.toFixed(1)),p.setAttribute("cy",r.y.toFixed(1)),p.setAttribute("r","3"),p.dataset.landmark=e.id;const h=document.createElementNS("http://www.w3.org/2000/svg","title");h.textContent=e.title,p.append(h),Pt.append(p)});const cs=Array.from(ee.childNodes).filter(e=>e.nodeType!==Node.ELEMENT_NODE||!e.matches(".map-fog-overlay, defs")).map(e=>e.cloneNode(!0));cs.forEach(e=>{e.nodeType===Node.ELEMENT_NODE&&(e.querySelectorAll("[id]").forEach(i=>i.removeAttribute("id")),e.hasAttribute("id")&&e.removeAttribute("id"))}),S.classList.add("signal-map"),S.replaceChildren(...cs);const $t=S.querySelector(".map-player");he.forEach(({id:e,x:i,z:r})=>{const p=ue(i,r),h=ge(p.x,p.y),b=a.querySelector(`[data-map-marker="${e}"]`);b.setAttribute("cx",h.x.toFixed(1)),b.setAttribute("cy",h.y.toFixed(1))});const ds=ue(Ds.x,Ds.z),ps=ge(ds.x,ds.y),us=a.querySelector(".map-garage-marker");us.setAttribute("cx",ps.x.toFixed(1)),us.setAttribute("cy",ps.y.toFixed(1));const Ze=(e,i,r,p)=>{if(!De||it.has(p))return;const h=document.createElementNS("http://www.w3.org/2000/svg","circle");h.setAttribute("cx",e.toFixed(1)),h.setAttribute("cy",i.toFixed(1)),h.setAttribute("r",r.toFixed(1)),De.append(h),it.set(p,h)};he.forEach(({id:e,x:i,z:r})=>{if(!Q.has(e))return;const p=ue(i,r),h=ge(p.x,p.y);Ze(h.x,h.y,38,`signal-${e}`)});const hs=["trailhead","crossing","settlement","bones","signal","high-pass"],ms=()=>{[ee,S].forEach(e=>e.querySelectorAll("[data-road-from]").forEach(i=>{const r=hs[Number(i.dataset.roadFrom)-1],p=hs[Number(i.dataset.roadTo)-1];i.classList.toggle("is-lit",!!(r&&p&&Q.has(r)&&Q.has(p)))})),he.forEach(({id:e,x:i,z:r})=>{if([a.querySelector(`[data-map-marker="${e}"]`),S.querySelector(`[data-map-marker="${e}"]`)].forEach(b=>b==null?void 0:b.classList.toggle("is-lit",Q.has(e))),!Q.has(e))return;const p=ue(i,r),h=ge(p.x,p.y);Ze(h.x,h.y,38,`signal-${e}`)})};ms();const oa=(e,i=0,r=0)=>{var f;if(!e||!K)return;nt={x:e.x,z:e.z};const p=e.x-Et.x,h=e.z-Et.z,b=Nt.map(g=>({building:g,distance:Math.hypot(p-g.x,h-g.z)})).filter(({distance:g})=>g<=105).sort((g,x)=>g.distance-x.distance);Dt.forEach(g=>g.classList.remove("is-detected")),b.forEach(({building:g})=>{var x;(x=Dt.get(g.id))==null||x.classList.add("is-detected")});const T=b.length>0||Math.hypot(p,h)<510,D=Ye(p,h);if(dt.setAttribute("transform",`translate(${D.x.toFixed(1)} ${D.y.toFixed(1)}) rotate(${(i*180/Math.PI).toFixed(1)})`),dt.setAttribute("display",T?"inline":"none"),U.hidden=!T,T){const g=((f=b[0])==null?void 0:f.building.label)??"OUTER SETTLEMENT";U.textContent=`MAP DETECTION · ${b.length} BUILT SITES NEARBY · NEAREST: ${g.toUpperCase()}`}const W=ue(e.x,e.z),B=ge(W.x,W.y),ne=`translate(${B.x.toFixed(1)} ${B.y.toFixed(1)}) rotate(${(i*180/Math.PI).toFixed(1)})`;if(K.setAttribute("transform",ne),$t==null||$t.setAttribute("transform",ne),Ze(B.x,B.y,12,"player"),!je||Math.hypot(e.x-je.x,e.z-je.z)>45){je={x:e.x,z:e.z},qe.push({x:B.x,y:B.y}),qe.length>180&&qe.shift();const g=qe.map((x,z)=>`${z?"L":"M"} ${x.x.toFixed(1)} ${x.y.toFixed(1)}`).join(" ");ae==null||ae.setAttribute("d",g),Ze(B.x,B.y,3,`trail-${qe.length}`)}if(X){const g=he.find(x=>x.id===X);if(g){const x=g.markerX??g.x,z=g.markerZ??g.z,de=ue(x,z),ht=ge(de.x,de.y);ie==null||ie.setAttribute("d",`M ${B.x.toFixed(1)} ${B.y.toFixed(1)} L ${ht.x.toFixed(1)} ${ht.y.toFixed(1)}`);const mt=x-e.x,gt=z-e.z,ft=Math.atan2(mt,gt)-i;E.style.transform=`rotate(${(ft*180/Math.PI).toFixed(1)}deg)`,F.textContent=`${g.title} · ${Math.round(Math.hypot(mt,gt))} M`,m.hidden=!1}}else ie==null||ie.removeAttribute("d"),m.hidden=!0;G&&(G.textContent=`FIELD COORDINATES ${Math.round(W.x)}, ${Math.round(W.y)} · ELEVATION ${Math.round(r)} M`)},Me=(e=!0)=>{u.hidden=!0,a.classList.remove("is-map-open"),O.setAttribute("aria-expanded","false"),c==null||c.setPaused(!j||!w.hidden||!R.hidden),e&&O.focus()},pt=()=>{w.hidden=!0,I.setAttribute("aria-expanded","false"),ve(),M==null||M.classList.add("is-hidden"),j&&(R.hidden=!0,k.setAttribute("aria-expanded","false")),u.hidden=!1,a.classList.add("is-map-open"),O.setAttribute("aria-expanded","true"),c==null||c.setPaused(!0),a.querySelector("#skill-map-close").focus()};d.forEach(e=>{e.addEventListener("click",()=>{const i=e.dataset.destination,r=fe.find(p=>p.id===i);r&&(X=i,Lt.disabled=!1,kt.disabled=!1,d.forEach(p=>p.setAttribute("aria-pressed",String(p===e))),a.querySelectorAll("[data-map-marker]").forEach(p=>{p.classList.toggle("is-selected",p.dataset.mapMarker===i)}),q.textContent=`${r.title.toUpperCase()} · ${Q.has(i)?"SIGNAL LIT":"SIGNAL DARK"} · SELECT FOLLOW ROUTE OR FAST TRAVEL`)})}),Lt.addEventListener("click",()=>{var e;X&&(Ae=X,c==null||c.setDestination(X),j||Oe(X),Ee=!1,N.setAttribute("aria-pressed","false"),N.querySelector("span").textContent="OPTIONAL RALLY",v.textContent=`WAYPOINT SET · FOLLOW THE ROAD TO ${(e=fe.find(i=>i.id===X))==null?void 0:e.title.toUpperCase()}`,Me())}),kt.addEventListener("click",()=>{if(!X)return;if(j||Oe(X),!(c!=null&&c.travelToDestination(X))){q.textContent="FAST TRAVEL IS UNAVAILABLE RIGHT NOW";return}Ae=X,qe.splice(0),je=null,ae==null||ae.removeAttribute("d");for(const[i,r]of it)i.startsWith("trail-")&&(r.remove(),it.delete(i));const e=fe.find(i=>i.id===X);v.textContent=Q.has(X)?`ARRIVED AT ${e.title.toUpperCase()} · SIGNAL RESTORED`:`ARRIVED AT ${e.title.toUpperCase()} · THE SIGNAL IS STILL DARK`,a.classList.add("is-fast-travelling"),window.setTimeout(()=>a.classList.remove("is-fast-travelling"),520),Me()}),Zs.addEventListener("click",()=>{X=null,Ae=null,c==null||c.clearDestination(),d.forEach(e=>e.setAttribute("aria-pressed","false")),a.querySelectorAll("[data-map-marker]").forEach(e=>e.classList.remove("is-selected")),q.textContent="WAYPOINT CLEARED",Lt.disabled=!0,kt.disabled=!0,m.hidden=!0,ie==null||ie.removeAttribute("d")}),ke.forEach(e=>{e.addEventListener("click",()=>{const i=e.getAttribute("aria-pressed")!=="true";e.setAttribute("aria-pressed",String(i));const r=e.dataset.mapLayer;r==="roads"?a.querySelector("#map-road-layer").classList.toggle("is-hidden",!i):r==="river"?a.querySelector(".map-river").classList.toggle("is-hidden",!i):r==="landmarks"?Pt.classList.toggle("is-hidden",!i):r==="fog"&&a.querySelector(".map-fog-overlay").classList.toggle("is-hidden",!i)})});const gs=e=>{ee.toggleAttribute("hidden",e),Us.toggleAttribute("hidden",!e),_s.forEach(i=>{i.hidden=e}),Yt.setAttribute("aria-pressed",String(!e)),Xt.setAttribute("aria-pressed",String(e)),Vs.textContent=e?"ASHEN SETTLEMENT · STREET & BUILDING PLAN":"SIGNAL RIDGE · 6 KM × 3.84 KM"};Yt.addEventListener("click",()=>gs(!1)),Xt.addEventListener("click",()=>gs(!0)),js.addEventListener("click",()=>Ct(.5)),Ks.addEventListener("click",()=>Ct(-.5)),Xs.addEventListener("click",()=>{Se=1,Re={x:210,y:150},lt()}),Ys.addEventListener("click",()=>{if(!nt){q.textContent="START THE JOURNEY TO TRACK YOUR POSITION";return}Se=Math.max(Se,1.6);const e=ue(nt.x,nt.z);Re=ge(e.x,e.y),lt()}),ee.addEventListener("pointerdown",e=>{e.button===0&&(It=!0,He={x:e.clientX,y:e.clientY},ee.setPointerCapture(e.pointerId))}),ee.addEventListener("pointermove",e=>{if(!It||!He)return;const i=ee.getBoundingClientRect();Re.x-=(e.clientX-He.x)*(420/i.width)/Se,Re.y-=(e.clientY-He.y)*(300/i.height)/Se,He={x:e.clientX,y:e.clientY},lt()});const fs=e=>{It=!1,He=null,ee.hasPointerCapture(e.pointerId)&&ee.releasePointerCapture(e.pointerId)};ee.addEventListener("pointerup",fs),ee.addEventListener("pointercancel",fs),ee.addEventListener("wheel",e=>{e.preventDefault(),Ct(e.deltaY<0?.25:-.25)},{passive:!1});const ys=()=>{var e,i;!j||!R.hidden||((e=c==null?void 0:c.noticeBoardCinematic)==null?void 0:e.phase)!=="enter"&&(ve(),u.hidden=!0,O.setAttribute("aria-expanded","false"),w.hidden=!0,I.setAttribute("aria-expanded","false"),R.hidden=!1,a.querySelector("#skills-start").hidden=!0,a.classList.add("is-board-open"),k.setAttribute("aria-expanded","true"),c==null||c.setPaused(!0),(i=s.querySelector('[aria-selected="true"]'))==null||i.focus())},ut=()=>{var e;R.hidden=!0,a.classList.remove("is-board-open"),k.setAttribute("aria-expanded","false"),(e=c==null?void 0:c.exitNoticeBoardView)==null||e.call(c),c==null||c.setPaused(!w.hidden)};k.addEventListener("click",()=>{if(j){if(R.hidden){ys();return}ut()}}),(bs=a.querySelector("#skills-arrival-close"))==null||bs.addEventListener("click",ut),O.addEventListener("click",()=>{u.hidden?pt():Me()}),le.addEventListener("click",pt),(Es=a.querySelector("#fallback-map-open"))==null||Es.addEventListener("click",pt),a.querySelector("#skill-map-close").addEventListener("click",Me),I.addEventListener("click",()=>{const e=w.hidden;u.hidden=!0,a.classList.remove("is-map-open"),O.setAttribute("aria-expanded","false"),j&&(R.hidden=!0,k.setAttribute("aria-expanded","false")),w.hidden=!e,I.setAttribute("aria-expanded",String(e)),c==null||c.setPaused(e||!j||!u.hidden||!R.hidden),e&&a.querySelector("#bruno-controls-close").focus()}),a.querySelector("#bruno-controls-close").addEventListener("click",()=>{w.hidden=!0,I.setAttribute("aria-expanded","false"),c==null||c.setPaused(!j||!u.hidden||!R.hidden),I.focus()}),a.querySelector("#skills-start").addEventListener("click",()=>Oe()),N.addEventListener("click",()=>{Ee=!Ee,Ee?(j||Oe(),Ae=null,ve(),d.forEach(e=>e.setAttribute("aria-pressed","false")),a.querySelectorAll("[data-map-marker]").forEach(e=>e.classList.remove("is-selected")),c?c.startRally():Ot=!0,v.textContent="RALLY STARTED · FIND THE NEXT GOLD GATE"):(c==null||c.stopRally(),v.textContent="FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD"),N.setAttribute("aria-pressed",String(Ee)),N.querySelector("span").textContent=Ee?"END RALLY":"OPTIONAL RALLY"}),a.querySelector("#map-garage").addEventListener("click",()=>{j||Oe(),Me(!1),Qt()});const Ht=e=>{if(!(e.target instanceof HTMLElement&&(e.target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)))){if(xe.hidden||(e.code==="Escape"&&xe.dataset.mode==="citizen"&&(ve(),e.preventDefault(),e.stopImmediatePropagation()),e.code==="KeyE"&&xe.dataset.mode==="citizen"&&(ve(),e.preventDefault(),e.stopImmediatePropagation())),e.code==="KeyE"&&!e.repeat&&!R.hidden&&j){e.preventDefault(),e.stopImmediatePropagation(),ut(),k.focus();return}if(e.code==="Escape"){u.hidden?!R.hidden&&j?(ut(),k.focus()):w.hidden||(w.hidden=!0,I.setAttribute("aria-expanded","false"),c==null||c.setPaused(!j||!u.hidden||!R.hidden),I.focus()):Me();return}e.code==="KeyM"&&!e.repeat&&y.hidden&&(e.preventDefault(),u.hidden?pt():Me())}};window.addEventListener("keydown",Ht);const ra=()=>{const e=a.querySelector("#bruno-canvas");e&&(e.hidden=!0),a.querySelector("#bruno-scene-fallback").hidden=!1,a.classList.add("is-intro"),a.classList.add("is-board-open"),R.hidden=!1,a.querySelector("#skills-start").hidden=!0};return window.setTimeout(()=>{const e=a.querySelector("#bruno-canvas");if(!e)return;jt(async()=>{const{SkillWorld:r}=await import("./skillWorld-DkXcedVQ.js");return{SkillWorld:r}},__vite__mapDeps([2,1])).then(({SkillWorld:r})=>{var b,T,D,W,B,ne;if(c=new r(e,f=>es(f),({speed:f,pitch:g,roll:x,checkpoint:z,totalCheckpoints:de,complete:ht,checkpointDistance:mt,checkpointDirection:gt,destinationId:ft,destinationDistance:yt,destinationDirection:Ss,rallyActive:Ge,rallyElapsedMs:vs,rallyBestMs:la,nearbyBeaconId:Je,nearbySecretId:ws,nearbySettlementTopic:qt,nearSkillsBoard:ca,skillsBoardDistance:qa,nearPierEnd:da,pierDistance:Ga,proximity:A,settlementTopicCount:Ts,settlementTopicTotal:As,lowRange:Gt,offRoad:pa,autoDriving:ua,position:Be,heading:ha,elevation:Ls,worldHour:Bt})=>{var xs,Rs,Os;const ks=a.querySelector("#bruno-speed-value"),Ft=a.querySelector("#bruno-gear-value");ks&&(ks.textContent=String(f)),Ft&&(Ft.textContent=Gt?"L":"H",Ft.setAttribute("aria-label",Gt?"Low range":"High range"));const Wt=a.querySelector("#incline-pitch-val"),Ut=a.querySelector("#incline-roll-val");if(Wt&&typeof g=="number"&&(Wt.textContent=`${g>=0?"+":""}${g}°`,Wt.className="incline-num "+(Math.abs(g)>30?"is-danger":Math.abs(g)>20?"is-warn":"is-ok")),Ut&&typeof x=="number"&&(Ut.textContent=`${x>=0?"+":""}${x}°`,Ut.className="incline-num "+(Math.abs(x)>30?"is-danger":Math.abs(x)>20?"is-warn":"is-ok")),a.classList.toggle("is-driving",f>0),a.classList.toggle("is-off-road",!!pa),a.classList.toggle("is-auto-driving",!!ua),a.dataset.gear=Gt?"L":"H",oa(Be,ha,Ls),Be){const Ce=La(Be.x,Be.z);se.setWorldRegion(Ce,f/3.6);const pe={lowlands:"LOWLANDS",riverlands:"RIVERLANDS",ashen:"ASHEN VALE",ashenCoast:"ASHEN COAST",fossil:"FOSSIL RIDGE",signal:"SIGNAL RANGE",highPass:"HIGH PASS",motorYard:"MOTOR YARD"};if(G){const V=ue(Be.x,Be.z);G.textContent=`${pe[Ce]} · MAP ${Math.round(V.x)}, ${Math.round(V.y)} · ${Math.round(Ls??0)} M`}if(Number.isFinite(Bt)){const V=Bt>=20||Bt<6?"night":"day";ee.dataset.timePhase=V,S.dataset.timePhase=V}}if(M){const pe=[(A==null?void 0:A.secret)&&{key:`secret:${A.secret.id}`,distance:A.secret.distance,showRadius:12,hideRadius:16,tag:"HIDDEN PLACE",title:((xs=St[A.secret.id])==null?void 0:xs.title)||A.secret.title,hint:"STOP AND PRESS E TO INVESTIGATE"},(A==null?void 0:A.citizen)&&{key:`citizen:${A.citizen.name}`,distance:A.citizen.distance,showRadius:10,hideRadius:14,tag:`THE ASHEN SETTLEMENT · ${A.citizen.role}`,title:A.citizen.name,hint:f>6?"SLOW DOWN TO TALK":"PRESS E TO HEAR THEIR STORY"},(A==null?void 0:A.settlement)&&{key:`settlement:${A.settlement.id}`,distance:A.settlement.distance,showRadius:11,hideRadius:14,tag:`THE ASHEN SETTLEMENT · ${A.settlement.district||"ASHEN COAST"}`,title:A.settlement.establishment||A.settlement.title,hint:A.settlement.lit?"HOUSE LAMP LIT · PRESS E TO VIEW":"PRESS E TO DISCOVER"},(A==null?void 0:A.board)&&{key:"board",distance:A.board.distance,showRadius:22,hideRadius:28,tag:"TRAILHEAD · NOTICE BOARD",title:"Skills in context",hint:f>6?"SLOW DOWN TO READ":"PRESS E TO ENTER BOARD VIEW"},(A==null?void 0:A.beacon)&&{key:`beacon:${A.beacon.id}`,distance:A.beacon.distance,showRadius:18,hideRadius:24,tag:"SIGNAL BEACON",title:A.beacon.title,hint:A.beacon.lit?"SIGNAL RESTORED":"PRESS E TO RELIGHT SIGNAL"},(A==null?void 0:A.pier)&&{key:"pier",distance:A.pier.distance,showRadius:6,hideRadius:10,tag:"THE LAST DOCK",title:"Signal Island",hint:"AN ISLAND IN SIGHT · SOMETHING WAITS BEYOND"}].filter(V=>V&&Number.isFinite(V.distance)).find(V=>V.distance<=(V.key===J?V.hideRadius:V.showRadius));pe?(J=pe.key,M.dataset.kind=pe.key.split(":")[0],H.textContent=pe.tag,Z.textContent=pe.title,L.textContent=pe.hint,P.textContent=`${pe.distance} M`,M.classList.remove("is-hidden"),M.setAttribute("aria-hidden","false")):(J=null,M.classList.add("is-hidden"),M.setAttribute("aria-hidden","true"))}if(Number.isFinite(z)&&Number.isFinite(de)){const Ce=fe.find(V=>V.id===ft),pe=$e?"ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN":da?"THE LAST DOCK · THE ENDLESS SEA · AN ISLAND IN SIGHT FAR AWAY":ws?`HIDDEN PLACE · STOP AND PRESS E · ${(Rs=St[ws])==null?void 0:Rs.title.toUpperCase()}`:qt?`THE ASHEN SETTLEMENT · STOP AND PRESS E · ${(qt.establishment||qt.title).toUpperCase()}`:ca?f>8?"TRAILHEAD BOARD · STOP THE CAR TO BROWSE SIX SKILLS":"TRAILHEAD BOARD · PRESS E TO BROWSE SIX SKILLS":Je==="settlement"&&Ts<As?`SETTLEMENT SIGNAL SEALED · LIGHT THE HOUSE LAMPS ${Ts}/${As}`:Je&&!Q.has(Je)?Je==="signal"&&!["trailhead","crossing","settlement","bones"].every(V=>Q.has(V))?"THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES":`SIGNAL READY · PRESS E TO RELIGHT ${(Os=fe.find(V=>V.id===Je))==null?void 0:Os.title.toUpperCase()}`:Ce?yt<=7?`FIELD NOTE · ${Ce.title.toUpperCase()}`:`ROUTE TO ${Ce.title.toUpperCase()} · ${Ss||"FOLLOW"} ${yt??""}M`:ft==="garage"?`MOTOR WORKS · ${yt<=12?"ENTERING GARAGE":`${Ss||"FIND"} ${yt??""}M`}`:Ge?ht?`RALLY COMPLETE · ${_t(vs)} · BEST ${_t(la)}`:`RALLY · ${Math.min(z,de)}/${de} · ${_t(vs)} · ${gt||"FIND"} ${mt??""}M`:"FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD";v.textContent=pe}typeof Ge=="boolean"&&Ee!==Ge&&(Ee=Ge,N.setAttribute("aria-pressed",String(Ge)),N.querySelector("span").textContent=Ge?"END RALLY":"OPTIONAL RALLY")},(f,g)=>{var x;y.hidden=!f,le.hidden=f||!j,rt(g),(x=a.querySelector(f?"#garage-close":"#bruno-btn-garage"))==null||x.focus()},(f,g)=>{const x=$e;Q=new Set(f),$e=f.length===g,xt.querySelectorAll("[data-signal-unlock]").forEach(z=>{z.disabled=!Q.has(z.dataset.signalUnlock)}),ms(),Zt&&(Zt.textContent=String(f.length));try{window.localStorage.setItem($s,JSON.stringify(f))}catch(z){console.error("Failed to save Signal Ridge beacon progress:",z)}$e&&(v.textContent="ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN"),$e&&!x&&es("signal")},at,ta,Ke,f=>{if(!Pe.includes(f.id)){Pe.push(f.id);try{window.localStorage.setItem(qs,JSON.stringify(Pe))}catch(g){console.error("Failed to save Ashen Settlement house progress:",g)}}sa(f)},vt,Pe,ys,ot),e._world=c,c.setGarageStyle(_e.value),c.setReducedMotion(ce),!a.isConnected){c.dispose(),window.removeEventListener("keydown",Ht),i.disconnect();return}me=c.setVehicleBuild(me),rt(me),j||Oe(),c.setPaused(!j||!u.hidden||!w.hidden||!R.hidden),Ae&&c.setDestination(Ae),st&&(st=!1,c.travelToGarage()),Ot&&(c.startRally(),Ot=!1),(b=a.querySelector("#bruno-btn-horn"))==null||b.addEventListener("click",()=>{c.honk()}),(T=a.querySelector("#bruno-btn-reset"))==null||T.addEventListener("click",()=>{c.resetVehicle()}),(D=a.querySelector("#bruno-btn-garage"))==null||D.addEventListener("click",Qt),(W=a.querySelector("#garage-close"))==null||W.addEventListener("click",()=>c.exitGarage()),(B=a.querySelector("#garage-drive"))==null||B.addEventListener("click",()=>c.exitGarage());const p=()=>{const f={...c.getVehicleBuild()};Rt.forEach(g=>{f[g.dataset.build]=g.type==="range"?Number(g.value):g.value}),me=c.setVehicleBuild(f),rt(me);try{window.localStorage.setItem(zt,JSON.stringify(me)),Ve.textContent="BUILD SAVED LOCALLY"}catch(g){Ve.textContent="BUILD NOT SAVED",console.error("Failed to save the Signal Ridge vehicle build:",g)}};Rt.forEach(f=>f.addEventListener("input",p)),xt.addEventListener("change",()=>{const f=Gs.find(({id:x})=>x===xt.value);if(!f||!Q.has(f.id))return;const g=a.querySelector('[data-build="paint"]');g.value=f.paint,g.dispatchEvent(new Event("input",{bubbles:!0}))}),(ne=a.querySelector("#garage-reset"))==null||ne.addEventListener("click",()=>{me=c.setVehicleBuild(Vt),rt(me);try{window.localStorage.setItem(zt,JSON.stringify(me)),Ve.textContent="STOCK BUILD RESTORED"}catch(f){Ve.textContent="BUILD NOT SAVED",console.error("Failed to save the restored Signal Ridge vehicle build:",f)}}),a.querySelectorAll("[data-key]").forEach(f=>{const g=f.dataset.key,x=de=>{de.preventDefault(),f.setPointerCapture&&f.setPointerCapture(de.pointerId),c!=null&&c.keys&&g in c.keys&&(c.keys[g]=!0),c!=null&&c.carBody&&c.carBody.wakeUp()},z=de=>{de.preventDefault(),c!=null&&c.keys&&g in c.keys&&(c.keys[g]=!1)};f.addEventListener("pointerdown",x),f.addEventListener("pointerup",z),f.addEventListener("pointerleave",z),f.addEventListener("pointercancel",z),f.addEventListener("lostpointercapture",z)})}).catch(r=>{ra(),console.error("Failed to load SkillWorld engine:",r)});const i=new MutationObserver(()=>{var r;a.isConnected||((r=e._world)==null||r.dispose(),window.removeEventListener("keydown",Ht),i.disconnect())});i.observe(document.body,{childList:!0,subtree:!0})},0),a}function Te(a){return String(a).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function Da(){const a=C.personal,t=document.createElement("div");return t.className="contact-experience",t.innerHTML=`
    <header class="contact-nav">
      <a class="contact-wordmark" href="#home" aria-label="Return home">AS<span> / CONTACT</span></a>
      <span class="contact-nav-note">ADITYA SHINDE · ${Te(a.location.split(",")[0])}</span>
      <a href="#work" data-portfolio-route="projects" class="contact-nav-link">SEE MY WORK ↗</a>
    </header>
    <div class="contact-scroll">
      <section class="contact-opening">
        <div class="contact-opening-copy">
          <p class="contact-kicker">FOR GOOD QUESTIONS & GOOD WORK</p>
          <h1>Have something<br />worth <em>building?</em></h1>
          <p class="contact-lede">I’m a backend and full-stack software engineer working across applications, APIs, and data systems. If there’s a role or a problem you think could be a fit, I’d be glad to hear from you.</p>
          <a class="contact-email-cta" href="mailto:${Te(a.email)}">Write me an email <span>↗</span></a>
        </div>
        <div class="contact-orbit-art" aria-hidden="true">
          <div class="contact-orbit orbit-a"></div><div class="contact-orbit orbit-b"></div>
          <div class="contact-orbit-core"><span>AS</span><small>OPEN CHANNEL</small></div>
          <span class="contact-orbit-label orbit-label-a">SOFTWARE</span>
          <span class="contact-orbit-label orbit-label-b">SYSTEMS</span>
        </div>
      </section>
      <section class="contact-details">
        <div><span>EMAIL</span><a href="mailto:${Te(a.email)}">${Te(a.email)} <b>↗</b></a></div>
        <div><span>PHONE</span><a href="tel:${Te(a.phone.replace(/[^0-9+]/g,""))}">${Te(a.phone)} <b>↗</b></a></div>
        <div><span>LOCATION</span><p>${Te(a.location)}</p></div>
        <div><span>ELSEWHERE</span><p><a href="${Te(a.githubUrl)}" target="_blank" rel="noreferrer">GitHub ↗</a><a href="${Te(a.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn ↗</a></p></div>
      </section>
      <footer class="contact-footer"><span>THANK YOU FOR TAKING A LOOK.</span><a href="#resume" data-portfolio-route="resume">A LITTLE MORE ABOUT ME ↗</a></footer>
    </div>
  `,t}function Pa(){var y;const a=document.getElementById("home-stage");if(!a)return;const t=window.matchMedia("(prefers-reduced-motion: reduce)"),s=()=>document.body.dataset.reducedMotion==="true"||document.body.dataset.motionPreference!=="standard"&&t.matches,n=a.querySelectorAll(".home-stat-card");let o=0,l=null;const d=()=>{o&&window.cancelAnimationFrame(o),o=0,l=null,a.style.setProperty("--pointer-x","68%"),a.style.setProperty("--pointer-y","50%"),a.style.setProperty("--atmosphere-x","0px"),a.style.setProperty("--atmosphere-y","0px"),n.forEach(u=>{u.style.setProperty("--tilt-x","0deg"),u.style.setProperty("--tilt-y","0deg"),u.style.setProperty("--card-light-x","50%"),u.style.setProperty("--card-light-y","50%")})};document.addEventListener("pointermove",u=>{if(s()||u.pointerType==="touch")return;const w=u.target instanceof Element?u.target:null,O=a.getBoundingClientRect(),k=u.clientX>=O.left&&u.clientX<=O.right&&u.clientY>=O.top&&u.clientY<=O.bottom,I=w==null?void 0:w.closest(".os-top-bar, .desktop-icons-container, .os-dock-container, .os-window, .control-center-modal");if(!k||I){d();return}l={x:u.clientX,y:u.clientY,target:u.target},!o&&(o=window.requestAnimationFrame(()=>{if(o=0,!l)return;const N=l,R=a.getBoundingClientRect(),v=Math.max(0,Math.min(1,(N.x-R.left)/R.width)),M=Math.max(0,Math.min(1,(N.y-R.top)/R.height));a.style.setProperty("--pointer-x",`${(v*100).toFixed(1)}%`),a.style.setProperty("--pointer-y",`${(M*100).toFixed(1)}%`),a.style.setProperty("--atmosphere-x",`${((v-.5)*24).toFixed(1)}px`),a.style.setProperty("--atmosphere-y",`${((M-.5)*18).toFixed(1)}px`);const H=N.target.closest(".home-stat-card");if(n.forEach(P=>{P!==H&&(P.style.setProperty("--tilt-x","0deg"),P.style.setProperty("--tilt-y","0deg"),P.style.setProperty("--card-light-x","50%"),P.style.setProperty("--card-light-y","50%"))}),H){const P=H.getBoundingClientRect(),Z=Math.max(0,Math.min(1,(N.x-P.left)/P.width)),L=Math.max(0,Math.min(1,(N.y-P.top)/P.height));H.style.setProperty("--tilt-x",`${((Z-.5)*4).toFixed(2)}deg`),H.style.setProperty("--tilt-y",`${((.5-L)*4).toFixed(2)}deg`),H.style.setProperty("--card-light-x",`${(Z*100).toFixed(1)}%`),H.style.setProperty("--card-light-y",`${(L*100).toFixed(1)}%`)}l=null}))}),window.addEventListener("blur",d),document.addEventListener("visibilitychange",()=>{document.hidden&&d()}),(y=t.addEventListener)==null||y.call(t,"change",u=>{u.matches&&d()}),requestAnimationFrame(()=>a.classList.add("home-motion-ready"))}(function(){const t=document.getElementById("site-loader"),s=document.getElementById("loader-status-text");t&&(s&&(s.textContent="PORTFOLIO READY"),window.addEventListener("DOMContentLoaded",()=>{window.setTimeout(()=>{t.classList.add("hidden"),window.setTimeout(()=>t.remove(),700)},180)},{once:!0}))})();document.addEventListener("DOMContentLoaded",()=>{var P,Z,L,J,K,le,S;const a=document.getElementById("os-desktop"),t=document.getElementById("os-dock-container")||document.querySelector(".os-dock-container"),s=document.getElementById("three-canvas-container");Pa();const n=new ya(a,t);let o=null;const l={isEnabled:()=>!!(o&&o.isEnabled),async setEnabled(m){if(!m){o&&o.setEnabled(!1);return}if(o)o.setEnabled(!0);else{const{ThreeBackground:E}=await jt(async()=>{const{ThreeBackground:F}=await import("./threeBackground-Cf50M5EV.js");return{ThreeBackground:F}},__vite__mapDeps([3,1]));o=new E(s)}}},d=new Sa(a,l),y={terminal:{title:"Portfolio console",iconSvg:Ne.terminal,width:860,height:540,isTerminal:!0,createContent:()=>{const m=document.createElement("div");return m.style.height="100%",setTimeout(()=>{new ba(m,n)},0),m}},resume:{title:"Aditya Shinde — Career profile",iconSvg:Ne.resume,width:1240,height:760,createContent:va},projects:{title:"Selected projects — Aditya Shinde",iconSvg:Ne.projects,width:1320,height:780,createContent:m=>Aa(m)},skills:{title:"Engineering map — Skills in context",iconSvg:Ne.skills,width:1240,height:760,createContent:Na},contact:{title:"Contact — Aditya Shinde",iconSvg:Ne.contact,width:1240,height:760,createContent:Da}},u={projects:"work",resume:"resume",skills:"skills",contact:"contact"},w=Object.fromEntries(Object.entries(u).map(([m,E])=>[E,m])),O=[["projects","Work"],["skills","Skills"],["resume","Resume"],["contact","Contact"],["terminal","Terminal"]],k=document.getElementById("desktop-app-shortcuts"),I=document.getElementById("dock-app-shortcuts");O.forEach(([m,E])=>{const F=y[m];if(!F)return;const q=document.createElement("button");q.type="button",q.className="desktop-icon-item",q.dataset.launchApp=m,q.setAttribute("aria-label",`Open ${E}`),q.innerHTML=`<span class="icon-svg-wrap">${F.iconSvg}</span><span class="icon-label">${E}</span>`,k.appendChild(q);const G=document.createElement("button");G.type="button",G.className="dock-item",G.dataset.launchApp=m,G.title=`Open ${E}`,G.setAttribute("aria-label",`Open ${E}`),G.innerHTML=`${F.iconSvg}<span class="dock-tooltip">${E}</span>`,I.appendChild(G)});const N=document.getElementById("system-clock"),R=()=>{const m=new Date;N.dateTime=m.toISOString(),N.textContent=new Intl.DateTimeFormat("en-IN",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(m)};R(),setInterval(R,3e4);function v(m,E=!0,F=!1,q=""){var De;const G=m.toLowerCase().trim(),U=G==="work"?"projects":G;if(U==="control-center"||U==="settings"){d.toggle();return}if(y[U]){if(F&&Object.keys(u).forEach(ke=>{ke!==U&&n.closeWindow(ke)}),E&&u[U]){const ke=`#${u[U]}`;window.location.hash!==ke&&window.history.pushState(null,"",ke)}const ae=y[U],ie=n.windows.get(U);U==="projects"&&q&&ie&&((De=ie.element.querySelector(".study-experience"))==null||De.navigateToProject(q)),n.createWindow({id:U,title:ae.title,iconSvg:ae.iconSvg,content:ae.createContent(q),width:ae.width,height:ae.height,isTerminal:!!ae.isTerminal})}}window.openAppByName=v;function M(m=!0){Object.keys(u).forEach(E=>n.closeWindow(E)),m&&window.location.hash!=="#home"&&window.history.pushState(null,"","#home")}function H(){const m=window.location.hash.slice(1).split("/")[0].toLowerCase();if(!m||m==="home"){M(!1);return}const E=w[m];E&&v(E,!1,!0)}window.addEventListener("hashchange",H),n.onWindowClosed=m=>{const E=u[m];E&&window.location.hash===`#${E}`&&window.history.replaceState(null,"",`${window.location.pathname}${window.location.search}`)},a.addEventListener("click",m=>{const E=m.target.closest("[data-launch-app]");if(E){const G=!!E.closest(".os-dock-container"),U=E.dataset.launchApp;if(G&&n.windows.has(U)){n.windows.get(U).isMinimized?n.restoreWindow(U):n.activeWindow===U?n.minimizeWindow(U):n.focusWindow(U);return}v(E.dataset.launchApp,!0,!1,E.dataset.projectTarget||"");return}const F=m.target.closest('a[href^="#"]');if(!F)return;m.preventDefault();const q=F.dataset.portfolioRoute||F.getAttribute("href").slice(1);q==="home"?M():v(q,!0,!0)}),(P=document.getElementById("top-control-center-btn"))==null||P.addEventListener("click",M),(Z=document.getElementById("top-spotlight-trigger"))==null||Z.addEventListener("click",()=>d.open()),(L=document.getElementById("top-open-terminal"))==null||L.addEventListener("click",()=>v("terminal")),(J=document.getElementById("top-open-projects"))==null||J.addEventListener("click",()=>v("projects",!0,!0)),(K=document.getElementById("top-open-resume"))==null||K.addEventListener("click",()=>v("resume",!0,!0)),(le=document.getElementById("top-open-skills"))==null||le.addEventListener("click",()=>v("skills",!0,!0)),(S=document.getElementById("top-recruit-btn"))==null||S.addEventListener("click",()=>v("contact",!0,!0)),window.addEventListener("keydown",m=>{(m.metaKey||m.ctrlKey)&&m.key.toLowerCase()==="k"&&(m.preventDefault(),d.toggle())}),H()});export{Ra as A,ja as F,Ds as G,Ya as H,Xa as P,Kt as R,Et as S,za as T,xa as W,Wa as Z,he as a,Ka as b,Ba as c,Fa as d,Va as e,_ as f,Ma as g,Ia as h,Ps as i,Ua as j,_a as k,Oa as l,Fs as m,wt as n,C as r,se as s};
