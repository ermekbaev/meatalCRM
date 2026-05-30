import { z } from "zod";

/**
 * Схемы валидации входных данных API (zod).
 *
 * Назначение:
 *  - валидация и приведение типов тела запросов;
 *  - защита от mass-assignment: в Prisma попадают только перечисленные поля,
 *    а не сырой `req.json()`.
 *
 * Соглашения:
 *  - `*CreateSchema` — для POST (обязательные поля строгие);
 *  - `*UpdateSchema` — для PUT/PATCH (все поля опциональны, частичное обновление);
 *  - денежные/числовые поля принимают строки и приводятся к number (z.coerce).
 */

// ─── Enums (синхронизированы с prisma/schema.prisma) ──────────────────────────
export const userRoleEnum = z.enum([
  "ADMIN",
  "MANAGER",
  "FOREMAN",
  "ENGINEER",
  "EMPLOYEE",
  "CONTRACTOR",
  "CLIENT",
]);
export const clientTypeEnum = z.enum(["INDIVIDUAL", "COMPANY"]);
export const requestStatusEnum = z.enum([
  "NEW",
  "PENDING_APPROVAL",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED",
]);
export const paymentStatusEnum = z.enum(["NONE", "WAITING", "PAID"]);
export const priorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const offerStatusEnum = z.enum(["DRAFT", "SENT", "ACCEPTED", "REJECTED"]);
export const taskStatusEnum = z.enum([
  "TODO",
  "PENDING_APPROVAL",
  "IN_PROGRESS",
  "DONE",
  "CANCELLED",
]);

// ─── Переиспользуемые примитивы ──────────────────────────────────────────────
const cuid = z.string().min(1);
const optStr = z.string().trim().max(2000).nullish();
const money = z.coerce.number().finite();
const qty = z.coerce.number().finite();

// ─── Users ────────────────────────────────────────────────────────────────────
export const userCreateSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6, "Минимум 6 символов").max(200),
  name: z.string().trim().min(1, "Укажите имя").max(200),
  role: userRoleEnum,
  telegramChatId: optStr,
  phone: optStr,
  position: optStr,
});

export const userUpdateSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
  password: z.string().min(6).max(200).optional(),
  name: z.string().trim().min(1).max(200).optional(),
  role: userRoleEnum.optional(),
  isBlocked: z.boolean().optional(),
  telegramChatId: optStr,
  phone: optStr,
  position: optStr,
});

// ─── Clients ────────────────────────────────────────────────────────────────
export const clientCreateSchema = z.object({
  type: clientTypeEnum.default("INDIVIDUAL"),
  name: z.string().trim().min(1, "Укажите название клиента").max(300),
  phone: optStr,
  email: z.string().email().nullish().or(z.literal("")),
  inn: optStr,
  comment: optStr,
  source: optStr,
  shortName: optStr,
  director: optStr,
  kpp: optStr,
  ogrn: optStr,
  legalAddress: optStr,
  postalAddress: optStr,
  website: optStr,
  bankName: optStr,
  bankAccount: optStr,
  bankBik: optStr,
  bankCorAccount: optStr,
});
export const clientUpdateSchema = clientCreateSchema.partial();

// ─── Request items ────────────────────────────────────────────────────────────
export const requestItemSchema = z.object({
  name: z.string().trim().min(1).max(500),
  quantity: qty.default(1),
  unit: z.string().trim().max(50).default("шт"),
  price: money.default(0),
  discount: money.default(0),
  total: money.default(0),
  isCustomerMaterial: z.boolean().default(false),
  purchasePrice: money.nullish(),
});

// ─── Requests ──────────────────────────────────────────────────────────────────
const requestStatusFields = {
  hasMetal: optStr,
  metalOwner: optStr,
  laserStatus: optStr,
  bendingStatus: optStr,
  weldingStatus: optStr,
  paintingStatus: optStr,
  sandblastingStatus: optStr,
  extraWorkStatus: optStr,
  deliveryStatus: optStr,
};

export const requestCreateSchema = z.object({
  title: z.string().trim().min(1, "Укажите название заявки").max(500),
  description: optStr,
  status: requestStatusEnum.optional(),
  priority: priorityEnum.optional(),
  amount: money.nullish(),
  services: z.array(z.string()).optional(),
  clientId: cuid,
  assigneeId: cuid.nullish(),
  vatIncluded: z.boolean().optional(),
  paymentMethod: optStr,
  paymentStatus: paymentStatusEnum.optional(),
  ...requestStatusFields,
  items: z.array(requestItemSchema).optional(),
});

export const requestUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: optStr,
  status: requestStatusEnum.optional(),
  priority: priorityEnum.optional(),
  amount: money.nullish(),
  services: z.array(z.string()).optional(),
  clientId: cuid.optional(),
  assigneeId: cuid.nullish(),
  vatIncluded: z.boolean().optional(),
  paymentMethod: optStr,
  paymentStatus: paymentStatusEnum.optional(),
  ...requestStatusFields,
});

