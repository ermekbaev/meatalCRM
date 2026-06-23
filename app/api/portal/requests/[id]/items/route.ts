import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess, isPortalRequestLockedForClient } from "@/lib/acl";
import { portalRequestItemSchema } from "@/lib/validation";

/**
 * Добавление новой позиции в портальную заявку.
 * Если передан `positionId`, файлы из номенклатуры копируются в заявку.
 */
export const POST = withErrorHandling(async (req: NextRequest, { params }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { id } = await params;
  const access = await getPortalRequestAccess(session, id);
  if (!access) throw notFound();

  if (await isPortalRequestLockedForClient(id, session.user.role)) {
    throw forbidden("Заявка в работе — редактирование недоступно");
  }

  const data = await parseBody(req, portalRequestItemSchema);

  // Привязываем позицию заявки к номенклатуре только если она принадлежит компании.
  let linkedPositionId: string | null = null;
  if (data.positionId) {
    const pos = await prisma.clientPosition.findFirst({
      where: { id: data.positionId, companyId: access.companyId },
      select: { id: true },
    });
    linkedPositionId = pos?.id ?? null;
  }

  const created = await prisma.portalRequestItem.create({
    data: {
      portalRequestId: id,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      price: data.price ?? null,
      positionId: linkedPositionId,
    },
  });

  // Копируем файлы из позиции номенклатуры в заявку.
  if (data.positionId) {
    const positionFiles = await prisma.clientPositionFile.findMany({
      where: {
        positionId: data.positionId,
        position: { companyId: access.companyId },
      },
      select: { filename: true, originalName: true, size: true, kind: true },
    });

    for (const f of positionFiles) {
      await prisma.portalFile.create({
        data: {
          portalRequestId: id,
          filename: f.filename,
          originalName: f.originalName,
          size: f.size,
          kind: f.kind === "DXF" ? "DRAWING" : "DOCUMENT",
          uploadedById: session.user.id,
        },
      });
    }
  }

  return NextResponse.json(created, { status: 201 });
});
