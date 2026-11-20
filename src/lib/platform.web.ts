// 웹판(GitHub Pages)에서 platform.ts 대신 쓰는 파일이에요. vite.config.ts가 `--mode web`일 때만 바꿔 끼워요.
// 토스 SDK 없이 브라우저 기능만 써요. 내보내는 이름은 platform.ts와 같아야 해요(platform.test.ts가 확인해요).

export const IS_WEB = true;

export const STORAGE_KEYS = {
  home: "home",
  language: "language",
  theme: "theme",
  layout: "layout",
  sort: "sort",
  draft: "draft",
} as const;

const PREFIX = "futureself:";

/** 웹판은 앱인토스 분석이 없어서 이용 기록을 남기지 않아요. */
export function logEvent(_name: string, _params: Record<string, string> = {}): void {}

export function logClientError(_kind: string, _error: unknown): void {}

export function watchErrors(): void {}

export function deviceLocale(): string {
  return navigator.language;
}

export function openExternal(url: string): void {
  // 메일 링크를 새 탭으로 열면 빈 탭이 남아서 지금 창에서 열어요.
  if (url.startsWith("mailto:")) window.location.href = url;
  else window.open(url, "_blank", "noopener");
}

export async function loadJson(key: string): Promise<unknown> {
  try {
    const value = localStorage.getItem(PREFIX + key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 저장에 실패해도 화면은 그대로 써요.
  }
}
