/**
 * Détection catégorie eBay FR via Taxonomy API (multi-requêtes, scoring).
 * Ne jamais inventer d'ID. Liste des racines = biais de scoring uniquement.
 */
import { AppError } from "@/lib/errors/app-error";
import {
  EbayClient,
  getEbayApiUrl,
  getEbayMarketplaceId,
  isEbayMockMode,
} from "./client";

export type TaxonomySuggestion = {
  categoryId: string;
  categoryName: string;
  categoryTreeNodeLevel?: number;
  categoryPath?: string[];
  rootCategoryName?: string;
  confidence: number;
};

export type CategoryAspect = {
  name: string;
  required: boolean;
  mode: "FREE_TEXT" | "SELECTION_ONLY" | string;
  values: string[];
};

export type CategoryConditionPolicy = {
  conditionId: string;
  conditionDescription?: string;
};

/** Racines eBay FR — biais de scoring uniquement, jamais d'ID inventé. */
export const EBAY_FR_ROOT_CATEGORIES = [
  "Animalerie",
  "Appareils photo et caméscopes",
  "Art et antiquités",
  "Articles d'électroménager",
  "Articles de loisir créatif",
  "Articles pour bébé",
  "Articles pour jardin et terrasse",
  "Articles pour la maison",
  "Automobiles et motocyclettes",
  "Bateaux, voile et nautisme",
  "Bijoux et montres",
  "Céramiques et verres",
  "Collections",
  "DVD et articles de cinéma",
  "Immobilier",
  "Informatique et réseaux",
  "Instruments de musique",
  "Jeux vidéo et consoles",
  "Jouets et jeux",
  "Livres, bandes dessinées et revues",
  "Matériel audio et vidéo",
  "Matériel de bricolage",
  "Monnaies",
  "Musique, CD et vinyles",
  "Pièces et accessoires pour automobiles et motocyclettes",
  "PME, artisans et agriculteurs",
  "Produits de beauté, bien-être et parfums",
  "Sports et vacances",
  "Timbres",
  "Téléphonie et mobilité",
  "Vêtements et accessoires",
] as const;

type DefaultTreeResponse = { categoryTreeId: string };
type SuggestionsResponse = {
  categorySuggestions?: Array<{
    category: { categoryId: string; categoryName: string };
    categoryTreeNodeLevel?: number;
    categoryTreeNodeAncestors?: Array<{ categoryName: string }>;
  }>;
};
type AspectsResponse = {
  aspects?: Array<{
    localizedAspectName: string;
    aspectConstraint?: { aspectRequired?: boolean; aspectMode?: string };
    aspectValues?: Array<{ localizedValue: string }>;
  }>;
};
type ConditionPoliciesResponse = {
  itemConditionPolicies?: Array<{
    itemConditions?: Array<{
      conditionId: string;
      conditionDescription?: string;
    }>;
  }>;
};

let cachedTreeId: string | null = null;
let cachedAppToken: { token: string; expiresAt: number } | null = null;

/** Invalide le cache Taxonomy (Relancer la détection). */
export function clearTaxonomyCache(): void {
  cachedTreeId = null;
  cachedAppToken = null;
}

function hasEbayCredentials(): boolean {
  return Boolean(
    process.env.EBAY_CLIENT_ID?.trim() &&
      process.env.EBAY_CLIENT_SECRET?.trim(),
  );
}

