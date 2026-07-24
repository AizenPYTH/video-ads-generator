/**
 * Complète les caractéristiques eBay manquantes (marque compatible, type…)
 * à partir du titre / description + IA — même logique qu’un import Excel enrichi.
 */
import { getOpenAIClient, getOpenAIModel, isOpenAIMockMode } from "@/services/ai/openai-client";
import {
  collectRawAspectValues,
  type AspectSourceInput,
} from "@/services/ebay/aspects";
import type { CategoryAspect } from "@/services/ebay/taxonomy";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function hasKey(
  specifics: Record<string, string>,
  aspectName: string,
): boolean {
  const n = norm(aspectName);
  return Object.entries(specifics).some(
    ([k, v]) => norm(k) === n && Boolean(v?.trim()),
  );
}

function setBoth(
  specifics: Record<string, string>,
  keys: string[],
  value: string,
): void {
  const v = value.trim();
  if (!v) return;
  for (const k of keys) {
    specifics[k] ??= v;
  }
}

/** Heuristiques locales avant appel OpenAI. */
function applyLocalHeuristics(
  specifics: Record<string, string>,
  title: string,
  missing: string[],
): string[] {
  const filled: string[] = [];
  const enriched = collectRawAspectValues({
    title,
    itemSpecifics: specifics,
    brand: specifics.Brand || specifics.Marque || null,
    type: specifics.Type || null,
    productType: specifics.Type || null,
    compatibleBrand:
      specifics["Compatible Brand"] || specifics["Marque compatible"] || null,
    compatibleDevice:
      specifics["Compatible Device"] ||
      specifics["Appareil compatible"] ||
      null,
    compatibleModel:
      specifics["Compatible Model Number"] ||
      specifics["Numéro de modèle compatible"] ||
      null,
    mpn: specifics.MPN || null,
    model: specifics.Model || specifics.Modèle || null,
  } satisfies AspectSourceInput);

  for (const [k, v] of Object.entries(enriched)) {
    if (v?.trim() && !specifics[k]?.trim()) {
      specifics[k] = v.trim();
    }
  }

  for (const aspect of missing) {
    if (hasKey(specifics, aspect)) {
      filled.push(aspect);
      continue;
    }
    const n = norm(aspect);

    if (n.includes("marque compatible") || n.includes("compatible brand")) {
      const fromTitle =
        title.match(
          /\b(Apple|Samsung|Xiaomi|Huawei|Oppo|Honor|Google|OnePlus|Sony|Nokia|Motorola|Realme|Vivo|Asus|Lenovo|Microsoft|Nintendo|HP|Dell)\b/i,
        )?.[1] ?? null;
      if (fromTitle) {
        setBoth(specifics, ["Compatible Brand", "Marque compatible"], fromTitle);
        filled.push(aspect);
      }
    }

    if (
      (n === "marque" || n === "brand") &&
      !specifics.Brand &&
      !specifics.Marque
    ) {
      const fromTitle =
        title.match(
          /\b(Apple|Samsung|Xiaomi|Huawei|Oppo|Honor|Google|OnePlus|Sony|Nokia|Motorola|Realme|Vivo|Asus|Lenovo|Microsoft|Nintendo|HP|Dell|Amazon|Anker|Belkin|JBL)\b/i,
        )?.[1] ?? null;
      if (fromTitle) {
        setBoth(specifics, ["Brand", "Marque"], fromTitle);
        filled.push(aspect);
      } else if (
        /\b(coque|cable|câble|chargeur|piece|pièce|vitre|ecran|écran|battery|batterie|adapter|adaptateur)\b/i.test(
          title,
        )
      ) {
        setBoth(specifics, ["Brand", "Marque"], "OEM");
        filled.push(aspect);
      }
    }

    if (
      (n.includes("capacite") || n.includes("storage") || n.includes("stockage")) &&
      !hasKey(specifics, aspect)
    ) {
      const storage = title.match(/\b(\d+)\s*(Go|GB|To|TB)\b/i);
      if (storage) {
        const unit = /to|tb/i.test(storage[2]) ? "To" : "Go";
        const value = `${storage[1]} ${unit}`;
        setBoth(
          specifics,
          [
            aspect,
            "Capacité de stockage",
            "Storage Capacity",
            "Capacité",
          ],
          value,
        );
        filled.push(aspect);
      }
    }

    if (
      (n.includes("couleur") || n === "color" || n === "colour") &&
      !hasKey(specifics, aspect)
    ) {
      const color = title.match(
        /\b(Noir|Black|Blanc|White|Bleu|Blue|Rouge|Red|Vert|Green|Rose|Pink|Gris|Gray|Grey|Or|Gold|Argent|Silver|Titane|Titanium|Midnight|Starlight)\b/i,
      )?.[1];
      if (color) {
        setBoth(specifics, [aspect, "Color", "Couleur"], color);
        filled.push(aspect);
      }
    }

    if (
      (n === "modele" || n === "model" || n.includes("nom du modele")) &&
      !hasKey(specifics, aspect)
    ) {
      const model = title.match(
        /\b((?:iPhone|Galaxy|Pixel|Redmi|Xiaomi)\s+[A-Za-z0-9]+(?:\s+(?:Pro|Max|Plus|Ultra|FE|Lite))?)/i,
      )?.[1];
      if (model) {
        setBoth(specifics, [aspect, "Model", "Modèle"], model.trim());
        filled.push(aspect);
      }
    }

    if (n === "type" || n.includes("type de produit")) {
      const t = specifics.Type || enriched.Type;
      if (t) {
        setBoth(specifics, ["Type", "Type de produit", "Product Type"], t);
        filled.push(aspect);
      }
    }
  }

  return filled;
}

