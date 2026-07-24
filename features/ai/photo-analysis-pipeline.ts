import { createAdminClient } from "@/lib/supabase/admin";
import { AppError } from "@/lib/errors/app-error";
import { extractTextFromImage } from "@/services/google-vision/ocr";
import { getBestReference } from "@/services/google-vision/reference-parser";
import { searchReference } from "@/services/reference-search/serpapi";
import { getOpenAIClient, getOpenAIModel } from "@/services/ai/openai-client";
import type { IdentificationResult } from "@/types/identification";
import { validateCoherence } from "./coherence-validator";
import {
  buildAdTitleFromAnalysis,
  buildItemSpecificsFromIdentification,
  enrichIdentificationFromOcr,
} from "./build-listing-from-analysis";
import { prepareProductImages } from "@/lib/images/dedupe";
import { ensureRemoteImagesOnAd } from "@/features/ads/ensure-ad-images";

export type PhotoAnalysisInput = {
  userId: string;
  photoUrls: string[];
  notes?: string;
  adId?: string;
  searchMode?: "FAST" | "DEEP";
};

export type PhotoAnalysisOutput = {
  analyzedProductId: string;
  analysisRunId: string;
  result: IdentificationResult;
};

function buildIdentificationPrompt(
  ocrText: string,
  reference: string | null,
  serpContext: string,
  notes?: string,
): string {
  return [
    "You are an expert product identification assistant for eBay France sellers of electronics spare parts.",
    "You receive a product PHOTO (often a marketing / wholesale listing image) AND OCR text extracted from it.",
    "CRITICAL RULES:",
    "1) Explicit OCR text ALWAYS takes priority over visual guesswork.",
    "2) Marketing images often show the product name in large red/black text (e.g. 'A1706 Motherboard', 'With Touch ID', '2016 2017 Year'). You MUST use that text.",
    "3) Never return all-null fields when OCR clearly contains a model (A1706), product type (Motherboard), or years.",
    "4) For Apple MacBook logic boards: compatibility.brand=Apple, compatibility.modelNumber=Axxxx, soldItem.type=Carte mère / Logic Board, soldItem.isReplacementPart=true.",
    "5) soldItem.name must be a clear French eBay-ready title when possible (max ~80 chars), e.g. 'Carte mère A1706 MacBook Pro avec Touch ID'.",
    "6) Do NOT invent PCB part numbers that are not in OCR/search. Model numbers like A1706 from OCR are valid.",
    "Return a JSON object matching this exact schema:",
    JSON.stringify({
      soldItem: {
        type: "string|null",
        name: "string|null",
        isCompleteDevice: "boolean",
        isReplacementPart: "boolean",
      },
      compatibility: {
        brand: "string|null",
        device: "string|null",
        modelNumber: "string|null",
      },
      brand: "string|null",
      model: "string|null",
      partNumber: "string|null",
      manufacturer: "string|null",
      category: "string|null",
      color: "string|null",
      condition: "string|null",
      conditionDescription: "string|null",
      accessories: ["string"],
      defects: ["string"],
      serialNumber: "string|null",
      itemSpecifics: { key: "string|string[]" },
      confidence: {
        global: "number 0-1",
        productType: "number 0-1",
        compatibility: "number 0-1",
        brand: "number 0-1",
        partNumber: "number 0-1",
      },
      evidence: [{ source: "string", field: "string", value: "string", weight: "number" }],
      alternatives: [{ field: "string", value: "string", confidence: "number" }],
      warnings: ["string"],
      needsReview: "boolean",
    }),
    "",
    `OCR text (PRIORITY — use every useful token):\n${ocrText || "(empty)"}`,
    reference ? `Best reference found: ${reference}` : "",
    serpContext ? `Web search context:\n${serpContext}` : "",
    notes ? `Seller notes: ${notes}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function parseIdentificationResult(raw: string): IdentificationResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : raw;
  const parsed = JSON.parse(jsonText) as Partial<IdentificationResult>;

  return {
    soldItem: {
      type: parsed.soldItem?.type ?? null,
      name: parsed.soldItem?.name ?? null,
      isCompleteDevice: parsed.soldItem?.isCompleteDevice ?? false,
      isReplacementPart: parsed.soldItem?.isReplacementPart ?? false,
    },
    compatibility: {
      brand: parsed.compatibility?.brand ?? null,
      device: parsed.compatibility?.device ?? null,
      modelNumber: parsed.compatibility?.modelNumber ?? null,
    },
    brand: parsed.brand ?? null,
    model: parsed.model ?? null,
    partNumber: parsed.partNumber ?? null,
    manufacturer: parsed.manufacturer ?? null,
    category: parsed.category ?? null,
    color: parsed.color ?? null,
    condition: parsed.condition ?? null,
    conditionDescription: parsed.conditionDescription ?? null,
    accessories: parsed.accessories ?? [],
    defects: parsed.defects ?? [],
    serialNumber: parsed.serialNumber ?? null,
    itemSpecifics: parsed.itemSpecifics ?? {},
    confidence: {
      global: parsed.confidence?.global ?? 0.5,
      productType: parsed.confidence?.productType ?? 0.5,
      compatibility: parsed.confidence?.compatibility ?? 0.5,
      brand: parsed.confidence?.brand ?? 0.5,
      partNumber: parsed.confidence?.partNumber ?? 0.5,
    },
    evidence: parsed.evidence ?? [],
    alternatives: parsed.alternatives ?? [],
    warnings: parsed.warnings ?? [],
    needsReview: parsed.needsReview ?? false,
  };
}

async function runOpenAIIdentification(
  ocrText: string,
  reference: string | null,
  serpContext: string,
  notes?: string,
  imageUrl?: string | null,
): Promise<IdentificationResult> {
  const client = getOpenAIClient();
  const model = getOpenAIModel();
  const prompt = buildIdentificationPrompt(ocrText, reference, serpContext, notes);

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: prompt }];

  if (imageUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: imageUrl },
    });
  }

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "Respond only with valid JSON matching the requested schema. No markdown fences. OCR text overrides visual guesses when they conflict.",
      },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw AppError.internal("Empty identification response from OpenAI");
  }

  return parseIdentificationResult(content);
}

export async function runPhotoAnalysisPipeline(
  input: PhotoAnalysisInput,
): Promise<PhotoAnalysisOutput> {
  if (input.photoUrls.length === 0) {
    throw AppError.validation("Au moins une photo est requise.");
  }

  const supabase = createAdminClient();
  const startTime = Date.now();

  const { data: analysisRun, error: runError } = await supabase
    .from("analysis_runs")
    .insert({
      user_id: input.userId,
      ad_id: input.adId ?? null,
      statut: "RUNNING",
      modele_ia: getOpenAIModel(),
    })
    .select("id")
    .single();

  if (runError || !analysisRun) {
    throw AppError.internal("Failed to create analysis run", runError);
  }

  try {
    const ocrResults = await Promise.all(
      input.photoUrls.map((url) => extractTextFromImage(url)),
    );
    const ocrText = ocrResults.map((r) => r.fullText).join("\n");

    const bestRef = getBestReference(ocrText);
    const reference = bestRef?.normalized ?? null;

    let serpContext = "";
    let serpResults;

    if (reference) {
      serpResults = await searchReference(reference, input.searchMode ?? "FAST");
      serpContext = serpResults.results
        .slice(0, 5)
        .map((r) => `- ${r.title}: ${r.snippet}`)
        .join("\n");
    }

    let result = await runOpenAIIdentification(
      ocrText,
      reference,
      serpContext,
      input.notes,
      input.photoUrls[0],
    );

    // Si OpenAI renvoie quasi-vide, reconstruire depuis l’OCR marketing
    result = enrichIdentificationFromOcr(result, ocrText);

    const coherence = validateCoherence({
      result,
      ocrText,
      serpResults,
      notes: input.notes,
    });
    result = coherence.result;

    console.info("[photo-analysis]", {
      ocrLen: ocrText.length,
      ocrPreview: ocrText.slice(0, 160).replace(/\s+/g, " "),
      reference,
      title: result.soldItem?.name,
      model: result.model ?? result.compatibility?.modelNumber,
      type: result.soldItem?.type,
      confidence: result.confidence.global,
    });

    if (!ocrText.trim() && !result.soldItem?.name && !result.model) {
      result.warnings.push(
        "Aucun texte OCR détecté sur les photos — complétez le titre manuellement.",
      );
      result.needsReview = true;
    }

    const { data: analyzedProduct, error: productError } = await supabase
      .from("analyzed_products")
      .insert({
        user_id: input.userId,
        ad_id: input.adId ?? null,
        url_source: input.photoUrls[0],
        resultat_identification: result,
        confiance_globale: String(result.confidence.global),
        necessite_revision: result.needsReview,
      })
      .select("id")
      .single();

    if (productError || !analyzedProduct) {
      throw AppError.internal("Failed to save analyzed product", productError);
    }

    if (result.evidence.length > 0) {
      await supabase.from("analysis_evidence").insert(
        result.evidence.map((e) => ({
          user_id: input.userId,
          analysis_run_id: analysisRun.id,
          source: e.source,
          champ: e.field,
          valeur: e.value,
          poids: String(e.weight),
        })),
      );
    }

    await supabase
      .from("analysis_runs")
      .update({
        statut: "COMPLETED",
        analyzed_product_id: analyzedProduct.id,
        duree_ms: Date.now() - startTime,
      })
      .eq("id", analysisRun.id);

    if (input.adId) {
      let ebayCategoryId: string | null = null;
      let categoryMeta: Record<string, unknown> = {};
      let categoryConfidence: number | null = null;
      let categoryStatus: string | null = null;

      try {
        const { resolveCategoryForRow } = await import(
          "@/features/imports/category-resolve"
        );
        const titre = [
          result.soldItem?.type,
          result.brand,
          result.model,
          result.partNumber,
          result.compatibility?.device,
          result.compatibility?.modelNumber,
        ]
          .filter(Boolean)
          .join(" ");
        const resolution = await resolveCategoryForRow({
          titre:
            titre ||
            [result.brand, result.model, result.partNumber]
              .filter(Boolean)
              .join(" "),
          brand: result.brand,
          model: result.model,
          mpn: result.partNumber,
          product_type: result.soldItem?.type ?? result.category,
          type: result.soldItem?.type ?? null,
          category_name: result.category,
          compatible_device:
            result.compatibility?.device ??
            result.compatibility?.modelNumber ??
            null,
          item_specifics: {
            ...(result.brand ? { Brand: result.brand } : {}),
            ...(result.model ? { Model: result.model } : {}),
            ...(result.partNumber ? { MPN: result.partNumber } : {}),
            ...(result.soldItem?.type ? { Type: result.soldItem.type } : {}),
          },
        });
        ebayCategoryId = resolution.categoryId;
        categoryConfidence = resolution.confidence;
        categoryStatus = resolution.status;
        categoryMeta = {
          category_resolution: resolution,
          category_name: resolution.categoryName,
          root_category_name: resolution.rootCategoryName,
          subcategory_name: resolution.subcategoryName,
        };
      } catch (categoryError) {
        console.error(
          "[photo-analysis] category resolve failed",
          categoryError instanceof Error
            ? categoryError.message
            : categoryError,
        );
        categoryStatus = "needs_review";
      }

      const { data: existingAd } = await supabase
        .from("ads")
        .select("metadata, titre, description, prix_vente, quantite, sku, ebay_condition_id")
        .eq("id", input.adId)
        .eq("user_id", input.userId)
        .maybeSingle();

      const prevMeta =
        existingAd?.metadata && typeof existingAd.metadata === "object"
          ? (existingAd.metadata as Record<string, unknown>)
          : {};

      const builtTitle = buildAdTitleFromAnalysis(result, ocrText);
      const titre =
        (existingAd?.titre && String(existingAd.titre).trim()) || builtTitle;
      const sku =
        (existingAd?.sku && String(existingAd.sku).trim()) ||
        result.partNumber ||
        result.compatibility?.modelNumber ||
        result.model ||
        null;
      const itemSpecifics = buildItemSpecificsFromIdentification(result);
      const descriptionParts = [
        result.soldItem?.name,
        result.soldItem?.type
          ? `Type : ${result.soldItem.type}`
          : null,
        result.compatibility?.brand || result.compatibility?.device
          ? `Compatibilité : ${[result.compatibility?.brand, result.compatibility?.device, result.compatibility?.modelNumber].filter(Boolean).join(" ")}`
          : null,
        result.partNumber ? `Référence : ${result.partNumber}` : null,
        ocrText.trim()
          ? `Texte détecté sur la photo :\n${ocrText.trim().slice(0, 1500)}`
          : null,
      ].filter(Boolean);
      const description =
        (existingAd?.description && String(existingAd.description).trim()) ||
        descriptionParts.join("\n\n") ||
        null;

      const { recalculateAdStatus } = await import(
        "@/features/ads/recalculate-status"
      );
      const statut = result.needsReview
        ? "NEEDS_REVIEW"
        : recalculateAdStatus({
            titre,
            description,
            prix_vente: existingAd?.prix_vente,
            quantite: existingAd?.quantite ?? 1,
            sku,
            ebay_condition_id: existingAd?.ebay_condition_id
              ? String(existingAd.ebay_condition_id)
              : "1000",
            ebay_category_id: ebayCategoryId,
            categoryStatus,
            categoryAmbiguous: categoryStatus === "needs_review",
            categoryConfidence,
          });

      const { error: adUpdateError } = await supabase
        .from("ads")
        .update({
          titre,
          title: titre,
          description,
          sku,
          ebay_condition_id:
            existingAd?.ebay_condition_id != null
              ? String(existingAd.ebay_condition_id)
              : "1000",
          resultat_identification: result,
          ebay_category_id: ebayCategoryId,
          statut,
          metadata: {
            ...prevMeta,
            ...categoryMeta,
            source: "photo_analysis",
            ocr_text: ocrText.slice(0, 4000),
            ocr_reference: reference,
            brand: result.brand,
            model: result.model,
            mpn: result.partNumber,
            type: result.soldItem?.type,
            product_type: result.soldItem?.type ?? result.category,
            compatible_brand: result.compatibility?.brand,
            compatible_device: result.compatibility?.device,
            compatible_model: result.compatibility?.modelNumber,
            item_specifics: itemSpecifics,
            photo_urls: input.photoUrls,
            images: input.photoUrls,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.adId)
        .eq("user_id", input.userId);

      if (adUpdateError) {
        console.error("[photo-analysis] ad update failed", adUpdateError.message);
        throw AppError.internal(
          `Impossible de sauvegarder l'annonce: ${adUpdateError.message}`,
          adUpdateError,
        );
      }

      // Attacher les photos analysées à l’annonce (sinon fiche vide)
      try {
        const prepared = await prepareProductImages(input.photoUrls, {
          max: 8,
          contentHash: false,
        });
        if (prepared.images.length > 0) {
          await ensureRemoteImagesOnAd({
            userId: input.userId,
            adId: input.adId,
            preparedImages: prepared.images,
            replace: false,
          });
        }
      } catch (imgErr) {
        console.warn(
          "[photo-analysis] image attach failed",
          imgErr instanceof Error ? imgErr.message : imgErr,
        );
      }
    }

    return {
      analyzedProductId: analyzedProduct.id,
      analysisRunId: analysisRun.id,
      result,
    };
  } catch (error) {
    await supabase
      .from("analysis_runs")
      .update({
        statut: "FAILED",
        erreur: error instanceof Error ? error.message : "Unknown error",
        duree_ms: Date.now() - startTime,
      })
      .eq("id", analysisRun.id);

    throw error;
  }
}
