/**
 * Heuristique légère : signaler un filigrane probable (sans le supprimer).
 */
export type WatermarkHint = {
  suspected: boolean;
  reason?: string;
};

const WATERMARK_URL_HINTS =
  /watermark|filigrane|wm[_-]|overlay|copyright|getty|shutterstock|istock/i;

export function detectWatermarkHint(input: {
  url?: string | null;
  title?: string | null;
}): WatermarkHint {
  const url = input.url ?? "";
  if (WATERMARK_URL_HINTS.test(url)) {
    return { suspected: true, reason: "L’URL suggère un filigrane." };
  }
  // Utopia et marketplaces affichent souvent un filigrane commercial
  if (/utopia|cdn\.shopify\.com\/.*watermark/i.test(url)) {
    return {
      suspected: true,
      reason: "Image marketplace — un filigrane est possible.",
    };
  }
  return { suspected: false };
}