async function getApplicationAccessToken(): Promise<string> {
  if (isEbayMockMode()) {
    throw AppError.internal(
      "Mode mock eBay actif (EBAY_MOCK_MODE=true) — Taxonomy désactivée.",
    );
  }
  if (!hasEbayCredentials()) {
    throw AppError.internal(
      "Token eBay absent : configurez EBAY_CLIENT_ID et EBAY_CLIENT_SECRET.",
    );
  }

  if (cachedAppToken && cachedAppToken.expiresAt > Date.now() + 60_000) {
    return cachedAppToken.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID!.trim();
  const clientSecret = process.env.EBAY_CLIENT_SECRET!.trim();

  const authUrl =
    process.env.EBAY_ENVIRONMENT === "production"
      ? "https://api.ebay.com/identity/v1/oauth2/token"
      : "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "https://api.ebay.com/oauth/api_scope",
  });

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status === 401) {
      throw AppError.internal(
        "Token eBay refusé (401) : identifiants invalides ou environnement incorrect (sandbox vs production).",
      );
    }
    throw AppError.internal(
      `Token eBay échoué HTTP ${response.status}${text ? ` — ${text.slice(0, 120)}` : ""}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  if (!data.access_token) {
    throw AppError.internal("Réponse token eBay invalide (access_token manquant).");
  }

  cachedAppToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

function taxonomyClient(token: string): EbayClient {
  return new EbayClient({
    accessToken: token,
    marketplaceId: getEbayMarketplaceId(),
  });
}

export async function getEbayFrCategoryTreeId(): Promise<string> {
  if (cachedTreeId) return cachedTreeId;
  const token = await getApplicationAccessToken();
  const client = taxonomyClient(token);
  const marketplace = getEbayMarketplaceId();
  const data = await client.get<DefaultTreeResponse>(
    `/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${marketplace}`,
  );
  cachedTreeId = data.categoryTreeId;
  return cachedTreeId;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchRootCategory(path: string[]): string | undefined {
  const joined = normalizeText(path.join(" "));
  for (const root of EBAY_FR_ROOT_CATEGORIES) {
    const n = normalizeText(root);
    if (joined.includes(n) || path.some((p) => normalizeText(p) === n)) {
      return root;
    }
  }
  return undefined;
}

async function fetchSuggestionsRaw(
  query: string,
  limit: number,
): Promise<TaxonomySuggestion[]> {
  const q = query.trim().slice(0, 350);
  if (!q) return [];

  const token = await getApplicationAccessToken();
  const treeId = await getEbayFrCategoryTreeId();
  const client = taxonomyClient(token);
  const path = `/commerce/taxonomy/v1/category_tree/${treeId}/get_category_suggestions?q=${encodeURIComponent(q)}`;

  console.info("[taxonomy] query", {
    q,
    treeId,
    marketplace: getEbayMarketplaceId(),
    env: process.env.EBAY_ENVIRONMENT ?? "sandbox",
  });

  try {
    const data = await client.get<SuggestionsResponse>(path);
    const suggestions = data.categorySuggestions ?? [];
    console.info("[taxonomy] response", {
      q,
      http: 200,
      count: suggestions.length,
      top: suggestions[0]?.category?.categoryName ?? null,
    });
    return suggestions.slice(0, limit).map((s, index) => {
      const pathNames = [
        ...(s.categoryTreeNodeAncestors ?? []).map((a) => a.categoryName),
        s.category.categoryName,
      ];
      const rootCategoryName = matchRootCategory(pathNames);
      // Score Taxonomy indicatif seulement — la confiance réelle est recalculée en sémantique
      const base = Math.max(0.25, 0.7 - index * 0.08);
      const depthBonus = Math.min(0.1, (s.categoryTreeNodeLevel ?? 1) * 0.02);
      const rootBonus = rootCategoryName ? 0.05 : 0;
      return {
        categoryId: s.category.categoryId,
        categoryName: s.category.categoryName,
        categoryTreeNodeLevel: s.categoryTreeNodeLevel,
        categoryPath: pathNames,
        rootCategoryName,
        confidence: Math.min(0.85, base + depthBonus + rootBonus),
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[taxonomy] http_error", { q, treeId, message });
    throw err;
  }
}

export function buildCategorySearchQueries(input: {
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  mpn?: string | null;
  productType?: string | null;
  categoryName?: string | null;
  description?: string | null;
  color?: string | null;
  compatibleDevice?: string | null;
  preferredRoot?: string | null;
  /** Requêtes additionnelles (type vendu / sémantique) */
  extraQueries?: string[];
}): string[] {
  const title = input.title?.trim() ?? "";
  const brand = input.brand?.trim() ?? "";
  const model = input.model?.trim() ?? "";
  const mpn = input.mpn?.trim() ?? "";
  const type = input.productType?.trim() ?? "";
  const color = input.color?.trim() ?? "";
  const device = input.compatibleDevice?.trim() ?? "";
  const cat = input.categoryName?.trim() ?? "";
  const root = input.preferredRoot?.trim() ?? "";

  const titleLower = title.toLowerCase();
  const modelToken =
    model ||
    title.match(/\b([A-Z]{2,5}-?[A-Z0-9]{2,12})\b/i)?.[1] ||
    "";

  const isAudio =
    titleLower.includes("headphone") ||
    titleLower.includes("headset") ||
    titleLower.includes("casque") ||
    titleLower.includes("écouteur") ||
    titleLower.includes("ecouteur") ||
    titleLower.includes("earbuds");

  const isWireless =
    titleLower.includes("wireless") ||
    titleLower.includes("bluetooth") ||
    titleLower.includes("sans fil");

  const isLaptopPart =
    /\b(batterie|battery|écran|ecran|lcd|clavier|keyboard|trackpad|carte mère|carte mere|logic board|nappe|connecteur|chargeur|charger)\b/i.test(
      `${title} ${type}`,
    );

  const queries = [
    // Priorité : requêtes type vendu (sémantique)
    ...(input.extraQueries ?? []),
    // 1. marque + modèle
    [brand, modelToken, mpn].filter(Boolean).join(" "),
    [brand, modelToken].filter(Boolean).join(" "),
    // 2. type précis
    isAudio && brand
      ? isWireless
        ? `${brand} wireless headphones`
        : `${brand} headphones`
      : "",
    isAudio && brand
      ? isWireless
        ? `casque Bluetooth ${brand}`
        : `casque audio ${brand}`
      : "",
    title,
    // 3. traduction FR
    isAudio && isWireless ? "casque audio sans fil" : "",
    isAudio && isWireless ? "casque Bluetooth" : "",
    isAudio && !isWireless ? "casque audio filaire" : "",
    isAudio ? "casque stéréo avec microphone" : "",
    // 4. type générique EN
    isAudio && isWireless ? "wireless headset" : "",
    isAudio && isWireless ? "Bluetooth headphones" : "",
    isAudio && !isWireless ? "wired headphones" : "",
    isAudio ? "headphones" : "",
    cat,
    type,
    [brand, type].filter(Boolean).join(" "),
    [type, brand].filter(Boolean).join(" "),
    [device, type].filter(Boolean).join(" "),
    [color, type, brand].filter(Boolean).join(" "),
    root && type ? `${type} ${root}` : "",
    root && brand ? `${brand} ${root}` : "",
    titleLower.includes("iphone") && !isLaptopPart ? "smartphone apple" : "",
    // Ne pas pousser "ordinateur portable" pour une pièce détachée MacBook
    titleLower.includes("macbook") && !isLaptopPart
      ? "ordinateur portable apple"
      : "",
    titleLower.includes("foldable") || titleLower.includes("pliable")
      ? isAudio
        ? "casque audio pliable"
        : ""
      : "",
  ]
    .map((q) => q.trim())
    .filter((q) => q.length >= 3);

  return [...new Set(queries)].slice(0, 14);
}

/**
 * Multi-requêtes Taxonomy + déduplication + scoring.
 */
export async function suggestCategoriesMulti(
  queries: string[],
  limit = 8,
): Promise<TaxonomySuggestion[]> {
  if (isEbayMockMode()) {
    throw AppError.internal(
      "Mode mock eBay actif : Taxonomy désactivée (EBAY_MOCK_MODE=true).",
    );
  }
  if (!hasEbayCredentials()) {
    throw AppError.internal(
      "Identifiants eBay manquants pour Taxonomy (EBAY_CLIENT_ID / EBAY_CLIENT_SECRET).",
    );
  }

  const uniqueQueries = [...new Set(queries.map((q) => q.trim()).filter(Boolean))];
  const batches = await Promise.allSettled(
    uniqueQueries.map((q) => fetchSuggestionsRaw(q, 6)),
  );

  const byId = new Map<string, TaxonomySuggestion>();
  let lastError: unknown = null;
  for (const result of batches) {
    if (result.status !== "fulfilled") {
      lastError = result.reason;
      continue;
    }
    for (const suggestion of result.value) {
      const prev = byId.get(suggestion.categoryId);
      if (!prev || suggestion.confidence > prev.confidence) {
        byId.set(suggestion.categoryId, suggestion);
      } else if (prev) {
        prev.confidence = Math.min(0.85, prev.confidence + 0.03);
      }
    }
  }

  if (byId.size === 0 && lastError) {
    throw lastError instanceof Error
      ? lastError
      : AppError.internal("Échec Taxonomy eBay.");
  }

  const sorted = [...byId.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, limit);

  console.info("[taxonomy] multi", {
    queries: uniqueQueries.length,
    returned: sorted.length,
    chosen: sorted[0]
      ? { id: sorted[0].categoryId, name: sorted[0].categoryName }
      : null,
  });

  return sorted;
}

export async function suggestCategories(
  query: string,
  limit = 8,
): Promise<TaxonomySuggestion[]> {
  return suggestCategoriesMulti([query], limit);
}

export async function getItemAspectsForCategory(
  categoryId: string,
): Promise<CategoryAspect[]> {
  if (isEbayMockMode() || !hasEbayCredentials()) return [];

  const token = await getApplicationAccessToken();
  const treeId = await getEbayFrCategoryTreeId();
  const client = taxonomyClient(token);

  const data = await client.get<AspectsResponse>(
    `/commerce/taxonomy/v1/category_tree/${treeId}/get_item_aspects_for_category?category_id=${encodeURIComponent(categoryId)}`,
  );

  return (data.aspects ?? []).map((a) => ({
    name: a.localizedAspectName,
    required: Boolean(a.aspectConstraint?.aspectRequired),
    mode: a.aspectConstraint?.aspectMode ?? "FREE_TEXT",
    values: (a.aspectValues ?? []).map((v) => v.localizedValue),
  }));
}

export async function getConditionPoliciesForCategory(
  categoryId: string,
): Promise<CategoryConditionPolicy[]> {
  if (!categoryId.trim() || isEbayMockMode() || !hasEbayCredentials()) {
    return [];
  }

  const token = await getApplicationAccessToken();
  const marketplace = getEbayMarketplaceId();
  const client = taxonomyClient(token);

  const data = await client.get<ConditionPoliciesResponse>(
    `/sell/metadata/v1/marketplace/${marketplace}/get_item_condition_policies?category_ids=${encodeURIComponent(categoryId)}`,
  );

  const policy = data.itemConditionPolicies?.[0];
  return (policy?.itemConditions ?? []).map((c) => ({
    conditionId: String(c.conditionId),
    conditionDescription: c.conditionDescription,
  }));
}

export async function validateCategoryId(
  categoryId: string,
  hintQuery?: string,
): Promise<{ valid: boolean; categoryName?: string; categoryPath?: string[] }> {
  if (!categoryId.trim()) return { valid: false };
  if (isEbayMockMode() || !hasEbayCredentials()) return { valid: false };

  try {
    const token = await getApplicationAccessToken();
    const treeId = await getEbayFrCategoryTreeId();
    const url = `${getEbayApiUrl()}/commerce/taxonomy/v1/category_tree/${treeId}/get_category_subtree?category_id=${encodeURIComponent(categoryId)}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": getEbayMarketplaceId(),
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const suggestions = await suggestCategories(
        hintQuery?.trim() || categoryId,
        20,
      );
      const match = suggestions.find((s) => s.categoryId === categoryId.trim());
      return match
        ? {
            valid: true,
            categoryName: match.categoryName,
            categoryPath: match.categoryPath,
          }
        : { valid: false };
    }
    const data = (await response.json()) as {
      categorySubtreeNode?: {
        category?: { categoryName?: string };
        categoryTreeNodeAncestors?: Array<{ categoryName: string }>;
      };
    };
    const name = data.categorySubtreeNode?.category?.categoryName;
    const ancestors =
      data.categorySubtreeNode?.categoryTreeNodeAncestors?.map(
        (a) => a.categoryName,
      ) ?? [];
    return name
      ? {
          valid: true,
          categoryName: name,
          categoryPath: [...ancestors, name],
        }
      : { valid: false };
  } catch {
    return { valid: false };
  }
}

