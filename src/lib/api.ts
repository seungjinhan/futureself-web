// 데이터는 Firebase(Firestore)에 있어요. 안드로이드 퓨처셀프(lib/data/content_repository.dart, admin_repository.dart)와 같은 방식으로 읽고 써요.
// 권한(관리자만 쓰기, 승인 전 댓글 비공개, 댓글 제한)은 Firestore 보안 규칙이 요청마다 확인해요.
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  FirestoreError,
  getCount,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type Firestore,
  type Query,
  type QueryDocumentSnapshot,
} from "firebase/firestore/lite";
import { adminSide, currentUserId, userId, userSide } from "./firebase";
import { detectPlatform, parseVideoId } from "./format";
import { track } from "./progress";
import {
  cleanText,
  DAY_LIMIT,
  DAY_MS,
  displayNumber,
  hostOf,
  isHttpUrl,
  linkKey,
  MAX_AUTHOR,
  MAX_TITLE,
  MAX_URL,
  MINUTE_LIMIT,
  MINUTE_MS,
  nextWindow,
  normalizeTags,
  sortTagCounts,
  youtubeThumbnail,
  youtubeUrl,
} from "./rules";
import { ENTRY_TYPES, isEntryType, MAX_COMMENT, MAX_SUMMARY, PLATFORMS, type AdminComment, type Comment, type CommentStatus, type Entry, type EntryDetail, type EntryInput, type EntryType, type HomeData, type LinkPreview, type Platform, type Sort, type TagCount } from "./types";

const READ_TIMEOUT_MS = 25000;
const WRITE_TIMEOUT_MS = 30000;
const PAGE_SIZE = 10; // 목록은 스크롤로 10개씩 불러와요(운영자 규칙).
const TOP_RATING = 5; // 대시보드의 별점 높은 기록은 5점만 보여줘요.
const TOP_COUNT = 10;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly detail: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** 다음 페이지를 이어 받을 자리예요. 화면은 들고 있다가 그대로 돌려주기만 해요. */
export type Cursor = QueryDocumentSnapshot<DocumentData>;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ApiError("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** 모든 요청은 track으로 감싸서, 끝날 때까지 화면 맨 위 진행 막대를 보여줘요. */
function read<T>(task: () => Promise<T>): Promise<T> {
  return track(() => withTimeout(task(), READ_TIMEOUT_MS));
}

function write<T>(task: () => Promise<T>): Promise<T> {
  return track(() => withTimeout(task(), WRITE_TIMEOUT_MS));
}

const isDenied = (error: unknown) => error instanceof FirestoreError && error.code === "permission-denied";

const millis = (value: unknown) => (value instanceof Timestamp ? value.toMillis() : 0);

function entryFrom(snapshot: DocumentSnapshot<DocumentData>): Entry {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    type: isEntryType(data.type) ? data.type : "youtube",
    url: String(data.url ?? ""),
    title: String(data.title ?? ""),
    author: String(data.author ?? ""),
    thumbnail: String(data.thumbnail ?? ""),
    platform: PLATFORMS.includes(data.platform as Platform) ? (data.platform as Platform) : "",
    summary: String(data.summary ?? ""),
    rating: Number(data.rating) || 0,
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    createdAt: millis(data.createdAt),
    commentCount: Number(data.commentCount) || 0,
  };
}

function commentFrom(snapshot: DocumentSnapshot<DocumentData>, uid: string | null): Comment {
  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    entryId: String(data.entryId ?? ""),
    name: String(data.name ?? ""),
    body: String(data.body ?? ""),
    at: millis(data.createdAt),
    status: (data.status as CommentStatus) ?? "pending",
    mine: uid !== null && data.user === uid,
  };
}

const entriesOf = (db: Firestore) => collection(db, "entries");
const commentsOf = (db: Firestore) => collection(db, "comments");

// ---------- 공개 ----------

/** 대시보드: 종류별 최신 1개와 별점 5점 기록(전체, 종류별 각 최대 10개)이에요. */
export function fetchHome(): Promise<HomeData> {
  return read(async () => {
    const entries = entriesOf(userSide().db);
    const top = (type?: EntryType) => query(entries, where("rating", "==", TOP_RATING), ...(type ? [where("type", "==", type)] : []), orderBy("createdAt", "desc"), limit(TOP_COUNT));
    const [latest, topAll, topByType] = await Promise.all([
      Promise.all(ENTRY_TYPES.map((type) => getDocs(query(entries, where("type", "==", type), orderBy("createdAt", "desc"), limit(1))))),
      getDocs(top()),
      Promise.all(ENTRY_TYPES.map((type) => getDocs(top(type)))),
    ]);
    const recent = Object.fromEntries(ENTRY_TYPES.map((type, i) => [type, latest[i].docs[0] ? entryFrom(latest[i].docs[0]) : null])) as HomeData["recent"];
    const byType = Object.fromEntries(ENTRY_TYPES.map((type, i) => [type, topByType[i].docs.map(entryFrom)])) as Record<EntryType, Entry[]>;
    return { recent, top: { all: topAll.docs.map(entryFrom), ...byType } };
  });
}

