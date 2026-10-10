import type { SVGProps } from "react";

/**
 * RC2.3.13R.3.2.1 — one line family for Culture topic cards.
 * Consistent stroke, rounded caps, token color via currentColor.
 */
type P = SVGProps<SVGSVGElement>;

const base = ({ className, ...props }: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: ["inline-block shrink-0", className].filter(Boolean).join(" "),
  "data-topic-icon-family": "longyu-line",
  ...props,
});

export function TopicIconDaily(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="home">
      <path d="M4 11.2 12 4.5l8 6.7" />
      <path d="M6.5 10.2V19h11v-8.8" />
      <path d="M10 19v-4.2h4V19" />
    </svg>
  );
}

export function TopicIconRelations(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="chat">
      <path d="M5 6.5h10.5a2 2 0 0 1 2 2V13a2 2 0 0 1-2 2H9l-3.2 2.4V15H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" />
      <path d="M14 9.2h5a2 2 0 0 1 2 2V15l-2.2 1.6" />
    </svg>
  );
}

export function TopicIconFood(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="lantern">
      <path d="M8 8h8l-.6 8.2a3.2 3.2 0 0 1-3.2 2.8h-.4a3.2 3.2 0 0 1-3.2-2.8L8 8Z" />
      <path d="M12 4.5V8M9.5 4.5h5" />
      <path d="M10.2 12h3.6" />
    </svg>
  );
}

export function TopicIconStudy(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="book">
      <path d="M5 6.5h6.2A2.3 2.3 0 0 1 13.5 8.8V19a2 2 0 0 0-2.3-1.6H5V6.5Z" />
      <path d="M19 6.5h-6.2A2.3 2.3 0 0 0 10.5 8.8V19a2 2 0 0 1 2.3-1.6H19V6.5Z" />
    </svg>
  );
}

export function TopicIconCity(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="path">
      <path d="M4 19h16" />
      <path d="M6 19V10l3-2v11" />
      <path d="M12 19V7l4-2v14" />
      <path d="M16.5 11.5h2.2" />
    </svg>
  );
}

export function TopicIconHistory(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="library">
      <path d="M6 19V8l6-3 6 3v11" />
      <path d="M6 11h12" />
      <path d="M10 19v-4h4v4" />
    </svg>
  );
}

export function TopicIconModern(p: P) {
  return (
    <svg {...base(p)} data-topic-icon="target">
      <path d="M4 16.5 8 9l3 4 2.2-3L20 16.5" />
      <path d="M4 19h16" />
      <circle cx="17.2" cy="7.2" r="1.3" />
    </svg>
  );
}

const ICONS = {
  home: TopicIconDaily,
  chat: TopicIconRelations,
  lantern: TopicIconFood,
  book: TopicIconStudy,
  path: TopicIconCity,
  library: TopicIconHistory,
  target: TopicIconModern,
} as const;

export type CultureTopicIconKey = keyof typeof ICONS;

export function CultureTopicIcon({ name }: { name?: CultureTopicIconKey }) {
  const Icon = name ? ICONS[name] : TopicIconHistory;
  return <Icon />;
}
