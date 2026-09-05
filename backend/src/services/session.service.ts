/**
 * Upload sessions keep the captured bytes on the server: the client only ever
 * handles ids and URLs, so a five-screenshot capture never round-trips through
 * the browser as base64.
 */
import fs from "node:fs/promises";
import { env } from "../utils/env";
import { generateId, nowIso } from "../utils/helpers";
import { resolveInBucket, writeFile, publicUrl } from "./storage.service";
import type { Capture, PageMetadata } from "./playwright.service";
import type { AssetRef } from "../types";

export interface UploadSession {
  id: string;
  fileType: "url" | "screenshot";
  sourceUrl?: string;
  metadata: PageMetadata | null;
  assets: AssetRef[];
  /** Storage filenames, parallel to `assets`. */
  files: string[];
  createdAt: string;
}

const sessions = new Map<string, UploadSession>();

function evictExpired(): void {
  const cutoff = Date.now() - env.jobTtlMs;
  for (const [id, session] of sessions) {
    if (new Date(session.createdAt).getTime() < cutoff) sessions.delete(id);
  }
}

export async function createSession(input: {
  fileType: "url" | "screenshot";
  sourceUrl?: string;
  metadata: PageMetadata | null;
  captures: Capture[];
}): Promise<UploadSession> {
  const id = generateId();
  const assets: AssetRef[] = [];
  const files: string[] = [];

  for (const capture of input.captures) {
    const filename = `${id}-${capture.id}.png`;
    await writeFile("captures", filename, capture.buffer);
    files.push(filename);
    assets.push({
      id: capture.id,
      url: publicUrl("captures", filename),
      width: capture.width,
      height: capture.height,
      label: capture.label,
    });
  }

  const session: UploadSession = {
    id,
    fileType: input.fileType,
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
    metadata: input.metadata,
    assets,
    files,
    createdAt: nowIso(),
  };

  sessions.set(id, session);
  evictExpired();
  return session;
}

export function getSession(id: string): UploadSession | null {
  return sessions.get(id) ?? null;
}

/** Reads a capture back as a data URI for the Claude vision call. */
export async function readCaptureDataUri(
  filename: string,
): Promise<string | null> {
  const target = resolveInBucket("captures", filename);
  if (!target) return null;
  try {
    const buffer = await fs.readFile(target);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function primaryScreenshots(
  session: UploadSession,
  count: number,
): Promise<string[]> {
  const wanted = session.files.slice(0, count);
  const results = await Promise.all(wanted.map(readCaptureDataUri));
  return results.filter((value): value is string => value !== null);
}
