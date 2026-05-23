import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  makeLoginKey,
  getLockRemainingSec,
  registerFailure,
  registerSuccess,
  LOCKOUT_ERROR_PREFIX,
} from "@/lib/rate-limit";

// MAX_FAILURES = 5, WINDOW_MS = 15 мин, LOCKOUT_MS = 15 мин — см. lib/rate-limit.ts.

let testKeyCounter = 0;
function freshKey() {
  // Уникальный ключ на каждый тест, чтобы состояние модуля не протекало.
  return makeLoginKey(`u${++testKeyCounter}@x.com`, "1.2.3.4");
}

describe("makeLoginKey", () => {
  it("нормализует email и склеивает с ip", () => {
    expect(makeLoginKey("  USER@X.com ", "1.1.1.1")).toBe("user@x.com|1.1.1.1");
  });

  it("разный ip → разные ключи (защита от обхода через перебор IP)", () => {
    expect(makeLoginKey("u@x", "1.1.1.1")).not.toBe(makeLoginKey("u@x", "2.2.2.2"));
  });
});

describe("rate-limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("пока попыток меньше лимита — блокировки нет", () => {
    const key = freshKey();
    for (let i = 0; i < 4; i++) registerFailure(key);
    expect(getLockRemainingSec(key)).toBe(0);
  });

  it("после 5-й неудачи включается блокировка ≈15 мин", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) registerFailure(key);
    const remaining = getLockRemainingSec(key);
    // ~15 мин = 900 сек; даём небольшой допуск.
    expect(remaining).toBeGreaterThan(895);
    expect(remaining).toBeLessThanOrEqual(900);
  });

  it("блокировка истекает по времени", () => {
    const key = freshKey();
    for (let i = 0; i < 5; i++) registerFailure(key);
    expect(getLockRemainingSec(key)).toBeGreaterThan(0);

    // Промотать 15 мин + 1 сек.
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    expect(getLockRemainingSec(key)).toBe(0);
  });

  it("registerSuccess сбрасывает счётчик", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) registerFailure(key);
    registerSuccess(key);
    // После сброса нужно снова 5 неудач для блокировки.
    for (let i = 0; i < 4; i++) registerFailure(key);
    expect(getLockRemainingSec(key)).toBe(0);
  });

  it("окно сбрасывается само через 15 мин без блокировки", () => {
    const key = freshKey();
    for (let i = 0; i < 4; i++) registerFailure(key);
    // Промотать окно — счётчик начнётся заново.
    vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
    for (let i = 0; i < 4; i++) registerFailure(key);
    expect(getLockRemainingSec(key)).toBe(0);
  });
});

describe("LOCKOUT_ERROR_PREFIX", () => {
  it("совпадает с ожидаемым префиксом, который парсит фронт логина", () => {
    expect(LOCKOUT_ERROR_PREFIX).toBe("RATE_LIMITED");
  });
});
