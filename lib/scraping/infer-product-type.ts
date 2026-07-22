/**
 * Infère un « Type » produit à partir du titre quand la page ne le fournit pas.
 * Sert surtout aux pièces détachées (écrans, batteries…) importées depuis eBay.
 */

const TYPE_RULES: Array<{ pattern: RegExp; type: string }> = [
  {
    pattern:
      /\b(ecran|écran|lcd|oled|display|vitre|tactile|digitizer|écran\s*tactile)\b/i,
    type: "Écran",
  },
  {
    pattern: /\b(batterie|battery|accumulateur)\b/i,
    type: "Batterie",
  },
  {
    pattern: /\b(coque|étui|etui|case|housse|cover)\b/i,
    type: "Coque",
  },
  {
    pattern: /\b(chargeur|charger|cable|câble|cable\s*usb|lightning)\b/i,
    type: "Chargeur",
  },
  {
    pattern: /\b(haut[- ]?parleur|speaker|écouteur|ecouteur|earpiece)\b/i,
    type: "Haut-parleur",
  },
  {
    pattern: /\b(connecteur|dock|port\s*de\s*charge|charging\s*port)\b/i,
    type: "Connecteur de charge",
  },
  {
    pattern: /\b(cam[eé]ra|camera|objectif)\b/i,
    type: "Caméra",
  },
  {
    pattern: /\b(nappes?|flex\s*cable|cable\s*flex)\b/i,
    type: "Nappe",
  },
  {
    pattern: /\b(bouton|button|power\s*button|volume)\b/i,
    type: "Bouton",
  },
  {
    pattern: /\b(vitre\s*arri[eè]re|back\s*glass|chassis|châssis)\b/i,
    type: "Pièce",
  },
  {
    pattern: /\b(headphone|headset|casque|écouteurs|ecouteurs|airpods)\b/i,
    type: "Casque audio",
  },
];

export function inferProductTypeFromTitle(title: string | null | undefined): string | null {
  if (!title?.trim()) return null;
  for (const rule of TYPE_RULES) {
    if (rule.pattern.test(title)) return rule.type;
  }
  return null;
}
