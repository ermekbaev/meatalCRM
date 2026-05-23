/** Форматирование числа в ru-локали с заданным числом знаков. */
export function formatNum(n: number, decimals = 2) {
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Форматирование валюты в рублях (целые рубли). */
export function formatCur(n: number) {
  return (
    n.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }) + " ₽"
  );
}
