/**
 * `FRONTEND_URL` is a comma-separated allowlist of frontends allowed to call
 * this API.
 *
 * Every one of these means the same thing, because operators write all of
 * them and an allowlist that silently ignores four out of five is worse than
 * no allowlist at all:
 *
 *     https://app.vercel.app      app.vercel.app      https://app.vercel.app/
 *     *.vercel.app                https://*.vercel.app
 *
 * A leading `*.` matches any subdomain but not the apex, so `*.vercel.app`
 * covers `anything.vercel.app` and rejects both `vercel.app` and the
 * lookalike `notvercel.app`. A scheme is honoured when given: an entry of
 * `https://app.example.com` will not match an `http://` origin.
 *
 * `*` on its own allows everything. Development only.
 */

interface Rule {
  /** "https" | "http", or null when the entry named no scheme. */
  scheme: string | null;
  /** Hostname, lowercased. For a wildcard this is the ".suffix" part. */
  host: string;
  wildcard: boolean;
}

function parseRule(raw: string): Rule | null {
  let entry = raw.trim().replace(/\/+$/, "");
  if (!entry) return null;

  let scheme: string | null = null;
  const schemeMatch = entry.match(/^([a-z][a-z0-9+.-]*):\/\//i);
  if (schemeMatch) {
    scheme = (schemeMatch[1] as string).toLowerCase();
    entry = entry.slice(schemeMatch[0].length);
  }

  // Drop anything past the authority - operators paste whole URLs.
  entry = entry.split("/")[0] as string;
  if (!entry) return null;

  if (entry.startsWith("*.")) {
    return { scheme, host: entry.slice(1).toLowerCase(), wildcard: true };
  }
  return { scheme, host: entry.toLowerCase(), wildcard: false };
}

export function isOriginAllowed(
  allowlist: string,
  origin: string | undefined,
): boolean {
  // Same-origin requests, curl and server-to-server calls send no Origin.
  if (!origin) return true;
  if (allowlist.trim() === "*") return true;

  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  const protocol = url.protocol.replace(":", "").toLowerCase();
  const hostname = url.hostname.toLowerCase();
  // `host` carries the port, `hostname` does not. `http://localhost:5173`
  // has to match an entry of `localhost:5173`, so compare against whichever
  // shape the entry used.
  const host = url.host.toLowerCase();

  return allowlist
    .split(",")
    .map(parseRule)
    .filter((rule): rule is Rule => rule !== null)
    .some((rule) => {
      if (rule.scheme !== null && rule.scheme !== protocol) return false;
      const candidate = rule.host.includes(":") ? host : hostname;
      // `.vercel.app` as a suffix, so the apex and `notvercel.app` both miss.
      return rule.wildcard
        ? candidate.endsWith(rule.host)
        : candidate === rule.host;
    });
}
