// High-Definition SVG Icons & Glass Squircle Generators for AdityaOS 3.0 Pro

export const SVG_ICONS = {
  terminal: `
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
  `,

  projects: `
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
  `,

  resume: `
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
  `,

  skills: `
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
  `,

  contact: `
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
  `,

  settings: `
    <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
      <defs>
        <linearGradient id="setGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#setGrad)"/>
      <rect width="62" height="62" x="1" y="1" rx="15" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
      <circle cx="32" cy="32" r="10" stroke="#cbd5e1" stroke-width="3" fill="none"/>
      <path d="M32 14V18M32 46V50M14 32H18M46 32H50M19 19L22 22M42 42L45 45M19 45L22 42M42 22L45 19" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `,

  snapLeft: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  snapRight: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>`,
  reload: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 2v10m-4-6l8 0m-6 6l-3 6h10l-3-6"/></svg>`
};
