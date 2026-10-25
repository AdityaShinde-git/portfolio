const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/workWorld-D0qGXKyN.js","assets/three.module-Dojr5jEI.js","assets/skillWorld-CagNtTkd.js","assets/threeBackground-B49l8X-E.js"])))=>i.map(i=>d[i]);
(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const xa="modulepreload",Oa=function(a){return"/"+a},Zt={},xt=function(e,t,n){let i=Promise.resolve();if(t&&t.length>0){let d=function(x){return Promise.all(x.map(A=>Promise.resolve(A).then(O=>({status:"fulfilled",value:O}),O=>({status:"rejected",reason:O}))))};document.getElementsByTagName("link");const f=document.querySelector("meta[property=csp-nonce]"),h=(f==null?void 0:f.nonce)||(f==null?void 0:f.getAttribute("nonce"));i=d(t.map(x=>{if(x=Oa(x),x in Zt)return;Zt[x]=!0;const A=x.endsWith(".css"),O=A?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${x}"]${O}`))return;const T=document.createElement("link");if(T.rel=A?"stylesheet":xa,A||(T.as="script"),T.crossOrigin="",T.href=x,h&&T.setAttribute("nonce",h),document.head.appendChild(T),A)return new Promise((P,q)=>{T.addEventListener("load",P),T.addEventListener("error",()=>q(new Error(`Unable to preload CSS for ${x}`)))})}))}function r(d){const f=new Event("vite:preloadError",{cancelable:!0});if(f.payload=d,window.dispatchEvent(f),!f.defaultPrevented)throw d}return i.then(d=>{for(const f of d||[])f.status==="rejected"&&r(f.reason);return e().catch(r)})};class Ra{constructor(){this.enabled=!0,this.volume=.35,this.ctx=null,this.masterGain=null,this.worldAudio=null}init(){if(!this.ctx&&typeof window<"u"){const e=window.AudioContext||window.webkitAudioContext;e&&(this.ctx=new e,this.masterGain=this.ctx.createGain(),this.masterGain.gain.value=this.enabled?this.volume:0,this.masterGain.connect(this.ctx.destination))}}toggleSound(){return this.enabled=!this.enabled,this.masterGain&&this.ctx&&this.masterGain.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.04),this.enabled}setVolume(e){return this.volume=Math.min(1,Math.max(0,Number(e))),Number.isFinite(this.volume)||(this.volume=.35),this.masterGain&&this.ctx&&this.enabled&&this.masterGain.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.04),this.volume}startWorldAmbience(){if(!this.enabled||this.worldAudio||(this.init(),!this.ctx||!this.masterGain))return;const e=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),t=e.getChannelData(0);for(let h=0;h<t.length;h+=1)t[h]=(Math.random()*2-1)*.18;const n=this.ctx.createBufferSource();n.buffer=e,n.loop=!0;const i=this.ctx.createBiquadFilter();i.type="lowpass",i.frequency.value=420;const r=this.ctx.createGain();r.gain.value=.05,n.connect(i),i.connect(r),r.connect(this.masterGain);const d=this.ctx.createOscillator();d.type="sine",d.frequency.value=58;const f=this.ctx.createGain();f.gain.value=.018,d.connect(f),f.connect(this.masterGain),n.start(),d.start(),this.worldAudio={noise:n,filter:i,noiseGain:r,drone:d,droneGain:f,region:"lowlands"},this.ctx.resume().catch(h=>{console.error("Unable to start Signal Ridge ambience:",h)})}setWorldRegion(e,t=0){if(!this.worldAudio||!this.ctx)return;const n={lowlands:{cutoff:420,drone:58,noise:.035},riverlands:{cutoff:780,drone:72,noise:.075},ashen:{cutoff:250,drone:49,noise:.028},fossil:{cutoff:1100,drone:64,noise:.06},signal:{cutoff:560,drone:82,noise:.048},highPass:{cutoff:1350,drone:92,noise:.065},motorYard:{cutoff:340,drone:54,noise:.025}},i=n[e]??n.lowlands,r=this.ctx.currentTime;this.worldAudio.filter.frequency.setTargetAtTime(i.cutoff,r,1.4),this.worldAudio.drone.frequency.setTargetAtTime(i.drone,r,1.4),this.worldAudio.noiseGain.gain.setTargetAtTime(i.noise+Math.min(.035,Math.abs(t)*.001),r,.5),this.worldAudio.region=e}stopWorldAmbience(){this.worldAudio&&(this.worldAudio.noise.stop(),this.worldAudio.drone.stop(),this.worldAudio=null)}playKeySound(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.createOscillator(),t=this.ctx.createGain();e.type="sine",e.frequency.setValueAtTime(600+Math.random()*200,this.ctx.currentTime),t.gain.setValueAtTime(.015,this.ctx.currentTime),t.gain.exponentialRampToValueAtTime(1e-4,this.ctx.currentTime+.04),e.connect(t),t.connect(this.masterGain),e.start(),e.stop(this.ctx.currentTime+.04)}catch{}}playWindowOpen(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="triangle",t.frequency.setValueAtTime(320,e),t.frequency.exponentialRampToValueAtTime(640,e+.12),n.gain.setValueAtTime(.04,e),n.gain.exponentialRampToValueAtTime(.001,e+.14),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.14)}catch{}}playWindowClose(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(520,e),t.frequency.exponentialRampToValueAtTime(260,e+.1),n.gain.setValueAtTime(.03,e),n.gain.exponentialRampToValueAtTime(.001,e+.1),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.1)}catch{}}playSuccess(){if(this.enabled&&(this.init(),!!this.ctx))try{[440,554.37,659.25,880].forEach((t,n)=>{const i=this.ctx.currentTime+n*.08,r=this.ctx.createOscillator(),d=this.ctx.createGain();r.type="triangle",r.frequency.setValueAtTime(t,i),d.gain.setValueAtTime(.05,i),d.gain.exponentialRampToValueAtTime(.001,i+.18),r.connect(d),d.connect(this.masterGain),r.start(i),r.stop(i+.18)})}catch{}}playHonk(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime;[380,475].forEach(t=>{const n=this.ctx.createOscillator(),i=this.ctx.createGain();n.type="sawtooth",n.frequency.setValueAtTime(t,e),i.gain.setValueAtTime(.06,e),i.gain.exponentialRampToValueAtTime(.001,e+.22),n.connect(i),i.connect(this.masterGain),n.start(e),n.stop(e+.22)})}catch{}}playCrash(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="triangle",t.frequency.setValueAtTime(140,e),t.frequency.exponentialRampToValueAtTime(40,e+.15),n.gain.setValueAtTime(.12,e),n.gain.exponentialRampToValueAtTime(.001,e+.16),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.16)}catch{}}playDiscovery(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime;[523.25,659.25,783.99,1046.5].forEach((t,n)=>{const i=this.ctx.createOscillator(),r=this.ctx.createGain();i.type="sine",i.frequency.setValueAtTime(t,e+n*.05),r.gain.setValueAtTime(.05,e+n*.05),r.gain.exponentialRampToValueAtTime(1e-4,e+n*.05+.3),i.connect(r),r.connect(this.masterGain),i.start(e+n*.05),i.stop(e+n*.05+.3)})}catch{}}playSignal(e){if(!this.enabled||(this.init(),!this.ctx))return;const n={trailhead:392,crossing:440,settlement:494,bones:523.25,signal:587.33,"high-pass":659.25}[e];if(!n)return;const i=this.ctx.currentTime,r=this.ctx.createOscillator(),d=this.ctx.createGain();r.type="sine",r.frequency.setValueAtTime(n*.72,i),r.frequency.exponentialRampToValueAtTime(n,i+.32),d.gain.setValueAtTime(1e-4,i),d.gain.exponentialRampToValueAtTime(.08,i+.08),d.gain.exponentialRampToValueAtTime(1e-4,i+1.25),r.connect(d),d.connect(this.masterGain),r.start(i),r.stop(i+1.26)}playWhoosh(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(200,e),t.frequency.exponentialRampToValueAtTime(450,e+.12),n.gain.setValueAtTime(.03,e),n.gain.exponentialRampToValueAtTime(.001,e+.15),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.15)}catch{}}}const Q=new Ra,Te={terminal:`
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
  `,snapLeft:'<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',snapRight:'<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>'};class Ca{constructor(e,t){var n,i;this.desktop=e,this.dock=(n=t==null?void 0:t.classList)!=null&&n.contains("os-dock-container")?t:((i=t==null?void 0:t.closest)==null?void 0:i.call(t,".os-dock-container"))||document.querySelector(".os-dock-container"),this.windows=new Map,this.activeWindow=null,this.highestZIndex=100,this.cascadeOffset=0,window.addEventListener("resize",()=>this.constrainWindowsToViewport())}createWindow({id:e,title:t,iconSvg:n,content:i,width:r=850,height:d=580,isTerminal:f=!1}){if(this.windows.has(e)){const E=this.windows.get(e);return E.closeTimer!==null&&(clearTimeout(E.closeTimer),E.closeTimer=null,E.element.classList.remove("is-closing")),this.focusWindow(e),this.restoreWindow(e),E}const h=document.createElement("div"),x=["projects","resume","skills","contact"].includes(e),A=e==="projects"||e==="skills";h.className=`os-window ${f?"terminal-window-style":""} ${x?"portfolio-workspace":""} ${A?"portfolio-immersive-workspace":""}`,h.id=`win-${e}`;const O=window.innerWidth,T=window.innerHeight;let P=Math.min(r,O-32),q=Math.min(d,T-100),C,N;A?(P=O,q=T,C=0,N=0):(C=Math.max(20,Math.floor((O-P)/2)+this.cascadeOffset),N=Math.max(40,Math.floor((T-q)/2-20)+this.cascadeOffset),this.cascadeOffset=(this.cascadeOffset+24)%120),h.style.width=`${P}px`,h.style.height=`${q}px`,h.style.left=`${C}px`,h.style.top=`${N}px`,this.highestZIndex+=1,h.style.zIndex=this.highestZIndex,h.innerHTML=`
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
          <span class="window-title-text">${t}</span>
        </div>

        <div class="window-utility-bar">
          <button class="utility-btn" title="Snap Left (50%)" data-action="snap-left">
            ${Te.snapLeft}
          </button>
          <button class="utility-btn" title="Snap Right (50%)" data-action="snap-right">
            ${Te.snapRight}
          </button>
        </div>
      </div>

      <div class="window-body">
        ${typeof i=="string"?i:""}
      </div>

      <div class="window-resize-handle"></div>
    `,typeof i!="string"&&i instanceof HTMLElement&&h.querySelector(".window-body").appendChild(i),this.desktop.appendChild(h);const I={id:e,title:t,iconSvg:n,element:h,preferredWidth:r,preferredHeight:d,isMaximized:!1,isMinimized:!1,closeTimer:null,prevBounds:null};return this.windows.set(e,I),this.setupWindowEvents(I),this.focusWindow(e),this.updateDockState(),Q.playWindowOpen(),I}constrainWindowsToViewport(){this.windows.forEach(e=>{const{element:t}=e;if(e.isMaximized||t.style.width.startsWith("calc("))return;const n=Math.min(e.preferredWidth,window.innerWidth-16),i=Math.min(e.preferredHeight,window.innerHeight-80),r=t.classList.contains("portfolio-immersive-workspace"),d=r?Math.max(8,Math.floor((window.innerWidth-n)/2)):Math.min(Math.max(8,parseFloat(t.style.left)||0),window.innerWidth-n-8),f=r?Math.max(36,Math.floor((window.innerHeight-i)/2-20)):Math.min(Math.max(36,parseFloat(t.style.top)||0),window.innerHeight-i-44);t.style.width=`${n}px`,t.style.height=`${i}px`,t.style.left=`${d}px`,t.style.top=`${f}px`})}setupWindowEvents(e){const{id:t,element:n}=e,i=n.querySelector(".window-header");n.addEventListener("mousedown",()=>this.focusWindow(t)),i.addEventListener("click",v=>{const F=v.target.closest("button");if(!F)return;const G=F.dataset.action;G==="close"&&this.closeWindow(t),G==="minimize"&&this.minimizeWindow(t),G==="maximize"&&this.toggleMaximize(t),G==="snap-left"&&this.snapWindow(t,"left"),G==="snap-right"&&this.snapWindow(t,"right")}),i.addEventListener("dblclick",v=>{v.target.closest("button")||this.toggleMaximize(t)});let r=!1,d,f,h,x;const A=v=>{v.target.closest("button")||e.isMaximized||(r=!0,d=v.clientX||v.touches&&v.touches[0].clientX,f=v.clientY||v.touches&&v.touches[0].clientY,h=parseInt(n.style.left,10)||0,x=parseInt(n.style.top,10)||0,n.classList.add("is-dragging"),document.addEventListener("mousemove",O),document.addEventListener("mouseup",T),document.addEventListener("touchmove",O),document.addEventListener("touchend",T))},O=v=>{if(!r)return;const F=v.clientX||v.touches&&v.touches[0].clientX,G=v.clientY||v.touches&&v.touches[0].clientY,K=F-d,g=G-f;let u=h+K,y=x+g;y=Math.max(34,y),u=Math.max(-n.offsetWidth+80,Math.min(u,window.innerWidth-80)),n.style.left=`${u}px`,n.style.top=`${y}px`},T=()=>{r&&(r=!1,n.classList.remove("is-dragging"),document.removeEventListener("mousemove",O),document.removeEventListener("mouseup",T),document.removeEventListener("touchmove",O),document.removeEventListener("touchend",T))};i.addEventListener("mousedown",A),i.addEventListener("touchstart",A,{passive:!0});const P=n.querySelector(".window-resize-handle");let q=!1,C,N;const I=v=>{e.isMaximized||(v.stopPropagation(),q=!0,d=v.clientX,f=v.clientY,C=n.offsetWidth,N=n.offsetHeight,document.addEventListener("mousemove",E),document.addEventListener("mouseup",$))},E=v=>{if(!q)return;const F=Math.max(360,C+(v.clientX-d)),G=Math.max(260,N+(v.clientY-f));n.style.width=`${F}px`,n.style.height=`${G}px`},$=()=>{q=!1,document.removeEventListener("mousemove",E),document.removeEventListener("mouseup",$)};P.addEventListener("mousedown",I)}snapWindow(e,t){const n=this.windows.get(e);n&&(n.element.style.top="36px",n.element.style.height="calc(100vh - 100px)",n.element.style.width="calc(50vw - 12px)",t==="left"?n.element.style.left="6px":n.element.style.left="50vw")}focusWindow(e){const t=this.windows.get(e);!t||t.element.classList.contains("is-closing")||(this.highestZIndex+=1,t.element.style.zIndex=this.highestZIndex,this.windows.forEach(n=>{n.element.classList.remove("active-window")}),t.element.classList.add("active-window"),this.activeWindow=e,this.updateImmersiveState(),this.updateDockState())}toggleMaximize(e){const t=this.windows.get(e);t&&(t.isMaximized?(t.element.style.width=`${t.prevBounds.width}px`,t.element.style.height=`${t.prevBounds.height}px`,t.element.style.left=`${t.prevBounds.left}px`,t.element.style.top=`${t.prevBounds.top}px`,t.element.classList.remove("is-maximized"),t.isMaximized=!1):(t.prevBounds={width:t.element.offsetWidth,height:t.element.offsetHeight,left:parseInt(t.element.style.left,10),top:parseInt(t.element.style.top,10)},t.element.style.left="0px",t.element.style.top="36px",t.element.style.width="100vw",t.element.style.height="calc(100vh - 96px)",t.element.classList.add("is-maximized"),t.isMaximized=!0))}minimizeWindow(e){const t=this.windows.get(e);if(t){if(t.element.classList.add("is-minimized"),t.isMinimized=!0,this.activeWindow===e){const n=[...this.windows.values()].filter(i=>i.id!==e&&!i.isMinimized&&!i.element.classList.contains("is-closing")).sort((i,r)=>Number(r.element.style.zIndex)-Number(i.element.style.zIndex))[0];this.activeWindow=n?n.id:null}this.updateImmersiveState(),this.updateDockState(),Q.playWindowClose()}}restoreWindow(e){const t=this.windows.get(e);t&&(t.element.classList.remove("is-minimized"),t.isMinimized=!1,this.focusWindow(e))}closeWindow(e){const t=this.windows.get(e);!t||t.element.classList.contains("is-closing")||(t.element.classList.add("is-closing"),Q.playWindowClose(),t.closeTimer=setTimeout(()=>{if(t.closeTimer=null,this.windows.get(e)===t){if(t.element.parentNode&&t.element.parentNode.removeChild(t.element),this.windows.delete(e),this.updateDockState(),this.onWindowClosed&&this.onWindowClosed(e),this.activeWindow===e){const n=[...this.windows.values()].filter(i=>!i.isMinimized&&!i.element.classList.contains("is-closing")).sort((i,r)=>Number(r.element.style.zIndex)-Number(i.element.style.zIndex))[0];n?this.focusWindow(n.id):this.activeWindow=null}this.updateImmersiveState(),this.updateDockState()}},200))}updateImmersiveState(){const e=this.activeWindow&&this.windows.get(this.activeWindow),t=!!(e&&!e.isMinimized&&!e.element.classList.contains("is-closing")&&e.element.classList.contains("portfolio-immersive-workspace"));this.desktop.classList.toggle("immersive-experience-active",t)}updateDockState(){if(!this.dock)return;this.dock.querySelectorAll("[data-launch-app]").forEach(t=>{const n=t.dataset.launchApp,i=this.windows.get(n),r=!!(i&&!i.element.classList.contains("is-closing")),d=r&&this.activeWindow===n&&!i.isMinimized,f=r&&i.isMinimized;t.classList.toggle("is-open",r),t.classList.toggle("is-active",d),t.classList.toggle("is-minimized",f),d?t.setAttribute("aria-current","true"):t.removeAttribute("aria-current")})}}const R={personal:{name:"Aditya Shinde",title:"Backend / Full-Stack Software Engineer",email:"aditya12rash@gmail.com",phone:"(+91) 9324284783",location:"Virar, Maharashtra - 401303",githubUrl:"https://github.com/AdityaShinde-git",linkedinUrl:"https://linkedin.com/in/aditya-shinde-5a031b305",cgpa:"8.0 / 10",degree:"Bachelor of Science in Information Technology",university:"University of Mumbai",educationPeriod:"Aug 2022 – Apr 2025",summary:"Backend / Full-Stack Software Engineer experienced in building and maintaining production web applications, REST APIs, business modules, and database-driven systems. Strong experience with PHP, Laravel, CodeIgniter 4, MySQL, PostgreSQL, React, JavaScript, and TypeScript, with additional experience building Rust-based real-time CDC and data synchronization systems. Experienced in MVC architecture, RBAC, audit trails, CRUD workflows, email automation, and production feature development."},experience:[{id:"vk-lalco",company:"V.K. Lalco",role:"Software Developer",period:"Jun 2026 – Present",status:"Current Role",technologies:["PHP","Laravel","CodeIgniter","MySQL","PostgreSQL","React","JavaScript","TypeScript"],highlights:["Developed and maintained production web applications using PHP, Laravel, CodeIgniter, MySQL, PostgreSQL, React, JavaScript, and TypeScript.","Designed and developed a centralized Update Management System (UMS) to track module-level changes, responsible users, timestamps, and detailed audit trails across the application.","Implemented role-based access control (RBAC) for UMS and application features, ensuring users could access actions and data according to their roles and permissions.","Built an integrated email workflow for completed module updates, supporting configurable recipients, CC, BCC, delivery status, and system-generated notifications.","Added and maintained new features across existing modules, including backend logic, database changes, REST APIs, validation, and frontend updates.","Worked on production fixes, feature enhancements, database operations, and application maintenance while ensuring existing functionality remained stable."]},{id:"volody",company:"Volody",role:"Software Developer Intern",period:"Mar 2026 – Jun 2026",status:"Internship",technologies:["PHP","Laravel","React","JavaScript","TypeScript","MySQL","PostgreSQL"],highlights:["Developed and maintained production features using PHP, Laravel, React, JavaScript, TypeScript, MySQL, and PostgreSQL.","Built and integrated REST APIs for application features and backend business workflows.","Worked on database-driven features, query optimization, validation, CRUD operations, and application-level business logic.","Resolved production issues and implemented enhancements across existing modules while following MVC and maintainable coding practices."]},{id:"k2s2",company:"K2S2 Digistrat",role:"Software Developer Intern",period:"Sep 2025 – Feb 2026",status:"Internship",technologies:["CodeIgniter 4","PHP","Rust","REST APIs"],highlights:["Built and integrated REST APIs for production systems and developed database-driven features using CodeIgniter 4.","Developed a Lead Management System with relational data, nested CRUD operations, validation, and reusable backend business logic.","Contributed to a Railway Management System through database schema updates, backend changes, and user-interface enhancements.","Built a Rust-based Data Sync Platform supporting bulk data migration and real-time Change Data Capture (CDC) operations."]}],projects:[{id:"oms-hrms",title:"Office / HR Management System (OMS)",subtitle:"Full-stack HR management platform",overview:"A full-stack HRMS covering employee management, attendance, leave, payroll, holidays, announcements, tickets, and self-service.",areas:["Employee management","Attendance","Leave","Payroll","Holidays","Announcements","Tickets & self-service"],tech:["PHP","CodeIgniter 4","MySQL","Bootstrap 5"],highlights:["Built a full-stack HR management system across multiple interconnected workplace modules."],implementation:["MVC + Service architecture with thin controllers, reusable business logic, validation, and database-driven workflows.","Role-based access control with roles, permissions, route-level authorization, and audit logging for significant operations.","REST-based backend workflows and CRUD operations across multiple modules."],source:"Resume · Projects"},{id:"dafca-chat",title:"Dafca – Real-Time Chat Application",subtitle:"Real-time messaging with persistent conversations and file sharing",overview:"A real-time messaging platform with persistent conversations, file sharing, and backend APIs for real-time communication.",areas:["Persistent conversations","File sharing","Backend APIs"],tech:["React","Express.js","MongoDB"],period:"Jan 2025 – Apr 2025",highlights:["Built a real-time messaging platform using React, Express.js, and MongoDB."],source:"Resume · Projects"}],skills:{languages:["PHP","JavaScript","TypeScript","Rust","Python","C++"],backend:["Laravel","CodeIgniter 4","Node.js","Express.js","REST APIs","MVC","CRUD","Authentication","RBAC"],frontend:["React.js","TypeScript","JavaScript","HTML","CSS","Bootstrap","Material UI"],databases:["MySQL","PostgreSQL","MongoDB","Oracle"],architecture:["Service Layer","Role-Based Access Control","Audit Logging","API Integration","Real-Time Data Systems","Change Data Capture (CDC)"],toolsAndDevops:["Git","Docker","VMware","Android Studio","Postman"]}},ea=["about","experience","projects","skills","resume.pdf","contact"];function M(a){return String(a).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}class Ia{constructor(e,t){this.container=e,this.wm=t,this.history=[],this.historyIndex=-1,this.commands={},this.initDOM(),this.registerCommands()}initDOM(){this.container.innerHTML=`
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
    `,this.output=this.container.querySelector("#term-output"),this.input=this.container.querySelector("#term-input"),this.body=this.container.querySelector("#term-body"),this.setupListeners()}setupListeners(){this.container.addEventListener("click",e=>{e.target!==this.input&&!e.target.closest("a")&&this.input.focus()}),this.input.addEventListener("keydown",e=>{if(e.key==="Enter"){const t=this.input.value.trim();this.input.value="",t&&(this.history.push(t),this.historyIndex=this.history.length,this.executeCommand(t))}else e.key==="ArrowUp"?(e.preventDefault(),this.historyIndex>0&&(this.input.value=this.history[--this.historyIndex])):e.key==="ArrowDown"?(e.preventDefault(),this.historyIndex<this.history.length-1?this.input.value=this.history[++this.historyIndex]:(this.historyIndex=this.history.length,this.input.value="")):e.key==="Tab"&&(e.preventDefault(),this.handleTabAutocomplete());(e.key.length===1||e.key==="Backspace")&&Q.playKeySound()})}handleTabAutocomplete(){const e=this.input.value.trim().toLowerCase();if(!e)return;const t=[...Object.keys(this.commands),...ea],n=[...new Set(t)].filter(i=>i.startsWith(e));n.length===1?this.input.value=n[0]:n.length>1&&this.printLine(`Suggestions: ${n.map(M).join(" · ")}`,"term-muted")}registerCommands(){this.commands={help:()=>this.cmdHelp(),about:()=>this.cmdAbout(),bio:()=>this.cmdAbout(),skills:()=>this.cmdSkills(),experience:()=>this.cmdExperience(),work:()=>this.cmdProjects(),projects:()=>this.cmdProjects(),open:e=>this.cmdOpen(e),ls:()=>this.cmdList(),cat:e=>this.cmdRead(e),contact:()=>this.cmdContact(),hire:()=>this.cmdContact(),clear:()=>this.cmdClear(),whoami:()=>this.printLine(`${M(R.personal.name)} — ${M(R.personal.title)}`),date:()=>this.printLine(M(new Date().toLocaleString())),echo:e=>this.printLine(M(e.join(" ")))}}executeCommand(e){this.printPromptLine(e);const[t,...n]=e.split(/\s+/),i=this.commands[t.toLowerCase()];i?i(n):this.printLine(`Unknown command: ${M(t)}. Type <span class="term-command">help</span> for the available commands.`,"term-error")}printPromptLine(e){const t=document.createElement("div");t.className="term-command-line",t.innerHTML=`<span class="term-command-prompt">$ aditya</span><span>${M(e)}</span>`,this.output.appendChild(t),this.scrollToBottom()}printLine(e,t=""){const n=document.createElement("div");n.className=`term-line ${t}`,n.innerHTML=e,this.output.appendChild(n),this.scrollToBottom()}scrollToBottom(){this.body.scrollTop=this.body.scrollHeight}cmdHelp(){const e=[["about","Read the professional summary"],["experience","Browse roles and documented contributions"],["projects","View projects listed on the resume"],["skills","List the resume skills by category"],["open [section]","Open work, resume, skills, contact, or terminal"],["ls","List the available portfolio sections"],["cat [section]","Read about, skills, projects, experience, or resume PDF"],["contact","Show direct contact details"],["date","Show the current local date and time"],["clear","Clear the console"]];this.printLine(`<section class="term-card"><h2>COMMANDS</h2><dl>${e.map(([t,n])=>`<div><dt>${M(t)}</dt><dd>${M(n)}</dd></div>`).join("")}</dl></section>`)}cmdAbout(){this.printLine(`<section class="term-card"><h2>ABOUT</h2><p>${M(R.personal.summary)}</p></section>`)}cmdSkills(){const e=[["Languages",R.skills.languages],["Backend",R.skills.backend],["Frontend",R.skills.frontend],["Databases",R.skills.databases],["Architecture",R.skills.architecture],["Tools",R.skills.toolsAndDevops]];this.printLine(`<section class="term-card"><h2>SKILLS · RESUME INVENTORY</h2>${e.map(([t,n])=>`<div class="term-skill-group"><h3>${M(t)}</h3><p>${n.map(M).join(" · ")}</p></div>`).join("")}</section>`)}cmdExperience(){this.printLine(`<section class="term-card"><h2>EXPERIENCE</h2>${R.experience.map(e=>`
      <article class="term-record">
        <h3>${M(e.role)} · ${M(e.company)}</h3>
        <p class="term-muted">${M(e.period)}</p>
        <ul>${e.highlights.map(t=>`<li>${M(t)}</li>`).join("")}</ul>
      </article>
    `).join("")}</section>`)}cmdProjects(){this.printLine(`<section class="term-card"><h2>PROJECTS · RESUME LISTING</h2>${R.projects.map(e=>`
      <article class="term-record">
        <h3>${M(e.title)}</h3>
        ${e.period?`<p class="term-muted">${M(e.period)}</p>`:""}
        <p>${M(e.tech.join(" · "))}</p>
        <ul>${e.highlights.map(t=>`<li>${M(t)}</li>`).join("")}</ul>
      </article>
    `).join("")}</section>`)}cmdList(){this.printLine(`<section class="term-card"><h2>AVAILABLE PORTFOLIO SECTIONS</h2><ul class="term-section-list">${ea.map(e=>`<li>${M(e)}</li>`).join("")}</ul><p class="term-muted">Use <code>open [section]</code> to navigate.</p></section>`)}cmdRead(e){const t=(e[0]||"").toLowerCase(),n={about:()=>this.cmdAbout(),skills:()=>this.cmdSkills(),experience:()=>this.cmdExperience(),projects:()=>this.cmdProjects(),work:()=>this.cmdProjects()};n[t]?n[t]():t==="resume.pdf"||t==="resume"?this.printLine('<a class="term-download-link" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download the verified PDF resume ↓</a>'):this.printLine(`No readable portfolio section named "${M(t)}". Try <span class="term-command">ls</span>.`,"term-error")}cmdOpen(e){const t=(e[0]||"").toLowerCase();if(t==="resume.pdf"){this.cmdRead(["resume.pdf"]);return}const n=t==="work"?"projects":t;["projects","resume","skills","contact","terminal"].includes(n)&&window.openAppByName?(window.openAppByName(n),this.printLine(`Opened ${M(t)}.`,"term-success")):this.printLine("Usage: open [work|projects|resume|skills|contact|terminal]","term-error")}cmdContact(){const e=R.personal;this.printLine(`<section class="term-card"><h2>CONTACT</h2><p><a href="mailto:${M(e.email)}">${M(e.email)}</a></p><p>${M(e.phone)}</p><p>${M(e.location)}</p></section>`),window.openAppByName&&window.openAppByName("contact")}cmdClear(){this.output.replaceChildren()}}const Ma=[{name:"Selected work",app:"projects",desc:"Case studies in product and systems engineering",keywords:R.projects.flatMap(a=>[a.title,...a.tech,...a.highlights]).join(" ")},{name:"Engineering map",app:"skills",desc:"Languages, frameworks, data, and tools in context",keywords:Object.values(R.skills).flat().map(a=>a.name).join(" ")},{name:"Career profile",app:"resume",desc:"Resume, experience, education, and a downloadable text profile",keywords:`resume cv ${R.personal.name} ${R.experience.map(a=>`${a.company} ${a.role} ${a.technologies.join(" ")}`).join(" ")}`},{name:"Contact",app:"contact",desc:"Email, phone, location, and professional links",keywords:`${R.personal.email} ${R.personal.phone} ${R.personal.location} github linkedin`},{name:"Terminal",app:"terminal",desc:"A small interactive developer terminal"}];class Da{constructor(e,t){this.container=e,this.scenePreferences=t,this.isOpen=!1,this.initDOM()}initDOM(){this.overlay=document.createElement("div"),this.overlay.className="control-center-modal",this.overlay.style.display="none",this.overlay.innerHTML=`
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
    `,this.container.appendChild(this.overlay),this.setupListeners()}setupListeners(){this.overlay.addEventListener("click",d=>{(d.target===this.overlay||d.target.closest(".preferences-close"))&&this.close()}),window.addEventListener("keydown",d=>{d.key==="Escape"&&this.isOpen&&this.close()});const e=this.overlay.querySelector("#ctrl-toggle-motion"),t=this.overlay.querySelector("#ctrl-toggle-3d"),n=this.overlay.querySelector("#ctrl-toggle-sound");e.addEventListener("click",()=>{const d=!this.isMotionReduced();document.body.dataset.motionPreference=d?"reduced":"standard",document.body.dataset.reducedMotion=String(d),this.updatePreference(e,"#ctrl-motion-state",d?"Reduced":"Standard",d)}),t.addEventListener("click",()=>{const d=!this.scenePreferences.isEnabled(),f=this.overlay.querySelector("#ctrl-3d-state");if(!d){this.scenePreferences.setEnabled(!1),this.updatePreference(t,"#ctrl-3d-state","Off",!1);return}t.disabled=!0,f.textContent="Loading…",this.scenePreferences.setEnabled(!0).then(()=>{t.disabled=!1,this.updatePreference(t,"#ctrl-3d-state","On",!0)}).catch(h=>{t.disabled=!1,this.updatePreference(t,"#ctrl-3d-state","Unavailable",!1),f.title=h instanceof Error?h.message:String(h)})}),n.addEventListener("click",()=>{const d=Q.toggleSound();this.updatePreference(n,"#ctrl-sound-state",d?"On":"Off",d)}),this.overlay.querySelector(".preferences-close").addEventListener("click",()=>this.close());const i=this.overlay.querySelector("#spotlight-input"),r=this.overlay.querySelector("#spotlight-results");i.addEventListener("input",()=>{const d=i.value.trim().toLowerCase();if(!d){r.style.display="none",r.replaceChildren();return}const f=Ma.filter(h=>`${h.name} ${h.desc} ${h.keywords||""}`.toLowerCase().includes(d));r.innerHTML=f.length?f.map(h=>`
          <button class="spotlight-item" type="button" data-app="${h.app}">
            <span class="spotlight-title">${h.name}</span>
            <span class="spotlight-desc">${h.desc}</span>
            <span aria-hidden="true">↗</span>
          </button>`).join(""):'<p class="spotlight-empty">No matching pages.</p>',r.style.display="flex",r.querySelectorAll("[data-app]").forEach(h=>{h.addEventListener("click",()=>{this.close(),window.openAppByName&&window.openAppByName(h.dataset.app,!0,!0)})})})}updatePreference(e,t,n,i){e.setAttribute("aria-pressed",String(i)),this.overlay.querySelector(t).textContent=n}syncPreferences(){const e=this.isMotionReduced(),t=this.scenePreferences.isEnabled();this.updatePreference(this.overlay.querySelector("#ctrl-toggle-motion"),"#ctrl-motion-state",e?"Reduced":"Standard",e),this.updatePreference(this.overlay.querySelector("#ctrl-toggle-3d"),"#ctrl-3d-state",t?"On":"Off",t),this.updatePreference(this.overlay.querySelector("#ctrl-toggle-sound"),"#ctrl-sound-state",Q.enabled?"On":"Off",Q.enabled)}isMotionReduced(){return document.body.dataset.reducedMotion==="true"||document.body.dataset.motionPreference!=="standard"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}toggle(){this.isOpen?this.close():this.open()}open(){this.isOpen=!0,this.syncPreferences(),this.overlay.style.display="flex";const e=this.overlay.querySelector("#spotlight-input");setTimeout(()=>e.focus(),50)}close(){this.isOpen=!1,this.overlay.style.display="none"}}function te(a){return String(a).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function Na(){const a=R.personal,e=document.createElement("div");return e.className="career-experience",e.innerHTML=`
    <header class="career-nav">
      <a class="career-wordmark" href="#home" aria-label="Return home">AS<span> / PROFILE</span></a>
      <a class="career-nav-link" href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
    </header>
    <div class="career-scroll">
      <section class="career-opening">
        <div class="career-opening-aside"><span>ENGINEERING<br />PROFILE</span><span>VERIFIED AGAINST<br />SOURCE RESUME</span></div>
        <div class="career-opening-main">
          <p class="career-kicker">ADITYA SHINDE <span>·</span> ${te(a.location)}</p>
          <h1>Building for<br /><em>the real world.</em></h1>
          <p class="career-summary">${te(a.summary)}</p>
          <a class="career-download" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download resume <span>.pdf</span> <b>↓</b></a>
        </div>
        <div class="career-opening-mark" aria-hidden="true">AS</div>
      </section>

      <section class="career-section">
        <div class="career-section-heading"><span>01 / EXPERIENCE</span><h2>Where I’ve<br /><em>made a difference.</em></h2></div>
        <div class="career-timeline">
          ${R.experience.map((t,n)=>`
            <article class="career-role">
              <div class="career-role-meta"><span>0${n+1}</span><span>${te(t.period)}</span></div>
              <div class="career-role-content">
                <div class="career-role-heading">
                  <div><h3>${te(t.role)}</h3><p>${te(t.company)}</p></div>
                  <span class="career-status">${te(t.status)}</span>
                </div>
                <ul>${t.highlights.map(i=>`<li>${te(i)}</li>`).join("")}</ul>
                <div class="career-tech">${t.technologies.map(i=>`<span>${te(i)}</span>`).join("")}</div>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="career-education">
        <div><span class="career-section-label">02 / EDUCATION</span><h2>Education<br /><em>& foundations.</em></h2></div>
        <div class="career-education-detail">
          <span>${te(a.university)} · ${te(a.educationPeriod)}</span>
          <h3>${te(a.degree)}</h3>
          <p>CGPA <b>${te(a.cgpa)}</b></p>
        </div>
      </section>
      <footer class="career-footer"><span>GOOD WORK IS A TEAM SPORT.</span><a href="#work" data-portfolio-route="projects">VIEW SELECTED PROJECTS ↗</a></footer>
    </div>
  `,e}function J(a){return String(a).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function $a(a,e){return`
    <section class="walk-chapter ${e%2?"walk-chapter-reverse":""}" id="walk-${J(a.id)}" data-walk-chapter="${e}">
      <div class="walk-chapter-index">
        <span>0${e+1}</span>
        <i></i>
        <small>${J(a.period||"SELECTED WORK")}</small>
      </div>
      <article class="walk-chapter-copy">
        <p class="walk-eyebrow">${J(a.subtitle||"Selected project")}</p>
        <h2>${J(a.title)}</h2>
        <p class="walk-overview">${J(a.overview||"")}</p>
        <div class="walk-tech" aria-label="Technologies">
          ${(a.tech||[]).map(t=>`<span>${J(t)}</span>`).join("")}
        </div>
        <button class="walk-study-open" type="button" data-open-study="${e}">
          EXPLORE CASE STUDY <span>↗</span>
        </button>
      </article>
    </section>
  `}function Pa(a,e){const t=a.areas||[],n=a.implementation||[],i=a.highlights||[];return`
    <div class="walk-study-heading">
      <p class="walk-eyebrow">CASE STUDY 0${e+1}</p>
      <span>${J(a.period||"SELECTED WORK")}</span>
    </div>
    <h2>${J(a.title)}</h2>
    <p class="walk-study-subtitle">${J(a.subtitle||"")}</p>
    <div class="walk-study-tags">${(a.tech||[]).map(r=>`<span>${J(r)}</span>`).join("")}</div>
    <section class="walk-study-section">
      <h3>OVERVIEW</h3>
      <p>${J(a.overview||"")}</p>
    </section>
    ${t.length?`
      <section class="walk-study-section">
        <h3>SYSTEM AREAS</h3>
        <ul>${t.map((r,d)=>`<li><span>0${d+1}</span>${J(r)}</li>`).join("")}</ul>
      </section>
    `:""}
    ${n.length?`
      <section class="walk-study-section">
        <h3>ENGINEERING APPROACH</h3>
        <ul>${n.map((r,d)=>`<li><span>0${d+1}</span>${J(r)}</li>`).join("")}</ul>
      </section>
    `:""}
    ${i.length?`
      <section class="walk-study-section">
        <h3>PROJECT HIGHLIGHTS</h3>
        <ul>${i.map((r,d)=>`<li><span>0${d+1}</span>${J(r)}</li>`).join("")}</ul>
      </section>
    `:""}
    <a class="walk-study-contact" href="#contact" data-portfolio-route="contact">Discuss this project <span>↗</span></a>
  `}function qa(a=""){const e=document.createElement("div");e.className="work-experience study-experience at-walk-experience";const t=R.projects;e.innerHTML=`
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
          ${t.map($a).join("")}
        </div>

        <section class="walk-outro">
          <p class="walk-eyebrow">END OF THE PATH</p>
          <h2>More good work<br>starts with a conversation.</h2>
          <a href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
          <a class="walk-outro-home" href="#home" data-portfolio-route="home">← BACK TO DESKTOP</a>
        </section>
      </main>

      <div class="walk-progress" aria-hidden="true"><span></span></div>
      <div class="walk-scene-index" aria-live="polite"><span>01</span><i></i><span>0${t.length}</span></div>

      <aside class="walk-study-drawer" aria-hidden="true">
        <button class="walk-study-backdrop" type="button" aria-label="Close case study"></button>
        <section class="walk-study-sheet" role="dialog" aria-modal="true" aria-labelledby="walk-study-title">
          <button class="walk-study-close" type="button" aria-label="Close case study">×</button>
          <div class="walk-study-content" id="walk-study-content"></div>
        </section>
      </aside>
    </div>
  `;const n=e.querySelector(".at-walk-scroll"),i=e.querySelector(".at-walk-shell"),r=e.querySelector(".walk-rna-art"),d=e.querySelector(".at-walk-canvas"),f=e.querySelector(".walk-progress span"),h=[...e.querySelectorAll("[data-walk-chapter]")],x=e.querySelector(".walk-scene-index"),A=e.querySelector(".walk-begin"),O=e.querySelector(".walk-study-drawer"),T=e.querySelector(".walk-study-content"),P=e.querySelector(".walk-study-close"),q=e.querySelector(".walk-study-backdrop");let C=null,N=!1,I=null;const E=(g,u="smooth")=>{const y=h[g];if(!y)return;const H=n.scrollTop+y.getBoundingClientRect().top-n.getBoundingClientRect().top;n.scrollTo({top:H,behavior:u})},$=()=>{var D;const g=n.scrollHeight-n.clientHeight,u=g>0?n.scrollTop/g:0;f.style.transform=`scaleX(${Math.max(0,Math.min(1,u))})`,i.classList.toggle("is-intro",n.scrollTop<n.clientHeight*.55),r.style.transform=`translateY(${-u*7}%)`;const y=n.getBoundingClientRect().top+n.clientHeight*.52,H=h.find(B=>B.getBoundingClientRect().bottom>y);if(H){const B=Number(H.dataset.walkChapter)+1;x.querySelector("span").textContent=String(B).padStart(2,"0"),A.dataset.walkTo=String(B-1),A.querySelector("span").textContent=`PROJECT ${String(B).padStart(2,"0")} / ${String(t.length).padStart(2,"0")}`}else n.scrollTop<((D=h[0])==null?void 0:D.offsetTop)*.65&&(x.querySelector("span").textContent="01",A.dataset.walkTo="0",A.querySelector("span").textContent="DESCEND INTO THE WORK")},v=()=>{const g=O.classList.contains("is-open");O.classList.remove("is-open"),O.setAttribute("aria-hidden","true"),g&&(I!=null&&I.isConnected)&&I.focus()},F=g=>{var y;const u=t[g];u&&(I=e.querySelector(`[data-open-study="${g}"]`),T.innerHTML=Pa(u,g),(y=T.querySelector("h2"))==null||y.setAttribute("id","walk-study-title"),O.classList.add("is-open"),O.setAttribute("aria-hidden","false"),P.focus())},G=g=>{if(g.code==="Escape"&&O.classList.contains("is-open")&&v(),g.code!=="Tab"||!O.classList.contains("is-open"))return;const u=[...O.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(D=>!D.hasAttribute("disabled")&&D.getClientRects().length);if(!u.length)return;const y=u[0],H=u[u.length-1];g.shiftKey&&document.activeElement===y?(g.preventDefault(),H.focus()):!g.shiftKey&&document.activeElement===H&&(g.preventDefault(),y.focus())};n.addEventListener("scroll",$,{passive:!0}),A.addEventListener("click",()=>E(Number(A.dataset.walkTo))),e.querySelectorAll("[data-open-study]").forEach(g=>{g.addEventListener("click",()=>F(Number(g.dataset.openStudy)))}),P.addEventListener("click",v),q.addEventListener("click",v),window.addEventListener("keydown",G),$(),requestAnimationFrame(()=>{N||$()}),requestAnimationFrame(()=>{if(!(N||!d.isConnected)){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){d.hidden=!0,e.classList.add("has-static-scene");return}xt(async()=>{const{WorkWorld:g}=await import("./workWorld-D0qGXKyN.js");return{WorkWorld:g}},__vite__mapDeps([0,1])).then(({WorkWorld:g})=>{N||!d.isConnected||(C=new g(d,n,()=>{const u=n.scrollHeight-n.clientHeight;return u>0?n.scrollTop/u:0}),d._workWorld=C)}).catch(g=>{d.hidden=!0,e.classList.add("has-static-scene"),console.error("Failed to load the 3D work experience:",g)})}});const K=new MutationObserver(()=>{e.isConnected||(N=!0,C==null||C.dispose(),n.removeEventListener("scroll",$),window.removeEventListener("keydown",G),K.disconnect())});return K.observe(document.body,{childList:!0,subtree:!0}),e.navigateToProject=g=>{const u=t.findIndex(y=>y.id===g);u>=0&&E(u)},a&&requestAnimationFrame(()=>{const g=t.findIndex(u=>u.id===a);g>=0&&E(g,"instant")}),e}const nt=1e3,it=640,Pe=6,ja=nt*Pe,Ka=it*Pe;function oa(a,e){return[(a-nt/2)*Pe,(it/2-e)*Pe]}function oe(a,e){return{x:a/Pe+nt/2,y:it/2-e/Pe}}function pe(a,e){return{x:20+a/nt*380,y:30+e/it*240}}function Ga(a,e){const{x:t,y:n}=oe(a,e);return t>=760&&n<260?"signal":n>=410&&t>=500?"highPass":t>=560&&t<790?"fossil":t<250&&n>=440?"motorYard":t<300?"lowlands":t<450&&n<270?"riverlands":t>=390&&t<580?"ashen":"lowlands"}function U(a,e){const[t,n]=oa(a,e);return{x:t,z:n}}function ra(a){return a.map(([e,t])=>oa(e,t))}function ae(a,e,t,n,i=!1){return{from:a,to:e,kind:t,mapPoints:n,points:ra(n),closed:i}}const re=[{id:"trailhead",title:"THE TRAILHEAD",...U(130,150),accent:14006141},{id:"crossing",title:"THE RIVER CROSSING",...U(385,185),accent:8566957},{id:"settlement",title:"THE ASHEN SETTLEMENT",...U(470,330),accent:13212264},{id:"bones",title:"THE OLD GIANT",...U(700,300),accent:13938547},{id:"signal",title:"THE LAST SIGNAL",...U(860,110),accent:12690104},{id:"high-pass",title:"THE HIGH PASS",...U(640,500),accent:10399691}],za=Object.fromEntries(re.map(({id:a,x:e,z:t})=>[a,{x:e,z:t}])),ta=U(200,520),Ha=[{id:"waterfall",title:"Silver Drop Waterfall",type:"water",map:[468,122],...U(468,122)},{id:"old-bridge",title:"Old Timber Bridge",type:"crossing",map:[337,408],...U(337,408)},{id:"mirror-tarn",title:"Mirror Tarn",type:"lake",map:[630,250],...U(630,250)},{id:"watchtower",title:"Watchtower Ruin",type:"ruin",map:[225,395],...U(225,395)},{id:"quarry",title:"High Pass Quarry",type:"quarry",map:[760,500],...U(760,500)},{id:"fire-ring",title:"Ashen Vale Fire Ring",type:"camp",map:[535,340],...U(535,340)}],Ba=[{id:"cairn",title:"The cairn tone",...U(665,272),requiresStopped:!0},{id:"waterfall-cabin",title:"The waterfall cabin",...U(454,126)},{id:"watchtower-radio",title:"The buried radio",...U(222,406),requiresSignals:6},{id:"quarry-signature",title:"The signed quarry stone",...U(780,515)},{id:"bridge-plank",title:"The secret bridge plank",...U(385,185)},{id:"horizon-light",title:"The night light",...U(947,68),requiresSignals:6,nightOnly:!0}],la=[ae(1,2,"pass",[[128,151],[130,150],[200,115],[290,140],[385,185]]),ae(2,3,"pass",[[385,185],[425,250],[445,295],[470,330]]),ae(3,4,"pass",[[470,330],[540,365],[610,335],[700,300]]),ae("settlement-overlook",4,"trail",[[610,335],[610,292],[638,276],[670,288],[700,300]]),ae(4,5,"pass",[[700,300],[765,250],[805,170],[860,110]]),ae(3,6,"pass",[[470,330],[500,420],[570,470],[640,500]]),ae(6,4,"trail",[[640,500],[700,470],[650,435],[705,395],[660,350],[700,300]]),ae("settlement-loop","settlement-loop","trail",[[470,330],[464,323],[463,315],[470,312],[478,315],[480,323],[477,330],[478,338],[470,342],[463,338]],!0),ae(1,"mw","trail",[[130,150],[105,260],[150,400],[200,520]]),ae("mw",3,"trail",[[200,520],[254,450],[310,365],[350,285],[385,185],[430,260],[470,330]]),ae("watchtower-loop","watchtower-loop","trail",[[150,400],[185,355],[230,375],[245,410],[210,440]],!0),ae("quarry-loop","quarry-loop","trail",[[640,500],[700,530],[760,500],[725,470]],!0)],$e=la[0].points,Ya={x:$e[0][0],z:$e[0][1]},_a=Math.atan2($e[1][0]-$e[0][0],$e[1][1]-$e[0][1]),ca=[[560,-10],[530,70],[470,120],[420,150],[385,185],[345,235],[330,300],[350,370],[320,440],[300,520],[320,600],[310,660]],Xa=ra(ca),Ja=re[1],Qa=re[0],Za=re[2],es=re[3],ts=re[4],as=re[5],wt="signal-ridge-vehicle-build",aa="signal-ridge-signals",sa="signal-ridge-secrets",na="signal-ridge-settlement-topics",kt={paint:"#53645b",alloy:"#c2a878",rideHeight:1,bodyWidth:1,wheelStyle:"all-terrain",bodyKit:"stock",power:1},ee={languages:"PHP, JavaScript, and TypeScript appear across production application work. At K2S2 Digistrat, used Rust to build a data-sync platform for bulk migration and real-time change data capture.",backend:"At V.K. Lalco, developed a centralized Update Management System that records module changes, responsible users, timestamps, and audit trails.",databases:"Built interconnected HR management modules with MySQL and contributed to production features using MySQL and PostgreSQL.",frontend:"Developed and maintained production application features using React, JavaScript, and TypeScript at V.K. Lalco and Volody.",tools:"These tools are listed in the skills inventory. Docker and Git are presented as tools, not as claims of deployment or infrastructure ownership.",architecture:"Implemented role-based access control and audit logging for the UMS, with roles, permissions, and route-level authorization in the OMS."},Fa={trailhead:ee.languages,crossing:ee.frontend,settlement:ee.backend,bones:ee.databases,signal:ee.architecture,"high-pass":ee.tools},Lt={trailhead:"The keepers built the first fire where the meadow road met the ridge. Its light was meant to make a stranger feel expected.",crossing:"The river did not stop the old keepers; it taught them to build a safer way across. Every bridge began as a promise to return.",settlement:"When the valley emptied, the lamps stayed lit for one another. The crossroads was never the centre of the land, only its heart.",bones:"The Old Giant kept the valley in its ribs long before the first road was drawn. The keepers left their records in layers of stone.",signal:"At the highest station, one flame could reach every other fire. The last keeper left the door unbarred.","high-pass":"Tools were left at the pass for the next traveller. The mountain was crossed by many hands, not one."},Tt={cairn:{title:"The Cairn",note:"The old keepers stacked these stones to mark the quiet places. Stop beside it and listen for the tone."},"waterfall-cabin":{title:"The Waterfall Cabin",note:"A keeper left a dry notebook behind the falls. Its last page points toward the work beyond the ridge.",link:!0},"watchtower-radio":{title:"Buried Radio",note:"“If you can hear this, the six fires are home again. Carry the signal farther than we could.”"},"quarry-signature":{title:"A Mark in the Stone",note:"A.S. · Someone wanted the next traveller to know they had made it this far."},"bridge-plank":{title:"The Secret Plank",note:"A hollow plank answers with the old truck horn. The keepers had a sense of humour."},"horizon-light":{title:"A Light Beyond the Ridge",note:"After the chain was restored, one small light appeared past the known horizon."}},ue=[{id:"trailhead",title:"The Trailhead",category:"Languages",caption:"NOTICE BOARD · COMPLETE SKILLS REGISTER"},{id:"crossing",title:"The River Crossing",category:"Frontend",caption:"FORD · WATERFALL · TIMBER BRIDGE"},{id:"settlement",title:"The Ashen Settlement",category:"Backend",caption:"VILLAGE LOOP · LANTERN WINDOWS"},{id:"bones",title:"The Old Giant",category:"Databases",caption:"FOSSIL RIDGE · HIGH VISTA"},{id:"signal",title:"The Last Signal",category:"Architecture & systems",caption:"RIDGELINE · FINAL BEACON"},{id:"high-pass",title:"The High Pass",category:"Tools & DevOps",caption:"SWITCHBACKS · UPPER TRAIL"}],st=[...R.skills.backend,"Update Management System"].map((a,e)=>({id:`settlement-house-${e+1}`,title:a})),ia=[{id:"trailhead",title:"Trailhead · amber",paint:"#d5b77d"},{id:"crossing",title:"Crossing · river teal",paint:"#82b8ad"},{id:"settlement",title:"Settlement · ember",paint:"#c99a68"},{id:"bones",title:"Old Giant · fossil gold",paint:"#d4af73"},{id:"signal",title:"Last Signal · dusk",paint:"#c1a2b8"},{id:"high-pass",title:"High Pass · alpine",paint:"#9eafcb"}],At=a=>{if(!Number.isFinite(a)||a<=0)return"--:--.-";const e=Math.floor(a/6e4),t=Math.floor(a/1e3)%60,n=Math.floor(a/100)%10;return`${String(e).padStart(2,"0")}:${String(t).padStart(2,"0")}.${n}`},Ne=[{title:"Languages",skills:R.skills.languages,evidence:ee.languages},{title:"Backend",skills:R.skills.backend,evidence:ee.backend},{title:"Frontend",skills:R.skills.frontend,evidence:ee.frontend},{title:"Databases",skills:R.skills.databases,evidence:ee.databases},{title:"Architecture & systems",skills:R.skills.architecture,evidence:ee.architecture},{title:"Tools & DevOps",skills:R.skills.toolsAndDevops,evidence:ee.tools}];function Wa(){var Ft;const a=document.createElement("div");a.className="skills-experience bruno-playground-app",a.classList.add("is-intro"),a.innerHTML=`
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
          <p>The complete skills board is 12 metres ahead. Light the ridge by taking its old roads; each stop reveals real tools and work evidence.</p>
          <button class="arrival-start" id="skills-start" type="button">DRIVE TO THE BOARD <span aria-hidden="true">↗</span></button>
          <span class="arrival-controls">WASD DRIVE · A / D STEER · MOUSE DRAG LOOK · WHEEL ZOOM</span>
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
            ${ia.map(({id:s,title:o})=>`<option value="${s}" data-signal-unlock="${s}" disabled>${o}</option>`).join("")}
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
  `;const e=a.querySelector("#skills-register-grid"),t=a.querySelector("#skills-register-tabs");let n=0;const i=s=>{n=(s+Ne.length)%Ne.length,e.querySelectorAll(".skills-register-group").forEach((o,l)=>{o.hidden=l!==n}),t.querySelectorAll('[role="tab"]').forEach((o,l)=>{const p=l===n;o.setAttribute("aria-selected",String(p)),o.tabIndex=p?0:-1}),a.querySelector("#skills-register-count").textContent=`${String(n+1).padStart(2,"0")} / ${String(Ne.length).padStart(2,"0")}`,a.querySelector("#skills-register-progress").style.transform=`scaleX(${(n+1)/Ne.length})`};Ne.forEach((s,o)=>{const l=document.createElement("button");l.type="button",l.id=`skills-register-tab-${o}`,l.setAttribute("role","tab"),l.setAttribute("aria-controls",`skills-register-panel-${o}`),l.setAttribute("aria-selected","false"),l.tabIndex=-1,l.textContent=s.title,l.addEventListener("click",()=>i(o)),l.addEventListener("keydown",L=>{var W,X;L.key==="ArrowRight"?(L.preventDefault(),i(o+1),(W=t.querySelector('[aria-selected="true"]'))==null||W.focus()):L.key==="ArrowLeft"&&(L.preventDefault(),i(o-1),(X=t.querySelector('[aria-selected="true"]'))==null||X.focus())}),t.append(l);const p=document.createElement("section");p.className="skills-register-group",p.id=`skills-register-panel-${o}`,p.setAttribute("role","tabpanel"),p.setAttribute("aria-labelledby",l.id),p.tabIndex=0;const m=document.createElement("h3");m.textContent=s.title;const S=document.createElement("span");S.className="skills-register-chapter",S.textContent=`FIELD LOG ${String(o+1).padStart(2,"0")} · ${s.skills.length} SKILLS`;const k=document.createElement("div");k.className="skills-register-list",s.skills.forEach(L=>{const W=document.createElement("span");W.textContent=L,k.append(W)});const w=document.createElement("details");w.className="skills-register-evidence";const Y=document.createElement("summary");Y.textContent="FIELD EVIDENCE";const ce=document.createElement("p");ce.textContent=s.evidence,w.append(Y,ce);const de=ue[o],b=document.createElement("button");b.type="button",b.className="skills-register-explore",b.textContent=`EXPLORE ${de.title.toUpperCase()} ↗`,b.addEventListener("click",()=>Ce(de.id)),p.append(S,m,k,w,b),e.append(p)}),i(0),a.querySelector("#skills-register-previous").addEventListener("click",()=>{i(n-1)}),a.querySelector("#skills-register-next").addEventListener("click",()=>{i(n+1)});const r=a.querySelector("#bruno-proximity-badge"),d=a.querySelector("#badge-category"),f=a.querySelector("#badge-metric"),h=a.querySelector("#badge-title"),x=a.querySelector("#badge-desc"),A=a.querySelector("#badge-chips"),O=a.querySelector("#badge-evidence"),T=a.querySelector("#badge-relight-button"),P=a.querySelector("#badge-transmit-link"),q=a.querySelector("#badge-board-open"),C=a.querySelector('.badge-work-link[href="#work"]'),N=a.querySelectorAll("#skill-map-panel [data-destination]"),I=a.querySelector("#garage-panel"),E=a.querySelector("#skill-map-panel"),$=a.querySelector("#bruno-controls-banner"),v=a.querySelector("#bruno-btn-map"),F=a.querySelector("#bruno-btn-board"),G=a.querySelector("#bruno-btn-controls"),K=a.querySelector("#bruno-btn-rally"),g=a.querySelector("#skills-arrival"),u=a.querySelector("#bruno-objective-text"),y=a.querySelector("#map-player"),H=a.querySelector("#bruno-minimap"),D=a.querySelector("#bruno-minimap-svg"),B=a.querySelector("#bruno-compass"),V=B.querySelector("span"),qe=a.querySelector("#bruno-compass-label"),se=a.querySelector("#map-waypoint-status"),we=a.querySelector("#map-location-readout"),ye=a.querySelector("#map-fog-reveal"),Ae=a.querySelector("#map-breadcrumb"),he=a.querySelector("#map-waypoint-route"),da=a.querySelectorAll("[data-map-layer]"),Z=a.querySelector(".signal-map"),pa=a.querySelector("#map-zoom-out"),ua=a.querySelector("#map-zoom-in"),ha=a.querySelector("#map-center-player"),ma=a.querySelector("#map-fit-all"),ot=a.querySelector("#map-route-selected"),rt=a.querySelector("#map-travel-selected"),ga=a.querySelector("#map-clear-waypoint"),Ge=a.querySelector("#bruno-sound-toggle"),Ke=a.querySelector("#bruno-volume"),ze=a.querySelector("#bruno-time-toggle"),He=a.querySelector("#bruno-motion-toggle"),Be=a.querySelector("#garage-status"),Fe=a.querySelector("#garage-style"),lt=a.querySelector("#garage-signal-livery"),Ot=a.querySelector("#bruno-signal-count"),ct=a.querySelectorAll("[data-build]");let c=null,ve=null,Ye=!1,le={...kt},_e=[],We=[],xe=[],j=new Set,me=null,Se=!1,ge=!1,dt=!1,_=!1,z=null,ne=window.matchMedia("(prefers-reduced-motion: reduce)").matches,Ve=null,Xe=null,fe=1,ke={x:210,y:150},pt=!1,Oe=null;const Re=[],Je=new Map;a.classList.toggle("is-reduced-motion",ne),He.setAttribute("aria-pressed",String(ne)),He.textContent=`REDUCED MOTION ${ne?"ON":"OFF"}`,Ge.setAttribute("aria-pressed",String(Q.enabled)),Ge.textContent=Q.enabled?"SOUND ON":"SOUND OFF",Ke.value=String(Q.setVolume(Ke.value)),Ge.addEventListener("click",()=>{const s=Q.toggleSound();Ge.setAttribute("aria-pressed",String(s)),Ge.textContent=s?"SOUND ON":"SOUND OFF"}),Ke.addEventListener("input",()=>Q.setVolume(Ke.value)),ze.addEventListener("click",()=>{const s=ze.getAttribute("aria-pressed")!=="true";c==null||c.setTimePaused(s),ze.setAttribute("aria-pressed",String(s)),ze.textContent=s?"RESUME WORLD CLOCK":"PAUSE WORLD CLOCK"}),He.addEventListener("click",()=>{ne=!ne,a.classList.toggle("is-reduced-motion",ne),c==null||c.setReducedMotion(ne),He.setAttribute("aria-pressed",String(ne)),He.textContent=`REDUCED MOTION ${ne?"ON":"OFF"}`});const Rt=()=>{if(ge=!1,K.setAttribute("aria-pressed","false"),K.querySelector("span").textContent="OPTIONAL RALLY",N.forEach(s=>s.setAttribute("aria-pressed","false")),a.querySelectorAll("[data-map-marker]").forEach(s=>s.classList.remove("is-selected")),Ze(),c!=null&&c.travelToGarage()){Ye=!1,u.textContent="MOTOR WORKS · BUILD READY · DRIVE BACK TO THE RIDGE";return}Ye=!0,u.textContent="MOTOR WORKS · OPENING THE WORKSHOP"};I.addEventListener("keydown",s=>{if(s.key!=="Tab")return;const o=[...I.querySelectorAll("button, input, select")].filter(m=>!m.disabled&&m.getClientRects().length);if(!o.length)return;const l=o[0],p=o[o.length-1];s.shiftKey&&document.activeElement===l?(s.preventDefault(),p.focus()):!s.shiftKey&&document.activeElement===p&&(s.preventDefault(),l.focus())}),E.addEventListener("keydown",s=>{if(s.key!=="Tab")return;const o=[...E.querySelectorAll("button")].filter(m=>!m.disabled&&m.getClientRects().length);if(!o.length)return;const l=o[0],p=o[o.length-1];s.shiftKey&&document.activeElement===l?(s.preventDefault(),p.focus()):!s.shiftKey&&document.activeElement===p&&(s.preventDefault(),l.focus())});try{const s=window.localStorage.getItem(wt);s&&(le={...kt,...JSON.parse(s)});const o=window.localStorage.getItem(aa);if(o){const S=JSON.parse(o);Array.isArray(S)&&(_e=S.filter(k=>ue.some(w=>w.id===k)))}const l=window.localStorage.getItem(sa);if(l){const S=JSON.parse(l);Array.isArray(S)&&(We=S.filter(k=>Object.hasOwn(Tt,k)))}const p=window.localStorage.getItem(na);if(p){const S=JSON.parse(p);Array.isArray(S)&&(xe=S.filter(k=>st.some(w=>w.id===k)))}const m=window.localStorage.getItem("signal-ridge-garage-style");m&&["field","relay","alpine"].includes(m)&&(Fe.value=m)}catch(s){console.error("Failed to load the saved Signal Ridge settings:",s)}Se=_e.length===ue.length,j=new Set(_e),Fe.addEventListener("change",()=>{c==null||c.setGarageStyle(Fe.value);try{window.localStorage.setItem("signal-ridge-garage-style",Fe.value)}catch(s){console.error("Failed to save the Signal Ridge workshop atmosphere:",s),Be.textContent="WORKSHOP STYLE NOT SAVED"}});function Qe(s){ct.forEach(o=>{const l=s[o.dataset.build];l!==void 0&&(o.value=String(l));const p=a.querySelector(`[data-output="${o.dataset.build}"]`);p&&(p.value=`${Math.round(Number(l)*100)}%`)})}function Ct(s){const o=ue.find(w=>w.id===s);if(!o)return;d.textContent=`SIGNAL RIDGE · ${o.category.toUpperCase()} BEACON`,f.textContent=o.caption,h.textContent=o.title,x.textContent="Beacon relit. The ridge brightens as the route opens; the complete inventory stays together on the Trailhead board.",A.replaceChildren();const l=Ne.find(w=>w.title===o.category);l==null||l.skills.slice(0,4).forEach(w=>{const Y=document.createElement("span");Y.textContent=w,A.append(Y)}),O.textContent=Fa[s],me=s;const p=j.has(s),m=["trailhead","crossing","settlement","bones"],S=s==="signal"&&!m.every(w=>j.has(w)),k=s==="settlement"&&xe.length<st.length;T.hidden=p,x.textContent=p?`Signal restored. ${Lt[s]}`:S?`The final beacon is sealed until the first four signals are lit. ${m.filter(w=>!j.has(w)).length} remain.`:k?`The settlement signal is sealed. Light all ${st.length} house lamps along the village loop first.`:`Field signal found. ${Lt[s]}`,T.disabled=S||k,q.hidden=!1,C.hidden=!1,P.hidden=!Se,r.hidden=!1,r.classList.add("is-visible"),r.setAttribute("aria-hidden","false")}function fa(s){const o=Tt[s],l=Ba.find(w=>w.id===s);if(!o||!l)return;We.includes(s)||We.push(s);try{window.localStorage.setItem(sa,JSON.stringify(We))}catch(w){console.error("Failed to save discovered Signal Ridge secrets:",w)}const p=oe(l.x,l.z),m=pe(p.x,p.y),S=document.createElementNS("http://www.w3.org/2000/svg","circle");S.setAttribute("class","map-secret-marker"),S.setAttribute("cx",m.x.toFixed(1)),S.setAttribute("cy",m.y.toFixed(1)),S.setAttribute("r","4");const k=document.createElementNS("http://www.w3.org/2000/svg","title");k.textContent=o.title,S.append(k),ht.append(S),Ue(m.x,m.y,16,`secret-${s}`),d.textContent="HIDDEN FIELD NOTE",f.textContent="SIGNAL RIDGE · SECRET FOUND",h.textContent=o.title,x.textContent=o.note,A.replaceChildren(),O.textContent="",T.hidden=!0,T.disabled=!0,q.hidden=!0,C.hidden=!o.link,P.hidden=!0,me=null,r.hidden=!1,r.classList.add("is-visible"),r.setAttribute("aria-hidden","false"),u.textContent=`SECRET FOUND · ${o.title.toUpperCase()}`}function ba(s){d.textContent="ASHEN SETTLEMENT · BACKEND TOPIC",f.textContent=`HOUSE LAMP ${s.litCount} OF ${s.total} · THE LOOP IS WAKING`,h.textContent=s.title,x.textContent="A field note from the village loop. Light every house lamp to open the settlement signal.",A.replaceChildren();const o=document.createElement("span");o.textContent=s.title,A.append(o),O.textContent=ee.backend,T.hidden=!0,T.disabled=!0,q.hidden=!1,C.hidden=!0,P.hidden=!0,me=null,r.hidden=!1,r.classList.add("is-visible"),r.setAttribute("aria-hidden","false"),u.textContent=`HOUSE LIT · ${s.title.toUpperCase()} · ${s.litCount}/${s.total}`}const Ze=()=>{r.classList.remove("is-visible"),r.hidden=!0,r.setAttribute("aria-hidden","true")},Ce=s=>{var o;s?(ve=s,z=s,c==null||c.setDestination(s),N.forEach(l=>{l.setAttribute("aria-pressed",String(l.dataset.destination===s))}),a.querySelectorAll("[data-map-marker]").forEach(l=>{l.classList.toggle("is-selected",l.dataset.mapMarker===s)}),u.textContent=`ROUTE SET · ${(o=ue.find(l=>l.id===s))==null?void 0:o.title.toUpperCase()} · FOLLOW THE OLD PASS`):(ve="trailhead",c==null||c.setDestination("trailhead"),u.textContent="TRAILHEAD · THE SKILLS BOARD IS AHEAD · LIGHT THE FIRST SIGNAL"),_=!0,g.hidden=!0,F.setAttribute("aria-expanded","false"),a.classList.remove("is-intro"),H.hidden=!1,Q.startWorldAmbience(),c==null||c.setPaused(!E.hidden||!$.hidden),c==null||c.setReducedMotion(ne),v.focus()},It=(s,o=!1)=>{if(!s.length)return"";const l=s.map(([m,S])=>pe(m,S));let p=`M ${l[0].x.toFixed(1)} ${l[0].y.toFixed(1)}`;for(let m=0;m<l.length-1;m+=1){const S=l[Math.max(0,m-1)],k=l[m],w=l[m+1],Y=l[Math.min(l.length-1,m+2)],ce=k.x+(w.x-S.x)/6,de=k.y+(w.y-S.y)/6,b=w.x-(Y.x-k.x)/6,L=w.y-(Y.y-k.y)/6;p+=` C ${ce.toFixed(1)} ${de.toFixed(1)} ${b.toFixed(1)} ${L.toFixed(1)} ${w.x.toFixed(1)} ${w.y.toFixed(1)}`}return o?`${p} Z`:p},et=()=>{const s=420/fe,o=300/fe,l=Math.max(s/2,Math.min(420-s/2,ke.x)),p=Math.max(o/2,Math.min(300-o/2,ke.y));ke={x:l,y:p},Z.setAttribute("viewBox",`${(l-s/2).toFixed(2)} ${(p-o/2).toFixed(2)} ${s.toFixed(2)} ${o.toFixed(2)}`)},ut=s=>{fe=Math.max(1,Math.min(4,fe+s)),et()},Mt=a.querySelector("#map-road-layer"),Dt=(s,o,l,p=!1,m=null,S=null)=>{const k=document.createElementNS("http://www.w3.org/2000/svg","path");k.setAttribute("d",It(o,p)),k.setAttribute("class",l),m!==null&&S!==null&&(k.dataset.roadFrom=String(m),k.dataset.roadTo=String(S)),s.append(k)};la.forEach(({mapPoints:s,kind:o,closed:l,from:p,to:m})=>{o==="pass"&&Dt(Mt,s,"map-road-shoulder",l,p,m),Dt(Mt,s,o==="trail"?"map-road-trail":"map-road",l,p,m)}),a.querySelector(".map-river").setAttribute("d",It(ca));const ht=a.querySelector("#map-landmark-layer");Ha.forEach(s=>{const o=oe(s.x,s.z),l=pe(o.x,o.y),p=document.createElementNS("http://www.w3.org/2000/svg","circle");p.setAttribute("class",`map-landmark map-landmark-${s.type}`),p.setAttribute("cx",l.x.toFixed(1)),p.setAttribute("cy",l.y.toFixed(1)),p.setAttribute("r","3"),p.dataset.landmark=s.id;const m=document.createElementNS("http://www.w3.org/2000/svg","title");m.textContent=s.title,p.append(m),ht.append(p)});const Nt=Array.from(Z.childNodes).filter(s=>s.nodeType!==Node.ELEMENT_NODE||!s.matches(".map-fog-overlay, defs")).map(s=>s.cloneNode(!0));Nt.forEach(s=>{s.nodeType===Node.ELEMENT_NODE&&(s.querySelectorAll("[id]").forEach(o=>o.removeAttribute("id")),s.hasAttribute("id")&&s.removeAttribute("id"))}),D.classList.add("signal-map"),D.replaceChildren(...Nt);const mt=D.querySelector(".map-player");re.forEach(({id:s,x:o,z:l})=>{const p=oe(o,l),m=pe(p.x,p.y),S=a.querySelector(`[data-map-marker="${s}"]`);S.setAttribute("cx",m.x.toFixed(1)),S.setAttribute("cy",m.y.toFixed(1))});const $t=oe(ta.x,ta.z),Pt=pe($t.x,$t.y),qt=a.querySelector(".map-garage-marker");qt.setAttribute("cx",Pt.x.toFixed(1)),qt.setAttribute("cy",Pt.y.toFixed(1));const Ue=(s,o,l,p)=>{if(!ye||Je.has(p))return;const m=document.createElementNS("http://www.w3.org/2000/svg","circle");m.setAttribute("cx",s.toFixed(1)),m.setAttribute("cy",o.toFixed(1)),m.setAttribute("r",l.toFixed(1)),ye.append(m),Je.set(p,m)};re.forEach(({id:s,x:o,z:l})=>{if(!j.has(s))return;const p=oe(o,l),m=pe(p.x,p.y);Ue(m.x,m.y,38,`signal-${s}`)});const Gt=["trailhead","crossing","settlement","bones","signal","high-pass"],Ht=()=>{[Z,D].forEach(s=>s.querySelectorAll("[data-road-from]").forEach(o=>{const l=Gt[Number(o.dataset.roadFrom)-1],p=Gt[Number(o.dataset.roadTo)-1];o.classList.toggle("is-lit",!!(l&&p&&j.has(l)&&j.has(p)))})),re.forEach(({id:s,x:o,z:l})=>{if([a.querySelector(`[data-map-marker="${s}"]`),D.querySelector(`[data-map-marker="${s}"]`)].forEach(S=>S==null?void 0:S.classList.toggle("is-lit",j.has(s))),!j.has(s))return;const p=oe(o,l),m=pe(p.x,p.y);Ue(m.x,m.y,38,`signal-${s}`)})};Ht();const ya=(s,o=0,l=0)=>{if(!s||!y)return;Xe={x:s.x,z:s.z};const p=oe(s.x,s.z),m=pe(p.x,p.y),S=`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${(o*180/Math.PI).toFixed(1)})`;if(y.setAttribute("transform",S),mt==null||mt.setAttribute("transform",S),Ue(m.x,m.y,12,"player"),!Ve||Math.hypot(s.x-Ve.x,s.z-Ve.z)>45){Ve={x:s.x,z:s.z},Re.push({x:m.x,y:m.y}),Re.length>180&&Re.shift();const k=Re.map((w,Y)=>`${Y?"L":"M"} ${w.x.toFixed(1)} ${w.y.toFixed(1)}`).join(" ");Ae==null||Ae.setAttribute("d",k),Ue(m.x,m.y,3,`trail-${Re.length}`)}if(z){const k=re.find(w=>w.id===z);if(k){const w=oe(k.x,k.z),Y=pe(w.x,w.y);he==null||he.setAttribute("d",`M ${m.x.toFixed(1)} ${m.y.toFixed(1)} L ${Y.x.toFixed(1)} ${Y.y.toFixed(1)}`);const ce=k.x-s.x,de=k.z-s.z,b=Math.atan2(ce,de)-o;V.style.transform=`rotate(${(b*180/Math.PI).toFixed(1)}deg)`,qe.textContent=`${k.title} · ${Math.round(Math.hypot(ce,de))} M`,B.hidden=!1}}else he==null||he.removeAttribute("d"),B.hidden=!0;we&&(we.textContent=`FIELD COORDINATES ${Math.round(p.x)}, ${Math.round(p.y)} · ELEVATION ${Math.round(l)} M`)},Le=(s=!0)=>{E.hidden=!0,v.setAttribute("aria-expanded","false"),c==null||c.setPaused(!_||!$.hidden||!g.hidden),s&&v.focus()},tt=()=>{$.hidden=!0,G.setAttribute("aria-expanded","false"),_&&(g.hidden=!0,F.setAttribute("aria-expanded","false")),E.hidden=!1,v.setAttribute("aria-expanded","true"),c==null||c.setPaused(!0),a.querySelector("#skill-map-close").focus()};N.forEach(s=>{s.addEventListener("click",()=>{const o=s.dataset.destination,l=ue.find(p=>p.id===o);l&&(z=o,ot.disabled=!1,rt.disabled=!1,N.forEach(p=>p.setAttribute("aria-pressed",String(p===s))),a.querySelectorAll("[data-map-marker]").forEach(p=>{p.classList.toggle("is-selected",p.dataset.mapMarker===o)}),se.textContent=`${l.title.toUpperCase()} · ${j.has(o)?"SIGNAL LIT":"SIGNAL DARK"} · SELECT FOLLOW ROUTE OR FAST TRAVEL`)})}),ot.addEventListener("click",()=>{var s;z&&(ve=z,c==null||c.setDestination(z),_||Ce(z),ge=!1,K.setAttribute("aria-pressed","false"),K.querySelector("span").textContent="OPTIONAL RALLY",u.textContent=`WAYPOINT SET · FOLLOW THE ROAD TO ${(s=ue.find(o=>o.id===z))==null?void 0:s.title.toUpperCase()}`,Le())}),rt.addEventListener("click",()=>{if(!z)return;if(_||Ce(z),!(c!=null&&c.travelToDestination(z))){se.textContent="FAST TRAVEL IS UNAVAILABLE RIGHT NOW";return}ve=z,Re.splice(0),Ve=null,Ae==null||Ae.removeAttribute("d");for(const[o,l]of Je)o.startsWith("trail-")&&(l.remove(),Je.delete(o));const s=ue.find(o=>o.id===z);u.textContent=j.has(z)?`ARRIVED AT ${s.title.toUpperCase()} · SIGNAL RESTORED`:`ARRIVED AT ${s.title.toUpperCase()} · THE SIGNAL IS STILL DARK`,a.classList.add("is-fast-travelling"),window.setTimeout(()=>a.classList.remove("is-fast-travelling"),520),Le()}),ga.addEventListener("click",()=>{z=null,ve=null,c==null||c.clearDestination(),N.forEach(s=>s.setAttribute("aria-pressed","false")),a.querySelectorAll("[data-map-marker]").forEach(s=>s.classList.remove("is-selected")),se.textContent="WAYPOINT CLEARED",ot.disabled=!0,rt.disabled=!0,B.hidden=!0,he==null||he.removeAttribute("d")}),da.forEach(s=>{s.addEventListener("click",()=>{const o=s.getAttribute("aria-pressed")!=="true";s.setAttribute("aria-pressed",String(o));const l=s.dataset.mapLayer;l==="roads"?a.querySelector("#map-road-layer").classList.toggle("is-hidden",!o):l==="river"?a.querySelector(".map-river").classList.toggle("is-hidden",!o):l==="landmarks"?ht.classList.toggle("is-hidden",!o):l==="fog"&&a.querySelector(".map-fog-overlay").classList.toggle("is-hidden",!o)})}),ua.addEventListener("click",()=>ut(.5)),pa.addEventListener("click",()=>ut(-.5)),ma.addEventListener("click",()=>{fe=1,ke={x:210,y:150},et()}),ha.addEventListener("click",()=>{if(!Xe){se.textContent="START THE JOURNEY TO TRACK YOUR POSITION";return}fe=Math.max(fe,1.6);const s=oe(Xe.x,Xe.z);ke=pe(s.x,s.y),et()}),Z.addEventListener("pointerdown",s=>{s.button===0&&(pt=!0,Oe={x:s.clientX,y:s.clientY},Z.setPointerCapture(s.pointerId))}),Z.addEventListener("pointermove",s=>{if(!pt||!Oe)return;const o=Z.getBoundingClientRect();ke.x-=(s.clientX-Oe.x)*(420/o.width)/fe,ke.y-=(s.clientY-Oe.y)*(300/o.height)/fe,Oe={x:s.clientX,y:s.clientY},et()});const Bt=s=>{pt=!1,Oe=null,Z.hasPointerCapture(s.pointerId)&&Z.releasePointerCapture(s.pointerId)};Z.addEventListener("pointerup",Bt),Z.addEventListener("pointercancel",Bt),Z.addEventListener("wheel",s=>{s.preventDefault(),ut(s.deltaY<0?.25:-.25)},{passive:!1}),F.addEventListener("click",()=>{if(!_)return;const s=g.hidden;E.hidden=!0,v.setAttribute("aria-expanded","false"),g.hidden=!s,F.setAttribute("aria-expanded",String(s)),c==null||c.setPaused(s||!$.hidden)}),v.addEventListener("click",()=>{E.hidden?tt():Le()}),H.addEventListener("click",tt),(Ft=a.querySelector("#fallback-map-open"))==null||Ft.addEventListener("click",tt),a.querySelector("#skill-map-close").addEventListener("click",Le),a.querySelector("#discovery-close").addEventListener("click",Ze),a.querySelector("#badge-board-open").addEventListener("click",()=>{Ze(),g.hidden&&F.click()}),T.addEventListener("click",()=>{if(me&&!(c!=null&&c.relightBeacon(me))){const s=me==="signal"&&!["trailhead","crossing","settlement","bones"].every(o=>j.has(o));x.textContent=s?"The Last Signal needs the first four fires restored. Follow the old roads back to the dark beacons.":"Move closer to the field beacon to relight it.",u.textContent=s?"THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES":"MOVE CLOSER TO THE FIELD BEACON TO RELIGHT IT"}}),G.addEventListener("click",()=>{const s=$.hidden;E.hidden=!0,v.setAttribute("aria-expanded","false"),_&&(g.hidden=!0,F.setAttribute("aria-expanded","false")),$.hidden=!s,G.setAttribute("aria-expanded",String(s)),c==null||c.setPaused(s||!_||!E.hidden||!g.hidden),s&&a.querySelector("#bruno-controls-close").focus()}),a.querySelector("#bruno-controls-close").addEventListener("click",()=>{$.hidden=!0,G.setAttribute("aria-expanded","false"),c==null||c.setPaused(!_||!E.hidden||!g.hidden),G.focus()}),a.querySelector("#skills-start").addEventListener("click",()=>Ce()),K.addEventListener("click",()=>{ge=!ge,ge?(_||Ce(),ve=null,Ze(),N.forEach(s=>s.setAttribute("aria-pressed","false")),a.querySelectorAll("[data-map-marker]").forEach(s=>s.classList.remove("is-selected")),c?c.startRally():dt=!0,u.textContent="RALLY STARTED · FIND THE NEXT GOLD GATE"):(c==null||c.stopRally(),u.textContent="FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD"),K.setAttribute("aria-pressed",String(ge)),K.querySelector("span").textContent=ge?"END RALLY":"OPTIONAL RALLY"}),a.querySelector("#map-garage").addEventListener("click",()=>{_||Ce(),Le(!1),Rt()});const gt=s=>{if(!(s.target instanceof HTMLElement&&(s.target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(s.target.tagName)))){if(s.code==="Escape"){E.hidden?!g.hidden&&_?(g.hidden=!0,F.setAttribute("aria-expanded","false"),c==null||c.setPaused(!$.hidden),F.focus()):$.hidden||($.hidden=!0,G.setAttribute("aria-expanded","false"),c==null||c.setPaused(!_||!E.hidden||!g.hidden),G.focus()):Le();return}s.code==="KeyM"&&!s.repeat&&I.hidden&&(s.preventDefault(),E.hidden?tt():Le())}};window.addEventListener("keydown",gt);const va=()=>{const s=a.querySelector("#bruno-canvas");s&&(s.hidden=!0),a.querySelector("#bruno-scene-fallback").hidden=!1,a.classList.add("is-intro"),g.hidden=!1,a.querySelector("#skills-start").hidden=!0};return window.setTimeout(()=>{const s=a.querySelector("#bruno-canvas");if(!s)return;xt(async()=>{const{SkillWorld:l}=await import("./skillWorld-CagNtTkd.js");return{SkillWorld:l}},__vite__mapDeps([2,1])).then(({SkillWorld:l})=>{var S,k,w,Y,ce,de;if(c=new l(s,b=>Ct(b),({speed:b,pitch:L,roll:W,checkpoint:X,totalCheckpoints:Ee,complete:Sa,checkpointDistance:Ea,checkpointDirection:wa,destinationId:Wt,destinationDistance:at,destinationDirection:Vt,rallyActive:Ie,rallyElapsedMs:Ut,rallyBestMs:ka,nearbyBeaconId:je,nearbySecretId:jt,nearbySettlementTopic:Kt,settlementTopicCount:zt,settlementTopicTotal:Yt,lowRange:ft,offRoad:La,autoDriving:Ta,position:Me,heading:Aa,elevation:_t,worldHour:bt})=>{var Jt,Qt;const Xt=a.querySelector("#bruno-speed-value"),yt=a.querySelector("#bruno-gear-value");Xt&&(Xt.textContent=String(b)),yt&&(yt.textContent=ft?"L":"H",yt.setAttribute("aria-label",ft?"Low range":"High range"));const vt=a.querySelector("#incline-pitch-val"),St=a.querySelector("#incline-roll-val");if(vt&&typeof L=="number"&&(vt.textContent=`${L>=0?"+":""}${L}°`,vt.className="incline-num "+(Math.abs(L)>30?"is-danger":Math.abs(L)>20?"is-warn":"is-ok")),St&&typeof W=="number"&&(St.textContent=`${W>=0?"+":""}${W}°`,St.className="incline-num "+(Math.abs(W)>30?"is-danger":Math.abs(W)>20?"is-warn":"is-ok")),a.classList.toggle("is-driving",b>0),a.classList.toggle("is-off-road",!!La),a.classList.toggle("is-auto-driving",!!Ta),a.dataset.gear=ft?"L":"H",ya(Me,Aa,_t),Me){const De=Ga(Me.x,Me.z);Q.setWorldRegion(De,b/3.6);const Et={lowlands:"LOWLANDS",riverlands:"RIVERLANDS",ashen:"ASHEN VALE",fossil:"FOSSIL RIDGE",signal:"SIGNAL RANGE",highPass:"HIGH PASS",motorYard:"MOTOR YARD"};if(we){const ie=oe(Me.x,Me.z);we.textContent=`${Et[De]} · MAP ${Math.round(ie.x)}, ${Math.round(ie.y)} · ${Math.round(_t??0)} M`}if(Number.isFinite(bt)){const ie=bt>=20||bt<6?"night":"day";Z.dataset.timePhase=ie,D.dataset.timePhase=ie}}if(Number.isFinite(X)&&Number.isFinite(Ee)){const De=ue.find(ie=>ie.id===Wt),Et=Se?"ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN":jt?`HIDDEN PLACE · STOP AND PRESS E · ${(Jt=Tt[jt])==null?void 0:Jt.title.toUpperCase()}`:Kt?`ASHEN SETTLEMENT · STOP AND PRESS E · ${Kt.title.toUpperCase()}`:je==="settlement"&&zt<Yt?`SETTLEMENT SIGNAL SEALED · LIGHT THE HOUSE LAMPS ${zt}/${Yt}`:je&&!j.has(je)?je==="signal"&&!["trailhead","crossing","settlement","bones"].every(ie=>j.has(ie))?"THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES":`SIGNAL READY · PRESS E TO RELIGHT ${(Qt=ue.find(ie=>ie.id===je))==null?void 0:Qt.title.toUpperCase()}`:De?at<=7?`FIELD NOTE · ${De.title.toUpperCase()}`:`ROUTE TO ${De.title.toUpperCase()} · ${Vt||"FOLLOW"} ${at??""}M`:Wt==="garage"?`MOTOR WORKS · ${at<=12?"ENTERING GARAGE":`${Vt||"FIND"} ${at??""}M`}`:Ie?Sa?`RALLY COMPLETE · ${At(Ut)} · BEST ${At(ka)}`:`RALLY · ${Math.min(X,Ee)}/${Ee} · ${At(Ut)} · ${wa||"FIND"} ${Ea??""}M`:"FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD";u.textContent=Et}typeof Ie=="boolean"&&ge!==Ie&&(ge=Ie,K.setAttribute("aria-pressed",String(Ie)),K.querySelector("span").textContent=Ie?"END RALLY":"OPTIONAL RALLY")},(b,L)=>{var W;I.hidden=!b,H.hidden=b||!_,Qe(L),(W=a.querySelector(b?"#garage-close":"#bruno-btn-garage"))==null||W.focus()},(b,L)=>{const W=Se;j=new Set(b),Se=b.length===L,lt.querySelectorAll("[data-signal-unlock]").forEach(X=>{X.disabled=!j.has(X.dataset.signalUnlock)}),Ht(),Ot&&(Ot.textContent=String(b.length)),me&&j.has(me)&&(T.hidden=!0,x.textContent=`Signal restored. ${Lt[me]}`,P.hidden=!Se);try{window.localStorage.setItem(aa,JSON.stringify(b))}catch(X){console.error("Failed to save Signal Ridge beacon progress:",X)}Se&&(u.textContent="ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN"),Se&&!W&&Ct("signal")},_e,fa,We,b=>{if(!xe.includes(b.id)){xe.push(b.id);try{window.localStorage.setItem(na,JSON.stringify(xe))}catch(L){console.error("Failed to save Ashen Settlement house progress:",L)}}ba(b)},st,xe),s._world=c,c.setGarageStyle(Fe.value),c.setReducedMotion(ne),!a.isConnected){c.dispose(),window.removeEventListener("keydown",gt),o.disconnect();return}le=c.setVehicleBuild(le),Qe(le),c.setPaused(!_||!E.hidden||!$.hidden||!g.hidden),ve&&c.setDestination(ve),Ye&&(Ye=!1,c.travelToGarage()),dt&&(c.startRally(),dt=!1),(S=a.querySelector("#bruno-btn-horn"))==null||S.addEventListener("click",()=>{c.honk()}),(k=a.querySelector("#bruno-btn-reset"))==null||k.addEventListener("click",()=>{c.resetVehicle()}),(w=a.querySelector("#bruno-btn-garage"))==null||w.addEventListener("click",Rt),(Y=a.querySelector("#garage-close"))==null||Y.addEventListener("click",()=>c.exitGarage()),(ce=a.querySelector("#garage-drive"))==null||ce.addEventListener("click",()=>c.exitGarage());const p=()=>{const b={...c.getVehicleBuild()};ct.forEach(L=>{b[L.dataset.build]=L.type==="range"?Number(L.value):L.value}),le=c.setVehicleBuild(b),Qe(le);try{window.localStorage.setItem(wt,JSON.stringify(le)),Be.textContent="BUILD SAVED LOCALLY"}catch(L){Be.textContent="BUILD NOT SAVED",console.error("Failed to save the Signal Ridge vehicle build:",L)}};ct.forEach(b=>b.addEventListener("input",p)),lt.addEventListener("change",()=>{const b=ia.find(({id:W})=>W===lt.value);if(!b||!j.has(b.id))return;const L=a.querySelector('[data-build="paint"]');L.value=b.paint,L.dispatchEvent(new Event("input",{bubbles:!0}))}),(de=a.querySelector("#garage-reset"))==null||de.addEventListener("click",()=>{le=c.setVehicleBuild(kt),Qe(le);try{window.localStorage.setItem(wt,JSON.stringify(le)),Be.textContent="STOCK BUILD RESTORED"}catch(b){Be.textContent="BUILD NOT SAVED",console.error("Failed to save the restored Signal Ridge vehicle build:",b)}}),a.querySelectorAll("[data-key]").forEach(b=>{const L=b.dataset.key,W=Ee=>{Ee.preventDefault(),b.setPointerCapture&&b.setPointerCapture(Ee.pointerId),c!=null&&c.keys&&L in c.keys&&(c.keys[L]=!0),c!=null&&c.carBody&&c.carBody.wakeUp()},X=Ee=>{Ee.preventDefault(),c!=null&&c.keys&&L in c.keys&&(c.keys[L]=!1)};b.addEventListener("pointerdown",W),b.addEventListener("pointerup",X),b.addEventListener("pointerleave",X),b.addEventListener("pointercancel",X),b.addEventListener("lostpointercapture",X)})}).catch(l=>{va(),console.error("Failed to load SkillWorld engine:",l)});const o=new MutationObserver(()=>{var l;a.isConnected||((l=s._world)==null||l.dispose(),window.removeEventListener("keydown",gt),o.disconnect())});o.observe(document.body,{childList:!0,subtree:!0})},0),a}function be(a){return String(a).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function Va(){const a=R.personal,e=document.createElement("div");return e.className="contact-experience",e.innerHTML=`
    <header class="contact-nav">
      <a class="contact-wordmark" href="#home" aria-label="Return home">AS<span> / CONTACT</span></a>
      <span class="contact-nav-note">ADITYA SHINDE · ${be(a.location.split(",")[0])}</span>
      <a href="#work" data-portfolio-route="projects" class="contact-nav-link">SEE MY WORK ↗</a>
    </header>
    <div class="contact-scroll">
      <section class="contact-opening">
        <div class="contact-opening-copy">
          <p class="contact-kicker">FOR GOOD QUESTIONS & GOOD WORK</p>
          <h1>Have something<br />worth <em>building?</em></h1>
          <p class="contact-lede">I’m a backend and full-stack software engineer working across applications, APIs, and data systems. If there’s a role or a problem you think could be a fit, I’d be glad to hear from you.</p>
          <a class="contact-email-cta" href="mailto:${be(a.email)}">Write me an email <span>↗</span></a>
        </div>
        <div class="contact-orbit-art" aria-hidden="true">
          <div class="contact-orbit orbit-a"></div><div class="contact-orbit orbit-b"></div>
          <div class="contact-orbit-core"><span>AS</span><small>OPEN CHANNEL</small></div>
          <span class="contact-orbit-label orbit-label-a">SOFTWARE</span>
          <span class="contact-orbit-label orbit-label-b">SYSTEMS</span>
        </div>
      </section>
      <section class="contact-details">
        <div><span>EMAIL</span><a href="mailto:${be(a.email)}">${be(a.email)} <b>↗</b></a></div>
        <div><span>PHONE</span><a href="tel:${be(a.phone.replace(/[^0-9+]/g,""))}">${be(a.phone)} <b>↗</b></a></div>
        <div><span>LOCATION</span><p>${be(a.location)}</p></div>
        <div><span>ELSEWHERE</span><p><a href="${be(a.githubUrl)}" target="_blank" rel="noreferrer">GitHub ↗</a><a href="${be(a.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn ↗</a></p></div>
      </section>
      <footer class="contact-footer"><span>THANK YOU FOR TAKING A LOOK.</span><a href="#resume" data-portfolio-route="resume">A LITTLE MORE ABOUT ME ↗</a></footer>
    </div>
  `,e}function Ua(){var f;const a=document.getElementById("home-stage");if(!a)return;const e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>document.body.dataset.reducedMotion==="true"||document.body.dataset.motionPreference!=="standard"&&e.matches,n=a.querySelectorAll(".home-stat-card");let i=0,r=null;const d=()=>{i&&window.cancelAnimationFrame(i),i=0,r=null,a.style.setProperty("--pointer-x","68%"),a.style.setProperty("--pointer-y","50%"),a.style.setProperty("--atmosphere-x","0px"),a.style.setProperty("--atmosphere-y","0px"),n.forEach(h=>{h.style.setProperty("--tilt-x","0deg"),h.style.setProperty("--tilt-y","0deg"),h.style.setProperty("--card-light-x","50%"),h.style.setProperty("--card-light-y","50%")})};document.addEventListener("pointermove",h=>{if(t()||h.pointerType==="touch")return;const x=h.target instanceof Element?h.target:null,A=a.getBoundingClientRect(),O=h.clientX>=A.left&&h.clientX<=A.right&&h.clientY>=A.top&&h.clientY<=A.bottom,T=x==null?void 0:x.closest(".os-top-bar, .desktop-icons-container, .os-dock-container, .os-window, .control-center-modal");if(!O||T){d();return}r={x:h.clientX,y:h.clientY,target:h.target},!i&&(i=window.requestAnimationFrame(()=>{if(i=0,!r)return;const P=r,q=a.getBoundingClientRect(),C=Math.max(0,Math.min(1,(P.x-q.left)/q.width)),N=Math.max(0,Math.min(1,(P.y-q.top)/q.height));a.style.setProperty("--pointer-x",`${(C*100).toFixed(1)}%`),a.style.setProperty("--pointer-y",`${(N*100).toFixed(1)}%`),a.style.setProperty("--atmosphere-x",`${((C-.5)*24).toFixed(1)}px`),a.style.setProperty("--atmosphere-y",`${((N-.5)*18).toFixed(1)}px`);const I=P.target.closest(".home-stat-card");if(n.forEach(E=>{E!==I&&(E.style.setProperty("--tilt-x","0deg"),E.style.setProperty("--tilt-y","0deg"),E.style.setProperty("--card-light-x","50%"),E.style.setProperty("--card-light-y","50%"))}),I){const E=I.getBoundingClientRect(),$=Math.max(0,Math.min(1,(P.x-E.left)/E.width)),v=Math.max(0,Math.min(1,(P.y-E.top)/E.height));I.style.setProperty("--tilt-x",`${(($-.5)*4).toFixed(2)}deg`),I.style.setProperty("--tilt-y",`${((.5-v)*4).toFixed(2)}deg`),I.style.setProperty("--card-light-x",`${($*100).toFixed(1)}%`),I.style.setProperty("--card-light-y",`${(v*100).toFixed(1)}%`)}r=null}))}),window.addEventListener("blur",d),document.addEventListener("visibilitychange",()=>{document.hidden&&d()}),(f=e.addEventListener)==null||f.call(e,"change",h=>{h.matches&&d()}),requestAnimationFrame(()=>a.classList.add("home-motion-ready"))}(function(){const e=document.getElementById("site-loader"),t=document.getElementById("loader-status-text");e&&(t&&(t.textContent="PORTFOLIO READY"),window.addEventListener("DOMContentLoaded",()=>{window.setTimeout(()=>{e.classList.add("hidden"),window.setTimeout(()=>e.remove(),700)},180)},{once:!0}))})();document.addEventListener("DOMContentLoaded",()=>{var E,$,v,F,G,K,g;const a=document.getElementById("os-desktop"),e=document.getElementById("os-dock-container")||document.querySelector(".os-dock-container"),t=document.getElementById("three-canvas-container");Ua();const n=new Ca(a,e);let i=null;const r={isEnabled:()=>!!(i&&i.isEnabled),async setEnabled(u){if(!u){i&&i.setEnabled(!1);return}if(i)i.setEnabled(!0);else{const{ThreeBackground:y}=await xt(async()=>{const{ThreeBackground:H}=await import("./threeBackground-B49l8X-E.js");return{ThreeBackground:H}},__vite__mapDeps([3,1]));i=new y(t)}}},d=new Da(a,r),f={terminal:{title:"Portfolio console",iconSvg:Te.terminal,width:860,height:540,isTerminal:!0,createContent:()=>{const u=document.createElement("div");return u.style.height="100%",setTimeout(()=>{new Ia(u,n)},0),u}},resume:{title:"Aditya Shinde — Career profile",iconSvg:Te.resume,width:1240,height:760,createContent:Na},projects:{title:"Selected projects — Aditya Shinde",iconSvg:Te.projects,width:1320,height:780,createContent:u=>qa(u)},skills:{title:"Engineering map — Skills in context",iconSvg:Te.skills,width:1240,height:760,createContent:Wa},contact:{title:"Contact — Aditya Shinde",iconSvg:Te.contact,width:1240,height:760,createContent:Va}},h={projects:"work",resume:"resume",skills:"skills",contact:"contact"},x=Object.fromEntries(Object.entries(h).map(([u,y])=>[y,u])),A=[["projects","Work"],["skills","Skills"],["resume","Resume"],["contact","Contact"],["terminal","Terminal"]],O=document.getElementById("desktop-app-shortcuts"),T=document.getElementById("dock-app-shortcuts");A.forEach(([u,y])=>{const H=f[u];if(!H)return;const D=document.createElement("button");D.type="button",D.className="desktop-icon-item",D.dataset.launchApp=u,D.setAttribute("aria-label",`Open ${y}`),D.innerHTML=`<span class="icon-svg-wrap">${H.iconSvg}</span><span class="icon-label">${y}</span>`,O.appendChild(D);const B=document.createElement("button");B.type="button",B.className="dock-item",B.dataset.launchApp=u,B.title=`Open ${y}`,B.setAttribute("aria-label",`Open ${y}`),B.innerHTML=`${H.iconSvg}<span class="dock-tooltip">${y}</span>`,T.appendChild(B)});const P=document.getElementById("system-clock"),q=()=>{const u=new Date;P.dateTime=u.toISOString(),P.textContent=new Intl.DateTimeFormat("en-IN",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(u)};q(),setInterval(q,3e4);function C(u,y=!0,H=!1,D=""){var qe;const B=u.toLowerCase().trim(),V=B==="work"?"projects":B;if(V==="control-center"||V==="settings"){d.toggle();return}if(f[V]){if(H&&Object.keys(h).forEach(ye=>{ye!==V&&n.closeWindow(ye)}),y&&h[V]){const ye=`#${h[V]}`;window.location.hash!==ye&&window.history.pushState(null,"",ye)}const se=f[V],we=n.windows.get(V);V==="projects"&&D&&we&&((qe=we.element.querySelector(".study-experience"))==null||qe.navigateToProject(D)),n.createWindow({id:V,title:se.title,iconSvg:se.iconSvg,content:se.createContent(D),width:se.width,height:se.height,isTerminal:!!se.isTerminal})}}window.openAppByName=C;function N(u=!0){Object.keys(h).forEach(y=>n.closeWindow(y)),u&&window.location.hash!=="#home"&&window.history.pushState(null,"","#home")}function I(){const u=window.location.hash.slice(1).split("/")[0].toLowerCase();if(!u||u==="home"){N(!1);return}const y=x[u];y&&C(y,!1,!0)}window.addEventListener("hashchange",I),n.onWindowClosed=u=>{const y=h[u];y&&window.location.hash===`#${y}`&&window.history.replaceState(null,"",`${window.location.pathname}${window.location.search}`)},a.addEventListener("click",u=>{const y=u.target.closest("[data-launch-app]");if(y){const B=!!y.closest(".os-dock-container"),V=y.dataset.launchApp;if(B&&n.windows.has(V)){n.windows.get(V).isMinimized?n.restoreWindow(V):n.activeWindow===V?n.minimizeWindow(V):n.focusWindow(V);return}C(y.dataset.launchApp,!0,!1,y.dataset.projectTarget||"");return}const H=u.target.closest('a[href^="#"]');if(!H)return;u.preventDefault();const D=H.dataset.portfolioRoute||H.getAttribute("href").slice(1);D==="home"?N():C(D,!0,!0)}),(E=document.getElementById("top-control-center-btn"))==null||E.addEventListener("click",N),($=document.getElementById("top-spotlight-trigger"))==null||$.addEventListener("click",()=>d.open()),(v=document.getElementById("top-open-terminal"))==null||v.addEventListener("click",()=>C("terminal")),(F=document.getElementById("top-open-projects"))==null||F.addEventListener("click",()=>C("projects",!0,!0)),(G=document.getElementById("top-open-resume"))==null||G.addEventListener("click",()=>C("resume",!0,!0)),(K=document.getElementById("top-open-skills"))==null||K.addEventListener("click",()=>C("skills",!0,!0)),(g=document.getElementById("top-recruit-btn"))==null||g.addEventListener("click",()=>C("contact",!0,!0)),window.addEventListener("keydown",u=>{(u.metaKey||u.ctrlKey)&&u.key.toLowerCase()==="k"&&(u.preventDefault(),d.toggle())}),I()});export{es as F,ta as G,as as H,la as R,ts as S,_a as T,Ba as W,za as Z,re as a,Qa as b,ja as c,Ka as d,Xa as e,U as f,Za as g,Ya as h,Ja as i,ra as m,R as r,Q as s};
