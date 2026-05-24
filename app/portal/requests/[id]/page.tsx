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

  return <PortalRequestView request={request} currentUserId={session.user.id} />;
}
