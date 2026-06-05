import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandling, parseBody, unauthorized, forbidden, notFound } from "@/lib/api-handler";
import { getPortalRequestAccess } from "@/lib/acl";
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

  if (session.user.role === "CLIENT") {
    const portalReq = await prisma.portalRequest.findUnique({ where: { id }, select: { status: true } });
    if (portalReq?.status === "IN_PROGRESS" || portalReq?.status === "READY") {
      throw forbidden("Заявка в работе — редактирование недоступно");
    }
  }

  const data = await parseBody(req, portalRequestItemSchema);

  const created = await prisma.portalRequestItem.create({
    data: {
      portalRequestId: id,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      price: data.price ?? null,
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