async function fillWithOpenAI(input: {
  title: string;
  description?: string | null;
  specifics: Record<string, string>;
  missingAspects: string[];
  categoryAspects?: CategoryAspect[];
}): Promise<Record<string, string>> {
  if (isOpenAIMockMode() || input.missingAspects.length === 0) {
    return {};
  }

  const allowedHints = (input.categoryAspects ?? [])
    .filter((a) => input.missingAspects.some((m) => norm(m) === norm(a.name)))
    .map((a) => ({
      name: a.name,
      values: a.values.slice(0, 40),
      required: a.required,
    }));

  try {
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Tu es un assistant eBay France (électronique, téléphonie, pièces). " +
            "Remplis UNIQUEMENT les caractéristiques manquantes demandées. " +
            "Pour un produit fini (ex. iPhone), Brand/Marque = marque du produit (Apple…). " +
            "Pour une pièce détachée sans marque fabricant connue, Brand/Marque = OEM. " +
            "Marque compatible = marque de l'appareil (Apple, Samsung…) si c'est une pièce. " +
            "Capacité de stockage : ex. 128 Go. Couleur : valeur simple. " +
            "Réponds en JSON { \"aspects\": { \"Nom aspect\": \"valeur\" } }. " +
            "N'invente pas de MPN/EAN absents du contexte. Préfère les valeurs de la liste autorisée si fournie.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            description: (input.description ?? "").slice(0, 1500),
            knownSpecifics: input.specifics,
            missingAspects: input.missingAspects,
            allowedValuesHints: allowedHints,
          }),
        },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      aspects?: Record<string, string>;
    };
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed.aspects ?? {})) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch (err) {
    console.warn(
      "[fill-aspects] openai failed",
      err instanceof Error ? err.message : err,
    );
    return {};
  }
}

/**
 * Enrichit item_specifics pour couvrir les aspects eBay obligatoires manquants.
 */
export async function enrichItemSpecificsForEbay(input: {
  title: string;
  description?: string | null;
  itemSpecifics: Record<string, string>;
  missingAspects?: string[] | null;
  categoryAspects?: CategoryAspect[];
  /** Catalogue bulk : pas d’appel OpenAI (heuristiques seules). */
  skipOpenAI?: boolean;
}): Promise<{
  itemSpecifics: Record<string, string>;
  filledAspects: string[];
  stillMissing: string[];
}> {
  const specifics = { ...input.itemSpecifics };
  const missing = [...(input.missingAspects ?? [])].filter(Boolean);

  if (missing.length === 0) {
    // Même sans liste : appliquer heuristiques titre (marque compatible, type…)
    applyLocalHeuristics(specifics, input.title, [
      "Marque compatible",
      "Compatible Brand",
      "Marque",
      "Brand",
      "Type",
    ]);
    return { itemSpecifics: specifics, filledAspects: [], stillMissing: [] };
  }

  const filledLocal = applyLocalHeuristics(specifics, input.title, missing);
  const stillAfterLocal = missing.filter((a) => !hasKey(specifics, a));

  const fromAi = input.skipOpenAI
    ? {}
    : await fillWithOpenAI({
        title: input.title,
        description: input.description,
        specifics,
        missingAspects: stillAfterLocal,
        categoryAspects: input.categoryAspects,
      });

  const filledAi: string[] = [];
  for (const [k, v] of Object.entries(fromAi)) {
    if (!v.trim()) continue;
    specifics[k] ??= v;
    // Alias FR/EN courants
    if (/marque compatible|compatible brand/i.test(k)) {
      setBoth(specifics, ["Compatible Brand", "Marque compatible"], v);
    }
    if (/^marque$|^brand$/i.test(k)) {
      setBoth(specifics, ["Brand", "Marque"], v);
    }
    if (/^type$/i.test(k)) {
      setBoth(specifics, ["Type", "Type de produit", "Product Type"], v);
    }
    if (/appareil compatible|compatible device/i.test(k)) {
      setBoth(
        specifics,
        ["Compatible Device", "Appareil compatible", "Modèle compatible"],
        v,
      );
    }
  }

  for (const aspect of stillAfterLocal) {
    if (hasKey(specifics, aspect)) filledAi.push(aspect);
  }

  const stillMissing = missing.filter((a) => !hasKey(specifics, a));
  const filledAspects = [...new Set([...filledLocal, ...filledAi])];

  console.info("[fill-aspects]", {
    title: input.title.slice(0, 60),
    missing: missing.length,
    filled: filledAspects.length,
    stillMissing,
  });

  return { itemSpecifics: specifics, filledAspects, stillMissing };
}
