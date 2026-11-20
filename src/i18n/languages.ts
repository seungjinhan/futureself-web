export const LANGUAGES = [
  { code: "ko", label: "한국어", locale: "ko-KR" },
  { code: "en", label: "English", locale: "en-US" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

const FALLBACK: Language = "en";

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.some((l) => l.code === value);
}

/** 기기 로케일(ko-KR, en_US 등)을 지원하는 언어로 바꿔요. */
export function matchLanguage(locale: string): Language {
  const [base] = locale.replace(/_/g, "-").toLowerCase().split("-");
  return isLanguage(base) ? base : FALLBACK;
}

export function localeOf(language: Language): string {
  return LANGUAGES.find((l) => l.code === language)!.locale;
}
