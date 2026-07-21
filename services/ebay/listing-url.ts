/**
 * URLs publiques / vendeur pour une annonce eBay (sandbox vs production).
 *
 * Sandbox FR : les annonces se voient sur https://www.sandbox.ebay.fr
 * (Seller Hub `/sh/lst/active`, fiche `/itm/{id}`).
 * L’OAuth peut s’ouvrir sur auth.sandbox.ebay.com — c’est normal ;
 * ne pas confondre avec sandbox.ebay.com ni le vrai ebay.fr.
 */

export function isEbaySandboxEnvironment(): boolean {
  return process.env.EBAY_ENVIRONMENT !== "production";
}

export function getEbaySiteOrigin(): string {
  const marketplace = (process.env.EBAY_MARKETPLACE_ID ?? "EBAY_FR").toUpperCase();
  const sandbox = isEbaySandboxEnvironment();

  if (marketplace === "EBAY_FR") {
    return sandbox ? "https://www.sandbox.ebay.fr" : "https://www.ebay.fr";
  }
  if (marketplace === "EBAY_DE") {
    return sandbox ? "https://www.sandbox.ebay.de" : "https://www.ebay.de";
  }
  if (marketplace === "EBAY_GB") {
    return sandbox ? "https://www.sandbox.ebay.co.uk" : "https://www.ebay.co.uk";
  }
  return sandbox ? "https://www.sandbox.ebay.com" : "https://www.ebay.com";
}

/** Page acheteur de l’annonce. */
export function buildEbayListingUrl(listingId: string | null | undefined): string | null {
  const id = listingId?.trim();
  if (!id) return null;
  // IDs mock locaux — pas de vrai lien eBay
  if (id.startsWith("listing_") || id.startsWith("mock")) return null;
  return `${getEbaySiteOrigin()}/itm/${encodeURIComponent(id)}`;
}

/** Liste des annonces actives (Seller Hub / Mes annonces). */
export function buildEbaySellerListingsUrl(): string {
  return `${getEbaySiteOrigin()}/sh/lst/active`;
}

export function buildEbaySandboxHomeUrl(): string {
  return getEbaySiteOrigin();
}