// ─── Offer items ──────────────────────────────────────────────────────────────
export const offerItemSchema = z.object({
  service: z.string().trim().min(1).max(500),
  description: optStr,
  quantity: qty.default(1),
  unit: z.string().trim().max(50).default("шт"),
  price: money,
  total: money,
});

export const offerCreateSchema = z.object({
  status: offerStatusEnum.optional(),
  discount: money.default(0),
  total: money.default(0),
  notes: optStr,
  validUntil: z.coerce.date().nullish(),
  requestId: cuid.nullish(),
  clientId: cuid.nullish(),
  numberOverride: optStr,
  vatRate: money.default(0),
  managerId: cuid.nullish(),
  managerCustom: optStr,
  deliveryTerms: optStr,
  items: z.array(offerItemSchema).optional(),
});
export const offerUpdateSchema = offerCreateSchema.partial();

// ─── Invoice items ────────────────────────────────────────────────────────────
export const invoiceItemSchema = z.object({
  name: z.string().trim().min(1).max(500),
  quantity: qty.default(1),
  unit: z.string().trim().max(50).default("шт"),
  price: money.default(0),
  total: money.default(0),
});

export const invoiceCreateSchema = z.object({
  date: z.coerce.date().optional(),
  dueDate: z.coerce.date().nullish(),
  basis: optStr,
  vatRate: money.default(0),
  notes: optStr,
  paymentStatus: paymentStatusEnum.optional(),
  clientId: cuid,
  requestId: cuid.nullish(),
  numberOverride: optStr,
  items: z.array(invoiceItemSchema).optional(),
});
export const invoiceUpdateSchema = invoiceCreateSchema.partial().extend({
  // Лёгкий режим: обновить только статус оплаты, не трогая позиции.
  paymentStatusOnly: z.boolean().optional(),
});

// ─── Tasks ──────────────────────────────────────────────────────────────────
const taskProductionFields = { ...requestStatusFields };

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, "Укажите название задачи").max(500),
  description: optStr,
  status: z.string().trim().max(50).optional(),
  priority: priorityEnum.optional(),
  dueDate: z.coerce.date().nullish(),
  clientId: cuid.nullish(),
  workshopId: cuid.nullish(),
  assigneeIds: z.array(cuid).optional(),
  assigneeId: cuid.nullish(), // legacy single-assignee fallback
  tagIds: z.array(cuid).optional(),
  ...taskProductionFields,
});
export const taskUpdateSchema = taskCreateSchema.partial();

// ─── Workshops ──────────────────────────────────────────────────────────────
export const workshopCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  order: z.coerce.number().int().optional(),
  isVirtual: z.boolean().optional(),
  memberIds: z.array(cuid).optional(),
});
export const workshopUpdateSchema = workshopCreateSchema.partial();

// ─── Warehouse ──────────────────────────────────────────────────────────────
export const warehouseCreateSchema = z.object({
  metalType: z.string().trim().min(1).max(200),
  steelGrade: optStr,
  thickness: optStr,
  size: optStr,
  unit: z.string().trim().max(50).default("шт"),
  quantity: qty.default(0),
  note: optStr,
  isActive: z.boolean().optional(),
});
export const warehouseUpdateSchema = warehouseCreateSchema.partial();

// ─── SubTasks ──────────────────────────────────────────────────────────────────
export const subTaskCreateSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(500),
  quantity: qty.nullish(),
  unit: z.string().trim().max(50).nullish(),
  priority: priorityEnum.optional(),
  status: taskStatusEnum.optional(),
  assigneeId: cuid.nullish(),
  dueDate: z.coerce.date().nullish(),
});

// Без .default() — чтобы Object.keys отражал только реально присланные поля
// (используется для ограничения «EMPLOYEE меняет только status»).
export const subTaskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  quantity: qty.nullish(),
  unit: z.string().trim().max(50).nullish(),
  priority: priorityEnum.optional(),
  status: taskStatusEnum.optional(),
  assigneeId: cuid.nullish(),
  dueDate: z.coerce.date().nullish(),
  order: z.coerce.number().int().optional(),
});

// ─── Checklist ──────────────────────────────────────────────────────────────────
export const checklistCreateSchema = z.object({
  text: z.string().trim().min(1, "Текст обязателен").max(1000),
});
export const checklistUpdateSchema = z.object({
  text: z.string().trim().min(1).max(1000).optional(),
  isCompleted: z.boolean().optional(),
});

// ─── Task tag (привязка/отвязка) ─────────────────────────────────────────────
export const taskTagSchema = z.object({ tagId: cuid });

