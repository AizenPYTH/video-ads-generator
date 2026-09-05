import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../utils/env";
import { logger } from "../utils/logger";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return env.supabaseUrl.length > 0 && env.supabaseKey.length > 0;
}

export function supabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseKey, {
      auth: { persistSession: false },
    });
    logger.info("supabase client initialised");
  }
  return client;
}

export const VIDEO_JOBS_TABLE = "video_jobs";
