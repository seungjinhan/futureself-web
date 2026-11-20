import { useSyncExternalStore } from "react";
import { useI18n } from "../i18n/I18nContext";
import { isBusy, subscribeProgress } from "../lib/progress";

/** 서버에서 불러오거나 저장·수정·삭제하는 동안 화면 맨 위에 움직이는 진행 막대예요. */
export function GlobalProgress() {
  const { t } = useI18n();
  const busy = useSyncExternalStore(subscribeProgress, isBusy);
  return busy ? <div className="global-progress" role="progressbar" aria-label={t("loading")} /> : null;
}
