import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanyDetail } from "./CompanyDetail";

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/dashboard");

  const { id } = await params;

  // ADMIN видит любую компанию; MANAGER — только где он `managerId`.
  const company = await prisma.client.findFirst({
    where: {
      id,
      isPortalEnabled: true,
      ...(role === "MANAGER" ? { managerId: session.user.id } : {}),
    },
    select: {
      id: true,
      name: true,
      inn: true,
      phone: true,
      email: true,
      createdAt: true,
      manager: { select: { id: true, name: true, email: true } },
      portalUsers: {
        select: { id: true, name: true, email: true, phone: true, isBlocked: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      portalRequests: {
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          createdAt: true,
          createdByUser: { select: { id: true, name: true } },
          _count: { select: { items: true, comments: true, files: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      clientPositions: {
        select: { id: true, name: true, unit: true, createdAt: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!company) notFound();

  return <CompanyDetail company={company} />;
}
