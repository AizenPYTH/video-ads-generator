/**
 * Mapping condition Trading API (1000…) → Inventory API enum.
 */
const CONDITION_BY_ID: Record<string, string> = {
  "1000": "NEW",
  "1500": "NEW_OTHER",
  "1750": "NEW_WITH_DEFECTS",
  "2000": "CERTIFIED_REFURBISHED",
  "2010": "EXCELLENT_REFURBISHED",
  "2020": "VERY_GOOD_REFURBISHED",
  "2030": "GOOD_REFURBISHED",
  "2500": "SELLER_REFURBISHED",
  "2750": "LIKE_NEW",
  "3000": "USED_EXCELLENT",
  "4000": "USED_VERY_GOOD",
  "5000": "USED_GOOD",
  "6000": "USED_ACCEPTABLE",
  "7000": "FOR_PARTS_OR_NOT_WORKING",
};

const CONDITION_ENUMS = new Set(Object.values(CONDITION_BY_ID));

export function toEbayInventoryCondition(raw: string | null | undefined): string {
  const value = (raw ?? "").trim();
  if (!value) return "NEW";

  const upper = value.toUpperCase().replace(/\s+/g, "_");
  if (CONDITION_ENUMS.has(upper)) return upper;

  if (CONDITION_BY_ID[value]) return CONDITION_BY_ID[value];

  // Heuristique texte FR
  const lower = value.toLowerCase();
  if (/neuf|new/.test(lower)) return "NEW";
  if (/reconditionn|refurb/.test(lower)) return "SELLER_REFURBISHED";
  if (/comme neuf|like.?new/.test(lower)) return "LIKE_NEW";
  if (/tr[eè]s bon|very.?good/.test(lower)) return "USED_VERY_GOOD";
  if (/bon [eé]tat|good/.test(lower)) return "USED_GOOD";
  if (/acceptable/.test(lower)) return "USED_ACCEPTABLE";
  if (/pour pi[eè]ces|parts/.test(lower)) return "FOR_PARTS_OR_NOT_WORKING";
  if (/occasion|used/.test(lower)) return "USED_EXCELLENT";

  return "NEW";
}
