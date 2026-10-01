import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (p: P): P => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const CartIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 4h2.2l2.1 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.76L19.5 8H6.2" />
    <circle cx="9.5" cy="19" r="1.4" />
    <circle cx="16.5" cy="19" r="1.4" />
  </svg>
);
export const UserIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c1.2-3.6 4.2-5.5 8-5.5s6.8 1.9 8 5.5" />
  </svg>
);
export const PhoneIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 4h3l1.6 4-2 1.3a11 11 0 0 0 5.1 5.1l1.3-2 4 1.6v3a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
);
export const WhatsAppIcon = (p: P) => (
  <svg {...base({ fill: "currentColor", stroke: "none", ...p })}>
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2Zm5.8 14c-.25.7-1.45 1.33-2 1.4-.5.07-1.13.1-1.8-.12a13 13 0 0 1-1.6-.6c-2.8-1.2-4.6-4-4.75-4.2-.14-.2-1.13-1.5-1.13-2.85 0-1.36.7-2.02.96-2.3.25-.27.55-.34.73-.34h.52c.17 0 .4-.06.62.48.25.55.85 1.9.92 2.04.07.13.12.3.02.48-.1.2-.14.3-.28.47-.14.16-.3.36-.42.48-.14.14-.28.3-.12.57.16.27.7 1.16 1.5 1.87 1.03.92 1.9 1.2 2.17 1.34.27.13.43.1.6-.07.16-.2.7-.82.88-1.1.18-.27.36-.23.6-.14.25.1 1.57.74 1.84.88.27.13.45.2.5.32.07.1.07.66-.18 1.35Z" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);
export const TruckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M2 6h11v10H2zM13 9h4l3 3v4h-7" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="16.5" cy="17.5" r="1.8" />
  </svg>
);
export const ShieldIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v5.5c0 4.3 2.8 8 7 9.5 4.2-1.5 7-5.2 7-9.5V6l-7-3Z" />
    <path d="m9 12 2.2 2.2L15.5 10" />
  </svg>
);
export const WrenchIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6 12.6 21 3 11.4 11.4 3l1.3 1.3a4 4 0 0 0 2 2Z" />
  </svg>
);
export const SparkIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const SendIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />
  </svg>
);
export const GoogleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden {...p}>
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.48c-.28 1.5-1.13 2.78-2.42 3.63v3.02h3.9c2.28-2.1 3.6-5.2 3.6-8.84z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.9-3.02c-1.08.73-2.46 1.15-4.05 1.15-3.12 0-5.76-2.1-6.7-4.94H1.27v3.1C3.25 21.3 7.3 24 12 24z" />
    <path fill="#FBBC05" d="M5.3 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.27a12 12 0 0 0 0 10.78z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.3 0 3.25 2.7 1.27 6.61l4.03 3.1C6.24 6.86 8.88 4.75 12 4.75z" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

// Category glyphs used by the image placeholders and category cards.
export function CollectionGlyph({ slug, ...p }: P & { slug: string }) {
  switch (slug) {
    case "engine-oils":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M12 3s6 6.4 6 10.5a6 6 0 0 1-12 0C6 9.4 12 3 12 3Z" />
          <path d="M9.5 14a2.6 2.6 0 0 0 2.5 2.4" />
        </svg>
      );
    case "filters":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 4v16M12 4v16M15 4v16" />
        </svg>
      );
    case "batteries":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <rect x="3" y="8" width="18" height="11" rx="2" />
          <path d="M7 8V5.5h3V8M14 8V5.5h3V8M8 13.5h3M9.5 12v3M14 13.5h3" />
        </svg>
      );
    case "tools":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M14.7 6.3a4 4 0 0 0 5 5L21 12.6 12.6 21 3 11.4 11.4 3l1.3 1.3a4 4 0 0 0 2 2Z" />
        </svg>
      );
    case "car-care":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4L12 3ZM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9L18 15Z" />
        </svg>
      );
    case "wiper-blades":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M3 17a9 9 0 0 1 18 0M12 17l6-9" />
          <circle cx="12" cy="17" r="1" />
        </svg>
      );
    case "spark-plugs":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M10 3h4v5h-4zM9 8h6v6H9zM12 14v4M10.5 18h3" />
        </svg>
      );
    case "coolants-fluids":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3V3Z" />
          <path d="M7 13h10" />
        </svg>
      );
    case "motorcycle":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <circle cx="6" cy="16" r="3.2" />
          <circle cx="18" cy="16" r="3.2" />
          <path d="M6 16l4-7h4l4 7M10 9 8.5 6.5H6" />
        </svg>
      );
    case "accessories":
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <path d="M5 16h14l-1.4-5a2 2 0 0 0-1.9-1.5H8.3A2 2 0 0 0 6.4 11L5 16Z" />
          <circle cx="8" cy="17.5" r="1.5" />
          <circle cx="16" cy="17.5" r="1.5" />
        </svg>
      );
    default:
      // car-parts
      return (
        <svg {...base({ strokeWidth: 1.5, ...p })}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </svg>
      );
  }
}
