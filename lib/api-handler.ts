import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@prisma/client";

/**
 * Единая обработка ошибок и валидация для API-роутов.
 *
 * Использование:
 *   export const POST = withErrorHandling(async (req, ctx) => {
 *     const body = await parseBody(req, createUserSchema);
 *     ...
 *     return NextResponse.json(result, { status: 201 });
 *   });
 *
 * Любое выброшенное исключение (ZodError, HttpError, ошибки Prisma, прочее)
 * превращается в безопасный JSON-ответ без утечки stack trace в проде.
 */

// ─── Управляемые HTTP-ошибки ──────────────────────────────────────────────────
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthorized = (msg = "Unauthorized") => new HttpError(401, msg);
export const forbidden = (msg = "Forbidden") => new HttpError(403, msg);
export const notFound = (msg = "Not found") => new HttpError(404, msg);
export const badRequest = (msg = "Bad request") => new HttpError(400, msg);

// ─── Контекст роута (params) ────────────────────────────────────────────────
type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (
  req: NextRequest,
  ctx: RouteContext
) => Promise<NextResponse> | NextResponse;

// ─── Обёртка ──────────────────────────────────────────────────────────────────
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

function toErrorResponse(err: unknown): NextResponse {
  // Ошибки валидации zod → 400 с разбивкой по полям
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of err.issues) {
      const path = issue.path.join(".") || "_";
      if (!fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return NextResponse.json(
      { error: "Проверьте правильность заполнения полей", fields: fieldErrors },
      { status: 400 }
    );
  }

  // Управляемые ошибки
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  // Известные ошибки Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ");
      return NextResponse.json(
        { error: target ? `Запись с таким значением уже существует: ${target}` : "Запись с такими данными уже существует" },
        { status: 409 }
      );
    }
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
    }
    if (err.code === "P2003") {
      return NextResponse.json({ error: "Нарушение связи между записями" }, { status: 409 });
    }
  }

  // Невалидный JSON в теле запроса
  if (err instanceof SyntaxError) {
    return NextResponse.json({ error: "Некорректный JSON в теле запроса" }, { status: 400 });
  }

  // Прочее — логируем на сервере, клиенту отдаём общий 500
  console.error("[API error]", err);
  return NextResponse.json({ error: "Внутренняя ошибка сервера" }, { status: 500 });
}

// ─── Валидация тела запроса ─────────────────────────────────────────────────
/**
 * Парсит JSON-тело и валидирует его схемой zod.
 * При ошибке выбрасывает ZodError (перехватывается withErrorHandling → 400).
 */
export async function parseBody<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const json = await req.json();
  return schema.parse(json);
}

/**
 * Валидирует query-параметры (URLSearchParams → объект) схемой zod.
 */
export function parseQuery<T>(req: NextRequest, schema: ZodType<T>): T {
  const obj = Object.fromEntries(req.nextUrl.searchParams.entries());
  return schema.parse(obj);
}
