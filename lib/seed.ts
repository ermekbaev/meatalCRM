import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@metalcrm.ru" },
    update: {},
    create: {
      email: "admin@metalcrm.ru",
      password: adminPassword,
      name: "Администратор",
      role: "ADMIN",
    },
  });

  const managerPassword = await hash("manager123", 12);
  await prisma.user.upsert({
    where: { email: "manager@metalcrm.ru" },
    update: {},
    create: {
      email: "manager@metalcrm.ru",
      password: managerPassword,
      name: "Менеджер Иванов",
      role: "MANAGER",
    },
  });

  // Catalog
  const services = [
    { name: "Лазерная резка", unit: "м²", price: 1500, category: "Резка" },
    { name: "Гибка металла", unit: "м.п.", price: 800, category: "Гибка" },
    { name: "Сварочные работы", unit: "час", price: 2500, category: "Сварка" },
    { name: "Порошковая покраска", unit: "м²", price: 900, category: "Покраска" },
    { name: "Шлифовка", unit: "м²", price: 600, category: "Обработка" },
    { name: "Резка плазменная", unit: "м.п.", price: 700, category: "Резка" },
  ];

  for (const s of services) {
    await prisma.serviceCatalog.upsert({
      where: { id: s.name },
      update: {},
      create: s as any,
    });
  }

  console.log("Seed completed:", { admin: admin.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
