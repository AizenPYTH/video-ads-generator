"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
  redirectTo?: string;
};

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    if (!email || !password) {
      return { error: "L'email et le mot de passe sont requis." };
    }

    const supabase = await createClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    // Les emails Supabase (plan free) arrivent souvent en retard / spam.
    // On confirme le compte côté serveur puis on connecte directement.
    if (data.user && !data.session) {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(data.user.id, {
          email_confirm: true,
        });
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
  if (!signInError) {
        revalidatePath("/", "layout");
        return { success: true, redirectTo: "/dashboard" };
      }
    } catch {
      // fallback: page de vérification
    }
  }

  if (data.session) {
    revalidatePath("/", "layout");
    try {
      const { ensureFreeSubscription } = await import(
        "@/lib/billing/ensure-subscription"
      );
      await ensureFreeSubscription(data.session.user.id);
    } catch {
      // non bloquant
    }
    return { success: true, redirectTo: "/dashboard" };
  }

  return { success: true, redirectTo: "/verify-email" };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Impossible de créer le compte pour le moment.",
    };
  }
}

export async function signIn(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return { error: "L'email et le mot de passe sont requis." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { ensureFreeSubscription } = await import(
          "@/lib/billing/ensure-subscription"
        );
        await ensureFreeSubscription(user.id);
      }
    } catch {
      // non bloquant à la connexion
    }

    revalidatePath("/", "layout");
    return { success: true, redirectTo: "/dashboard" };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Impossible de se connecter pour le moment.",
    };
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function resetPassword(
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "L'email est requis." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/reset-password`,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return { success: true };
}

export async function updatePassword(
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { error: "Les deux champs mot de passe sont requis." };
  }

  if (password !== confirmPassword) {
    return { error: "Les mots de passe ne correspondent pas." };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

function translateAuthError(message: string): string {
  const translations: Record<string, string> = {
    "Invalid login credentials": "Email ou mot de passe incorrect.",
    "User already registered": "Un compte existe déjà avec cet email.",
    "Email not confirmed": "Veuillez confirmer votre email avant de vous connecter.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
  };

  return translations[message] ?? message;
}
