/** Colonnes modèle import eBay France (Smart Seller) — Category ID facultatif. */

export const EBAY_FR_COLUMNS = [
  "Action",
  "Custom label (SKU)",
  "Category ID",
  "Category Name",
  "Title",
  "Subtitle",
  "P:EAN",
  "Start price",
  "Quantity",
  "Item photo URL",
  "Condition ID",
  "Condition description",
  "Description",
  "Format",
  "Duration",
  "Location",
  "Country",
  "Postal code",
  "Shipping profile name",
  "Return profile name",
  "Payment profile name",
  "Brand",
  "Manufacturer",
  "MPN",
  "Model",
  "Product type",
  "Sold item name",
  "Compatible brand",
  "Compatible device",
  "Compatible model number",
  "Color",
  "Material",
  "Type",
  "Unit quantity",
  "Unit type",
  "Item specifics",
] as const;

export type EbayFrColumn = (typeof EBAY_FR_COLUMNS)[number];

/** Colonnes obligatoires côté fichier (Category ID volontairement exclu). */
export const REQUIRED_EBAY_COLUMNS = ["Title", "Start price"] as const;

export const REQUIRED_COLUMN_LABELS = [
  { key: "Title", label: "Title — titre de l'annonce (max 80 caractères)" },
  { key: "Start price", label: "Start price — prix de vente (> 0)" },
  {
    key: "Custom label (SKU)",
    label: "Custom label (SKU) — recommandé pour le suivi",
  },
] as const;

/** Mapping en-tête fichier (normalisé) → clé interne. */
export const HEADER_ALIASES: Record<string, string> = {
  // eBay FR
  action: "action",
  "custom label (sku)": "sku",
  "custom label": "sku",
  sku: "sku",
  "category id": "ebay_category_id",
  categoryid: "ebay_category_id",
  "category name": "category_name",
  categoryname: "category_name",
  title: "titre",
  titre: "titre",
  subtitle: "subtitle",
  "p:ean": "ean",
  ean: "ean",
  "start price": "prix_vente",
  prix_vente: "prix_vente",
  price: "prix_vente",
  quantity: "quantite",
  quantite: "quantite",
  "item photo url": "photo_url",
  "condition id": "ebay_condition_id",
  conditionid: "ebay_condition_id",
  ebay_condition_id: "ebay_condition_id",
  "condition description": "condition_description",
  description: "description",
  format: "format",
  duration: "duration",
  location: "location",
  country: "country",
  "postal code": "postal_code",
  "shipping profile name": "shipping_profile",
  "return profile name": "return_profile",
  "payment profile name": "payment_profile",
  brand: "brand",
  manufacturer: "manufacturer",
  mpn: "mpn",
  model: "model",
  "product type": "product_type",
  "sold item name": "sold_item_name",
  "compatible brand": "compatible_brand",
  "compatible device": "compatible_device",
  "compatible model number": "compatible_model",
  color: "color",
  material: "material",
  type: "type",
  "unit quantity": "unit_quantity",
  "unit type": "unit_type",
  "item specifics": "item_specifics",
  item_specifics: "item_specifics",
  // legacy snowolf
  ebay_category_id: "ebay_category_id",
  prix_achat: "prix_achat",
  notes: "notes",
};

export function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapHeader(header: string): string | null {
  const key = normalizeHeader(header);
  return HEADER_ALIASES[key] ?? null;
}

export const DROPDOWN_ACTIONS = ["Add", "Revise", "Relist", "End"] as const;
export const DROPDOWN_FORMATS = ["FixedPrice", "Auction"] as const;
export const DROPDOWN_DURATIONS = ["GTC", "Days_3", "Days_5", "Days_7", "Days_10"] as const;
export const DROPDOWN_COUNTRIES = ["FR", "BE", "CH", "LU", "DE", "ES", "IT"] as const;
export const DROPDOWN_CONDITIONS = [
  { id: "1000", label: "1000 — Neuf" },
  { id: "1500", label: "1500 — Neuf avec défauts" },
  { id: "2000", label: "2000 — Reconditionné" },
  { id: "3000", label: "3000 — Occasion" },
  { id: "7000", label: "7000 — Pour pièces" },
] as const;

export const COLUMN_INSTRUCTIONS: Array<{ column: string; text: string }> = [
  { column: "Action", text: "Add = créer, Revise = modifier, Relist = remetre en vente, End = terminer." },
  { column: "Custom label (SKU)", text: "Référence vendeur unique. Conservez les zéros (texte)." },
  { column: "Category ID", text: "Facultatif. Si vide, Smart Seller détecte la catégorie via eBay Taxonomy (EBAY_FR)." },
  { column: "Category Name", text: "Nom de catégorie indicatif pour aider la détection automatique." },
  { column: "Title", text: "Titre eBay, max 80 caractères. Obligatoire." },
  { column: "Start price", text: "Prix de vente en euros. Obligatoire, > 0." },
  { column: "Quantity", text: "Quantité disponible (défaut 1)." },
  { column: "Item photo URL", text: "URL publique d'image. Laisser vide si aucune URL réelle." },
  { column: "Condition ID", text: "1000 Neuf, 1500 Neuf défauts, 2000 Reconditionné, 3000 Occasion, 7000 Pièces." },
  { column: "Description", text: "Description HTML ou texte de l'annonce." },
  { column: "Item specifics", text: "Format Brand=Apple|MPN=xxx|Model=yyy. Fusionné avec les colonnes dédiées (priorité aux colonnes)." },
  { column: "Postal code", text: "Code postal en texte pour conserver les zéros (ex. 01000)." },
  { column: "P:EAN", text: "Code EAN/GTIN en texte pour conserver les zéros." },
  { column: "MPN", text: "Référence fabricant. Texte forcé." },
];
