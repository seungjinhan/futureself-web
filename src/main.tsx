import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AdminProvider } from "./admin";
import { App, type Sorts } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/common";
import { GlobalProgress } from "./components/GlobalProgress";
import { I18nProvider } from "./i18n/I18nContext";
import { isLanguage, matchLanguage } from "./i18n/languages";
import { deviceLocale, IS_WEB, loadJson, STORAGE_KEYS, watchErrors } from "./lib/platform";
import { applyLayout, applyTheme, isLayout, isTheme } from "./lib/theme";
import { ENTRY_TYPES, type HomeData } from "./lib/types";
import "./styles.css";

watchErrors();
// 웹판은 넓은 화면에서 가운데 휴대폰 폭으로 보여줘요(styles.css의 .is-web).
if (IS_WEB) document.documentElement.classList.add("is-web");

const [home, language, sorts, theme, layout] = await Promise.all([loadJson(STORAGE_KEYS.home), loadJson(STORAGE_KEYS.language), loadJson(STORAGE_KEYS.sort), loadJson(STORAGE_KEYS.theme), loadJson(STORAGE_KEYS.layout)]);

// 화면을 그리기 전에 고른 디자인을 적용해요.
applyTheme(isTheme(theme) ? theme : "default");
applyLayout(isLayout(layout) ? layout : "card");

function restoreHome(value: unknown): HomeData | null {
  const data = value as HomeData | null;
  return data && typeof data === "object" && data.recent && data.top && Array.isArray(data.top.all) ? data : null;
}

function restoreSorts(value: unknown): Sorts {
  const saved = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(ENTRY_TYPES.map((type) => [type, saved[type] === "rating" ? "rating" : "latest"])) as Sorts;
}

const app = <ErrorBoundary>{(recovered) => <App initialHome={recovered ? null : restoreHome(home)} initialSorts={restoreSorts(sorts)} />}</ErrorBoundary>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider initial={isLanguage(language) ? language : matchLanguage(deviceLocale())}>
      <ToastProvider>
        <GlobalProgress />
        {/* 웹판에는 관리자 기능이 없어서 AdminProvider(관리자 로그인 복원)를 넣지 않아요. useAdmin()은 늘 관리자가 아니에요. */}
        {IS_WEB ? app : <AdminProvider>{app}</AdminProvider>}
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
);
