import type { NormalizedImportRow } from "./normalizer";
import {
  buildCategorySearchQueries,
  getConditionPoliciesForCategory,
  getItemAspectsForCategory,
  inferPreferredRoot,
  suggestCategoriesMulti,
  validateCategoryId,
  type CategoryConditionPolicy,
  type TaxonomySuggestion,
} from "@/services/ebay/taxonomy";
import {
  buildSoldTypeSearchQueries,
  confidenceBand,
  detectSoldItemType,
  messageForBand,
  scoreCategorySemantics,
  type SoldItemType,
} from "./category-semantics";

export type CategoryResolution = {
  status: "resolved" | "needs_review" | "missing";
  categoryId: string | null;
  categoryName: string | null;
  rootCategoryName: string | null;
  subcategoryName: string | null;
  categoryPath: string[];
  confidence: number;
  source: "file_id" | "file_name" | "auto" | "manual" | "none";
  taxonomySource: "eBay Taxonomy";
  alternatives: TaxonomySuggestion[];
  missingAspects: string[];
  recommendedAspects: string[];
  allowedConditions: CategoryConditionPolicy[];
  invalidCondition?: boolean;
  message?: string;
  /** Type vendu détecté (batterie, écran, …) */
  soldItemType?: string | null;
  /** Catégories écartées pour contradiction sémantique */
  rejectedForContradiction?: Array<{
    categoryId: string;
    categoryName: string;
    reason: string;
  }>;
};

const AUTO_ACCEPT_GAP = 0.1;

export type CategoryResolveInput = {
  titre?: string | null;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  mpn?: string | null;
  ean?: string | null;
  asin?: string | null;
  externalReference?: string | null;
  product_type?: string | null;
  type?: string | null;
  category_name?: string | null;
  ebay_category_id?: string | null;
  ebay_condition_id?: string | null;
  color?: string | null;
  material?: string | null;
  manufacturer?: string | null;
  compatible_device?: string | null;
  item_specifics?: Record<string, string>;
};

function toInput(row: NormalizedImportRow | CategoryResolveInput): CategoryResolveInput {
  return {
    titre: row.titre,
    description: "description" in row ? row.description : null,
    brand: row.brand,
    model: row.model,
    mpn: row.mpn,
    ean: "ean" in row ? row.ean : null,
    product_type: row.product_type,
    type: row.type,
    category_name: row.category_name,
    ebay_category_id: row.ebay_category_id,
    ebay_condition_id: row.ebay_condition_id,
    color: row.color,
    material: row.material,
    manufacturer: row.manufacturer,
    compatible_device: "compatible_device" in row ? row.compatible_device : null,
    item_specifics: row.item_specifics ?? {},
    asin: "asin" in row ? (row as CategoryResolveInput).asin : null,
    externalReference:
      "externalReference" in row
        ? (row as CategoryResolveInput).externalReference
        : null,
  };
}

