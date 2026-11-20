import { Analytics, Device, Storage } from "@apps-in-toss/web-framework";

/** 웹판(GitHub Pages)에서는 platform.web.ts가 이 파일을 대신해요. */
export const IS_WEB = false;

export const STORAGE_KEYS = {
  home: "home",
  language: "language",
  theme: "theme",
  layout: "layout",
  sort: "sort",
  draft: "draft",
} as const;

export function logEvent(name: string, params: Record<string, string> = {}): void {
  try {
    Analytics.log({ log_name: name, log_type: "event", params }).catch(() => undefined);
  } catch {
    // 기록은 부가 기능이라 실패해도 흐름을 막지 않아요.
  }
}

const MAX_ERROR_LOGS = 5;
let errorLogs = 0;

/** 앱이 깨져도 운영자가 알 수 있게 앱을 켤 때마다 5건까지 남겨요. */
export function logClientError(kind: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (errorLogs >= MAX_ERROR_LOGS || message.startsWith("ResizeObserver loop")) return;
  errorLogs += 1;
  const where = error instanceof Error ? (error.stack?.split("\n").find((line) => /:\d+:\d+/.test(line))?.trim() ?? "") : "";
  logEvent("client_error", { kind, message: message.slice(0, 120), where: where.slice(0, 120) });
}

export function watchErrors(): void {
  window.addEventListener("error", (event) => logClientError("error", event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => logClientError("rejection", event.reason));
}

/** 토스 앱의 로케일을 읽어요. 토스 앱 밖에서는 브라우저 언어를 써요. */
export function deviceLocale(): string {
  try {
    return Device.locale || navigator.language;
  } catch {
    return navigator.language;
  }
}

export function openExternal(url: string): void {
  try {
    Device.openURL(url).catch(() => undefined);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export async function loadJson(key: string): Promise<unknown> {
  try {
    const value = await Storage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    Storage.setItem(key, JSON.stringify(value)).catch(() => undefined);
  } catch {
    // 저장에 실패해도 화면은 그대로 써요.
  }
}
