/**
 * Normalise une URL collée par l’utilisateur (souvent sans https://).
 * Ex. `amazon.fr/dp/B0…` → `https://www.amazon.fr/dp/B0…`
 */
export function coerceImportUrl(raw: string): string {
  let s = String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!s) return s;

  // Guillemets / markdown
  s = s.replace(/^['"`«»]+|['"`«»]+$/g, "").trim();
  // Préfixe collé par erreur
  s = s.replace(/^(?:url\s*[:=]\s*|lien\s*[:=]\s*)/i, "").trim();

  // Si du texte autour, extraire le premier lien amazon/ebay/utopya
  const embedded = s.match(
    /(?:https?:\/\/)?(?:www\.)?(?:amazon\.(?:fr|com|de|co\.uk|it|es|ca)|ebay\.(?:fr|com|de|co\.uk|it|es)|utopya\.fr)[^\s"'<>]*/i,
  );
  if (embedded?.[0]) {
    s = embedded[0];
  }

  // Espaces accidentels (collage multi-lignes)
  s = s.replace(/\s+/g, "");

  if (s.startsWith("//")) {
    s = `https:${s}`;
  } else if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    s = `https://${s}`;
  }

  try {
    const u = new URL(s);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");

    if (/^amazon\.(fr|com|de|co\.uk|it|es|ca)$/i.test(host)) {
      u.hostname = `www.${host}`;
      const asin =
        u.pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i)?.[1] ||
        u.searchParams.get("asin");
      if (asin) {
        return `https://www.${host}/dp/${asin.toUpperCase()}`;
      }
    }

    if (/^ebay\.(fr|com|de|co\.uk|it|es)$/i.test(host)) {
      u.hostname = `www.${host}`;
      const itemId = u.pathname.match(/\/itm\/(?:[^/]+\/)?(\d{9,16})/i)?.[1];
      if (itemId) {
        return `https://www.${host}/itm/${itemId}`;
      }
    }

    if (/^utopya\.fr$/i.test(host)) {
      u.hostname = host;
    }

    u.hash = "";
    return u.toString();
  } catch {
    return s;
  }
}
