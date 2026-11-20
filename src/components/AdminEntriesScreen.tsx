import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import type { Entry, EntryType } from "../lib/types";
import { LoadFailed, LoadMore, Spinner } from "./common";
import { EntryRow } from "./EntryRow";
import { PlusIcon } from "./icons";
import { useEntryList } from "./ListScreen";

const TITLE: Record<EntryType, keyof Messages> = { youtube: "adminYoutube", book: "adminBook", sns: "adminSns" };

/** 관리자 전용(빨간색)이에요. 등록한 기록을 최신순으로 보여주고, 누르면 수정해요. */
export function AdminEntriesScreen({ type, version, onNew, onEdit }: { type: EntryType; version: number; onNew: () => void; onEdit: (entry: Entry) => void }) {
  const { t } = useI18n();
  const list = useEntryList(type, "latest", "", version);
  return (
    <main className="screen admin">
      <h1 className="page-title danger">{t(TITLE[type])}</h1>
      <button type="button" className="btn-danger block with-icon" onClick={onNew}>
        <PlusIcon />
        {t("newEntry")}
      </button>
      {list.status === "error" && list.items.length === 0 ? (
        <LoadFailed onRetry={list.reload} />
      ) : list.status === "loading" && list.items.length === 0 ? (
        <Spinner label={t("loading")} />
      ) : list.items.length === 0 ? (
        <p className="empty">{t("emptyList")}</p>
      ) : (
        <div className="entry-list">
          {list.items.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onOpen={onEdit} danger />
          ))}
          <LoadMore hasMore={list.hasMore} failed={list.moreFailed} onLoad={list.loadMore} count={list.items.length} />
        </div>
      )}
    </main>
  );
}
