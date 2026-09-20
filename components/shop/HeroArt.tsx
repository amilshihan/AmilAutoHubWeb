// Decorative hero illustration: a stylised sedan on the road with product chips.
export default function HeroArt() {
  return (
    <svg viewBox="0 0 640 340" className="h-auto w-full" role="img" aria-label="Illustration of a car">
      <defs>
        <linearGradient id="hero-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3f4a" />
          <stop offset="1" stopColor="#1d2027" />
        </linearGradient>
        <linearGradient id="hero-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fa7c4" />
          <stop offset="1" stopColor="#465468" />
        </linearGradient>
        <radialGradient id="hero-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffc60b" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffc60b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="330" cy="150" rx="300" ry="140" fill="url(#hero-glow)" />
      <ellipse cx="330" cy="306" rx="270" ry="14" fill="#000" opacity="0.35" />

      {/* body */}
      <path
        d="M52 236c0-22 14-34 40-40l84-18c24-30 62-56 118-56h104c46 0 84 26 112 60l40 10c24 6 34 20 34 40v14c0 10-8 18-18 18H70c-10 0-18-8-18-18v-10Z"
        fill="url(#hero-body)"
        stroke="#4a505c"
        strokeWidth="1.5"
      />
      {/* side stripe */}
      <path d="M70 226h532" stroke="#ffc60b" strokeWidth="5" strokeLinecap="round" />
      {/* windows */}
      <path d="M204 176c20-24 50-44 92-44h50v44H204Z" fill="url(#hero-glass)" opacity="0.92" />
      <path d="M362 132h20c34 0 62 20 82 44H362v-44Z" fill="url(#hero-glass)" opacity="0.92" />
      <path d="M360 132v44" stroke="#22252c" strokeWidth="5" />
      {/* door line + handle */}
      <path d="M362 180v46M240 180l-6 46" stroke="#14161b" strokeWidth="2" opacity="0.6" />
      <rect x="326" y="192" width="24" height="5" rx="2.5" fill="#8b93a1" />
      {/* lights */}
      <path d="M596 214c14 2 22 8 22 18h-30l8-18Z" fill="#fff6d6" />
      <rect x="52" y="214" width="16" height="14" rx="3" fill="#e11d2e" />
      <rect x="586" y="258" width="34" height="8" rx="3" fill="#111318" />

      {/* wheels */}
      {[170, 500].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="262" r="48" fill="#0d0e11" />
          <circle cx={cx} cy="262" r="30" fill="#2b2f37" stroke="#ffc60b" strokeWidth="4" />
          <circle cx={cx} cy="262" r="8" fill="#ffc60b" />
          {[0, 72, 144, 216, 288].map((a) => (
            <line
              key={a}
              x1={cx}
              y1="262"
              x2={cx + 24 * Math.cos((a * Math.PI) / 180)}
              y2={262 + 24 * Math.sin((a * Math.PI) / 180)}
              stroke="#7a828f"
              strokeWidth="3"
            />
          ))}
        </g>
      ))}

      {/* road */}
      <path d="M0 312h640" stroke="#33373f" strokeWidth="2" />
      <path d="M30 326h60M150 326h60M270 326h60M390 326h60M510 326h60" stroke="#ffc60b" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
