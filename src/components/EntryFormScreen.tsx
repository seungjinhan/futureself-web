import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { ApiError, deleteEntry, fetchAdminEntry, fetchAllTags, fetchLinkPreview, saveEntry } from "../lib/api";
import { detectPlatform, parseVideoId } from "../lib/format";
import { loadJson, saveJson, STORAGE_KEYS } from "../lib/platform";
import { MAX_SUMMARY, MAX_TAGS, normalizeTag, PLATFORMS, type EntryInput, type EntryType, type Platform, type TagCount } from "../lib/types";
import { ConfirmSheet, EntryThumb, LoadFailed, platformLabelKey, Spinner, useToast } from "./common";
import { StarIcon } from "./icons";

const TITLE: Record<EntryType, keyof Messages> = { youtube: "adminYoutube", book: "adminBook", sns: "adminSns" };
const AUTHOR: Record<EntryType, keyof Messages> = { youtube: "fieldChannel", book: "fieldAuthor", sns: "fieldAccount" };
const SAVE_ERRORS: Record<string, keyof Messages> = {
  duplicate: "errorDuplicate",
  invalid_link: "errorInvalidLink",
  empty_title: "errorEmptyTitle",
  invalid_rating: "errorRating",
  too_long: "errorTooLong",
  forbidden: "errorForbidden",
  not_found: "errorNotFound",
};

interface Draft {
  url: string;
  title: string;
  author: string;
  platform: Platform | "";
  summary: string;
  rating: number;
  tags: string[];
}

const EMPTY: Draft = { url: "", title: "", author: "", platform: "", summary: "", rating: 0, tags: [] };

interface Props {
  type: EntryType;
  id?: string;
  onSaved: () => void;
  onDeleted: () => void;
  onOpenExisting: (id: string) => void;
}

