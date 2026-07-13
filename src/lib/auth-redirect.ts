const defaultRedirect = "/dashboard";

function decodeRedirect(value: string) {
  let decoded = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }

  return decoded;
}
export function sanitizeRedirectTo(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) {
    return defaultRedirect;
  }

  const decoded = decodeRedirect(value.trim());
  if (
    !decoded ||
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    return defaultRedirect;
  }

  try {
    const base = new URL("https://chengxin.invalid");
    const target = new URL(decoded, base);
    if (target.origin !== base.origin) return defaultRedirect;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return defaultRedirect;
  }
}
