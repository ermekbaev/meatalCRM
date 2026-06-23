import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/Header";
import { FollowUpsView } from "./FollowUpsView";
import type { Prisma } from "@prisma/client";

const include = {
  client: { select: { id: true, name: true, shortName: true, phone: true } },
  assignee: { select: { id: true, name: true } },
  request: { select: { id: true, number: true, title: true } },
} satisfies Prisma.FollowUpInclude;

export default async function FollowUpsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "MANAGER") redirect("/dashboard");
  const userId = session.user.id;

  // Видимость: ADMIN — всё; MANAGER — свои/назначенные/по своим клиентам.
  const scope: Prisma.FollowUpWhereInput =
    role === "ADMIN"
      ? {}
      : { OR: [{ assigneeId: userId }, { createdById: userId }, { client: { managerId: userId } }] };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [overdue, today, upcoming, history] = await Promise.all([
    prisma.followUp.findMany({
      where: { AND: [scope, { status: "PENDING", dueDate: { lt: start } }] },
      include, orderBy: { dueDate: "asc" }, take: 200,
    }),
    prisma.followUp.findMany({
      where: { AND: [scope, { status: "PENDING", dueDate: { gte: start, lt: end } }] },
      include, orderBy: { dueDate: "asc" }, take: 200,
    }),
    prisma.followUp.findMany({
      where: { AND: [scope, { status: "PENDING", dueDate: { gte: end } }] },
      include, orderBy: { dueDate: "asc" }, take: 200,
    }),
    prisma.followUp.findMany({
      where: { AND: [scope, { status: { not: "PENDING" } }] },
      include, orderBy: { completedAt: "desc" }, take: 50,
    }),
  ]);

  const serialize = (f: (typeof overdue)[number]) => ({
    id: f.id,
    dueDate: f.dueDate.toISOString(),
    status: f.status,
    result: f.result,
    note: f.note,
    completedAt: f.completedAt ? f.completedAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
    assignee: f.assignee,
    request: f.request,
    client: f.client,
  });

  return (
    <div>
      <Header title="Обзвон клиентов" />
      <div className="p-4 lg:p-6">
        <FollowUpsView
          currentUserId={userId}
          overdue={overdue.map(serialize)}
          today={today.map(serialize)}
          upcoming={upcoming.map(serialize)}
          history={history.map(serialize)}
        />
      </div>
    </div>
  );
}
