import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { logEvent, saveJson, STORAGE_KEYS } from "../lib/platform";
import { applyLayout, applyTheme, currentLayout, currentTheme, LAYOUTS, THEMES, type Layout, type Theme } from "../lib/theme";
import { CheckIcon } from "./icons";

const THEME_LABELS: Record<Theme, { name: keyof Messages; note: keyof Messages }> = {
  default: { name: "themeDefault", note: "themeDefaultNote" },
  neutral: { name: "themeNeutral", note: "themeNeutralNote" },
  butter: { name: "themeButter", note: "themeButterNote" },
  chocolate: { name: "themeChocolate", note: "themeChocolateNote" },
  matcha: { name: "themeMatcha", note: "themeMatchaNote" },
  stone: { name: "themeStone", note: "themeStoneNote" },
  y2k: { name: "themeY2k", note: "themeY2kNote" },
  blossom: { name: "themeBlossom", note: "themeBlossomNote" },
  ocean: { name: "themeOcean", note: "themeOceanNote" },
  lavender: { name: "themeLavender", note: "themeLavenderNote" },
  sunset: { name: "themeSunset", note: "themeSunsetNote" },
};

const LAYOUT_LABELS: Record<Layout, { name: keyof Messages; note: keyof Messages }> = {
  card: { name: "layoutCard", note: "layoutCardNote" },
  list: { name: "layoutList", note: "layoutListNote" },
  gallery: { name: "layoutGallery", note: "layoutGalleryNote" },
};

/** 그 테마의 변수로 그린 미리보기예요. data-theme을 붙이면 그 안에서만 그 테마 색이 적용돼요. */
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <span className="theme-preview" data-theme={theme} aria-hidden="true">
      <span className="theme-preview-hero">
        <span className="theme-preview-pill" />
      </span>
      <span className="theme-preview-row">
        <span className="theme-preview-chip" />
        <span className="theme-preview-text" />
        <span className="theme-preview-star" />
      </span>
    </span>
  );
}

/** 화면 구성을 작게 그린 미리보기예요. 목록 모양과 하단 메뉴 모양을 보여줘요. */
function LayoutPreview({ layout }: { layout: Layout }) {
  return (
    <span className={`layout-preview is-${layout}`} aria-hidden="true">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className="lp-item" />
      ))}
      <span className="lp-bar">
        <span className="lp-dot is-on" />
        <span className="lp-dot" />
        <span className="lp-dot" />
      </span>
    </span>
  );
}

/** 더보기 > 디자인. 고르는 즉시 적용하고 기기에 저장해요. 서버에는 보내지 않아요. */
export function DesignScreen() {
  const { t } = useI18n();
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const [layout, setLayout] = useState<Layout>(currentLayout);

  const chooseTheme = (next: Theme) => {
    applyTheme(next);
    saveJson(STORAGE_KEYS.theme, next);
    setTheme(next);
    logEvent("theme_change", { theme: next });
  };

  const chooseLayout = (next: Layout) => {
    applyLayout(next);
    saveJson(STORAGE_KEYS.layout, next);
    setLayout(next);
    logEvent("layout_change", { layout: next });
  };

  return (
    <main className="screen design">
      <h1 className="page-title">{t("moreDesign")}</h1>

      <section>
        <h2 className="section-title">{t("designLayout")}</h2>
        <div className="design-grid is-three" role="radiogroup" aria-label={t("designLayout")}>
          {LAYOUTS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={id === layout} className={`design-card${id === layout ? " is-active" : ""}`} onClick={() => chooseLayout(id)}>
              <LayoutPreview layout={id} />
              <span className="design-name">{t(LAYOUT_LABELS[id].name)}</span>
              <span className="design-note">{t(LAYOUT_LABELS[id].note)}</span>
              {id === layout && (
                <span className="design-check">
                  <CheckIcon />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">{t("designTheme")}</h2>
        <div className="design-grid" role="radiogroup" aria-label={t("designTheme")}>
          {THEMES.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={id === theme} className={`design-card${id === theme ? " is-active" : ""}`} onClick={() => chooseTheme(id)}>
              <ThemePreview theme={id} />
              <span className="design-name">{t(THEME_LABELS[id].name)}</span>
              <span className="design-note">{t(THEME_LABELS[id].note)}</span>
              {id === theme && (
                <span className="design-check">
                  <CheckIcon />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
