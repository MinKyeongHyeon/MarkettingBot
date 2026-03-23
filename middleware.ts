import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/ollama")) {
    const key = req.headers.get("x-api-key");
    if (key !== process.env.VERCEL_API_KEY) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/ollama/:path*"] };
