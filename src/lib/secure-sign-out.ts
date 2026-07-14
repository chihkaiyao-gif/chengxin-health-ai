type SignOutScope = "global" | "local";

type SignOutResult = {
  error: unknown | null;
};

type SecureSignOutDependencies = {
  signOut(scope: SignOutScope): Promise<SignOutResult>;
  clearServerSession(): Promise<{ ok: boolean }>;
  purgeCaches(): Promise<void>;
  replaceLocation(path: string): void;
};

const signOutFailurePath = `/login?message=${encodeURIComponent(
  "登出失敗，請重新登入。",
)}`;

export async function performSecureSignOut({
  signOut,
  clearServerSession,
  purgeCaches,
  replaceLocation,
}: SecureSignOutDependencies) {
  let globalSignOutFailed = false;
  let serverSessionCleanupFailed = false;

  try {
    const { error } = await signOut("global");
    globalSignOutFailed = Boolean(error);
  } catch {
    globalSignOutFailed = true;
  }

  if (globalSignOutFailed) {
    try {
      await signOut("local");
    } catch {
      // The navigation below fails closed even if the local cleanup call throws.
    }
  }

  try {
    const result = await clearServerSession();
    serverSessionCleanupFailed = !result.ok;
  } catch {
    serverSessionCleanupFailed = true;
  }

  try {
    await purgeCaches();
  } catch {
    // Cache cleanup is best effort; authentication cleanup remains authoritative.
  }

  const signOutFailed = globalSignOutFailed || serverSessionCleanupFailed;

  replaceLocation(signOutFailed ? signOutFailurePath : "/");

  return { ok: !signOutFailed };
}
