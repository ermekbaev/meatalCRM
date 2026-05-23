/**
 * Хелперы для серверной пагинации списочных эндпоинтов.
 *
 * Контракт ответа: { items, total, page, pageSize }.
 * Параметры query: `page` (1..N), `pageSize` (1..MAX_PAGE_SIZE).
 * Если параметры не переданы — применяется DEFAULT_PAGE_SIZE (потолок),
 * чтобы списки не возвращали все строки без ограничения.
 */

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

/**
 * Защитный потолок для списков, которые по UX-причинам не пагинируются
 * (канбан-доски tasks/requests, фасетные/reference-данные warehouse/catalog).
 * Ответ остаётся массивом, но запрос не вернёт больше SAFETY_TAKE строк —
 * страховка от разрастания. См. план «серверный фасетинг» в docs/REMEDIATION.md (п.6).
 */
export const SAFETY_TAKE = 500;

export type PageParams = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Разбирает page/pageSize из query с защитой от мусора и выхода за пределы. */
export function getPageParams(
  searchParams: URLSearchParams,
  defaultPageSize = DEFAULT_PAGE_SIZE
): PageParams {
  const rawPage = Number(searchParams.get("page"));
  const rawSize = Number(searchParams.get("pageSize"));

  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  let pageSize = Number.isFinite(rawSize) && rawSize >= 1
    ? Math.floor(rawSize)
    : defaultPageSize;
  if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE;

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

/** Собирает ответ в каноническом виде. */
export function paginated<T>(
  items: T[],
  total: number,
  params: PageParams
): Paginated<T> {
  return { items, total, page: params.page, pageSize: params.pageSize };
}
