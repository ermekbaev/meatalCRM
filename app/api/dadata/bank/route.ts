import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withErrorHandling, parseBody, unauthorized } from "@/lib/api-handler";
import { dadataQuerySchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) throw unauthorized();

  const { query } = await parseBody(req, dadataQuerySchema);
  if (!query) return NextResponse.json({ suggestions: [] });

  const apiKey = process.env.DADATA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DADATA_API_KEY not configured" }, { status: 500 });

  const res = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/bank", {
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
});
