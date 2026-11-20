// 디자인 목록이에요. 사용자가 더보기 > 디자인에서 색 테마와 화면 구성을 따로 골라요.
// 색과 모서리 값은 styles.css의 [data-theme="…"] 묶음에, 화면 구성 규칙은 [data-layout="…"]에 있고, 여기서는 고르고 적용하는 일만 해요.

/** 색 테마예요. default~y2k는 Astryx 테마를 참고했고, blossom부터는 이 앱에서 더했어요. */
export const THEMES = ["default", "neutral", "butter", "chocolate", "matcha", "stone", "y2k", "blossom", "ocean", "lavender", "sunset"] as const;
export type Theme = (typeof THEMES)[number];

/** 화면 구성이에요. card는 기본(떠 있는 아이콘 메뉴, 카드 목록), list는 글자 있는 하단 메뉴와 줄 목록, gallery는 큰 썸네일 2열이에요. */
export const LAYOUTS = ["card", "list", "gallery"] as const;
export type Layout = (typeof LAYOUTS)[number];

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

export function isLayout(value: unknown): value is Layout {
  return LAYOUTS.includes(value as Layout);
}

/** 화면 전체에 색 테마를 적용해요. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

/** 화면 전체에 화면 구성을 적용해요. */
export function applyLayout(layout: Layout): void {
  document.documentElement.dataset.layout = layout;
}

export function currentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "default";
}

export function currentLayout(): Layout {
  const value = document.documentElement.dataset.layout;
  return isLayout(value) ? value : "card";
}
