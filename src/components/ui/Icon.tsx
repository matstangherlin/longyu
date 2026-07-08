// Ícones em linha (stroke), estilo calmo. Sem dependência externa.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (props: P) => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const IconHome = (p: P) => (
  <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h14V9.5" /></svg>
);
export const IconPath = (p: P) => (
  <svg {...base(p)}><circle cx="6" cy="6" r="2.2" /><circle cx="18" cy="18" r="2.2" /><path d="M8 6h6a4 4 0 0 1 0 8H10a4 4 0 0 0 0 8" opacity=".001" /><path d="M8.2 6H14a4 4 0 0 1 0 8h-4a4 4 0 0 0 0 8" /></svg>
);
export const IconSound = (p: P) => (
  <svg {...base(p)}><path d="M4 9v6h4l5 4V5L8 9H4Z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8 8 0 0 1 0 12" /></svg>
);
export const IconHanzi = (p: P) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M12 6v12M7.5 9.5 12 6l4.5 3.5M8 14h8" /></svg>
);
export const IconChat = (p: P) => (
  <svg {...base(p)}><path d="M4 5h16v11H9l-4 3.5V16H4V5Z" /><path d="M8 9h8M8 12h5" /></svg>
);
export const IconBook = (p: P) => (
  <svg {...base(p)}><path d="M12 5C9 3.5 5.5 3.5 4 4.5v14C5.5 17.5 9 17.5 12 19c3-1.5 6.5-1.5 8-.5v-14C18.5 3.5 15 3.5 12 5Z" /><path d="M12 5v14" /></svg>
);
export const IconRefresh = (p: P) => (
  <svg {...base(p)}><path d="M4 11a8 8 0 0 1 13.5-5.3L20 8" /><path d="M20 4v4h-4" /><path d="M20 13a8 8 0 0 1-13.5 5.3L4 16" /><path d="M4 20v-4h4" /></svg>
);
export const IconLibrary = (p: P) => (
  <svg {...base(p)}><path d="M5 4v16M9 4v16" /><rect x="12.5" y="4" width="6.5" height="16" rx="1" transform="rotate(6 15.75 12)" /></svg>
);
export const IconGear = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
);
export const IconShield = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5 19 6v5.5c0 4.3-2.8 7.4-7 9-4.2-1.6-7-4.7-7-9V6l7-2.5Z" /><path d="m9.5 12 1.8 1.8 3.5-4" /></svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)}><path d="M7 5l12 7-12 7V5Z" fill="currentColor" stroke="none" /></svg>
);
export const IconPause = (p: P) => (
  <svg {...base(p)}><path d="M8 5v14M16 5v14" strokeWidth="3" /></svg>
);
export const IconHeadphones = (p: P) => (
  <svg {...base(p)}><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14h3v6H5a1 1 0 0 1-1-1v-5ZM20 14h-3v6h2a1 1 0 0 0 1-1v-5Z" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)}><path d="M5 12.5 10 17l9-10" /></svg>
);
export const IconX = (p: P) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const IconFlame = (p: P) => (
  <svg {...base(p)}><path d="M12 3c1 3-2 4-2 7a2 2 0 1 0 4 0c0 0 2 1 2 4a4 4 0 0 1-8 0c0-4 4-5 4-11Z" /></svg>
);
export const IconChevron = (p: P) => (
  <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconLock = (p: P) => (
  <svg {...base(p)}><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></svg>
);
export const IconSun = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
);
export const IconTarget = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>
);
export const IconStar = (p: P) => (
  <svg {...base(p)}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" /></svg>
);
export const IconTrophy = (p: P) => (
  <svg {...base(p)}><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5.5a2 2 0 0 0 0 4H8" /><path d="M16 6h2.5a2 2 0 0 1 0 4H16" /><path d="M12 12v4" /><path d="M8.5 20h7" /><path d="M10 16h4l1 4H9l1-4Z" /></svg>
);
export const IconMore = (p: P) => (
  <svg {...base(p)}><circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" /></svg>
);
