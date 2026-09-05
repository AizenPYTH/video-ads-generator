/**
 * `FRONTEND_URL` is a comma-separated allowlist. An entry may start with
 * `*.` to match a whole domain: Vercel gives every preview deploy a fresh
 * random subdomain, so `*.vercel.app` is the difference between previews
 * working and every one of them failing CORS.
 *
 * `*` on its own allows anything.
 */
export function isOriginAllowed(
  allowlist: string,
  origin: string | undefined,
): boolean {
  // Same-origin and server-to-server requests send no Origin header.
  if (!origin) return true;
  if (allowlist.trim() === "*") return true;

  return allowlist
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      if (!entry.startsWith("*.")) return entry === origin;
      // ".vercel.app" - a suffix match on the host, so `notvercel.app`
      // cannot pass by ending with the same characters.
      const suffix = entry.slice(1);
      try {
        return new URL(origin).hostname.endsWith(suffix);
      } catch {
        return false;
      }
    });
}
