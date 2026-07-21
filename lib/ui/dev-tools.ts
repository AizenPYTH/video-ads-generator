/**
 * Outils développeur / textes techniques eBay.
 * Jamais visibles pour un vendeur professionnel, sauf flag explicite.
 */
export function showDeveloperTools(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEVELOPER_TOOLS === "true";
}

export function isEbayProductionEnvironment(): boolean {
  return process.env.EBAY_ENVIRONMENT === "production";
}
