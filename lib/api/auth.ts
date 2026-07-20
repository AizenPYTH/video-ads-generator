import { createClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors/app-error";
import type { User } from "@supabase/supabase-js";

export async function requireApiUser(): Promise<{
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw AppError.unauthorized("Non authentifié.");
  }

  return { user, supabase };
}