export function inferPreferredRoot(text: string): string | null {
  const n = normalizeText(text);
  const rules: Array<{ root: string; needles: string[] }> = [
    {
      root: "Matériel audio et vidéo",
      needles: [
        "casque",
        "headphone",
        "headset",
        "earbuds",
        "écouteur",
        "ecouteur",
        "enceinte",
        "speaker",
        "ampli",
        "bluetooth headphone",
        "wireless headphone",
        "powerlocus",
      ],
    },
    {
      root: "Téléphonie et mobilité",
      needles: [
        "iphone",
        "smartphone",
        "galaxy",
        "téléphone",
        "telephone",
        "phone",
        "pixel",
      ],
    },
    {
      root: "Informatique et réseaux",
      needles: [
        "macbook",
        "laptop",
        "ordinateur",
        "pc ",
        "ssd",
        "carte mere",
        "logic board",
        "batterie macbook",
        "battery macbook",
        "laptop battery",
        "batterie ordinateur",
        "écran macbook",
        "trackpad",
        "pavé tactile",
        "clavier macbook",
      ],
    },
    {
      root: "Appareils photo et caméscopes",
      needles: ["canon eos", "appareil photo", "camera", "objectif", "nikon"],
    },
    {
      root: "Vêtements et accessoires",
      needles: ["robe", "t-shirt", "chaussure", "jean", "manteau"],
    },
    {
      root: "Matériel de bricolage",
      needles: ["perceuse", "visseuse", "scie", "bosch", "makita"],
    },
    {
      root: "Instruments de musique",
      // Ne pas matcher "batterie" seule (≠ batterie laptop)
      needles: [
        "guitare",
        "piano",
        "violon",
        "batterie acoustique",
        "batterie électronique",
        "drum kit",
        "caisse claire",
      ],
    },
    {
      root: "Articles pour bébé",
      needles: ["poussette", "bébé", "biberon", "siège auto"],
    },
    {
      root: "Bijoux et montres",
      needles: ["montre", "seiko", "bracelet", "collier", "bague"],
    },
  ];

  for (const rule of rules) {
    if (rule.needles.some((needle) => n.includes(normalizeText(needle)))) {
      return rule.root;
    }
  }
  return null;
}
