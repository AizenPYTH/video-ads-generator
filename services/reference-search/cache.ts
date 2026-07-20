import { createAdminClient } from "@/lib/supabase/admin";

export function normalizeReference(reference: string): string {
  return reference
    .toUpperCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/_/g, "-");
}

export interface CachedSearchResult<T> {
  reference: string;
  normalizedReference: string;
  data: T;
  cachedAt: string;
  expiresAt: string;
}

const DEFAULT_TTL_HOURS = 24;

export async function getCachedResult<T>(
  reference: string,
): Promise<T | null> {
  const supabase = createAdminClient();
  const normalized = normalizeReference(reference);

  const { data, error } = await supabase
    .from("reference_search_cache")
    .select("data, expires_at")
    .eq("normalized_reference", normalized)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  if (new Date(data.expires_at) < new Date()) {
    await supabase
      .from("reference_search_cache")
      .delete()
      .eq("normalized_reference", normalized);
    return null;
  }

  return data.data as T;
}

export async function setCachedResult<T>(
  reference: string,
  data: T,
  ttlHours = DEFAULT_TTL_HOURS,
): Promise<void> {
  const supabase = createAdminClient();
  const normalized = normalizeReference(reference);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

  await supabase.from("reference_search_cache").upsert(
    {
      reference,
      normalized_reference: normalized,
      data,
      cached_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: "normalized_reference" },
  );
}

export async function invalidateCache(reference: string): Promise<void> {
  const supabase = createAdminClient();
  const normalized = normalizeReference(reference);

  await supabase
    .from("reference_search_cache")
    .delete()
    .eq("normalized_reference", normalized);
}
