import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("bookflow_session")?.value;
  const session = token ? await verifySession(token) : null;

  if (!session || (session.role !== "owner" && session.role !== "staff")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*"] };