import { useState } from "react";
import avatar from "../assets/avatar.jpg";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { ENTRY_TYPES, type Entry, type EntryType, type HomeData } from "../lib/types";
import { ChipRow, EntryThumb, LoadFailed, RatingBadge, Spinner, typeLabelKey } from "./common";
import { EntryRow } from "./EntryRow";

const NEW_LABEL: Record<EntryType, keyof Messages> = { youtube: "newYoutube", book: "newBook", sns: "newSns" };
type TopFilter = EntryType | "all";

interface Props {
  home: HomeData | null;
  status: "loading" | "ready" | "error";
  onRetry: () => void;
  onOpen: (entry: Entry, source: string) => void;
}

function HeroCard({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <article className="hero-card">
      <div className="hero-text">
        <span className="hero-kicker">{t(NEW_LABEL[entry.type])}</span>
        <h3 className="hero-title">{entry.title}</h3>
        {entry.author && <p className="hero-author">{entry.author}</p>}
        <div className="hero-foot">
          <button type="button" className="btn-lime" onClick={onOpen}>
            {t("seeDetail")}
          </button>
          <RatingBadge rating={entry.rating} type={entry.type} />
        </div>
      </div>
      <EntryThumb entry={entry} size="hero" />
    </article>
  );
}

export function DashboardScreen({ home, status, onRetry, onOpen }: Props) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<TopFilter>("all");
  const recent = home ? ENTRY_TYPES.map((type) => home.recent[type]).filter((entry): entry is Entry => Boolean(entry)) : [];
  const top = home ? home.top[filter] : [];

  return (
    <main className="screen dashboard">
      <header className="greeting">
        <img className="greeting-avatar" src={avatar} alt="" />
        <div>
          <h1 className="greeting-name">{t("appName")}</h1>
          <p className="greeting-sub">{t("tagline")}</p>
        </div>
      </header>

      {!home && status === "loading" && <Spinner label={t("loading")} />}
      {!home && status === "error" && <LoadFailed onRetry={onRetry} />}
      {home && recent.length === 0 && <p className="empty">{t("emptyHome")}</p>}

      {recent.length > 0 && (
        <section className="hero-list" aria-label={t("newYoutube")}>
          {recent.map((entry) => (
            <HeroCard key={entry.id} entry={entry} onOpen={() => onOpen(entry, "dashboard_recent")} />
          ))}
        </section>
      )}

      {home && home.top.all.length > 0 && (
        <section className="section">
          <h2 className="section-title">{t("topTitle")}</h2>
          <ChipRow
            wrap
            label={t("topTitle")}
            value={filter}
            onChange={setFilter}
            options={[{ id: "all" as TopFilter, label: t("filterAll") }, ...ENTRY_TYPES.map((type) => ({ id: type as TopFilter, label: t(typeLabelKey(type)) }))]}
          />
          {top.length === 0 ? (
            <p className="empty small">{t("emptyTop")}</p>
          ) : (
            <div className="entry-list">
              {top.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onOpen={(item) => onOpen(item, "dashboard_top")} />
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
