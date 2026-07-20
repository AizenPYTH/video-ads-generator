/**
 * Validation sémantique catégorie eBay :
 * type vendu → cohérence chemin → pénalités contradiction → confiance recalculée.
 */

export type SoldItemTypeId =
  | "battery"
  | "screen"
  | "keyboard"
  | "trackpad"
  | "logic_board"
  | "connector"
  | "flex_cable"
  | "charger"
  | "fan"
  | "case"
  | "cable"
  | "headphones"
  | "earbuds"
  | "phone"
  | "laptop"
  | "other";

export type SoldItemType = {
  id: SoldItemTypeId;
  labelFr: string;
  labelEn: string;
};

export type SemanticScoreResult = {
  score: number;
  rejected: boolean;
  rejectReason?: string;
  typeMatch: boolean;
  brandModelMatch: boolean;
  compatibilityMatch: boolean;
  pathCoherent: boolean;
  hasContradiction: boolean;
};

const TYPES: Record<
  SoldItemTypeId,
  {
    labelFr: string;
    labelEn: string;
    titleNeedles: string[];
    categoryNeedles: string[];
    /** Mots dans le chemin catégorie = contradiction dure */
    contradictions: string[];
  }
> = {
  battery: {
    labelFr: "batterie",
    labelEn: "battery",
    titleNeedles: [
      "batterie",
      "battery",
      "akkku",
      "akku",
      "li-ion",
      "lithium",
      "020-",
    ],
    categoryNeedles: [
      "batterie",
      "battery",
      "batteries",
      "accumulateur",
      "pile",
    ],
    contradictions: [
      "repose-poignet",
      "repose poignet",
      "pavé tactile",
      "pave tactile",
      "trackpad",
      "touchpad",
      "clavier",
      "keyboard",
      "écran",
      "ecran",
      "lcd",
      "display",
      "carte mère",
      "carte mere",
      "logic board",
      "motherboard",
      "coque",
      "housse",
      "étui",
      "etui",
      "case",
      "ventilateur",
      "fan",
      "câble",
      "cable",
      "nappe",
      "flex",
      "chargeur",
      "charger",
      "alimentation",
      "power adapter",
      "adapter",
      "casque",
      "headphone",
    ],
  },
  screen: {
    labelFr: "écran",
    labelEn: "screen",
    titleNeedles: [
      "écran",
      "ecran",
      "lcd",
      "oled",
      "display",
      "retina",
      "assemblage écran",
      "screen assembly",
    ],
    categoryNeedles: ["écran", "ecran", "lcd", "display", "écran d", "moniteur"],
    contradictions: [
      "batterie",
      "battery",
      "trackpad",
      "pavé tactile",
      "pave tactile",
      "clavier",
      "keyboard",
      "carte mère",
      "carte mere",
      "logic board",
      "chargeur",
      "charger",
      "repose-poignet",
      "ventilateur",
      "coque",
    ],
  },
  keyboard: {
    labelFr: "clavier",
    labelEn: "keyboard",
    titleNeedles: ["clavier", "keyboard", "keycap"],
    categoryNeedles: ["clavier", "keyboard"],
    contradictions: [
      "batterie",
      "battery",
      "écran",
      "ecran",
      "lcd",
      "trackpad",
      "pavé tactile",
      "pave tactile",
      "carte mère",
      "carte mere",
      "cartes mères",
      "cartes meres",
      "logic board",
      "motherboard",
      "chargeur",
      "charger",
      "repose-poignet",
    ],
  },
  trackpad: {
    labelFr: "trackpad",
    labelEn: "trackpad",
    titleNeedles: [
      "trackpad",
      "touchpad",
      "pavé tactile",
      "pave tactile",
      "repose-poignet",
      "palm rest",
    ],
    categoryNeedles: [
      "trackpad",
      "touchpad",
      "pavé tactile",
      "pave tactile",
      "repose-poignet",
      "repose poignet",
    ],
    contradictions: [
      "batterie",
      "battery",
      "écran",
      "ecran",
      "lcd",
      "clavier",
      "keyboard",
      "carte mère",
      "carte mere",
      "logic board",
      "chargeur",
      "charger",
    ],
  },
  logic_board: {
    labelFr: "carte mère",
    labelEn: "logic board",
    titleNeedles: [
      "carte mère",
      "carte mere",
      "logic board",
      "motherboard",
      "mainboard",
      "carte logique",
    ],
    categoryNeedles: [
      "carte mère",
      "carte mere",
      "logic board",
      "motherboard",
      "carte mère",
      "cartes mères",
    ],
    contradictions: [
      "batterie",
      "battery",
      "écran",
      "ecran",
      "clavier",
      "keyboard",
      "trackpad",
      "pavé tactile",
      "chargeur",
      "charger",
      "repose-poignet",
    ],
  },
  connector: {
    labelFr: "connecteur",
    labelEn: "connector",
    titleNeedles: [
      "connecteur de charge",
      "connecteur",
      "dc-in",
      "magsafe board",
      "jack board",
      "i/o board",
      "usb-c board",
    ],
    categoryNeedles: ["connecteur", "connector", "prise", "jack", "port"],
    contradictions: [
      "chargeur",
      "charger",
      "alimentation",
      "power adapter",
      "adaptateur secteur",
      "batterie",
      "battery",
      "écran",
      "ecran",
      "clavier",
      "keyboard",
      "trackpad",
    ],
  },
  flex_cable: {
    labelFr: "nappe",
    labelEn: "flex cable",
    titleNeedles: ["nappe", "flex cable", "cable flex", "câble flex"],
    categoryNeedles: ["nappe", "flex", "câble", "cable"],
    contradictions: [
      "batterie",
      "battery",
      "écran",
      "ecran",
      "clavier",
      "trackpad",
      "carte mère",
      "chargeur",
      "charger",
    ],
  },
  charger: {
    labelFr: "chargeur",
    labelEn: "charger",
    titleNeedles: [
      "chargeur",
      "charger",
      "power adapter",
      "alimentation",
      "adaptateur secteur",
      "magsafe",
    ],
    categoryNeedles: [
      "chargeur",
      "charger",
      "alimentation",
      "adaptateur",
      "power adapter",
      "ac adapter",
    ],
    contradictions: [
      "batterie",
      "battery",
      "connecteur de charge",
      "écran",
      "ecran",
      "clavier",
      "trackpad",
      "carte mère",
      "repose-poignet",
      "pavé tactile",
    ],
  },
  fan: {
    labelFr: "ventilateur",
    labelEn: "fan",
    titleNeedles: ["ventilateur", "cooling fan", "fan "],
    categoryNeedles: ["ventilateur", "fan", "refroidissement"],
    contradictions: [
      "batterie",
      "battery",
      "écran",
      "clavier",
      "trackpad",
      "chargeur",
    ],
  },
  case: {
    labelFr: "coque",
    labelEn: "case",
    titleNeedles: ["coque", "housse", "étui", "etui", "case", "cover"],
    categoryNeedles: ["coque", "housse", "étui", "etui", "case", "cover"],
    contradictions: [
      "batterie",
      "battery",
      "écran",
      "clavier",
      "trackpad",
      "carte mère",
      "téléphone portable",
      "smartphone",
    ],
  },
  cable: {
    labelFr: "câble",
    labelEn: "cable",
    titleNeedles: ["câble", "cable", "lightning cable", "usb-c cable"],
    categoryNeedles: ["câble", "cable", "cordon"],
    contradictions: ["batterie", "battery", "chargeur", "écran", "clavier"],
  },
  headphones: {
    labelFr: "casque",
    labelEn: "headphones",
    titleNeedles: ["casque", "headphone", "headset"],
    categoryNeedles: ["casque", "headphone", "headset"],
    contradictions: [
      "écouteur",
      "ecouteur",
      "earbud",
      "batterie",
      "battery",
      "trackpad",
      "clavier",
    ],
  },
  earbuds: {
    labelFr: "écouteurs",
    labelEn: "earbuds",
    titleNeedles: ["écouteur", "ecouteur", "earbud", "airpods", "intra"],
    categoryNeedles: ["écouteur", "ecouteur", "earbud", "oreille"],
    contradictions: ["casque", "headphone", "batterie", "trackpad"],
  },
  phone: {
    labelFr: "téléphone",
    labelEn: "phone",
    titleNeedles: ["iphone", "smartphone", "téléphone", "telephone", "galaxy"],
    categoryNeedles: ["téléphone", "telephone", "smartphone", "mobile"],
    contradictions: ["coque", "housse", "étui", "etui", "case", "batterie"],
  },
  laptop: {
    labelFr: "ordinateur portable",
    labelEn: "laptop",
    titleNeedles: [
      "ordinateur portable complet",
      "laptop complet",
      "macbook pro 15 pouces",
    ],
    categoryNeedles: [
      "ordinateur portable",
      "laptop",
      "notebook",
      "pc portable",
    ],
    contradictions: [
      "batterie",
      "battery",
      "pièce",
      "piece",
      "rechange",
      "trackpad",
      "clavier",
      "écran",
      "ecran",
    ],
  },
  other: {
    labelFr: "autre",
    labelEn: "other",
    titleNeedles: [],
    categoryNeedles: [],
    contradictions: [],
  },
};

