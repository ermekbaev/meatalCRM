import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalPositionsView } from "./PortalPositionsView";

export default async function PortalPositionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user.companyId) redirect("/login");

  const [positions, folders] = await Promise.all([
    prisma.clientPosition.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, unit: true, price: true, folderId: true, pdfKey: true, pdfName: true, createdAt: true },
      orderBy: { name: "asc" },
    }),
    prisma.clientPositionFolder.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <PortalPositionsView initialPositions={positions} initialFolders={folders} />;
}
