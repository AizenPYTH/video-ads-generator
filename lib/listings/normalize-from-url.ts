const EBAY_TITLE_MAX = 80;

const AMAZON_TITLE_NOISE =
  /\s*[:|]\s*Amazon\.(?:fr|com|de|co\.uk|it|es).*$/i;

const MARKETING_NOISE =
  /\s*[✓✔]\s*Livraison.*$/i;

const CONDITION_MAP: Record<string, string> = {
  new: "1000",
  neuf: "1000",
  "https://schema.org/newcondition": "1000",
  "http://schema.org/newcondition": "1000",
  used: "3000",
  occasion: "3000",
  "https://schema.org/usedcondition": "3000",
  refurbished: "2000",
  reconditionné: "2000",
  "https://schema.org/refurbishedcondition": "2000",
  damaged: "7000",
  "for parts": "7000",
};

/** Titre eBay propre, max 80 caractères, sans suffixes marketplace. */
export function buildEbayTitle(rawTitle: string, brand?: string | null): string {
  let title = rawTitle
    .replace(AMAZON_TITLE_NOISE, "")
    .replace(MARKETING_NOISE, "")
    .replace(/\s*\|\s*eBay\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Marque générique / bruit : ne pas préfixer ni stripper
  const usableBrand =
    brand &&
    brand.trim().length >= 2 &&
    brand.trim().length <= 40 &&
    !/^[-–—]/.test(brand.trim()) &&
    !/sans\s*marque|g[eé]n[eé]rique|unbranded|n\/?a/i.test(brand)
      ? brand.trim()
      : null;

  if (usableBrand) {
    try {
      const brandRe = new RegExp(`^(${escapeRegex(usableBrand)}\\s+)+`, "i");
      title = title.replace(brandRe, `${usableBrand} `).trim();
    } catch {
      /* ignore invalid brand regex */
    }
  }

  if (!title || /^produit\s*ebay$/i.test(title)) {
    return "Produit importé eBay";
  }

  if (title.length <= EBAY_TITLE_MAX) return title;

  const sliced = title.slice(0, EBAY_TITLE_MAX);
  const lastSpace = sliced.lastIndexOf(" ");
  if (lastSpace > 40) {
    return sliced.slice(0, lastSpace).trim();
  }
  return sliced.trim();
}

/** Description utilisable, sans slogans Amazon ni répétitions. */
export function buildEbayDescription(
  rawDescription: string | null,
  title: string,
): string {
  if (!rawDescription?.trim()) {
    return "Produit importé — complétez les caractéristiques avant publication.";
  }

  let description = rawDescription
    .replace(AMAZON_TITLE_NOISE, "")
    .replace(MARKETING_NOISE, "")
    .replace(/\r\n/g, "\n")
    .trim();

  description = dedupeDescriptionText(description, title);

  if (description.length < 20) {
    return "Produit importé — complétez les caractéristiques avant publication.";
  }

  return description.slice(0, 4000);
}

/** Supprime titres répétés et paragraphes identiques consécutifs. */
export function dedupeDescriptionText(
  text: string,
  title?: string | null,
): string {
  let cleaned = text.replace(/\s+/g, " ").trim();

  if (title?.trim()) {
    const t = title.trim();
    // Retire le titre s'il préfixe plusieurs fois
    const titleRe = new RegExp(
      `^(?:${escapeRegex(t)}\\s*)+`,
      "i",
    );
    cleaned = cleaned.replace(titleRe, "").trim();
    cleaned = cleaned.replace(new RegExp(escapeRegex(t), "gi"), "").trim();
  }

  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const unique: string[] = [];
  for (const p of paragraphs) {
    const prev = unique[unique.length - 1];
    if (prev && normalizeParagraph(prev) === normalizeParagraph(p)) continue;
    if (unique.some((u) => normalizeParagraph(u) === normalizeParagraph(p))) {
      continue;
    }
    unique.push(p);
  }

  // Si tout a été collé en une ligne, découper phrases dupliquées
  if (unique.length <= 1 && cleaned.includes(". ")) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const out: string[] = [];
    for (const s of sentences) {
      if (out.some((u) => normalizeParagraph(u) === normalizeParagraph(s))) {
        continue;
      }
      out.push(s);
    }
    return out.join(" ").trim();
  }

  return unique.join("\n\n").trim();
}

function normalizeParagraph(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function mapEbayConditionId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const key = raw.trim().toLowerCase().replace(/\/$/, "");
  if (CONDITION_MAP[key]) return CONDITION_MAP[key];
  if (key.includes("newcondition") || key === "new") return "1000";
  if (key.includes("usedcondition") || key === "used") return "3000";
  if (key.includes("refurbished")) return "2000";
  if (key.includes("damaged") || key.includes("forparts")) return "7000";
  return null;
}

/** SKU stable : ASIN Amazon, sinon sku scrapé, sinon slug du titre. */
export function buildSku(options: {
  scrapedSku?: string | null;
  sourceUrl?: string | null;
  title: string;
}): string {
  const asin = extractAmazonAsin(options.sourceUrl ?? "");
  if (asin) return asin;

  if (options.scrapedSku?.trim()) {
    return options.scrapedSku.trim().slice(0, 50);
  }

  const slug = options.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);

  return `SW-${slug || "ITEM"}-${Date.now().toString(36).toUpperCase()}`;
}

export function extractAmazonAsin(url: string): string | null {
  const match = url.match(
    /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i,
  );
  return match?.[1]?.toUpperCase() ?? null;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
