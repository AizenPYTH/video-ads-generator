"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "./csv-parser";
import { parseXlsx, isXlsmFile } from "./xlsx-parser";
import { normalizeImportRows } from "./normalizer";
import { validateImportRows } from "./validator";

export type ImportActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
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

export async function createImportBatch(
  filename: string,
  fileContent: string | ArrayBuffer,
): Promise<ImportActionResult<{ batchId: string }>> {
  try {
    const userId = await requireUserId();

    if (isXlsmFile(filename)) {
      return { error: "Les fichiers XLSM (macros) ne sont pas acceptés." };
    }

    const isXlsx = filename.toLowerCase().endsWith(".xlsx");
    const parseResult = isXlsx
      ? parseXlsx(fileContent as ArrayBuffer)
      : parseCsv(fileContent as string);

    if (parseResult.errors.length > 0) {
      return { error: parseResult.errors.join("\n") };
    }

    const normalized = normalizeImportRows(parseResult.rows);
    const validation = validateImportRows(normalized);

    if (!validation.valid) {
      const firstErrors = validation.errors.slice(0, 5);
      return {
        error: firstErrors
          .map((e) => `Ligne ${e.row} (${e.field}): ${e.message}`)
          .join("\n"),
      };
    }

    const supabase = await createClient();

    const { data: batch, error: batchError } = await supabase
      .from("product_import_batches")
      .insert({
        user_id: userId,
        nom_fichier: filename,
        statut: "PENDING",
        nombre_lignes: normalized.length,
        lignes_traitees: 0,
        lignes_reussies: 0,
        lignes_echouees: 0,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      return { error: "Impossible de créer le lot d'import." };
    }

    const importRows = normalized.map((row, index) => ({
      user_id: userId,
      batch_id: batch.id,
      numero_ligne: index + 1,
      statut: "PENDING" as const,
      donnees_brutes: row,
    }));

    const { error: rowsError } = await supabase
      .from("product_import_rows")
      .insert(importRows);

    if (rowsError) {
      return { error: "Impossible d'enregistrer les lignes d'import." };
    }

    revalidatePath("/imports");
    return { success: true, data: { batchId: batch.id } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function processImportBatch(
  batchId: string,
): Promise<ImportActionResult<{ processed: number; succeeded: number; failed: number }>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    await supabase
      .from("product_import_batches")
      .update({ statut: "PROCESSING" })
      .eq("id", batchId)
      .eq("user_id", userId);

    const { data: rows, error: fetchError } = await supabase
      .from("product_import_rows")
      .select("*")
      .eq("batch_id", batchId)
      .eq("user_id", userId)
      .eq("statut", "PENDING")
      .order("numero_ligne");

    if (fetchError || !rows) {
      return { error: "Impossible de récupérer les lignes d'import." };
    }

    let succeeded = 0;
    let failed = 0;

    for (const row of rows) {
      const data = row.donnees_brutes as Record<string, unknown>;
      const adResult = await createDraftAdFromImport(userId, data);

      if (adResult.error) {
        failed++;
        await supabase
          .from("product_import_rows")
          .update({ statut: "FAILED", erreur: adResult.error })
          .eq("id", row.id);
      } else {
        succeeded++;
        await supabase
          .from("product_import_rows")
          .update({
            statut: "SUCCESS",
            ad_id: adResult.data?.adId ?? null,
          })
          .eq("id", row.id);
      }
    }

    const processed = succeeded + failed;
    const batchStatus =
      failed === 0 ? "COMPLETED" : succeeded === 0 ? "FAILED" : "PARTIAL";

    await supabase
      .from("product_import_batches")
      .update({
        statut: batchStatus,
        lignes_traitees: processed,
        lignes_reussies: succeeded,
        lignes_echouees: failed,
      })
      .eq("id", batchId);

    revalidatePath("/imports");
    revalidatePath("/ads");
    return { success: true, data: { processed, succeeded, failed } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

async function createDraftAdFromImport(
  userId: string,
  data: Record<string, unknown>,
): Promise<ImportActionResult<{ adId: string }>> {
  const supabase = await createClient();

  const { data: ad, error } = await supabase
    .from("ads")
    .insert({
      user_id: userId,
      titre: String(data.titre ?? ""),
      description: data.description ? String(data.description) : null,
      prix_achat: data.prix_achat ? String(data.prix_achat) : null,
      prix_vente: data.prix_vente ? String(data.prix_vente) : null,
      quantite: Number(data.quantite) || 1,
      sku: data.sku ? String(data.sku) : null,
      ebay_category_id: data.ebay_category_id ? String(data.ebay_category_id) : null,
      ebay_condition_id: data.ebay_condition_id ? String(data.ebay_condition_id) : null,
      notes: data.notes ? String(data.notes) : null,
      statut: "DRAFT",
      metadata: { item_specifics: data.item_specifics ?? {} },
    })
    .select("id")
    .single();

  if (error || !ad) {
    return { error: "Impossible de créer l'annonce brouillon." };
  }

  return { success: true, data: { adId: ad.id } };
}

export async function getImportBatchStatus(
  batchId: string,
): Promise<ImportActionResult<{
  statut: string;
  nombre_lignes: number;
  lignes_traitees: number;
  lignes_reussies: number;
  lignes_echouees: number;
}>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_import_batches")
      .select("statut, nombre_lignes, lignes_traitees, lignes_reussies, lignes_echouees")
      .eq("id", batchId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { error: "Lot d'import introuvable." };
    }

    return { success: true, data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}
