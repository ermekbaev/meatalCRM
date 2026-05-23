# HANDOFF — контекст для продолжения работы (новая сессия)

> **Прочитай этот файл первым.** Он описывает, что уже сделано по устранению недочётов проекта,
> какие паттерны использовать и что делать дальше. Полный чеклист — в [REMEDIATION.md](REMEDIATION.md).
> Отвечай пользователю **на русском** (предпочтение зафиксировано).

---

## О проекте

- **metalcrm** — CRM для металлообработки. Стек: **Next.js 16 (App Router) + Prisma 5 (PostgreSQL) + NextAuth (JWT, Credentials) + Tailwind**.
- Рабочая директория: `c:\Users\adile\Desktop\metalcrm`. ОС: Windows, шелл PowerShell.
- ~60 API-роутов в `app/api/**/route.ts`, 146 файлов TS/TSX, ~22.5к строк.
- Роли: `ADMIN | MANAGER | FOREMAN | ENGINEER | EMPLOYEE | CONTRACTOR` (см. `lib/acl.ts`, `prisma/schema.prisma`).
- Проверки: `npx tsc --noEmit -p tsconfig.json` (типы) и `npx next build` (сборка + валидация типов роутов). Обе сейчас **зелёные**.

---

## Что уже сделано (пункты 1–3 REMEDIATION.md — ЗАКРЫТЫ)

### ✅ Пункт 1 — IDOR в выдаче файлов
Раньше `app/api/files/route.ts` отдавал любой S3-файл по сырому `key` без проверки прав.
- Добавлена `canAccessFileKey(key, role, userId)` в **`lib/acl.ts`**:
  - регэксп `FILE_KEY_RE` — только папки `requests|tasks|company|avatars` и безопасные символы (защита от path traversal);
  - `requests/*` и `tasks/*` — доступ только при правах на родительскую заявку/задачу (переиспользует ролевые предикаты);
  - `company/*`, `avatars/*` — любому авторизованному (логотип/печать/аватары видны по всему приложению).
- `app/api/files/route.ts` вызывает проверку, при отказе — 403.

### ✅ Пункты 2 + 3 — валидация (zod) + единая обработка ошибок
Раньше: `zod` не использовался ни в одном роуте; тело писалось в Prisma напрямую (`prisma.X.create({ data })` из `req.json()` — mass-assignment); только 2 роута имели try/catch.

**Создана инфраструктура:**
- **`lib/api-handler.ts`**:
  - `withErrorHandling(handler)` — оборачивает роут, ловит исключения → безопасный JSON без stack trace.
    Обрабатывает: `ZodError`→400 (с `fields`), Prisma `P2002`→409 / `P2025`→404 / `P2003`→409, `SyntaxError`(плохой JSON)→400, `HttpError`→его статус, прочее→500 (логируется в консоль).
  - `parseBody(req, schema)` — `schema.parse(await req.json())`.
  - `parseQuery(req, schema)` — валидация query-параметров.
  - Хелперы-ошибки: `unauthorized()` 401, `forbidden()` 403, `notFound()` 404, `badRequest(msg)` 400.
- **`lib/validation.ts`** — zod-схемы (create/update) для ~20 сущностей + enum'ы, синхронизированные с Prisma:
  user, client, request(+items), offer(+items), invoice(+items), task, subTask, checklist, taskTag, workshop, warehouse, comment, tag, taskColumn, serviceCatalog, catalogCategory, metalEntry, bendingEntry, cuttingEntry, cuttingBulk, companySettings, dadataQuery, pushSubscribe.

