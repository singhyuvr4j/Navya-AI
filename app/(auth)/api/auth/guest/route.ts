import { NextResponse } from "next/server";
import { auth, createGuestSession } from "@/lib/auth/neon-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawRedirect = searchParams.get("redirectUrl") || "/";
    const redirectUrl =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
        ? rawRedirect
        : "/";

    // Check if user already has a session
    const session = await auth();

    if (session) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      return NextResponse.redirect(new URL(`${base}/`, request.url));
    }

    // Create guest session
    await createGuestSession();

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error) {
    console.error("Guest auth error:", error);
    
    // Return a more helpful error response
    return new NextResponse(
      JSON.stringify({
        error: "Authentication failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
