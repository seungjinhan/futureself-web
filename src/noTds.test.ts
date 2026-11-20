import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("앱 코드는 TDS를 불러오지 않아요. Provider 없이 쓰면 흰 화면이 되고 번들이 다섯 배로 커져요", () => {
  const root = new URL(".", import.meta.url).pathname;
  const files = (readdirSync(root, { recursive: true }) as string[]).filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".test.ts"));
  expect(files.length).toBeGreaterThan(10);
  const users = files.filter((file) => /from\s+"@toss\/tds/.test(readFileSync(join(root, file), "utf8")));
  expect(users).toEqual([]);
});
