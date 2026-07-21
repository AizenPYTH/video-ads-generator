/**
 * Associe des noms de fichiers image à des annonces (SKU / MPN / titre).
 */

export type MatchableAd = {
  id: string;
  titre: string | null;
  sku: string | null;
  mpn?: string | null;
  externalRef?: string | null;
};

export type ImageMatchSuggestion = {
  fileName: string;
  fileKey: string;
  adId: string | null;
  adTitle: string | null;
  adSku: string | null;
  confidence: number;
  reason: string;
};

function normalizeToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fileStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function scoreMatch(stem: string, ad: MatchableAd): { score: number; reason: string } {
  const stemNorm = normalizeToken(stem);
  const stemCompact = stemNorm.replace(/\s+/g, "");
  if (!stemCompact) return { score: 0, reason: "Nom de fichier vide" };

  const sku = ad.sku?.trim() ?? "";
  if (sku) {
    const skuNorm = normalizeToken(sku).replace(/\s+/g, "");
    if (stemCompact === skuNorm || stemCompact.includes(skuNorm) || skuNorm.includes(stemCompact)) {
      return { score: 0.98, reason: `SKU « ${sku} »` };
    }
  }

  const mpn = ad.mpn?.trim() ?? "";
  if (mpn) {
    const mpnNorm = normalizeToken(mpn).replace(/\s+/g, "");
    if (mpnNorm.length >= 3 && stemCompact.includes(mpnNorm)) {
      return { score: 0.9, reason: `MPN « ${mpn} »` };
    }
  }

  const external = ad.externalRef?.trim() ?? "";
  if (external) {
    const extNorm = normalizeToken(external).replace(/\s+/g, "");
    if (extNorm.length >= 3 && stemCompact.includes(extNorm)) {
      return { score: 0.88, reason: `Référence « ${external} »` };
    }
  }

  const title = ad.titre?.trim() ?? "";
  if (title) {
    const titleTokens = normalizeToken(title).split(/\s+/).filter((t) => t.length >= 3);
    const stemTokens = stemNorm.split(/\s+/).filter(Boolean);
    if (stemTokens.length) {
      const hits = stemTokens.filter((t) =>
        titleTokens.some((tt) => tt.includes(t) || t.includes(tt)),
      );
      const ratio = hits.length / stemTokens.length;
      if (ratio >= 0.6 && hits.length >= 1) {
        return {
          score: Math.min(0.75, 0.45 + ratio * 0.3),
          reason: `Titre (${hits.join(", ")})`,
        };
      }
    }
    // Model codes like A1707 in filename + title
    const modelCode = stemCompact.match(/a\d{4}/i)?.[0];
    if (modelCode && normalizeToken(title).includes(modelCode.toLowerCase())) {
      return { score: 0.82, reason: `Code modèle « ${modelCode.toUpperCase()} »` };
    }
  }

  return { score: 0, reason: "Aucune correspondance" };
}

/**
 * Pour chaque fichier, propose la meilleure annonce (ou aucune si score < seuil).
 * Un même adId ne peut être attribué qu’une fois (premier fichier au score le plus haut gagne).
 */
export function matchImagesToAds(
  fileNames: string[],
  ads: MatchableAd[],
  options?: { minConfidence?: number },
): ImageMatchSuggestion[] {
  const minConfidence = options?.minConfidence ?? 0.55;
  const candidates: Array<ImageMatchSuggestion & { _score: number }> = [];

  for (const fileName of fileNames) {
    const stem = fileStem(fileName);
    let best: { ad: MatchableAd; score: number; reason: string } | null = null;
    for (const ad of ads) {
      const { score, reason } = scoreMatch(stem, ad);
      if (!best || score > best.score) {
        best = { ad, score, reason };
      }
    }
    candidates.push({
      fileName,
      fileKey: fileName,
      adId: best && best.score >= minConfidence ? best.ad.id : null,
      adTitle: best && best.score >= minConfidence ? best.ad.titre : null,
      adSku: best && best.score >= minConfidence ? best.ad.sku : null,
      confidence: best?.score ?? 0,
      reason: best?.reason ?? "Aucune correspondance",
      _score: best?.score ?? 0,
    });
  }

  // Resolve conflicts: highest confidence keeps the ad; others become unmatched
  const byAd = new Map<string, typeof candidates>();
  for (const c of candidates) {
    if (!c.adId) continue;
    const list = byAd.get(c.adId) ?? [];
    list.push(c);
    byAd.set(c.adId, list);
  }

  const claimed = new Set<string>();
  for (const [, list] of byAd) {
    list.sort((a, b) => b._score - a._score);
    const winner = list[0];
    claimed.add(winner.fileKey);
    for (const loser of list.slice(1)) {
      loser.adId = null;
      loser.adTitle = null;
      loser.adSku = null;
      loser.reason = "Conflit : annonce déjà associée à un autre fichier";
      loser.confidence = 0;
    }
  }

  return candidates.map(({ _score: _, ...rest }) => rest);
}
