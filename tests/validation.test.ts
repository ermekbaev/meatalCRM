import { describe, it, expect } from "vitest";
import {
  userCreateSchema,
  clientCreateSchema,
  requestItemSchema,
  userRoleEnum,
} from "@/lib/validation";

describe("userCreateSchema", () => {
  it("принимает валидные данные и нормализует email в нижний регистр", () => {
    const parsed = userCreateSchema.parse({
      email: "Admin@Example.RU",
      password: "secret123",
      name: " Иван  ",
      role: "ADMIN",
    });
    expect(parsed.email).toBe("admin@example.ru");
    // .trim() в схеме срезает пробелы.
    expect(parsed.name).toBe("Иван");
    expect(parsed.role).toBe("ADMIN");
  });

  it("отклоняет короткий пароль (<6)", () => {
    const r = userCreateSchema.safeParse({
      email: "u@x.com",
      password: "12345",
      name: "U",
      role: "ADMIN",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const passwordIssue = r.error.issues.find((i) => i.path.join(".") === "password");
      expect(passwordIssue).toBeDefined();
    }
  });

  it("отклоняет невалидный email", () => {
    const r = userCreateSchema.safeParse({
      email: "not-an-email",
      password: "secret123",
      name: "U",
      role: "ADMIN",
    });
    expect(r.success).toBe(false);
  });

  it("отклоняет неизвестную роль", () => {
    const r = userCreateSchema.safeParse({
      email: "u@x.com",
      password: "secret123",
      name: "U",
      role: "SUPERUSER",
    });
    expect(r.success).toBe(false);
  });

  it("отклоняет пустое имя", () => {
    const r = userCreateSchema.safeParse({
      email: "u@x.com",
      password: "secret123",
      name: "   ",
      role: "ADMIN",
    });
    expect(r.success).toBe(false);
  });

  it("отбрасывает посторонние поля (защита от mass-assignment)", () => {
    const parsed = userCreateSchema.parse({
      email: "u@x.com",
      password: "secret123",
      name: "U",
      role: "EMPLOYEE",
      isBlocked: true, // не в схеме create
      id: "evil-id", // не в схеме create
    } as any);
    expect("isBlocked" in parsed).toBe(false);
    expect("id" in parsed).toBe(false);
  });
});

describe("clientCreateSchema", () => {
  it("принимает минимальные обязательные поля", () => {
    const parsed = clientCreateSchema.parse({ name: "ООО Ромашка" });
    expect(parsed.name).toBe("ООО Ромашка");
    expect(parsed.type).toBe("INDIVIDUAL"); // default
  });

  it("принимает пустую строку как email (поле опциональное)", () => {
    const r = clientCreateSchema.safeParse({ name: "Тест", email: "" });
    expect(r.success).toBe(true);
  });

  it("отклоняет некорректный email", () => {
    const r = clientCreateSchema.safeParse({ name: "Тест", email: "not-email" });
    expect(r.success).toBe(false);
  });

  it("отклоняет пустое name", () => {
    const r = clientCreateSchema.safeParse({ name: "  " });
    expect(r.success).toBe(false);
  });
});

describe("requestItemSchema", () => {
  it("принимает строки в денежных/количественных полях (z.coerce.number)", () => {
    const parsed = requestItemSchema.parse({
      name: "Лист 2мм",
      quantity: "3.5",
      price: "100.50",
      total: "351.75",
    });
    expect(parsed.quantity).toBe(3.5);
    expect(parsed.price).toBe(100.5);
    expect(parsed.total).toBe(351.75);
  });

  it("дефолты применяются при отсутствии полей", () => {
    const parsed = requestItemSchema.parse({ name: "X" });
    expect(parsed.quantity).toBe(1);
    expect(parsed.unit).toBe("шт");
    expect(parsed.price).toBe(0);
  });
});

describe("userRoleEnum", () => {
  it("разрешает только известные роли", () => {
    for (const role of ["ADMIN", "MANAGER", "FOREMAN", "ENGINEER", "EMPLOYEE", "CONTRACTOR"]) {
      expect(userRoleEnum.safeParse(role).success).toBe(true);
    }
    expect(userRoleEnum.safeParse("OWNER").success).toBe(false);
    expect(userRoleEnum.safeParse("").success).toBe(false);
  });
});