export interface ListPage {
  items: Entry[];
  hasMore: boolean;
  cursor: Cursor | null;
  /** 첫 페이지에만 있어요. */
  total?: number;
  /** 첫 페이지에만 있어요. */
  tags?: TagCount[];
}

/** 목록 한 페이지(10개)예요. [cursor]가 없으면 첫 페이지이고, 전체 수와 태그 목록도 함께 받아요. */
export function fetchList(type: EntryType, sort: Sort, tag: string, cursor: Cursor | null = null): Promise<ListPage> {
  return read(async () => {
    const { db } = userSide();
    // 별점순은 별점이 같으면 최신순이에요. 별점 0(아직 안 매김)은 맨 뒤로 가요.
    const base = query(entriesOf(db), where("type", "==", type), ...(tag ? [where("tags", "array-contains", tag)] : []), ...(sort === "rating" ? [orderBy("rating", "desc")] : []), orderBy("createdAt", "desc"));
    // 한 개를 더 받아 다음 페이지가 있는지 알아내요.
    const page = query(base, ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE + 1));
    const toPage = (docs: Cursor[]) => {
      const shown = docs.slice(0, PAGE_SIZE);
      return { items: shown.map(entryFrom), hasMore: docs.length > PAGE_SIZE, cursor: shown[shown.length - 1] ?? null };
    };
    if (cursor) return toPage((await getDocs(page)).docs);
    const [snapshot, count, meta] = await Promise.all([getDocs(page), getCount(base), getDoc(doc(db, "meta/tags"))]);
    const counts = (meta.data()?.[type] ?? {}) as Record<string, number>;
    return { ...toPage(snapshot.docs), total: count.data().count, tags: sortTagCounts(counts) };
  });
}

/** 상세: 기록과 승인된 댓글(오래된 순)이에요. 지워진 기록이면 not_found예요. */
export function fetchEntry(id: string): Promise<EntryDetail> {
  return read(async () => {
    const { db } = userSide();
    const [snapshot, approved] = await Promise.all([getDoc(doc(db, "entries", id)), getDocs(query(commentsOf(db), where("entryId", "==", id), where("status", "==", "approved"), orderBy("createdAt")))]);
    if (!snapshot.exists()) throw new ApiError("not_found");
    const uid = currentUserId();
    return { entry: entryFrom(snapshot), comments: approved.docs.map((item) => commentFrom(item, uid)) };
  });
}

// ---------- 댓글 ----------

/** 그 기록에 내가 쓴 댓글이에요. 승인 전 댓글은 나에게만 보여요. */
export function fetchMyComments(entryId: string): Promise<Comment[]> {
  return read(async () => {
    const uid = await userId();
    const snapshot = await getDocs(query(commentsOf(userSide().db), where("entryId", "==", entryId), where("user", "==", uid), orderBy("createdAt")));
    return snapshot.docs.map((item) => commentFrom(item, uid));
  });
}

/** 댓글을 `승인 대기 중`으로 등록해요. 실패하면 empty, too_long, rate_limited, daily_limit, not_found 코드를 던져요. */
export function addComment(entryId: string, body: string): Promise<Comment> {
  return write(async () => {
    const text = cleanText(body, MAX_COMMENT + 1);
    if (!text) throw new ApiError("empty");
    if (text.length > MAX_COMMENT) throw new ApiError("too_long");
    const { db } = userSide();
    const uid = await userId();
    const throttleRef = doc(db, "throttle", uid);
    const previous = (await getDoc(throttleRef)).data();
    const now = Date.now();
    const throttle: Record<string, unknown> = { updatedAt: serverTimestamp() };
    // 1분 창과 24시간 창을 각각 정해요. 보안 규칙이 서버 시각으로 다시 확인해요.
    for (const [start, count, period, max, code] of [
      ["minuteStart", "minuteCount", MINUTE_MS, MINUTE_LIMIT, "rate_limited"],
      ["dayStart", "dayCount", DAY_MS, DAY_LIMIT, "daily_limit"],
    ] as const) {
      const next = nextWindow(previous?.[start] instanceof Timestamp ? previous[start].toMillis() : null, Number(previous?.[count]) || 0, period, max, now);
      if (next === "limit") throw new ApiError(code);
      if (next === "new") Object.assign(throttle, { [start]: serverTimestamp(), [count]: 1 });
      else throttle[count] = next;
    }
    const ref = doc(commentsOf(db));
    const name = displayNumber(uid);
    const batch = writeBatch(db);
    batch.set(ref, { entryId, user: uid, name, body: text, status: "pending", createdAt: serverTimestamp(), reviewedAt: null });
    batch.set(throttleRef, throttle, { merge: true });
    try {
      await batch.commit();
    } catch (error) {
      if (!isDenied(error)) throw error;
      // 규칙이 막는 경우는 지워진 기록이거나, 서버 시각으로는 아직 제한 시간 안인 경우예요.
      const entry = await getDoc(doc(db, "entries", entryId));
      throw new ApiError(entry.exists() ? "rate_limited" : "not_found");
    }
    return { id: ref.id, entryId, name, body: text, at: now, status: "pending", mine: true };
  });
}

