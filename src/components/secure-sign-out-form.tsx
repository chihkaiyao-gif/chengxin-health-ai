"use client";

import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { purgeAppCaches } from "@/lib/pwa-cache";

export function SecureSignOutForm() {
  async function signOut() {
    await purgeAppCaches();
    await signOutAction();
  }

  return (
    <form action={signOut}>
      <button type="submit" className="btn-secondary" aria-label="登出">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">登出</span>
      </button>
    </form>
  );
}
