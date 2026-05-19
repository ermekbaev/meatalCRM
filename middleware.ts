import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.next();

  const role = (token as any).role;
  const pathname = req.nextUrl.pathname;

  if (role === "CONTRACTOR" && !pathname.startsWith("/tasks") && !pathname.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = "/tasks";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/requests/:path*",
    "/clients/:path*",
    "/offers/:path*",
    "/invoices/:path*",
    "/analytics/:path*",
    "/calculator/:path*",
    "/warehouse/:path*",
    "/settings/:path*",
    "/operator/:path*",
  ],
};
