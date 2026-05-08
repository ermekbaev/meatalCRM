import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? 30), 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  // Все подзадачи в периоде (по updatedAt — момент перехода в DONE)
  const subtasks = await prisma.subTask.findMany({
    where: { updatedAt: { gte: since } },
    select: {
      id: true,
      status: true,
      assigneeId: true,
      createdAt: true,
      updatedAt: true,
      task: { select: { workshop: { select: { id: true, name: true } } } },
    },
  });

  const done = subtasks.filter((s) => s.status === "DONE");
  const totalDone = done.length;
  const inProgress = subtasks.filter((s) => s.status === "IN_PROGRESS").length;

  // Среднее время выполнения (от createdAt до updatedAt) для DONE — в часах
  const avgHours = done.length > 0
    ? done.reduce((sum, s) => sum + (s.updatedAt.getTime() - s.createdAt.getTime()), 0) / done.length / 1000 / 60 / 60
    : 0;

  // Топ операторов по выполненным
  const byAssignee = new Map<string, number>();
  for (const s of done) {
    if (!s.assigneeId) continue;
    byAssignee.set(s.assigneeId, (byAssignee.get(s.assigneeId) ?? 0) + 1);
  }

  const assigneeIds = Array.from(byAssignee.keys());
  const users = assigneeIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, position: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const topOperators = Array.from(byAssignee.entries())
    .map(([userId, count]) => ({
      userId,
      name: userMap.get(userId)?.name ?? "Без имени",
      position: userMap.get(userId)?.position ?? null,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // По дням
  const byDay = new Map<string, number>();
  for (const s of done) {
    const key = s.updatedAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  const dailySeries: Array<{ date: string; count: number }> = [];
  const cursor = new Date(since);
  const today = new Date();
  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    dailySeries.push({ date: key, count: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // По цехам
  const byWorkshop = new Map<string, { name: string; count: number }>();
  for (const s of done) {
    const w = s.task?.workshop;
    if (!w) continue;
    const cur = byWorkshop.get(w.id) ?? { name: w.name, count: 0 };
    cur.count += 1;
    byWorkshop.set(w.id, cur);
  }
  const workshops = Array.from(byWorkshop.values()).sort((a, b) => b.count - a.count);

  return NextResponse.json({
    totalDone,
    inProgress,
    avgHours: Math.round(avgHours * 10) / 10,
    topOperators,
    dailySeries,
    workshops,
  });
}
