"use client";

import { LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { purgeAppCaches } from "@/lib/pwa-cache";
import { performSecureSignOut } from "@/lib/secure-sign-out";
import {
  createClient,
  hasBrowserSupabaseConfig,
} from "@/lib/supabase/browser";

export function SecureSignOutForm() {
  const signingOutRef = useRef(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (signingOutRef.current) return;

    signingOutRef.current = true;
    setIsSigningOut(true);

    if (!hasBrowserSupabaseConfig()) {
      await purgeAppCaches();
      window.location.replace("/");
      return;
    }

    const supabase = createClient();

    await performSecureSignOut({
      signOut: async (scope) => supabase.auth.signOut({ scope }),
      purgeCaches: purgeAppCaches,
      replaceLocation: (path) => window.location.replace(path),
    });
  }

  return (
    <form action={signOut}>
      <button
        type="submit"
        className="btn-secondary"
        aria-label="登出"
        disabled={isSigningOut}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">
          {isSigningOut ? "登出中…" : "登出"}
        </span>
      </button>
    </form>
  );
}
