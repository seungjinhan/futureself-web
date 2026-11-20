import { useI18n } from "../i18n/I18nContext";
import { PRIVACY_POLICY, WEB_PRIVACY_POLICY } from "../i18n/privacyPolicy";
import { fill } from "../lib/format";
import { SUPPORT_EMAIL } from "../lib/links";
import { IS_WEB } from "../lib/platform";

export function PrivacyScreen() {
  const { t, language } = useI18n();
  const policy = (IS_WEB ? WEB_PRIVACY_POLICY : PRIVACY_POLICY)[language];
  return (
    <main className="screen policy">
      <h1 className="page-title">{t("morePrivacy")}</h1>
      <p className="policy-date">{policy.effective}</p>
      {policy.sections.map((section) => (
        <section key={section.heading}>
          <h2>{section.heading}</h2>
          {section.body.map((line) => (
            <p key={line}>{fill(line, { email: SUPPORT_EMAIL })}</p>
          ))}
        </section>
      ))}
    </main>
  );
}
