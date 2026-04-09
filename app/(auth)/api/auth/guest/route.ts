import { NextResponse } from "next/server";
import { auth, createGuestSession } from "@/lib/auth/neon-auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawRedirect = searchParams.get("redirectUrl") || "/";
  const redirectUrl =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const session = await auth();

  if (session) {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  // Create guest session
  await createGuestSession();

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
