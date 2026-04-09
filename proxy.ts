import { type NextRequest, NextResponse } from "next/server";
import { guestRegex, isDevelopmentEnvironment } from "./lib/constants";

// Verify session token using jose
async function verifyToken(token: string): Promise<{ email?: string } | null> {
  try {
    const { jwtVerify } = await import("jose");
    const secret = process.env.NEON_AUTH_COOKIE_SECRET;
    if (!secret) return null;
    
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    
    return { email: payload.email as string | undefined };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Get session from cookie
  const sessionCookie = request.cookies.get("neon_auth_session");
  const token = sessionCookie?.value;
  
  let sessionUser: { email?: string } | null = null;
  if (token) {
    sessionUser = await verifyToken(token);
  }

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!sessionUser) {
    const redirectUrl = encodeURIComponent(new URL(request.url).pathname);

    return NextResponse.redirect(
      new URL(`${base}/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
    );
  }

  const isGuest = guestRegex.test(sessionUser?.email ?? "");

  if (sessionUser && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
