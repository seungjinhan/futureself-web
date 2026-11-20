import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import { LANGUAGES } from "../i18n/languages";
import type { Messages } from "../i18n/messages";
import { fetchPendingCount } from "../lib/api";
import { SUPPORT_EMAIL } from "../lib/links";
import { openExternal } from "../lib/platform";
import type { EntryType } from "../lib/types";
import { Sheet } from "./common";
import { AdminIcon, BookIcon, CheckIcon, CommentIcon, GlobeIcon, InfoIcon, LinkIcon, LockIcon, MailIcon, PaletteIcon, PlayIcon } from "./icons";

interface Props {
  isAdmin: boolean;
  isActive: boolean;
  version: number;
  onOpenPrivacy: () => void;
  onOpenDesign: () => void;
  onOpenAdminComments: () => void;
  onOpenAdminEntries: (type: EntryType) => void;
  onOpenAdminLogin: () => void;
  onSignOut: () => void;
}

function Tile({ icon, label, onClick, danger = false, badge }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; badge?: number }) {
  return (
    <button type="button" className={`tile${danger ? " is-danger" : ""}`} onClick={onClick}>
      <span className="tile-icon">{icon}</span>
      <span className="tile-label">{label}</span>
      {badge ? <span className="tile-badge">{badge}</span> : null}
    </button>
  );
}

export function MoreScreen({ isAdmin, isActive, version, onOpenPrivacy, onOpenDesign, onOpenAdminComments, onOpenAdminEntries, onOpenAdminLogin, onSignOut }: Props) {
  const { t, language, setLanguage } = useI18n();
  const [sheet, setSheet] = useState<"language" | "source" | null>(null);
  const [pending, setPending] = useState(0);

  // 관리자에게는 승인을 기다리는 댓글 수를 보여줘요.
  useEffect(() => {
    if (!isAdmin || !isActive) return;
    let alive = true;
    fetchPendingCount()
      .then((count) => alive && setPending(count))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [isAdmin, isActive, version]);

  const adminTiles: { label: keyof Messages; icon: ReactNode; type: EntryType }[] = [
    { label: "adminYoutube", icon: <PlayIcon />, type: "youtube" },
    { label: "adminBook", icon: <BookIcon />, type: "book" },
    { label: "adminSns", icon: <LinkIcon />, type: "sns" },
  ];

  return (
    <main className="screen">
      <header className="page-head">
        <h1 className="page-title">{t("tabMore")}</h1>
      </header>
      <div className="tile-grid">
        <Tile icon={<GlobeIcon />} label={t("moreLanguage")} onClick={() => setSheet("language")} />
        <Tile icon={<PaletteIcon />} label={t("moreDesign")} onClick={onOpenDesign} />
        <Tile icon={<LockIcon />} label={t("morePrivacy")} onClick={onOpenPrivacy} />
        <Tile icon={<MailIcon />} label={t("moreContact")} onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}`)} />
        <Tile icon={<InfoIcon />} label={t("moreSource")} onClick={() => setSheet("source")} />
        {/* 관리자 기능은 운영자 계정으로 로그인해야 쓸 수 있어요(안드로이드와 같아요). */}
        {!isAdmin && <Tile danger icon={<AdminIcon />} label={t("moreAdmin")} onClick={onOpenAdminLogin} />}
      </div>

      {isAdmin && (
        <section className="section admin-section">
          <div className="section-head">
            <h2 className="section-title danger">{t("adminSection")}</h2>
            <button type="button" className="link-button danger" onClick={onSignOut}>
              {t("logout")}
            </button>
          </div>
          <div className="tile-grid">
            <Tile danger icon={<CommentIcon size={24} />} label={t("adminComments")} badge={pending} onClick={onOpenAdminComments} />
            {adminTiles.map((tile) => (
              <Tile key={tile.type} danger icon={tile.icon} label={t(tile.label)} onClick={() => onOpenAdminEntries(tile.type)} />
            ))}
          </div>
        </section>
      )}

      {sheet === "language" && (
        <Sheet title={t("moreLanguage")} onClose={() => setSheet(null)}>
          <ul className="option-list">
            {LANGUAGES.map((option) => (
              <li key={option.code}>
                <button
                  type="button"
                  className={`option${option.code === language ? " is-active" : ""}`}
                  onClick={() => {
                    setLanguage(option.code);
                    setSheet(null);
                  }}
                >
                  {option.label}
                  {option.code === language && <CheckIcon />}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
      {sheet === "source" && (
        <Sheet title={t("moreSource")} onClose={() => setSheet(null)}>
          <p className="sheet-message">{t("sourceNote")}</p>
          <button type="button" className="btn-primary block" onClick={() => setSheet(null)}>
            {t("close")}
          </button>
        </Sheet>
      )}
    </main>
  );
}
