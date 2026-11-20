import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { fetchAdminComments, reviewComment, type AdminCommentPage } from "../lib/api";
import { fill, formatShortTime } from "../lib/format";
import type { AdminComment, CommentStatus } from "../lib/types";
import { LoadFailed, LoadMore, Segmented, Spinner, typeLabelKey, useToast } from "./common";
import { BookIcon, LinkIcon, PlayIcon } from "./icons";

const STATUS_LABEL: Record<CommentStatus, keyof Messages> = { pending: "statusPending", approved: "statusApproved", rejected: "statusRejected" };

/** 관리자 전용(빨간색)이에요. 대기는 오래된 것부터, 처리한 것은 최근 것부터 보여줘요. */
export function AdminCommentsScreen({ onChanged, onOpenEntry }: { onChanged: () => void; onOpenEntry: (id: string) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [status, setStatus] = useState<CommentStatus>("pending");
  const [page, setPage] = useState<AdminCommentPage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [moreFailed, setMoreFailed] = useState(false);
  const request = useRef(0);
  const loadingMore = useRef(false);

  // 탭을 바꾸면 이전 탭의 댓글을 지우고 처음부터 불러와요. 이전 탭 댓글이 새 탭 이름 아래 남아 눌리지 않게 해요.
  const load = useCallback(() => {
    const id = ++request.current;
    setState("loading");
    setPage(null);
    setMoreFailed(false);
    fetchAdminComments(status)
      .then((next) => {
        if (id !== request.current) return;
        setPage(next);
        setState("ready");
      })
      .catch(() => id === request.current && setState("error"));
  }, [status]);

  useEffect(load, [load]);

  const loadMore = () => {
    if (!page?.hasMore || state !== "ready" || loadingMore.current) return;
    loadingMore.current = true;
    setMoreFailed(false);
    const id = request.current;
    fetchAdminComments(status, page.cursor)
      .then((next) => id === request.current && setPage((prev) => (prev ? { ...next, items: [...prev.items, ...next.items.filter((c) => !prev.items.some((p) => p.id === c.id))] } : next)))
      .catch(() => id === request.current && setMoreFailed(true))
      .finally(() => {
        loadingMore.current = false;
      });
  };

  const review = async (comment: AdminComment, next: "approved" | "rejected") => {
    setBusy(comment.id);
    try {
      await reviewComment(comment.id, next);
      setPage((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.filter((c) => c.id !== comment.id),
              counts: { ...prev.counts, [comment.status]: prev.counts[comment.status] - 1, [next]: prev.counts[next] + 1 },
            }
          : prev,
      );
      toast(next === "approved" ? "approved" : "rejected");
      onChanged();
    } catch {
      toast("errorFailed");
    } finally {
      setBusy(null);
    }
  };

  const counts = page?.counts;
  return (
    <main className="screen admin">
      <h1 className="page-title danger">{t("adminComments")}</h1>
      <Segmented
        danger
        label={t("adminComments")}
        value={status}
        onChange={setStatus}
        options={(["pending", "approved", "rejected"] as CommentStatus[]).map((id) => ({ id, label: counts ? `${t(STATUS_LABEL[id])} ${counts[id]}` : t(STATUS_LABEL[id]) }))}
      />
      {state === "error" && !page ? (
        <LoadFailed onRetry={load} />
      ) : !page || (state === "loading" && page.items.length === 0) ? (
        <Spinner label={t("loading")} />
      ) : page.items.length === 0 ? (
        <p className="empty">{t("adminEmpty")}</p>
      ) : (
        <ul className="notice-list">
          {page.items.map((comment) => (
            <li key={comment.id} className="notice">
              <span className="notice-icon">{comment.entryType === "book" ? <BookIcon /> : comment.entryType === "sns" ? <LinkIcon /> : <PlayIcon />}</span>
              <div className="notice-main">
                <div className="notice-head">
                  <button type="button" className="notice-title" disabled={!comment.entryTitle} onClick={() => onOpenEntry(comment.entryId)}>
                    {comment.entryType && <small>{t(typeLabelKey(comment.entryType))} · </small>}
                    {comment.entryTitle || t("deletedEntry")}
                  </button>
                  <span className="notice-time">{formatShortTime(comment.at)}</span>
                </div>
                <span className="notice-sub">{fill(t("anonymous"), { n: comment.name })}</span>
                <p className="notice-bubble">{comment.body}</p>
                <div className="notice-actions">
                  {comment.status !== "rejected" && (
                    <button type="button" className="btn-outline danger small" disabled={busy === comment.id} onClick={() => void review(comment, "rejected")}>
                      {t(comment.status === "approved" ? "hide" : "reject")}
                    </button>
                  )}
                  {comment.status !== "approved" && (
                    <button type="button" className="btn-danger small" disabled={busy === comment.id} onClick={() => void review(comment, "approved")}>
                      {t("approve")}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
          <LoadMore hasMore={page.hasMore} failed={moreFailed} onLoad={loadMore} count={page.items.length} />
        </ul>
      )}
    </main>
  );
}
