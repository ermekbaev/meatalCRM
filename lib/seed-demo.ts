/**
 * ДЕМО-SEED для metalcrm.
 *
 * Наполняет базу связной историей металлообрабатывающего производства, чтобы
 * потенциальный заказчик, открыв демо, сразу видел живую систему во всех
 * разделах: заявки по всем статусам, КП, счета, канбан задач с цехами,
 * склад металлопроката, портал клиента (заявки/номенклатура), воронку
 * обзвона (follow-up), каталог услуг и металлов.
 *
 * ВНИМАНИЕ: скрипт ПОЛНОСТЬЮ ОЧИЩАЕТ базу перед заливкой.
 * Запускать ТОЛЬКО на демо-БД. Требует переменную DEMO_SEED=true.
 *
 * Запуск (PowerShell):
 *   $env:DEMO_SEED="true"; npm run db:seed:demo
 * Запуск (bash):
 *   DEMO_SEED=true npm run db:seed:demo
 *
 * Основной вход в демо:  demo@metalcrm.ru  /  demo   (роль ADMIN, видит всё)
 */

import {
  PrismaClient,
  RequestStatus,
  RequestPriority,
  OfferStatus,
  PaymentStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";

if (process.env.DEMO_SEED !== "true") {
  console.error(
    "\n⛔ Отказ: этот скрипт ПОЛНОСТЬЮ очищает базу.\n" +
      "   Запускай только на демо-БД с DEMO_SEED=true.\n" +
      '   PowerShell:  $env:DEMO_SEED="true"; npm run db:seed:demo\n'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const DAY = 86_400_000;
const d = (n: number) => new Date(Date.now() + n * DAY);

async function wipe() {
  // порядок важен: сначала дочерние таблицы, потом родительские
  await prisma.followUp.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.portalComment.deleteMany();
  await prisma.portalFile.deleteMany();
  await prisma.portalRequestSubtask.deleteMany();
  await prisma.portalRequestSubtaskCategory.deleteMany();
  await prisma.portalRequestItem.deleteMany();
  await prisma.portalRequest.deleteMany();
  await prisma.clientPositionFile.deleteMany();
  await prisma.clientPosition.deleteMany();
  await prisma.clientPositionFolder.deleteMany();
  await prisma.taskChangeLog.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskFile.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.subTask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.workshop.deleteMany();
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.offerItem.deleteMany();
  await prisma.commercialOffer.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.changeLog.deleteMany();
  await prisma.requestFile.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.requestSubtask.deleteMany();
  await prisma.requestSubtaskCategory.deleteMany();
  await prisma.request.deleteMany();
  await prisma.warehouseItem.deleteMany();
  await prisma.serviceCatalog.deleteMany();
  await prisma.catalogCategory.deleteMany();
  await prisma.metalCatalogEntry.deleteMany();
  await prisma.bendingCatalogEntry.deleteMany();
  await prisma.cuttingCatalogEntry.deleteMany();
  await prisma.taskColumn.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await wipe();

  // ─── Пользователи (все роли) ────────────────────────────────────────────
  const h = (p: string) => hash(p, 12);

  const demo = await prisma.user.create({
    data: { email: "demo@metalcrm.ru", password: await h("demo"), name: "Демо-доступ", role: "ADMIN", phone: "+7 (999) 100-00-00", position: "Администратор" },
  });
  const admin = await prisma.user.create({
    data: { email: "admin@metalcrm.ru", password: await h("admin123"), name: "Кириллов Александр", role: "ADMIN", phone: "+7 (999) 100-00-01", position: "Директор" },
  });
  const manager1 = await prisma.user.create({
    data: { email: "ivanov@metalcrm.ru", password: await h("manager123"), name: "Иванов Дмитрий", role: "MANAGER", phone: "+7 (999) 200-00-01", position: "Менеджер по продажам" },
  });
  const manager2 = await prisma.user.create({
    data: { email: "petrov@metalcrm.ru", password: await h("manager123"), name: "Петров Сергей", role: "MANAGER", phone: "+7 (999) 200-00-02", position: "Менеджер по продажам" },
  });
  const foreman = await prisma.user.create({
    data: { email: "foreman@metalcrm.ru", password: await h("foreman123"), name: "Гаврилов Пётр", role: "FOREMAN", phone: "+7 (999) 300-00-01", position: "Мастер цеха" },
  });
  const engineer = await prisma.user.create({
    data: { email: "engineer@metalcrm.ru", password: await h("engineer123"), name: "Соколов Игорь", role: "ENGINEER", phone: "+7 (999) 400-00-01", position: "Инженер-конструктор" },
  });

  // ─── Настройки компании ─────────────────────────────────────────────────
  await prisma.companySettings.create({
    data: {
      id: "singleton",
      name: 'ООО «Металл Профи»',
      shortName: 'ООО «Металл Профи»',
      inn: "7701234567",
      kpp: "770101001",
      ogrn: "1027700123456",
      legalAddress: "г. Москва, ул. Промышленная, д. 15, стр. 2",
      postalAddress: "г. Москва, ул. Промышленная, д. 15, стр. 2",
      phone: "+7 (495) 123-45-67",
      email: "info@metall-profi.ru",
      website: "metall-profi.ru",
      bankName: "ПАО Сбербанк",
      bankAccount: "40702810338000123456",
      bankCorAccount: "30101810400000000225",
      bankBik: "044525225",
      director: "Кириллов Александр Сергеевич",
      accountantName: "Смирнова Ольга Ивановна",
    },
  });

  // ─── Колонки канбана ────────────────────────────────────────────────────
  await prisma.taskColumn.createMany({
    data: [
      { key: "TODO", name: "Новые", color: "#94a3b8", order: 0, isSystem: true },
      { key: "IN_PROGRESS", name: "В работе", color: "#3b82f6", order: 1 },
      { key: "PENDING_APPROVAL", name: "На согласовании", color: "#f59e0b", order: 2 },
      { key: "DONE", name: "Готово", color: "#10b981", order: 3, isSystem: true },
    ],
  });

  // ─── Цеха ───────────────────────────────────────────────────────────────
  const wsLaser = await prisma.workshop.create({
    data: { name: "Лазерный участок", order: 1, members: { connect: [{ id: foreman.id }, { id: engineer.id }] } },
  });
  const wsBend = await prisma.workshop.create({
    data: { name: "Гибочный участок", order: 2, members: { connect: [{ id: foreman.id }] } },
  });
  const wsWeld = await prisma.workshop.create({
    data: { name: "Сварочный участок", order: 3, members: { connect: [{ id: foreman.id }] } },
  });
  const wsPaint = await prisma.workshop.create({
    data: { name: "Покрасочный участок", order: 4, members: { connect: [{ id: foreman.id }] } },
  });

  // ─── Каталог услуг ──────────────────────────────────────────────────────
  const categoryNames = ["Резка", "Гибка", "Сварка", "Покраска", "Материалы"];
  const catId: Record<string, string> = {};
  for (let i = 0; i < categoryNames.length; i++) {
    const c = await prisma.catalogCategory.create({ data: { name: categoryNames[i], type: "service", order: i } });
    catId[c.name] = c.id;
  }

  const serviceItems = [
    { name: "Лазерная резка", unit: "м²", price: 1800, purchasePrice: 900, category: "Резка" },
    { name: "Плазменная резка", unit: "м.п.", price: 750, purchasePrice: 350, category: "Резка" },
    { name: "Гидроабразивная резка", unit: "м.п.", price: 1200, purchasePrice: 600, category: "Резка" },
    { name: "Гибка металла", unit: "м.п.", price: 850, purchasePrice: 400, category: "Гибка" },
    { name: "Гибка труб", unit: "м.п.", price: 950, purchasePrice: 450, category: "Гибка" },
    { name: "Сварочные работы TIG", unit: "час", price: 3000, purchasePrice: 1500, category: "Сварка" },
    { name: "Сварочные работы MIG/MAG", unit: "час", price: 2500, purchasePrice: 1200, category: "Сварка" },
    { name: "Порошковая покраска", unit: "м²", price: 950, purchasePrice: 400, category: "Покраска" },
    { name: "Жидкая покраска", unit: "м²", price: 700, purchasePrice: 300, category: "Покраска" },
    { name: "Лист х/к 1.5мм", unit: "кг", price: 120, purchasePrice: 80, category: "Материалы" },
    { name: "Лист г/к 3мм", unit: "кг", price: 95, purchasePrice: 65, category: "Материалы" },
    { name: "Лист г/к 6мм", unit: "кг", price: 90, purchasePrice: 62, category: "Материалы" },
    { name: "Труба профильная 40x40", unit: "м.п.", price: 280, purchasePrice: 180, category: "Материалы" },
    { name: "Швеллер 5мм", unit: "кг", price: 105, purchasePrice: 70, category: "Материалы" },
  ];
  await prisma.serviceCatalog.createMany({
    data: serviceItems.map((s) => ({
      name: s.name, unit: s.unit, price: s.price, purchasePrice: s.purchasePrice, isActive: true, categoryId: catId[s.category],
    })),
  });

  // ─── Каталог металлов ───────────────────────────────────────────────────
  await prisma.metalCatalogEntry.createMany({
    data: [
      { materialId: "steel_hk", thickness: 1.5, width: 1500, length: 3000, massPerSqM: 11.775, sheetMass: 52.99 },
      { materialId: "steel_hk", thickness: 2.0, width: 1500, length: 3000, massPerSqM: 15.7, sheetMass: 70.65 },
      { materialId: "steel_gk", thickness: 3.0, width: 1500, length: 6000, massPerSqM: 23.55, sheetMass: 212.0 },
      { materialId: "steel_gk", thickness: 6.0, width: 1500, length: 6000, massPerSqM: 47.1, sheetMass: 424.0 },
      { materialId: "steel_gk", thickness: 8.0, width: 1500, length: 6000, massPerSqM: 62.8, sheetMass: 565.0 },
      { materialId: "alusheet", thickness: 2.0, width: 1500, length: 3000, massPerSqM: 5.4, sheetMass: 24.3 },
    ],
  });

  // ─── Склад металлопроката ───────────────────────────────────────────────
  await prisma.warehouseItem.createMany({
    data: [
      { metalType: "Лист г/к", steelGrade: "Ст3", thickness: "3 мм", size: "1500×6000", unit: "лист", quantity: 24, updatedById: foreman.id },
      { metalType: "Лист г/к", steelGrade: "Ст3", thickness: "6 мм", size: "1500×6000", unit: "лист", quantity: 12, updatedById: foreman.id },
      { metalType: "Лист х/к", steelGrade: "08пс", thickness: "1.5 мм", size: "1250×2500", unit: "лист", quantity: 30, updatedById: foreman.id },
      { metalType: "Труба профильная", steelGrade: "Ст3", thickness: "2 мм", size: "40×40, 6 м", unit: "шт", quantity: 85, updatedById: foreman.id },
      { metalType: "Швеллер", steelGrade: "Ст3", thickness: "—", size: "№16, 12 м", unit: "шт", quantity: 6, note: "Заканчивается, заказать", updatedById: foreman.id },
      { metalType: "Уголок", steelGrade: "Ст3", thickness: "5 мм", size: "50×50, 6 м", unit: "шт", quantity: 40, updatedById: foreman.id },
      { metalType: "Нержавейка лист", steelGrade: "AISI 304", thickness: "2 мм", size: "1250×2500", unit: "лист", quantity: 8, updatedById: foreman.id },
    ],
  });

  // ─── Клиенты (со статусом воронки) ──────────────────────────────────────
  const clientsData = [
    { type: "COMPANY", name: 'ООО «СтройМонтаж»', shortName: 'ООО «СтройМонтаж»', inn: "7702345678", kpp: "770201001", phone: "+7 (495) 111-22-33", email: "info@stroymont.ru", director: "Сидоров Андрей Петрович", legalAddress: "г. Москва, ул. Строительная, д. 5", source: "Рекомендация", relationStatus: "IN_WORK", isPortalEnabled: true, managerId: manager1.id },
    { type: "COMPANY", name: 'ЗАО «Промтехника»', shortName: 'ЗАО «Промтехника»', inn: "7703456789", kpp: "770301001", phone: "+7 (495) 222-33-44", email: "zakaz@promteh.ru", director: "Козлов Виктор Иванович", legalAddress: "г. Москва, Варшавское шоссе, д. 87", source: "Сайт", relationStatus: "WON", managerId: manager1.id },
    { type: "COMPANY", name: 'ООО «АгроМаш»', shortName: 'ООО «АгроМаш»', inn: "5001234567", kpp: "500101001", phone: "+7 (496) 333-44-55", email: "agromash@mail.ru", director: "Волков Николай Сергеевич", legalAddress: "Московская обл., г. Подольск, ул. Заводская, д. 12", source: "Холодный звонок", relationStatus: "THINKING", managerId: manager2.id },
    { type: "COMPANY", name: "ИП Захаров Р.В.", shortName: "ИП Захаров Р.В.", inn: "771098765432", phone: "+7 (916) 444-55-66", email: "zakharov.rv@gmail.com", legalAddress: "г. Москва, ул. Ленина, д. 25, кв. 14", source: "Авито", relationStatus: "NEW", managerId: manager1.id },
    { type: "INDIVIDUAL", name: "Морозов Алексей Геннадьевич", phone: "+7 (926) 555-66-77", email: "morozov.ag@mail.ru", source: "Реклама", relationStatus: "LOST", managerId: manager1.id },
    { type: "COMPANY", name: 'ООО «МеталлГрупп»', shortName: 'ООО «МеталлГрупп»', inn: "7704567890", kpp: "770401001", phone: "+7 (495) 555-00-11", email: "info@metallgroup.ru", director: "Новиков Павел Дмитриевич", legalAddress: "г. Москва, ул. Металлургов, д. 3", source: "Рекомендация", relationStatus: "WON", managerId: manager2.id },
  ];
  const clients: { id: string }[] = [];
  for (const c of clientsData) {
    clients.push(await prisma.client.create({ data: c as any }));
  }

  // ─── Заявки с позициями ─────────────────────────────────────────────────
  const requestsData = [
    { title: "Лазерная резка деталей корпуса", description: "Резка листового металла 3мм, 45 деталей по чертежу DXF-001", status: "COMPLETED", priority: "HIGH", amount: 87500, paymentStatus: "PAID", clientIdx: 0, assigneeId: manager1.id,
      items: [
        { name: "Лазерная резка", quantity: 12.5, unit: "м²", price: 1800, purchasePrice: 900, total: 22500 },
        { name: "Лист г/к 3мм", quantity: 280, unit: "кг", price: 95, purchasePrice: 65, total: 26600 },
        { name: "Порошковая покраска", quantity: 12.5, unit: "м²", price: 950, purchasePrice: 400, total: 11875 },
        { name: "Гибка металла", quantity: 32, unit: "м.п.", price: 850, purchasePrice: 400, total: 27200 },
      ] },
    { title: "Изготовление металлоконструкций для склада", description: "Стойки, перекрытия, крепёжные элементы. Материал ст3.", status: "COMPLETED", priority: "HIGH", amount: 215000, paymentStatus: "PAID", clientIdx: 1, assigneeId: manager1.id,
      items: [
        { name: "Лист г/к 6мм", quantity: 850, unit: "кг", price: 90, purchasePrice: 62, total: 76500 },
        { name: "Сварочные работы MIG/MAG", quantity: 28, unit: "час", price: 2500, purchasePrice: 1200, total: 70000 },
        { name: "Труба профильная 40x40", quantity: 145, unit: "м.п.", price: 280, purchasePrice: 180, total: 40600 },
        { name: "Порошковая покраска", quantity: 30, unit: "м²", price: 950, purchasePrice: 400, total: 28500 },
      ] },
    { title: "Нестандартные крепёжные пластины", description: "25 штук, толщина 8мм, отверстия по чертежу", status: "COMPLETED", priority: "MEDIUM", amount: 42000, paymentStatus: "PAID", clientIdx: 2, assigneeId: manager2.id,
      items: [
        { name: "Лист г/к 8мм", quantity: 185, unit: "кг", price: 90, purchasePrice: 62, total: 16650 },
        { name: "Лазерная резка", quantity: 5.5, unit: "м²", price: 1800, purchasePrice: 900, total: 9900 },
        { name: "Сварочные работы TIG", quantity: 5, unit: "час", price: 3000, purchasePrice: 1500, total: 15000 },
      ] },
    { title: "Ограждения для производственного цеха", description: "Секционное ограждение 25 погонных метров, h=1.2м", status: "IN_PROGRESS", priority: "MEDIUM", amount: 98000, paymentStatus: "PREPAID", clientIdx: 0, assigneeId: manager2.id,
      items: [
        { name: "Труба профильная 40x40", quantity: 180, unit: "м.п.", price: 280, purchasePrice: 180, total: 50400 },
        { name: "Сварочные работы MIG/MAG", quantity: 14, unit: "час", price: 2500, purchasePrice: 1200, total: 35000 },
        { name: "Жидкая покраска", quantity: 30, unit: "м²", price: 700, purchasePrice: 300, total: 21000 },
      ] },
    { title: "Резка алюминиевых профилей", description: "Гидроабразивная резка, 3 типа деталей", status: "IN_PROGRESS", priority: "LOW", amount: 31500, paymentStatus: "WAITING", clientIdx: 3, assigneeId: manager1.id,
      items: [
        { name: "Гидроабразивная резка", quantity: 18, unit: "м.п.", price: 1200, purchasePrice: 600, total: 21600 },
        { name: "Лист х/к 1.5мм", quantity: 82, unit: "кг", price: 120, purchasePrice: 80, total: 9840 },
      ] },
    { title: "Детали для с/х техники", description: "Кронштейны и крепления для трактора К-700", status: "NEW", priority: "MEDIUM", amount: 55000, paymentStatus: "NONE", clientIdx: 2, assigneeId: manager2.id,
      items: [
        { name: "Плазменная резка", quantity: 48, unit: "м.п.", price: 750, purchasePrice: 350, total: 36000 },
        { name: "Гибка металла", quantity: 22, unit: "м.п.", price: 850, purchasePrice: 400, total: 18700 },
      ] },
    { title: "Рамы для стеллажного оборудования", description: "5 рам 2000x800, профильная труба 60x40", status: "COMPLETED", priority: "HIGH", amount: 74000, paymentStatus: "PAID", clientIdx: 5, assigneeId: manager1.id,
      items: [
        { name: "Труба профильная 40x40", quantity: 95, unit: "м.п.", price: 280, purchasePrice: 180, total: 26600 },
        { name: "Сварочные работы MIG/MAG", quantity: 12, unit: "час", price: 2500, purchasePrice: 1200, total: 30000 },
        { name: "Порошковая покраска", quantity: 18.5, unit: "м²", price: 950, purchasePrice: 400, total: 17575 },
      ] },
    { title: "Корпус электрощита нестандартный", description: "Нержавейка 2мм, IP54, 2 шт.", status: "PENDING_APPROVAL", priority: "URGENT", amount: 38000, paymentStatus: "WAITING", clientIdx: 1, assigneeId: manager2.id,
      items: [
        { name: "Лазерная резка", quantity: 4.2, unit: "м²", price: 1800, purchasePrice: 900, total: 7560 },
        { name: "Гибка металла", quantity: 16, unit: "м.п.", price: 850, purchasePrice: 400, total: 13600 },
        { name: "Сварочные работы TIG", quantity: 4, unit: "час", price: 3000, purchasePrice: 1500, total: 12000 },
        { name: "Жидкая покраска", quantity: 6.5, unit: "м²", price: 700, purchasePrice: 300, total: 4550 },
      ] },
    { title: "Швеллеры для перекрытия проёма", description: "Швеллер №16, длина 4.2м, 3 штуки", status: "CANCELLED", priority: "LOW", amount: 18000, paymentStatus: "NONE", clientIdx: 4, assigneeId: manager1.id,
      items: [
        { name: "Швеллер 5мм", quantity: 155, unit: "кг", price: 105, purchasePrice: 70, total: 16275 },
      ] },
    { title: "Лестничные ступени промышленные", description: "12 ступеней с рифлёной поверхностью, ст3", status: "READY", priority: "MEDIUM", amount: 62000, paymentStatus: "PREPAID", clientIdx: 5, assigneeId: manager1.id,
      items: [
        { name: "Лист г/к 6мм", quantity: 340, unit: "кг", price: 90, purchasePrice: 62, total: 30600 },
        { name: "Лазерная резка", quantity: 7.5, unit: "м²", price: 1800, purchasePrice: 900, total: 13500 },
        { name: "Сварочные работы MIG/MAG", quantity: 6, unit: "час", price: 2500, purchasePrice: 1200, total: 15000 },
        { name: "Порошковая покраска", quantity: 14, unit: "м²", price: 950, purchasePrice: 400, total: 13300 },
      ] },
  ];

  const requests: { id: string }[] = [];
  for (let i = 0; i < requestsData.length; i++) {
    const r = requestsData[i];
    const created = await prisma.request.create({
      data: {
        title: r.title,
        description: r.description,
        status: r.status as RequestStatus,
        priority: r.priority as RequestPriority,
        paymentStatus: r.paymentStatus as PaymentStatus,
        amount: r.amount,
        clientId: clients[r.clientIdx].id,
        assigneeId: r.assigneeId,
        createdById: manager1.id,
        createdAt: d(-(requestsData.length - i) * 7),
        items: { create: r.items },
      },
    });
    requests.push(created);
  }

  // Комментарии и история к паре заявок
  await prisma.comment.createMany({
    data: [
      { requestId: requests[3].id, userId: manager2.id, text: "Клиент внёс предоплату 50%, запускаем в цех." },
      { requestId: requests[3].id, userId: foreman.id, text: "Труба на складе есть, покраску начнём после сварки." },
      { requestId: requests[7].id, userId: manager2.id, text: "Отправил КП на согласование, ждём ответ по нержавейке." },
    ],
  });
  await prisma.changeLog.createMany({
    data: [
      { requestId: requests[0].id, field: "status", oldValue: "READY", newValue: "COMPLETED", userId: manager1.id },
      { requestId: requests[3].id, field: "status", oldValue: "NEW", newValue: "IN_PROGRESS", userId: manager2.id },
      { requestId: requests[9].id, field: "status", oldValue: "IN_PROGRESS", newValue: "READY", userId: foreman.id },
    ],
  });

  // ─── Коммерческие предложения ───────────────────────────────────────────
  const offersData = [
    { status: "ACCEPTED", total: 87500, vatRate: 20, discount: 0, requestIdx: 0, clientIdx: 0, managerId: manager1.id, notes: "Оплата 50% предоплата",
      items: [
        { service: "Лазерная резка", quantity: 12.5, unit: "м²", price: 1800, total: 22500 },
        { service: "Лист г/к 3мм", quantity: 280, unit: "кг", price: 95, total: 26600 },
        { service: "Порошковая покраска", quantity: 12.5, unit: "м²", price: 950, total: 11875 },
        { service: "Гибка металла", quantity: 32, unit: "м.п.", price: 850, total: 27200 },
      ] },
    { status: "ACCEPTED", total: 215000, vatRate: 20, discount: 5, requestIdx: 1, clientIdx: 1, managerId: manager1.id, notes: "Скидка 5% за объём",
      items: [
        { service: "Лист г/к 6мм", quantity: 850, unit: "кг", price: 90, total: 76500 },
        { service: "Сварочные работы MIG/MAG", quantity: 28, unit: "час", price: 2500, total: 70000 },
        { service: "Труба профильная 40x40", quantity: 145, unit: "м.п.", price: 280, total: 40600 },
        { service: "Порошковая покраска", quantity: 30, unit: "м²", price: 950, total: 28500 },
      ] },
    { status: "SENT", total: 98000, vatRate: 20, discount: 0, requestIdx: 3, clientIdx: 0, managerId: manager2.id, notes: "Срок изготовления 14 рабочих дней",
      items: [
        { service: "Труба профильная 40x40", quantity: 180, unit: "м.п.", price: 280, total: 50400 },
        { service: "Сварочные работы MIG/MAG", quantity: 14, unit: "час", price: 2500, total: 35000 },
        { service: "Жидкая покраска", quantity: 30, unit: "м²", price: 700, total: 21000 },
      ] },
    { status: "DRAFT", total: 55000, vatRate: 20, discount: 0, requestIdx: 5, clientIdx: 2, managerId: manager2.id,
      items: [
        { service: "Плазменная резка", quantity: 48, unit: "м.п.", price: 750, total: 36000 },
        { service: "Гибка металла", quantity: 22, unit: "м.п.", price: 850, total: 18700 },
      ] },
    { status: "REJECTED", total: 18000, vatRate: 20, discount: 0, requestIdx: 8, clientIdx: 4, managerId: manager1.id, notes: "Клиент отказался из-за сроков",
      items: [
        { service: "Швеллер 5мм", quantity: 155, unit: "кг", price: 105, total: 16275 },
      ] },
  ];
  for (let i = 0; i < offersData.length; i++) {
    const o = offersData[i];
    await prisma.commercialOffer.create({
      data: {
        status: o.status as OfferStatus,
        total: o.total,
        vatRate: o.vatRate,
        discount: o.discount,
        notes: o.notes,
        requestId: requests[o.requestIdx]?.id,
        clientId: clients[o.clientIdx].id,
        createdById: admin.id,
        managerId: o.managerId,
        createdAt: d(-(offersData.length - i) * 5),
        items: { create: o.items },
      },
    });
  }

  // ─── Счета ──────────────────────────────────────────────────────────────
  const invoicesData = [
    { requestIdx: 0, clientIdx: 0, vatRate: 20, paymentStatus: "PAID",
      items: [
        { name: "Лазерная резка (12.5 м²)", quantity: 1, unit: "шт", price: 22500, total: 22500 },
        { name: "Лист г/к 3мм (280 кг)", quantity: 1, unit: "шт", price: 26600, total: 26600 },
        { name: "Порошковая покраска (12.5 м²)", quantity: 1, unit: "шт", price: 11875, total: 11875 },
        { name: "Гибка металла (32 м.п.)", quantity: 1, unit: "шт", price: 27200, total: 27200 },
      ] },
    { requestIdx: 1, clientIdx: 1, vatRate: 20, paymentStatus: "PAID",
      items: [{ name: "Металлоконструкции для склада (комплект)", quantity: 1, unit: "шт", price: 215000, total: 215000 }] },
    { requestIdx: 6, clientIdx: 5, vatRate: 20, paymentStatus: "PAID",
      items: [{ name: "Рамы стеллажные (5 шт.)", quantity: 5, unit: "шт", price: 14800, total: 74000 }] },
    { requestIdx: 3, clientIdx: 0, vatRate: 20, paymentStatus: "PREPAID",
      items: [{ name: "Ограждение секционное 25 м.п. (предоплата 50%)", quantity: 1, unit: "шт", price: 49000, total: 49000 }] },
  ];
  for (const inv of invoicesData) {
    await prisma.invoice.create({
      data: {
        vatRate: inv.vatRate,
        paymentStatus: inv.paymentStatus as PaymentStatus,
        clientId: clients[inv.clientIdx].id,
        requestId: requests[inv.requestIdx]?.id,
        createdById: admin.id,
        items: { create: inv.items },
      },
    });
  }

  // ─── Теги ───────────────────────────────────────────────────────────────
  const tagSrochno = await prisma.tag.create({ data: { name: "Срочно", color: "#ef4444" } });
  const tagVip = await prisma.tag.create({ data: { name: "VIP", color: "#f59e0b" } });
  const tagOtk = await prisma.tag.create({ data: { name: "ОТК", color: "#8b5cf6" } });

  // ─── Задачи (канбан) ────────────────────────────────────────────────────
  const t1 = await prisma.task.create({
    data: {
      title: "Согласовать чертежи со СтройМонтаж", description: "Проверить DXF и отправить на утверждение",
      status: "DONE", priority: "HIGH", createdById: admin.id, clientId: clients[0].id,
      assignees: { connect: [{ id: manager1.id }, { id: engineer.id }] },
      tags: { connect: [{ id: tagVip.id }] },
      checklist: { create: [
        { text: "Скачать DXF от клиента", isCompleted: true, order: 1 },
        { text: "Проверить размеры", isCompleted: true, order: 2 },
        { text: "Отправить на утверждение", isCompleted: true, order: 3 },
      ] },
    },
  });
  const t2 = await prisma.task.create({
    data: {
      title: "Ограждение цеха: сварка секций", description: "Заявка №4, 25 м.п.",
      status: "IN_PROGRESS", priority: "MEDIUM", createdById: manager2.id, clientId: clients[0].id,
      workshopId: wsWeld.id, assignees: { connect: [{ id: foreman.id }] },
      subtasks: { create: [
        { title: "Нарезать трубу", status: "DONE", order: 1, assigneeId: foreman.id },
        { title: "Сварить секции", status: "IN_PROGRESS", order: 2, assigneeId: foreman.id },
        { title: "Покраска", status: "TODO", order: 3 },
      ] },
    },
  });
  await prisma.task.create({
    data: { title: "Заказать листовой металл 6мм", description: "850 кг ст3, поставщик МеталлТорг", status: "DONE", priority: "HIGH", createdById: admin.id, assignees: { connect: [{ id: manager2.id }] } },
  });
  await prisma.task.create({
    data: { title: "Выставить счёт ЗАО Промтехника", status: "DONE", priority: "MEDIUM", createdById: admin.id, clientId: clients[1].id, assignees: { connect: [{ id: manager1.id }] } },
  });
  await prisma.task.create({
    data: { title: "ОТК покраски — ограждения", description: "Сфотографировать и загрузить в систему", status: "IN_PROGRESS", priority: "MEDIUM", createdById: manager2.id, clientId: clients[0].id, workshopId: wsPaint.id, assignees: { connect: [{ id: foreman.id }] }, tags: { connect: [{ id: tagOtk.id }] } },
  });
  await prisma.task.create({
    data: { title: "Подготовить КП для АгроМаш", description: "Детали для К-700, уточнить отверстия", status: "TODO", priority: "HIGH", createdById: manager2.id, clientId: clients[2].id, assignees: { connect: [{ id: manager2.id }] } },
  });
  await prisma.task.create({
    data: { title: "Лазерная резка ступеней", description: "Заявка №10, лист 6мм", status: "PENDING_APPROVAL", priority: "MEDIUM", createdById: foreman.id, clientId: clients[5].id, workshopId: wsLaser.id, assignees: { connect: [{ id: engineer.id }] } },
  });
  await prisma.task.create({
    data: { title: "ТО лазерного станка", description: "Плановое обслуживание, вызвать инженера", status: "IN_PROGRESS", priority: "URGENT", createdById: admin.id, workshopId: wsLaser.id, assignees: { connect: [{ id: engineer.id }] }, tags: { connect: [{ id: tagSrochno.id }] } },
  });
  void t1; void t2;

  // ─── Портал клиента (СтройМонтаж, portal-enabled) ───────────────────────
  const portalUser = await prisma.user.create({
    data: { email: "portal@stroymont.ru", password: await h("portal123"), name: "Сидоров А.П. (СтройМонтаж)", role: "CLIENT", companyId: clients[0].id, position: "Снабженец" },
  });

  // Номенклатура клиента
  const folder = await prisma.clientPositionFolder.create({ data: { companyId: clients[0].id, name: "Типовые детали" } });
  const posBracket = await prisma.clientPosition.create({ data: { companyId: clients[0].id, folderId: folder.id, name: "Кронштейн К-12", unit: "шт", price: 850 } });
  await prisma.clientPosition.create({ data: { companyId: clients[0].id, folderId: folder.id, name: "Пластина 200×100, 8мм", unit: "шт", price: 420 } });
  await prisma.clientPosition.create({ data: { companyId: clients[0].id, name: "Уголок монтажный 50×50", unit: "шт", price: 260 } });

  const pr1 = await prisma.portalRequest.create({
    data: {
      companyId: clients[0].id, createdByUserId: portalUser.id,
      title: "Кронштейны для конвейера, 40 шт", description: "По чертежу из номенклатуры, срок 10 дней",
      status: "NEW", priority: "NORMAL", paymentStatus: "NONE", finalizedAt: d(-1),
      laserStatus: "Нужна", bendingStatus: "Нужна", paintingStatus: "Нужна",
      items: { create: [{ name: "Кронштейн К-12", quantity: 40, unit: "шт", price: 850, positionId: posBracket.id }] },
    },
  });
  const pr2 = await prisma.portalRequest.create({
    data: {
      companyId: clients[0].id, createdByUserId: portalUser.id,
      title: "Резка листа под заказ", description: "Лист 3мм, раскрой по DXF",
      status: "IN_PROGRESS", priority: "HIGH", paymentStatus: "AWAITING", finalizedAt: d(-3), shippedAt: null,
      laserStatus: "Нужна",
      items: { create: [{ name: "Лазерная резка (раскрой)", quantity: 8, unit: "м²", price: 1800 }] },
    },
  });
  await prisma.portalComment.createMany({
    data: [
      { portalRequestId: pr1.id, userId: portalUser.id, text: "Прикладываю чертёж, нужно как в прошлый раз." },
      { portalRequestId: pr2.id, userId: manager1.id, text: "Приняли в работу, счёт на предоплату отправим сегодня." },
    ],
  });

  // ─── Воронка обзвона (follow-up) ────────────────────────────────────────
  await prisma.followUp.createMany({
    data: [
      { clientId: clients[2].id, assigneeId: manager2.id, createdById: manager2.id, dueDate: d(1), status: "PENDING", note: "Перезвонить по КП на детали К-700, думает" },
      { clientId: clients[3].id, assigneeId: manager1.id, createdById: manager1.id, dueDate: d(-1), status: "PENDING", note: "Уточнить, готов ли исходник DXF" },
      { clientId: clients[4].id, assigneeId: manager1.id, createdById: manager1.id, dueDate: d(-4), status: "DONE", result: "REFUSED", note: "Отказался по срокам", completedAt: d(-4) },
      { clientId: clients[1].id, assigneeId: manager1.id, createdById: manager1.id, dueDate: d(-6), status: "DONE", result: "AGREED", note: "Согласовал заказ на металлоконструкции", completedAt: d(-6) },
    ],
  });

  // ─── Итог ───────────────────────────────────────────────────────────────
  const [reqCount, offerCount, invCount, taskCount, portalCount] = await Promise.all([
    prisma.request.count(),
    prisma.commercialOffer.count(),
    prisma.invoice.count(),
    prisma.task.count(),
    prisma.portalRequest.count(),
  ]);
  console.log("\n✅ Демо-данные залиты.");
  console.log(`   Заявки: ${reqCount} | КП: ${offerCount} | Счета: ${invCount} | Задачи: ${taskCount} | Портал: ${portalCount}`);
  console.log("\n   Вход в демо:");
  console.log("   demo@metalcrm.ru      / demo         — Администратор (видит всё)");
  console.log("   ivanov@metalcrm.ru    / manager123   — Менеджер");
  console.log("   foreman@metalcrm.ru   / foreman123   — Мастер цеха");
  console.log("   portal@stroymont.ru   / portal123    — Клиент (портал)\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
