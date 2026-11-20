import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { fill, formatRating } from "../lib/format";
import type { Entry, EntryType, Platform } from "../lib/types";
import { BookIcon, PlatformIcon, PlayIcon, StarIcon } from "./icons";

// ---------- 알림 ----------

type ToastFn = (message: keyof Messages, values?: Record<string, string | number>) => void;
const ToastContext = createContext<ToastFn>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number>(0);
  const show = useCallback<ToastFn>(
    (key, values) => {
      window.clearTimeout(timer.current);
      setMessage(values ? fill(t(key), values) : t(key));
      timer.current = window.setTimeout(() => setMessage(null), 2600);
    },
    [t],
  );
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

// ---------- 별점 ----------

/** 별점을 아직 매기지 않았으면(0) 영상·SNS는 `시청중`, 책은 `독서중`으로 보여줘요. */
export function ProgressBadge({ type }: { type: EntryType }) {
  const { t } = useI18n();
  return <span className="progress-badge">{t(type === "book" ? "statusReading" : "statusWatching")}</span>;
}

export function RatingBadge({ rating, type }: { rating: number; type: EntryType }) {
  const { t } = useI18n();
  if (!rating) return <ProgressBadge type={type} />;
  return (
    <span className="rating-badge" aria-label={fill(t("ratingLabel"), { n: rating })}>
      <StarIcon size={13} />
      {formatRating(rating)}
    </span>
  );
}

export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const { t } = useI18n();
  return (
    <span className="stars" aria-label={fill(t("ratingLabel"), { n: rating })}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} filled={n <= rating} />
      ))}
    </span>
  );
}

// ---------- 나눔 탭, 칩 ----------

export function Segmented<T extends string>({ options, value, onChange, label, danger = false }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string; danger?: boolean }) {
  return (
    <div className={`segmented${danger ? " is-danger" : ""}`} role="tablist" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" role="tab" aria-selected={option.id === value} className={`segment${option.id === value ? " is-active" : ""}`} onClick={() => onChange(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ChipRow<T extends string>({ options, value, onChange, label, wrap = false }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void; label: string; wrap?: boolean }) {
  return (
    <div className={`chip-row${wrap ? " wrap" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button key={option.id} type="button" role="radio" aria-checked={option.id === value} className={`chip${option.id === value ? " is-active" : ""}`} onClick={() => onChange(option.id)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

// ---------- 썸네일 ----------

const BOOK_TONES = 5;

/** 책 아이콘의 밝기 단계예요. 제목에 따라 늘 같은 단계가 나오고, 색은 테마를 따라요(styles.css의 tone-0~4). */
function bookTone(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return h % BOOK_TONES;
}

export function EntryThumb({ entry, size = "row" }: { entry: Pick<Entry, "type" | "title" | "thumbnail" | "platform">; size?: "row" | "hero" | "detail" }) {
  const [failed, setFailed] = useState(false);
  if (entry.type === "youtube" && entry.thumbnail && !failed) {
    return (
      <span className={`thumb thumb-${size} is-image`}>
        {/* 지워진 영상은 유튜브가 120×90 회색 그림을 줘요. 그때는 재생 아이콘으로 바꿔요. */}
        <img src={entry.thumbnail} alt="" loading="lazy" onError={() => setFailed(true)} onLoad={(event) => event.currentTarget.naturalWidth <= 120 && setFailed(true)} />
      </span>
    );
  }
  if (entry.type === "book") {
    const first = Array.from(entry.title.trim())[0] ?? "";
    return (
      <span className={`thumb thumb-${size} is-book tone-${bookTone(entry.title)}`} aria-hidden="true">
        <span className="thumb-letter">{first}</span>
        <span className="thumb-corner">
          <BookIcon size={size === "row" ? 12 : 16} />
        </span>
      </span>
    );
  }
  return (
    <span className={`thumb thumb-${size} is-icon`} aria-hidden="true">
      {entry.type === "youtube" ? <PlayIcon size={size === "row" ? 24 : 36} /> : <PlatformIcon platform={entry.platform as Platform | ""} size={size === "row" ? 24 : 36} />}
    </span>
  );
}

export function typeLabelKey(type: EntryType): keyof Messages {
  return type === "youtube" ? "typeYoutube" : type === "book" ? "typeBook" : "typeSns";
}

export function platformLabelKey(platform: Platform): keyof Messages {
  return ({ instagram: "platformInstagram", threads: "platformThreads", x: "platformX", blog: "platformBlog", etc: "platformEtc" } as const)[platform];
}

// ---------- 목록 ----------

/** 목록 끝에 닿으면 다음 페이지를 불러와요. rearm이 바뀌면(한 페이지를 더 불러오면) 다시 살펴서, 끝이 아직 화면에 보이면 또 불러와요. */
export function Sentinel({ onVisible, disabled, rearm }: { onVisible: () => void; disabled: boolean; rearm?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);
  callback.current = onVisible;
  useEffect(() => {
    const node = ref.current;
    if (!node || disabled) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && callback.current(), { rootMargin: "300px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled, rearm]);
  return <div ref={ref} className="sentinel" aria-hidden="true" />;
}

/** 목록 끝이에요. 화면에 닿으면 다음 페이지를 불러오고, 실패하면 다시 시도 버튼을 보여줘요. */
export function LoadMore({ hasMore, failed, onLoad, count, disabled = false }: { hasMore: boolean; failed: boolean; onLoad: () => void; count: number; disabled?: boolean }) {
  const { t } = useI18n();
  if (!hasMore) return null;
  if (failed)
    return (
      <div className="load-more-failed" role="status">
        <span>{t("loadMoreFailed")}</span>
        <button type="button" className="btn-outline small" onClick={onLoad}>
          {t("retry")}
        </button>
      </div>
    );
  return (
    <>
      <Sentinel onVisible={onLoad} disabled={disabled} rearm={count} />
      <Spinner />
    </>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="loading-row" role="status">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="empty">
      <p>{t("loadFailed")}</p>
      <button type="button" className="btn-outline" onClick={onRetry}>
        {t("retry")}
      </button>
    </div>
  );
}

// ---------- 시트 ----------

export function Sheet({ title, onClose, children }: { title?: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="sheet-root" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function ConfirmSheet({ message, confirmLabel, onConfirm, onClose, danger = true }: { message: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean }) {
  const { t } = useI18n();
  return (
    <Sheet onClose={onClose}>
      <p className="sheet-message">{message}</p>
      <div className="sheet-actions">
        <button type="button" className="btn-outline" onClick={onClose}>
          {t("close")}
        </button>
        <button
          type="button"
          className={danger ? "btn-danger" : "btn-primary"}
          onClick={() => {
            onClose();
            onConfirm();
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  );
}