/** 내 댓글을 지워요. 승인된 댓글이면 그 기록의 댓글 수도 같은 묶음으로 1 줄여요. */
export function deleteComment(comment: Comment): Promise<void> {
  return write(async () => {
    const { db } = userSide();
    await userId();
    const ref = doc(db, "comments", comment.id);
    const remove = (approved: boolean) => {
      if (!approved) return deleteDoc(ref);
      const batch = writeBatch(db);
      batch.delete(ref);
      batch.update(doc(db, "entries", comment.entryId), { commentCount: increment(-1), countedDelete: comment.id });
      return batch.commit();
    };
    try {
      await remove(comment.status === "approved");
    } catch (error) {
      if (!isDenied(error)) throw error;
      // 화면을 연 뒤에 관리자가 승인했거나 숨겼으면 상태가 달라요. 반대 방법으로 한 번 더 해 봐요.
      await remove(comment.status !== "approved");
    }
  });
}

// ---------- 관리자 로그인 ----------

const isListed = async (uid: string) => (await getDoc(doc(adminSide().db, "admins", uid))).exists();

/** 앱을 다시 켰을 때 지난 관리자 로그인이 아직 관리자인지 확인해요. */
export function restoreAdmin(): Promise<boolean> {
  return read(async () => {
    const { auth } = adminSide();
    await auth.authStateReady();
    return auth.currentUser !== null && (await isListed(auth.currentUser.uid));
  });
}

/** 이메일과 비밀번호로 로그인해요. 실패하면 wrong_credentials, not_admin 코드를 던져요. 관리자 목록에 없으면 바로 로그아웃해요. */
export function signInAdmin(email: string, password: string): Promise<void> {
  return write(async () => {
    const { auth } = adminSide();
    let uid: string;
    try {
      uid = (await signInWithEmailAndPassword(auth, email.trim(), password)).user.uid;
    } catch (error) {
      const code = (error as { code?: string }).code ?? "";
      if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-email", "auth/user-disabled"].includes(code)) throw new ApiError("wrong_credentials");
      throw error;
    }
    let listed = false;
    try {
      listed = await isListed(uid);
    } finally {
      if (!listed) await signOut(auth);
    }
    if (!listed) throw new ApiError("not_admin");
  });
}

export function signOutAdmin(): Promise<void> {
  return signOut(adminSide().auth);
}

// ---------- 관리자: 기록 ----------

/** 수정 화면에서 쓰는 기록 하나예요. */
export function fetchAdminEntry(id: string): Promise<Entry> {
  return read(async () => {
    const snapshot = await getDoc(doc(adminSide().db, "entries", id));
    if (!snapshot.exists()) throw new ApiError("not_found");
    return entryFrom(snapshot);
  });
}

