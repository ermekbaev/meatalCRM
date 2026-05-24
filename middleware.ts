import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.next();

  const role = token.role;
  const pathname = req.nextUrl.pathname;

  // ─── API: гарды до выдачи данных ────────────────────────────────────────────
  // matcher ниже включает /api/:path*, поэтому каждый API-запрос проходит
  // здесь. Серверные проверки в самих роутах остаются вторым слоем.
  if (pathname.startsWith("/api/")) {
    // NextAuth и общий файл-эндпоинт (со своей ACL canAccessFileKey) пропускаем.
    if (pathname.startsWith("/api/auth/") || pathname.startsWith("/api/files")) {
      return NextResponse.next();
    }

    if (role === "CLIENT") {
      // CLIENT за пределами /api/portal/* — 403. Никаких /api/requests,
      // /api/offers, /api/invoices, /api/users, /api/analytics и т.п.
      if (!pathname.startsWith("/api/portal/")) {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      return NextResponse.next();
    }

    // /api/portal/* для не-CLIENT — пускаем только ADMIN/MANAGER (комменты/
    // файлы/смена статуса портальных заявок). FOREMAN/ENGINEER/EMPLOYEE/
    // CONTRACTOR — 403.
    if (pathname.startsWith("/api/portal/") && role !== "ADMIN" && role !== "MANAGER") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // /api/companies/* — только ADMIN/MANAGER (внутри роутов есть точечные
    // гарды на ADMIN-only операции).
    if (pathname.startsWith("/api/companies") && role !== "ADMIN" && role !== "MANAGER") {
      return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    return NextResponse.next();
  }

  // ─── UI-пути ───────────────────────────────────────────────────────────────
  // CLIENT — внешний пользователь компании. Имеет доступ только к /portal.
  // Любые попытки зайти в CRM (/requests, /clients, /offers, /invoices,
  // /analytics, /warehouse, /calculator, /settings, /tasks, /operator,
  // /companies, /dashboard) → редирект на /portal.
  if (role === "CLIENT") {
    if (!pathname.startsWith("/portal") && !pathname.startsWith("/login")) {
      const url = req.nextUrl.clone();
      url.pathname = "/portal";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Внутренние пользователи (не-CLIENT) не имеют доступа к /portal.
  if (pathname.startsWith("/portal")) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Раздел «Компании» — только ADMIN и MANAGER.
  if (pathname.startsWith("/companies") && role !== "ADMIN" && role !== "MANAGER") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (role === "CONTRACTOR" && !pathname.startsWith("/tasks") && !pathname.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = "/tasks";
    return NextResponse.redirect(url);
  }

  // Оператор (EMPLOYEE) видит только задачи и склад. Остальные разделы дашборда
  // (аналитика, КП, счета, клиенты и т.д.) недоступны — уводим на доску задач.
  if (
    role === "EMPLOYEE" &&
    !pathname.startsWith("/tasks") &&
    !pathname.startsWith("/warehouse") &&
    !pathname.startsWith("/login")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/tasks";
    return NextResponse.redirect(url);
  }

  // Конструктор (ENGINEER) видит задачи, склад и калькулятор. Остальное недоступно.
  if (
    role === "ENGINEER" &&
    !pathname.startsWith("/tasks") &&
    !pathname.startsWith("/warehouse") &&
    !pathname.startsWith("/calculator") &&
    !pathname.startsWith("/login")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/tasks";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/clients/:path*",
    "/offers/:path*",
    "/invoices/:path*",
    "/analytics/:path*",
    "/calculator/:path*",
    "/warehouse/:path*",
    "/settings/:path*",
    "/operator/:path*",
    "/tasks/:path*",
    "/portal/:path*",
    "/companies/:path*",
    "/api/:path*",
  ],
};
