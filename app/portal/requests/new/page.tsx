import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NewPortalRequestForm } from "./NewPortalRequestForm";

export default async function NewPortalRequestPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.companyId) redirect("/login");

  const [positions, folders] = await Promise.all([
    prisma.clientPosition.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, unit: true, price: true, folderId: true },
      orderBy: { name: "asc" },
    }),
    prisma.clientPositionFolder.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <NewPortalRequestForm positions={positions} folders={folders} />;
}