export async function resolveCategoryForRow(
  row: NormalizedImportRow | CategoryResolveInput,
): Promise<CategoryResolution> {
  const raw = toInput(row);
  const hints = extractProductHints({
    title: raw.titre,
    brand: raw.brand,
    model: raw.model,
    mpn: raw.mpn,
    sku: "sku" in row ? (row as { sku?: string | null }).sku : null,
    externalReference: raw.externalReference ?? raw.asin,
  });

  const input: CategoryResolveInput = {
    ...raw,
    brand: hints.brand ?? raw.brand,
    model: hints.model ?? raw.model,
    mpn: hints.mpn,
    asin: hints.asin ?? raw.asin,
    externalReference: hints.externalReference ?? raw.externalReference,
    color: hints.color ?? raw.color,
    product_type: raw.product_type ?? hints.productType,
    type: raw.type ?? hints.productType,
    item_specifics: {
      ...(raw.item_specifics ?? {}),
      ...(hints.brand && !(raw.item_specifics?.Brand || raw.item_specifics?.brand)
        ? { Brand: hints.brand, Marque: hints.brand }
        : {}),
      ...(hints.model && !(raw.item_specifics?.Model || raw.item_specifics?.model)
        ? { Model: hints.model, Modèle: hints.model }
        : {}),
      ...(hints.color &&
      !(raw.item_specifics?.Color || raw.item_specifics?.Couleur)
        ? { Color: hints.color, Couleur: hints.color }
        : {}),
      ...(hints.productType && !(raw.item_specifics?.Type || raw.type)
        ? { Type: hints.productType }
        : {}),
      ...(hints.asin ? { ASIN: hints.asin } : {}),
    },
  };

  // 1) Category ID fourni et valide
  if (input.ebay_category_id?.trim()) {
    const validation = await validateCategoryId(
      input.ebay_category_id,
      input.category_name || input.titre || input.ebay_category_id,
    );
    if (validation.valid) {
      return enrichResolution(
        {
          status: "resolved",
          categoryId: input.ebay_category_id.trim(),
          categoryName: validation.categoryName ?? input.category_name ?? null,
          rootCategoryName:
            matchRootFromPath(validation.categoryPath ?? []) ?? null,
          subcategoryName: validation.categoryName ?? null,
          categoryPath: validation.categoryPath ?? [],
          confidence: 1,
          source: "file_id",
          taxonomySource: "eBay Taxonomy",
          alternatives: [],
          missingAspects: [],
          recommendedAspects: [],
          allowedConditions: [],
        },
        input,
      );
    }
  }

  // Si modèle absent mais type produit clair → satisfait "Modèle" Taxonomy
  if (!input.model?.trim() && input.product_type?.trim()) {
    input.model = input.product_type;
    input.item_specifics = {
      ...input.item_specifics,
      Model: input.product_type,
      Modèle: input.product_type,
    };
  }

  const soldType = detectSoldItemType({
    title: input.titre,
    productType: input.product_type ?? input.type,
    categoryHint: input.category_name,
    soldItemType: input.product_type ?? input.type,
    description: input.description,
  });

  // Enrichir product_type si détecté depuis le titre
  if (soldType.id !== "other" && !input.product_type?.trim()) {
    input.product_type = soldType.labelFr;
    input.type = soldType.labelFr;
  }

  const preferredRoot =
    inferPreferredRoot(
      [
        soldType.labelFr,
        input.titre,
        input.category_name,
        input.product_type,
        input.type,
      ]
        .filter(Boolean)
        .join(" "),
    ) || input.category_name;

  const typeQueries = buildSoldTypeSearchQueries({
    soldType,
    title: input.titre,
    brand: input.brand,
    model: input.model,
    mpn: looksLikeAsin(input.mpn) ? null : input.mpn,
  });

  const queries = buildCategorySearchQueries({
    title: input.titre,
    brand: input.brand,
    model: input.model,
    // Ne pas traiter ASIN/external ref comme MPN
    mpn: looksLikeAsin(input.mpn) ? null : input.mpn,
    productType: input.product_type ?? input.type ?? soldType.labelFr,
    categoryName: input.category_name,
    description: input.description,
    color: input.color,
    compatibleDevice: input.compatible_device,
    preferredRoot,
    extraQueries: typeQueries,
  });

  let suggestions: TaxonomySuggestion[] = [];
  try {
    suggestions = await suggestCategoriesMulti(queries, 12);
  } catch (err) {
    return emptyResolution(
      input,
      err instanceof Error
        ? err.message
        : "Impossible de contacter eBay Taxonomy.",
      soldType,
    );
  }

  if (!suggestions.length) {
    return emptyResolution(
      input,
      "Aucun résultat Taxonomy pour ces requêtes. Vérifiez le marketplace EBAY_FR ou relancez.",
      soldType,
    );
  }

  console.info("[category-resolve]", {
    title: input.titre?.slice(0, 80),
    soldType: soldType.id,
    queries: queries.length,
    suggestions: suggestions.length,
    preferredRoot,
  });

  const titleNorm = normalizeForScore(input.titre ?? "");
  const isOverEar =
    titleNorm.includes("headphone") ||
    titleNorm.includes("headset") ||
    titleNorm.includes("casque") ||
    titleNorm.includes("mdr-zx") ||
    titleNorm.includes("powerlocus");
  const isEarbud =
    titleNorm.includes("earbud") ||
    titleNorm.includes("intra") ||
    titleNorm.includes("oreille");
  const isWireless =
    titleNorm.includes("wireless") ||
    titleNorm.includes("bluetooth") ||
    titleNorm.includes("sans fil");

  const rejectedForContradiction: Array<{
    categoryId: string;
    categoryName: string;
    reason: string;
  }> = [];

  const scored = suggestions
    .map((s, index) => {
      const semantic = scoreCategorySemantics({
        soldType,
        categoryName: s.categoryName,
        categoryPath: s.categoryPath ?? [],
        rootCategoryName: s.rootCategoryName,
        preferredRoot,
        title: input.titre,
        brand: input.brand,
        model: input.model,
        taxonomyRank: index,
        taxonomyScore: s.confidence,
      });

      if (semantic.rejected) {
        rejectedForContradiction.push({
          categoryId: s.categoryId,
          categoryName: s.categoryName,
          reason: semantic.rejectReason ?? "Contradiction sémantique",
        });
        return null;
      }

      let score = semantic.score;

      // Bonus audio historiques (conservés, plafonnés)
      const nameNorm = normalizeForScore(s.categoryName);
      const pathNorm = normalizeForScore((s.categoryPath ?? []).join(" "));

      if (
        (isOverEar || isEarbud) &&
        (soldType.id === "headphones" ||
          soldType.id === "earbuds" ||
          soldType.id === "other")
      ) {
        if (nameNorm === "casques" || nameNorm === "casque") {
          score += isOverEar && !isEarbud ? 0.08 : 0.04;
        } else if (
          nameNorm.includes("ecouteur") &&
          !nameNorm.includes("piece")
        ) {
          score += isEarbud ? 0.08 : 0.04;
        }
        if (pathNorm.includes("image, son") || pathNorm.includes("audio")) {
          score += 0.04;
        }
      }

      if (
        titleNorm.includes("iphone") ||
        titleNorm.includes("smartphone") ||
        titleNorm.includes("galaxy")
      ) {
        if (
          nameNorm.includes("etui") ||
          nameNorm.includes("housse") ||
          nameNorm.includes("coque") ||
          nameNorm.includes("case")
        ) {
          score -= 0.35;
        }
        if (
          nameNorm.includes("telephone") ||
          nameNorm.includes("smartphone") ||
          nameNorm.includes("mobile")
        ) {
          score += 0.12;
        }
      }

      if ((s.categoryTreeNodeLevel ?? 0) >= 3 && semantic.typeMatch) {
        score += 0.03;
      }

      return {
        suggestion: {
          ...s,
          confidence: Math.min(0.94, Math.max(0.05, score)),
        },
        semantic,
      };
    })
    .filter(
      (
        row,
      ): row is {
        suggestion: TaxonomySuggestion;
        semantic: ReturnType<typeof scoreCategorySemantics>;
      } => row !== null,
    )
    .sort((a, b) => b.suggestion.confidence - a.suggestion.confidence);

  if (!scored.length) {
    return {
      status: "needs_review",
      categoryId: null,
      categoryName: null,
      rootCategoryName: preferredRoot ?? null,
      subcategoryName: null,
      categoryPath: [],
      confidence: 0,
      source: "none",
      taxonomySource: "eBay Taxonomy",
      alternatives: [],
      missingAspects: [],
      recommendedAspects: [],
      allowedConditions: [],
      soldItemType: soldType.labelFr,
      rejectedForContradiction,
      message: messageForBand("error"),
    };
  }

  suggestions = scored.map((r) => r.suggestion);
  const topRow = scored[0];
  const top = topRow.suggestion;
  const second = suggestions[1];
  const gap = second ? top.confidence - second.confidence : 1;
  // Alternatives proches uniquement si les deux matchent le type vendu
  const closeAlternatives =
    Boolean(second) &&
    gap < AUTO_ACCEPT_GAP &&
    second!.confidence >= 0.55 &&
    topRow.semantic.typeMatch &&
    scored[1]?.semantic.typeMatch === true &&
    Math.abs(top.confidence - second!.confidence) < 0.08;

  const band = confidenceBand(top.confidence, {
    typeMatch: topRow.semantic.typeMatch,
    rejectedAll: false,
    closeAlternatives,
  });

  // Seuil « certain » : confiance plafonnée à 0,94 → READY si ≥ 0,94
  const certain =
    topRow.semantic.typeMatch &&
    top.confidence >= 0.94 &&
    !closeAlternatives;

  // Inférer Connectivité si évidente
  if (
    !input.item_specifics?.Connectivité &&
    !input.item_specifics?.Connectivity
  ) {
    if (isWireless) {
      input.item_specifics = {
        ...input.item_specifics,
        Connectivité: "Sans fil",
        Connectivity: "Wireless",
      };
    } else {
      const wired =
        titleNorm.includes("filaire") ||
        titleNorm.includes("wired") ||
        titleNorm.includes("mdr-zx") ||
        (titleNorm.includes("headphone") &&
          !titleNorm.includes("bluetooth") &&
          !titleNorm.includes("wireless") &&
          !titleNorm.includes("sans fil"));
      if (wired) {
        input.item_specifics = {
          ...input.item_specifics,
          Connectivité: "Filaire",
          Connectivity: "Wired",
        };
      }
    }
  }

  const base: CategoryResolution = {
    status: certain ? "resolved" : "needs_review",
    categoryId: top.categoryId,
    categoryName: top.categoryName,
    rootCategoryName: top.rootCategoryName ?? preferredRoot ?? null,
    subcategoryName: top.categoryName,
    categoryPath: top.categoryPath ?? [],
    confidence: top.confidence,
    source: input.category_name ? "file_name" : "auto",
    taxonomySource: "eBay Taxonomy",
    alternatives: suggestions.slice(1, 4),
    missingAspects: [],
    recommendedAspects: [],
    allowedConditions: [],
    soldItemType: soldType.labelFr,
    rejectedForContradiction,
    message: certain ? undefined : messageForBand(band),
  };

  return enrichResolution(base, input);
}

