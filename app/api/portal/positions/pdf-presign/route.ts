import { NextResponse } from "next/server";

// Заменено на /api/portal/positions/pdf-upload
export function POST() {
  return NextResponse.json({ error: "Используйте /api/portal/positions/pdf-upload" }, { status: 410 });
}
