import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

export type StorageBucket = "captures" | "videos" | "posters" | "uploads";

const BUCKETS: StorageBucket[] = ["captures", "videos", "posters", "uploads"];

export function bucketDir(bucket: StorageBucket): string {
  return path.join(env.storageDir, bucket);
}

export async function ensureStorage(): Promise<void> {
  await Promise.all(
    BUCKETS.map((bucket) =>
      fs.mkdir(bucketDir(bucket), { recursive: true }).then(() => undefined),
    ),
  );
}

/** Resolves a caller-supplied name inside a bucket, refusing traversal. */
export function resolveInBucket(
  bucket: StorageBucket,
  filename: string,
): string | null {
  const base = bucketDir(bucket);
  const resolved = path.resolve(base, filename);
  const relative = path.relative(base, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

export async function writeFile(
  bucket: StorageBucket,
  filename: string,
  data: Buffer,
): Promise<string> {
  await fs.mkdir(bucketDir(bucket), { recursive: true });
  const target = resolveInBucket(bucket, filename);
  if (!target) throw new Error(`Unsafe storage filename: ${filename}`);
  await fs.writeFile(target, data);
  return target;
}

export function publicUrl(bucket: StorageBucket, filename: string): string {
  return `${env.publicBaseUrl}/assets/${bucket}/${encodeURIComponent(filename)}`;
}

export function exists(filePath: string): boolean {
  return fsSync.existsSync(filePath);
}

/** Deletes bucket entries older than the TTL. Best effort; never throws. */
export async function pruneOldFiles(ttlMs = env.jobTtlMs): Promise<void> {
  const cutoff = Date.now() - ttlMs;
  for (const bucket of BUCKETS) {
    const dir = bucketDir(bucket);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const target = path.join(dir, entry);
      try {
        const stat = await fs.stat(target);
        if (stat.mtimeMs < cutoff) {
          await fs.rm(target, { recursive: true, force: true });
        }
      } catch (error) {
        logger.debug({ error, target }, "prune skipped");
      }
    }
  }
}
