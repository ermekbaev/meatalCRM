import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PortalRequestView } from "./PortalRequestView";

export default async function PortalRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user.companyId) redirect("/login");

  const { id } = await params;

  const request = await prisma.portalRequest.findFirst({
    where: { id, companyId: session.user.companyId },
    include: {
      items: { orderBy: { name: "asc" } },
      comments: {
        include: { user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
      },
      files: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!request) notFound();

  // Номенклатура компании — для быстрого добавления позиций.
  // Если таблицы ещё нет на сервере (миграция не накатана) — дефолтим в пустые массивы,
  // чтобы не крашить всю страницу.
  let positions: { id: string; name: string; unit: string; price: number | null; folderId: string | null }[] = [];
  let folders: { id: string; name: string }[] = [];
  try {
    [positions, folders] = await Promise.all([
      prisma.clientPosition.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true, unit: true, price: true, folderId: true, files: { select: { id: true, filename: true, originalName: true, size: true, kind: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.clientPositionFolder.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
  } catch (e) {
    console.error("[portal/requests/[id]] Failed to load positions/folders:", e);
  }

  return (
    <PortalRequestView
      request={request}
      currentUserId={session.user.id}
      positions={positions}
      folders={folders}
    />
  );
}
