import { NextResponse } from "next/server";

// Устаревший маршрут — файлы позиций теперь управляются через
// /api/portal/positions/[id]/files и /api/portal/positions/[id]/files/[fileId].
export const GET = () => NextResponse.json({ error: "Используйте /api/portal/positions/[id]/files" }, { status: 410 });
export const DELETE = () => NextResponse.json({ error: "Используйте /api/portal/positions/[id]/files/[fileId]" }, { status: 410 });