// ─── Замена позиций заявки ──────────────────────────────────────────────────
export const requestItemsReplaceSchema = z.object({
  items: z.array(requestItemSchema).optional(),
});

// ─── Comments / texts ─────────────────────────────────────────────────────────
export const commentSchema = z.object({
  text: z.string().trim().min(1, "Комментарий не может быть пустым").max(5000),
});

// ─── Tags ──────────────────────────────────────────────────────────────────────
export const tagCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: z.string().trim().max(20).optional(),
});
export const tagUpdateSchema = tagCreateSchema.partial();

// ─── Task columns (доска задач) ──────────────────────────────────────────────
export const taskColumnCreateSchema = z.object({
  name: z.string().trim().min(1, "Имя обязательно").max(100),
  color: z.string().trim().max(20).optional(),
});
export const taskColumnUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  color: z.string().trim().max(20).optional(),
  order: z.coerce.number().int().optional(),
});

// ─── Catalog: услуги/товары ──────────────────────────────────────────────────
export const serviceCatalogCreateSchema = z.object({
  name: z.string().trim().min(1).max(500),
  description: optStr,
  unit: z.string().trim().max(50).default("шт"),
  price: money.nullish(),
  category: optStr,
  type: z.string().trim().max(50).default("service"),
  categoryId: cuid.nullish(),
  isActive: z.boolean().optional(),
  purchasePrice: money.nullish(),
});
export const serviceCatalogUpdateSchema = serviceCatalogCreateSchema.partial();

// ─── Catalog: категории ──────────────────────────────────────────────────────
export const catalogCategoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Название обязательно").max(200),
  parentId: cuid.nullish(),
  type: z.string().trim().max(50).default("service"),
});
export const catalogCategoryUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  parentId: cuid.nullish(),
});

// ─── Catalog: металл/гибка/резка (справочники калькулятора) ──────────────────
export const metalEntrySchema = z.object({
  materialId: z.string().trim().min(1).max(100),
  thickness: z.coerce.number().finite(),
  width: z.coerce.number().int(),
  length: z.coerce.number().int(),
  massPerSqM: z.coerce.number().finite(),
  sheetMass: z.coerce.number().finite(),
});
export const metalEntryUpdateSchema = metalEntrySchema.partial();

export const bendingEntrySchema = z.object({
  materialId: z.string().trim().min(1).max(100),
  thickness: z.coerce.number().finite(),
  price: z.coerce.number().finite(),
});
export const bendingEntryUpdateSchema = bendingEntrySchema.partial();

export const cuttingEntrySchema = z.object({
  materialId: z.string().trim().min(1).max(100),
  thickness: z.coerce.number().finite(),
  minLength: z.coerce.number().finite(),
  maxLength: z.coerce.number().finite().nullish(),
  pricePerMeter: z.coerce.number().finite(),
});
export const cuttingEntryUpdateSchema = cuttingEntrySchema.partial();

export const cuttingBulkSchema = z.object({
  materialId: z.string().trim().min(1).max(100),
  thickness: z.coerce.number().finite(),
  ranges: z.array(
    z.object({
      minLength: z.coerce.number().finite().default(0),
      maxLength: z.coerce.number().finite().nullish(),
      pricePerMeter: z.coerce.number().finite().default(0),
    })
  ),
});

// ─── Настройки компании ──────────────────────────────────────────────────────
export const companySettingsSchema = z.object({
  name: z.string().trim().max(300).optional(),
  shortName: optStr,
  inn: optStr,
  kpp: optStr,
  ogrn: optStr,
  legalAddress: optStr,
  postalAddress: optStr,
  phone: optStr,
  email: optStr,
  website: optStr,
  bankName: optStr,
  bankAccount: optStr,
  bankCorAccount: optStr,
  bankBik: optStr,
  director: optStr,
  accountantName: optStr,
  signatureImage: optStr,
  stampImage: optStr,
  logoImage: optStr,
  taskAutoArchiveHours: z.coerce.number().int().min(0).max(8760).optional(),
});

// ─── DaData (внешние подсказки) ──────────────────────────────────────────────
export const dadataQuerySchema = z.object({ query: z.string().trim().max(300).optional() });

// ─── Companies (кабинеты клиентов в портале) ────────────────────────────────
//
// «Компания» = Client(type=COMPANY, isPortalEnabled=true) + один CLIENT-пользователь.
// При создании ADMIN указывает данные компании, ответственного менеджера и одного
// пользователя-клиента. См. docs/client-portal-plan.md (раздел 3).
export const companyCreateSchema = z.object({
  name: z.string().trim().min(1, "Укажите название компании").max(300),
  shortName: optStr,
  inn: optStr,
  kpp: optStr,
  ogrn: optStr,
  legalAddress: optStr,
  director: optStr,
  phone: optStr,
  email: z.string().email().nullish().or(z.literal("")),
  managerId: cuid,
  user: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(6, "Минимум 6 символов").max(200),
    name: z.string().trim().min(1, "Укажите имя пользователя").max(200),
    phone: optStr,
  }),
});

