import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/neon-auth";

// This route is kept for backward compatibility but uses Neon Auth
export async function GET() {
  const session = await auth();
  return NextResponse.json(session);
}

export async function POST() {
  const session = await auth();
  return NextResponse.json(session);
}
