/**
 * Normalise un prix FR/EN en nombre > 0, sinon null.
 * Accepte : 12 | 12,00 | 12.00 | 12,50 € | 1 249,90 € | €12.50
 */
export function parseFrenchPrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  let text = String(raw).trim();
  if (!text) return null;

  text = text
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[€$£]/g, "")
    .replace(/\s*(?:EUR|USD|GBP)\s*/gi, "")
    .trim();

  // Garder chiffres, séparateurs, signe
  text = text.replace(/[^\d,.\-]/g, "");
  if (!text || text === "-" || text === "." || text === ",") return null;

  // 1 249,90 ou 1.249,90 → enlever séparateurs de milliers
  if (/\d{1,3}([.\s]\d{3})+(,\d+)?$/.test(text)) {
    text = text.replace(/[.\s]/g, "").replace(",", ".");
  } else if (/\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
    // 1,249.90
    text = text.replace(/,/g, "");
  } else if (text.includes(",") && text.includes(".")) {
    // Ambigu : dernier séparateur = décimal
    const lastComma = text.lastIndexOf(",");
    const lastDot = text.lastIndexOf(".");
    if (lastComma > lastDot) {
      text = text.replace(/\./g, "").replace(",", ".");
    } else {
      text = text.replace(/,/g, "");
    }
  } else if (text.includes(",")) {
    text = text.replace(",", ".");
  }

  const n = Number.parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Prix catalogue pièces détachées : plafond raisonnable
  if (n > 1_000_000) return null;
  return Math.round(n * 100) / 100;
}

/** Stockage DB / eBay : "12.50" ou null (jamais "0"). */
export function formatPriceForStorage(raw: unknown): string | null {
  const n = parseFrenchPrice(raw);
  if (n == null) return null;
  return n.toFixed(2);
}

export const PRICE_NOT_DETECTED_MESSAGE =
  "Prix non détecté — saisie manuelle requise.";
