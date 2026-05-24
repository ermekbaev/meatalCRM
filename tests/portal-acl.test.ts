import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем prisma до импорта acl — иначе acl потянет реальный @prisma/client.
const prismaMock = {
  task: { findFirst: vi.fn() },
  taskFile: { findFirst: vi.fn() },
  requestFile: { findFirst: vi.fn() },
  workshop: { findFirst: vi.fn() },
  portalFile: { findFirst: vi.fn() },
  portalRequest: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const { canAccessFileKey, getPortalScope, getPortalRequestAccess } = await import("@/lib/acl");

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) => (fn as any).mockReset())
  );
});

// ─── getPortalScope ─────────────────────────────────────────────────────────────
//
// Источник истины для «к какой компании привязан клиент» — JWT/session. Любая
// попытка подмены companyId в теле/query API игнорируется (поля нет в схеме),
// поэтому ключевой инвариант: companyId == session.user.companyId или null.
describe("getPortalScope", () => {
  it("CLIENT с companyId — возвращает companyId", () => {
    expect(
      getPortalScope({
        user: { role: "CLIENT", companyId: "co_1", id: "u1" },
      } as any)
    ).toBe("co_1");
  });

  it("CLIENT без companyId — null (битый кабинет)", () => {
    expect(
      getPortalScope({
        user: { role: "CLIENT", companyId: null, id: "u1" },
      } as any)
    ).toBeNull();
  });

  it("не-CLIENT (ADMIN/MANAGER) — null, даже если companyId присутствует", () => {
    for (const role of ["ADMIN", "MANAGER", "FOREMAN", "ENGINEER", "EMPLOYEE", "CONTRACTOR"] as const) {
      expect(
        getPortalScope({ user: { role, companyId: "co_x", id: "u1" } } as any)
      ).toBeNull();
    }
  });

  it("сессии нет — null", () => {
    expect(getPortalScope(null)).toBeNull();
  });
});

// ─── getPortalRequestAccess ─────────────────────────────────────────────────────
//
// Единая точка проверки «может ли роль X получить заявку Y». CLIENT может видеть
// только заявки своей компании — где-фильтр идёт через companyId из сессии, а не
// из параметров запроса. ADMIN — любую. MANAGER — заявки компаний, где он
// `managerId`.
describe("getPortalRequestAccess", () => {
  it("CLIENT: фильтр по companyId сессии (нельзя подменить)", async () => {
    prismaMock.portalRequest.findFirst.mockResolvedValue({ id: "pr1", companyId: "co_mine" });
    const result = await getPortalRequestAccess(
      { user: { role: "CLIENT", id: "u1", companyId: "co_mine" } } as any,
      "pr1"
    );
    expect(result).toEqual({ id: "pr1", companyId: "co_mine" });
    const whereArg = prismaMock.portalRequest.findFirst.mock.calls[0][0].where;
    expect(whereArg).toEqual({ id: "pr1", companyId: "co_mine" });
  });

  it("CLIENT: чужой заявки нет в выборке → null (IDOR заблокирован)", async () => {
    prismaMock.portalRequest.findFirst.mockResolvedValue(null);
    const result = await getPortalRequestAccess(
      { user: { role: "CLIENT", id: "u1", companyId: "co_mine" } } as any,
      "pr_other_company"
    );
    expect(result).toBeNull();
  });

  it("CLIENT без companyId — null без обращения в БД", async () => {
    const result = await getPortalRequestAccess(
      { user: { role: "CLIENT", id: "u1", companyId: null } } as any,
      "pr1"
    );
    expect(result).toBeNull();
    expect(prismaMock.portalRequest.findFirst).not.toHaveBeenCalled();
  });

  it("ADMIN: без фильтра компании — может открыть любую", async () => {
    prismaMock.portalRequest.findFirst.mockResolvedValue({ id: "pr1", companyId: "co_any" });
    await getPortalRequestAccess(
      { user: { role: "ADMIN", id: "u_admin", companyId: null } } as any,
      "pr1"
    );
    const whereArg = prismaMock.portalRequest.findFirst.mock.calls[0][0].where;
    expect(whereArg).toEqual({ id: "pr1" });
    expect(whereArg.companyId).toBeUndefined();
    expect(whereArg.company).toBeUndefined();
  });

  it("MANAGER: фильтр company.managerId (только свои компании)", async () => {
    prismaMock.portalRequest.findFirst.mockResolvedValue({ id: "pr1", companyId: "co_x" });
    await getPortalRequestAccess(
      { user: { role: "MANAGER", id: "user-mgr", companyId: null } } as any,
      "pr1"
    );
    const whereArg = prismaMock.portalRequest.findFirst.mock.calls[0][0].where;
    expect(whereArg).toEqual({ id: "pr1", company: { managerId: "user-mgr" } });
  });

  it("прочие роли (FOREMAN/ENGINEER/EMPLOYEE/CONTRACTOR) — null", async () => {
    for (const role of ["FOREMAN", "ENGINEER", "EMPLOYEE", "CONTRACTOR"] as const) {
      const result = await getPortalRequestAccess(
        { user: { role, id: "u1", companyId: null } } as any,
        "pr1"
      );
      expect(result).toBeNull();
    }
    expect(prismaMock.portalRequest.findFirst).not.toHaveBeenCalled();
  });
});