/** Priorité de détection (plus spécifique d'abord). */
const DETECTION_ORDER: SoldItemTypeId[] = [
  "connector",
  "flex_cable",
  "trackpad",
  "logic_board",
  "battery",
  "screen",
  "keyboard",
  "charger",
  "fan",
  "case",
  "cable",
  "headphones",
  "earbuds",
  "phone",
  "laptop",
];

export function normalizeSemantic(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(normalizeSemantic(n)));
}

/**
 * Extrait le type vendu principal depuis titre / type / catégorie IA.
 * Ex. "Batterie MacBook Pro A1707" → battery
 */
export function detectSoldItemType(input: {
  title?: string | null;
  productType?: string | null;
  categoryHint?: string | null;
  soldItemType?: string | null;
  description?: string | null;
}): SoldItemType {
  const blob = normalizeSemantic(
    [
      input.soldItemType,
      input.productType,
      input.title,
      input.categoryHint,
      input.description,
    ]
      .filter(Boolean)
      .join(" "),
  );

  // Règles explicites FR/EN courtes
  const explicit: Array<{ id: SoldItemTypeId; re: RegExp }> = [
    { id: "battery", re: /\b(batterie|battery|akk?u)\b/ },
    { id: "screen", re: /\b(ecran|écran|lcd|oled|display|retina)\b/ },
    { id: "keyboard", re: /\b(clavier|keyboard)\b/ },
    {
      id: "trackpad",
      re: /\b(trackpad|touchpad|pave tactile|pavé tactile|repose[- ]?poignet)\b/,
    },
    {
      id: "logic_board",
      re: /\b(carte mere|carte mère|logic board|motherboard|mainboard)\b/,
    },
    {
      id: "connector",
      re: /\b(connecteur( de charge)?|dc[- ]?in|i\/o board|usb-c board)\b/,
    },
    { id: "flex_cable", re: /\b(nappe|flex cable|cable flex)\b/ },
    {
      id: "charger",
      re: /\b(chargeur|power adapter|adaptateur secteur|alimentation)\b/,
    },
    { id: "fan", re: /\b(ventilateur|cooling fan)\b/ },
    { id: "headphones", re: /\b(casque|headphone|headset)\b/ },
    { id: "earbuds", re: /\b(ecouteur|écouteur|earbud|airpods)\b/ },
  ];

  for (const rule of explicit) {
    if (rule.re.test(blob)) {
      const t = TYPES[rule.id];
      return { id: rule.id, labelFr: t.labelFr, labelEn: t.labelEn };
    }
  }

  for (const id of DETECTION_ORDER) {
    const t = TYPES[id];
    if (t.titleNeedles.length && includesAny(blob, t.titleNeedles)) {
      return { id, labelFr: t.labelFr, labelEn: t.labelEn };
    }
  }

  return {
    id: "other",
    labelFr: TYPES.other.labelFr,
    labelEn: TYPES.other.labelEn,
  };
}

