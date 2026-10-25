const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/workWorld-D0qGXKyN.js","assets/three.module-Dojr5jEI.js","assets/skillWorld-DaNO5W1B.js","assets/threeBackground-B49l8X-E.js"])))=>i.map(i=>d[i]);
(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const r of i)if(r.type==="childList")for(const d of r.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function t(i){const r={};return i.integrity&&(r.integrity=i.integrity),i.referrerPolicy&&(r.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?r.credentials="include":i.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(i){if(i.ep)return;i.ep=!0;const r=t(i);fetch(i.href,r)}})();const Os="modulepreload",Cs=function(s){return"/"+s},es={},xt=function(e,t,n){let i=Promise.resolve();if(t&&t.length>0){let d=function(x){return Promise.all(x.map(A=>Promise.resolve(A).then(R=>({status:"fulfilled",value:R}),R=>({status:"rejected",reason:R}))))};document.getElementsByTagName("link");const b=document.querySelector("meta[property=csp-nonce]"),h=(b==null?void 0:b.nonce)||(b==null?void 0:b.getAttribute("nonce"));i=d(t.map(x=>{if(x=Cs(x),x in es)return;es[x]=!0;const A=x.endsWith(".css"),R=A?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${x}"]${R}`))return;const T=document.createElement("link");if(T.rel=A?"stylesheet":Os,A||(T.as="script"),T.crossOrigin="",T.href=x,h&&T.setAttribute("nonce",h),document.head.appendChild(T),A)return new Promise((P,G)=>{T.addEventListener("load",P),T.addEventListener("error",()=>G(new Error(`Unable to preload CSS for ${x}`)))})}))}function r(d){const b=new Event("vite:preloadError",{cancelable:!0});if(b.payload=d,window.dispatchEvent(b),!b.defaultPrevented)throw d}return i.then(d=>{for(const b of d||[])b.status==="rejected"&&r(b.reason);return e().catch(r)})};class Is{constructor(){this.enabled=!0,this.volume=.35,this.ctx=null,this.masterGain=null,this.worldAudio=null}init(){if(!this.ctx&&typeof window<"u"){const e=window.AudioContext||window.webkitAudioContext;e&&(this.ctx=new e,this.masterGain=this.ctx.createGain(),this.masterGain.gain.value=this.enabled?this.volume:0,this.masterGain.connect(this.ctx.destination))}}toggleSound(){return this.enabled=!this.enabled,this.masterGain&&this.ctx&&this.masterGain.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.04),this.enabled}setVolume(e){return this.volume=Math.min(1,Math.max(0,Number(e))),Number.isFinite(this.volume)||(this.volume=.35),this.masterGain&&this.ctx&&this.enabled&&this.masterGain.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.04),this.volume}startWorldAmbience(){if(!this.enabled||this.worldAudio||(this.init(),!this.ctx||!this.masterGain))return;const e=this.ctx.createBuffer(1,this.ctx.sampleRate*2,this.ctx.sampleRate),t=e.getChannelData(0);for(let h=0;h<t.length;h+=1)t[h]=(Math.random()*2-1)*.18;const n=this.ctx.createBufferSource();n.buffer=e,n.loop=!0;const i=this.ctx.createBiquadFilter();i.type="lowpass",i.frequency.value=420;const r=this.ctx.createGain();r.gain.value=.05,n.connect(i),i.connect(r),r.connect(this.masterGain);const d=this.ctx.createOscillator();d.type="sine",d.frequency.value=58;const b=this.ctx.createGain();b.gain.value=.018,d.connect(b),b.connect(this.masterGain),n.start(),d.start(),this.worldAudio={noise:n,filter:i,noiseGain:r,drone:d,droneGain:b,region:"lowlands"},this.ctx.resume().catch(h=>{console.error("Unable to start Signal Ridge ambience:",h)})}setWorldRegion(e,t=0){if(!this.worldAudio||!this.ctx)return;const n={lowlands:{cutoff:420,drone:58,noise:.035},riverlands:{cutoff:780,drone:72,noise:.075},ashen:{cutoff:250,drone:49,noise:.028},fossil:{cutoff:1100,drone:64,noise:.06},signal:{cutoff:560,drone:82,noise:.048},highPass:{cutoff:1350,drone:92,noise:.065},motorYard:{cutoff:340,drone:54,noise:.025}},i=n[e]??n.lowlands,r=this.ctx.currentTime;this.worldAudio.filter.frequency.setTargetAtTime(i.cutoff,r,1.4),this.worldAudio.drone.frequency.setTargetAtTime(i.drone,r,1.4),this.worldAudio.noiseGain.gain.setTargetAtTime(i.noise+Math.min(.035,Math.abs(t)*.001),r,.5),this.worldAudio.region=e}stopWorldAmbience(){this.worldAudio&&(this.worldAudio.noise.stop(),this.worldAudio.drone.stop(),this.worldAudio=null)}playKeySound(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.createOscillator(),t=this.ctx.createGain();e.type="sine",e.frequency.setValueAtTime(600+Math.random()*200,this.ctx.currentTime),t.gain.setValueAtTime(.015,this.ctx.currentTime),t.gain.exponentialRampToValueAtTime(1e-4,this.ctx.currentTime+.04),e.connect(t),t.connect(this.masterGain),e.start(),e.stop(this.ctx.currentTime+.04)}catch{}}playWindowOpen(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="triangle",t.frequency.setValueAtTime(320,e),t.frequency.exponentialRampToValueAtTime(640,e+.12),n.gain.setValueAtTime(.04,e),n.gain.exponentialRampToValueAtTime(.001,e+.14),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.14)}catch{}}playWindowClose(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(520,e),t.frequency.exponentialRampToValueAtTime(260,e+.1),n.gain.setValueAtTime(.03,e),n.gain.exponentialRampToValueAtTime(.001,e+.1),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.1)}catch{}}playSuccess(){if(this.enabled&&(this.init(),!!this.ctx))try{[440,554.37,659.25,880].forEach((t,n)=>{const i=this.ctx.currentTime+n*.08,r=this.ctx.createOscillator(),d=this.ctx.createGain();r.type="triangle",r.frequency.setValueAtTime(t,i),d.gain.setValueAtTime(.05,i),d.gain.exponentialRampToValueAtTime(.001,i+.18),r.connect(d),d.connect(this.masterGain),r.start(i),r.stop(i+.18)})}catch{}}playHonk(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime;[380,475].forEach(t=>{const n=this.ctx.createOscillator(),i=this.ctx.createGain();n.type="sawtooth",n.frequency.setValueAtTime(t,e),i.gain.setValueAtTime(.06,e),i.gain.exponentialRampToValueAtTime(.001,e+.22),n.connect(i),i.connect(this.masterGain),n.start(e),n.stop(e+.22)})}catch{}}playCrash(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="triangle",t.frequency.setValueAtTime(140,e),t.frequency.exponentialRampToValueAtTime(40,e+.15),n.gain.setValueAtTime(.12,e),n.gain.exponentialRampToValueAtTime(.001,e+.16),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.16)}catch{}}playDiscovery(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime;[523.25,659.25,783.99,1046.5].forEach((t,n)=>{const i=this.ctx.createOscillator(),r=this.ctx.createGain();i.type="sine",i.frequency.setValueAtTime(t,e+n*.05),r.gain.setValueAtTime(.05,e+n*.05),r.gain.exponentialRampToValueAtTime(1e-4,e+n*.05+.3),i.connect(r),r.connect(this.masterGain),i.start(e+n*.05),i.stop(e+n*.05+.3)})}catch{}}playSignal(e){if(!this.enabled||(this.init(),!this.ctx))return;const n={trailhead:392,crossing:440,settlement:494,bones:523.25,signal:587.33,"high-pass":659.25}[e];if(!n)return;const i=this.ctx.currentTime,r=this.ctx.createOscillator(),d=this.ctx.createGain();r.type="sine",r.frequency.setValueAtTime(n*.72,i),r.frequency.exponentialRampToValueAtTime(n,i+.32),d.gain.setValueAtTime(1e-4,i),d.gain.exponentialRampToValueAtTime(.08,i+.08),d.gain.exponentialRampToValueAtTime(1e-4,i+1.25),r.connect(d),d.connect(this.masterGain),r.start(i),r.stop(i+1.26)}playWhoosh(){if(this.enabled&&(this.init(),!!this.ctx))try{const e=this.ctx.currentTime,t=this.ctx.createOscillator(),n=this.ctx.createGain();t.type="sine",t.frequency.setValueAtTime(200,e),t.frequency.exponentialRampToValueAtTime(450,e+.12),n.gain.setValueAtTime(.03,e),n.gain.exponentialRampToValueAtTime(.001,e+.15),t.connect(n),n.connect(this.masterGain),t.start(e),t.stop(e+.15)}catch{}}}const Q=new Is,Te={terminal:`
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
  `,snapLeft:'<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>',snapRight:'<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>'};class Ms{constructor(e,t){var n,i;this.desktop=e,this.dock=(n=t==null?void 0:t.classList)!=null&&n.contains("os-dock-container")?t:((i=t==null?void 0:t.closest)==null?void 0:i.call(t,".os-dock-container"))||document.querySelector(".os-dock-container"),this.windows=new Map,this.activeWindow=null,this.highestZIndex=100,this.cascadeOffset=0,window.addEventListener("resize",()=>this.constrainWindowsToViewport())}createWindow({id:e,title:t,iconSvg:n,content:i,width:r=850,height:d=580,isTerminal:b=!1}){if(this.windows.has(e)){const E=this.windows.get(e);return E.closeTimer!==null&&(clearTimeout(E.closeTimer),E.closeTimer=null,E.element.classList.remove("is-closing")),this.focusWindow(e),this.restoreWindow(e),E}const h=document.createElement("div"),x=["projects","resume","skills","contact"].includes(e),A=e==="projects"||e==="skills";h.className=`os-window ${b?"terminal-window-style":""} ${x?"portfolio-workspace":""} ${A?"portfolio-immersive-workspace":""}`,h.id=`win-${e}`;const R=window.innerWidth,T=window.innerHeight;let P=Math.min(r,R-32),G=Math.min(d,T-100),C,$;A?(P=R,G=T,C=0,$=0):(C=Math.max(20,Math.floor((R-P)/2)+this.cascadeOffset),$=Math.max(40,Math.floor((T-G)/2-20)+this.cascadeOffset),this.cascadeOffset=(this.cascadeOffset+24)%120),h.style.width=`${P}px`,h.style.height=`${G}px`,h.style.left=`${C}px`,h.style.top=`${$}px`,this.highestZIndex+=1,h.style.zIndex=this.highestZIndex,h.innerHTML=`
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
    `,typeof i!="string"&&i instanceof HTMLElement&&h.querySelector(".window-body").appendChild(i),this.desktop.appendChild(h);const I={id:e,title:t,iconSvg:n,element:h,preferredWidth:r,preferredHeight:d,isMaximized:!1,isMinimized:!1,closeTimer:null,prevBounds:null};return this.windows.set(e,I),this.setupWindowEvents(I),this.focusWindow(e),this.updateDockState(),Q.playWindowOpen(),I}constrainWindowsToViewport(){this.windows.forEach(e=>{const{element:t}=e;if(e.isMaximized||t.style.width.startsWith("calc("))return;const n=Math.min(e.preferredWidth,window.innerWidth-16),i=Math.min(e.preferredHeight,window.innerHeight-80),r=t.classList.contains("portfolio-immersive-workspace"),d=r?Math.max(8,Math.floor((window.innerWidth-n)/2)):Math.min(Math.max(8,parseFloat(t.style.left)||0),window.innerWidth-n-8),b=r?Math.max(36,Math.floor((window.innerHeight-i)/2-20)):Math.min(Math.max(36,parseFloat(t.style.top)||0),window.innerHeight-i-44);t.style.width=`${n}px`,t.style.height=`${i}px`,t.style.left=`${d}px`,t.style.top=`${b}px`})}setupWindowEvents(e){const{id:t,element:n}=e,i=n.querySelector(".window-header");n.addEventListener("mousedown",()=>this.focusWindow(t)),i.addEventListener("click",v=>{const F=v.target.closest("button");if(!F)return;const q=F.dataset.action;q==="close"&&this.closeWindow(t),q==="minimize"&&this.minimizeWindow(t),q==="maximize"&&this.toggleMaximize(t),q==="snap-left"&&this.snapWindow(t,"left"),q==="snap-right"&&this.snapWindow(t,"right")}),i.addEventListener("dblclick",v=>{v.target.closest("button")||this.toggleMaximize(t)});let r=!1,d,b,h,x;const A=v=>{v.target.closest("button")||e.isMaximized||(r=!0,d=v.clientX||v.touches&&v.touches[0].clientX,b=v.clientY||v.touches&&v.touches[0].clientY,h=parseInt(n.style.left,10)||0,x=parseInt(n.style.top,10)||0,n.classList.add("is-dragging"),document.addEventListener("mousemove",R),document.addEventListener("mouseup",T),document.addEventListener("touchmove",R),document.addEventListener("touchend",T))},R=v=>{if(!r)return;const F=v.clientX||v.touches&&v.touches[0].clientX,q=v.clientY||v.touches&&v.touches[0].clientY,z=F-d,g=q-b;let u=h+z,y=x+g;y=Math.max(34,y),u=Math.max(-n.offsetWidth+80,Math.min(u,window.innerWidth-80)),n.style.left=`${u}px`,n.style.top=`${y}px`},T=()=>{r&&(r=!1,n.classList.remove("is-dragging"),document.removeEventListener("mousemove",R),document.removeEventListener("mouseup",T),document.removeEventListener("touchmove",R),document.removeEventListener("touchend",T))};i.addEventListener("mousedown",A),i.addEventListener("touchstart",A,{passive:!0});const P=n.querySelector(".window-resize-handle");let G=!1,C,$;const I=v=>{e.isMaximized||(v.stopPropagation(),G=!0,d=v.clientX,b=v.clientY,C=n.offsetWidth,$=n.offsetHeight,document.addEventListener("mousemove",E),document.addEventListener("mouseup",D))},E=v=>{if(!G)return;const F=Math.max(360,C+(v.clientX-d)),q=Math.max(260,$+(v.clientY-b));n.style.width=`${F}px`,n.style.height=`${q}px`},D=()=>{G=!1,document.removeEventListener("mousemove",E),document.removeEventListener("mouseup",D)};P.addEventListener("mousedown",I)}snapWindow(e,t){const n=this.windows.get(e);n&&(n.element.style.top="36px",n.element.style.height="calc(100vh - 100px)",n.element.style.width="calc(50vw - 12px)",t==="left"?n.element.style.left="6px":n.element.style.left="50vw")}focusWindow(e){const t=this.windows.get(e);!t||t.element.classList.contains("is-closing")||(this.highestZIndex+=1,t.element.style.zIndex=this.highestZIndex,this.windows.forEach(n=>{n.element.classList.remove("active-window")}),t.element.classList.add("active-window"),this.activeWindow=e,this.updateImmersiveState(),this.updateDockState())}toggleMaximize(e){const t=this.windows.get(e);t&&(t.isMaximized?(t.element.style.width=`${t.prevBounds.width}px`,t.element.style.height=`${t.prevBounds.height}px`,t.element.style.left=`${t.prevBounds.left}px`,t.element.style.top=`${t.prevBounds.top}px`,t.element.classList.remove("is-maximized"),t.isMaximized=!1):(t.prevBounds={width:t.element.offsetWidth,height:t.element.offsetHeight,left:parseInt(t.element.style.left,10),top:parseInt(t.element.style.top,10)},t.element.style.left="0px",t.element.style.top="36px",t.element.style.width="100vw",t.element.style.height="calc(100vh - 96px)",t.element.classList.add("is-maximized"),t.isMaximized=!0))}minimizeWindow(e){const t=this.windows.get(e);if(t){if(t.element.classList.add("is-minimized"),t.isMinimized=!0,this.activeWindow===e){const n=[...this.windows.values()].filter(i=>i.id!==e&&!i.isMinimized&&!i.element.classList.contains("is-closing")).sort((i,r)=>Number(r.element.style.zIndex)-Number(i.element.style.zIndex))[0];this.activeWindow=n?n.id:null}this.updateImmersiveState(),this.updateDockState(),Q.playWindowClose()}}restoreWindow(e){const t=this.windows.get(e);t&&(t.element.classList.remove("is-minimized"),t.isMinimized=!1,this.focusWindow(e))}closeWindow(e){const t=this.windows.get(e);!t||t.element.classList.contains("is-closing")||(t.element.classList.add("is-closing"),Q.playWindowClose(),t.closeTimer=setTimeout(()=>{if(t.closeTimer=null,this.windows.get(e)===t){if(t.element.parentNode&&t.element.parentNode.removeChild(t.element),this.windows.delete(e),this.updateDockState(),this.onWindowClosed&&this.onWindowClosed(e),this.activeWindow===e){const n=[...this.windows.values()].filter(i=>!i.isMinimized&&!i.element.classList.contains("is-closing")).sort((i,r)=>Number(r.element.style.zIndex)-Number(i.element.style.zIndex))[0];n?this.focusWindow(n.id):this.activeWindow=null}this.updateImmersiveState(),this.updateDockState()}},200))}updateImmersiveState(){const e=this.activeWindow&&this.windows.get(this.activeWindow),t=!!(e&&!e.isMinimized&&!e.element.classList.contains("is-closing")&&e.element.classList.contains("portfolio-immersive-workspace"));this.desktop.classList.toggle("immersive-experience-active",t)}updateDockState(){if(!this.dock)return;this.dock.querySelectorAll("[data-launch-app]").forEach(t=>{const n=t.dataset.launchApp,i=this.windows.get(n),r=!!(i&&!i.element.classList.contains("is-closing")),d=r&&this.activeWindow===n&&!i.isMinimized,b=r&&i.isMinimized;t.classList.toggle("is-open",r),t.classList.toggle("is-active",d),t.classList.toggle("is-minimized",b),d?t.setAttribute("aria-current","true"):t.removeAttribute("aria-current")})}}const O={personal:{name:"Aditya Shinde",title:"Backend / Full-Stack Software Engineer",email:"aditya12rash@gmail.com",phone:"(+91) 9324284783",location:"Virar, Maharashtra - 401303",githubUrl:"https://github.com/AdityaShinde-git",linkedinUrl:"https://linkedin.com/in/aditya-shinde-5a031b305",cgpa:"8.0 / 10",degree:"Bachelor of Science in Information Technology",university:"University of Mumbai",educationPeriod:"Aug 2022 – Apr 2025",summary:"Backend / Full-Stack Software Engineer experienced in building and maintaining production web applications, REST APIs, business modules, and database-driven systems. Strong experience with PHP, Laravel, CodeIgniter 4, MySQL, PostgreSQL, React, JavaScript, and TypeScript, with additional experience building Rust-based real-time CDC and data synchronization systems. Experienced in MVC architecture, RBAC, audit trails, CRUD workflows, email automation, and production feature development."},experience:[{id:"vk-lalco",company:"V.K. Lalco",role:"Software Developer",period:"Jun 2026 – Present",status:"Current Role",technologies:["PHP","Laravel","CodeIgniter","MySQL","PostgreSQL","React","JavaScript","TypeScript"],highlights:["Developed and maintained production web applications using PHP, Laravel, CodeIgniter, MySQL, PostgreSQL, React, JavaScript, and TypeScript.","Designed and developed a centralized Update Management System (UMS) to track module-level changes, responsible users, timestamps, and detailed audit trails across the application.","Implemented role-based access control (RBAC) for UMS and application features, ensuring users could access actions and data according to their roles and permissions.","Built an integrated email workflow for completed module updates, supporting configurable recipients, CC, BCC, delivery status, and system-generated notifications.","Added and maintained new features across existing modules, including backend logic, database changes, REST APIs, validation, and frontend updates.","Worked on production fixes, feature enhancements, database operations, and application maintenance while ensuring existing functionality remained stable."]},{id:"volody",company:"Volody",role:"Software Developer Intern",period:"Mar 2026 – Jun 2026",status:"Internship",technologies:["PHP","Laravel","React","JavaScript","TypeScript","MySQL","PostgreSQL"],highlights:["Developed and maintained production features using PHP, Laravel, React, JavaScript, TypeScript, MySQL, and PostgreSQL.","Built and integrated REST APIs for application features and backend business workflows.","Worked on database-driven features, query optimization, validation, CRUD operations, and application-level business logic.","Resolved production issues and implemented enhancements across existing modules while following MVC and maintainable coding practices."]},{id:"k2s2",company:"K2S2 Digistrat",role:"Software Developer Intern",period:"Sep 2025 – Feb 2026",status:"Internship",technologies:["CodeIgniter 4","PHP","Rust","REST APIs"],highlights:["Built and integrated REST APIs for production systems and developed database-driven features using CodeIgniter 4.","Developed a Lead Management System with relational data, nested CRUD operations, validation, and reusable backend business logic.","Contributed to a Railway Management System through database schema updates, backend changes, and user-interface enhancements.","Built a Rust-based Data Sync Platform supporting bulk data migration and real-time Change Data Capture (CDC) operations."]}],projects:[{id:"oms-hrms",title:"Office / HR Management System (OMS)",subtitle:"Full-stack HR management platform",overview:"A full-stack HRMS covering employee management, attendance, leave, payroll, holidays, announcements, tickets, and self-service.",areas:["Employee management","Attendance","Leave","Payroll","Holidays","Announcements","Tickets & self-service"],tech:["PHP","CodeIgniter 4","MySQL","Bootstrap 5"],highlights:["Built a full-stack HR management system across multiple interconnected workplace modules."],implementation:["MVC + Service architecture with thin controllers, reusable business logic, validation, and database-driven workflows.","Role-based access control with roles, permissions, route-level authorization, and audit logging for significant operations.","REST-based backend workflows and CRUD operations across multiple modules."],source:"Resume · Projects"},{id:"dafca-chat",title:"Dafca – Real-Time Chat Application",subtitle:"Real-time messaging with persistent conversations and file sharing",overview:"A real-time messaging platform with persistent conversations, file sharing, and backend APIs for real-time communication.",areas:["Persistent conversations","File sharing","Backend APIs"],tech:["React","Express.js","MongoDB"],period:"Jan 2025 – Apr 2025",highlights:["Built a real-time messaging platform using React, Express.js, and MongoDB."],source:"Resume · Projects"}],skills:{languages:["PHP","JavaScript","TypeScript","Rust","Python","C++"],backend:["Laravel","CodeIgniter 4","Node.js","Express.js","REST APIs","MVC","CRUD","Authentication","RBAC"],frontend:["React.js","TypeScript","JavaScript","HTML","CSS","Bootstrap","Material UI"],databases:["MySQL","PostgreSQL","MongoDB","Oracle"],architecture:["Service Layer","Role-Based Access Control","Audit Logging","API Integration","Real-Time Data Systems","Change Data Capture (CDC)"],toolsAndDevops:["Git","Docker","VMware","Android Studio","Postman"]}},ts=["about","experience","projects","skills","resume.pdf","contact"];function M(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}class Ds{constructor(e,t){this.container=e,this.wm=t,this.history=[],this.historyIndex=-1,this.commands={},this.initDOM(),this.registerCommands()}initDOM(){this.container.innerHTML=`
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
    `,this.output=this.container.querySelector("#term-output"),this.input=this.container.querySelector("#term-input"),this.body=this.container.querySelector("#term-body"),this.setupListeners()}setupListeners(){this.container.addEventListener("click",e=>{e.target!==this.input&&!e.target.closest("a")&&this.input.focus()}),this.input.addEventListener("keydown",e=>{if(e.key==="Enter"){const t=this.input.value.trim();this.input.value="",t&&(this.history.push(t),this.historyIndex=this.history.length,this.executeCommand(t))}else e.key==="ArrowUp"?(e.preventDefault(),this.historyIndex>0&&(this.input.value=this.history[--this.historyIndex])):e.key==="ArrowDown"?(e.preventDefault(),this.historyIndex<this.history.length-1?this.input.value=this.history[++this.historyIndex]:(this.historyIndex=this.history.length,this.input.value="")):e.key==="Tab"&&(e.preventDefault(),this.handleTabAutocomplete());(e.key.length===1||e.key==="Backspace")&&Q.playKeySound()})}handleTabAutocomplete(){const e=this.input.value.trim().toLowerCase();if(!e)return;const t=[...Object.keys(this.commands),...ts],n=[...new Set(t)].filter(i=>i.startsWith(e));n.length===1?this.input.value=n[0]:n.length>1&&this.printLine(`Suggestions: ${n.map(M).join(" · ")}`,"term-muted")}registerCommands(){this.commands={help:()=>this.cmdHelp(),about:()=>this.cmdAbout(),bio:()=>this.cmdAbout(),skills:()=>this.cmdSkills(),experience:()=>this.cmdExperience(),work:()=>this.cmdProjects(),projects:()=>this.cmdProjects(),open:e=>this.cmdOpen(e),ls:()=>this.cmdList(),cat:e=>this.cmdRead(e),contact:()=>this.cmdContact(),hire:()=>this.cmdContact(),clear:()=>this.cmdClear(),whoami:()=>this.printLine(`${M(O.personal.name)} — ${M(O.personal.title)}`),date:()=>this.printLine(M(new Date().toLocaleString())),echo:e=>this.printLine(M(e.join(" ")))}}executeCommand(e){this.printPromptLine(e);const[t,...n]=e.split(/\s+/),i=this.commands[t.toLowerCase()];i?i(n):this.printLine(`Unknown command: ${M(t)}. Type <span class="term-command">help</span> for the available commands.`,"term-error")}printPromptLine(e){const t=document.createElement("div");t.className="term-command-line",t.innerHTML=`<span class="term-command-prompt">$ aditya</span><span>${M(e)}</span>`,this.output.appendChild(t),this.scrollToBottom()}printLine(e,t=""){const n=document.createElement("div");n.className=`term-line ${t}`,n.innerHTML=e,this.output.appendChild(n),this.scrollToBottom()}scrollToBottom(){this.body.scrollTop=this.body.scrollHeight}cmdHelp(){const e=[["about","Read the professional summary"],["experience","Browse roles and documented contributions"],["projects","View projects listed on the resume"],["skills","List the resume skills by category"],["open [section]","Open work, resume, skills, contact, or terminal"],["ls","List the available portfolio sections"],["cat [section]","Read about, skills, projects, experience, or resume PDF"],["contact","Show direct contact details"],["date","Show the current local date and time"],["clear","Clear the console"]];this.printLine(`<section class="term-card"><h2>COMMANDS</h2><dl>${e.map(([t,n])=>`<div><dt>${M(t)}</dt><dd>${M(n)}</dd></div>`).join("")}</dl></section>`)}cmdAbout(){this.printLine(`<section class="term-card"><h2>ABOUT</h2><p>${M(O.personal.summary)}</p></section>`)}cmdSkills(){const e=[["Languages",O.skills.languages],["Backend",O.skills.backend],["Frontend",O.skills.frontend],["Databases",O.skills.databases],["Architecture",O.skills.architecture],["Tools",O.skills.toolsAndDevops]];this.printLine(`<section class="term-card"><h2>SKILLS · RESUME INVENTORY</h2>${e.map(([t,n])=>`<div class="term-skill-group"><h3>${M(t)}</h3><p>${n.map(M).join(" · ")}</p></div>`).join("")}</section>`)}cmdExperience(){this.printLine(`<section class="term-card"><h2>EXPERIENCE</h2>${O.experience.map(e=>`
      <article class="term-record">
        <h3>${M(e.role)} · ${M(e.company)}</h3>
        <p class="term-muted">${M(e.period)}</p>
        <ul>${e.highlights.map(t=>`<li>${M(t)}</li>`).join("")}</ul>
      </article>
    `).join("")}</section>`)}cmdProjects(){this.printLine(`<section class="term-card"><h2>PROJECTS · RESUME LISTING</h2>${O.projects.map(e=>`
      <article class="term-record">
        <h3>${M(e.title)}</h3>
        ${e.period?`<p class="term-muted">${M(e.period)}</p>`:""}
        <p>${M(e.tech.join(" · "))}</p>
        <ul>${e.highlights.map(t=>`<li>${M(t)}</li>`).join("")}</ul>
      </article>
    `).join("")}</section>`)}cmdList(){this.printLine(`<section class="term-card"><h2>AVAILABLE PORTFOLIO SECTIONS</h2><ul class="term-section-list">${ts.map(e=>`<li>${M(e)}</li>`).join("")}</ul><p class="term-muted">Use <code>open [section]</code> to navigate.</p></section>`)}cmdRead(e){const t=(e[0]||"").toLowerCase(),n={about:()=>this.cmdAbout(),skills:()=>this.cmdSkills(),experience:()=>this.cmdExperience(),projects:()=>this.cmdProjects(),work:()=>this.cmdProjects()};n[t]?n[t]():t==="resume.pdf"||t==="resume"?this.printLine('<a class="term-download-link" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download the verified PDF resume ↓</a>'):this.printLine(`No readable portfolio section named "${M(t)}". Try <span class="term-command">ls</span>.`,"term-error")}cmdOpen(e){const t=(e[0]||"").toLowerCase();if(t==="resume.pdf"){this.cmdRead(["resume.pdf"]);return}const n=t==="work"?"projects":t;["projects","resume","skills","contact","terminal"].includes(n)&&window.openAppByName?(window.openAppByName(n),this.printLine(`Opened ${M(t)}.`,"term-success")):this.printLine("Usage: open [work|projects|resume|skills|contact|terminal]","term-error")}cmdContact(){const e=O.personal;this.printLine(`<section class="term-card"><h2>CONTACT</h2><p><a href="mailto:${M(e.email)}">${M(e.email)}</a></p><p>${M(e.phone)}</p><p>${M(e.location)}</p></section>`),window.openAppByName&&window.openAppByName("contact")}cmdClear(){this.output.replaceChildren()}}const Ns=[{name:"Selected work",app:"projects",desc:"Case studies in product and systems engineering",keywords:O.projects.flatMap(s=>[s.title,...s.tech,...s.highlights]).join(" ")},{name:"Engineering map",app:"skills",desc:"Languages, frameworks, data, and tools in context",keywords:Object.values(O.skills).flat().map(s=>s.name).join(" ")},{name:"Career profile",app:"resume",desc:"Resume, experience, education, and a downloadable text profile",keywords:`resume cv ${O.personal.name} ${O.experience.map(s=>`${s.company} ${s.role} ${s.technologies.join(" ")}`).join(" ")}`},{name:"Contact",app:"contact",desc:"Email, phone, location, and professional links",keywords:`${O.personal.email} ${O.personal.phone} ${O.personal.location} github linkedin`},{name:"Terminal",app:"terminal",desc:"A small interactive developer terminal"}];class $s{constructor(e,t){this.container=e,this.scenePreferences=t,this.isOpen=!1,this.initDOM()}initDOM(){this.overlay=document.createElement("div"),this.overlay.className="control-center-modal",this.overlay.style.display="none",this.overlay.innerHTML=`
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
    `,this.container.appendChild(this.overlay),this.setupListeners()}setupListeners(){this.overlay.addEventListener("click",d=>{(d.target===this.overlay||d.target.closest(".preferences-close"))&&this.close()}),window.addEventListener("keydown",d=>{d.key==="Escape"&&this.isOpen&&this.close()});const e=this.overlay.querySelector("#ctrl-toggle-motion"),t=this.overlay.querySelector("#ctrl-toggle-3d"),n=this.overlay.querySelector("#ctrl-toggle-sound");e.addEventListener("click",()=>{const d=!this.isMotionReduced();document.body.dataset.motionPreference=d?"reduced":"standard",document.body.dataset.reducedMotion=String(d),this.updatePreference(e,"#ctrl-motion-state",d?"Reduced":"Standard",d)}),t.addEventListener("click",()=>{const d=!this.scenePreferences.isEnabled(),b=this.overlay.querySelector("#ctrl-3d-state");if(!d){this.scenePreferences.setEnabled(!1),this.updatePreference(t,"#ctrl-3d-state","Off",!1);return}t.disabled=!0,b.textContent="Loading…",this.scenePreferences.setEnabled(!0).then(()=>{t.disabled=!1,this.updatePreference(t,"#ctrl-3d-state","On",!0)}).catch(h=>{t.disabled=!1,this.updatePreference(t,"#ctrl-3d-state","Unavailable",!1),b.title=h instanceof Error?h.message:String(h)})}),n.addEventListener("click",()=>{const d=Q.toggleSound();this.updatePreference(n,"#ctrl-sound-state",d?"On":"Off",d)}),this.overlay.querySelector(".preferences-close").addEventListener("click",()=>this.close());const i=this.overlay.querySelector("#spotlight-input"),r=this.overlay.querySelector("#spotlight-results");i.addEventListener("input",()=>{const d=i.value.trim().toLowerCase();if(!d){r.style.display="none",r.replaceChildren();return}const b=Ns.filter(h=>`${h.name} ${h.desc} ${h.keywords||""}`.toLowerCase().includes(d));r.innerHTML=b.length?b.map(h=>`
          <button class="spotlight-item" type="button" data-app="${h.app}">
            <span class="spotlight-title">${h.name}</span>
            <span class="spotlight-desc">${h.desc}</span>
            <span aria-hidden="true">↗</span>
          </button>`).join(""):'<p class="spotlight-empty">No matching pages.</p>',r.style.display="flex",r.querySelectorAll("[data-app]").forEach(h=>{h.addEventListener("click",()=>{this.close(),window.openAppByName&&window.openAppByName(h.dataset.app,!0,!0)})})})}updatePreference(e,t,n,i){e.setAttribute("aria-pressed",String(i)),this.overlay.querySelector(t).textContent=n}syncPreferences(){const e=this.isMotionReduced(),t=this.scenePreferences.isEnabled();this.updatePreference(this.overlay.querySelector("#ctrl-toggle-motion"),"#ctrl-motion-state",e?"Reduced":"Standard",e),this.updatePreference(this.overlay.querySelector("#ctrl-toggle-3d"),"#ctrl-3d-state",t?"On":"Off",t),this.updatePreference(this.overlay.querySelector("#ctrl-toggle-sound"),"#ctrl-sound-state",Q.enabled?"On":"Off",Q.enabled)}isMotionReduced(){return document.body.dataset.reducedMotion==="true"||document.body.dataset.motionPreference!=="standard"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches}toggle(){this.isOpen?this.close():this.open()}open(){this.isOpen=!0,this.syncPreferences(),this.overlay.style.display="flex";const e=this.overlay.querySelector("#spotlight-input");setTimeout(()=>e.focus(),50)}close(){this.isOpen=!1,this.overlay.style.display="none"}}function te(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function Ps(){const s=O.personal,e=document.createElement("div");return e.className="career-experience",e.innerHTML=`
    <header class="career-nav">
      <a class="career-wordmark" href="#home" aria-label="Return home">AS<span> / PROFILE</span></a>
      <a class="career-nav-link" href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
    </header>
    <div class="career-scroll">
      <section class="career-opening">
        <div class="career-opening-aside"><span>ENGINEERING<br />PROFILE</span><span>VERIFIED AGAINST<br />SOURCE RESUME</span></div>
        <div class="career-opening-main">
          <p class="career-kicker">ADITYA SHINDE <span>·</span> ${te(s.location)}</p>
          <h1>Building for<br /><em>the real world.</em></h1>
          <p class="career-summary">${te(s.summary)}</p>
          <a class="career-download" href="/Aditya-Shinde-Resume.pdf" download="Aditya-Shinde-Resume.pdf">Download resume <span>.pdf</span> <b>↓</b></a>
        </div>
        <div class="career-opening-mark" aria-hidden="true">AS</div>
      </section>

      <section class="career-section">
        <div class="career-section-heading"><span>01 / EXPERIENCE</span><h2>Where I’ve<br /><em>made a difference.</em></h2></div>
        <div class="career-timeline">
          ${O.experience.map((t,n)=>`
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
          <span>${te(s.university)} · ${te(s.educationPeriod)}</span>
          <h3>${te(s.degree)}</h3>
          <p>CGPA <b>${te(s.cgpa)}</b></p>
        </div>
      </section>
      <footer class="career-footer"><span>GOOD WORK IS A TEAM SPORT.</span><a href="#work" data-portfolio-route="projects">VIEW SELECTED PROJECTS ↗</a></footer>
    </div>
  `,e}function J(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function qs(s,e){return`
    <section class="walk-chapter ${e%2?"walk-chapter-reverse":""}" id="walk-${J(s.id)}" data-walk-chapter="${e}">
      <div class="walk-chapter-index">
        <span>0${e+1}</span>
        <i></i>
        <small>${J(s.period||"SELECTED WORK")}</small>
      </div>
      <article class="walk-chapter-copy">
        <p class="walk-eyebrow">${J(s.subtitle||"Selected project")}</p>
        <h2>${J(s.title)}</h2>
        <p class="walk-overview">${J(s.overview||"")}</p>
        <div class="walk-tech" aria-label="Technologies">
          ${(s.tech||[]).map(t=>`<span>${J(t)}</span>`).join("")}
        </div>
        <button class="walk-study-open" type="button" data-open-study="${e}">
          EXPLORE CASE STUDY <span>↗</span>
        </button>
      </article>
    </section>
  `}function Gs(s,e){const t=s.areas||[],n=s.implementation||[],i=s.highlights||[];return`
    <div class="walk-study-heading">
      <p class="walk-eyebrow">CASE STUDY 0${e+1}</p>
      <span>${J(s.period||"SELECTED WORK")}</span>
    </div>
    <h2>${J(s.title)}</h2>
    <p class="walk-study-subtitle">${J(s.subtitle||"")}</p>
    <div class="walk-study-tags">${(s.tech||[]).map(r=>`<span>${J(r)}</span>`).join("")}</div>
    <section class="walk-study-section">
      <h3>OVERVIEW</h3>
      <p>${J(s.overview||"")}</p>
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
  `}function Hs(s=""){const e=document.createElement("div");e.className="work-experience study-experience at-walk-experience";const t=O.projects;e.innerHTML=`
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
          ${t.map(qs).join("")}
        </div>

        <section class="walk-outro">
          <p class="walk-eyebrow">END OF THE PATH</p>
          <h2>More good work<br>starts with a conversation.</h2>
          <a href="#contact" data-portfolio-route="contact">GET IN TOUCH <span>↗</span></a>
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
  `;const n=e.querySelector(".at-walk-scroll"),i=e.querySelector(".at-walk-shell"),r=e.querySelector(".walk-rna-art"),d=e.querySelector(".at-walk-canvas"),b=e.querySelector(".walk-progress span"),h=[...e.querySelectorAll("[data-walk-chapter]")],x=e.querySelector(".walk-scene-index"),A=e.querySelector(".walk-begin"),R=e.querySelector(".walk-study-drawer"),T=e.querySelector(".walk-study-content"),P=e.querySelector(".walk-study-close"),G=e.querySelector(".walk-study-backdrop");let C=null,$=!1,I=null;const E=(g,u="smooth")=>{const y=h[g];if(!y)return;const H=n.scrollTop+y.getBoundingClientRect().top-n.getBoundingClientRect().top;n.scrollTo({top:H,behavior:u})},D=()=>{var N;const g=n.scrollHeight-n.clientHeight,u=g>0?n.scrollTop/g:0;b.style.transform=`scaleX(${Math.max(0,Math.min(1,u))})`,i.classList.toggle("is-intro",n.scrollTop<n.clientHeight*.55),r.style.transform=`translateY(${-u*7}%)`;const y=n.getBoundingClientRect().top+n.clientHeight*.52,H=h.find(B=>B.getBoundingClientRect().bottom>y);if(H){const B=Number(H.dataset.walkChapter)+1;x.querySelector("span").textContent=String(B).padStart(2,"0"),A.dataset.walkTo=String(B-1),A.querySelector("span").textContent=`PROJECT ${String(B).padStart(2,"0")} / ${String(t.length).padStart(2,"0")}`}else n.scrollTop<((N=h[0])==null?void 0:N.offsetTop)*.65&&(x.querySelector("span").textContent="01",A.dataset.walkTo="0",A.querySelector("span").textContent="DESCEND INTO THE WORK")},v=()=>{const g=R.classList.contains("is-open");R.classList.remove("is-open"),R.setAttribute("aria-hidden","true"),g&&(I!=null&&I.isConnected)&&I.focus()},F=g=>{var y;const u=t[g];u&&(I=e.querySelector(`[data-open-study="${g}"]`),T.innerHTML=Gs(u,g),(y=T.querySelector("h2"))==null||y.setAttribute("id","walk-study-title"),R.classList.add("is-open"),R.setAttribute("aria-hidden","false"),P.focus())},q=g=>{if(g.code==="Escape"&&R.classList.contains("is-open")&&v(),g.code!=="Tab"||!R.classList.contains("is-open"))return;const u=[...R.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(N=>!N.hasAttribute("disabled")&&N.getClientRects().length);if(!u.length)return;const y=u[0],H=u[u.length-1];g.shiftKey&&document.activeElement===y?(g.preventDefault(),H.focus()):!g.shiftKey&&document.activeElement===H&&(g.preventDefault(),y.focus())};n.addEventListener("scroll",D,{passive:!0}),A.addEventListener("click",()=>E(Number(A.dataset.walkTo))),e.querySelectorAll("[data-open-study]").forEach(g=>{g.addEventListener("click",()=>F(Number(g.dataset.openStudy)))}),P.addEventListener("click",v),G.addEventListener("click",v),window.addEventListener("keydown",q),D(),requestAnimationFrame(()=>{$||D()}),requestAnimationFrame(()=>{if(!($||!d.isConnected)){if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){d.hidden=!0,e.classList.add("has-static-scene");return}xt(async()=>{const{WorkWorld:g}=await import("./workWorld-D0qGXKyN.js");return{WorkWorld:g}},__vite__mapDeps([0,1])).then(({WorkWorld:g})=>{$||!d.isConnected||(C=new g(d,n,()=>{const u=n.scrollHeight-n.clientHeight;return u>0?n.scrollTop/u:0}),d._workWorld=C)}).catch(g=>{d.hidden=!0,e.classList.add("has-static-scene"),console.error("Failed to load the 3D work experience:",g)})}});const z=new MutationObserver(()=>{e.isConnected||($=!0,C==null||C.dispose(),n.removeEventListener("scroll",D),window.removeEventListener("keydown",q),z.disconnect())});return z.observe(document.body,{childList:!0,subtree:!0}),e.navigateToProject=g=>{const u=t.findIndex(y=>y.id===g);u>=0&&E(u)},s&&requestAnimationFrame(()=>{const g=t.findIndex(u=>u.id===s);g>=0&&E(g,"instant")}),e}const nt=1e3,it=640,Pe=6,Ks=nt*Pe,Ys=it*Pe;function rs(s,e){return[(s-nt/2)*Pe,(it/2-e)*Pe]}function oe(s,e){return{x:s/Pe+nt/2,y:it/2-e/Pe}}function pe(s,e){return{x:20+s/nt*380,y:30+e/it*240}}function Bs(s,e){const{x:t,y:n}=oe(s,e);return t>=760&&n<260?"signal":n>=410&&t>=500?"highPass":t>=560&&t<790?"fossil":t<250&&n>=440?"motorYard":t<300?"lowlands":t<450&&n<270?"riverlands":t>=390&&t<580?"ashen":"lowlands"}function V(s,e){const[t,n]=rs(s,e);return{x:t,z:n}}function ls(s){return s.map(([e,t])=>rs(e,t))}function se(s,e,t,n,i=!1){return{from:s,to:e,kind:t,mapPoints:n,points:ls(n),closed:i}}const re=[{id:"trailhead",title:"THE TRAILHEAD",...V(130,150),accent:14006141},{id:"crossing",title:"THE RIVER CROSSING",...V(385,185),accent:8566957},{id:"settlement",title:"THE ASHEN SETTLEMENT",...V(470,330),accent:13212264},{id:"bones",title:"THE OLD GIANT",...V(700,300),accent:13938547},{id:"signal",title:"THE LAST SIGNAL",...V(860,110),accent:12690104},{id:"high-pass",title:"THE HIGH PASS",...V(640,500),accent:10399691}],_s=Object.fromEntries(re.map(({id:s,x:e,z:t})=>[s,{x:e,z:t}])),ss=V(200,520),Fs=[{id:"waterfall",title:"Silver Drop Waterfall",type:"water",map:[468,122],...V(468,122)},{id:"old-bridge",title:"Old Timber Bridge",type:"crossing",map:[337,408],...V(337,408)},{id:"mirror-tarn",title:"Mirror Tarn",type:"lake",map:[630,250],...V(630,250)},{id:"watchtower",title:"Watchtower Ruin",type:"ruin",map:[225,395],...V(225,395)},{id:"quarry",title:"High Pass Quarry",type:"quarry",map:[760,500],...V(760,500)},{id:"fire-ring",title:"Ashen Vale Fire Ring",type:"camp",map:[535,340],...V(535,340)}],Ws=[{id:"cairn",title:"The cairn tone",...V(665,272),requiresStopped:!0},{id:"waterfall-cabin",title:"The waterfall cabin",...V(454,126)},{id:"watchtower-radio",title:"The buried radio",...V(222,406),requiresSignals:6},{id:"quarry-signature",title:"The signed quarry stone",...V(780,515)},{id:"bridge-plank",title:"The secret bridge plank",...V(385,185)},{id:"horizon-light",title:"The night light",...V(947,68),requiresSignals:6,nightOnly:!0}],cs=[se(1,2,"pass",[[128,151],[130,150],[200,115],[290,140],[385,185]]),se(2,3,"pass",[[385,185],[425,250],[445,295],[470,330]]),se(3,4,"pass",[[470,330],[540,365],[610,335],[700,300]]),se("settlement-overlook",4,"trail",[[610,335],[610,292],[638,276],[670,288],[700,300]]),se(4,5,"pass",[[700,300],[765,250],[805,170],[860,110]]),se(3,6,"pass",[[470,330],[500,420],[570,470],[640,500]]),se(6,4,"trail",[[640,500],[700,470],[650,435],[705,395],[660,350],[700,300]]),se("settlement-loop","settlement-loop","trail",[[470,330],[464,323],[463,315],[470,312],[478,315],[480,323],[477,330],[478,338],[470,342],[463,338]],!0),se(1,"mw","trail",[[130,150],[105,260],[150,400],[200,520]]),se("mw",3,"trail",[[200,520],[254,450],[310,365],[350,285],[385,185],[430,260],[470,330]]),se("watchtower-loop","watchtower-loop","trail",[[150,400],[185,355],[230,375],[245,410],[210,440]],!0),se("quarry-loop","quarry-loop","trail",[[640,500],[700,530],[760,500],[725,470]],!0)],$e=cs[0].points,Xs={x:$e[0][0],z:$e[0][1]},Js=Math.atan2($e[1][0]-$e[0][0],$e[1][1]-$e[0][1]),ds=[[560,-10],[530,70],[470,120],[420,150],[385,185],[345,235],[330,300],[350,370],[320,440],[300,520],[320,600],[310,660]],Qs=ls(ds),Zs=re[1],ea=re[0],ta=re[2],sa=re[3],aa=re[4],na=re[5],wt="signal-ridge-vehicle-build",as="signal-ridge-signals",ns="signal-ridge-secrets",is="signal-ridge-settlement-topics",kt={paint:"#53645b",alloy:"#c2a878",rideHeight:1,bodyWidth:1,wheelStyle:"all-terrain",bodyKit:"stock",power:1},ee={languages:"PHP, JavaScript, and TypeScript appear across production application work. At K2S2 Digistrat, used Rust to build a data-sync platform for bulk migration and real-time change data capture.",backend:"At V.K. Lalco, developed a centralized Update Management System that records module changes, responsible users, timestamps, and audit trails.",databases:"Built interconnected HR management modules with MySQL and contributed to production features using MySQL and PostgreSQL.",frontend:"Developed and maintained production application features using React, JavaScript, and TypeScript at V.K. Lalco and Volody.",tools:"These tools are listed in the skills inventory. Docker and Git are presented as tools, not as claims of deployment or infrastructure ownership.",architecture:"Implemented role-based access control and audit logging for the UMS, with roles, permissions, and route-level authorization in the OMS."},Us={trailhead:ee.languages,crossing:ee.frontend,settlement:ee.backend,bones:ee.databases,signal:ee.architecture,"high-pass":ee.tools},Lt={trailhead:"The keepers built the first fire where the meadow road met the ridge. Its light was meant to make a stranger feel expected.",crossing:"The river did not stop the old keepers; it taught them to build a safer way across. Every bridge began as a promise to return.",settlement:"When the valley emptied, the lamps stayed lit for one another. The crossroads was never the centre of the land, only its heart.",bones:"The Old Giant kept the valley in its ribs long before the first road was drawn. The keepers left their records in layers of stone.",signal:"At the highest station, one flame could reach every other fire. The last keeper left the door unbarred.","high-pass":"Tools were left at the pass for the next traveller. The mountain was crossed by many hands, not one."},Tt={cairn:{title:"The Cairn",note:"The old keepers stacked these stones to mark the quiet places. Stop beside it and listen for the tone."},"waterfall-cabin":{title:"The Waterfall Cabin",note:"A keeper left a dry notebook behind the falls. Its last page points toward the work beyond the ridge.",link:!0},"watchtower-radio":{title:"Buried Radio",note:"“If you can hear this, the six fires are home again. Carry the signal farther than we could.”"},"quarry-signature":{title:"A Mark in the Stone",note:"A.S. · Someone wanted the next traveller to know they had made it this far."},"bridge-plank":{title:"The Secret Plank",note:"A hollow plank answers with the old truck horn. The keepers had a sense of humour."},"horizon-light":{title:"A Light Beyond the Ridge",note:"After the chain was restored, one small light appeared past the known horizon."}},ue=[{id:"trailhead",title:"The Trailhead",category:"Languages",caption:"NOTICE BOARD · COMPLETE SKILLS REGISTER"},{id:"crossing",title:"The River Crossing",category:"Frontend",caption:"FORD · WATERFALL · TIMBER BRIDGE"},{id:"settlement",title:"The Ashen Settlement",category:"Backend",caption:"VILLAGE LOOP · LANTERN WINDOWS"},{id:"bones",title:"The Old Giant",category:"Databases",caption:"FOSSIL RIDGE · HIGH VISTA"},{id:"signal",title:"The Last Signal",category:"Architecture & systems",caption:"RIDGELINE · FINAL BEACON"},{id:"high-pass",title:"The High Pass",category:"Tools & DevOps",caption:"SWITCHBACKS · UPPER TRAIL"}],at=[...O.skills.backend,"Update Management System"].map((s,e)=>({id:`settlement-house-${e+1}`,title:s})),os=[{id:"trailhead",title:"Trailhead · amber",paint:"#d5b77d"},{id:"crossing",title:"Crossing · river teal",paint:"#82b8ad"},{id:"settlement",title:"Settlement · ember",paint:"#c99a68"},{id:"bones",title:"Old Giant · fossil gold",paint:"#d4af73"},{id:"signal",title:"Last Signal · dusk",paint:"#c1a2b8"},{id:"high-pass",title:"High Pass · alpine",paint:"#9eafcb"}],At=s=>{if(!Number.isFinite(s)||s<=0)return"--:--.-";const e=Math.floor(s/6e4),t=Math.floor(s/1e3)%60,n=Math.floor(s/100)%10;return`${String(e).padStart(2,"0")}:${String(t).padStart(2,"0")}.${n}`},Ne=[{title:"Languages",skills:O.skills.languages,evidence:ee.languages},{title:"Backend",skills:O.skills.backend,evidence:ee.backend},{title:"Frontend",skills:O.skills.frontend,evidence:ee.frontend},{title:"Databases",skills:O.skills.databases,evidence:ee.databases},{title:"Architecture & systems",skills:O.skills.architecture,evidence:ee.architecture},{title:"Tools & DevOps",skills:O.skills.toolsAndDevops,evidence:ee.tools}];function Vs(){var Wt;const s=document.createElement("div");s.className="skills-experience bruno-playground-app",s.classList.add("is-intro"),s.innerHTML=`
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
            ${os.map(({id:a,title:o})=>`<option value="${a}" data-signal-unlock="${a}" disabled>${o}</option>`).join("")}
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
  `;const e=s.querySelector("#skills-register-grid"),t=s.querySelector("#skills-register-tabs");let n=0;const i=a=>{n=(a+Ne.length)%Ne.length,e.querySelectorAll(".skills-register-group").forEach((o,c)=>{o.hidden=c!==n}),t.querySelectorAll('[role="tab"]').forEach((o,c)=>{const p=c===n;o.setAttribute("aria-selected",String(p)),o.tabIndex=p?0:-1}),s.querySelector("#skills-register-count").textContent=`${String(n+1).padStart(2,"0")} / ${String(Ne.length).padStart(2,"0")}`,s.querySelector("#skills-register-progress").style.transform=`scaleX(${(n+1)/Ne.length})`};Ne.forEach((a,o)=>{const c=document.createElement("button");c.type="button",c.id=`skills-register-tab-${o}`,c.setAttribute("role","tab"),c.setAttribute("aria-controls",`skills-register-panel-${o}`),c.setAttribute("aria-selected","false"),c.tabIndex=-1,c.textContent=a.title,c.addEventListener("click",()=>i(o)),c.addEventListener("keydown",L=>{var W,X;L.key==="ArrowRight"?(L.preventDefault(),i(o+1),(W=t.querySelector('[aria-selected="true"]'))==null||W.focus()):L.key==="ArrowLeft"&&(L.preventDefault(),i(o-1),(X=t.querySelector('[aria-selected="true"]'))==null||X.focus())}),t.append(c);const p=document.createElement("section");p.className="skills-register-group",p.id=`skills-register-panel-${o}`,p.setAttribute("role","tabpanel"),p.setAttribute("aria-labelledby",c.id),p.tabIndex=0;const m=document.createElement("h3");m.textContent=a.title;const S=document.createElement("span");S.className="skills-register-chapter",S.textContent=`FIELD LOG ${String(o+1).padStart(2,"0")} · ${a.skills.length} SKILLS`;const k=document.createElement("div");k.className="skills-register-list",a.skills.forEach(L=>{const W=document.createElement("span");W.textContent=L,k.append(W)});const w=document.createElement("details");w.className="skills-register-evidence";const _=document.createElement("summary");_.textContent="FIELD EVIDENCE";const ce=document.createElement("p");ce.textContent=a.evidence,w.append(_,ce);const de=ue[o],f=document.createElement("button");f.type="button",f.className="skills-register-explore",f.textContent=`EXPLORE ${de.title.toUpperCase()} ↗`,f.addEventListener("click",()=>Ce(de.id)),p.append(S,m,k,w,f),e.append(p)}),i(0),s.querySelector("#skills-register-previous").addEventListener("click",()=>{i(n-1)}),s.querySelector("#skills-register-next").addEventListener("click",()=>{i(n+1)});const r=s.querySelector("#bruno-proximity-badge"),d=s.querySelector("#badge-category"),b=s.querySelector("#badge-metric"),h=s.querySelector("#badge-title"),x=s.querySelector("#badge-desc"),A=s.querySelector("#badge-chips"),R=s.querySelector("#badge-evidence"),T=s.querySelector("#badge-relight-button"),P=s.querySelector("#badge-transmit-link"),G=s.querySelector("#badge-board-open"),C=s.querySelector('.badge-work-link[href="#work"]'),$=s.querySelectorAll("#skill-map-panel [data-destination]"),I=s.querySelector("#garage-panel"),E=s.querySelector("#skill-map-panel"),D=s.querySelector("#bruno-controls-banner"),v=s.querySelector("#bruno-btn-map"),F=s.querySelector("#bruno-btn-board"),q=s.querySelector("#bruno-btn-controls"),z=s.querySelector("#bruno-btn-rally"),g=s.querySelector("#skills-arrival"),u=s.querySelector("#bruno-objective-text"),y=s.querySelector("#map-player"),H=s.querySelector("#bruno-minimap"),N=s.querySelector("#bruno-minimap-svg"),B=s.querySelector("#bruno-compass"),U=B.querySelector("span"),qe=s.querySelector("#bruno-compass-label"),ae=s.querySelector("#map-waypoint-status"),we=s.querySelector("#map-location-readout"),ye=s.querySelector("#map-fog-reveal"),Ae=s.querySelector("#map-breadcrumb"),he=s.querySelector("#map-waypoint-route"),ps=s.querySelectorAll("[data-map-layer]"),Z=s.querySelector(".signal-map"),us=s.querySelector("#map-zoom-out"),hs=s.querySelector("#map-zoom-in"),ms=s.querySelector("#map-center-player"),gs=s.querySelector("#map-fit-all"),ot=s.querySelector("#map-route-selected"),rt=s.querySelector("#map-travel-selected"),fs=s.querySelector("#map-clear-waypoint"),Ge=s.querySelector("#bruno-sound-toggle"),Ke=s.querySelector("#bruno-volume"),Ye=s.querySelector("#bruno-time-toggle"),He=s.querySelector("#bruno-motion-toggle"),Be=s.querySelector("#garage-status"),Fe=s.querySelector("#garage-style"),lt=s.querySelector("#garage-signal-livery"),Rt=s.querySelector("#bruno-signal-count"),ct=s.querySelectorAll("[data-build]");let l=null,ve=null,_e=!1,le={...kt},Xe=[],We=[],xe=[],j=new Set,me=null,Se=!1,ge=!1,dt=!1,K=!1,Y=null,ne=window.matchMedia("(prefers-reduced-motion: reduce)").matches,Ue=null,Je=null,fe=1,ke={x:210,y:150},pt=!1,Re=null;const Oe=[],Qe=new Map;s.classList.toggle("is-reduced-motion",ne),He.setAttribute("aria-pressed",String(ne)),He.textContent=`REDUCED MOTION ${ne?"ON":"OFF"}`,Ge.setAttribute("aria-pressed",String(Q.enabled)),Ge.textContent=Q.enabled?"SOUND ON":"SOUND OFF",Ke.value=String(Q.setVolume(Ke.value)),Ge.addEventListener("click",()=>{const a=Q.toggleSound();Ge.setAttribute("aria-pressed",String(a)),Ge.textContent=a?"SOUND ON":"SOUND OFF"}),Ke.addEventListener("input",()=>Q.setVolume(Ke.value)),Ye.addEventListener("click",()=>{const a=Ye.getAttribute("aria-pressed")!=="true";l==null||l.setTimePaused(a),Ye.setAttribute("aria-pressed",String(a)),Ye.textContent=a?"RESUME WORLD CLOCK":"PAUSE WORLD CLOCK"}),He.addEventListener("click",()=>{ne=!ne,s.classList.toggle("is-reduced-motion",ne),l==null||l.setReducedMotion(ne),He.setAttribute("aria-pressed",String(ne)),He.textContent=`REDUCED MOTION ${ne?"ON":"OFF"}`});const Ot=()=>{if(ge=!1,z.setAttribute("aria-pressed","false"),z.querySelector("span").textContent="OPTIONAL RALLY",$.forEach(a=>a.setAttribute("aria-pressed","false")),s.querySelectorAll("[data-map-marker]").forEach(a=>a.classList.remove("is-selected")),Ve(),l!=null&&l.travelToGarage()){_e=!1,u.textContent="MOTOR WORKS · BUILD READY · DRIVE BACK TO THE RIDGE";return}_e=!0,u.textContent="MOTOR WORKS · OPENING THE WORKSHOP"};I.addEventListener("keydown",a=>{if(a.key!=="Tab")return;const o=[...I.querySelectorAll("button, input, select")].filter(m=>!m.disabled&&m.getClientRects().length);if(!o.length)return;const c=o[0],p=o[o.length-1];a.shiftKey&&document.activeElement===c?(a.preventDefault(),p.focus()):!a.shiftKey&&document.activeElement===p&&(a.preventDefault(),c.focus())}),E.addEventListener("keydown",a=>{if(a.key!=="Tab")return;const o=[...E.querySelectorAll("button")].filter(m=>!m.disabled&&m.getClientRects().length);if(!o.length)return;const c=o[0],p=o[o.length-1];a.shiftKey&&document.activeElement===c?(a.preventDefault(),p.focus()):!a.shiftKey&&document.activeElement===p&&(a.preventDefault(),c.focus())});try{const a=window.localStorage.getItem(wt);a&&(le={...kt,...JSON.parse(a)});const o=window.localStorage.getItem(as);if(o){const S=JSON.parse(o);Array.isArray(S)&&(Xe=S.filter(k=>ue.some(w=>w.id===k)))}const c=window.localStorage.getItem(ns);if(c){const S=JSON.parse(c);Array.isArray(S)&&(We=S.filter(k=>Object.hasOwn(Tt,k)))}const p=window.localStorage.getItem(is);if(p){const S=JSON.parse(p);Array.isArray(S)&&(xe=S.filter(k=>at.some(w=>w.id===k)))}const m=window.localStorage.getItem("signal-ridge-garage-style");m&&["field","relay","alpine"].includes(m)&&(Fe.value=m)}catch(a){console.error("Failed to load the saved Signal Ridge settings:",a)}Se=Xe.length===ue.length,j=new Set(Xe),Fe.addEventListener("change",()=>{l==null||l.setGarageStyle(Fe.value);try{window.localStorage.setItem("signal-ridge-garage-style",Fe.value)}catch(a){console.error("Failed to save the Signal Ridge workshop atmosphere:",a),Be.textContent="WORKSHOP STYLE NOT SAVED"}});function Ze(a){ct.forEach(o=>{const c=a[o.dataset.build];c!==void 0&&(o.value=String(c));const p=s.querySelector(`[data-output="${o.dataset.build}"]`);p&&(p.value=`${Math.round(Number(c)*100)}%`)})}function Ct(a){const o=ue.find(w=>w.id===a);if(!o)return;d.textContent=`SIGNAL RIDGE · ${o.category.toUpperCase()} BEACON`,b.textContent=o.caption,h.textContent=o.title,x.textContent="Beacon relit. The ridge brightens as the route opens; the complete inventory stays together on the Trailhead board.",A.replaceChildren();const c=Ne.find(w=>w.title===o.category);c==null||c.skills.slice(0,4).forEach(w=>{const _=document.createElement("span");_.textContent=w,A.append(_)}),R.textContent=Us[a],me=a;const p=j.has(a),m=["trailhead","crossing","settlement","bones"],S=a==="signal"&&!m.every(w=>j.has(w)),k=a==="settlement"&&xe.length<at.length;T.hidden=p,x.textContent=p?`Signal restored. ${Lt[a]}`:S?`The final beacon is sealed until the first four signals are lit. ${m.filter(w=>!j.has(w)).length} remain.`:k?`The settlement signal is sealed. Light all ${at.length} house lamps along the village loop first.`:`Field signal found. ${Lt[a]}`,T.disabled=S||k,G.hidden=!1,C.hidden=!1,P.hidden=!Se,r.hidden=!1,r.classList.add("is-visible"),r.setAttribute("aria-hidden","false")}function bs(a){const o=Tt[a],c=Ws.find(w=>w.id===a);if(!o||!c)return;We.includes(a)||We.push(a);try{window.localStorage.setItem(ns,JSON.stringify(We))}catch(w){console.error("Failed to save discovered Signal Ridge secrets:",w)}const p=oe(c.x,c.z),m=pe(p.x,p.y),S=document.createElementNS("http://www.w3.org/2000/svg","circle");S.setAttribute("class","map-secret-marker"),S.setAttribute("cx",m.x.toFixed(1)),S.setAttribute("cy",m.y.toFixed(1)),S.setAttribute("r","4");const k=document.createElementNS("http://www.w3.org/2000/svg","title");k.textContent=o.title,S.append(k),ht.append(S),je(m.x,m.y,16,`secret-${a}`),d.textContent="HIDDEN FIELD NOTE",b.textContent="SIGNAL RIDGE · SECRET FOUND",h.textContent=o.title,x.textContent=o.note,A.replaceChildren(),R.textContent="",T.hidden=!0,T.disabled=!0,G.hidden=!0,C.hidden=!o.link,P.hidden=!0,me=null,r.hidden=!1,r.classList.add("is-visible"),r.setAttribute("aria-hidden","false"),u.textContent=`SECRET FOUND · ${o.title.toUpperCase()}`}function ys(a){d.textContent="ASHEN SETTLEMENT · BACKEND TOPIC",b.textContent=`HOUSE LAMP ${a.litCount} OF ${a.total} · THE LOOP IS WAKING`,h.textContent=a.title,x.textContent="A field note from the village loop. Light every house lamp to open the settlement signal.",A.replaceChildren();const o=document.createElement("span");o.textContent=a.title,A.append(o),R.textContent=ee.backend,T.hidden=!0,T.disabled=!0,G.hidden=!1,C.hidden=!0,P.hidden=!0,me=null,r.hidden=!1,r.classList.add("is-visible"),r.setAttribute("aria-hidden","false"),u.textContent=`HOUSE LIT · ${a.title.toUpperCase()} · ${a.litCount}/${a.total}`}const Ve=()=>{r.classList.remove("is-visible"),r.hidden=!0,r.setAttribute("aria-hidden","true")},Ce=a=>{var o;a?(ve=a,Y=a,l==null||l.setDestination(a),$.forEach(c=>{c.setAttribute("aria-pressed",String(c.dataset.destination===a))}),s.querySelectorAll("[data-map-marker]").forEach(c=>{c.classList.toggle("is-selected",c.dataset.mapMarker===a)}),u.textContent=`ROUTE SET · ${(o=ue.find(c=>c.id===a))==null?void 0:o.title.toUpperCase()} · FOLLOW THE OLD PASS`):(ve="trailhead",l==null||l.setDestination("trailhead"),u.textContent="TRAILHEAD · THE SKILLS BOARD IS AHEAD · LIGHT THE FIRST SIGNAL"),K=!0,g.hidden=!0,F.setAttribute("aria-expanded","false"),s.classList.remove("is-intro"),H.hidden=!1,Q.startWorldAmbience(),l==null||l.setPaused(!E.hidden||!D.hidden),l==null||l.setReducedMotion(ne),v.focus()},It=(a,o=!1)=>{if(!a.length)return"";const c=a.map(([m,S])=>pe(m,S));let p=`M ${c[0].x.toFixed(1)} ${c[0].y.toFixed(1)}`;for(let m=0;m<c.length-1;m+=1){const S=c[Math.max(0,m-1)],k=c[m],w=c[m+1],_=c[Math.min(c.length-1,m+2)],ce=k.x+(w.x-S.x)/6,de=k.y+(w.y-S.y)/6,f=w.x-(_.x-k.x)/6,L=w.y-(_.y-k.y)/6;p+=` C ${ce.toFixed(1)} ${de.toFixed(1)} ${f.toFixed(1)} ${L.toFixed(1)} ${w.x.toFixed(1)} ${w.y.toFixed(1)}`}return o?`${p} Z`:p},et=()=>{const a=420/fe,o=300/fe,c=Math.max(a/2,Math.min(420-a/2,ke.x)),p=Math.max(o/2,Math.min(300-o/2,ke.y));ke={x:c,y:p},Z.setAttribute("viewBox",`${(c-a/2).toFixed(2)} ${(p-o/2).toFixed(2)} ${a.toFixed(2)} ${o.toFixed(2)}`)},ut=a=>{fe=Math.max(1,Math.min(4,fe+a)),et()},Mt=s.querySelector("#map-road-layer"),Dt=(a,o,c,p=!1,m=null,S=null)=>{const k=document.createElementNS("http://www.w3.org/2000/svg","path");k.setAttribute("d",It(o,p)),k.setAttribute("class",c),m!==null&&S!==null&&(k.dataset.roadFrom=String(m),k.dataset.roadTo=String(S)),a.append(k)};cs.forEach(({mapPoints:a,kind:o,closed:c,from:p,to:m})=>{o==="pass"&&Dt(Mt,a,"map-road-shoulder",c,p,m),Dt(Mt,a,o==="trail"?"map-road-trail":"map-road",c,p,m)}),s.querySelector(".map-river").setAttribute("d",It(ds));const ht=s.querySelector("#map-landmark-layer");Fs.forEach(a=>{const o=oe(a.x,a.z),c=pe(o.x,o.y),p=document.createElementNS("http://www.w3.org/2000/svg","circle");p.setAttribute("class",`map-landmark map-landmark-${a.type}`),p.setAttribute("cx",c.x.toFixed(1)),p.setAttribute("cy",c.y.toFixed(1)),p.setAttribute("r","3"),p.dataset.landmark=a.id;const m=document.createElementNS("http://www.w3.org/2000/svg","title");m.textContent=a.title,p.append(m),ht.append(p)});const Nt=Array.from(Z.childNodes).filter(a=>a.nodeType!==Node.ELEMENT_NODE||!a.matches(".map-fog-overlay, defs")).map(a=>a.cloneNode(!0));Nt.forEach(a=>{a.nodeType===Node.ELEMENT_NODE&&(a.querySelectorAll("[id]").forEach(o=>o.removeAttribute("id")),a.hasAttribute("id")&&a.removeAttribute("id"))}),N.classList.add("signal-map"),N.replaceChildren(...Nt);const mt=N.querySelector(".map-player");re.forEach(({id:a,x:o,z:c})=>{const p=oe(o,c),m=pe(p.x,p.y),S=s.querySelector(`[data-map-marker="${a}"]`);S.setAttribute("cx",m.x.toFixed(1)),S.setAttribute("cy",m.y.toFixed(1))});const $t=oe(ss.x,ss.z),Pt=pe($t.x,$t.y),qt=s.querySelector(".map-garage-marker");qt.setAttribute("cx",Pt.x.toFixed(1)),qt.setAttribute("cy",Pt.y.toFixed(1));const je=(a,o,c,p)=>{if(!ye||Qe.has(p))return;const m=document.createElementNS("http://www.w3.org/2000/svg","circle");m.setAttribute("cx",a.toFixed(1)),m.setAttribute("cy",o.toFixed(1)),m.setAttribute("r",c.toFixed(1)),ye.append(m),Qe.set(p,m)};re.forEach(({id:a,x:o,z:c})=>{if(!j.has(a))return;const p=oe(o,c),m=pe(p.x,p.y);je(m.x,m.y,38,`signal-${a}`)});const Gt=["trailhead","crossing","settlement","bones","signal","high-pass"],Ht=()=>{[Z,N].forEach(a=>a.querySelectorAll("[data-road-from]").forEach(o=>{const c=Gt[Number(o.dataset.roadFrom)-1],p=Gt[Number(o.dataset.roadTo)-1];o.classList.toggle("is-lit",!!(c&&p&&j.has(c)&&j.has(p)))})),re.forEach(({id:a,x:o,z:c})=>{if([s.querySelector(`[data-map-marker="${a}"]`),N.querySelector(`[data-map-marker="${a}"]`)].forEach(S=>S==null?void 0:S.classList.toggle("is-lit",j.has(a))),!j.has(a))return;const p=oe(o,c),m=pe(p.x,p.y);je(m.x,m.y,38,`signal-${a}`)})};Ht();const vs=(a,o=0,c=0)=>{if(!a||!y)return;Je={x:a.x,z:a.z};const p=oe(a.x,a.z),m=pe(p.x,p.y),S=`translate(${m.x.toFixed(1)} ${m.y.toFixed(1)}) rotate(${(o*180/Math.PI).toFixed(1)})`;if(y.setAttribute("transform",S),mt==null||mt.setAttribute("transform",S),je(m.x,m.y,12,"player"),!Ue||Math.hypot(a.x-Ue.x,a.z-Ue.z)>45){Ue={x:a.x,z:a.z},Oe.push({x:m.x,y:m.y}),Oe.length>180&&Oe.shift();const k=Oe.map((w,_)=>`${_?"L":"M"} ${w.x.toFixed(1)} ${w.y.toFixed(1)}`).join(" ");Ae==null||Ae.setAttribute("d",k),je(m.x,m.y,3,`trail-${Oe.length}`)}if(Y){const k=re.find(w=>w.id===Y);if(k){const w=oe(k.x,k.z),_=pe(w.x,w.y);he==null||he.setAttribute("d",`M ${m.x.toFixed(1)} ${m.y.toFixed(1)} L ${_.x.toFixed(1)} ${_.y.toFixed(1)}`);const ce=k.x-a.x,de=k.z-a.z,f=Math.atan2(ce,de)-o;U.style.transform=`rotate(${(f*180/Math.PI).toFixed(1)}deg)`,qe.textContent=`${k.title} · ${Math.round(Math.hypot(ce,de))} M`,B.hidden=!1}}else he==null||he.removeAttribute("d"),B.hidden=!0;we&&(we.textContent=`FIELD COORDINATES ${Math.round(p.x)}, ${Math.round(p.y)} · ELEVATION ${Math.round(c)} M`)},Le=(a=!0)=>{E.hidden=!0,v.setAttribute("aria-expanded","false"),l==null||l.setPaused(!K||!D.hidden||!g.hidden),a&&v.focus()},tt=()=>{D.hidden=!0,q.setAttribute("aria-expanded","false"),K&&(g.hidden=!0,F.setAttribute("aria-expanded","false")),E.hidden=!1,v.setAttribute("aria-expanded","true"),l==null||l.setPaused(!0),s.querySelector("#skill-map-close").focus()};$.forEach(a=>{a.addEventListener("click",()=>{const o=a.dataset.destination,c=ue.find(p=>p.id===o);c&&(Y=o,ot.disabled=!1,rt.disabled=!1,$.forEach(p=>p.setAttribute("aria-pressed",String(p===a))),s.querySelectorAll("[data-map-marker]").forEach(p=>{p.classList.toggle("is-selected",p.dataset.mapMarker===o)}),ae.textContent=`${c.title.toUpperCase()} · ${j.has(o)?"SIGNAL LIT":"SIGNAL DARK"} · SELECT FOLLOW ROUTE OR FAST TRAVEL`)})}),ot.addEventListener("click",()=>{var a;Y&&(ve=Y,l==null||l.setDestination(Y),K||Ce(Y),ge=!1,z.setAttribute("aria-pressed","false"),z.querySelector("span").textContent="OPTIONAL RALLY",u.textContent=`WAYPOINT SET · FOLLOW THE ROAD TO ${(a=ue.find(o=>o.id===Y))==null?void 0:a.title.toUpperCase()}`,Le())}),rt.addEventListener("click",()=>{if(!Y)return;if(K||Ce(Y),!(l!=null&&l.travelToDestination(Y))){ae.textContent="FAST TRAVEL IS UNAVAILABLE RIGHT NOW";return}ve=Y,Oe.splice(0),Ue=null,Ae==null||Ae.removeAttribute("d");for(const[o,c]of Qe)o.startsWith("trail-")&&(c.remove(),Qe.delete(o));const a=ue.find(o=>o.id===Y);u.textContent=j.has(Y)?`ARRIVED AT ${a.title.toUpperCase()} · SIGNAL RESTORED`:`ARRIVED AT ${a.title.toUpperCase()} · THE SIGNAL IS STILL DARK`,s.classList.add("is-fast-travelling"),window.setTimeout(()=>s.classList.remove("is-fast-travelling"),520),Le()}),fs.addEventListener("click",()=>{Y=null,ve=null,l==null||l.clearDestination(),$.forEach(a=>a.setAttribute("aria-pressed","false")),s.querySelectorAll("[data-map-marker]").forEach(a=>a.classList.remove("is-selected")),ae.textContent="WAYPOINT CLEARED",ot.disabled=!0,rt.disabled=!0,B.hidden=!0,he==null||he.removeAttribute("d")}),ps.forEach(a=>{a.addEventListener("click",()=>{const o=a.getAttribute("aria-pressed")!=="true";a.setAttribute("aria-pressed",String(o));const c=a.dataset.mapLayer;c==="roads"?s.querySelector("#map-road-layer").classList.toggle("is-hidden",!o):c==="river"?s.querySelector(".map-river").classList.toggle("is-hidden",!o):c==="landmarks"?ht.classList.toggle("is-hidden",!o):c==="fog"&&s.querySelector(".map-fog-overlay").classList.toggle("is-hidden",!o)})}),hs.addEventListener("click",()=>ut(.5)),us.addEventListener("click",()=>ut(-.5)),gs.addEventListener("click",()=>{fe=1,ke={x:210,y:150},et()}),ms.addEventListener("click",()=>{if(!Je){ae.textContent="START THE JOURNEY TO TRACK YOUR POSITION";return}fe=Math.max(fe,1.6);const a=oe(Je.x,Je.z);ke=pe(a.x,a.y),et()}),Z.addEventListener("pointerdown",a=>{a.button===0&&(pt=!0,Re={x:a.clientX,y:a.clientY},Z.setPointerCapture(a.pointerId))}),Z.addEventListener("pointermove",a=>{if(!pt||!Re)return;const o=Z.getBoundingClientRect();ke.x-=(a.clientX-Re.x)*(420/o.width)/fe,ke.y-=(a.clientY-Re.y)*(300/o.height)/fe,Re={x:a.clientX,y:a.clientY},et()});const Bt=a=>{pt=!1,Re=null,Z.hasPointerCapture(a.pointerId)&&Z.releasePointerCapture(a.pointerId)};Z.addEventListener("pointerup",Bt),Z.addEventListener("pointercancel",Bt),Z.addEventListener("wheel",a=>{a.preventDefault(),ut(a.deltaY<0?.25:-.25)},{passive:!1});const Ft=()=>{var a;!K||!g.hidden||(Ve(),E.hidden=!0,v.setAttribute("aria-expanded","false"),D.hidden=!0,q.setAttribute("aria-expanded","false"),g.hidden=!1,F.setAttribute("aria-expanded","true"),l==null||l.setPaused(!0),(a=t.querySelector('[aria-selected="true"]'))==null||a.focus())};F.addEventListener("click",()=>{if(K){if(g.hidden){Ft();return}g.hidden=!0,F.setAttribute("aria-expanded","false"),l==null||l.setPaused(!D.hidden)}}),v.addEventListener("click",()=>{E.hidden?tt():Le()}),H.addEventListener("click",tt),(Wt=s.querySelector("#fallback-map-open"))==null||Wt.addEventListener("click",tt),s.querySelector("#skill-map-close").addEventListener("click",Le),s.querySelector("#discovery-close").addEventListener("click",Ve),s.querySelector("#badge-board-open").addEventListener("click",()=>{Ve(),g.hidden&&F.click()}),T.addEventListener("click",()=>{if(me&&!(l!=null&&l.relightBeacon(me))){const a=me==="signal"&&!["trailhead","crossing","settlement","bones"].every(o=>j.has(o));x.textContent=a?"The Last Signal needs the first four fires restored. Follow the old roads back to the dark beacons.":"Move closer to the field beacon to relight it.",u.textContent=a?"THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES":"MOVE CLOSER TO THE FIELD BEACON TO RELIGHT IT"}}),q.addEventListener("click",()=>{const a=D.hidden;E.hidden=!0,v.setAttribute("aria-expanded","false"),K&&(g.hidden=!0,F.setAttribute("aria-expanded","false")),D.hidden=!a,q.setAttribute("aria-expanded",String(a)),l==null||l.setPaused(a||!K||!E.hidden||!g.hidden),a&&s.querySelector("#bruno-controls-close").focus()}),s.querySelector("#bruno-controls-close").addEventListener("click",()=>{D.hidden=!0,q.setAttribute("aria-expanded","false"),l==null||l.setPaused(!K||!E.hidden||!g.hidden),q.focus()}),s.querySelector("#skills-start").addEventListener("click",()=>Ce()),z.addEventListener("click",()=>{ge=!ge,ge?(K||Ce(),ve=null,Ve(),$.forEach(a=>a.setAttribute("aria-pressed","false")),s.querySelectorAll("[data-map-marker]").forEach(a=>a.classList.remove("is-selected")),l?l.startRally():dt=!0,u.textContent="RALLY STARTED · FIND THE NEXT GOLD GATE"):(l==null||l.stopRally(),u.textContent="FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD"),z.setAttribute("aria-pressed",String(ge)),z.querySelector("span").textContent=ge?"END RALLY":"OPTIONAL RALLY"}),s.querySelector("#map-garage").addEventListener("click",()=>{K||Ce(),Le(!1),Ot()});const gt=a=>{if(!(a.target instanceof HTMLElement&&(a.target.isContentEditable||["INPUT","TEXTAREA","SELECT"].includes(a.target.tagName)))){if(a.code==="Escape"){E.hidden?!g.hidden&&K?(g.hidden=!0,F.setAttribute("aria-expanded","false"),l==null||l.setPaused(!D.hidden),F.focus()):D.hidden||(D.hidden=!0,q.setAttribute("aria-expanded","false"),l==null||l.setPaused(!K||!E.hidden||!g.hidden),q.focus()):Le();return}a.code==="KeyM"&&!a.repeat&&I.hidden&&(a.preventDefault(),E.hidden?tt():Le())}};window.addEventListener("keydown",gt);const Ss=()=>{const a=s.querySelector("#bruno-canvas");a&&(a.hidden=!0),s.querySelector("#bruno-scene-fallback").hidden=!1,s.classList.add("is-intro"),g.hidden=!1,s.querySelector("#skills-start").hidden=!0};return window.setTimeout(()=>{const a=s.querySelector("#bruno-canvas");if(!a)return;xt(async()=>{const{SkillWorld:c}=await import("./skillWorld-DaNO5W1B.js");return{SkillWorld:c}},__vite__mapDeps([2,1])).then(({SkillWorld:c})=>{var S,k,w,_,ce,de;if(l=new c(a,f=>Ct(f),({speed:f,pitch:L,roll:W,checkpoint:X,totalCheckpoints:Ee,complete:Es,checkpointDistance:ws,checkpointDirection:ks,destinationId:Ut,destinationDistance:st,destinationDirection:Vt,rallyActive:Ie,rallyElapsedMs:jt,rallyBestMs:Ls,nearbyBeaconId:ze,nearbySecretId:zt,nearbySettlementTopic:Kt,nearSkillsBoard:Ts,settlementTopicCount:Yt,settlementTopicTotal:_t,lowRange:ft,offRoad:As,autoDriving:xs,position:Me,heading:Rs,elevation:Xt,worldHour:bt})=>{var Qt,Zt;const Jt=s.querySelector("#bruno-speed-value"),yt=s.querySelector("#bruno-gear-value");Jt&&(Jt.textContent=String(f)),yt&&(yt.textContent=ft?"L":"H",yt.setAttribute("aria-label",ft?"Low range":"High range"));const vt=s.querySelector("#incline-pitch-val"),St=s.querySelector("#incline-roll-val");if(vt&&typeof L=="number"&&(vt.textContent=`${L>=0?"+":""}${L}°`,vt.className="incline-num "+(Math.abs(L)>30?"is-danger":Math.abs(L)>20?"is-warn":"is-ok")),St&&typeof W=="number"&&(St.textContent=`${W>=0?"+":""}${W}°`,St.className="incline-num "+(Math.abs(W)>30?"is-danger":Math.abs(W)>20?"is-warn":"is-ok")),s.classList.toggle("is-driving",f>0),s.classList.toggle("is-off-road",!!As),s.classList.toggle("is-auto-driving",!!xs),s.dataset.gear=ft?"L":"H",vs(Me,Rs,Xt),Me){const De=Bs(Me.x,Me.z);Q.setWorldRegion(De,f/3.6);const Et={lowlands:"LOWLANDS",riverlands:"RIVERLANDS",ashen:"ASHEN VALE",fossil:"FOSSIL RIDGE",signal:"SIGNAL RANGE",highPass:"HIGH PASS",motorYard:"MOTOR YARD"};if(we){const ie=oe(Me.x,Me.z);we.textContent=`${Et[De]} · MAP ${Math.round(ie.x)}, ${Math.round(ie.y)} · ${Math.round(Xt??0)} M`}if(Number.isFinite(bt)){const ie=bt>=20||bt<6?"night":"day";Z.dataset.timePhase=ie,N.dataset.timePhase=ie}}if(Number.isFinite(X)&&Number.isFinite(Ee)){const De=ue.find(ie=>ie.id===Ut),Et=Se?"ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN":zt?`HIDDEN PLACE · STOP AND PRESS E · ${(Qt=Tt[zt])==null?void 0:Qt.title.toUpperCase()}`:Kt?`ASHEN SETTLEMENT · STOP AND PRESS E · ${Kt.title.toUpperCase()}`:Ts?f>8?"TRAILHEAD BOARD · STOP THE CAR TO BROWSE SIX SKILLS":"TRAILHEAD BOARD · PRESS E TO BROWSE SIX SKILLS":ze==="settlement"&&Yt<_t?`SETTLEMENT SIGNAL SEALED · LIGHT THE HOUSE LAMPS ${Yt}/${_t}`:ze&&!j.has(ze)?ze==="signal"&&!["trailhead","crossing","settlement","bones"].every(ie=>j.has(ie))?"THE LAST SIGNAL IS SEALED · RESTORE THE FIRST FOUR FIRES":`SIGNAL READY · PRESS E TO RELIGHT ${(Zt=ue.find(ie=>ie.id===ze))==null?void 0:Zt.title.toUpperCase()}`:De?st<=7?`FIELD NOTE · ${De.title.toUpperCase()}`:`ROUTE TO ${De.title.toUpperCase()} · ${Vt||"FOLLOW"} ${st??""}M`:Ut==="garage"?`MOTOR WORKS · ${st<=12?"ENTERING GARAGE":`${Vt||"FIND"} ${st??""}M`}`:Ie?Es?`RALLY COMPLETE · ${At(jt)} · BEST ${At(Ls)}`:`RALLY · ${Math.min(X,Ee)}/${Ee} · ${At(jt)} · ${ks||"FIND"} ${ws??""}M`:"FREE ROAM · OPEN THE MAP OR FOLLOW A ROAD";u.textContent=Et}typeof Ie=="boolean"&&ge!==Ie&&(ge=Ie,z.setAttribute("aria-pressed",String(Ie)),z.querySelector("span").textContent=Ie?"END RALLY":"OPTIONAL RALLY")},(f,L)=>{var W;I.hidden=!f,H.hidden=f||!K,Ze(L),(W=s.querySelector(f?"#garage-close":"#bruno-btn-garage"))==null||W.focus()},(f,L)=>{const W=Se;j=new Set(f),Se=f.length===L,lt.querySelectorAll("[data-signal-unlock]").forEach(X=>{X.disabled=!j.has(X.dataset.signalUnlock)}),Ht(),Rt&&(Rt.textContent=String(f.length)),me&&j.has(me)&&(T.hidden=!0,x.textContent=`Signal restored. ${Lt[me]}`,P.hidden=!Se);try{window.localStorage.setItem(as,JSON.stringify(f))}catch(X){console.error("Failed to save Signal Ridge beacon progress:",X)}Se&&(u.textContent="ALL SIX SIGNALS LIT · THE RIDGE IS TRANSMITTING · CONTACT IS OPEN"),Se&&!W&&Ct("signal")},Xe,bs,We,f=>{if(!xe.includes(f.id)){xe.push(f.id);try{window.localStorage.setItem(is,JSON.stringify(xe))}catch(L){console.error("Failed to save Ashen Settlement house progress:",L)}}ys(f)},at,xe,Ft),a._world=l,l.setGarageStyle(Fe.value),l.setReducedMotion(ne),!s.isConnected){l.dispose(),window.removeEventListener("keydown",gt),o.disconnect();return}le=l.setVehicleBuild(le),Ze(le),l.setPaused(!K||!E.hidden||!D.hidden||!g.hidden),ve&&l.setDestination(ve),_e&&(_e=!1,l.travelToGarage()),dt&&(l.startRally(),dt=!1),(S=s.querySelector("#bruno-btn-horn"))==null||S.addEventListener("click",()=>{l.honk()}),(k=s.querySelector("#bruno-btn-reset"))==null||k.addEventListener("click",()=>{l.resetVehicle()}),(w=s.querySelector("#bruno-btn-garage"))==null||w.addEventListener("click",Ot),(_=s.querySelector("#garage-close"))==null||_.addEventListener("click",()=>l.exitGarage()),(ce=s.querySelector("#garage-drive"))==null||ce.addEventListener("click",()=>l.exitGarage());const p=()=>{const f={...l.getVehicleBuild()};ct.forEach(L=>{f[L.dataset.build]=L.type==="range"?Number(L.value):L.value}),le=l.setVehicleBuild(f),Ze(le);try{window.localStorage.setItem(wt,JSON.stringify(le)),Be.textContent="BUILD SAVED LOCALLY"}catch(L){Be.textContent="BUILD NOT SAVED",console.error("Failed to save the Signal Ridge vehicle build:",L)}};ct.forEach(f=>f.addEventListener("input",p)),lt.addEventListener("change",()=>{const f=os.find(({id:W})=>W===lt.value);if(!f||!j.has(f.id))return;const L=s.querySelector('[data-build="paint"]');L.value=f.paint,L.dispatchEvent(new Event("input",{bubbles:!0}))}),(de=s.querySelector("#garage-reset"))==null||de.addEventListener("click",()=>{le=l.setVehicleBuild(kt),Ze(le);try{window.localStorage.setItem(wt,JSON.stringify(le)),Be.textContent="STOCK BUILD RESTORED"}catch(f){Be.textContent="BUILD NOT SAVED",console.error("Failed to save the restored Signal Ridge vehicle build:",f)}}),s.querySelectorAll("[data-key]").forEach(f=>{const L=f.dataset.key,W=Ee=>{Ee.preventDefault(),f.setPointerCapture&&f.setPointerCapture(Ee.pointerId),l!=null&&l.keys&&L in l.keys&&(l.keys[L]=!0),l!=null&&l.carBody&&l.carBody.wakeUp()},X=Ee=>{Ee.preventDefault(),l!=null&&l.keys&&L in l.keys&&(l.keys[L]=!1)};f.addEventListener("pointerdown",W),f.addEventListener("pointerup",X),f.addEventListener("pointerleave",X),f.addEventListener("pointercancel",X),f.addEventListener("lostpointercapture",X)})}).catch(c=>{Ss(),console.error("Failed to load SkillWorld engine:",c)});const o=new MutationObserver(()=>{var c;s.isConnected||((c=a._world)==null||c.dispose(),window.removeEventListener("keydown",gt),o.disconnect())});o.observe(document.body,{childList:!0,subtree:!0})},0),s}function be(s){return String(s).replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}function js(){const s=O.personal,e=document.createElement("div");return e.className="contact-experience",e.innerHTML=`
    <header class="contact-nav">
      <a class="contact-wordmark" href="#home" aria-label="Return home">AS<span> / CONTACT</span></a>
      <span class="contact-nav-note">ADITYA SHINDE · ${be(s.location.split(",")[0])}</span>
      <a href="#work" data-portfolio-route="projects" class="contact-nav-link">SEE MY WORK ↗</a>
    </header>
    <div class="contact-scroll">
      <section class="contact-opening">
        <div class="contact-opening-copy">
          <p class="contact-kicker">FOR GOOD QUESTIONS & GOOD WORK</p>
          <h1>Have something<br />worth <em>building?</em></h1>
          <p class="contact-lede">I’m a backend and full-stack software engineer working across applications, APIs, and data systems. If there’s a role or a problem you think could be a fit, I’d be glad to hear from you.</p>
          <a class="contact-email-cta" href="mailto:${be(s.email)}">Write me an email <span>↗</span></a>
        </div>
        <div class="contact-orbit-art" aria-hidden="true">
          <div class="contact-orbit orbit-a"></div><div class="contact-orbit orbit-b"></div>
          <div class="contact-orbit-core"><span>AS</span><small>OPEN CHANNEL</small></div>
          <span class="contact-orbit-label orbit-label-a">SOFTWARE</span>
          <span class="contact-orbit-label orbit-label-b">SYSTEMS</span>
        </div>
      </section>
      <section class="contact-details">
        <div><span>EMAIL</span><a href="mailto:${be(s.email)}">${be(s.email)} <b>↗</b></a></div>
        <div><span>PHONE</span><a href="tel:${be(s.phone.replace(/[^0-9+]/g,""))}">${be(s.phone)} <b>↗</b></a></div>
        <div><span>LOCATION</span><p>${be(s.location)}</p></div>
        <div><span>ELSEWHERE</span><p><a href="${be(s.githubUrl)}" target="_blank" rel="noreferrer">GitHub ↗</a><a href="${be(s.linkedinUrl)}" target="_blank" rel="noreferrer">LinkedIn ↗</a></p></div>
      </section>
      <footer class="contact-footer"><span>THANK YOU FOR TAKING A LOOK.</span><a href="#resume" data-portfolio-route="resume">A LITTLE MORE ABOUT ME ↗</a></footer>
    </div>
  `,e}function zs(){var b;const s=document.getElementById("home-stage");if(!s)return;const e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=()=>document.body.dataset.reducedMotion==="true"||document.body.dataset.motionPreference!=="standard"&&e.matches,n=s.querySelectorAll(".home-stat-card");let i=0,r=null;const d=()=>{i&&window.cancelAnimationFrame(i),i=0,r=null,s.style.setProperty("--pointer-x","68%"),s.style.setProperty("--pointer-y","50%"),s.style.setProperty("--atmosphere-x","0px"),s.style.setProperty("--atmosphere-y","0px"),n.forEach(h=>{h.style.setProperty("--tilt-x","0deg"),h.style.setProperty("--tilt-y","0deg"),h.style.setProperty("--card-light-x","50%"),h.style.setProperty("--card-light-y","50%")})};document.addEventListener("pointermove",h=>{if(t()||h.pointerType==="touch")return;const x=h.target instanceof Element?h.target:null,A=s.getBoundingClientRect(),R=h.clientX>=A.left&&h.clientX<=A.right&&h.clientY>=A.top&&h.clientY<=A.bottom,T=x==null?void 0:x.closest(".os-top-bar, .desktop-icons-container, .os-dock-container, .os-window, .control-center-modal");if(!R||T){d();return}r={x:h.clientX,y:h.clientY,target:h.target},!i&&(i=window.requestAnimationFrame(()=>{if(i=0,!r)return;const P=r,G=s.getBoundingClientRect(),C=Math.max(0,Math.min(1,(P.x-G.left)/G.width)),$=Math.max(0,Math.min(1,(P.y-G.top)/G.height));s.style.setProperty("--pointer-x",`${(C*100).toFixed(1)}%`),s.style.setProperty("--pointer-y",`${($*100).toFixed(1)}%`),s.style.setProperty("--atmosphere-x",`${((C-.5)*24).toFixed(1)}px`),s.style.setProperty("--atmosphere-y",`${(($-.5)*18).toFixed(1)}px`);const I=P.target.closest(".home-stat-card");if(n.forEach(E=>{E!==I&&(E.style.setProperty("--tilt-x","0deg"),E.style.setProperty("--tilt-y","0deg"),E.style.setProperty("--card-light-x","50%"),E.style.setProperty("--card-light-y","50%"))}),I){const E=I.getBoundingClientRect(),D=Math.max(0,Math.min(1,(P.x-E.left)/E.width)),v=Math.max(0,Math.min(1,(P.y-E.top)/E.height));I.style.setProperty("--tilt-x",`${((D-.5)*4).toFixed(2)}deg`),I.style.setProperty("--tilt-y",`${((.5-v)*4).toFixed(2)}deg`),I.style.setProperty("--card-light-x",`${(D*100).toFixed(1)}%`),I.style.setProperty("--card-light-y",`${(v*100).toFixed(1)}%`)}r=null}))}),window.addEventListener("blur",d),document.addEventListener("visibilitychange",()=>{document.hidden&&d()}),(b=e.addEventListener)==null||b.call(e,"change",h=>{h.matches&&d()}),requestAnimationFrame(()=>s.classList.add("home-motion-ready"))}(function(){const e=document.getElementById("site-loader"),t=document.getElementById("loader-status-text");e&&(t&&(t.textContent="PORTFOLIO READY"),window.addEventListener("DOMContentLoaded",()=>{window.setTimeout(()=>{e.classList.add("hidden"),window.setTimeout(()=>e.remove(),700)},180)},{once:!0}))})();document.addEventListener("DOMContentLoaded",()=>{var E,D,v,F,q,z,g;const s=document.getElementById("os-desktop"),e=document.getElementById("os-dock-container")||document.querySelector(".os-dock-container"),t=document.getElementById("three-canvas-container");zs();const n=new Ms(s,e);let i=null;const r={isEnabled:()=>!!(i&&i.isEnabled),async setEnabled(u){if(!u){i&&i.setEnabled(!1);return}if(i)i.setEnabled(!0);else{const{ThreeBackground:y}=await xt(async()=>{const{ThreeBackground:H}=await import("./threeBackground-B49l8X-E.js");return{ThreeBackground:H}},__vite__mapDeps([3,1]));i=new y(t)}}},d=new $s(s,r),b={terminal:{title:"Portfolio console",iconSvg:Te.terminal,width:860,height:540,isTerminal:!0,createContent:()=>{const u=document.createElement("div");return u.style.height="100%",setTimeout(()=>{new Ds(u,n)},0),u}},resume:{title:"Aditya Shinde — Career profile",iconSvg:Te.resume,width:1240,height:760,createContent:Ps},projects:{title:"Selected projects — Aditya Shinde",iconSvg:Te.projects,width:1320,height:780,createContent:u=>Hs(u)},skills:{title:"Engineering map — Skills in context",iconSvg:Te.skills,width:1240,height:760,createContent:Vs},contact:{title:"Contact — Aditya Shinde",iconSvg:Te.contact,width:1240,height:760,createContent:js}},h={projects:"work",resume:"resume",skills:"skills",contact:"contact"},x=Object.fromEntries(Object.entries(h).map(([u,y])=>[y,u])),A=[["projects","Work"],["skills","Skills"],["resume","Resume"],["contact","Contact"],["terminal","Terminal"]],R=document.getElementById("desktop-app-shortcuts"),T=document.getElementById("dock-app-shortcuts");A.forEach(([u,y])=>{const H=b[u];if(!H)return;const N=document.createElement("button");N.type="button",N.className="desktop-icon-item",N.dataset.launchApp=u,N.setAttribute("aria-label",`Open ${y}`),N.innerHTML=`<span class="icon-svg-wrap">${H.iconSvg}</span><span class="icon-label">${y}</span>`,R.appendChild(N);const B=document.createElement("button");B.type="button",B.className="dock-item",B.dataset.launchApp=u,B.title=`Open ${y}`,B.setAttribute("aria-label",`Open ${y}`),B.innerHTML=`${H.iconSvg}<span class="dock-tooltip">${y}</span>`,T.appendChild(B)});const P=document.getElementById("system-clock"),G=()=>{const u=new Date;P.dateTime=u.toISOString(),P.textContent=new Intl.DateTimeFormat("en-IN",{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(u)};G(),setInterval(G,3e4);function C(u,y=!0,H=!1,N=""){var qe;const B=u.toLowerCase().trim(),U=B==="work"?"projects":B;if(U==="control-center"||U==="settings"){d.toggle();return}if(b[U]){if(H&&Object.keys(h).forEach(ye=>{ye!==U&&n.closeWindow(ye)}),y&&h[U]){const ye=`#${h[U]}`;window.location.hash!==ye&&window.history.pushState(null,"",ye)}const ae=b[U],we=n.windows.get(U);U==="projects"&&N&&we&&((qe=we.element.querySelector(".study-experience"))==null||qe.navigateToProject(N)),n.createWindow({id:U,title:ae.title,iconSvg:ae.iconSvg,content:ae.createContent(N),width:ae.width,height:ae.height,isTerminal:!!ae.isTerminal})}}window.openAppByName=C;function $(u=!0){Object.keys(h).forEach(y=>n.closeWindow(y)),u&&window.location.hash!=="#home"&&window.history.pushState(null,"","#home")}function I(){const u=window.location.hash.slice(1).split("/")[0].toLowerCase();if(!u||u==="home"){$(!1);return}const y=x[u];y&&C(y,!1,!0)}window.addEventListener("hashchange",I),n.onWindowClosed=u=>{const y=h[u];y&&window.location.hash===`#${y}`&&window.history.replaceState(null,"",`${window.location.pathname}${window.location.search}`)},s.addEventListener("click",u=>{const y=u.target.closest("[data-launch-app]");if(y){const B=!!y.closest(".os-dock-container"),U=y.dataset.launchApp;if(B&&n.windows.has(U)){n.windows.get(U).isMinimized?n.restoreWindow(U):n.activeWindow===U?n.minimizeWindow(U):n.focusWindow(U);return}C(y.dataset.launchApp,!0,!1,y.dataset.projectTarget||"");return}const H=u.target.closest('a[href^="#"]');if(!H)return;u.preventDefault();const N=H.dataset.portfolioRoute||H.getAttribute("href").slice(1);N==="home"?$():C(N,!0,!0)}),(E=document.getElementById("top-control-center-btn"))==null||E.addEventListener("click",$),(D=document.getElementById("top-spotlight-trigger"))==null||D.addEventListener("click",()=>d.open()),(v=document.getElementById("top-open-terminal"))==null||v.addEventListener("click",()=>C("terminal")),(F=document.getElementById("top-open-projects"))==null||F.addEventListener("click",()=>C("projects",!0,!0)),(q=document.getElementById("top-open-resume"))==null||q.addEventListener("click",()=>C("resume",!0,!0)),(z=document.getElementById("top-open-skills"))==null||z.addEventListener("click",()=>C("skills",!0,!0)),(g=document.getElementById("top-recruit-btn"))==null||g.addEventListener("click",()=>C("contact",!0,!0)),window.addEventListener("keydown",u=>{(u.metaKey||u.ctrlKey)&&u.key.toLowerCase()==="k"&&(u.preventDefault(),d.toggle())}),I()});export{sa as F,ss as G,na as H,cs as R,aa as S,Js as T,Ws as W,_s as Z,re as a,ea as b,Ks as c,Ys as d,Qs as e,V as f,ta as g,Xs as h,Zs as i,ls as m,O as r,Q as s};
