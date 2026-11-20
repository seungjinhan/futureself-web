import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { addComment, ApiError, deleteComment, fetchEntry, fetchMyComments } from "../lib/api";
import { fill, formatDate, formatShortTime } from "../lib/format";
import { SUPPORT_EMAIL } from "../lib/links";
import { IS_WEB, logEvent, openExternal } from "../lib/platform";
import { MAX_COMMENT, type Comment, type Entry } from "../lib/types";
import { ConfirmSheet, EntryThumb, LoadFailed, ProgressBadge, Segmented, Spinner, Stars, useToast } from "./common";

const COMMENT_ERRORS: Record<string, keyof Messages> = {
  empty: "errorEmpty",
  too_long: "errorTooLong",
  rate_limited: "errorRate",
  daily_limit: "errorDaily",
  not_found: "errorNotFound",
};

interface Props {
  entryId: string;
  initial: Entry | null;
  isAdmin: boolean;
  onTag: (entry: Entry, tag: string) => void;
  onEdit: (entry: Entry) => void;
}

/** 승인된 댓글과 내 댓글을 합쳐 시간순으로 보여줘요. 내 댓글이 승인됐으면 한 번만 보여요. */
function mergeComments(approved: Comment[], mine: Comment[]): Comment[] {
  const mineIds = new Set(mine.map((c) => c.id));
  return [...approved.filter((c) => !mineIds.has(c.id)), ...mine].sort((a, b) => a.at - b.at);
}

/** 댓글 신고 메일 주소예요. 제목과 댓글 ID를 미리 채워요(안드로이드와 같아요). */
function reportMailto(subject: string, body: string): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function CommentItem({ comment, onDelete }: { comment: Comment; onDelete: () => void }) {
  const { t } = useI18n();
  const status = comment.mine && comment.status !== "approved" ? comment.status : null;
  return (
    <li className={`comment${comment.mine ? " is-mine" : ""}`}>
      <div className="comment-head">
        <span className="comment-name">{comment.mine ? t("commentMine") : fill(t("anonymous"), { n: comment.name })}</span>
        <span className="comment-time">{formatShortTime(comment.at)}</span>
        {status && <span className={`badge badge-${status}`}>{t(status === "pending" ? "commentPending" : "commentRejected")}</span>}
        {comment.mine ? (
          <button type="button" className="link-button" onClick={onDelete}>
            {t("commentDelete")}
          </button>
        ) : (
          // 남의 댓글은 운영자에게 메일로 신고할 수 있어요.
          <button type="button" className="link-button" onClick={() => openExternal(reportMailto(t("reportSubject"), fill(t("reportBody"), { id: comment.id })))}>
            {t("commentReport")}
          </button>
        )}
      </div>
      <p className="comment-body">{comment.body}</p>
    </li>
  );
}

function Comments({ entryId, approved, onCountChange }: { entryId: string; approved: Comment[]; onCountChange: (delta: number) => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [mine, setMine] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<Comment | null>(null);
  // 지운 댓글이에요. 승인된 댓글 목록에 남아 있는 사본도 가려요.
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let alive = true;
    fetchMyComments(entryId)
      .then((list) => alive && setMine(list))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [entryId]);

  const submit = async () => {
    const body = text.trim();
    if (!body) return toast("errorEmpty");
    if (body.length > MAX_COMMENT) return toast("errorTooLong", { max: MAX_COMMENT });
    setSending(true);
    try {
      const comment = await addComment(entryId, body);
      setMine((prev) => [...prev, comment]);
      setText("");
      toast("commentSubmitted");
      logEvent("comment_submit", { entry_id: entryId });
    } catch (error) {
      const code = error instanceof ApiError ? error.message : "";
      toast(COMMENT_ERRORS[code] ?? "errorFailed", { max: MAX_COMMENT });
    } finally {
      setSending(false);
    }
  };

  const remove = async (comment: Comment) => {
    try {
      await deleteComment(comment);
      setMine((prev) => prev.filter((c) => c.id !== comment.id));
      setDeletedIds((prev) => new Set(prev).add(comment.id));
      if (comment.status === "approved") onCountChange(-1);
      toast("commentDeleted");
    } catch {
      toast("errorFailed");
    }
  };

  const list = mergeComments(
    approved.filter((c) => !deletedIds.has(c.id)),
    mine,
  );
  return (
    <section className="comments">
      {list.length === 0 ? (
        <p className="empty small">{t("noComments")}</p>
      ) : (
        <ul className="comment-list">
          {list.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onDelete={() => setConfirm(comment)} />
          ))}
        </ul>
      )}
      <div className="comment-form" aria-busy={sending}>
        {sending && <div className="progress-bar" role="progressbar" aria-label={t("commentSending")} />}
        <textarea className="input" rows={3} maxLength={MAX_COMMENT + 20} placeholder={t("commentPlaceholder")} value={text} readOnly={sending} onChange={(event) => setText(event.target.value)} aria-label={t("commentPlaceholder")} />
        <div className="comment-form-foot">
          <span className={`counter${text.trim().length > MAX_COMMENT ? " is-over" : ""}`}>
            {text.trim().length}/{MAX_COMMENT}
          </span>
          <button type="button" className={`btn-primary small${sending ? " is-busy" : ""}`} disabled={sending || !text.trim()} onClick={() => void submit()}>
            {sending && <span className="spinner small on-dark" aria-hidden="true" />}
            {t(sending ? "commentSending" : "commentSubmit")}
          </button>
        </div>
        <p className="hint">{t("commentNotice")}</p>
      </div>
      {confirm && <ConfirmSheet message={t("commentDeleteConfirm")} confirmLabel={t("commentDelete")} onConfirm={() => void remove(confirm)} onClose={() => setConfirm(null)} />}
    </section>
  );
}

