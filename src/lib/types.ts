export const ENTRY_TYPES = ["youtube", "book", "sns"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

export const PLATFORMS = ["instagram", "threads", "x", "blog", "etc"] as const;
export type Platform = (typeof PLATFORMS)[number];

export type Sort = "latest" | "rating";

export interface Entry {
  id: string;
  type: EntryType;
  url: string;
  title: string;
  author: string;
  /** 유튜브만 있어요. 책과 SNS는 이미지를 쓰지 않아요. */
  thumbnail: string;
  platform: Platform | "";
  summary?: string;
  rating: number;
  tags: string[];
  createdAt: number;
  commentCount: number;
}

export type CommentStatus = "pending" | "approved" | "rejected";

export interface Comment {
  id: string;
  entryId: string;
  /** `익명 4821`의 네 자리 숫자예요. */
  name: string;
  body: string;
  at: number;
  status?: CommentStatus;
  mine?: boolean;
}

export interface AdminComment extends Comment {
  status: CommentStatus;
  entryTitle: string;
  entryType: EntryType | "";
}

export interface TagCount {
  tag: string;
  count: number;
}

export interface HomeData {
  recent: Record<EntryType, Entry | null>;
  top: Record<EntryType | "all", Entry[]>;
}

export interface EntryDetail {
  entry: Entry;
  comments: Comment[];
}

export interface EntryInput {
  id?: string;
  type: EntryType;
  url: string;
  title: string;
  author: string;
  platform: Platform | "";
  summary: string;
  rating: number;
  tags: string[];
}

export interface LinkPreview {
  url: string;
  title: string;
  author: string;
  thumbnail?: string;
  platform?: Platform;
}

export const MAX_SUMMARY = 2000;
export const MAX_COMMENT = 300;
export const MAX_TAGS = 5;
export const MAX_TAG = 10;

export function isEntryType(value: unknown): value is EntryType {
  return ENTRY_TYPES.includes(value as EntryType);
}

/** 서버의 normalizeTags와 같은 규칙이에요. */
export function normalizeTag(raw: string): string {
  return raw.replace(/\s+/g, "").replace(/#/g, "").replace(/,/g, "").toLowerCase().slice(0, MAX_TAG);
}
