"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { signOutAction } from "@/lib/auth/actions";

export function SignOutForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
      router.refresh();
    });
  };

  return (
    <button
      className="w-full cursor-pointer text-[13px] text-left px-1 py-0.5"
      onClick={handleSignOut}
      disabled={isPending}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
