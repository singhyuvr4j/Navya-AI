"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/neon-auth";

async function handleSignOut() {
  await signOut();
  redirect("/");
}

export const SignOutForm = () => {
  return (
    <form action={handleSignOut} className="w-full">
      <button
        className="w-full px-1 py-0.5 text-left text-red-500"
        type="submit"
      >
        Sign out
      </button>
    </form>
  );
};
