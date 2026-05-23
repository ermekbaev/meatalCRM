import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем prisma до импорта acl — иначе acl потянет реальный @prisma/client.
const prismaMock = {
  task: { findFirst: vi.fn() },
  taskFile: { findFirst: vi.fn() },
  requestFile: { findFirst: vi.fn() },
  workshop: { findFirst: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Динамический импорт — после vi.mock.
const { canAccessFileKey, isAdmin, isAdminOrManager, canManageTasks, isAssigneeRole, isContractor, canManageSubtasks } = await import("@/lib/acl");

beforeEach(() => {
  Object.values(prismaMock).forEach((model) =>
    Object.values(model).forEach((fn) => (fn as any).mockReset())
  );
});

describe("чистые ролевые предикаты", () => {
  it("isAdmin", () => {
    expect(isAdmin("ADMIN")).toBe(true);
    expect(isAdmin("MANAGER")).toBe(false);
  });

  it("isAdminOrManager / canManageTasks", () => {
    expect(isAdminOrManager("MANAGER")).toBe(true);
    expect(canManageTasks("EMPLOYEE")).toBe(false);
  });

  it("isAssigneeRole — FOREMAN/ENGINEER/CONTRACTOR", () => {
    expect(isAssigneeRole("FOREMAN")).toBe(true);
    expect(isAssigneeRole("ENGINEER")).toBe(true);
    expect(isAssigneeRole("CONTRACTOR")).toBe(true);
    expect(isAssigneeRole("EMPLOYEE")).toBe(false);
    expect(isAssigneeRole("ADMIN")).toBe(false);
  });

  it("isContractor", () => {
    expect(isContractor("CONTRACTOR")).toBe(true);
    expect(isContractor("FOREMAN")).toBe(false);
  });

  it("canManageSubtasks — кроме EMPLOYEE/CONTRACTOR", () => {
    expect(canManageSubtasks("ADMIN")).toBe(true);
    expect(canManageSubtasks("FOREMAN")).toBe(true);
    expect(canManageSubtasks("ENGINEER")).toBe(true);
    expect(canManageSubtasks("EMPLOYEE")).toBe(false);
    expect(canManageSubtasks("CONTRACTOR")).toBe(false);
  });
});

describe("canAccessFileKey — защита от path traversal (FILE_KEY_RE)", () => {
  it("отклоняет ключ с .. в пути", async () => {
    expect(await canAccessFileKey("requests/../etc/passwd", "ADMIN", "u1")).toBe(false);
  });

  it("отклоняет абсолютный путь", async () => {
    expect(await canAccessFileKey("/etc/passwd", "ADMIN", "u1")).toBe(false);
  });

  it("отклоняет вложенные слеши", async () => {
    expect(await canAccessFileKey("tasks/sub/file.pdf", "ADMIN", "u1")).toBe(false);
  });

  it("отклоняет неизвестную папку", async () => {
    expect(await canAccessFileKey("secret/file.pdf", "ADMIN", "u1")).toBe(false);
  });

  it("отклоняет пустой ключ", async () => {
    expect(await canAccessFileKey("", "ADMIN", "u1")).toBe(false);
  });

  it("отклоняет ключ только с папкой без файла", async () => {
    expect(await canAccessFileKey("tasks/", "ADMIN", "u1")).toBe(false);
  });

  it("отклоняет небезопасные символы (пробел, скобки)", async () => {
    expect(await canAccessFileKey("tasks/file with space.pdf", "ADMIN", "u1")).toBe(false);
    expect(await canAccessFileKey("tasks/file(1).pdf", "ADMIN", "u1")).toBe(false);
  });
});

describe("canAccessFileKey — низкочувствительные папки", () => {
  it("company/* доступно любому авторизованному без обращения к БД", async () => {
    expect(await canAccessFileKey("company/logo.png", "EMPLOYEE", "u1")).toBe(true);
    expect(prismaMock.taskFile.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.requestFile.findFirst).not.toHaveBeenCalled();
  });

  it("avatars/* доступно любому авторизованному", async () => {
    expect(await canAccessFileKey("avatars/abc-123.png", "CONTRACTOR", "u1")).toBe(true);
  });
});

describe("canAccessFileKey — requests/*", () => {
  it("ADMIN: файл существует → доступ", async () => {
    prismaMock.requestFile.findFirst.mockResolvedValue({ id: "rf1" });
    expect(await canAccessFileKey("requests/uuid.pdf", "ADMIN", "u1")).toBe(true);
    // ADMIN — без ограничения по assigneeId.
    const callArg = prismaMock.requestFile.findFirst.mock.calls[0][0];
    expect(callArg.where.request).toBeUndefined();
  });

  it("ADMIN: файла нет → нет доступа", async () => {
    prismaMock.requestFile.findFirst.mockResolvedValue(null);
    expect(await canAccessFileKey("requests/uuid.pdf", "ADMIN", "u1")).toBe(false);
  });

  it("FOREMAN: запрос фильтруется по assigneeId (ограничение видимости)", async () => {
    prismaMock.requestFile.findFirst.mockResolvedValue(null);
    await canAccessFileKey("requests/uuid.pdf", "FOREMAN", "user-7");
    const callArg = prismaMock.requestFile.findFirst.mock.calls[0][0];
    expect(callArg.where.request).toEqual({ assigneeId: "user-7" });
  });

  it("ENGINEER: тот же ограничивающий фильтр assigneeId", async () => {
    prismaMock.requestFile.findFirst.mockResolvedValue(null);
    await canAccessFileKey("requests/uuid.pdf", "ENGINEER", "user-9");
    const callArg = prismaMock.requestFile.findFirst.mock.calls[0][0];
    expect(callArg.where.request).toEqual({ assigneeId: "user-9" });
  });
});

describe("canAccessFileKey — tasks/*", () => {
  it("ADMIN/MANAGER/ENGINEER: видят все файлы при наличии в БД", async () => {
    prismaMock.taskFile.findFirst.mockResolvedValue({ id: "tf1" });
    for (const role of ["ADMIN", "MANAGER", "ENGINEER"] as const) {
      expect(await canAccessFileKey("tasks/uuid.pdf", role, "u1")).toBe(true);
    }
    // Без проверки виртуального цеха.
    expect(prismaMock.workshop.findFirst).not.toHaveBeenCalled();
  });

  it("FOREMAN: фильтр по assignees.some.id", async () => {
    prismaMock.taskFile.findFirst.mockResolvedValue({ id: "tf1" });
    await canAccessFileKey("tasks/uuid.pdf", "FOREMAN", "user-3");
    const where = prismaMock.taskFile.findFirst.mock.calls[0][0].where;
    expect(where.task).toEqual({ assignees: { some: { id: "user-3" } } });
  });

  it("CONTRACTOR: фильтр по assignees.some.id (read-only исполнитель)", async () => {
    prismaMock.taskFile.findFirst.mockResolvedValue({ id: "tf1" });
    await canAccessFileKey("tasks/uuid.pdf", "CONTRACTOR", "user-4");
    const where = prismaMock.taskFile.findFirst.mock.calls[0][0].where;
    expect(where.task).toEqual({ assignees: { some: { id: "user-4" } } });
  });

  it("EMPLOYEE: видит задачи цеха + свои + задачи без цеха (если в виртуальном)", async () => {
    prismaMock.workshop.findFirst.mockResolvedValue({ id: "vws" });
    prismaMock.taskFile.findFirst.mockResolvedValue({ id: "tf1" });
    await canAccessFileKey("tasks/uuid.pdf", "EMPLOYEE", "user-5");
    const where = prismaMock.taskFile.findFirst.mock.calls[0][0].where;
    expect(Array.isArray(where.task.OR)).toBe(true);
    // OR содержит ветку workshopId:null, т.к. virtual найден
    expect(where.task.OR.some((b: any) => b.workshopId === null)).toBe(true);
  });

  it("EMPLOYEE без виртуального цеха: ветка workshopId:null исключена", async () => {
    prismaMock.workshop.findFirst.mockResolvedValue(null);
    prismaMock.taskFile.findFirst.mockResolvedValue(null);
    await canAccessFileKey("tasks/uuid.pdf", "EMPLOYEE", "user-6");
    const where = prismaMock.taskFile.findFirst.mock.calls[0][0].where;
    expect(where.task.OR.some((b: any) => b.workshopId === null)).toBe(false);
  });

  it("FOREMAN без файла в выборке → нет доступа (IDOR заблокирован)", async () => {
    prismaMock.taskFile.findFirst.mockResolvedValue(null);
    expect(await canAccessFileKey("tasks/other-users-file.pdf", "FOREMAN", "user-3")).toBe(false);
  });
});
