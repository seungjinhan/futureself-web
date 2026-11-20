import { useI18n } from "../i18n/I18nContext";
import { fill, formatDate } from "../lib/format";
import type { Entry } from "../lib/types";
import { EntryThumb, RatingBadge } from "./common";
import { CommentIcon } from "./icons";

/** 목록의 한 줄이에요. 왼쪽 타일, 가운데 제목과 정보, 오른쪽 별점 배지예요. */
export function EntryRow({ entry, onOpen, danger = false }: { entry: Entry; onOpen: (entry: Entry) => void; danger?: boolean }) {
  const { t } = useI18n();
  return (
    <button type="button" className={`entry-row${danger ? " is-danger" : ""}`} onClick={() => onOpen(entry)}>
      <EntryThumb entry={entry} />
      <span className="entry-main">
        <span className="entry-title">{entry.title}</span>
        <span className="entry-meta">
          {entry.author && <span className="entry-author">{entry.author}</span>}
          <span>{formatDate(entry.createdAt)}</span>
          {entry.commentCount > 0 && (
            <span className="entry-comments" aria-label={fill(t("commentCount"), { n: entry.commentCount })}>
              <CommentIcon size={13} />
              {entry.commentCount}
            </span>
          )}
        </span>
        {entry.tags.length > 0 && (
          <span className="entry-tags">
            {entry.tags.slice(0, 2).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </span>
        )}
      </span>
      <RatingBadge rating={entry.rating} type={entry.type} />
    </button>
  );
}