// ─── canAccessFileKey для CLIENT ────────────────────────────────────────────────
//
// CLIENT не должен иметь возможности скачать файлы CRM (requests/*, tasks/*)
// даже зная UUID-ключ. Защита идёт «по построению» — гард в начале функции.
// portal/* проверяется через принадлежность файла заявке его компании.
describe("canAccessFileKey — CLIENT-роль", () => {
  it("requests/* для CLIENT — всегда false (закрытая дыра IDOR)", async () => {
    expect(await canAccessFileKey("requests/uuid.pdf", "CLIENT", "u1")).toBe(false);
    // К БД даже не должны обращаться.
    expect(prismaMock.requestFile.findFirst).not.toHaveBeenCalled();
  });

  it("tasks/* для CLIENT — всегда false", async () => {
    expect(await canAccessFileKey("tasks/uuid.pdf", "CLIENT", "u1")).toBe(false);
    expect(prismaMock.taskFile.findFirst).not.toHaveBeenCalled();
  });

  it("portal/* для CLIENT — проверяет принадлежность через portalUsers.some.id", async () => {
    prismaMock.portalFile.findFirst.mockResolvedValue({ id: "pf1" });
    expect(await canAccessFileKey("portal/uuid.pdf", "CLIENT", "user-7")).toBe(true);
    const whereArg = prismaMock.portalFile.findFirst.mock.calls[0][0].where;
    expect(whereArg).toEqual({
      filename: "portal/uuid.pdf",
      portalRequest: { company: { portalUsers: { some: { id: "user-7" } } } },
    });
  });

  it("portal/* для CLIENT — чужой файл (нет в выборке) → false", async () => {
    prismaMock.portalFile.findFirst.mockResolvedValue(null);
    expect(await canAccessFileKey("portal/other.pdf", "CLIENT", "user-7")).toBe(false);
  });

  it("company/* и avatars/* для CLIENT — true (низкочувствительно)", async () => {
    expect(await canAccessFileKey("company/logo.png", "CLIENT", "u1")).toBe(true);
    expect(await canAccessFileKey("avatars/abc.png", "CLIENT", "u1")).toBe(true);
  });
});

// ─── canAccessFileKey для внутренних: portal/* ──────────────────────────────────
describe("canAccessFileKey — portal/* для внутренних", () => {
  it("ADMIN: без фильтра компании, любой существующий portal-файл", async () => {
    prismaMock.portalFile.findFirst.mockResolvedValue({ id: "pf1" });
    expect(await canAccessFileKey("portal/uuid.pdf", "ADMIN", "u_admin")).toBe(true);
    const whereArg = prismaMock.portalFile.findFirst.mock.calls[0][0].where;
    expect(whereArg).toEqual({ filename: "portal/uuid.pdf" });
  });

  it("MANAGER: фильтр company.managerId", async () => {
    prismaMock.portalFile.findFirst.mockResolvedValue({ id: "pf1" });
    await canAccessFileKey("portal/uuid.pdf", "MANAGER", "user-mgr");
    const whereArg = prismaMock.portalFile.findFirst.mock.calls[0][0].where;
    expect(whereArg).toEqual({
      filename: "portal/uuid.pdf",
      portalRequest: { company: { managerId: "user-mgr" } },
    });
  });

  it("FOREMAN/ENGINEER/EMPLOYEE/CONTRACTOR — portal/* недоступен", async () => {
    for (const role of ["FOREMAN", "ENGINEER", "EMPLOYEE", "CONTRACTOR"] as const) {
      expect(await canAccessFileKey("portal/uuid.pdf", role, "u1")).toBe(false);
    }
  });
});
