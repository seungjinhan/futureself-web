import type { ReactNode } from "react";
import type { Platform } from "../lib/types";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Svg({ size = 24, children }: { size?: number; children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {children}
    </svg>
  );
}

export const HomeIcon = () => (
  <Svg>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" {...stroke} />
  </Svg>
);

export const PlayIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <rect x="3" y="5" width="18" height="14" rx="4" {...stroke} />
    <path d="m10.2 9.2 4.6 2.8-4.6 2.8z" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
  </Svg>
);

export const BookIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M12 6.5C10.2 5.2 7.6 4.7 4 5v13c3.6-.3 6.2.2 8 1.5 1.8-1.3 4.4-1.8 8-1.5V5c-3.6-.3-6.2.2-8 1.5zM12 6.5v13" {...stroke} />
  </Svg>
);

export const LinkIcon = ({ size }: { size?: number }) => (
  <Svg size={size}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...stroke} />
  </Svg>
);

export const MoreIcon = () => (
  <Svg>
    <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...stroke} />
    <rect x="13.5" y="3.5" width="7" height="7" rx="2" {...stroke} />
    <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...stroke} />
    <rect x="13.5" y="13.5" width="7" height="7" rx="2" {...stroke} />
  </Svg>
);

export const StarIcon = ({ size = 14, filled = true }: { size?: number; filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <path d="m12 3.2 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

export const CommentIcon = ({ size = 14 }: { size?: number }) => (
  <Svg size={size}>
    <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" {...stroke} />
  </Svg>
);

export const GlobeIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" {...stroke} />
    <path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.5 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.5-3.5-8.5s1-5.9 3.5-8.5z" {...stroke} />
  </Svg>
);

export const PaletteIcon = () => (
  <Svg>
    <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.9-.9 1.9-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.2 0-1 .9-1.9 1.9-1.9h2.2a3.5 3.5 0 0 0 3.5-3.5c0-4-3.8-7.2-8.5-7.2z" {...stroke} />
    <circle cx="7.6" cy="12" r="1.1" fill="currentColor" />
    <circle cx="9.6" cy="8.2" r="1.1" fill="currentColor" />
    <circle cx="14" cy="7.4" r="1.1" fill="currentColor" />
  </Svg>
);

export const LockIcon = () => (
  <Svg>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" {...stroke} />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...stroke} />
  </Svg>
);

export const MailIcon = () => (
  <Svg>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" {...stroke} />
    <path d="m4.5 7 7.5 6 7.5-6" {...stroke} />
  </Svg>
);

export const InfoIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="8.5" {...stroke} />
    <path d="M12 11v5.5M12 7.8v.2" {...stroke} />
  </Svg>
);

export const AdminIcon = () => (
  <Svg>
    <path d="M12 3 5 6v5.2c0 4.3 2.9 8.2 7 9.3 4.1-1.1 7-5 7-9.3V6z" {...stroke} />
    <path d="m9.2 12 2 2 3.6-3.8" {...stroke} />
  </Svg>
);

export const CheckIcon = () => (
  <Svg>
    <path d="M5 12.5 10 17 19 7.5" {...stroke} />
  </Svg>
);

export const PlusIcon = () => (
  <Svg size={20}>
    <path d="M12 5v14M5 12h14" {...stroke} />
  </Svg>
);

export const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PlatformIcon({ platform, size = 24 }: { platform: Platform | ""; size?: number }) {
  if (platform === "instagram")
    return (
      <Svg size={size}>
        <rect x="4" y="4" width="16" height="16" rx="5" {...stroke} />
        <circle cx="12" cy="12" r="3.6" {...stroke} />
        <circle cx="16.8" cy="7.2" r="1" fill="currentColor" />
      </Svg>
    );
  if (platform === "threads")
    return (
      <Svg size={size}>
        <path d="M16.5 11.2c-.4-2.6-2.1-4-4.6-4-2.9 0-4.9 2.2-4.9 5.1 0 3.1 2 5.4 5.2 5.4 2.6 0 4.6-1.5 4.6-3.6 0-1.9-1.6-3-3.9-3-2 0-3.2.9-3.2 2.1 0 1 .9 1.7 2.1 1.7 1.8 0 2.9-1.4 2.9-3.9" {...stroke} />
      </Svg>
    );
  if (platform === "x")
    return (
      <Svg size={size}>
        <path d="M5 4.5h4l10 15h-4zM19 4.5l-5.8 6.6M5 19.5l5.8-6.6" {...stroke} />
      </Svg>
    );
  if (platform === "blog")
    return (
      <Svg size={size}>
        <path d="M5 19h4L19.5 8.5a2.1 2.1 0 0 0-3-3L6 16v3zM14.5 7.5l3 3" {...stroke} />
      </Svg>
    );
  return <LinkIcon size={size} />;
}
