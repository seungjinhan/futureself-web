// 서버(구글 시트)에 불러오기·저장·수정·삭제를 요청하는 동안 화면 맨 위 진행 막대를 보여주려고 진행 중인 요청 수를 세요.
let pending = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** 요청이 끝날 때까지(성공이든 실패든) 진행 중으로 세요. */
export function track<T>(run: () => Promise<T>): Promise<T> {
  pending += 1;
  emit();
  return run().finally(() => {
    pending -= 1;
    emit();
  });
}

export function subscribeProgress(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isBusy(): boolean {
  return pending > 0;
}
