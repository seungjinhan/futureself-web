import { describe, expect, it } from "vitest";
import { isBusy, subscribeProgress, track } from "./progress";

describe("진행 막대", () => {
  it("요청이 하나라도 진행 중이면 보이고, 모두 끝나면 사라져요", async () => {
    const seen: boolean[] = [];
    const stop = subscribeProgress(() => seen.push(isBusy()));
    let finishA!: () => void;
    let finishB!: () => void;
    const a = track(() => new Promise<void>((resolve) => (finishA = resolve)));
    const b = track(() => new Promise<void>((resolve) => (finishB = resolve)));
    expect(isBusy()).toBe(true);
    finishA();
    await a;
    expect(isBusy()).toBe(true);
    finishB();
    await b;
    expect(isBusy()).toBe(false);
    stop();
    expect(seen).toEqual([true, true, true, false]);
  });

  it("요청이 실패해도 진행 막대는 사라져요", async () => {
    await expect(track(() => Promise.reject(new Error("failed")))).rejects.toThrow("failed");
    expect(isBusy()).toBe(false);
  });
});
