/**
 * Простой in-memory rate-limiter для защиты логина от перебора.
 *
 * Деплой — одиночный инстанс под pm2, поэтому in-memory достаточно (состояние
 * живёт в процессе). При переходе на несколько инстансов нужно вынести в Redis.
 *
 * Логика: на ключ (email + IP) допускается MAX_FAILURES неудачных попыток
 * в окне WINDOW_MS. При превышении ключ блокируется на LOCKOUT_MS.
 * Успешный вход сбрасывает счётчик.
 */

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const LOCKOUT_MS = 15 * 60 * 1000; // 15 минут

type Entry = {
  failures: number;
  firstFailureAt: number;
  lockedUntil: number;
};

const attempts = new Map<string, Entry>();

// Префикс ошибки, по которому фронтенд распознаёт блокировку.
export const LOCKOUT_ERROR_PREFIX = "RATE_LIMITED";

export function makeLoginKey(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}|${ip}`;
}

/** Возвращает оставшиеся секунды блокировки или 0, если ключ не заблокирован. */
export function getLockRemainingSec(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return 0;
  const now = Date.now();
  if (entry.lockedUntil > now) {
    return Math.ceil((entry.lockedUntil - now) / 1000);
  }
  return 0;
}

/** Фиксирует неудачную попытку; при превышении лимита включает блокировку. */
export function registerFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  // Нет записи или окно истекло — начинаем заново.
  if (!entry || now - entry.firstFailureAt > WINDOW_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now, lockedUntil: 0 });
    return;
  }

  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
}

/** Сбрасывает счётчик после успешного входа. */
export function registerSuccess(key: string): void {
  attempts.delete(key);
}

// Периодическая очистка устаревших записей, чтобы Map не рос бесконечно.
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
if (typeof setInterval === "function") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of attempts) {
      const expired =
        entry.lockedUntil < now && now - entry.firstFailureAt > WINDOW_MS;
      if (expired) attempts.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // Не держать процесс из-за таймера.
  if (typeof timer.unref === "function") timer.unref();
}
