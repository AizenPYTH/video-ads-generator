import fs from "node:fs";
import path from "node:path";

/**
 * Playwright and Remotion need *different* Chromium binaries: Remotion
 * launches with the old `--headless` flag, which modern full Chrome builds
 * reject, so it needs a chrome-headless-shell.
 *
 * Playwright finds its own browser. This resolves the headless shell that
 * sits alongside it, so a container that has run `playwright install
 * chromium` is configured for both without pinning a version-stamped path
 * in an env var.
 */
export function findHeadlessShell(): string {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    "/ms-playwright",
    path.join(process.env.HOME ?? "", ".cache", "ms-playwright"),
  ].filter((value): value is string => Boolean(value));

  for (const root of roots) {
    let entries: string[];
    try {
      entries = fs.readdirSync(root);
    } catch {
      continue;
    }
    // Newest build first: the directory suffix is a monotonic revision.
    const candidates = entries
      .filter((entry) => entry.startsWith("chromium_headless_shell"))
      .sort()
      .reverse();

    for (const entry of candidates) {
      const binary = path.join(root, entry, "chrome-linux", "headless_shell");
      if (fs.existsSync(binary)) return binary;
    }
  }
  return "";
}
