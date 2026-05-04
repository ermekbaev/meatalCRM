import { PrismaClient, RequestStatus, RequestPriority, OfferStatus, TaskStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ─── Пользователи ───────────────────────────────────────────────────────────
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@metalcrm.ru" },
    update: {},
    create: {
      email: "admin@metalcrm.ru",
      password: adminPassword,
      name: "Кириллов Александр",
      role: "ADMIN",
      phone: "+7 (999) 100-00-01",
    },
  });

  const m1Pass = await hash("manager123", 12);
  const manager1 = await prisma.user.upsert({
    where: { email: "ivanov@metalcrm.ru" },
    update: {},
    create: {
      email: "ivanov@metalcrm.ru",
      password: m1Pass,
      name: "Иванов Дмитрий",
      role: "MANAGER",
      phone: "+7 (999) 200-00-01",
    },
  });

  const m2Pass = await hash("manager123", 12);
  const manager2 = await prisma.user.upsert({
    where: { email: "petrov@metalcrm.ru" },
    update: {},
    create: {
      email: "petrov@metalcrm.ru",
      password: m2Pass,
      name: "Петров Сергей",
      role: "MANAGER",
      phone: "+7 (999) 200-00-02",
    },
  });

  // ─── Настройки компании ──────────────────────────────────────────────────────
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      name: 'ООО "Металл Профи"',
      shortName: 'ООО "Металл Профи"',
      inn: "7701234567",
      kpp: "770101001",
      ogrn: "1027700123456",
      legalAddress: "г. Москва, ул. Промышленная, д. 15, стр. 2",
      postalAddress: "г. Москва, ул. Промышленная, д. 15, стр. 2",
      phone: "+7 (495) 123-45-67",
      email: "info@metall-profi.ru",
      website: "www.metall-profi.ru",
      bankName: "ПАО Сбербанк",
      bankAccount: "40702810338000123456",
      bankCorAccount: "30101810400000000225",
      bankBik: "044525225",
      director: "Кириллов Александр Сергеевич",
      accountantName: "Смирнова Ольга Ивановна",
    },
  });

  // ─── Каталог услуг ───────────────────────────────────────────────────────────
  const categories = [
    { name: "Резка", type: "service" },
    { name: "Гибка", type: "service" },
    { name: "Сварка", type: "service" },
    { name: "Покраска", type: "service" },
    { name: "Материалы", type: "service" },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const existing = await prisma.catalogCategory.findFirst({ where: { name: cat.name } });
    if (existing) {
      createdCategories[cat.name] = existing.id;
    } else {
      const c = await prisma.catalogCategory.create({ data: cat });
      createdCategories[c.name] = c.id;
    }
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

  for (const s of serviceItems) {
    const existing = await prisma.serviceCatalog.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.serviceCatalog.create({
        data: {
          name: s.name,
          unit: s.unit,
          price: s.price,
          purchasePrice: s.purchasePrice,
          isActive: true,
          categoryId: createdCategories[s.category],
        },
      });
    }
  }

  // ─── Каталог металлов ────────────────────────────────────────────────────────
  const metalEntries = [
    { materialId: "steel_hk", thickness: 1.5, width: 1500, length: 3000, massPerSqM: 11.775, sheetMass: 52.99 },
    { materialId: "steel_hk", thickness: 2.0, width: 1500, length: 3000, massPerSqM: 15.7, sheetMass: 70.65 },
    { materialId: "steel_gk", thickness: 3.0, width: 1500, length: 6000, massPerSqM: 23.55, sheetMass: 212.0 },
    { materialId: "steel_gk", thickness: 6.0, width: 1500, length: 6000, massPerSqM: 47.1, sheetMass: 424.0 },
    { materialId: "steel_gk", thickness: 8.0, width: 1500, length: 6000, massPerSqM: 62.8, sheetMass: 565.0 },
    { materialId: "alusheet",  thickness: 2.0, width: 1500, length: 3000, massPerSqM: 5.4, sheetMass: 24.3 },
  ];

  for (const m of metalEntries) {
    await prisma.metalCatalogEntry.upsert({
      where: { materialId_thickness_width_length: { materialId: m.materialId, thickness: m.thickness, width: m.width, length: m.length } },
      update: {},
      create: m,
    });
  }

  // ─── Клиенты ─────────────────────────────────────────────────────────────────
  const clientsData = [
    {
      type: "COMPANY", name: 'ООО "СтройМонтаж"', shortName: 'ООО "СтройМонтаж"',
      inn: "7702345678", kpp: "770201001", phone: "+7 (495) 111-22-33",
      email: "info@stroymont.ru", director: "Сидоров Андрей Петрович",
      legalAddress: "г. Москва, ул. Строительная, д. 5",
    },
    {
      type: "COMPANY", name: 'ЗАО "Промтехника"', shortName: 'ЗАО "Промтехника"',
      inn: "7703456789", kpp: "770301001", phone: "+7 (495) 222-33-44",
      email: "zakaz@promteh.ru", director: "Козлов Виктор Иванович",
      legalAddress: "г. Москва, Варшавское шоссе, д. 87",
    },
    {
      type: "COMPANY", name: 'ООО "АгроМаш"', shortName: 'ООО "АгроМаш"',
      inn: "5001234567", kpp: "500101001", phone: "+7 (496) 333-44-55",
      email: "agromash@mail.ru", director: "Волков Николай Сергеевич",
      legalAddress: "Московская обл., г. Подольск, ул. Заводская, д. 12",
    },
    {
      type: "COMPANY", name: 'ИП Захаров Р.В.', shortName: 'ИП Захаров Р.В.',
      inn: "771098765432", phone: "+7 (916) 444-55-66",
      email: "zakharov.rv@gmail.com",
      legalAddress: "г. Москва, ул. Ленина, д. 25, кв. 14",
    },
    {
      type: "INDIVIDUAL", name: "Морозов Алексей Геннадьевич",
      phone: "+7 (926) 555-66-77", email: "morozov.ag@mail.ru",
    },
    {
      type: "COMPANY", name: 'ООО "МеталлГрупп"', shortName: 'ООО "МеталлГрупп"',
      inn: "7704567890", kpp: "770401001", phone: "+7 (495) 555-00-11",
      email: "info@metallgroup.ru", director: "Новиков Павел Дмитриевич",
      legalAddress: "г. Москва, ул. Металлургов, д. 3",
    },
  ];

  const clients: any[] = [];
  for (const c of clientsData) {
    const existing = await prisma.client.findFirst({ where: { name: c.name } });
    if (existing) {
      clients.push(existing);
    } else {
      const created = await prisma.client.create({ data: c as any });
      clients.push(created);
    }
  }

  // ─── Заявки с позициями ───────────────────────────────────────────────────────
  const requestsData = [
    {
      title: "Лазерная резка деталей корпуса",
      description: "Резка листового металла 3мм, 45 деталей по чертежу DXF-001",
      status: "COMPLETED", priority: "HIGH", amount: 87500,
      clientIdx: 0, assigneeId: manager1.id,
      items: [
        { name: "Лазерная резка", quantity: 12.5, unit: "м²", price: 1800, purchasePrice: 900, total: 22500 },
        { name: "Лист г/к 3мм", quantity: 280, unit: "кг", price: 95, purchasePrice: 65, total: 26600 },
        { name: "Порошковая покраска", quantity: 12.5, unit: "м²", price: 950, purchasePrice: 400, total: 11875 },
        { name: "Гибка металла", quantity: 32, unit: "м.п.", price: 850, purchasePrice: 400, total: 27200 },
      ],
    },
    {
      title: "Изготовление металлоконструкций для склада",
      description: "Стойки, перекрытия, крепёжные элементы. Материал ст3.",
      status: "COMPLETED", priority: "HIGH", amount: 215000,
      clientIdx: 1, assigneeId: manager1.id,
      items: [
        { name: "Лист г/к 6мм", quantity: 850, unit: "кг", price: 90, purchasePrice: 62, total: 76500 },
        { name: "Сварочные работы MIG/MAG", quantity: 28, unit: "час", price: 2500, purchasePrice: 1200, total: 70000 },
        { name: "Труба профильная 40x40", quantity: 145, unit: "м.п.", price: 280, purchasePrice: 180, total: 40600 },
        { name: "Порошковая покраска", quantity: 30, unit: "м²", price: 950, purchasePrice: 400, total: 28500 },
      ],
    },
    {
      title: "Нестандартные крепёжные пластины",
      description: "25 штук, толщина 8мм, отверстия по чертежу",
      status: "COMPLETED", priority: "MEDIUM", amount: 42000,
      clientIdx: 2, assigneeId: manager2.id,
      items: [
        { name: "Лист г/к 8мм", quantity: 185, unit: "кг", price: 90, purchasePrice: 62, total: 16650 },
        { name: "Лазерная резка", quantity: 5.5, unit: "м²", price: 1800, purchasePrice: 900, total: 9900 },
        { name: "Сварочные работы TIG", quantity: 5, unit: "час", price: 3000, purchasePrice: 1500, total: 15000 },
      ],
    },
    {
      title: "Ограждения для производственного цеха",
      description: "Секционное ограждение 25 погонных метров, h=1.2м",
      status: "IN_PROGRESS", priority: "MEDIUM", amount: 98000,
      clientIdx: 0, assigneeId: manager2.id,
      items: [
        { name: "Труба профильная 40x40", quantity: 180, unit: "м.п.", price: 280, purchasePrice: 180, total: 50400 },
        { name: "Сварочные работы MIG/MAG", quantity: 14, unit: "час", price: 2500, purchasePrice: 1200, total: 35000 },
        { name: "Жидкая покраска", quantity: 30, unit: "м²", price: 700, purchasePrice: 300, total: 21000 },
      ],
    },
    {
      title: "Резка алюминиевых профилей",
      description: "Гидроабразивная резка, 3 типа деталей",
      status: "IN_PROGRESS", priority: "LOW", amount: 31500,
      clientIdx: 3, assigneeId: manager1.id,
      items: [
        { name: "Гидроабразивная резка", quantity: 18, unit: "м.п.", price: 1200, purchasePrice: 600, total: 21600 },
        { name: "Лист х/к 1.5мм", quantity: 82, unit: "кг", price: 120, purchasePrice: 80, total: 9840 },
      ],
    },
    {
      title: "Детали для с/х техники",
      description: "Кронштейны и крепления для трактора К-700",
      status: "NEW", priority: "MEDIUM", amount: 55000,
      clientIdx: 2, assigneeId: manager2.id,
      items: [
        { name: "Плазменная резка", quantity: 48, unit: "м.п.", price: 750, purchasePrice: 350, total: 36000 },
        { name: "Гибка металла", quantity: 22, unit: "м.п.", price: 850, purchasePrice: 400, total: 18700 },
      ],
    },
    {
      title: "Рамы для стеллажного оборудования",
      description: "5 рам 2000x800, профильная труба 60x40",
      status: "COMPLETED", priority: "HIGH", amount: 74000,
      clientIdx: 5, assigneeId: manager1.id,
      items: [
        { name: "Труба профильная 40x40", quantity: 95, unit: "м.п.", price: 280, purchasePrice: 180, total: 26600 },
        { name: "Сварочные работы MIG/MAG", quantity: 12, unit: "час", price: 2500, purchasePrice: 1200, total: 30000 },
        { name: "Порошковая покраска", quantity: 18.5, unit: "м²", price: 950, purchasePrice: 400, total: 17575 },
      ],
    },
    {
      title: "Корпус электрощита нестандартный",
      description: "Нержавейка 2мм, IP54, 2 шт.",
      status: "PENDING_APPROVAL", priority: "URGENT", amount: 38000,
      clientIdx: 1, assigneeId: manager2.id,
      items: [
        { name: "Лазерная резка", quantity: 4.2, unit: "м²", price: 1800, purchasePrice: 900, total: 7560 },
        { name: "Гибка металла", quantity: 16, unit: "м.п.", price: 850, purchasePrice: 400, total: 13600 },
        { name: "Сварочные работы TIG", quantity: 4, unit: "час", price: 3000, purchasePrice: 1500, total: 12000 },
        { name: "Жидкая покраска", quantity: 6.5, unit: "м²", price: 700, purchasePrice: 300, total: 4550 },
      ],
    },
    {
      title: "Швеллеры для перекрытия проёма",
      description: "Швеллер №16, длина 4.2м, 3 штуки",
      status: "CANCELLED", priority: "LOW", amount: 18000,
      clientIdx: 4, assigneeId: manager1.id,
      items: [
        { name: "Швеллер 5мм", quantity: 155, unit: "кг", price: 105, purchasePrice: 70, total: 16275 },
      ],
    },
    {
      title: "Лестничные ступени промышленные",
      description: "12 ступеней с рифлёной поверхностью, ст3",
      status: "COMPLETED", priority: "MEDIUM", amount: 62000,
      clientIdx: 5, assigneeId: manager1.id,
      items: [
        { name: "Лист г/к 6мм", quantity: 340, unit: "кг", price: 90, purchasePrice: 62, total: 30600 },
        { name: "Лазерная резка", quantity: 7.5, unit: "м²", price: 1800, purchasePrice: 900, total: 13500 },
        { name: "Сварочные работы MIG/MAG", quantity: 6, unit: "час", price: 2500, purchasePrice: 1200, total: 15000 },
        { name: "Порошковая покраска", quantity: 14, unit: "м²", price: 950, purchasePrice: 400, total: 13300 },
      ],
    },
  ];

  const requests: any[] = [];
  for (let i = 0; i < requestsData.length; i++) {
    const r = requestsData[i];
    const existing = await prisma.request.findFirst({ where: { title: r.title } });
    if (existing) {
      requests.push(existing);
      continue;
    }
    const created = await prisma.request.create({
      data: {
        title: r.title,
        description: r.description,
        status: r.status as RequestStatus,
        priority: r.priority as RequestPriority,
        amount: r.amount,
        clientId: clients[r.clientIdx].id,
        assigneeId: r.assigneeId,
        createdAt: new Date(Date.now() - (requestsData.length - i) * 7 * 24 * 60 * 60 * 1000),
        items: {
          create: r.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            price: item.price,
            purchasePrice: item.purchasePrice,
            total: item.total,
          })),
        },
      },
    });
    requests.push(created);
  }

  // ─── Коммерческие предложения ────────────────────────────────────────────────
  const offersData = [
    {
      status: "ACCEPTED", total: 87500, vatRate: 20, discount: 0,
      requestIdx: 0, clientIdx: 0, managerId: manager1.id,
      notes: "Оплата 50% предоплата",
      items: [
        { service: "Лазерная резка", quantity: 12.5, unit: "м²", price: 1800, total: 22500 },
        { service: "Лист г/к 3мм", quantity: 280, unit: "кг", price: 95, total: 26600 },
        { service: "Порошковая покраска", quantity: 12.5, unit: "м²", price: 950, total: 11875 },
        { service: "Гибка металла", quantity: 32, unit: "м.п.", price: 850, total: 27200 },
      ],
    },
    {
      status: "ACCEPTED", total: 215000, vatRate: 20, discount: 5,
      requestIdx: 1, clientIdx: 1, managerId: manager1.id,
      notes: "Скидка 5% за объём",
      items: [
        { service: "Лист г/к 6мм", quantity: 850, unit: "кг", price: 90, total: 76500 },
        { service: "Сварочные работы MIG/MAG", quantity: 28, unit: "час", price: 2500, total: 70000 },
        { service: "Труба профильная 40x40", quantity: 145, unit: "м.п.", price: 280, total: 40600 },
        { service: "Порошковая покраска", quantity: 30, unit: "м²", price: 950, total: 28500 },
      ],
    },
    {
      status: "SENT", total: 98000, vatRate: 20, discount: 0,
      requestIdx: 3, clientIdx: 0, managerId: manager2.id,
      notes: "Срок изготовления 14 рабочих дней",
      items: [
        { service: "Труба профильная 40x40", quantity: 180, unit: "м.п.", price: 280, total: 50400 },
        { service: "Сварочные работы MIG/MAG", quantity: 14, unit: "час", price: 2500, total: 35000 },
        { service: "Жидкая покраска", quantity: 30, unit: "м²", price: 700, total: 21000 },
      ],
    },
    {
      status: "DRAFT", total: 55000, vatRate: 20, discount: 0,
      requestIdx: 5, clientIdx: 2, managerId: manager2.id,
      items: [
        { service: "Плазменная резка", quantity: 48, unit: "м.п.", price: 750, total: 36000 },
        { service: "Гибка металла", quantity: 22, unit: "м.п.", price: 850, total: 18700 },
      ],
    },
    {
      status: "REJECTED", total: 18000, vatRate: 20, discount: 0,
      requestIdx: 8, clientIdx: 4, managerId: manager1.id,
      notes: "Клиент отказался из-за сроков",
      items: [
        { service: "Швеллер 5мм", quantity: 155, unit: "кг", price: 105, total: 16275 },
      ],
    },
  ];

  for (let i = 0; i < offersData.length; i++) {
    const o = offersData[i];
    const existingOffer = await prisma.commercialOffer.findFirst({
      where: { requestId: requests[o.requestIdx]?.id },
    });
    if (existingOffer) continue;
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
        createdAt: new Date(Date.now() - (offersData.length - i) * 5 * 24 * 60 * 60 * 1000),
        items: { create: o.items },
      },
    });
  }

  // ─── Счета ────────────────────────────────────────────────────────────────────
  const invoicesData = [
    {
      requestIdx: 0, clientIdx: 0, vatRate: 20,
      items: [
        { name: "Лазерная резка (12.5 м²)", quantity: 1, unit: "шт", price: 22500, total: 22500 },
        { name: "Лист г/к 3мм (280 кг)", quantity: 1, unit: "шт", price: 26600, total: 26600 },
        { name: "Порошковая покраска (12.5 м²)", quantity: 1, unit: "шт", price: 11875, total: 11875 },
        { name: "Гибка металла (32 м.п.)", quantity: 1, unit: "шт", price: 27200, total: 27200 },
      ],
    },
    {
      requestIdx: 1, clientIdx: 1, vatRate: 20,
      items: [
        { name: "Металлоконструкции для склада (комплект)", quantity: 1, unit: "шт", price: 215000, total: 215000 },
      ],
    },
    {
      requestIdx: 6, clientIdx: 5, vatRate: 20,
      items: [
        { name: "Рамы стеллажные (5 шт.)", quantity: 5, unit: "шт", price: 14800, total: 74000 },
      ],
    },
  ];

  for (const inv of invoicesData) {
    const existing = await prisma.invoice.findFirst({
      where: { requestId: requests[inv.requestIdx]?.id },
    });
    if (existing) continue;
    await prisma.invoice.create({
      data: {
        vatRate: inv.vatRate,
        clientId: clients[inv.clientIdx].id,
        requestId: requests[inv.requestIdx]?.id,
        createdById: admin.id,
        items: { create: inv.items },
      },
    });
  }

  // ─── Задачи ───────────────────────────────────────────────────────────────────
  const tasksData = [
    {
      title: "Согласовать чертежи с клиентом СтройМонтаж",
      description: "Проверить DXF файлы и отправить на утверждение",
      status: "DONE", priority: "HIGH",
      assigneeId: manager1.id, clientIdx: 0,
    },
    {
      title: "Заказать листовой металл 6мм",
      description: "Заказ на 850 кг ст3, поставщик — МеталлТорг",
      status: "DONE", priority: "HIGH",
      assigneeId: manager2.id, clientIdx: null,
    },
    {
      title: "Выставить счёт ЗАО Промтехника",
      description: "По заявке №2 на металлоконструкции",
      status: "DONE", priority: "MEDIUM",
      assigneeId: manager1.id, clientIdx: 1,
    },
    {
      title: "Проверить качество покраски — ограждения",
      description: "ОТК по заявке №4, сфотографировать и загрузить в систему",
      status: "IN_PROGRESS", priority: "MEDIUM",
      assigneeId: manager2.id, clientIdx: 0,
    },
    {
      title: "Подготовить КП для ООО АгроМаш",
      description: "Детали для К-700, уточнить количество отверстий",
      status: "TODO", priority: "HIGH",
      assigneeId: manager2.id, clientIdx: 2,
    },
    {
      title: "Пролонгировать договор с МеталлГрупп",
      description: "Договор истекает через 2 недели",
      status: "TODO", priority: "MEDIUM",
      assigneeId: manager1.id, clientIdx: 5,
    },
    {
      title: "Обслуживание лазерного станка",
      description: "Плановое ТО, вызвать инженера",
      status: "IN_PROGRESS", priority: "URGENT",
      assigneeId: admin.id, clientIdx: null,
    },
  ];

  for (const t of tasksData) {
    const existing = await prisma.task.findFirst({ where: { title: t.title } });
    if (existing) continue;
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as RequestPriority,
        assigneeId: t.assigneeId,
        createdById: admin.id,
        clientId: t.clientIdx !== null ? clients[t.clientIdx].id : null,
      },
    });
  }

  console.log("✅ Seed завершён успешно!");
  console.log("   Пользователи: admin@metalcrm.ru / admin123");
  console.log("               ivanov@metalcrm.ru / manager123");
  console.log("               petrov@metalcrm.ru / manager123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
