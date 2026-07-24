/**
 * Mapping colonnes Utopia / Magento (FR) → champs Smart Seller / eBay item specifics.
 * Ne invente aucune valeur : lit uniquement le fichier.
 */

export type UtopiaMappedField =
  | "titre"
  | "description"
  | "prix_vente"
  | "prix_achat"
  | "quantite"
  | "sku"
  | "ean"
  | "photo_url"
  | "brand"
  | "manufacturer"
  | "mpn"
  | "model"
  | "product_type"
  | "type"
  | "color"
  | "material"
  | "compatible_brand"
  | "compatible_device"
  | "compatible_model"
  | "ebay_condition_id"
  | "condition_description"
  | "category_name"
  | "ebay_category_id"
  | "item_specifics";

/** Alias d’en-têtes Utopia / FR → clé interne (après normalizeHeader sans accents). */
export const UTOPYA_HEADER_ALIASES: Record<string, UtopiaMappedField> = {
  // Titre / description
  nom: "titre",
  "nom du produit": "titre",
  "nom produit": "titre",
  productname: "titre",
  "product name": "titre",
  name: "titre",
  designation: "titre",
  "short description": "description",
  "description courte": "description",
  "description longue": "description",
  "long description": "description",

  // Prix / stock
  prix: "prix_vente",
  "prix de vente": "prix_vente",
  "prix ttc": "prix_vente",
  "prix ht": "prix_achat",
  "prix d achat": "prix_achat",
  "prix achat": "prix_achat",
  "special price": "prix_vente",
  stock: "quantite",
  qty: "quantite",
  quantite: "quantite",
  "qte": "quantite",

  // Identifiants
  "code article": "sku",
  "code produit": "sku",
  reference: "sku",
  "reference interne": "sku",
  "ref interne": "sku",
  "ref.": "sku",
  "ref": "sku",
  "sku utopya": "sku",
  "sku utopia": "sku",
  barcode: "ean",
  "code barre": "ean",
  "code-barres": "ean",
  gtin: "ean",

  // Images
  image: "photo_url",
  "image url": "photo_url",
  "url image": "photo_url",
  "lien image": "photo_url",
  "photo": "photo_url",
  "base image": "photo_url",
  thumbnail: "photo_url",

  // Marque / fabricant
  marque: "brand",
  "marque produit": "brand",
  "brand name": "brand",
  fabricant: "manufacturer",
  manufacturer: "manufacturer",

  // Modèle / MPN / type
  modele: "model",
  "modele produit": "model",
  "model name": "model",
  mpn: "mpn",
  "reference fabricant": "mpn",
  "ref fabricant": "mpn",
  "reference constructeur": "mpn",
  "numero de piece fabricant": "mpn",
  "part number": "mpn",
  "manufacturer part number": "mpn",
  "type de produit": "product_type",
  "type produit": "product_type",
  "product type": "product_type",
  categorie: "category_name",
  "nom categorie": "category_name",
  "category": "category_name",
  type: "type",
  "sold item name": "type",

  // Couleur / matière
  couleur: "color",
  color: "color",
  colour: "color",
  matiere: "material",
  materiau: "material",
  material: "material",

  // Compatibilité (pièces détachées)
  "marque compatible": "compatible_brand",
  "compatible brand": "compatible_brand",
  compatibilite: "compatible_device",
  "compatibilite modele": "compatible_device",
  "modele compatible": "compatible_device",
  "appareil compatible": "compatible_device",
  "compatible device": "compatible_device",
  "compatible model": "compatible_model",
  "compatible model number": "compatible_model",
  "reference compatible": "compatible_model",
  "ref compatible": "compatible_model",
  "numero de modele compatible": "compatible_model",

  // État
  etat: "ebay_condition_id",
  "etat du produit": "ebay_condition_id",
  condition: "ebay_condition_id",
  "condition id": "ebay_condition_id",
  "description etat": "condition_description",
  "condition description": "condition_description",
};

/** Noms eBay FR des item specifics générés depuis les champs Utopia. */
export const UTOPYA_TO_EBAY_ASPECTS: Array<{
  utopiaField: UtopiaMappedField;
  ebayKeys: string[];
}> = [
  { utopiaField: "brand", ebayKeys: ["Brand", "Marque"] },
  { utopiaField: "manufacturer", ebayKeys: ["Manufacturer", "Fabricant"] },
  { utopiaField: "mpn", ebayKeys: ["MPN", "Numéro de pièce fabricant"] },
  { utopiaField: "model", ebayKeys: ["Model", "Modèle"] },
  {
    utopiaField: "type",
    ebayKeys: ["Type", "Product Type", "Type de produit"],
  },
  {
    utopiaField: "product_type",
    ebayKeys: ["Type", "Product Type", "Type de produit"],
  },
  { utopiaField: "color", ebayKeys: ["Color", "Couleur"] },
  { utopiaField: "material", ebayKeys: ["Material", "Matière"] },
  {
    utopiaField: "compatible_brand",
    ebayKeys: ["Compatible Brand", "Marque compatible"],
  },
  {
    utopiaField: "compatible_device",
    ebayKeys: ["Compatible Device", "Appareil compatible", "Modèle compatible"],
  },
  {
    utopiaField: "compatible_model",
    ebayKeys: [
      "Compatible Model Number",
      "Numéro de modèle compatible",
      "Référence compatible",
    ],
  },
];

/** Colonnes internes à ne pas recopier telles quelles dans item_specifics. */
export const IMPORT_INTERNAL_KEYS = new Set([
  "action",
  "titre",
  "title",
  "subtitle",
  "description",
  "prix_achat",
  "prix_vente",
  "quantite",
  "sku",
  "ean",
  "ebay_category_id",
  "category_name",
  "ebay_condition_id",
  "condition_description",
  "photo_url",
  "format",
  "duration",
  "location",
  "country",
  "postal_code",
  "shipping_profile",
  "return_profile",
  "payment_profile",
  "brand",
  "manufacturer",
  "mpn",
  "model",
  "product_type",
  "sold_item_name",
  "compatible_brand",
  "compatible_device",
  "compatible_model",
  "color",
  "material",
  "type",
  "unit_quantity",
  "unit_type",
  "notes",
  "item_specifics",
  "category_query_parts",
  "category_resolution",
]);

/** Libellé lisible pour une clé brute de fichier. */
export function humanizeImportKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
