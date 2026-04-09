"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie } from "./neon-auth";

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/");
}
