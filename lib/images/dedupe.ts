/**
 * Déduplication d'images produit (URL normalisée + hash contenu + validation).
 */
import { createHash } from "crypto";
import {
  fetchAndValidateImage,
  type ValidatedImage,
} from "@/lib/images/validate";

export type DedupedImage = {
  url: string;
  normalizedKey: string;
  score: number;
  contentHash?: string;
  /** Buffer validé (présent après fetch+validation réussis). */
  buffer?: Buffer;
  contentType?: string;
  width?: number;
  height?: number;
  bytes?: number;
};

const MAX_IMAGES = 6;

/** Retire query/hash et normalise les variantes Amazon (._SXxxx_). */
export function normalizeImageUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return "";

  try {
    const u = new URL(url);
    u.hash = "";
    // Paramètres de tracking inutiles
    for (const key of [...u.searchParams.keys()]) {
      if (
        /^(utm_|fbclid|gclid|ref|pf_rd_|pd_rd_|psc|th|smid)/i.test(key) ||
        key.toLowerCase() === "width" ||
        key.toLowerCase() === "height"
      ) {
        u.searchParams.delete(key);
      }
    }
    url = u.toString();
  } catch {
    url = url.split("#")[0]?.split("?")[0] ?? url;
  }

  // Amazon : garder l'ID média, forcer variante haute rés
  const amazon = url.match(
    /^(https?:\/\/(?:[^/]+\.)?media-amazon\.com\/images\/[IP]\/)([A-Za-z0-9+-]+)/i,
  );
  if (amazon) {
    const base = amazon[1];
    const id = amazon[2].replace(/\._[A-Z0-9,_]+_$/i, "");
    return `${base}${id}._AC_SL1500_.jpg`;
  }

  // Autres CDN : retirer tokens de taille courants
  return url
    .replace(/\._[A-Z]{1,3}\d{2,4}_[A-Z0-9,_]*_\./gi, ".")
    .replace(/\/\d+x\d+\//gi, "/")
    .replace(/([?&])(w|h|width|height)=\d+/gi, "");
}

/** Clé de dédup : ID Amazon ou URL sans query. */
export function imageDedupeKey(raw: string): string {
  const normalized = normalizeImageUrl(raw);
  const amazonId = normalized.match(
    /media-amazon\.com\/images\/[IP]\/([A-Za-z0-9+-]+)/i,
  );
  if (amazonId?.[1]) {
    return `amz:${amazonId[1].replace(/\._[A-Z0-9,_]+_$/i, "").toLowerCase()}`;
  }
  return normalized.toLowerCase().replace(/\/$/, "");
}

/** Score résolution approximatif (tokens URL + ordre source). */
export function imageResolutionScore(url: string, sourceIndex = 0): number {
  let score = 1000 - sourceIndex;
  const sl = url.match(/_SL(\d+)_/i)?.[1];
  const sx = url.match(/_SX(\d+)_/i)?.[1];
  const sy = url.match(/_SY(\d+)_/i)?.[1];
  if (sl) score += Number(sl);
  if (sx) score += Number(sx);
  if (sy) score += Number(sy);
  if (/_AC_SL1500_/i.test(url) || /hiRes|large/i.test(url)) score += 500;
  if (/sprite|grey-pixel|pixel\.gif|1x1|transparent/i.test(url)) score -= 5000;
  if (/_\d{2,3}x\d{2,3}_|\.SS\d{2,3}\.|thumb|thumbnail|mini/i.test(url)) {
    score -= 800;
  }
  return score;
}

/**
 * Déduplique par URL normalisée, max 6, meilleure résolution en premier.
 */
export function dedupeImageUrls(
  urls: string[],
  options?: { max?: number },
): DedupedImage[] {
  const max = options?.max ?? MAX_IMAGES;
  const byKey = new Map<string, DedupedImage>();

  urls.forEach((raw, index) => {
    const trimmed = raw?.trim();
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return;
    if (/sprite|grey-pixel|pixel\.gif|1x1|transparent|icon/i.test(trimmed)) {
      return;
    }

    const key = imageDedupeKey(trimmed);
    const normalized = normalizeImageUrl(trimmed);
    const score = imageResolutionScore(trimmed, index);
    const prev = byKey.get(key);
    if (!prev || score > prev.score) {
      byKey.set(key, {
        url: normalized || trimmed,
        normalizedKey: key,
        score,
      });
    }
  });

  return [...byKey.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/**
 * Télécharge, valide (MIME / dimensions / anti-blanc) et déduplique par hash.
 * Les URL invalides ou inaccessibles sont rejetées (pas de hotlink cassé).
 */
export async function dedupeImagesByContent(
  images: DedupedImage[],
  options?: { max?: number; timeoutMs?: number },
): Promise<DedupedImage[]> {
  const max = options?.max ?? MAX_IMAGES;
  const timeoutMs = options?.timeoutMs ?? 15_000;
  const byHash = new Map<string, DedupedImage & { bytes: number }>();

  for (const image of images) {
    const validated: ValidatedImage | null = await fetchAndValidateImage(
      image.url,
      { timeoutMs, urlScore: image.score },
    );
    if (!validated) continue;

    const hash = createHash("sha256").update(validated.buffer).digest("hex");
    const prev = byHash.get(hash);
    if (
      !prev ||
      validated.bytes > prev.bytes ||
      validated.score > (prev.score ?? 0)
    ) {
      byHash.set(hash, {
        ...image,
        contentHash: hash,
        buffer: validated.buffer,
        contentType: validated.contentType,
        width: validated.width,
        height: validated.height,
        bytes: validated.bytes,
        score: validated.score,
      });
    }
  }

  return [...byHash.values()]
    .sort((a, b) => b.bytes - a.bytes || b.score - a.score)
    .slice(0, max);
}

export async function prepareProductImages(
  rawUrls: string[],
  options?: { max?: number; contentHash?: boolean },
): Promise<{
  before: number;
  afterUrlDedupe: number;
  afterContentDedupe: number;
  images: DedupedImage[];
}> {
  const max = options?.max ?? MAX_IMAGES;
  const before = rawUrls.filter(Boolean).length;
  const urlDeduped = dedupeImageUrls(rawUrls, { max: Math.max(max, 12) });
  const afterUrlDedupe = urlDeduped.length;

  const images =
    options?.contentHash === false
      ? urlDeduped.slice(0, max)
      : await dedupeImagesByContent(urlDeduped, { max });

  console.info("[images-dedupe]", {
    before,
    afterUrlDedupe,
    afterContentDedupe: images.length,
  });

  return {
    before,
    afterUrlDedupe,
    afterContentDedupe: images.length,
    images,
  };
}