export function pathHasContradiction(
  soldType: SoldItemTypeId,
  categoryPath: string[],
  categoryName: string,
): { contradicted: boolean; matched?: string } {
  if (soldType === "other") return { contradicted: false };
  const pathNorm = normalizeSemantic([...categoryPath, categoryName].join(" "));
  for (const needle of TYPES[soldType].contradictions) {
    const n = normalizeSemantic(needle);
    if (n && pathNorm.includes(n)) {
      return { contradicted: true, matched: needle };
    }
  }
  return { contradicted: false };
}

export function pathMatchesSoldType(
  soldType: SoldItemTypeId,
  categoryPath: string[],
  categoryName: string,
): boolean {
  if (soldType === "other") return false;
  const pathNorm = normalizeSemantic([...categoryPath, categoryName].join(" "));
  return includesAny(pathNorm, TYPES[soldType].categoryNeedles);
}

/**
 * Score sémantique 0–1 + rejet dur si contradiction.
 * Ne jamais confondre rang Taxonomy avec confiance réelle.
 */
export function scoreCategorySemantics(input: {
  soldType: SoldItemType;
  categoryName: string;
  categoryPath: string[];
  rootCategoryName?: string | null;
  preferredRoot?: string | null;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  /** Rang Taxonomy 0 = top (indicatif seulement) */
  taxonomyRank?: number;
  /** Score brut Taxonomy avant sémantique (0–1) */
  taxonomyScore?: number;
}): SemanticScoreResult {
  const { soldType } = input;
  const path = input.categoryPath ?? [];
  const name = input.categoryName ?? "";
  const pathNorm = normalizeSemantic([...path, name].join(" "));
  const titleNorm = normalizeSemantic(input.title ?? "");

  const contradiction = pathHasContradiction(soldType.id, path, name);
  if (contradiction.contradicted) {
    return {
      score: 0.05,
      rejected: true,
      rejectReason: `Contradiction: type « ${soldType.labelFr} » vs catégorie contenant « ${contradiction.matched} »`,
      typeMatch: false,
      brandModelMatch: false,
      compatibilityMatch: false,
      pathCoherent: false,
      hasContradiction: true,
    };
  }

  const typeMatch = pathMatchesSoldType(soldType.id, path, name);

  const brand = normalizeSemantic(input.brand ?? "");
  const model = normalizeSemantic(input.model ?? "");
  const brandModelMatch = Boolean(
    (brand && (pathNorm.includes(brand) || titleNorm.includes(brand))) ||
      (model &&
        model.length >= 3 &&
        (pathNorm.includes(model) || titleNorm.includes(model))),
  );

  const compatibilityMatch =
    /\b(macbook|iphone|ipad|laptop|ordinateur|apple|sony|samsung)\b/.test(
      titleNorm,
    ) &&
    (/\b(macbook|iphone|ipad|portable|ordinateur|apple|pc)\b/.test(pathNorm) ||
      typeMatch);

  const preferredOk = Boolean(
    input.preferredRoot &&
      (input.rootCategoryName === input.preferredRoot ||
        path.some((p) => p === input.preferredRoot)),
  );

  const pathCoherent = typeMatch || (soldType.id === "other" && preferredOk);

  // Base modeste depuis Taxonomy (rang), pas 0.99
  const rank = input.taxonomyRank ?? 5;
  let score = Math.max(0.15, 0.55 - rank * 0.05);
  if (typeof input.taxonomyScore === "number") {
    score = Math.min(0.55, Math.max(0.15, input.taxonomyScore * 0.45));
  }

  if (typeMatch) score += 0.32;
  else if (soldType.id !== "other") score -= 0.18;

  if (brandModelMatch) score += 0.08;
  if (compatibilityMatch) score += 0.08;
  if (preferredOk) score += 0.06;
  if (pathCoherent && typeMatch) score += 0.05;

  // Pièces / accessoires génériques sans match type
  if (
    !typeMatch &&
    (pathNorm.includes("accessoire") ||
      pathNorm.includes("autre") ||
      pathNorm.includes("piece") ||
      pathNorm.includes("outil"))
  ) {
    score -= 0.15;
  }

  // Ordinateur complet alors que pièce détachée
  if (
    soldType.id !== "laptop" &&
    soldType.id !== "other" &&
    soldType.id !== "phone" &&
    (pathNorm.includes("ordinateur portable") ||
      pathNorm.includes("pc portable") ||
      pathNorm.includes("notebook")) &&
    !pathNorm.includes("piece") &&
    !pathNorm.includes("batterie") &&
    !typeMatch
  ) {
    score -= 0.25;
  }

  score = Math.min(0.94, Math.max(0.05, score));

  return {
    score,
    rejected: false,
    typeMatch,
    brandModelMatch,
    compatibilityMatch,
    pathCoherent,
    hasContradiction: false,
  };
}

