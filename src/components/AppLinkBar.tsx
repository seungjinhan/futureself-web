import { useI18n } from "../i18n/I18nContext";
import { TOSS_APP_URL } from "../lib/links";

/** 웹판에서만 화면 맨 위에 보여요. 토스 미니앱으로 바로 가는 링크예요. */
export function AppLinkBar() {
  const { t } = useI18n();
  return (
    <div className="app-link-bar">
      <img className="app-link-icon" src="./icon-192.png" alt="" width="32" height="32" />
      <div className="app-link-text">
        <strong>{t("appLinkTitle")}</strong>
        <span>{t("appLinkNote")}</span>
      </div>
      <a className="app-link-button" href={TOSS_APP_URL} target="_blank" rel="noopener">
        {t("appLinkButton")}
      </a>
    </div>
  );
}