export function DetailScreen({ entryId, initial, isAdmin, onTag, onEdit }: Props) {
  const { t } = useI18n();
  const [entry, setEntry] = useState<Entry | null>(initial);
  const [approved, setApproved] = useState<Comment[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "missing">("loading");
  const [tab, setTab] = useState<"summary" | "comments">("summary");
  const [countDelta, setCountDelta] = useState(0);

  const load = () => {
    setStatus("loading");
    fetchEntry(entryId)
      .then((detail) => {
        setEntry(detail.entry);
        setApproved(detail.comments);
        setStatus("ready");
      })
      .catch((error) => setStatus(error instanceof ApiError && error.message === "not_found" ? "missing" : "error"));
  };

  useEffect(load, [entryId]);

  if (status === "missing") return <p className="empty">{t("errorNotFound")}</p>;
  if (!entry) return status === "error" ? <LoadFailed onRetry={load} /> : <Spinner label={t("loading")} />;

  const commentTotal = (status === "ready" ? approved.length : entry.commentCount) + countDelta;
  const linkLabel: keyof Messages = entry.type === "youtube" ? "openYoutube" : entry.type === "sns" ? "openSns" : "openBook";

  return (
    <main className="screen detail">
      <EntryThumb entry={entry} size="detail" />
      <div className="detail-head">
        <h1 className="detail-title">{entry.title}</h1>
        {/* 관리자 수정은 토스판에만 있어요. */}
        {!IS_WEB && isAdmin && (
          <button type="button" className="btn-outline danger small" onClick={() => onEdit(entry)}>
            {t("editEntry")}
          </button>
        )}
      </div>
      <div className="detail-meta">
        {entry.author && <span className="detail-author">{entry.author}</span>}
        {entry.rating > 0 ? <Stars rating={entry.rating} size={15} /> : <ProgressBadge type={entry.type} />}
        <span>{formatDate(entry.createdAt)}</span>
      </div>
      {entry.tags.length > 0 && (
        <div className="chip-row wrap">
          {entry.tags.map((tag) => (
            <button key={tag} type="button" className="chip" onClick={() => onTag(entry, tag)}>
              #{tag}
            </button>
          ))}
        </div>
      )}
      <Segmented
        label={t("tabSummary")}
        value={tab}
        onChange={setTab}
        options={[
          { id: "summary", label: t("tabSummary") },
          { id: "comments", label: fill(t("tabComments"), { n: commentTotal }) },
        ]}
      />
      {tab === "summary" ? (
        status === "loading" && entry.summary === undefined ? (
          <Spinner />
        ) : status === "error" && entry.summary === undefined ? (
          <LoadFailed onRetry={load} />
        ) : (
          entry.summary ? <p className="summary">{entry.summary}</p> : <p className="empty small">{t("emptySummary")}</p>
        )
      ) : (
        <Comments entryId={entry.id} approved={approved} onCountChange={(delta) => setCountDelta((v) => v + delta)} />
      )}
      {entry.url && (
        <div className="bottom-cta">
          <button
            type="button"
            className="btn-primary block"
            onClick={() => {
              logEvent("link_open", { type: entry.type });
              openExternal(entry.url);
            }}
          >
            {t(linkLabel)}
          </button>
        </div>
      )}
    </main>
  );
}
