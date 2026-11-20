import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "./messages";
import { TOSS_MESSAGES } from "./tossMessages";

const SRC = new URL("..", import.meta.url).pathname;
/** 웹판 빌드에서 빠지는 토스판 전용 파일이에요. */
const TOSS_ONLY = ["components/AdminCommentsScreen.tsx", "components/AdminEntriesScreen.tsx", "components/AdminLoginScreen.tsx", "components/DesignScreen.tsx", "components/EntryFormScreen.tsx", "admin.tsx"];
/** 웹판에도 있는 파일이지만 `!IS_WEB`로 막힌 곳에서만 쓰는 글자예요(더보기 관리자 영역, 상세의 수정 버튼, 로그아웃 알림). "adminLogin"은 화면 이름으로도 써요. */
const GATED = ["adminSection", "logout", "loggedOut", "adminComments", "adminYoutube", "adminBook", "adminSns", "editEntry", "adminLogin"];

function sourceFiles(dir: string): string[] {
  return readdirSync(join(SRC, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : [];
  });
}

describe("토스판 전용 글자(tossMessages.ts)", () => {
  const tossKeys = Object.keys(TOSS_MESSAGES.ko);

  it("기본 글자와 겹치지 않고, 두 언어 모두 있어요", () => {
    const baseKeys = Object.keys(MESSAGES.ko).filter((key) => !tossKeys.includes(key));
    expect(tossKeys.filter((key) => baseKeys.includes(key))).toEqual([]);
    expect(Object.keys(TOSS_MESSAGES.en).sort()).toEqual([...tossKeys].sort());
  });

  it("웹판에 들어가는 화면은 토스판 전용 글자를 쓰지 않아요", () => {
    const webFiles = sourceFiles("").filter((file) => !TOSS_ONLY.includes(file) && !file.startsWith("i18n/"));
    const misuse = webFiles.flatMap((file) => {
      const text = readFileSync(join(SRC, file), "utf8");
      return tossKeys.filter((key) => !GATED.includes(key) && new RegExp(`["\`]${key}["\`]`).test(text)).map((key) => `${file}: ${key}`);
    });
    expect(misuse).toEqual([]);
  });
});