/** 등록 화면의 태그 추천에 써요. 모든 종류의 태그를 합쳐요. */
export function fetchAllTags(): Promise<TagCount[]> {
  return read(async () => {
    const data = (await getDoc(doc(adminSide().db, "meta/tags"))).data() ?? {};
    const counts: Record<string, number> = {};
    for (const type of ENTRY_TYPES) for (const [tag, count] of Object.entries((data[type] ?? {}) as Record<string, number>)) counts[tag] = (counts[tag] ?? 0) + Number(count);
    return sortTagCounts(counts);
  });
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/** 키 없는 공식 oEmbed로 영상 제목과 채널을 받아요. 비용이 들지 않아요(유튜브 Data API는 쓰지 않아요). */
async function youtubeInfo(videoId: string): Promise<{ title: string; author: string } | null> {
  const text = await fetchText(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(youtubeUrl(videoId))}`);
  if (!text) return null;
  try {
    const json = JSON.parse(text) as { title?: string; author_name?: string };
    return { title: cleanText(String(json.title ?? ""), MAX_TITLE), author: cleanText(String(json.author_name ?? ""), MAX_AUTHOR) };
  } catch {
    return null;
  }
}

function decodeEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

/** 페이지의 og:title, 없으면 <title>만 읽어요. 많은 사이트가 브라우저에서 읽는 것을 막아서(CORS) 빈 값이면 직접 써요. */
async function pageTitle(url: string): Promise<string> {
  const html = await fetchText(url);
  if (!html) return "";
  const og = /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i.exec(html) ?? /<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i.exec(html);
  return cleanText(decodeEntities(og?.[1] ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? ""), MAX_TITLE);
}

/** `정보 가져오기`: 링크에서 제목과 채널(영상), 제목과 플랫폼(SNS)을 받아요. */
export function fetchLinkPreview(type: EntryType, url: string): Promise<LinkPreview> {
  return read(async () => {
    const link = cleanText(url, MAX_URL);
    if (type === "youtube") {
      const videoId = parseVideoId(link);
      if (!videoId) throw new ApiError("invalid_link");
      const info = await youtubeInfo(videoId);
      return { url: youtubeUrl(videoId), thumbnail: youtubeThumbnail(videoId), title: info?.title ?? "", author: info?.author ?? "" };
    }
    if (!isHttpUrl(link)) throw new ApiError("invalid_link");
    return { url: link, title: await pageTitle(link), author: "", platform: detectPlatform(link) };
  });
}

/**
 * 기록을 등록하거나 고쳐요. 예전 서버의 saveEntry와 같은 규칙이에요.
 * 실패하면 invalid_rating, too_long, invalid_link, empty_title, duplicate(+existingId), not_found, forbidden 코드를 던져요.
 */
export function saveEntry(input: EntryInput): Promise<string> {
  return write(async () => {
    const { db } = adminSide();
    const { type } = input;
    if (!Number.isInteger(input.rating) || input.rating < 0 || input.rating > 5) throw new ApiError("invalid_rating");
    const summary = cleanText(input.summary, MAX_SUMMARY + 1);
    if (summary.length > MAX_SUMMARY) throw new ApiError("too_long");
    let url = cleanText(input.url, MAX_URL);
    let title = cleanText(input.title, MAX_TITLE);
    let author = cleanText(input.author, MAX_AUTHOR);
    let thumbnail = "";
    let platform = "";
    if (type === "youtube") {
      const videoId = parseVideoId(url);
      if (!videoId) throw new ApiError("invalid_link");
      url = youtubeUrl(videoId);
      thumbnail = youtubeThumbnail(videoId);
      if (!title || !author) {
        const info = await youtubeInfo(videoId);
        title ||= info?.title ?? "";
        author ||= info?.author ?? "";
      }
    } else if (type === "sns") {
      if (!isHttpUrl(url)) throw new ApiError("invalid_link");
      platform = PLATFORMS.includes(input.platform as Platform) ? input.platform : detectPlatform(url);
      title ||= (await pageTitle(url)) || hostOf(url);
    } else if (url && !isHttpUrl(url)) {
      throw new ApiError("invalid_link");
    }
    if (!title) throw new ApiError("empty_title");

    const key = linkKey(type, url);
    if (key) {
      const same = await getDocs(query(entriesOf(db), where("type", "==", type), where("linkKey", "==", key), limit(2)));
      const other = same.docs.find((item) => item.id !== input.id);
      if (other) throw new ApiError("duplicate", { existingId: other.id });
    }
    const data = { type, url, title, author, thumbnail, platform, summary, rating: input.rating, tags: normalizeTags(input.tags), linkKey: key, updatedAt: serverTimestamp() };
    const ref = input.id ? doc(db, "entries", input.id) : doc(entriesOf(db));
    try {
      if (input.id) await updateDoc(ref, data);
      else await setDoc(ref, { ...data, createdAt: serverTimestamp(), commentCount: 0 });
    } catch (error) {
      if (error instanceof FirestoreError && error.code === "not-found") throw new ApiError("not_found");
      if (isDenied(error)) throw new ApiError("forbidden");
      throw error;
    }
    await refreshTags(db, type);
    return ref.id;
  });
}

/** 기록과 그 기록의 댓글을 함께 지워요. */
export function deleteEntry(id: string): Promise<void> {
  return write(async () => {
    const { db } = adminSide();
    const snapshot = await getDoc(doc(db, "entries", id));
    if (!snapshot.exists()) throw new ApiError("not_found");
    const comments = await getDocs(query(commentsOf(db), where("entryId", "==", id)));
    const refs = [...comments.docs.map((item) => item.ref), snapshot.ref];
    // 묶음 쓰기는 한 번에 500개까지예요. 기록 문서는 마지막 묶음에서 지워요.
    for (let i = 0; i < refs.length; i += 400) {
      const batch = writeBatch(db);
      refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    const type = snapshot.data().type;
    if (isEntryType(type)) await refreshTags(db, type);
  });
}

/**
 * 그 종류의 태그 개수를 처음부터 다시 세어 meta/tags에 써요. 목록의 태그 칩과 등록 화면의 추천이 이걸 읽어요.
 * 기록은 이미 저장된 뒤라, 여기서 실패해도 저장을 실패로 만들지 않아요(다음 저장 때 다시 맞춰져요).
 */
async function refreshTags(db: Firestore, type: EntryType): Promise<void> {
  try {
    const snapshot = await getDocs(query(entriesOf(db), where("type", "==", type)));
    const counts: Record<string, number> = {};
    snapshot.docs.forEach((item) => (Array.isArray(item.data().tags) ? item.data().tags : []).forEach((tag: unknown) => (counts[String(tag)] = (counts[String(tag)] ?? 0) + 1)));
    await updateDoc(doc(db, "meta/tags"), { [type]: counts }).catch(() => setDoc(doc(db, "meta/tags"), { [type]: counts }, { merge: true }));
  } catch {
    // 위 설명대로 무시해요.
  }
}

// ---------- 관리자: 댓글 승인 ----------

export interface AdminCommentPage {
  items: AdminComment[];
  counts: Record<CommentStatus, number>;
  hasMore: boolean;
  cursor: Cursor | null;
}

const STATUSES: CommentStatus[] = ["pending", "approved", "rejected"];

/** 대기는 오래된 것부터, 승인됨·거절됨은 최근에 처리한 것부터 10개씩이에요. */
export function fetchAdminComments(status: CommentStatus, cursor: Cursor | null = null): Promise<AdminCommentPage> {
  return read(async () => {
    const { db } = adminSide();
    const byStatus = (value: CommentStatus) => query(commentsOf(db), where("status", "==", value));
    const ordered: Query = query(byStatus(status), status === "pending" ? orderBy("createdAt") : orderBy("reviewedAt", "desc"), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE + 1));
    const [snapshot, ...counts] = await Promise.all([getDocs(ordered), ...STATUSES.map((value) => getCount(byStatus(value)))]);
    const shown = snapshot.docs.slice(0, PAGE_SIZE);
    const ids = [...new Set(shown.map((item) => String(item.data().entryId ?? "")).filter(Boolean))];
    // 한 페이지가 10개라 in 조건 한도(30개) 안이에요.
    const entries = new Map<string, Entry>();
    if (ids.length) (await getDocs(query(entriesOf(db), where(documentId(), "in", ids)))).docs.forEach((item) => entries.set(item.id, entryFrom(item)));
    return {
      items: shown.map((item) => {
        const entry = entries.get(String(item.data().entryId ?? ""));
        return { ...commentFrom(item, null), status: (item.data().status as CommentStatus) ?? status, entryTitle: entry?.title ?? "", entryType: entry?.type ?? "" };
      }),
      counts: Object.fromEntries(STATUSES.map((value, i) => [value, counts[i].data().count])) as Record<CommentStatus, number>,
      hasMore: snapshot.docs.length > PAGE_SIZE,
      cursor: shown[shown.length - 1] ?? null,
    };
  });
}

/** 승인하거나 거절(숨김)해요. 승인된 댓글 수가 바뀌면 그 기록의 댓글 수도 함께 고쳐요. */
export function reviewComment(id: string, next: "approved" | "rejected"): Promise<void> {
  return write(async () => {
    const { db } = adminSide();
    await runTransaction(db, async (transaction) => {
      const ref = doc(db, "comments", id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new ApiError("not_found");
      const previous = snapshot.data().status;
      if (previous === next) return;
      transaction.update(ref, { status: next, reviewedAt: serverTimestamp() });
      const delta = (next === "approved" ? 1 : 0) - (previous === "approved" ? 1 : 0);
      if (delta !== 0) transaction.update(doc(db, "entries", String(snapshot.data().entryId)), { commentCount: increment(delta) });
    });
  });
}

export function fetchPendingCount(): Promise<number> {
  return read(async () => (await getCount(query(commentsOf(adminSide().db), where("status", "==", "pending")))).data().count);
}
