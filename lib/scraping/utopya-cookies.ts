/** Résolution des cookies de session Utopya (prix visibles uniquement connecté). */

export function normalizeUtopyaCookies(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  // Accepte "a=b; c=d" ou collage brut DevTools
  return raw
    .trim()
    .replace(/\r?\n/g, ";")
    .replace(/;\s*;+/g, ";")
    .replace(/^;|;$/g, "")
    .trim();
}

/**
 * Priorité : cookies passés par l’utilisateur (formulaire) > UTOPYA_COOKIES env.
 */
export function resolveUtopyaCookies(
  override?: string | null,
): string | undefined {
  return (
    normalizeUtopyaCookies(override) ||
    normalizeUtopyaCookies(process.env.UTOPYA_COOKIES)
  );
}

export const UTOPYA_COOKIES_HELP =
  "Optionnel — uniquement pour récupérer les prix automatiquement. Sur utopya.fr (compte pro connecté) : F12 → Application → Cookies → domaine utopya.fr → copiez PHPSESSID et form_key au format PHPSESSID=…; form_key=…";
