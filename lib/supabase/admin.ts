import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/* eslint-disable @typescript-eslint/no-explicit-any */
let adminClient: SupabaseClient<any> | null = null;
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables (SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  adminClient = createSupabaseClient<any>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return adminClient;
}
