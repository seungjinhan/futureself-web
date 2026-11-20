import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LAYOUTS, THEMES } from "./theme";

// 기본 테마는 styles.css에, 나머지 테마와 화면 구성은 토스판 전용 styles.toss.css에 있어요. 둘을 합쳐서 봐요.
const CSS = ["../styles.css", "../styles.toss.css"].map((file) => readFileSync(new URL(file, import.meta.url), "utf8")).join("\n");

/** styles.css에서 [data-theme="이름"] 묶음의 변수를 읽어요. */
function tokensOf(theme: string): Record<string, string> {
  const match = new RegExp(`\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`).exec(CSS);
  if (!match) throw new Error(`테마 묶음이 없어요: ${theme}`);
  return Object.fromEntries([...match[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [글자, 바탕, 최소 대비]. 본문은 4.5, 큰 제목과 보조 글자는 3 이상이에요(WCAG AA). */
const PAIRS: [string, string, number][] = [
  ["#ffffff", "--primary", 4.5], // 하단 메뉴, 큰 카드, 주요 버튼의 흰 글자
  ["--accent", "--primary", 4.5], // 큰 카드의 작은 제목
  ["--on-accent", "--accent", 4.5],
  ["--primary", "--mint", 4.5], // 칩 글자
  ["--ink", "--bg", 7],
  ["--ink", "--surface", 7],
  ["--ink", "--surface-2", 7],
  ["--ink", "--mint", 7],
  ["--ink-2", "--bg", 4.5],
  ["--ink-2", "--surface", 4.5],
  ["--ink-3", "--bg", 3],
  ["--ink-3", "--surface", 3],
  ["--primary-2", "--bg", 4.5], // 태그, 개수
  ["--primary-2", "--surface", 4.5],
  ["--star-ink", "--star-soft", 4.5],
];

describe("디자인(테마)", () => {
  const base = Object.keys(tokensOf("default")).sort();

  it("고를 수 있는 테마마다 styles.css에 변수 묶음이 있어요", () => {
    const inCss = [...CSS.matchAll(/^\[data-theme="([\w-]+)"\]\s*\{/gm)].map((m) => m[1]).sort();
    expect(inCss).toEqual([...THEMES].sort());
  });

  it("어두운 테마는 없어요. 토스 비게임 체크리스트가 라이트 모드를 요구해요", () => {
    for (const theme of THEMES) expect(luminance(tokensOf(theme)["--bg"]), theme).toBeGreaterThan(0.5);
    expect(CSS).not.toMatch(/color-scheme:\s*dark/);
  });

  it.each(THEMES)("%s: 바탕과 글자는 테마 색으로 물들이지 않아요. 한 가지 색이 화면을 덮으면 과해 보여요", (theme) => {
    const tokens = tokensOf(theme);
    // 색 채널의 가장 큰 값과 작은 값의 차이예요. 0이면 완전한 회색이에요.
    const spread = (hex: string) => {
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return Math.max(...channels) - Math.min(...channels);
    };
    expect(luminance(tokens["--bg"]), "--bg 밝기").toBeGreaterThan(0.85);
    expect(spread(tokens["--bg"]), "--bg").toBeLessThanOrEqual(20);
    expect(spread(tokens["--surface"]), "--surface").toBeLessThanOrEqual(8);
    expect(spread(tokens["--ink"]), "--ink").toBeLessThanOrEqual(20);
  });

  it.each(THEMES)("%s: 기본 테마의 색 변수를 모두 정해요", (theme) => {
    // 빠진 변수가 있으면 미리보기에 다른 테마 색이 섞여요.
    expect(Object.keys(tokensOf(theme)).sort()).toEqual(expect.arrayContaining(base));
  });

  it.each(THEMES)("%s: 글자와 바탕의 대비가 충분해요", (theme) => {
    const tokens = tokensOf(theme);
    const color = (name: string) => (name.startsWith("#") ? name : tokens[name]);
    const failed = PAIRS.filter(([fg, bg, min]) => contrast(color(fg), color(bg)) < min).map(([fg, bg, min]) => `${fg} on ${bg}: ${contrast(color(fg), color(bg)).toFixed(2)} < ${min}`);
    expect(failed).toEqual([]);
  });
});

describe("화면 구성(레이아웃)", () => {
  const inCss = [...new Set([...CSS.matchAll(/\[data-layout="([\w-]+)"\]/g)].map((m) => m[1]))].sort();

  it("기본(card)이 아닌 화면 구성마다 styles.css에 규칙이 있고, 목록에 없는 구성의 규칙은 없어요", () => {
    expect(inCss).toEqual(LAYOUTS.filter((layout) => layout !== "card").sort());
  });

  it("하단 메뉴는 아래쪽 안전 여백을 다 쓰지 않아요. 토스 앱에서 메뉴 아래에 빈 칸이 크게 생겨요", () => {
    const tabBarRules = [...CSS.matchAll(/([^{}]*\.tab-bar[^{}]*)\{([^}]*)\}/g)].map((m) => m[2]);
    expect(tabBarRules.length).toBeGreaterThanOrEqual(2);
    for (const body of tabBarRules) expect(body).not.toContain("--safe-bottom");
    expect(CSS).toMatch(/--tab-safe: calc\(var\(--safe-bottom\) \* 0\.2\);/);
  });

  it("목록형은 하단 메뉴에 글자를 보여주고, 다른 구성에서는 숨겨요", () => {
    expect(CSS).toMatch(/\n\.tab-label \{\s*display: none;/);
    expect(CSS).toMatch(/\[data-layout="list"\] \.tab-label \{\s*display: block;/);
  });
});