function TagInput({ tags, onChange, suggestions }: { tags: string[]; onChange: (tags: string[]) => void; suggestions: TagCount[] }) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const next = [...tags];
    raw.split(",").forEach((part) => {
      const tag = normalizeTag(part);
      if (tag && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag);
    });
    onChange(next);
    setText("");
  };
  const query = normalizeTag(text);
  const shown = suggestions.filter(({ tag }) => !tags.includes(tag) && (!query || tag.includes(query))).slice(0, 8);
  return (
    <div className="tag-input">
      <div className="tag-box">
        {tags.map((tag) => (
          <button key={tag} type="button" className="chip is-active removable" aria-label={t("removeTag").replace("{tag}", tag)} onClick={() => onChange(tags.filter((x) => x !== tag))}>
            #{tag} ×
          </button>
        ))}
        {tags.length < MAX_TAGS && (
          <input
            className="tag-field"
            value={text}
            aria-label={t("fieldTags")}
            onChange={(event) => {
              const value = event.target.value;
              if (value.includes(",")) add(value);
              else setText(value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                add(text);
              } else if (event.key === "Backspace" && !text && tags.length) onChange(tags.slice(0, -1));
            }}
            onBlur={() => text && add(text)}
          />
        )}
      </div>
      <p className="hint">{t("tagsHint")}</p>
      {shown.length > 0 && tags.length < MAX_TAGS && (
        <div className="suggest">
          <span className="suggest-label">{t("tagsSuggest")}</span>
          {shown.map(({ tag }) => (
            <button key={tag} type="button" className="chip" onMouseDown={(event) => event.preventDefault()} onClick={() => add(tag)}>
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** 관리자 전용(빨간색) 등록·수정 화면이에요. 이미지는 올리지 않고, 유튜브 썸네일만 링크에서 자동으로 받아요. */
export function EntryFormScreen({ type, id, onSaved, onDeleted, onOpenExisting }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [ready, setReady] = useState(!id);
  const [suggestions, setSuggestions] = useState<TagCount[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // 수정할 기록을 불러오지 못하면 빈 입력 화면 대신 다시 시도를 보여줘요. 빈 내용으로 저장해 기존 기록을 지우지 않게 해요.
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const draftKey = `${STORAGE_KEYS.draft}:${type}:${id ?? "new"}`;

  useEffect(() => {
    let alive = true;
    void (async () => {
      fetchAllTags()
        .then((tags) => alive && setSuggestions(tags))
        .catch(() => undefined);
      const saved = (await loadJson(draftKey)) as Draft | null;
      if (saved && alive) {
        setDraft({ ...EMPTY, ...saved });
        setReady(true);
        toast("draftRestored");
        return;
      }
      if (!id) return;
      try {
        const entry = await fetchAdminEntry(id);
        if (!alive) return;
        setDraft({ url: entry.url, title: entry.title, author: entry.author, platform: entry.platform, summary: entry.summary ?? "", rating: entry.rating, tags: entry.tags });
        setReady(true);
      } catch {
        if (alive) setLoadFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [draftKey, id, toast, attempt]);

  const update = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveJson(draftKey, next);
      return next;
    });
    setDuplicateId(null);
  };

  const fetchInfo = async () => {
    setFetching(true);
    try {
      const preview = await fetchLinkPreview(type, draft.url);
      update({ url: preview.url, title: preview.title || draft.title, author: preview.author || draft.author, platform: preview.platform ?? draft.platform });
      if (!preview.title) toast("previewFailed");
    } catch (error) {
      toast(error instanceof ApiError && error.message === "invalid_link" ? "errorInvalidLink" : "previewFailed");
    } finally {
      setFetching(false);
    }
  };

  const save = async () => {
    if (type === "book" && !draft.title.trim()) return toast("errorEmptyTitle");
    setSaving(true);
    try {
      const input: EntryInput = { id, type, ...draft, platform: type === "sns" ? draft.platform || detectPlatform(draft.url) : "" };
      await saveEntry(input);
      saveJson(draftKey, null);
      toast("saved");
      onSaved();
    } catch (error) {
      const code = error instanceof ApiError ? error.message : "";
      if (code === "duplicate" && error instanceof ApiError) setDuplicateId(String(error.detail.existingId ?? ""));
      toast(SAVE_ERRORS[code] ?? "errorFailed", { max: MAX_SUMMARY });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    try {
      await deleteEntry(id);
      saveJson(draftKey, null);
      toast("deleted");
      onDeleted();
    } catch {
      toast("errorFailed");
    }
  };

  if (loadFailed)
    return (
      <main className="screen admin">
        <LoadFailed
          onRetry={() => {
            setLoadFailed(false);
            setAttempt((n) => n + 1);
          }}
        />
      </main>
    );
  if (!ready) return <Spinner label={t("loading")} />;
  const videoId = type === "youtube" ? parseVideoId(draft.url) : null;
  const needsLink = type !== "book";

  return (
    <main className="screen admin form">
      <h1 className="page-title danger">
        {t(TITLE[type])} · {t(id ? "editEntry" : "newEntry")}
      </h1>

      <label className="field">
        <span className="field-label">
          {t(type === "book" ? "fieldBookLink" : "fieldLink")}
          {!needsLink && <small>{t("optional")}</small>}
        </span>
        <div className="field-row">
          <input className="input" type="url" inputMode="url" value={draft.url} placeholder="https://" onChange={(event) => update({ url: event.target.value })} />
          {needsLink && (
            <button type="button" className="btn-outline danger" disabled={fetching || !draft.url.trim()} onClick={() => void fetchInfo()}>
              {t(fetching ? "fetching" : "fetchInfo")}
            </button>
          )}
        </div>
      </label>
      {videoId && <EntryThumb entry={{ type: "youtube", title: draft.title, thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, platform: "" }} size="detail" />}

      <label className="field">
        <span className="field-label">{t("fieldTitle")}</span>
        <input className="input" value={draft.title} maxLength={200} onChange={(event) => update({ title: event.target.value })} />
      </label>

      <label className="field">
        <span className="field-label">
          {t(AUTHOR[type])}
          {type !== "youtube" && <small>{t("optional")}</small>}
        </span>
        <input className="input" value={draft.author} maxLength={100} onChange={(event) => update({ author: event.target.value })} />
      </label>

      {type === "sns" && (
        <div className="field">
          <span className="field-label">{t("fieldPlatform")}</span>
          <div className="chip-row wrap">
            {PLATFORMS.map((platform) => {
              const active = (draft.platform || (draft.url ? detectPlatform(draft.url) : "")) === platform;
              return (
                <button key={platform} type="button" className={`chip danger${active ? " is-active" : ""}`} aria-pressed={active} onClick={() => update({ platform })}>
                  {t(platformLabelKey(platform))}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="field">
        <span className="field-label">
          {t("fieldRating")}
          <small>{t("optional")}</small>
        </span>
        <div className="star-picker" role="radiogroup" aria-label={t("fieldRating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            // 같은 별을 다시 누르면 별점을 지워요(아직 안 본 영상).
            <button key={n} type="button" role="radio" aria-checked={draft.rating === n} aria-label={String(n)} className={n <= draft.rating ? "is-on" : ""} onClick={() => update({ rating: draft.rating === n ? 0 : n })}>
              <StarIcon size={32} filled={n <= draft.rating} />
            </button>
          ))}
        </div>
        <p className="hint">{t("ratingHint")}</p>
      </div>

      <label className="field">
        <span className="field-label">
          {t("fieldSummary")}
          <small className={draft.summary.length > MAX_SUMMARY ? "is-over" : ""}>
            {t("optional")} · {draft.summary.length}/{MAX_SUMMARY}
          </small>
        </span>
        <textarea className="input" rows={8} value={draft.summary} onChange={(event) => update({ summary: event.target.value })} />
      </label>

      <div className="field">
        <span className="field-label">
          {t("fieldTags")}
          <small>{t("optional")}</small>
        </span>
        <TagInput tags={draft.tags} onChange={(tags) => update({ tags })} suggestions={suggestions} />
      </div>

      {duplicateId && (
        <button type="button" className="btn-outline danger block" onClick={() => onOpenExisting(duplicateId)}>
          {t("goExisting")}
        </button>
      )}
      <button type="button" className="btn-danger block" disabled={saving} onClick={() => void save()}>
        {t(saving ? "saving" : "save")}
      </button>
      {id && (
        <button type="button" className="link-button danger delete-entry" onClick={() => setConfirmDelete(true)}>
          {t("delete")}
        </button>
      )}
      {confirmDelete && <ConfirmSheet message={t("deleteConfirm")} confirmLabel={t("delete")} onConfirm={() => void remove()} onClose={() => setConfirmDelete(false)} />}
    </main>
  );
}
