import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { fetchList, type Cursor } from "../lib/api";
import { fill } from "../lib/format";
import { logEvent } from "../lib/platform";
import type { Entry, EntryType, Sort, TagCount } from "../lib/types";
import { LoadFailed, LoadMore, Segmented, Spinner } from "./common";
import { EntryRow } from "./EntryRow";

const TITLE: Record<EntryType, keyof Messages> = { youtube: "tabYoutube", book: "tabBook", sns: "tabSns" };

interface ListState {
  items: Entry[];
  total: number;
  hasMore: boolean;
  tags: TagCount[];
  status: "loading" | "ready" | "error";
  /** 다음 페이지를 불러오지 못했어요. 다시 시도 버튼을 보여줘요. */
  moreFailed: boolean;
  /** 다음 페이지를 이어 받을 자리예요. */
  cursor: Cursor | null;
}

const EMPTY: ListState = { items: [], total: 0, hasMore: false, tags: [], status: "loading", moreFailed: false, cursor: null };

/** 정렬과 태그가 바뀌거나 내용이 바뀌면(version) 처음부터 다시 불러오고, 끝에 닿으면 10개씩 더 불러와요. */
export function useEntryList(type: EntryType, sort: Sort, tag: string, version: number, enabled = true) {
  const [state, setState] = useState<ListState>(EMPTY);
  const request = useRef(0);
  const loadingMore = useRef(false);

  const loadFirst = useCallback(() => {
    const id = ++request.current;
    setState((prev) => ({ ...prev, status: "loading" }));
    fetchList(type, sort, tag)
      .then((page) => id === request.current && setState({ items: page.items, total: page.total ?? page.items.length, hasMore: page.hasMore, tags: page.tags ?? [], status: "ready", moreFailed: false, cursor: page.cursor }))
      .catch(() => id === request.current && setState((prev) => ({ ...prev, status: "error" })));
  }, [type, sort, tag]);

  useEffect(() => {
    if (enabled) loadFirst();
  }, [loadFirst, version, enabled]);

  const loadMore = useCallback(() => {
    if (loadingMore.current || !state.hasMore || state.status !== "ready") return;
    loadingMore.current = true;
    const id = request.current;
    setState((prev) => (prev.moreFailed ? { ...prev, moreFailed: false } : prev));
    fetchList(type, sort, tag, state.cursor)
      .then((page) => {
        if (id !== request.current) return;
        logEvent("list_scroll_more", { type });
        // 혹시 겹친 항목은 빼요.
        setState((prev) => ({ ...prev, items: [...prev.items, ...page.items.filter((item) => !prev.items.some((p) => p.id === item.id))], hasMore: page.hasMore, cursor: page.cursor ?? prev.cursor }));
      })
      .catch(() => id === request.current && setState((prev) => ({ ...prev, moreFailed: true })))
      .finally(() => {
        loadingMore.current = false;
      });
  }, [type, sort, tag, state.hasMore, state.status, state.cursor]);

  return { ...state, loadMore, reload: loadFirst };
}

interface Props {
  type: EntryType;
  isActive: boolean;
  version: number;
  initialSort: Sort;
  tag: string;
  onTagChange: (tag: string) => void;
  onSortChange: (sort: Sort) => void;
  onOpen: (entry: Entry) => void;
}

export function ListScreen({ type, isActive, version, initialSort, tag, onTagChange, onSortChange, onOpen }: Props) {
  const { t } = useI18n();
  const [sort, setSort] = useState<Sort>(initialSort);
  const [visited, setVisited] = useState(isActive);
  useEffect(() => {
    if (isActive) setVisited(true);
  }, [isActive]);
  // 한 번도 열지 않은 탭은 불러오지 않아요.
  const list = useEntryList(type, sort, tag, version, visited);
  const tagOptions = [{ id: "", label: t("filterAll") }, ...list.tags.map(({ tag: name }) => ({ id: name, label: `#${name}` }))];
  // 고른 태그가 목록에 없어도(상세에서 눌러 들어옴) 칩으로 보여줘요.
  if (tag && !list.tags.some((item) => item.tag === tag)) tagOptions.splice(1, 0, { id: tag, label: `#${tag}` });

  return (
    <main className="screen">
      <header className="page-head">
        <h1 className="page-title">
          {t(TITLE[type])}
          {list.status === "ready" && <span className="page-count">{fill(t("count"), { n: list.total })}</span>}
        </h1>
        <Segmented
          label={t("sortLabel")}
          value={sort}
          onChange={(next) => {
            setSort(next);
            onSortChange(next);
          }}
          options={[
            { id: "latest", label: t("sortLatest") },
            { id: "rating", label: t("sortRating") },
          ]}
        />
      </header>
      {tagOptions.length > 1 && (
        <div className="chip-row" role="radiogroup" aria-label={t("tagLabel")}>
          {tagOptions.map((option) => (
            <button
              key={option.id || "all"}
              type="button"
              role="radio"
              aria-checked={option.id === tag}
              className={`chip${option.id === tag ? " is-active" : ""}`}
              onClick={() => {
                onTagChange(option.id);
                if (option.id) logEvent("tag_filter", { type, tag: option.id, source: "list" });
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
      {list.status === "error" && list.items.length === 0 ? (
        <LoadFailed onRetry={list.reload} />
      ) : list.status === "loading" && list.items.length === 0 ? (
        <Spinner label={t("loading")} />
      ) : list.items.length === 0 ? (
        <p className="empty">{t(tag ? "emptyTag" : "emptyList")}</p>
      ) : (
        <div className={`entry-list${list.status === "loading" ? " is-reloading" : ""}`}>
          {list.items.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onOpen={onOpen} />
          ))}
          {list.hasMore ? <LoadMore hasMore failed={list.moreFailed} onLoad={list.loadMore} count={list.items.length} disabled={!isActive} /> : <p className="all-done">{t("allDone")}</p>}
        </div>
      )}
    </main>
  );
}
