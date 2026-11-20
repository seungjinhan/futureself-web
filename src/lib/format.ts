/** 2026.11.05처럼 보여줘요. 한국 시간 기준이에요. */
export function formatDate(ms: number): string {
  const d = new Date(ms + 9 * 3600000);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** 댓글처럼 짧게 11.05 14:20으로 보여줘요. */
export function formatShortTime(ms: number): string {
  const d = new Date(ms + 9 * 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

/** 주소로 SNS 플랫폼을 알아내요. 서버의 detectPlatform과 같은 규칙이에요. */
export function detectPlatform(url: string): "instagram" | "threads" | "x" | "blog" | "etc" {
  const host = (/^https?:\/\/([^/?#]+)/i.exec(url)?.[1] ?? "").toLowerCase();
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)threads\.(net|com)$/.test(host)) return "threads";
  if (/(^|\.)(x|twitter)\.com$/.test(host)) return "x";
  if (/(^|\.)(blog\.naver\.com|tistory\.com|brunch\.co\.kr|medium\.com|velog\.io)$/.test(host)) return "blog";
  return "etc";
}

export function parseVideoId(link: string): string | null {
  const text = link.trim();
  if (/^[\w-]{11}$/.test(text)) return text;
  return /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/.exec(text)?.[1] ?? null;
}
