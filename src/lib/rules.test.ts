import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DAY_LIMIT, DAY_MS, displayNumber, linkKey, MINUTE_LIMIT, MINUTE_MS, nextWindow, normalizeTags, sortTagCounts } from "./rules";

// 예전 서버(Code.gs)의 함수를 그대로 꺼내 같은 답을 내는지 비교해요. 이미 Firestore에 저장된 linkKey와 맞아야 중복을 잡아요.
// apps-script/는 공개 저장소(웹판)에 올리지 않아서, 파일이 없는 GitHub Actions에서는 이 비교만 건너뛰어요.
const CODE_GS = new URL("../../apps-script/Code.gs", import.meta.url);
const HAS_SERVER = existsSync(CODE_GS);
const server = (HAS_SERVER ? new Function(`${readFileSync(CODE_GS, "utf8")}; return { linkKey, normalizeTags };`)() : null) as { linkKey: (type: string, url: string) => string; normalizeTags: (input: string[]) => string[] };

/** 안드로이드(links.dart)의 displayNumber를 64비트 정수 계산 그대로 옮긴 거예요. */
function androidDisplayNumber(uid: string): string {
  let hash = 0x811c9dc5n;
  for (let i = 0; i < uid.length; i++) hash = ((hash ^ BigInt(uid.charCodeAt(i))) * 0x01000193n) & 0xffffffffn;
  return String(hash % 10000n).padStart(4, "0");
}

describe("저장 규칙", () => {
  it.skipIf(!HAS_SERVER).each([
    ["youtube", "https://youtu.be/dQw4w9WgXcQ?si=abc"],
    ["youtube", "https://www.youtube.com/shorts/dQw4w9WgXcQ"],
    ["sns", "https://www.instagram.com/p/AbC123/?igsh=xyz"],
    ["sns", "https://twitter.com/user/status/1?ref_src=twsrc"],
    ["sns", "https://m.blog.naver.com/PostView.naver?logNo=2&blogId=me&utm_source=x"],
    ["sns", "https://example.com/a/b/"],
    ["sns", "not a link"],
  ])("linkKey(%s, %s)가 예전 서버와 같아요", (type, url) => {
    expect(linkKey(type as "youtube" | "sns", url)).toBe(server.linkKey(type, url));
  });

  it.skipIf(!HAS_SERVER)("태그 정리가 예전 서버와 같아요", () => {
    const input = ["#Morning Routine", "습관,습관", "아주아주긴태그이름입니다", "a", "b", "c"];
    expect(normalizeTags(input)).toEqual(server.normalizeTags(input));
  });

  it.each(["", "a", "AbCdEfGhIjKlMnOpQrStUvWxYz12", "x7Kp2mQ9vR4tL8nB3cZ6wY1sD5f"])("익명 번호가 안드로이드와 같고 네 자리 숫자예요: %s", (uid) => {
    expect(displayNumber(uid)).toBe(androidDisplayNumber(uid));
    expect(displayNumber(uid)).toMatch(/^[0-9]{4}$/);
  });

  it("태그는 많이 쓴 순, 같으면 가나다순이에요", () => {
    expect(sortTagCounts({ 습관: 2, 아침: 3, 기록: 2 }).map((item) => item.tag)).toEqual(["아침", "기록", "습관"]);
  });
});

describe("댓글 제한 (firestore.rules의 isNextWindow와 같아야 해요)", () => {
  const now = 1_000_000_000_000;

  it("처음이면 새 창을 열어요", () => {
    expect(nextWindow(null, 0, MINUTE_MS, MINUTE_LIMIT, now)).toBe("new");
  });

  it("기간 안에서는 한도까지 1씩 늘려요", () => {
    expect(nextWindow(now - 10_000, 2, MINUTE_MS, MINUTE_LIMIT, now)).toBe(3);
    expect(nextWindow(now - 10_000, MINUTE_LIMIT, MINUTE_MS, MINUTE_LIMIT, now)).toBe("limit");
    expect(nextWindow(now - 3_600_000, DAY_LIMIT, DAY_MS, DAY_LIMIT, now)).toBe("limit");
  });

  it("기간이 지나면(시계 여유 5초 포함) 새 창이에요", () => {
    expect(nextWindow(now - MINUTE_MS - 5_000, 3, MINUTE_MS, MINUTE_LIMIT, now)).toBe("new");
    expect(nextWindow(now - MINUTE_MS - 1_000, 1, MINUTE_MS, MINUTE_LIMIT, now)).toBe(2);
  });
});
