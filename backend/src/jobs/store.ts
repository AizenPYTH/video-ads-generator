/**
 * Job state lives here rather than inside Bull so the status endpoint reads
 * the same shape whether the queue is Redis-backed or in-process.
 *
 * Memory is the default and is correct for a single-process deployment.
 * Point SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY at a project to survive
 * restarts and to run the worker as a separate service.
 */
import { logger } from "../utils/logger";
import { nowIso } from "../utils/helpers";
import { env } from "../utils/env";
import {
  isSupabaseConfigured,
  supabase,
  VIDEO_JOBS_TABLE,
} from "../services/supabase.service";
import type { GenerationRequest, JobStatus, VideoJob } from "../types";

export interface JobStore {
  create(job: VideoJob): Promise<void>;
  get(id: string): Promise<VideoJob | null>;
  update(id: string, patch: Partial<VideoJob>): Promise<void>;
}

class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, VideoJob>();

  async create(job: VideoJob): Promise<void> {
    this.jobs.set(job.id, job);
    this.evictExpired();
  }

  async get(id: string): Promise<VideoJob | null> {
    return this.jobs.get(id) ?? null;
  }

  async update(id: string, patch: Partial<VideoJob>): Promise<void> {
    const existing = this.jobs.get(id);
    if (!existing) return;
    this.jobs.set(id, { ...existing, ...patch });
  }

  private evictExpired(): void {
    const cutoff = Date.now() - env.jobTtlMs;
    for (const [id, job] of this.jobs) {
      if (new Date(job.createdAt).getTime() < cutoff) this.jobs.delete(id);
    }
  }
}

/** Mirrors into Postgres; falls back to memory on any Supabase failure. */
class SupabaseJobStore implements JobStore {
  private readonly memory = new MemoryJobStore();

  async create(job: VideoJob): Promise<void> {
    await this.memory.create(job);
    const db = supabase();
    if (!db) return;
    const { error } = await db.from(VIDEO_JOBS_TABLE).insert({
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
      request: job.request,
      created_at: job.createdAt,
    });
    if (error) logger.warn({ error }, "supabase job insert failed");
  }

  async get(id: string): Promise<VideoJob | null> {
    const local = await this.memory.get(id);
    if (local) return local;

    const db = supabase();
    if (!db) return null;
    const { data, error } = await db
      .from(VIDEO_JOBS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;

    return {
      id: data.id as string,
      status: data.status as JobStatus,
      progress: Number(data.progress ?? 0),
      message: (data.message as string) ?? "",
      request: data.request as GenerationRequest,
      outputs: data.outputs ?? undefined,
      poster: data.poster ?? undefined,
      error: data.error ?? undefined,
      createdAt: data.created_at as string,
      startedAt: data.started_at ?? undefined,
      completedAt: data.completed_at ?? undefined,
    };
  }

  async update(id: string, patch: Partial<VideoJob>): Promise<void> {
    await this.memory.update(id, patch);
    const db = supabase();
    if (!db) return;
    const row: Record<string, unknown> = {};
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.progress !== undefined) row.progress = patch.progress;
    if (patch.message !== undefined) row.message = patch.message;
    if (patch.outputs !== undefined) row.outputs = patch.outputs;
    if (patch.poster !== undefined) row.poster = patch.poster;
    if (patch.error !== undefined) row.error = patch.error;
    if (patch.startedAt !== undefined) row.started_at = patch.startedAt;
    if (patch.completedAt !== undefined) row.completed_at = patch.completedAt;
    if (Object.keys(row).length === 0) return;

    const { error } = await db.from(VIDEO_JOBS_TABLE).update(row).eq("id", id);
    if (error) logger.warn({ error, id }, "supabase job update failed");
  }
}

export const jobStore: JobStore = isSupabaseConfigured()
  ? new SupabaseJobStore()
  : new MemoryJobStore();

export function newJob(id: string, request: GenerationRequest): VideoJob {
  return {
    id,
    status: "pending",
    progress: 0,
    message: "Queued",
    request,
    createdAt: nowIso(),
  };
}
