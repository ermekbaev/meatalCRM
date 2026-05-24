import { describe, it, expect, vi, beforeEach } from "vitest";

// Мокаем prisma, push и telegram до импорта lib/notify.
const prismaMock = {
  notification: { createMany: vi.fn() },
  user: { findMany: vi.fn() },
  client: { findUnique: vi.fn() },
};
const pushMock = { sendPushToUser: vi.fn().mockResolvedValue(undefined) };
const telegramMock = { sendTelegramTo: vi.fn().mockResolvedValue(undefined) };

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("../lib/push", () => pushMock);
vi.mock("../lib/telegram", () => telegramMock);

const { notifyPortalRequestCreated } = await import("@/lib/notify");

beforeEach(() => {
  prismaMock.notification.createMany.mockReset().mockResolvedValue({ count: 0 });
  prismaMock.user.findMany.mockReset();
  prismaMock.client.findUnique.mockReset();
  pushMock.sendPushToUser.mockReset().mockResolvedValue(undefined);
  telegramMock.sendTelegramTo.mockReset().mockResolvedValue(undefined);
});

const fixtureArgs = {
  requestId: "pr_1",
  requestNumber: 42,
  requestTitle: "Корпус 250×500",
  companyId: "co_1",
  companyName: "ООО Прокат",
  createdByUserId: "u_client",
  createdByUserName: "Иван",
};

describe("notifyPortalRequestCreated", () => {
  it("создаёт уведомления всем ADMIN и ответственному менеджеру компании", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u_admin1", telegramChatId: null },
      { id: "u_admin2", telegramChatId: "tg_admin2" },
    ]);
    prismaMock.client.findUnique.mockResolvedValue({
      managerId: "u_mgr",
      manager: { id: "u_mgr", isBlocked: false, telegramChatId: "tg_mgr" },
    });

    await notifyPortalRequestCreated(fixtureArgs);

    const call = prismaMock.notification.createMany.mock.calls[0][0];
    const recipientIds = (call.data as any[]).map((d) => d.userId).sort();
    expect(recipientIds).toEqual(["u_admin1", "u_admin2", "u_mgr"]);
    for (const d of call.data as any[]) {
      expect(d.type).toBe("PORTAL_REQUEST_CREATED");
      expect(d.link).toBe("/companies/co_1/requests/pr_1");
      expect(d.title).toContain("ООО Прокат");
      expect(d.body).toContain("#42");
    }
  });

  it("дедуплицирует: если менеджер компании сам ADMIN — единственное уведомление", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u_admin_mgr", telegramChatId: "tg_x" },
    ]);
    prismaMock.client.findUnique.mockResolvedValue({
      managerId: "u_admin_mgr",
      manager: { id: "u_admin_mgr", isBlocked: false, telegramChatId: "tg_x" },
    });

    await notifyPortalRequestCreated(fixtureArgs);

    const call = prismaMock.notification.createMany.mock.calls[0][0];
    expect(call.data).toHaveLength(1);
    expect((call.data as any[])[0].userId).toBe("u_admin_mgr");

    // Telegram тоже без дублей.
    const tgChatIds = telegramMock.sendTelegramTo.mock.calls[0][0];
    expect(tgChatIds).toEqual(["tg_x"]);
  });

  it("автор заявки (CLIENT) исключается из получателей", async () => {
    // Гипотетический случай: createdByUserId совпадает с одним из админов
    // (например, тестовый сценарий). Не должен получить уведомление о своей же
    // заявке.
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u_client", telegramChatId: null },
      { id: "u_admin", telegramChatId: null },
    ]);
    prismaMock.client.findUnique.mockResolvedValue({
      managerId: null,
      manager: null,
    });

    await notifyPortalRequestCreated(fixtureArgs);

    const call = prismaMock.notification.createMany.mock.calls[0][0];
    const recipientIds = (call.data as any[]).map((d) => d.userId);
    expect(recipientIds).toEqual(["u_admin"]);
  });

  it("заблокированного менеджера не уведомляет", async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: "u_admin", telegramChatId: null }]);
    prismaMock.client.findUnique.mockResolvedValue({
      managerId: "u_mgr",
      manager: { id: "u_mgr", isBlocked: true, telegramChatId: "tg_mgr" },
    });

    await notifyPortalRequestCreated(fixtureArgs);

    const call = prismaMock.notification.createMany.mock.calls[0][0];
    const recipientIds = (call.data as any[]).map((d) => d.userId);
    expect(recipientIds).toEqual(["u_admin"]);
  });

  it("Telegram — адресно (sendTelegramTo), без широкой рассылки", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u_admin", telegramChatId: "tg_admin" },
    ]);
    prismaMock.client.findUnique.mockResolvedValue({
      managerId: "u_mgr",
      manager: { id: "u_mgr", isBlocked: false, telegramChatId: "tg_mgr" },
    });

    await notifyPortalRequestCreated(fixtureArgs);

    expect(telegramMock.sendTelegramTo).toHaveBeenCalledTimes(1);
    const [chatIds, text] = telegramMock.sendTelegramTo.mock.calls[0];
    expect(new Set(chatIds)).toEqual(new Set(["tg_admin", "tg_mgr"]));
    expect(text).toContain("Новая заявка");
    expect(text).toContain("ООО Прокат");
    expect(text).toContain("#42");
  });

  it("push уходит каждому получателю (через createNotifications → sendPushToUser)", async () => {
    prismaMock.user.findMany.mockResolvedValue([
      { id: "u_admin", telegramChatId: null },
    ]);
    prismaMock.client.findUnique.mockResolvedValue({
      managerId: "u_mgr",
      manager: { id: "u_mgr", isBlocked: false, telegramChatId: null },
    });

    await notifyPortalRequestCreated(fixtureArgs);

    // sendPushToUser стартует асинхронно из createNotifications; дождёмся.
    await new Promise((r) => setImmediate(r));
    const calledFor = pushMock.sendPushToUser.mock.calls.map((c) => c[0]).sort();
    expect(calledFor).toEqual(["u_admin", "u_mgr"]);
  });

  it("CLIENT не получает уведомление, даже если оказался в списке (роль фильтруется на уровне запроса findMany ADMIN)", async () => {
    // Проверяем сам контракт: findMany вызывается с фильтром role:"ADMIN".
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.client.findUnique.mockResolvedValue({ managerId: null, manager: null });
    await notifyPortalRequestCreated(fixtureArgs);
    const whereArg = prismaMock.user.findMany.mock.calls[0][0].where;
    expect(whereArg.role).toBe("ADMIN");
    expect(whereArg.isBlocked).toBe(false);
  });

  it("ничего не падает, если в БД нет ADMIN и менеджера", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.client.findUnique.mockResolvedValue(null);

    await expect(notifyPortalRequestCreated(fixtureArgs)).resolves.toBeUndefined();
    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    expect(telegramMock.sendTelegramTo).not.toHaveBeenCalled();
  });
});
