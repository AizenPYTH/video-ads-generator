import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  // We rely on our own row types from `types/database.ts` and keep Supabase client
  // typing permissive to avoid missing Insert/Update shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createBrowserClient<any>(url, anonKey);
}
