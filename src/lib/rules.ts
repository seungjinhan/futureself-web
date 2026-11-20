// 기록과 댓글을 저장할 때 쓰는 규칙이에요. 예전 서버(apps-script/Code.gs)와 안드로이드 앱(lib/data/links.dart)과 같은 값이어야 해요.
import { parseVideoId } from "./format";
import { MAX_TAG, MAX_TAGS, type EntryType, type TagCount } from "./types";

export const MAX_TITLE = 200;
export const MAX_AUTHOR = 100;
export const MAX_URL = 500;

/** 앞뒤 공백을 빼고 줄바꿈을 \n으로 맞춰요. */
export function cleanText(value: string, max: number): string {
  return value.replace(/\r\n?/g, "\n").trim().slice(0, max);
}

/** 공백과 #, 쉼표를 빼고 영어는 소문자로, 최대 10자, 중복 없이 5개까지예요. */
export function normalizeTags(input: string[]): string[] {
  const tags: string[] = [];
  for (const raw of input)
    for (const part of raw.split(",")) {
      const tag = part.replace(/\s+/g, "").replace(/#/g, "").toLowerCase().slice(0, MAX_TAG);
      if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) tags.push(tag);
    }
  return tags;
}

export function isHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value);
}

export function hostOf(url: string): string {
  return (/^https?:\/\/([^/?#]+)/i.exec(url)?.[1] ?? "").toLowerCase();
}

export function youtubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** 공유할 때 붙는 추적용 값이에요. 같은 글인지 비교할 때 빼요. */
const TRACKING_PARAM = /^(utm_\w+|igsh|igshid|si|fbclid|gclid|ref|ref_src)$/i;
/** 글 ID가 주소 경로에 있어서 ? 뒤를 모두 버려도 되는 곳이에요. */
const PATH_ID_HOSTS = /(^|\.)(instagram\.com|threads\.(net|com)|x\.com|twitter\.com)$/i;

/**
 * 같은 영상·글인지 비교하는 값이에요. Firestore 기록의 linkKey 필드에 저장하고, 등록할 때 같은 값이 있으면 중복이에요.
 * 호스트는 대소문자를 무시하지만 경로는 그대로 비교해요(인스타그램 글 ID는 대소문자를 구분해요).
 */
export function linkKey(type: EntryType, url: string): string {
  if (type === "youtube") return parseVideoId(url) ?? "";
  const text = url.trim();
  const match = /^https?:\/\/([^/?#]+)([^?#]*)(\?[^#]*)?/i.exec(text);
  if (!match) return text;
  const host = match[1]
    .toLowerCase()
    .replace(/^(www\.|m\.|mobile\.)/, "")
    .replace(/^twitter\.com$/, "x.com");
  const path = match[2].replace(/\/+$/, "");
  const query = PATH_ID_HOSTS.test(host)
    ? ""
    : (match[3] ?? "")
        .slice(1)
        .split("&")
        .filter((part) => part && !TRACKING_PARAM.test(part.split("=")[0]))
        .sort()
        .join("&");
  return host + path + (query ? `?${query}` : "");
}

/** `익명 4821`의 숫자예요. 익명 ID(uid)로 만들고, 같은 사람은 늘 같은 번호예요. 보안 규칙이 네 자리 숫자인지 확인해요. */
export function displayNumber(uid: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < uid.length; i++) hash = Math.imul(hash ^ uid.charCodeAt(i), 0x01000193) >>> 0;
  return String(hash % 10000).padStart(4, "0");
}

/** 많이 쓴 순, 같으면 가나다순이에요. */
export function sortTagCounts(counts: Record<string, number>): TagCount[] {
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0));
}

// ---------- 댓글 제한 ----------

/** 1분에 3개, 24시간에 30개예요. firestore.rules의 isNextWindow와 같은 값이어야 해요. */
export const MINUTE_LIMIT = 3;
export const DAY_LIMIT = 30;
export const MINUTE_MS = 60_000;
export const DAY_MS = 86_400_000;
/** 기기 시계가 서버와 조금 달라도 새 창을 너무 일찍 열지 않게 여유를 둬요. */
const CLOCK_MARGIN_MS = 5_000;

/**
 * throttle 문서에 쓸 다음 값을 정해요. `"new"`는 새 창(서버 시각, 개수 1), 숫자는 늘린 개수예요.
 * 이미 한도까지 썼고 기간이 남았으면 `"limit"`이에요.
 */
export function nextWindow(startMs: number | null, count: number, periodMs: number, limit: number, nowMs: number): "new" | "limit" | number {
  if (startMs === null) return "new";
  const elapsed = nowMs - startMs;
  if (elapsed >= periodMs + CLOCK_MARGIN_MS) return "new";
  if (count < limit) return count + 1;
  if (elapsed < periodMs) return "limit";
  return "new";
}
