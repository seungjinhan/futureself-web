// 웹판(GitHub Pages)에는 토스판 전용 화면의 글자를 넣지 않아요(tossMessages.ts 참고).
import type { TOSS_MESSAGES as Full } from "./tossMessages";

export const TOSS_MESSAGES = { ko: {}, en: {} } as typeof Full;
