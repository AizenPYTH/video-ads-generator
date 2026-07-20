"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionResult = {
  error?: string;
  success?: boolean;
};

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifié.");
  }

  return user.id;
}

export async function updateProfile(input: {
  prenom?: string | null;
  nom?: string | null;
  avatar_url?: string | null;
  langue?: string;
  fuseau_horaire?: string;
}): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({ ...input, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) return { error: "Impossible de mettre à jour le profil." };

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updatePreferences(input: {
  devise?: string;
  marche_ebay?: string;
}): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, ...input, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (error) return { error: "Impossible de mettre à jour les préférences." };

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updateNotifications(input: {
  email_nouvelle_annonce?: boolean;
  email_publication_reussie?: boolean;
  email_publication_echouee?: boolean;
  email_analyse_terminee?: boolean;
  email_quota_atteint?: boolean;
}): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { error } = await supabase
      .from("notification_settings")
      .upsert(
        { user_id: userId, ...input, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    if (error) return { error: "Impossible de mettre à jour les notifications." };

    revalidatePath("/settings");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function updateMarketingTemplate(input: {
  templateId?: string;
  nom?: string;
  type_template?: string;
  contenu?: Record<string, unknown>;
  est_par_defaut?: boolean;
}): Promise<SettingsActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    if (input.templateId) {
      const { error } = await supabase
        .from("marketing_templates")
        .update({
          nom: input.nom,
          type_template: input.type_template,
          contenu: input.contenu,
          est_par_defaut: input.est_par_defaut,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.templateId)
        .eq("user_id", userId);

      if (error) return { error: "Impossible de mettre à jour le template." };
    } else {
      const { error } = await supabase.from("marketing_templates").insert({
        user_id: userId,
        nom: input.nom ?? "Mon template",
        type_template: input.type_template ?? "default",
        contenu: input.contenu ?? {},
        est_par_defaut: input.est_par_defaut ?? false,
      });

      if (error) return { error: "Impossible de créer le template." };
    }

    revalidatePath("/settings/marketing");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
