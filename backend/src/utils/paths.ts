import fs from "node:fs";
import path from "node:path";

/**
 * Resolves the backend package root by walking up from this module.
 *
 * Needed because the compiled output lives in `dist/src/...` while the
 * Remotion entry point and the storage directory sit at the package root -
 * `__dirname`-relative paths would differ between `tsx` and `node dist`.
 */
function findProjectRoot(): string {
  let current = __dirname;
  for (let depth = 0; depth < 8; depth += 1) {
    const manifest = path.join(current, "package.json");
    if (fs.existsSync(manifest)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(manifest, "utf8")) as {
          name?: string;
        };
        if (parsed.name === "video-ads-backend") return current;
      } catch {
        // Keep walking - a malformed package.json is not our root.
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

export const PROJECT_ROOT = findProjectRoot();

export const REMOTION_ENTRY = path.join(
  PROJECT_ROOT,
  "remotion",
  "src",
  "index.ts",
);