**Переведены ВСЕ прикладные роуты** (кроме `auth/[...nextauth]` — это хендлер NextAuth, обернуть нельзя):
core (clients, requests, offers, invoices, tasks, users, warehouse, workshops — коллекции и `[id]`),
sub-resources (catalog/* включая import/bulk, tags(+[id]), task-columns(+[id]), push/subscribe,
notifications/*, tasks/[id]/{subtasks(+[subId]),checklist(+[itemId]),files(+[fileId]),tags,comments},
requests/[id]/{items,files(+[fileId]),comments}, settings/company(+images), dadata/{bank,party},
users/[id]/avatar), read-only (analytics, analytics/production, dashboard/revenue, catalog/export, operator/subtasks).

**Mass-assignment устранён везде** — в Prisma идут только поля из схем.

---

## Канонический паттерн роута (используй его для всего нового кода)

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { someSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();
  const role = (session.user as any).role;
  if (role !== "ADMIN") throw forbidden();

  const { id } = await params;            // params: Promise<Record<string,string>>
  const data = await parseBody(req, someSchema);
  // ... prisma ...
  return NextResponse.json(result, { status: 201 });
});
```

**Важные нюансы / подводные камни:**
- `export const GET = withErrorHandling(...)` (НЕ `export async function`). Next.js это принимает (build проходит).
- Закрывающая скобка функции теперь `});`, а не `}` — частая ошибка при правках.
- `RouteContext.params` типизирован как `Promise<Record<string,string>>` — деструктуризация `{ id }`, `{ id, subId }` работает.
- Схемы обновления (`*UpdateSchema`) обычно `.partial()`, БЕЗ `.default()` там, где код инспектирует `Object.keys(body)` (пример: `tasks/[id]/subtasks/[subId]` — ограничение «EMPLOYEE меняет только status»).
- `tasks/[id]/route.ts` намеренно оставлен на `req.json()` — поля whitelist'ятся вручную из-за динамических production-полей; mass-assignment там нет, враппер стоит.
- Денежные/числовые поля в схемах — `z.coerce.number()` (клиент может слать строки).
- Файловые роуты (multipart `formData`) обёрнуты во `withErrorHandling`, 400-проверки размера/типа сделаны через `throw badRequest(...)`.

---

## Что делать дальше (по приоритету REMEDIATION.md)

### Пункт 6 — Пагинация списочных эндпоинтов (следующий крупный)
Сейчас почти нет `take/skip` — списки возвращают все строки.
- Добавить `page`/`pageSize` (или cursor) в GET: `clients`, `tasks`, `requests`, `offers`, `invoices`, `warehouse`, `catalog`.
- Возвращать `{ items, total, page, pageSize }` (СЛОМАЕТ фронтенд-таблицы — их тоже надо обновить, см. `app/(dashboard)/**/page.tsx`).
- Дефолтный `take` (например 50) даже без параметров.
- ⚠️ Объёмно (фронт + бэк). Лучше делать в отдельной сессии.

### Пункт 5/11 — Чистка репозитория (быстрые победы)
- `git rm --cached prisma/dev.db` (закоммичена пустая SQLite-БД при postgres) + добавить в `.gitignore`.
- Удалить пустые папки в корне: `prismamigrations20260513193000_task_production_status`, `prismamigrations20260513194000_request_status_ready` (артефакт сломанного пути).
- Миграция `prisma/migrations/20260519140327_/` с пустым именем — ⚠️ НЕ переименовывать (уже применена в проде; имя хранится в `_prisma_migrations`, рассинхрон сломает `migrate deploy`). Оставить или синхронизировать имя в БД.

### Прочее (пункты 4, 7–10)
4. Rate-limiting на логине (`lib/auth.ts`). 7. Сократить `as any` (особенно типизировать сессию через `next-auth.d.ts`). 8. Разбить god-компоненты (calculator 1863 строки и т.д.). 9. Server Components вместо тотального `"use client"`. 10. Тесты (нет ни одного; есть только `TESTING.md`).

---

## Состояние git / как продолжить

- Изменения **НЕ закоммичены** (пользователь просит коммит только явно). Затронуто ~50 файлов + новые `lib/api-handler.ts`, `lib/validation.ts`, `docs/REMEDIATION.md`, `docs/HANDOFF.md`.
- Перед стартом: запусти `npx tsc --noEmit -p tsconfig.json` — должно быть чисто.
- Открой [REMEDIATION.md](REMEDIATION.md) — там чеклист с отметками `[x]`/`[ ]`.
- Спроси пользователя, с какого пункта продолжить (рекомендуется п.6 или быстрые п.5/11).
