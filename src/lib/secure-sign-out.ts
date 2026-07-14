type SignOutScope = "global" | "local";

type SignOutResult = {
  error: unknown | null;
};

type SecureSignOutDependencies = {
  signOut(scope: SignOutScope): Promise<SignOutResult>;
  purgeCaches(): Promise<void>;
  replaceLocation(path: string): void;
};

const signOutFailurePath = `/login?message=${encodeURIComponent(
  "登出失敗，請重新登入。",
)}`;

export async function performSecureSignOut({
  signOut,
  purgeCaches,
  replaceLocation,
}: SecureSignOutDependencies) {
  let globalSignOutFailed = false;

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
    await purgeCaches();
  } catch {
    // Cache cleanup is best effort; authentication cleanup remains authoritative.
  }

  replaceLocation(globalSignOutFailed ? signOutFailurePath : "/");

  return { ok: !globalSignOutFailed };
}
