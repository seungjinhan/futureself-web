import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import { LANGUAGES } from "../i18n/languages";
import type { Messages } from "../i18n/messages";
import { fetchPendingCount } from "../lib/api";
import { SUPPORT_EMAIL, TOSS_APP_URL } from "../lib/links";
import { IS_WEB, openExternal } from "../lib/platform";
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

function Tile({ icon, label, onClick, danger = false, disabled = false, badge }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean; badge?: number }) {
  return (
    <button type="button" className={`tile${danger ? " is-danger" : ""}${disabled ? " is-disabled" : ""}`} aria-disabled={disabled || undefined} onClick={onClick}>
      <span className="tile-icon">{icon}</span>
      <span className="tile-label">{label}</span>
      {badge ? <span className="tile-badge">{badge}</span> : null}
      {disabled && (
        <span className="tile-lock">
          <LockIcon />
        </span>
      )}
    </button>
  );
}

export function MoreScreen({ isAdmin, isActive, version, onOpenPrivacy, onOpenDesign, onOpenAdminComments, onOpenAdminEntries, onOpenAdminLogin, onSignOut }: Props) {
  const { t, language, setLanguage } = useI18n();
  const [sheet, setSheet] = useState<"language" | "source" | "appOnly" | null>(null);
  const [pending, setPending] = useState(0);

  // 관리자에게는 승인을 기다리는 댓글 수를 보여줘요.
  useEffect(() => {
    if (IS_WEB || !isAdmin || !isActive) return;
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
        {/* 웹판에서는 언어·디자인·관리자를 흐리게 보여주고, 누르면 토스 앱으로 안내해요. 그 화면들의 코드는 웹판에 넣지 않아요. */}
        <Tile icon={<GlobeIcon />} label={t("moreLanguage")} disabled={IS_WEB} onClick={() => setSheet(IS_WEB ? "appOnly" : "language")} />
        <Tile icon={<PaletteIcon />} label={t("moreDesign")} disabled={IS_WEB} onClick={IS_WEB ? () => setSheet("appOnly") : onOpenDesign} />
        <Tile icon={<LockIcon />} label={t("morePrivacy")} onClick={onOpenPrivacy} />
        <Tile icon={<MailIcon />} label={t("moreContact")} onClick={() => openExternal(`mailto:${SUPPORT_EMAIL}`)} />
        <Tile icon={<InfoIcon />} label={t("moreSource")} onClick={() => setSheet("source")} />
        {/* 관리자 기능은 운영자 계정으로 로그인해야 쓸 수 있어요(안드로이드와 같아요). */}
        {!isAdmin && <Tile danger icon={<AdminIcon />} label={t("moreAdmin")} disabled={IS_WEB} onClick={IS_WEB ? () => setSheet("appOnly") : onOpenAdminLogin} />}
      </div>

      {!IS_WEB && isAdmin && (
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

      {!IS_WEB && sheet === "language" && (
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
      {IS_WEB && sheet === "appOnly" && (
        <Sheet title={t("appOnlyTitle")} onClose={() => setSheet(null)}>
          <p className="sheet-message">{t("appOnlyNote")}</p>
          <div className="sheet-actions">
            <button type="button" className="btn-outline" onClick={() => setSheet(null)}>
              {t("close")}
            </button>
            <a className="btn-primary app-only-link" href={TOSS_APP_URL} target="_blank" rel="noopener" onClick={() => setSheet(null)}>
              {t("appLinkButton")}
            </a>
          </div>
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
