"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "./csv-parser";
import { parseXlsx, isXlsmFile } from "./xlsx-parser";
import { normalizeImportRows, type NormalizedImportRow } from "./normalizer";
import { validateImportRows } from "./validator";
import { resolveCategoryForRow, type CategoryResolution } from "./category-resolve";

export type ImportActionResult<T = void> = {
  error?: string;
  success?: boolean;
  data?: T;
  warnings?: string[];
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
): Promise<
  ImportActionResult<{
    batchId: string;
    rowErrors: Array<{ row: number; field: string; message: string }>;
    acceptedRows: number;
  }>
> {
  const logCtx: Record<string, unknown> = {
    step: "start",
    filename,
    size:
      typeof fileContent === "string"
        ? fileContent.length
        : fileContent.byteLength,
  };

  try {
    const userId = await requireUserId();
    logCtx.userId = userId;

    if (isXlsmFile(filename)) {
      return { error: "Format non supporté : les fichiers XLSM (macros) sont refusés." };
    }

    const lower = filename.toLowerCase();
    if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx")) {
      return { error: "Format non supporté. Formats acceptés : CSV et XLSX." };
    }

    const isXlsx = lower.endsWith(".xlsx");
    logCtx.step = "parse";
    const parseResult = isXlsx
      ? parseXlsx(fileContent as ArrayBuffer)
      : parseCsv(fileContent);

    logCtx.rowCount = parseResult.rows.length;
    logCtx.mime = isXlsx
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : "text/csv";

    if (parseResult.rows.length === 0) {
      return { error: "Fichier vide : aucune ligne de données à importer." };
    }

    const structureErrors = parseResult.errors.filter((e) =>
      e.includes("obligatoire manquante"),
    );
    if (structureErrors.length > 0) {
      return {
        error: `Colonnes obligatoires absentes : ${structureErrors.join(" ; ")}`,
      };
    }

    const parseHardErrors = parseResult.errors.filter(
      (e) =>
        e.includes("Trop de lignes") ||
        e.includes("macros") ||
        e.includes("dangereuse"),
    );
    if (parseHardErrors.length > 0) {
      return {
        error: isXlsx
          ? `Erreur XLSX : ${parseHardErrors.join(" ; ")}`
          : `Erreur CSV : ${parseHardErrors.join(" ; ")}`,
      };
    }

    logCtx.step = "validate";
    const normalized = normalizeImportRows(parseResult.rows);
    const validation = validateImportRows(normalized);

    if (validation.validRowIndexes.length === 0) {
      return {
        error:
          validation.errors
            .slice(0, 10)
            .map((e) => `Ligne ${e.row} (${e.field}): ${e.message}`)
            .join("\n") || "Aucune ligne valide dans le fichier.",
      };
    }

    const supabase = await createClient();
    logCtx.step = "create_batch";

    const fileType = isXlsx ? "xlsx" : "csv";
    const { data: batch, error: batchError } = await supabase
      .from("product_import_batches")
      .insert({
        user_id: userId,
        // Schéma hybride EN + FR
        filename,
        nom_fichier: filename,
        file_type: fileType,
        status: "UPLOADED",
        statut: "PENDING",
        total_rows: normalized.length,
        nombre_lignes: normalized.length,
        completed_rows: 0,
        failed_rows: 0,
        needs_review_rows: 0,
        lignes_traitees: 0,
        lignes_reussies: 0,
        lignes_echouees: 0,
      })
      .select("id")
      .single();

    if (batchError || !batch) {
      console.error("[import-batch]", {
        ...logCtx,
        code: batchError?.code,
        message: batchError?.message,
        details: batchError?.details,
        hint: batchError?.hint,
      });
      return {
        error: formatSupabaseImportError(
          "création du lot d'import",
          batchError,
        ),
      };
    }

    const errorByRow = new Map<number, string>();
    for (const err of validation.errors) {
      const prev = errorByRow.get(err.row);
      errorByRow.set(
        err.row,
        prev
          ? `${prev}; ${err.field}: ${err.message}`
          : `${err.field}: ${err.message}`,
      );
    }

    logCtx.step = "create_rows";
    const importRows = normalized.map((row, index) => {
      const rowNumber = index + 1;
      const rowError = errorByRow.get(rowNumber);
      const idempotencyKey = `${batch.id}:${rowNumber}`;
      return {
        user_id: userId,
        batch_id: batch.id,
        // Schéma hybride EN + FR
        row_number: rowNumber,
        numero_ligne: rowNumber,
        status: rowError ? "ERROR" : "PENDING",
        statut: rowError ? ("FAILED" as const) : ("PENDING" as const),
        error_message: rowError ?? null,
        erreur: rowError ?? null,
        source_data: row,
        normalized_data: row,
        donnees_brutes: row,
        warnings: [],
        idempotency_key: idempotencyKey,
      };
    });

    const { error: rowsError } = await supabase
      .from("product_import_rows")
      .insert(importRows);

    if (rowsError) {
      console.error("[import-rows]", {
        ...logCtx,
        batchId: batch.id,
        code: rowsError.code,
        message: rowsError.message,
        details: rowsError.details,
        hint: rowsError.hint,
      });
      return {
        error: formatSupabaseImportError(
          "enregistrement des lignes d'import",
          rowsError,
        ),
      };
    }

    const preFailed = importRows.filter((r) => r.statut === "FAILED").length;
    if (preFailed > 0) {
      await supabase
        .from("product_import_batches")
        .update({
          lignes_echouees: preFailed,
          failed_rows: preFailed,
        })
        .eq("id", batch.id);
    }

    revalidatePath("/dashboard/imports");
    return {
      success: true,
      data: {
        batchId: batch.id,
        rowErrors: validation.errors,
        acceptedRows: validation.validRowIndexes.length,
      },
      warnings: parseResult.errors.filter((e) => !e.includes("obligatoire")),
    };
  } catch (err) {
    console.error("[import-batch-fatal]", {
      ...logCtx,
      error: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof Error && err.message.includes("Non authentifié")) {
      return { error: "Utilisateur non connecté. Reconnectez-vous puis réessayez." };
    }
    return { error: err instanceof Error ? err.message : "Erreur serveur inconnue." };
  }
}

