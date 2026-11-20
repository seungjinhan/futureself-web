import { useState } from "react";
import { useAdmin } from "../admin";
import { useI18n } from "../i18n/I18nContext";
import { ApiError } from "../lib/api";
import { useToast } from "./common";

/** 더보기 > 관리자. 운영자 계정(이메일·비밀번호)으로 로그인해야 관리자 기능을 쓸 수 있어요. 관리자인지는 서버(admins 목록과 보안 규칙)가 확인해요. */
export function AdminLoginScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const { signIn } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = email.trim() !== "" && password !== "" && !busy;

  const login = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await signIn(email, password);
      toast("loggedIn");
      onDone();
    } catch (error) {
      const code = error instanceof ApiError ? error.message : "";
      toast(code === "wrong_credentials" ? "errorLogin" : code === "not_admin" ? "errorNotAdmin" : "errorLoginFailed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen admin login">
      <h1 className="page-title danger">{t("adminLogin")}</h1>
      <p className="login-note">{t("adminLoginNote")}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void login();
        }}
      >
        <label className="field">
          <span className="field-label">{t("fieldEmail")}</span>
          <input className="input" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} readOnly={busy} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">{t("fieldPassword")}</span>
          <input className="input" type="password" autoComplete="current-password" value={password} readOnly={busy} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit" className={`btn-danger block${busy ? " is-busy" : ""}`} disabled={!ready}>
          {busy && <span className="spinner small on-dark" aria-hidden="true" />}
          {t(busy ? "loggingIn" : "login")}
        </button>
      </form>
    </main>
  );
}
