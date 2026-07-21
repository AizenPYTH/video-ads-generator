"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
  redirectTo?: string;
};

async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const perPage = 200;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (match) return match.id;

    if (data.users.length < perPage) break;
  }

  return null;
}

async function confirmUserEmail(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw error;
}

export async function signUp(formData: FormData): Promise<AuthActionResult> {
  try {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();

    if (!email || !password) {
      return { error: "L'email et le mot de passe sont requis." };
    }

    if (password.length < 8) {
      return { error: "Le mot de passe doit contenir au moins 8 caractères." };
    }

    const admin = createAdminClient();

    // Création confirmée côté serveur : pas d'email Supabase requis.
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || undefined },
      });

    if (createError) {
      const message = createError.message.toLowerCase();
      if (
        message.includes("already") ||
        message.includes("registered") ||
        message.includes("exists")
      ) {
        return {
          error:
            "Un compte existe déjà avec cet email. Connectez-vous, ou utilisez « Mot de passe oublié ».",
        };
      }
      return { error: translateAuthError(createError.message) };
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return { error: translateAuthError(signInError.message) };
    }

    try {
      const { ensureFreeSubscription } = await import(
        "@/lib/billing/ensure-subscription"
      );
      await ensureFreeSubscription(created.user.id);
    } catch {
      // non bloquant
    }

    revalidatePath("/", "layout");
    return { success: true, redirectTo: "/dashboard" };
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
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      return { error: "L'email et le mot de passe sont requis." };
    }

    const supabase = await createClient();

    let { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Compte créé avant le fix : email non confirmé → on confirme puis on réessaie.
    if (
      error &&
      (error.message === "Email not confirmed" ||
        error.message === "Invalid login credentials")
    ) {
      try {
        const userId = await findUserIdByEmail(email);
        if (userId) {
          await confirmUserEmail(userId);
          ({ error } = await supabase.auth.signInWithPassword({
            email,
            password,
          }));
        }
      } catch {
        // on garde l'erreur d'origine
      }
    }

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
  formData: FormData,
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "L'email est requis." };
  }

  const supabase = await createClient();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/reset-password`,
  });

  if (error) {
    return { error: translateAuthError(error.message) };
  }

  return { success: true };
}

export async function updatePassword(
  formData: FormData,
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
    "Email not confirmed":
      "Veuillez confirmer votre email avant de vous connecter.",
    "Password should be at least 6 characters":
      "Le mot de passe doit contenir au moins 6 caractères.",
  };

  return translations[message] ?? message;
}