function normalizeForScore(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function emptyResolution(
  input: CategoryResolveInput,
  message: string,
  soldType?: SoldItemType,
): CategoryResolution {
  return {
    status: "needs_review",
    categoryId: null,
    categoryName: input.category_name ?? null,
    rootCategoryName: inferPreferredRoot(input.titre ?? "") ?? null,
    subcategoryName: null,
    categoryPath: [],
    confidence: 0,
    source: "none",
    taxonomySource: "eBay Taxonomy",
    alternatives: [],
    missingAspects: [],
    recommendedAspects: [],
    allowedConditions: [],
    soldItemType: soldType?.labelFr ?? null,
    message,
  };
}

function matchRootFromPath(path: string[]): string | null {
  return inferPreferredRoot(path.join(" "));
}

function looksLikeAsin(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^B0[A-Z0-9]{8}$/i.test(value.trim());
}

/** Extrait marque / modèle / ASIN depuis titre ou référence externe. */
export function extractProductHints(input: {
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  mpn?: string | null;
  sku?: string | null;
  externalReference?: string | null;
}): {
  brand: string | null;
  model: string | null;
  mpn: string | null;
  asin: string | null;
  externalReference: string | null;
  color: string | null;
  productType: string | null;
} {
  const title = input.title?.trim() ?? "";
  let brand = input.brand?.trim() || null;
  let model = input.model?.trim() || null;
  let mpn = input.mpn?.trim() || null;
  let asin: string | null = null;
  let externalReference = input.externalReference?.trim() || null;

  const sku = input.sku?.trim() || null;
  if (looksLikeAsin(sku)) {
    asin = sku!.toUpperCase();
    externalReference = externalReference ?? asin;
  } else if (looksLikeAsin(mpn)) {
    asin = mpn!.toUpperCase();
    externalReference = externalReference ?? asin;
    mpn = null;
  } else if (looksLikeAsin(externalReference)) {
    asin = externalReference!.toUpperCase();
  }

  if (!brand) {
    const known = [
      "Sony",
      "Apple",
      "Samsung",
      "Canon",
      "Bosch",
      "Seiko",
      "Nike",
      "Adidas",
      "Dell",
      "HP",
      "Lenovo",
      "Asus",
      "Microsoft",
      "Logitech",
      "PowerLocus",
      "JBL",
      "Bose",
      "Beats",
      "Sennheiser",
      "Xiaomi",
    ];
    brand =
      known.find((b) => new RegExp(`\\b${b}\\b`, "i").test(title)) ?? null;
  }

  if (!model) {
    model = title.match(/\b([A-Z]{2,5}-[A-Z0-9]{2,12})\b/i)?.[1] ?? null;
  }

  let color: string | null = null;
  const colorMatch = title.match(
    /\b(black|noir|white|blanc|red|rouge|blue|bleu|green|vert|silver|argent|gold|or)\b/i,
  );
  if (colorMatch) {
    const map: Record<string, string> = {
      black: "Noir",
      noir: "Noir",
      white: "Blanc",
      blanc: "Blanc",
      red: "Rouge",
      rouge: "Rouge",
      blue: "Bleu",
      bleu: "Bleu",
      green: "Vert",
      vert: "Vert",
      silver: "Argenté",
      argent: "Argenté",
      gold: "Doré",
      or: "Doré",
    };
    color = map[colorMatch[1].toLowerCase()] ?? colorMatch[1];
  }

  let productType: string | null = null;
  const n = title.toLowerCase();
  if (n.includes("headphone") || n.includes("casque") || n.includes("headset")) {
    productType = n.includes("bluetooth") || n.includes("wireless")
      ? "Casque Bluetooth"
      : "Casque audio";
  } else {
    const detected = detectSoldItemType({ title });
    if (detected.id !== "other") {
      productType = detected.labelFr;
    }
  }

  return {
    brand,
    model,
    mpn,
    asin,
    externalReference,
    color,
    productType,
  };
}

async function enrichResolution(
  resolution: CategoryResolution,
  input: CategoryResolveInput,
): Promise<CategoryResolution> {
  if (!resolution.categoryId) return resolution;

  const [aspects, allowedConditions, validated] = await Promise.all([
    getItemAspectsForCategory(resolution.categoryId),
    getConditionPoliciesForCategory(resolution.categoryId),
    validateCategoryId(
      resolution.categoryId,
      input.titre || resolution.categoryName || undefined,
    ),
  ]);

  const categoryPath =
    validated.categoryPath?.length
      ? validated.categoryPath
      : resolution.categoryPath;
  const rootCategoryName =
    matchRootFromPath(categoryPath) ||
    resolution.rootCategoryName ||
    inferPreferredRoot(input.titre ?? "") ||
    null;
  const subcategoryName =
    validated.categoryName ||
    resolution.subcategoryName ||
    resolution.categoryName;

  const missingAspects = aspects
    .filter((a) => a.required)
    .map((a) => a.name)
    .filter((name) => !hasAspect(input, name));

  const recommendedAspects = aspects
    .filter((a) => !a.required)
    .map((a) => a.name)
    .slice(0, 12);

  const conditionId = input.ebay_condition_id?.trim();
  const invalidCondition = Boolean(
    conditionId &&
      allowedConditions.length > 0 &&
      !allowedConditions.some((c) => c.conditionId === conditionId),
  );

  const needsReview =
    resolution.status !== "resolved" ||
    missingAspects.length > 0 ||
    invalidCondition;

  return {
    ...resolution,
    categoryName: subcategoryName,
    subcategoryName,
    rootCategoryName,
    categoryPath,
    status: needsReview ? "needs_review" : "resolved",
    missingAspects,
    recommendedAspects,
    allowedConditions,
    invalidCondition,
    message: invalidCondition
      ? "Condition ID non autorisée pour cette catégorie eBay."
      : missingAspects.length
        ? "Catégorie probable mais champs eBay obligatoires manquants."
        : resolution.message,
  };
}

function hasAspect(input: CategoryResolveInput, aspectName: string): boolean {
  const key = aspectName.toLowerCase();
  const specifics = Object.entries(input.item_specifics ?? {}).find(
    ([k]) => k.toLowerCase() === key,
  );
  if (specifics?.[1]?.trim()) return true;

  const aliases: Record<string, string | null | undefined> = {
    brand: input.brand,
    marque: input.brand,
    mpn: input.mpn,
    model: input.model,
    modèle: input.model,
    modele: input.model,
    type: input.type ?? input.product_type,
    color: input.color,
    couleur: input.color,
    material: input.material,
    matériau: input.material,
    materiau: input.material,
    manufacturer: input.manufacturer,
    fabricant: input.manufacturer,
    ean: input.ean,
  };

  for (const [alias, value] of Object.entries(aliases)) {
    if ((key === alias || key.includes(alias)) && value?.trim()) return true;
  }

  // Correspondances FR/EN fréquentes
  if (
    (key.includes("marque") || key === "brand") &&
    input.brand?.trim()
  ) {
    return true;
  }
  if (
    (key.includes("couleur") || key.includes("color")) &&
    input.color?.trim()
  ) {
    return true;
  }
  if (
    (key.includes("modèle") || key.includes("modele") || key.includes("model")) &&
    input.model?.trim()
  ) {
    return true;
  }
  if (
    (key.includes("connectiv") || key.includes("connectivity")) &&
    (input.item_specifics?.Connectivité ||
      input.item_specifics?.Connectivity ||
      input.item_specifics?.connectivité)
  ) {
    return true;
  }

  return false;
}
