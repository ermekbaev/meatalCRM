import { describe, it, expect } from "vitest";
import {
  portalRequestCreateSchema,
  clientPositionCreateSchema,
  companyCreateSchema,
  companyAttachExistingSchema,
  companyUpdateSchema,
  userRoleEnum,
} from "@/lib/validation";

// ─── portalRequestCreateSchema ──────────────────────────────────────────────────
//
// Защита от mass-assignment: companyId / createdByUserId — серверные, в схему не
// заложены. Если клиент попытается их подсунуть, zod их выбросит (strict не
// нужен — Prisma всё равно получит данные только из распаршенного объекта).
describe("portalRequestCreateSchema", () => {
  it("принимает минимальные валидные данные (только title)", () => {
    const r = portalRequestCreateSchema.parse({ title: "Корпус 250×500" });
    expect(r.title).toBe("Корпус 250×500");
    expect(r.items).toBeUndefined();
  });

  it("отклоняет пустой title", () => {
    expect(portalRequestCreateSchema.safeParse({ title: "" }).success).toBe(false);
    expect(portalRequestCreateSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("companyId/createdByUserId/status из body отбрасываются", () => {
    // Эти поля не должны попасть в результат parse() — серверный API кладёт их
    // только из сессии, body им не верит.
    const r = portalRequestCreateSchema.parse({
      title: "Заявка",
      companyId: "co_other",
      createdByUserId: "u_admin",
      status: "READY",
      items: [{ name: "Лист 3мм", quantity: 5, unit: "шт" }],
    } as any);
    expect((r as any).companyId).toBeUndefined();
    expect((r as any).createdByUserId).toBeUndefined();
    expect((r as any).status).toBeUndefined();
    expect(r.items).toHaveLength(1);
  });

  it("позиция: пустое name → ошибка", () => {
    const r = portalRequestCreateSchema.safeParse({
      title: "X",
      items: [{ name: "" }],
    });
    expect(r.success).toBe(false);
  });

  it("позиция: дефолтные quantity=1, unit=шт", () => {
    const r = portalRequestCreateSchema.parse({
      title: "X",
      items: [{ name: "Лист 3мм" }],
    });
    expect(r.items?.[0].quantity).toBe(1);
    expect(r.items?.[0].unit).toBe("шт");
  });
});

// ─── clientPositionCreateSchema ─────────────────────────────────────────────────
describe("clientPositionCreateSchema", () => {
  it("требует name, default unit = шт", () => {
    const r = clientPositionCreateSchema.parse({ name: "Корпус" });
    expect(r.unit).toBe("шт");
  });

  it("отбрасывает companyId из body", () => {
    const r = clientPositionCreateSchema.parse({
      name: "Корпус",
      companyId: "co_other",
    } as any);
    expect((r as any).companyId).toBeUndefined();
  });
});

// ─── companyCreateSchema ────────────────────────────────────────────────────────
describe("companyCreateSchema (создание кабинета админом)", () => {
  const valid = {
    name: "ООО Прокат",
    managerId: "user-mgr-1",
    user: { email: "client@x.ru", password: "secret123", name: "Иван" },
  };

  it("принимает минимально валидный набор", () => {
    const r = companyCreateSchema.parse(valid);
    expect(r.name).toBe("ООО Прокат");
    expect(r.user.email).toBe("client@x.ru");
  });

  it("отклоняет короткий пароль (<6) у пользователя", () => {
    const r = companyCreateSchema.safeParse({
      ...valid,
      user: { ...valid.user, password: "12345" },
    });
    expect(r.success).toBe(false);
  });

  it("отклоняет невалидный email пользователя", () => {
    const r = companyCreateSchema.safeParse({
      ...valid,
      user: { ...valid.user, email: "not-email" },
    });
    expect(r.success).toBe(false);
  });

  it("требует managerId (нельзя оставить кабинет без ответственного)", () => {
    const { managerId, ...rest } = valid;
    void managerId;
    expect(companyCreateSchema.safeParse(rest).success).toBe(false);
  });

  it("отбрасывает isPortalEnabled из body (сервер ставит сам)", () => {
    const r = companyCreateSchema.parse({ ...valid, isPortalEnabled: false } as any);
    expect((r as any).isPortalEnabled).toBeUndefined();
  });
});

// ─── companyAttachExistingSchema ────────────────────────────────────────────────
//
// Альтернативная ветка POST /api/companies — привязка кабинета к уже
// существующему контрагенту по `existingClientId`. Реквизиты в этой ветке
// не передаются: сервер берёт их из Client.
describe("companyAttachExistingSchema", () => {
  const valid = {
    existingClientId: "c_existing",
    managerId: "user-mgr",
    user: { email: "client@x.ru", password: "secret123", name: "Иван" },
  };

  it("принимает минимально валидный набор", () => {
    const r = companyAttachExistingSchema.parse(valid);
    expect(r.existingClientId).toBe("c_existing");
    expect(r.managerId).toBe("user-mgr");
  });

  it("требует existingClientId", () => {
    const { existingClientId, ...rest } = valid;
    void existingClientId;
    expect(companyAttachExistingSchema.safeParse(rest).success).toBe(false);
  });

  it("требует managerId", () => {
    const { managerId, ...rest } = valid;
    void managerId;
    expect(companyAttachExistingSchema.safeParse(rest).success).toBe(false);
  });

  it("игнорирует реквизиты (name/inn/...) даже если их передали", () => {
    // В этом режиме реквизиты не должны попадать в результат — сервер не должен
    // мочь случайно их использовать вместо данных существующего Client.
    const r = companyAttachExistingSchema.parse({
      ...valid,
      name: "Подделка",
      inn: "0000000000",
      legalAddress: "Любой адрес",
    } as any);
    expect((r as any).name).toBeUndefined();
    expect((r as any).inn).toBeUndefined();
    expect((r as any).legalAddress).toBeUndefined();
  });

  it("отклоняет короткий пароль", () => {
    const r = companyAttachExistingSchema.safeParse({
      ...valid,
      user: { ...valid.user, password: "12345" },
    });
    expect(r.success).toBe(false);
  });
});

// ─── companyUpdateSchema ────────────────────────────────────────────────────────
describe("companyUpdateSchema", () => {
  it("принимает частичное обновление", () => {
    const r = companyUpdateSchema.parse({ name: "Новое имя" });
    expect(r.name).toBe("Новое имя");
  });

  it("isPortalEnabled — boolean", () => {
    const r = companyUpdateSchema.parse({ isPortalEnabled: false });
    expect(r.isPortalEnabled).toBe(false);
  });
});

// ─── userRoleEnum ───────────────────────────────────────────────────────────────
describe("userRoleEnum", () => {
  it("включает CLIENT", () => {
    expect(userRoleEnum.parse("CLIENT")).toBe("CLIENT");
  });
});