function formatSupabaseImportError(
  step: string,
  error: { code?: string; message?: string; details?: string; hint?: string } | null,
): string {
  if (!error) return `Impossible de finaliser : ${step}.`;

  const code = error.code ?? "";
  const message = error.message ?? "";

  if (code === "42P01" || message.includes("does not exist")) {
    return "Table d'import absente. Appliquez les migrations Supabase puis réessayez.";
  }
  if (code === "42703" || message.includes("column")) {
    return `Colonne manquante lors de la ${step} (${error.message}).`;
  }
  if (code === "42501" || message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls") || message.toLowerCase().includes("policy")) {
    return "Permission RLS refusée : vous ne pouvez pas créer cet import avec ce compte.";
  }
  if (code === "23502") {
    return `Colonne obligatoire manquante en base lors de la ${step}.`;
  }
  if (code === "23503") {
    return "Référence invalide (utilisateur ou lot). Reconnectez-vous puis réessayez.";
  }
  if (code === "PGRST204") {
    return `Schéma distant incompatible lors de la ${step}. Vérifiez les migrations.`;
  }

  return `Impossible de finaliser la ${step} : ${message}${error.hint ? ` (${error.hint})` : ""}`;
}

export async function processImportBatch(
  batchId: string,
): Promise<
  ImportActionResult<{ processed: number; succeeded: number; failed: number }>
> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    await supabase
      .from("product_import_batches")
      .update({
        statut: "PROCESSING",
        status: "PROCESSING",
      })
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
      const data = row.donnees_brutes as NormalizedImportRow;

      try {
        const resolution = await resolveCategoryForRow(data);
        const adResult = await createDraftAdFromImport(userId, data, resolution);

        if (adResult.error) {
          failed++;
          await supabase
            .from("product_import_rows")
            .update({
              statut: "FAILED",
              status: "ERROR",
              erreur: adResult.error,
              error_message: adResult.error,
            })
            .eq("id", row.id);
        } else {
          succeeded++;
          const enStatus =
            resolution.status === "resolved" ? "READY" : "NEEDS_REVIEW";
          await supabase
            .from("product_import_rows")
            .update({
              statut: "SUCCESS",
              status: enStatus,
              ad_id: adResult.data?.adId ?? null,
              erreur: null,
              error_message: null,
              donnees_brutes: {
                ...data,
                category_resolution: resolution,
              },
              normalized_data: {
                ...data,
                category_resolution: resolution,
              },
            })
            .eq("id", row.id);
        }
      } catch (err) {
        failed++;
        const message =
          err instanceof Error ? err.message : "Erreur de traitement";
        await supabase
          .from("product_import_rows")
          .update({
            statut: "FAILED",
            status: "ERROR",
            erreur: message,
            error_message: message,
          })
          .eq("id", row.id);
      }
    }

    const { data: batch } = await supabase
      .from("product_import_batches")
      .select("lignes_echouees")
      .eq("id", batchId)
      .single();

    const priorFailed = Number(batch?.lignes_echouees ?? 0);
    const processed = succeeded + failed + priorFailed;
    const totalFailed = failed + priorFailed;
    const batchStatusFr =
      totalFailed === 0 ? "COMPLETED" : succeeded === 0 ? "FAILED" : "PARTIAL";
    const batchStatusEn =
      totalFailed === 0
        ? "COMPLETED"
        : succeeded === 0
          ? "FAILED"
          : "PARTIAL_ERROR";

    await supabase
      .from("product_import_batches")
      .update({
        statut: batchStatusFr,
        status: batchStatusEn,
        lignes_traitees: processed,
        lignes_reussies: succeeded,
        lignes_echouees: totalFailed,
        completed_rows: succeeded,
        failed_rows: totalFailed,
        total_rows: processed,
      })
      .eq("id", batchId);

    revalidatePath("/dashboard/imports");
    revalidatePath("/dashboard/annonces");
    return { success: true, data: { processed, succeeded, failed: totalFailed } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

async function createDraftAdFromImport(
  userId: string,
  data: NormalizedImportRow,
  resolution: CategoryResolution,
): Promise<ImportActionResult<{ adId: string }>> {
  const supabase = await createClient();

  let itemSpecifics: Record<string, string> = {
    ...data.item_specifics,
    ...(data.compatible_brand
      ? {
          "Compatible Brand": data.compatible_brand,
          "Marque compatible": data.compatible_brand,
        }
      : {}),
    ...(data.compatible_device
      ? {
          "Compatible Device": data.compatible_device,
          "Appareil compatible": data.compatible_device,
          "Modèle compatible": data.compatible_device,
        }
      : {}),
    ...(data.compatible_model
      ? {
          "Compatible Model Number": data.compatible_model,
          "Numéro de modèle compatible": data.compatible_model,
          "Référence compatible": data.compatible_model,
        }
      : {}),
    ...(data.brand ? { Brand: data.brand, Marque: data.brand } : {}),
    ...(data.mpn ? { MPN: data.mpn } : {}),
    ...(data.model ? { Model: data.model, Modèle: data.model } : {}),
    ...(data.type || data.product_type
      ? {
          Type: data.type || data.product_type || "",
          "Product Type": data.product_type || data.type || "",
        }
      : {}),
    ...(data.color ? { Color: data.color, Couleur: data.color } : {}),
  };

  let workingResolution = resolution;
  if (
    workingResolution.missingAspects?.length ||
    !itemSpecifics["Marque compatible"]
  ) {
    try {
      const { enrichItemSpecificsForEbay } = await import(
        "@/features/ai/fill-missing-aspects"
      );
      let categoryAspects: Awaited<
        ReturnType<
          typeof import("@/services/ebay/taxonomy").getItemAspectsForCategory
        >
      > = [];
      if (workingResolution.categoryId) {
        const { getItemAspectsForCategory } = await import(
          "@/services/ebay/taxonomy"
        );
        categoryAspects = await getItemAspectsForCategory(
          workingResolution.categoryId,
        );
      }
      const enriched = await enrichItemSpecificsForEbay({
        title: data.titre ?? "",
        description: data.description,
        itemSpecifics,
        missingAspects:
          workingResolution.missingAspects?.length
            ? workingResolution.missingAspects
            : ["Marque compatible", "Marque", "Type"],
        categoryAspects,
      });
      itemSpecifics = enriched.itemSpecifics;
      workingResolution = {
        ...workingResolution,
        missingAspects: enriched.stillMissing,
        status:
          enriched.stillMissing.length === 0 && workingResolution.categoryId
            ? "resolved"
            : workingResolution.status,
      };
    } catch (err) {
      console.warn(
        "[import] fill aspects failed",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const categoryId = workingResolution.categoryId;
  const { recalculateAdStatus } = await import(
    "@/features/ads/recalculate-status"
  );
  const adStatut = recalculateAdStatus({
    titre: data.titre,
    description: data.description,
    prix_vente: data.prix_vente,
    quantite: data.quantite,
    ebay_category_id: categoryId,
    ebay_condition_id: data.ebay_condition_id,
    sku: data.sku,
    categoryStatus: workingResolution.status,
    categoryAmbiguous: workingResolution.status === "needs_review",
    categoryConfidence: workingResolution.confidence,
  });

  const { data: ad, error } = await supabase
    .from("ads")
    .insert({
      user_id: userId,
      titre: data.titre,
      title: data.titre,
      description: data.description,
      prix_achat: data.prix_achat,
      prix_vente: data.prix_vente,
      quantite: data.quantite,
      quantity: data.quantite,
      sku: data.sku,
      ebay_category_id: categoryId,
      ebay_condition_id: data.ebay_condition_id,
      notes: data.notes,
      source: "csv",
      marketplace_id: "EBAY_FR",
      status: "draft",
      // Jamais publié automatiquement
      statut: adStatut,
      metadata: {
        source: "csv_import",
        action: data.action,
        subtitle: data.subtitle,
        ean: data.ean,
        photo_url: data.photo_url,
        format: data.format,
        duration: data.duration,
        location: data.location,
        country: data.country,
        postal_code: data.postal_code,
        profiles: {
          shipping: data.shipping_profile,
          return: data.return_profile,
          payment: data.payment_profile,
        },
        item_specifics: itemSpecifics,
        brand: itemSpecifics.Brand || itemSpecifics.Marque || data.brand,
        manufacturer: data.manufacturer,
        mpn: itemSpecifics.MPN || data.mpn,
        model: itemSpecifics.Model || itemSpecifics.Modèle || data.model,
        product_type: data.product_type,
        type: itemSpecifics.Type || data.type,
        color: data.color,
        material: data.material,
        compatible_brand:
          itemSpecifics["Compatible Brand"] ||
          itemSpecifics["Marque compatible"] ||
          data.compatible_brand,
        compatible_device:
          itemSpecifics["Compatible Device"] ||
          itemSpecifics["Appareil compatible"] ||
          data.compatible_device,
        compatible_model:
          itemSpecifics["Compatible Model Number"] ||
          itemSpecifics["Numéro de modèle compatible"] ||
          data.compatible_model,
        detected_specifics: data.detected_specifics,
        missing_useful_fields: data.missing_useful_fields,
        category_resolution: workingResolution,
        category_name: workingResolution.categoryName ?? data.category_name,
        root_category_name: workingResolution.rootCategoryName,
        subcategory_name: workingResolution.subcategoryName,
      },
    })
    .select("id")
    .single();

  if (error || !ad) {
    console.error("[import-ad]", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    return {
      error: formatSupabaseImportError("création de l'annonce brouillon", error),
    };
  }

  if (data.photo_url?.startsWith("http")) {
    await supabase.from("ad_images").insert({
      user_id: userId,
      ad_id: ad.id,
      url: data.photo_url,
      ordre: 0,
      est_principale: true,
    });
  }

  return { success: true, data: { adId: ad.id } };
}

export async function updateImportAdCategory(
  adId: string,
  categoryId: string,
  categoryName: string,
): Promise<ImportActionResult> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: ad } = await supabase
      .from("ads")
      .select("metadata, ebay_condition_id")
      .eq("id", adId)
      .eq("user_id", userId)
      .single();

    if (!ad) return { error: "Annonce introuvable." };

    const { getConditionPoliciesForCategory, getItemAspectsForCategory } =
      await import("@/services/ebay/taxonomy");

    const [aspects, allowedConditions] = await Promise.all([
      getItemAspectsForCategory(categoryId),
      getConditionPoliciesForCategory(categoryId),
    ]);

    const meta = (ad.metadata as Record<string, unknown>) ?? {};
    const itemSpecifics =
      (meta.item_specifics as Record<string, string> | undefined) ?? {};

    const missingAspects = aspects
      .filter((a) => a.required)
      .map((a) => a.name)
      .filter((name) => {
        const key = name.toLowerCase();
        return !Object.entries(itemSpecifics).some(
          ([k, v]) => k.toLowerCase() === key && Boolean(v?.trim()),
        );
      });

    const conditionId = ad.ebay_condition_id
      ? String(ad.ebay_condition_id)
      : null;
    const invalidCondition = Boolean(
      conditionId &&
        allowedConditions.length > 0 &&
        !allowedConditions.some((c) => c.conditionId === conditionId),
    );

    const needsReview = missingAspects.length > 0 || invalidCondition;

    const { recalculateAdStatus } = await import(
      "@/features/ads/recalculate-status"
    );

    const metadata = {
      ...meta,
      category_name: categoryName,
      category_resolution: {
        status: needsReview ? "needs_review" : "resolved",
        categoryId,
        categoryName,
        confidence: 1,
        source: "manual",
        taxonomySource: "eBay Taxonomy",
        alternatives: [],
        missingAspects,
        allowedConditions,
        invalidCondition,
        message: needsReview
          ? invalidCondition
            ? "Condition ID non autorisée pour cette catégorie."
            : "Champs eBay obligatoires manquants."
          : undefined,
      },
    };

    const { data: fullAd } = await supabase
      .from("ads")
      .select("titre, description, prix_vente, quantite, sku, ebay_condition_id")
      .eq("id", adId)
      .eq("user_id", userId)
      .single();

    const newStatut = recalculateAdStatus({
      titre: fullAd?.titre,
      description: fullAd?.description,
      prix_vente: fullAd?.prix_vente,
      quantite: fullAd?.quantite,
      sku: fullAd?.sku,
      ebay_condition_id: fullAd?.ebay_condition_id
        ? String(fullAd.ebay_condition_id)
        : conditionId,
      ebay_category_id: categoryId,
      categoryStatus: needsReview ? "needs_review" : "resolved",
      categoryAmbiguous: false,
      // Correction manuelle → confiance max
      categoryConfidence: needsReview ? 0.5 : 0.94,
    });

    await supabase
      .from("ads")
      .update({
        ebay_category_id: categoryId,
        metadata,
        statut: newStatut,
        status: newStatut === "READY" ? "ready" : "draft",
      })
      .eq("id", adId)
      .eq("user_id", userId);

    revalidatePath(`/dashboard/annonces/${adId}`);
    revalidatePath("/dashboard/imports");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function redetectAdCategory(
  adId: string,
  options?: { force?: boolean },
): Promise<ImportActionResult<CategoryResolution>> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data: ad } = await supabase
      .from("ads")
      .select(
        "titre, description, sku, ebay_condition_id, ebay_category_id, metadata, prix_vente, quantite",
      )
      .eq("id", adId)
      .eq("user_id", userId)
      .single();

    if (!ad) return { error: "Annonce introuvable." };

    if (options?.force !== false) {
      const { clearTaxonomyCache } = await import("@/services/ebay/taxonomy");
      clearTaxonomyCache();
    }

    const meta = (ad.metadata as Record<string, unknown>) ?? {};
    const itemSpecifics =
      (meta.item_specifics as Record<string, string> | undefined) ?? {};

    const resolution = await resolveCategoryForRow({
      titre: ad.titre,
      description: ad.description,
      brand: (meta.brand as string) || itemSpecifics.Brand || itemSpecifics.brand,
      model: (meta.model as string) || itemSpecifics.Model || itemSpecifics.model,
      mpn: looksLikeAsinValue(itemSpecifics.MPN || itemSpecifics.mpn)
        ? null
        : itemSpecifics.MPN || itemSpecifics.mpn || null,
      ean: (meta.ean as string) || null,
      asin:
        (meta.asin as string) ||
        (looksLikeAsinValue(ad.sku) ? ad.sku : null),
      externalReference: (meta.external_reference as string) || ad.sku,
      product_type: itemSpecifics.Type || (meta.product_type as string) || null,
      type: itemSpecifics.Type || null,
      ebay_condition_id: ad.ebay_condition_id
        ? String(ad.ebay_condition_id)
        : null,
      // force=true : ignorer l'ancien Category ID / cache "non trouvé"
      ebay_category_id: null,
      category_name: null,
      color: itemSpecifics.Color || itemSpecifics.color || null,
      material: itemSpecifics.Material || null,
      manufacturer: itemSpecifics.Manufacturer || null,
      compatible_device: itemSpecifics["Compatible device"] || null,
      item_specifics: itemSpecifics,
    });

    const { recalculateAdStatus } = await import(
      "@/features/ads/recalculate-status"
    );
    const newStatut = recalculateAdStatus({
      titre: ad.titre,
      description: ad.description,
      prix_vente: ad.prix_vente,
      quantite: ad.quantite,
      ebay_category_id: resolution.categoryId,
      ebay_condition_id: ad.ebay_condition_id
        ? String(ad.ebay_condition_id)
        : null,
      sku: ad.sku,
      categoryStatus: resolution.status,
      categoryAmbiguous: resolution.status === "needs_review",
      categoryConfidence: resolution.confidence,
    });

    console.info("[redetect] status", {
      adId,
      categoryId: resolution.categoryId,
      categoryName: resolution.categoryName,
      newStatus: newStatut,
      message: resolution.message,
    });

    const metadata = {
      ...meta,
      category_name: resolution.categoryName,
      root_category_name: resolution.rootCategoryName,
      subcategory_name: resolution.subcategoryName,
      category_path: resolution.categoryPath,
      category_resolution: resolution,
      item_specifics: itemSpecifics,
    };

    await supabase
      .from("ads")
      .update({
        ebay_category_id: resolution.categoryId,
        metadata,
        statut: newStatut,
        status: newStatut === "READY" ? "ready" : "draft",
      })
      .eq("id", adId)
      .eq("user_id", userId);

    revalidatePath(`/dashboard/annonces/${adId}`);
    revalidatePath("/dashboard/imports");
    return { success: true, data: resolution };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

function looksLikeAsinValue(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^B0[A-Z0-9]{8}$/i.test(value.trim());
}

export async function searchEbayCategories(
  query: string,
): Promise<
  ImportActionResult<
    Array<{ categoryId: string; categoryName: string; confidence: number }>
  >
> {
  try {
    await requireUserId();
    const { suggestCategories } = await import("@/services/ebay/taxonomy");
    const suggestions = await suggestCategories(query, 10);
    return { success: true, data: suggestions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Erreur inconnue." };
  }
}

export async function getImportBatchStatus(
  batchId: string,
): Promise<
  ImportActionResult<{
    statut: string;
    nombre_lignes: number;
    lignes_traitees: number;
    lignes_reussies: number;
    lignes_echouees: number;
  }>
> {
  try {
    const userId = await requireUserId();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("product_import_batches")
      .select(
        "statut, nombre_lignes, lignes_traitees, lignes_reussies, lignes_echouees",
      )
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
