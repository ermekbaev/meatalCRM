import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { query } = await req.json();
  if (!query) return NextResponse.json({ suggestions: [] });

  const apiKey = process.env.DADATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DADATA_API_KEY not configured" }, { status: 500 });

  const res = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Token ${apiKey}`,
    },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  return NextResponse.json(data);
}
