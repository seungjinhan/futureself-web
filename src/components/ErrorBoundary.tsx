import { Component, type ReactNode } from "react";
import { useI18n } from "../i18n/I18nContext";
import { logClientError, saveJson, STORAGE_KEYS } from "../lib/platform";

function FailedScreen({ onRetry }: { onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="placeholder">
      <p>{t("loadFailed")}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        {t("retry")}
      </button>
    </div>
  );
}

interface Props {
  children: (recovered: boolean) => ReactNode;
}

/** 화면이 깨지면 흰 화면 대신 다시 시도를 보여줘요. 저장본 때문일 수 있어서 지우고 서버에서 새로 받아요. */
export class ErrorBoundary extends Component<Props, { failed: boolean; recovered: boolean }> {
  state = { failed: false, recovered: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    saveJson(STORAGE_KEYS.home, null);
    logClientError("render", error);
  }

  render() {
    if (this.state.failed) return <FailedScreen onRetry={() => this.setState({ failed: false, recovered: true })} />;
    return this.props.children(this.state.recovered);
  }
}