/**
 * Привязка кабинета к УЖЕ существующему контрагенту (по ИНН в UI).
 * Реквизиты не передаются — берутся из существующего Client. Сервер только
 * выставит `isPortalEnabled=true`, проставит `managerId` и создаст одного
 * CLIENT-пользователя с `companyId`.
 */
export const companyAttachExistingSchema = z.object({
  existingClientId: cuid,
  managerId: cuid,
  user: z.object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(6, "Минимум 6 символов").max(200),
    name: z.string().trim().min(1, "Укажите имя пользователя").max(200),
    phone: optStr,
  }),
});

// Управление CLIENT-пользователями кабинета (отдельно от глобального
// userUpdateSchema, потому что роль и telegramChatId менять нельзя, а email
// должен быть уникальным в рамках всей таблицы User).
export const portalUserCreateSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(6, "Минимум 6 символов").max(200),
  name: z.string().trim().min(1, "Укажите имя").max(200),
  phone: optStr,
});

export const portalUserUpdateSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
  password: z.string().min(6).max(200).optional().or(z.literal("")),
  name: z.string().trim().min(1).max(200).optional(),
  phone: optStr,
  isBlocked: z.boolean().optional(),
});

export const companyUpdateSchema = z.object({
  name: z.string().trim().min(1).max(300).optional(),
  shortName: optStr,
  inn: optStr,
  kpp: optStr,
  ogrn: optStr,
  legalAddress: optStr,
  director: optStr,
  phone: optStr,
  email: z.string().email().nullish().or(z.literal("")),
  managerId: cuid.optional(),
  isPortalEnabled: z.boolean().optional(),
});

// ─── Portal: заявки кабинета клиента ─────────────────────────────────────────
//
// Источник истины для companyId/createdByUserId — серверная сессия, в схеме их
// нет (mass-assignment защита). См. app/api/portal/requests/route.ts.
export const portalRequestItemSchema = z.object({
  name: z.string().trim().min(1, "Укажите название позиции").max(500),
  quantity: qty.default(1),
  unit: z.string().trim().max(50).default("шт"),
  price: z.number().nonnegative().nullish(),
});

// Частичное обновление существующей позиции в портальной заявке.
export const portalRequestItemUpdateSchema = z.object({
  name: z.string().trim().min(1).max(500).optional(),
  quantity: qty.optional(),
  unit: z.string().trim().max(50).optional(),
  price: z.number().nonnegative().nullish(),
});

// Производственные подстатусы, доступные клиенту в портале. Подмножество
// `requestStatusFields` из CRM-заявки: убраны `hasMetal` и `metalOwner` —
// материалы это внутренняя кухня, клиент проставляет только нужные операции.
const portalProductionFields = {
  laserStatus: optStr,
  bendingStatus: optStr,
  weldingStatus: optStr,
  paintingStatus: optStr,
  sandblastingStatus: optStr,
  extraWorkStatus: optStr,
  deliveryStatus: optStr,
};

export const portalRequestCreateSchema = z.object({
  title: z.string().trim().min(1, "Укажите название заявки").max(500),
  description: optStr,
  ...portalProductionFields,
  items: z.array(portalRequestItemSchema).optional(),
});

export const portalRequestStatusSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "READY"]),
});

/**
 * Частичное обновление портальной заявки.
 *  - `status` — менять может только внутренний пользователь (роль проверяется в API).
 *  - Производственные поля (`laserStatus`, …) клиент может корректировать у себя
 *    уже после создания: «забыл отметить покраску».
 */
export const portalRequestUpdateSchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "READY"]).optional(),
  paymentStatus: z.enum(["NONE", "AWAITING", "PAID"]).optional(),
  // Описание заявки — может менять и клиент (её автор), и внутренний (см. API).
  description: z.string().trim().max(5000).nullish(),
  // Флаги «отгружено» / «принято». true → проставляется now(), false → сбрасывается.
  // Кто из них может менять что — проверяется в API.
  shipped: z.boolean().optional(),
  accepted: z.boolean().optional(),
  ...portalProductionFields,
});

// ─── Portal: номенклатура клиента ────────────────────────────────────────────
export const clientPositionCreateSchema = z.object({
  name: z.string().trim().min(1, "Укажите название").max(500),
  unit: z.string().trim().max(50).default("шт"),
  price: z.number().nonnegative().nullish(),
  folderId: cuid.nullish(),
});

export const clientPositionFolderSchema = z.object({
  name: z.string().trim().min(1, "Укажите название папки").max(200),
});

// ─── Push subscription ────────────────────────────────────────────────────────
export const pushSubscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
