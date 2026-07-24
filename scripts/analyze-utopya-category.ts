import { fetchWithScrapingBee } from "../services/scraping/scrapingbee";
import {
  extractCatalogProductCards,
  extractCatalogProductLinks,
} from "../lib/scraping/catalog-links";

async function main() {
  const url =
    process.argv[2] ||
    "https://www.utopya.fr/xiaomi/serie-redmi/redmi-15c-5g.html";
  const cookies = process.env.UTOPYA_COOKIES?.trim();

  const { html } = await fetchWithScrapingBee({
    url,
    renderJs: true,
    premiumProxy: true,
    countryCode: "fr",
    waitMs: 5500,
    blockResources: false,
    cookies,
  });

  const cards = extractCatalogProductCards(html, url, { max: 100 });
  const links = extractCatalogProductLinks(html, url, { max: 100 });
  const itemLinkCount = (html.match(/product-item-link/gi) || []).length;
  const listingItems = (html.match(/listing-item/gi) || []).length;
  const pages = [...html.matchAll(/[?&]p=(\d+)/g)].map((m) => m[1]);
  const amount =
    html
      .match(/id=["']toolbar-amount["'][\s\S]{0,250}/i)?.[0]
      ?.replace(/\s+/g, " ")
      ?.slice(0, 200) || null;
  const priceTexts = [
    ...html.matchAll(/>(\d{1,5}[.,]\d{2})\s*€</g),
  ]
    .map((m) => m[1])
    .slice(0, 20);
  const dataPrice = [
    ...html.matchAll(/data-price-amount=["']([^"']+)["']/gi),
  ].map((m) => m[1]);
  const loginWall = /log-to-see-price|box-no-log|devez être connecté/i.test(
    html,
  );
  const nextPage =
    html.match(
      /<a[^>]+class=["'][^"']*next[^"']*["'][^>]+href=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(/href=["']([^"']*[?&]p=2[^"']*)["']/i)?.[1] ||
    null;

  // Prix blocs catégorie (logged-in style)
  const cardPriceSnippets = [
    ...html.matchAll(
      /product-item[\s\S]{0,1200}?(\d{1,5}[.,]\d{2})\s*€[\s\S]{0,200}?product-item-link[\s\S]{0,200}?>([\s\S]{0,120}?)<\/a>/gi,
    ),
  ]
    .slice(0, 5)
    .map((m) => ({ price: m[1], title: m[2].replace(/<[^>]+>/g, "").trim() }));

  console.log(
    JSON.stringify(
      {
        url,
        hasCookies: Boolean(cookies),
        htmlLen: html.length,
        itemLinkCount,
        listingItems,
        cards: cards.length,
        links: links.length,
        pages: [...new Set(pages)],
        amount,
        nextPage,
        priceTexts,
        dataPrice: dataPrice.slice(0, 20),
        loginWall,
        cardPriceSnippets,
        titles: cards.map((c) => ({
          title: c.title,
          price: c.price,
          sku: c.sku,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