/**
 * Requêtes Taxonomy ciblées selon le type vendu.
 */
export function buildSoldTypeSearchQueries(input: {
  soldType: SoldItemType;
  title?: string | null;
  brand?: string | null;
  model?: string | null;
  mpn?: string | null;
}): string[] {
  const brand = input.brand?.trim() ?? "";
  const model = input.model?.trim() ?? "";
  const mpn = input.mpn?.trim() ?? "";
  const title = input.title?.trim() ?? "";
  const type = input.soldType;
  const fr = type.labelFr;
  const en = type.labelEn;

  const queries: string[] = [];

  if (type.id === "battery") {
    queries.push(
      [fr, brand, model].filter(Boolean).join(" "),
      [en, brand, model].filter(Boolean).join(" "),
      "batterie ordinateur portable Apple",
      "laptop battery Apple",
      "internal battery MacBook",
      "batterie MacBook Pro",
      "MacBook Pro 15 battery",
      "batterie interne ordinateur portable",
      [fr, "MacBook", model].filter(Boolean).join(" "),
      [en, "MacBook", model].filter(Boolean).join(" "),
      mpn ? `batterie ${mpn}` : "",
      title.toLowerCase().includes("a1707")
        ? "batterie MacBook Pro A1707"
        : "",
      title.toLowerCase().includes("a1707") ? "MacBook Pro A1707 battery" : "",
    );
  } else if (type.id === "screen") {
    queries.push(
      [fr, brand, model].filter(Boolean).join(" "),
      [en, "MacBook", model].filter(Boolean).join(" "),
      "écran LCD MacBook Pro",
      "LCD screen MacBook Pro",
      "écran ordinateur portable Apple",
    );
  } else if (type.id === "trackpad") {
    queries.push(
      [fr, brand, model].filter(Boolean).join(" "),
      "pavé tactile MacBook",
      "trackpad MacBook Pro",
      "repose-poignets MacBook",
    );
  } else if (type.id === "keyboard") {
    queries.push(
      [fr, brand, model].filter(Boolean).join(" "),
      "clavier MacBook Pro",
      "keyboard MacBook Pro",
    );
  } else if (type.id === "logic_board") {
    queries.push(
      [fr, brand, model].filter(Boolean).join(" "),
      "carte mère MacBook Pro",
      "logic board MacBook Pro",
    );
  } else if (type.id === "charger") {
    queries.push(
      [fr, brand].filter(Boolean).join(" "),
      "chargeur MacBook Pro USB-C",
      "USB-C power adapter Apple",
      "alimentation MacBook",
      "chargeur ordinateur portable Apple",
    );
  } else if (type.id !== "other") {
    queries.push(
      [fr, brand, model].filter(Boolean).join(" "),
      [en, brand, model].filter(Boolean).join(" "),
      [fr, brand].filter(Boolean).join(" "),
    );
  }

  return queries.map((q) => q.trim()).filter((q) => q.length >= 3);
}

export type ConfidenceBand = "high" | "medium" | "review" | "error";

export function confidenceBand(
  confidence: number,
  opts: {
    typeMatch: boolean;
    rejectedAll: boolean;
    closeAlternatives: boolean;
  },
): ConfidenceBand {
  if (opts.rejectedAll) return "error";
  if (opts.closeAlternatives) return "review";
  if (opts.typeMatch && confidence >= 0.78) return "high";
  if (confidence >= 0.55 && (opts.typeMatch || confidence >= 0.65)) {
    return "medium";
  }
  if (confidence < 0.4) return "error";
  return "review";
}

export function messageForBand(band: ConfidenceBand): string | undefined {
  switch (band) {
    case "high":
      return undefined;
    case "medium":
      return "Catégorie générale mais plausible — vérifiez si besoin.";
    case "review":
      return "Plusieurs catégories possibles — vérifiez le choix.";
    case "error":
      return "Aucune catégorie cohérente avec le type de produit.";
  }
}

export function getSoldTypeDefinition(id: SoldItemTypeId) {
  return TYPES[id];
}
