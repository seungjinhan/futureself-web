import type { ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import type { Messages } from "../i18n/messages";
import { BookIcon, HomeIcon, LinkIcon, MoreIcon, PlayIcon } from "./icons";

export type Tab = "dashboard" | "youtube" | "book" | "sns" | "more";

const TABS: { id: Tab; label: keyof Messages; icon: ReactNode }[] = [
  { id: "dashboard", label: "tabDashboard", icon: <HomeIcon /> },
  { id: "youtube", label: "tabYoutube", icon: <PlayIcon /> },
  { id: "book", label: "tabBook", icon: <BookIcon /> },
  { id: "sns", label: "tabSns", icon: <LinkIcon /> },
  { id: "more", label: "tabMore", icon: <MoreIcon /> },
];

/** 기본(카드형)은 시안처럼 진한 막대에 아이콘만 보여주고, 선택된 메뉴를 포인트색 원으로 표시해요. 이름은 스크린리더가 읽고, 목록형 화면 구성에서는 글자로도 보여요. */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  const { t } = useI18n();
  return (
    <nav className="tab-bar">
      {TABS.map(({ id, label, icon }) => (
        <button key={id} type="button" className={`tab${tab === id ? " is-active" : ""}`} aria-label={t(label)} aria-current={tab === id ? "page" : undefined} onClick={() => onChange(id)}>
          <span className="tab-icon">{icon}</span>
          <span className="tab-label" aria-hidden="true">
            {t(label)}
          </span>
        </button>
      ))}
    </nav>
  );
}
