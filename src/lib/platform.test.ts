import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY, WEB_PRIVACY_POLICY } from "../i18n/privacyPolicy";
import * as toss from "./platform";
import * as web from "./platform.web";

describe("웹판 platform", () => {
  it("토스판과 같은 이름을 내보내요", () => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(toss).sort());
    expect(web.STORAGE_KEYS).toEqual(toss.STORAGE_KEYS);
    expect([toss.IS_WEB, web.IS_WEB]).toEqual([false, true]);
  });

  it("웹판 개인정보처리방침에는 토스 저장 공간·앱인토스 분석 이야기가 없어요", () => {
    for (const language of ["ko", "en"] as const) {
      const text = JSON.stringify(WEB_PRIVACY_POLICY[language]);
      expect(text).not.toMatch(/앱인토스|토스 앱 저장|Apps in Toss|Toss app's storage/);
      expect(text).toMatch(/GitHub/);
      expect(WEB_PRIVACY_POLICY[language].sections.map((section) => section.heading)).toEqual(PRIVACY_POLICY[language].sections.map((section) => section.heading));
    }
  });
});
